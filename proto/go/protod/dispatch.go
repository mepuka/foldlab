package protod

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/nats-io/nats.go"

	"foldlab/canonical"
)

// Request dispatch: narrow-writ REQUESTs arrive as data on daemon-owned
// subjects; every reply is a fact or a refusal (W7, W8). A request with
// no reply inbox is dropped — there is nowhere to teach into.

const (
	SubjectTypeCreate       = "flb.req.type.create"
	SubjectTypeFill         = "flb.req.type.fill"
	SubjectTypeUnfill       = "flb.req.type.unfill"
	SubjectJournalRead      = "flb.req.journal.read"
	SubjectContractDescribe = "flb.req.contract.describe"
	subjectRequestWildcard  = "flb.req.>"
	ingressPrefix           = "flb.ing."
	ingressWildcard         = "flb.ing.>"
)

const genesis = canonical.Genesis

type createRequest struct {
	Structure      any    `json:"structure"`
	AssertedDigest string `json:"assertedDigest"`
	Submitter      string `json:"submitter"`
}

type createReply struct {
	OK          bool       `json:"ok"`
	Created     bool       `json:"created"`
	Digest      string     `json:"digest"`
	Scheme      string     `json:"scheme"`
	CatalogSeq  int64      `json:"catalogSeq"`
	CatalogHead string     `json:"catalogHead"`
	Next        []NextHint `json:"next"`
}

func (d *Daemon) handleRequest(msg *nats.Msg) {
	ctx, done := d.beginHandler()
	defer done()
	if msg.Reply == "" {
		return
	}
	var reply any
	switch msg.Subject {
	case SubjectTypeCreate:
		reply = d.serveCreate(ctx, msg.Data)
	case SubjectTypeFill:
		reply = d.serveFill(msg.Data)
	case SubjectTypeUnfill:
		reply = d.serveUnfill(msg.Data)
	case SubjectJournalRead:
		reply = d.serveRead(ctx, msg.Data)
	case SubjectContractDescribe:
		reply = describeReply(d.scheme.Name())
	default:
		reply = refuse(&Refusal{
			Kind: KindUnknownRequest,
			Law:  "W9: a missing capability is a missing request kind on the daemon — this subject has no handler",
			Got:  msg.Subject,
			Expected: []string{
				SubjectTypeCreate,
				SubjectTypeFill,
				SubjectTypeUnfill,
				SubjectJournalRead,
				SubjectContractDescribe,
			},
			Next: []NextHint{describeHint()},
		})
	}
	if err := d.respond(msg, reply); err != nil {
		fmt.Fprintf(os.Stderr, "protod: respond to %s: %v\n", msg.Subject, err)
	}
}

func (d *Daemon) serveCreate(ctx context.Context, body []byte) any {
	var request createRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if request.Structure == nil {
		return refuse(&Refusal{
			Kind:     KindMalformed,
			Law:      "type.create carries the submitted structure in \"structure\"",
			Path:     []string{"structure"},
			Expected: "an flb.type.v0 node",
			Example:  map[string]any{"structure": map[string]any{"k": "string"}},
			Next:     []NextHint{describeHint()},
		})
	}
	fact, created, refusal, err := d.catalog.create(
		ctx, request.Structure, request.AssertedDigest, request.Submitter)
	if err != nil {
		// Substrate failure: drop the reply and let the requester time
		// out — an internal error must never masquerade as a domain no.
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	head := d.catalog.journal.Head()
	return createReply{
		OK:          true,
		Created:     created,
		Digest:      fact.Digest,
		Scheme:      fact.Scheme,
		CatalogSeq:  fact.seq,
		CatalogHead: head.Head,
		Next: []NextHint{
			{
				Subject: ingressPrefix + "data",
				Note:    "publish a canonical frame claiming this type (request/reply; the reply admits or refuses)",
				Body:    map[string]any{"type": fact.Digest, "payload": "<your event payload>"},
			},
			readCatalogHint(),
		},
	}
}

// decodeBody parses a request body strictly enough to be teachable:
// invalid JSON or a non-object refuses as data, never as silence.
func decodeBody(body []byte, into any) *Refusal {
	var probe any
	if err := json.Unmarshal(body, &probe); err != nil {
		return &Refusal{
			Kind:     KindMalformed,
			Law:      "W2: requests are JSON — this body does not parse",
			Got:      truncateForReply(body),
			Expected: "a JSON object",
			Next:     []NextHint{describeHint()},
		}
	}
	if _, ok := probe.(map[string]any); !ok {
		return &Refusal{
			Kind:     KindMalformed,
			Law:      "requests are JSON objects",
			Got:      probe,
			Expected: "a JSON object",
			Next:     []NextHint{describeHint()},
		}
	}
	if err := json.Unmarshal(body, into); err != nil {
		return &Refusal{
			Kind: KindMalformed,
			Law:  "request fields must carry their declared shapes",
			Got:  probe,
			Next: []NextHint{describeHint()},
		}
	}
	return nil
}

func truncateForReply(body []byte) string {
	const limit = 256
	if len(body) <= limit {
		return string(body)
	}
	return string(body[:limit]) + "…"
}

func (d *Daemon) respond(msg *nats.Msg, reply any) error {
	if reply == nil {
		return nil
	}
	data, err := json.Marshal(reply)
	if err != nil {
		return err
	}
	return msg.Respond(data)
}
