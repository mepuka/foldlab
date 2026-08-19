package daemon

import (
	"context"

	"foldlab/canonical"
	"foldlab/journal"
)

// The shuttle-shaped consumer: anchor in, reaction out, no callback in the path.
//
// This is the seam the shuttle inherits, and the distinction it exists to make
// visible. A consumer that registers a status callback and acts on it has built
// a PRIVATE TRUTH: no anchor can read it, no replay can reproduce it, and no
// second reader can audit it. A consumer that holds an anchor on the session
// lane and advances on the fact has built nothing private at all — its state is
// one position, its input is the record, and any other party holding the same
// anchor computes the same reactions.
//
// **The absence of a callback here is by construction, not by discipline.**
// [LameDuckConsumer] is constructed from a lane and a position and holds no
// connection at all, so there is no object on which a status callback could be
// registered. The battery's committed control is the other half: it wires a
// consumer to the vendor's own lame-duck callback and measures that the
// reaction it produced is unreadable from the lanes, which is the defect this
// shape does not have.

// LameDuckReaction is one reaction a lane-driven consumer produced.
type LameDuckReaction struct {
	// Position is where the fact the consumer reacted to lies on the lane.
	Position int
	// Incarnation is the incarnation that entered lame duck.
	Incarnation string
	// Session is the session the fact cites.
	Session string
	// Server is the server the vendor's own event names.
	Server string
}

// LameDuckConsumer holds ONLY an anchor on the session lane.
//
// Its whole state is the position it has advanced to. Two consumers at the same
// anchor over the same lane produce the same reactions, which is what makes a
// reaction auditable rather than witnessed.
type LameDuckConsumer struct {
	lane   *journal.Journal
	anchor journal.Cursor
}

// NewLameDuckConsumer opens a consumer at the beginning of a lane.
//
// The constructor takes a lane and nothing else. There is no connection
// argument and no callback argument, and that is the claim: this consumer could
// not register a status callback if it wanted to.
func NewLameDuckConsumer(lane *journal.Journal) *LameDuckConsumer {
	return &LameDuckConsumer{lane: lane, anchor: journal.Cursor{Seq: -1, Head: canonical.Genesis}}
}

// Anchor is the position this consumer has advanced to.
func (c *LameDuckConsumer) Anchor() journal.Cursor { return c.anchor }

// Advance reads the lane forward from the anchor and returns every lame-duck
// fact it found, in the order they landed, moving the anchor past them.
//
// Head-minus-anchor is the honest staleness: a consumer that has not advanced
// is behind, and it can say by how much. Nothing here waits, nothing here reads
// a clock, and nothing here reports "no fact yet" as "no drain is happening".
func (c *LameDuckConsumer) Advance(ctx context.Context) ([]LameDuckReaction, error) {
	reactions, next, err := advanceLane(
		ctx, c.lane, c.anchor,
		func(position int, record map[string]any) (LameDuckReaction, bool) {
			if kind, _ := record["kind"].(string); kind != "substrate-incarnation-lame-duck" {
				return LameDuckReaction{}, false
			}
			incarnation, _ := record["incarnation"].(string)
			session, _ := record["session"].(string)
			server, _ := record["server"].(string)
			return LameDuckReaction{
				Position:    position,
				Incarnation: incarnation,
				Session:     session,
				Server:      server,
			}, true
		},
	)
	if err != nil {
		return nil, err
	}
	c.anchor = next
	return reactions, nil
}

// DispositionReaction is one teardown disposition a lane-driven consumer read.
type DispositionReaction struct {
	// Position is where the disposition lies on the lane.
	Position int
	// Incarnation is the incarnation the disposition addresses.
	Incarnation string
	// Cause is the retirement cause the incarnation is asked to retire under.
	Cause string
}

// DispositionConsumer holds ONLY an anchor on the incarnation lane.
//
// It is the lame-duck consumer's shape at a different lane over a different
// fact, and it is a separate type rather than one generic reader because the
// reaction shapes are what a caller acts on: a reader that handed back raw
// records would push the decoding to every call site and put the vocabulary
// back where this seam took it out of. What the two share is the anchor walk
// below, which is one function and not two.
//
// The claim is the same claim. This consumer is constructed from a lane and
// nothing else — no connection, no callback, no signal handler — so a running
// incarnation that advances on it has built no private truth: its whole state
// is one position, its input is the record, and a second party at the same
// anchor computes the same reactions.
type DispositionConsumer struct {
	lane   *journal.Journal
	anchor journal.Cursor
}

// NewDispositionConsumer opens a consumer at the beginning of a lane.
func NewDispositionConsumer(lane *journal.Journal) *DispositionConsumer {
	return &DispositionConsumer{lane: lane, anchor: journal.Cursor{Seq: -1, Head: canonical.Genesis}}
}

// Anchor is the position this consumer has advanced to.
func (c *DispositionConsumer) Anchor() journal.Cursor { return c.anchor }

// Advance reads the lane forward from the anchor and returns every disposition
// it found, in the order they landed, moving the anchor past them.
//
// Nothing here waits and nothing here reads a clock. A caller that wants to
// wait paces itself and owns the pacing; the consumer reports what the record
// carried at the position it reached, which for an empty read is nothing at
// all — never "no disposition has been made".
func (c *DispositionConsumer) Advance(ctx context.Context) ([]DispositionReaction, error) {
	reactions, next, err := advanceLane(
		ctx, c.lane, c.anchor,
		func(position int, record map[string]any) (DispositionReaction, bool) {
			if kind, _ := record["kind"].(string); kind != "substrate-incarnation-disposition" {
				return DispositionReaction{}, false
			}
			incarnation, _ := record["incarnation"].(string)
			cause, _ := record["cause"].(string)
			return DispositionReaction{
				Position:    position,
				Incarnation: incarnation,
				Cause:       cause,
			}, true
		},
	)
	if err != nil {
		return nil, err
	}
	c.anchor = next
	return reactions, nil
}

// advanceLane reads one lane forward from an anchor and projects every record
// the caller keeps, reporting the anchor the read reached.
//
// The anchor moves only on entries the read actually consumed, so a consumer
// that stops mid-lane resumes where it stopped rather than where it started. A
// record that is not a canonical value is skipped rather than refused here,
// which is deliberate and different from the total lane read: a consumer walks
// a lane it shares with other writers and reports the facts it is about, while
// a total read reports the whole history and must refuse an entry it cannot
// decode rather than report a shorter one.
func advanceLane[Reaction any](
	ctx context.Context,
	lane *journal.Journal,
	anchor journal.Cursor,
	keep func(position int, record map[string]any) (Reaction, bool),
) ([]Reaction, journal.Cursor, error) {
	reactions := make([]Reaction, 0)
	for {
		entries, next, err := lane.Read(ctx, anchor, 256)
		if err != nil {
			return nil, anchor, err
		}
		if len(entries) == 0 {
			return reactions, anchor, nil
		}
		for _, entry := range entries {
			value, err := canonical.Decode([]byte(entry.Payload))
			if err != nil {
				return nil, anchor, err
			}
			record, ok := value.(map[string]any)
			if !ok {
				continue
			}
			if reaction, kept := keep(int(entry.Seq), record); kept {
				reactions = append(reactions, reaction)
			}
		}
		anchor = next
	}
}
