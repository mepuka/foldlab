package protod

import (
	"context"
	// encoding/json carriage: reply serialization out (json.Marshal), and the
	// typed projection in decodeAdmitted — which runs over bytes constrained
	// admission has ALREADY accepted, never over the raw request body.
	"encoding/json"

	"github.com/nats-io/nats.go"

	"foldlab/canonical"
)

// Request dispatch: narrow-writ REQUESTs arrive as data on daemon-owned
// subjects; every reply is a fact or a refusal (W7, W8). A request with
// no reply inbox is dropped — there is nowhere to teach into.

const (
	SubjectTypeCreate           = "flb.req.type.create"
	SubjectTypeFill             = "flb.req.type.fill"
	SubjectTypeUnfill           = "flb.req.type.unfill"
	SubjectJournalRead          = "flb.req.journal.read"
	SubjectContractDescribe     = "flb.req.contract.describe"
	SubjectSessionOpen          = "flb.req.session.open"
	SubjectSessionMove          = "flb.req.session.move"
	SubjectSessionState         = "flb.req.session.state"
	SubjectSessionCommit        = "flb.req.session.commit"
	SubjectProtocolCreate       = "flb.req.protocol.create"
	SubjectProtocolSessionOpen  = "flb.req.protocol.session.open"
	SubjectProtocolSessionFill  = "flb.req.protocol.session.fill"
	SubjectProtocolSessionClose = "flb.req.protocol.session.close"
	SubjectProtocolSessionState = "flb.req.protocol.session.state"
	subjectRequestWildcard      = "flb.req.>"
	ingressPrefix               = "flb.ing."
	ingressWildcard             = "flb.ing.>"
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
	case SubjectProtocolCreate:
		reply = d.serveProtocolCreate(ctx, msg.Data)
	case SubjectProtocolSessionOpen:
		reply = d.serveProtocolSessionOpen(ctx, msg.Data)
	case SubjectProtocolSessionFill:
		reply = d.serveProtocolSessionFill(ctx, msg.Data)
	case SubjectProtocolSessionClose:
		reply = d.serveProtocolSessionClose(ctx, msg.Data)
	case SubjectProtocolSessionState:
		reply = d.serveProtocolSessionState(ctx, msg.Data)
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
				SubjectProtocolCreate,
				SubjectProtocolSessionOpen,
				SubjectProtocolSessionFill,
				SubjectProtocolSessionClose,
				SubjectProtocolSessionState,
			},
			Next: []NextHint{describeHint()},
		})
	}
	d.respond(msg, reply)
}

func (d *Daemon) serveCreate(ctx context.Context, body []byte) any {
	certificate, refusal, err := d.certify(ctx, body)
	if err != nil {
		// Substrate failure: drop the reply and let the requester time
		// out — an internal error must never masquerade as a domain no.
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	fact := certificate.Fact
	return createReply{
		OK:          true,
		Created:     certificate.Created,
		Digest:      fact.Digest,
		Scheme:      fact.Scheme,
		CatalogSeq:  fact.seq,
		CatalogHead: certificate.CatalogHead,
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
//
// Formatting is still free (W2): the daemon canonicalizes the admitted value
// itself, so member order, whitespace, and escape choice never move identity
// and never refuse. What they can no longer do is reach identity through a
// decoder that repairs them.
func decodeBody(body []byte, into any) *Refusal {
	_, _, refusal := decodeAdmitted(body, into)
	return refusal
}

// decodeAdmitted is decodeBody plus its own workings: it hands back the
// admitted value and the canonical bytes of that value, so a caller that
// derives identity from the request never decodes the raw body a second time.
// A second decoder on the identity path is exactly the door finding #36 came
// through, and the caller that needed these bytes (ingress) was reopening it
// by re-reading msg.Data with encoding/json.
func decodeAdmitted(body []byte, into any) (any, []byte, *Refusal) {
	value, refusal := decodeConstrained(body)
	if refusal != nil {
		return nil, nil, refusal
	}
	admitted, err := canonical.CanonicalizeValue(value)
	if err != nil {
		return nil, nil, &Refusal{
			Kind:     KindMalformed,
			Law:      "W2: requests are constrained JSON — this value has no canonical encoding",
			Got:      value,
			Expected: "a canonical JSON object",
			Next:     []NextHint{describeHint()},
		}
	}
	// The typed projection, and only that: it runs over bytes constrained
	// admission has already accepted, so encoding/json here can no longer
	// repair anything identity depends on.
	if err := json.Unmarshal(admitted, into); err != nil {
		return nil, nil, &Refusal{
			Kind: KindMalformed,
			Law:  "request fields must carry their declared shapes",
			Got:  value,
			Next: []NextHint{describeHint()},
		}
	}
	return value, admitted, nil
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
