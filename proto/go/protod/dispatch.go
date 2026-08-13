package protod

import (
	"context"
	"encoding/json"

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
	SubjectSessionOpen      = "flb.req.session.open"
	SubjectSessionMove      = "flb.req.session.move"
	SubjectSessionState     = "flb.req.session.state"
	SubjectSessionCommit    = "flb.req.session.commit"
	subjectRequestWildcard  = "flb.req.>"
	ingressPrefix           = "flb.ing."
	ingressWildcard         = "flb.ing.>"
)

var genesis = canonical.Genesis

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
	if msg.Reply == "" {
		return
	}
	ctx := context.Background()
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
		reply = describeReply()
	case SubjectSessionOpen:
		reply = d.serveSessionOpen(ctx, msg.Data)
	case SubjectSessionMove:
		reply = d.serveSessionMove(ctx, msg.Data)
	case SubjectSessionState:
		reply = d.serveSessionState(ctx, msg.Data)
	case SubjectSessionCommit:
		reply = d.serveSessionCommit(ctx, msg.Data)
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
				SubjectSessionOpen,
				SubjectSessionMove,
				SubjectSessionState,
				SubjectSessionCommit,
			},
			Next: []NextHint{describeHint()},
		})
	}
	d.respond(msg, reply)
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

// decodeBody admits request bytes through the same constrained JSON domain
// that bears catalog identity. The typed decode runs only over bytes derived
// from that admitted value, so encoding/json cannot silently repair duplicate
// names, invalid UTF-8, or lone surrogate escapes before identity is derived.
func decodeBody(body []byte, into any) *Refusal {
	probe, err := canonical.Decode(body)
	if err != nil {
		return &Refusal{
			Kind:     KindMalformed,
			Law:      "W2: requests are constrained JSON — this body has no canonical value",
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
	canonicalBody, err := canonical.CanonicalizeValue(probe)
	if err != nil {
		return &Refusal{
			Kind:     KindMalformed,
			Law:      "W2: requests are constrained JSON — this value has no canonical encoding",
			Got:      probe,
			Expected: "a canonical JSON object",
			Next:     []NextHint{describeHint()},
		}
	}
	if err := json.Unmarshal(canonicalBody, into); err != nil {
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

func (d *Daemon) respond(msg *nats.Msg, reply any) {
	if reply == nil {
		return
	}
	data, err := json.Marshal(reply)
	if err != nil {
		return
	}
	_ = msg.Respond(data)
}
