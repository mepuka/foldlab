package protod

import (
	"context"
	"errors"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/journal"
)

// Read is served as a request: journals come back as entries plus a
// claimed head. Heads are claims (W6) — the daemon's own read path
// verifies the chain (verify-on-read), and the reader is expected to
// recompute the head locally anyway; the reply says so.

const readNote = "heads are claims: recompute the chain head from the entries locally"
const maxReadEntries = 1000

type readRequest struct {
	Journal string `json:"journal"`
	From    struct {
		Seq  int    `json:"seq"`
		Head string `json:"head"`
	} `json:"from"`
	Max int `json:"max"`
}

type wireEntry struct {
	Seq     int64  `json:"seq"`
	Prev    string `json:"prev"`
	Payload string `json:"payload"`
}

type readReply struct {
	OK      bool        `json:"ok"`
	Journal string      `json:"journal"`
	Entries []wireEntry `json:"entries"`
	Seq     int         `json:"seq"`
	Head    string      `json:"head"`
	Partial bool        `json:"partial"`
	Note    string      `json:"note"`
	Next    []NextHint  `json:"next"`
}

func (d *Daemon) serveRead(ctx context.Context, body []byte) any {
	request := readRequest{}
	request.From.Seq = -1
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if !validJournalName.MatchString(request.Journal) {
		return refuse(&Refusal{
			Kind:     KindBadJournal,
			Law:      "read addresses a journal by name",
			Path:     []string{"journal"},
			Got:      request.Journal,
			Expected: "a name matching ^[A-Za-z0-9_-]+$",
			Example:  catalogJournalName,
			Next:     []NextHint{readCatalogHint()},
		})
	}
	if request.From.Head == "" && request.From.Seq == -1 {
		request.From.Head = genesis
	}
	if request.Max <= 0 || request.Max > maxReadEntries {
		request.Max = maxReadEntries
	}

	journalHandle, refusal, err := d.lookupJournal(ctx, request.Journal)
	if err != nil {
		return nil // substrate failure: time out, never a fake domain no
	}
	if refusal != nil {
		return refuse(refusal)
	}

	entries, cursor, err := journalHandle.Read(
		ctx,
		journal.Cursor{Seq: request.From.Seq, Head: request.From.Head},
		request.Max,
	)
	if err != nil {
		if errors.Is(err, journal.ErrTampered) {
			// A verification failure from a caller-supplied cursor is a
			// refused claim, not a lookup error — and it leaks no entries.
			return refuse(&Refusal{
				Kind:     KindBadCursor,
				Law:      "W6: heads are claims — the requested cursor does not verify against this journal",
				Path:     []string{"from"},
				Got:      map[string]any{"seq": request.From.Seq, "head": request.From.Head},
				Expected: "a cursor previously returned by a verified read, or {seq:-1, head:genesis}",
				Example:  map[string]any{"journal": request.Journal, "from": map[string]any{"seq": -1, "head": genesis}, "max": 0},
				Next:     []NextHint{readCatalogHint()},
			})
		}
		if errors.Is(err, journal.ErrBadCursor) {
			return refuse(&Refusal{
				Kind:     KindBadCursor,
				Law:      "read cursors carry a seq at or above -1",
				Path:     []string{"from", "seq"},
				Got:      request.From.Seq,
				Expected: "an integer >= -1",
				Example:  map[string]any{"seq": -1, "head": genesis},
				Next:     []NextHint{readCatalogHint()},
			})
		}
		return nil // substrate failure: D4 forbids inventing a domain law
	}

	wire := make([]wireEntry, len(entries))
	for index, entry := range entries {
		wire[index] = wireEntry{Seq: entry.Seq, Prev: entry.Prev, Payload: entry.Payload}
	}
	return readReply{
		OK:      true,
		Journal: request.Journal,
		Entries: wire,
		Seq:     cursor.Seq,
		Head:    cursor.Head,
		Partial: cursor.Seq < journalHandle.Head().Seq,
		Note:    readNote,
		Next: []NextHint{
			{
				Subject: SubjectJournalRead,
				Note:    "continue from the verified cursor",
				Body: map[string]any{
					"journal": request.Journal,
					"from":    map[string]any{"seq": cursor.Seq, "head": cursor.Head},
					"max":     maxReadEntries,
				},
			},
		},
	}
}

// lookupJournal opens a journal that already exists; reading is not
// allowed to create one. Absence is a typed refusal, never a lookup
// error (and never a silent empty journal brought into being).
func (d *Daemon) lookupJournal(ctx context.Context, name string) (*journal.Journal, *Refusal, error) {
	d.mu.Lock()
	if opened := d.journals[name]; opened != nil {
		d.mu.Unlock()
		return opened, nil, nil
	}
	d.mu.Unlock()

	if _, err := d.js.Stream(ctx, "J_"+name); err != nil {
		if errors.Is(err, jetstream.ErrStreamNotFound) {
			return nil, &Refusal{
				Kind:     KindUnknownJournal,
				Law:      "lag is absence: this journal does not exist here (yet)",
				Path:     []string{"journal"},
				Got:      name,
				Expected: "a journal that has admitted at least one frame, or \"catalog\"",
				Next: []NextHint{
					{
						Subject: ingressPrefix + name,
						Note:    "publish a canonical frame to bring this journal into being",
						Body:    map[string]any{"type": "<a cataloged digest>", "payload": "<your event payload>"},
					},
					readCatalogHint(),
				},
			}, nil
		}
		return nil, nil, err
	}
	opened, err := d.openJournal(ctx, name)
	if err != nil {
		return nil, nil, err
	}
	return opened, nil, nil
}
