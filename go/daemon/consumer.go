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
	reactions := make([]LameDuckReaction, 0)
	for {
		entries, next, err := c.lane.Read(ctx, c.anchor, 256)
		if err != nil {
			return nil, err
		}
		if len(entries) == 0 {
			return reactions, nil
		}
		for _, entry := range entries {
			value, err := canonical.Decode([]byte(entry.Payload))
			if err != nil {
				return nil, err
			}
			record, ok := value.(map[string]any)
			if !ok {
				continue
			}
			if kind, _ := record["kind"].(string); kind != "substrate-incarnation-lame-duck" {
				continue
			}
			incarnation, _ := record["incarnation"].(string)
			session, _ := record["session"].(string)
			server, _ := record["server"].(string)
			reactions = append(reactions, LameDuckReaction{
				Position:    int(entry.Seq),
				Incarnation: incarnation,
				Session:     session,
				Server:      server,
			})
		}
		c.anchor = next
	}
}
