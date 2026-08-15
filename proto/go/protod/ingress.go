package protod

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"

	"github.com/nats-io/nats.go"
)

// Ingress: the only PUBLISH path into a journal. Publish is
// request/reply — a refusal always has a reply home. Admission checks
// IDENTITY RESOLUTION ONLY (ratified): the frame's claimed digest must
// be cataloged (W4); payload conformance against the claimed structure
// is explicitly NOT checked here — that arrives later as a
// codegen-derived codec.

const admitNote = "admitted on identity resolution only; " +
	"payload conformance against the claimed structure was NOT checked"

var validJournalName = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

type frame struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type admitReply struct {
	OK       bool       `json:"ok"`
	Admitted bool       `json:"admitted"`
	Journal  string     `json:"journal"`
	Seq      int64      `json:"seq"`
	Head     string     `json:"head"`
	Note     string     `json:"note"`
	Next     []NextHint `json:"next"`
}

func (d *Daemon) handleIngress(msg *nats.Msg) {
	if msg.Reply == "" {
		return
	}
	d.respond(msg, d.serveIngress(context.Background(), msg.Subject, msg.Data))
}

func (d *Daemon) serveIngress(ctx context.Context, subject string, body []byte) any {
	name := strings.TrimPrefix(subject, ingressPrefix)
	if !validJournalName.MatchString(name) || name == catalogJournalName || strings.HasPrefix(name, sessionJournalPrefix) || strings.HasPrefix(name, protocolSessionJournalPrefix) {
		return refuse(&Refusal{
			Kind:     KindBadJournal,
			Law:      "ingress subjects name a data journal; the catalog is written only by the daemon, through type.create",
			Got:      name,
			Expected: "a name matching ^[A-Za-z0-9_-]+$ outside daemon-reserved catalog/session names",
			Example:  ingressPrefix + "data",
			Next:     []NextHint{describeHint()},
		})
	}

	var decoded frame
	if refusal := decodeBody(body, &decoded); refusal != nil {
		return refuse(refusal)
	}
	if !hexDigest.MatchString(decoded.Type) {
		return refuse(&Refusal{
			Kind:     KindMalformed,
			Law:      "a canonical frame claims its type as a 64-char lowercase hex digest in \"type\"",
			Path:     []string{"type"},
			Got:      decoded.Type,
			Expected: "64 lowercase hex characters",
			Example:  map[string]any{"type": strings.Repeat("0", 64), "payload": map[string]any{}},
			Next:     []NextHint{describeHint()},
		})
	}
	if !d.catalog.resolve(decoded.Type) {
		return refuse(&Refusal{
			Kind:     KindUnknownIdentity,
			Law:      "W4: create before publish — an unknown identity never enters a journal; lag is absence, not admission on faith",
			Path:     []string{"type"},
			Got:      decoded.Type,
			Expected: "a digest already committed to the catalog",
			Next: []NextHint{
				{
					Subject: SubjectTypeCreate,
					Note:    "create the type first; the daemon derives and returns its digest",
					Body:    map[string]any{"structure": map[string]any{"k": "string"}},
				},
				readCatalogHint(),
			},
		})
	}

	// Identity is of canonical uncompressed bytes: the admitted payload
	// is the canonical form of the frame, never the sender's formatting.
	var value any
	if err := json.Unmarshal(body, &value); err != nil {
		return nil // unreachable: decodeBody already parsed
	}
	bytes, err := canonicalBytes(value)
	if err != nil {
		return refuse(&Refusal{
			Kind: KindMalformed,
			Law:  "W2: canonical or refused — this frame is outside the canonical JSON domain",
			Got:  err.Error(),
			Next: []NextHint{describeHint()},
		})
	}

	journalHandle, err := d.openJournal(ctx, name)
	if err != nil {
		return nil // substrate failure: time out, never a fake domain no
	}
	entry, _, err := journalHandle.Append(ctx, string(bytes))
	if err != nil {
		return nil
	}
	head := journalHandle.Head()
	return admitReply{
		OK:       true,
		Admitted: true,
		Journal:  name,
		Seq:      entry.Seq,
		Head:     head.Head,
		Note:     admitNote,
		Next: []NextHint{
			{
				Subject: SubjectJournalRead,
				Note:    "read this journal back and verify the head locally — an admit reply means durably appended and readable",
				Body: map[string]any{
					"journal": name,
					"from":    map[string]any{"seq": -1, "head": genesis},
					"max":     0,
				},
			},
		},
	}
}
