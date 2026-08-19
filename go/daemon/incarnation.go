package daemon

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"foldlab/canonical"
	"foldlab/journal"
	"foldlab/register"
)

// The substrate-incarnation fence, and the lifecycle facts it opens and closes.
//
// An **incarnation** is one server run over one store directory,
// successor-chained. Two servers over one store directory corrupt the store,
// and the corruption is already in the filesystem by the time anyone could
// choose between them — so the act is fenced rather than folded, and the fence
// is the commitment register with its revision-CAS discipline and its
// incarnation pin. Winning the register is the exclusive act; a loser never
// starts a server and receives a typed refusal carrying reason, law and repair.
//
// **This file is a TRANSCRIPTION of the TypeScript spine's incarnation module**
// in exactly the sense the session fold already is: the value shapes, the round
// key, and the chain walk are read out of that implementation and restated
// here, and the wall that makes the restatement honest is a byte comparison
// across the language boundary. The spine's declaration is the reference; a
// divergence the wall exposes is a defect on this side.
//
// **The key is one chain position, not one store.** A landed outcome never
// changes, which is right for one round and wrong for a lifetime: a store
// directory outlives many incarnations, and a key that admitted one landing
// ever would make succession unsayable. So the key is the digest of the ROUND —
// the store directory together with the incarnation being succeeded — and at
// most one incarnation lands per round, which is at most one incarnation
// current per store directory.
//
// **Crash is not a fact and is not forged into one here.** Nothing in this file
// retires an incarnation on another's behalf, and nothing reads silence as a
// verdict. A dead incarnation stays unretired and its lanes go quiet; absence
// is the honest reading, and no fold below has an answer that says "live".
//
// Staged debt, stated rather than absorbed: the value shapes here are
// hand-carried transcription owing the corpus's substrate-vocabulary group,
// which the emitter does not yet mint.

// SubstrateIncarnation is one server run over one store directory,
// successor-chained.
type SubstrateIncarnation struct {
	// Store is the store directory this run owns, by digest.
	Store string
	// Options is the declared server-options value this run started under, by
	// digest.
	Options string
	// Predecessor is the incarnation this run succeeds, empty for a store's
	// first.
	Predecessor string
}

// StoreValue declares one store directory as a value.
//
// The DIGEST is what travels — onto the lanes, into the round key, into every
// fact. The path itself is an ambient coordinate that means nothing to a party
// on another host, and it never leaves this declaration.
func StoreValue(dir string) map[string]any {
	return map[string]any{
		"v":    float64(0),
		"kind": "substrate-store",
		"dir":  dir,
	}
}

// StoreDigest names one store directory.
func StoreDigest(dir string) (string, error) { return digestOf(StoreValue(dir)) }

// nullable renders an empty digest as the null a chain head carries, so the two
// languages fold the same bytes for "there is no predecessor".
func nullable(digest string) any {
	if digest == "" {
		return nil
	}
	return digest
}

// IncarnationValue is one incarnation's declared value.
func IncarnationValue(value SubstrateIncarnation) map[string]any {
	return map[string]any{
		"v":           float64(0),
		"kind":        "substrate-incarnation",
		"store":       value.Store,
		"options":     value.Options,
		"predecessor": nullable(value.Predecessor),
	}
}

// IncarnationName is the incarnation's name: the digest over its canonical
// bytes.
func IncarnationName(value SubstrateIncarnation) (string, error) {
	return digestOf(IncarnationValue(value))
}

// RoundValue is one chain position over one store directory: what a decide
// competes for.
func RoundValue(store string, predecessor string) map[string]any {
	return map[string]any{
		"v":           float64(0),
		"kind":        "substrate-incarnation-round",
		"store":       store,
		"predecessor": nullable(predecessor),
	}
}

// RoundKey is the register key one decide competes at.
//
// A digest rather than a composed string: the register maps a work digest to
// one literal key, and a digest is one literal key by construction — no
// separator can appear inside a coordinate and split it.
func RoundKey(store string, predecessor string) (string, error) {
	return digestOf(RoundValue(store, predecessor))
}

// LandedIncarnation is one incarnation landed by right of a token.
type LandedIncarnation struct {
	// Round is the register key the decide was taken at.
	Round string
	// Token is the fencing token the landing was made under.
	Token uint64
	// Value is the incarnation that landed.
	Value SubstrateIncarnation
	// Digest is the incarnation's name.
	Digest string
}

// DecideIncarnation lands one incarnation by right of a token.
//
// Grant then commit, in that order and with the granted token carried between
// them: the register's own five actions, used as they are defined. A racing
// decide loses at the grant, or — if it granted first and stalled — at the
// commit, and either way it receives the register's typed refusal and lands
// nothing.
//
// **There is no path through this function that starts a server.** Starting one
// is the winner's act, performed after this returns, and the wall measures that
// separation from the filesystem rather than taking this sentence's word for it.
func DecideIncarnation(
	registers *register.Client,
	value SubstrateIncarnation,
	holder string,
) (LandedIncarnation, error) {
	round, err := RoundKey(value.Store, value.Predecessor)
	if err != nil {
		return LandedIncarnation{}, err
	}
	digest, err := IncarnationName(value)
	if err != nil {
		return LandedIncarnation{}, err
	}
	granted, err := registers.Grant(round, holder)
	if err != nil {
		return LandedIncarnation{}, err
	}
	landed, err := registers.Commit(round, granted.Token, digest)
	if err != nil {
		return LandedIncarnation{}, err
	}
	return LandedIncarnation{Round: round, Token: landed.Token, Value: value, Digest: digest}, nil
}

// LandedAt reports what landed at one chain position, if anything has.
//
// A round nobody has decided reads as the empty string. That is absence at a
// position, not a claim about the world: nothing here says a server is or is
// not running.
func LandedAt(registers *register.Client, store string, predecessor string) (string, error) {
	round, err := RoundKey(store, predecessor)
	if err != nil {
		return "", err
	}
	state, err := registers.Observe(round)
	if err != nil {
		return "", err
	}
	if state.Outcome == nil {
		return "", nil
	}
	return state.Outcome.Value, nil
}

// ErrChainDepth refuses a register chain longer than the walk's stated bound.
var ErrChainDepth = errors.New("the register's incarnation chain is longer than the walk's stated bound")

// OpenRound walks the REGISTER's own chain over one store directory and reports
// the first chain position nobody has decided, together with the chain it
// walked, oldest first.
//
// **The walk reads the register and not the lane, and the difference is the
// whole reason this exists.** A round that landed an outcome never lands
// another, so a party that decided a round and then failed before it could land
// an established fact has SPENT that round: the lane shows nothing and the
// register shows an outcome. A predecessor read from the lane would return that
// party's own predecessor, send the next start back to the spent round, and
// refuse it there forever. Reading the register instead walks past the spent
// round to the first one still open, which is exactly where a decide belongs.
//
// Nothing here says anything about liveness. The chain is a history of decided
// rounds; whether any of their incarnations is running is a question this walk
// cannot ask and does not.
//
// The depth bound is stated rather than implicit: a store directory's chain
// grows by one per start, and a walk that ran forever over a corrupted register
// would hang a start instead of refusing it.
func OpenRound(
	registers *register.Client,
	store string,
	depth int,
) (string, []string, error) {
	walked := make([]string, 0, 8)
	predecessor := ""
	for step := 0; step <= depth; step++ {
		landed, err := LandedAt(registers, store, predecessor)
		if err != nil {
			return "", nil, err
		}
		if landed == "" {
			return predecessor, walked, nil
		}
		walked = append(walked, landed)
		predecessor = landed
	}
	return "", nil, fmt.Errorf("%w: %d", ErrChainDepth, depth)
}

// The lifecycle facts, and the lanes they land on.
//
// Established and retired accumulate on the incarnation lane; the lame-duck
// fact lands on the session lane, because what it is about is the sessions the
// drain is going to end.

// EstablishedIncarnationFact is one incarnation's entry into service, citing
// the options digest it started under and the predecessor it succeeds.
func EstablishedIncarnationFact(digest string, value SubstrateIncarnation) map[string]any {
	return map[string]any{
		"v":           float64(0),
		"kind":        "substrate-incarnation-established",
		"incarnation": digest,
		"store":       value.Store,
		"options":     value.Options,
		"predecessor": nullable(value.Predecessor),
	}
}

// LameDuckEvent is the pinned vendor's own name for the disposition, READ FROM
// THE WIRE VOCABULARY rather than spelled again here.
//
// The row is reached by the vendor's own type-alias name for the status event,
// so the event name is stated once in the estate and travels out of the table.
var LameDuckEvent = mustStatusEvent("LDMStatus").Type

// LameDuckFact is the drain disposition as a fact on the session lane.
//
// It cites the session the drain is going to end and the incarnation that
// entered lame duck, and it carries the vendor's own event name together with
// the server that event names. **The server field is why the server name is a
// declared row**: left unset the vendor aliases a fresh identity per run, and
// this fact would then carry a coordinate that means nothing across a restart.
//
// The consumer discipline this fact exists for: a party holding an anchor on
// the session lane advances on THIS, never on a status callback. A callback
// reaction is a private truth no anchor can read, no replay can reproduce, and
// no second reader can audit, and the battery carries the control that says so.
func LameDuckFact(incarnation string, session string, server string) map[string]any {
	return map[string]any{
		"v":           float64(0),
		"kind":        "substrate-incarnation-lame-duck",
		"incarnation": incarnation,
		"session":     session,
		"event":       LameDuckEvent,
		"server":      server,
	}
}

// The retirement causes.
//
// The pinned vendor supplies no retirement-cause vocabulary — its lifecycle
// surface is verbs, not causes — so both rows below are DECLARED ESTATE VALUES
// and are marked as such, which is the only way a name the vendor does not
// supply may enter (adoption ruling (b)). Neither is a vendor word and neither
// is presented as one.
const (
	// CauseDrained retires an incarnation that entered lame duck before it
	// stopped.
	CauseDrained = "drained"
	// CauseStopped retires an incarnation that stopped without draining.
	CauseStopped = "stopped"
)

// RetirementCauses is the declared roster of causes, so that "which causes
// exist" is data rather than a switch statement somebody has to read.
var RetirementCauses = []string{CauseDrained, CauseStopped}

// ErrUndeclaredCause refuses a retirement cause the roster does not name.
var ErrUndeclaredCause = errors.New("the retirement cause is not a declared estate value")

// admitCause is the roster walk both cause-carrying facts pass through.
//
// One walk rather than two, because the roster is what refuses: a second copy
// of this loop would be a second place a row could be admitted from, and the
// whole point of the roster having no crash row is that there is nowhere to
// admit one.
func admitCause(cause string) error {
	for _, candidate := range RetirementCauses {
		if candidate == cause {
			return nil
		}
	}
	return fmt.Errorf("%w: %q", ErrUndeclaredCause, cause)
}

// RetiredIncarnationFact is one incarnation's retirement, naming its cause.
//
// **There is no fact for a crash and this function will not mint one.** A
// crashed incarnation is an unretired incarnation whose lanes go quiet, and the
// honest reading of that is absence. Manufacturing a retirement on a dead
// incarnation's behalf is the forgery this slice refuses; the cause roster has
// no row for it, so the refusal is by construction rather than by convention.
func RetiredIncarnationFact(incarnation string, cause string) (map[string]any, error) {
	if err := admitCause(cause); err != nil {
		return nil, err
	}
	return map[string]any{
		"v":           float64(0),
		"kind":        "substrate-incarnation-retired",
		"incarnation": incarnation,
		"cause":       cause,
	}, nil
}

// DispositionFact is one incarnation's teardown disposition: the cause it is
// being asked to retire under.
//
// A retirement is a fact about an incarnation that has stopped; a disposition
// is a fact about the act that asked it to. They are separate rows because they
// are separate facts: a disposition that never reached its incarnation is still
// a true record of the asking, and reading it as a retirement would be reading
// an intention as an outcome.
//
// **This is why a running incarnation needs no signal and no callback.** A
// party holding an anchor on the incarnation lane advances on this fact, which
// every later reader can audit and any second reader can reproduce. A signal is
// a private truth: it reaches one process once, leaves no record, and cannot be
// replayed. The lane-driven consumer shape is the shuttle's, consumed here
// rather than re-derived.
//
// **The cause is drawn from the retirement roster, and that is the whole
// refusal.** The roster carries no row a crash could enter under, so a
// disposition asking for one is unsayable in exactly the way a retirement
// claiming one is.
//
// TRANSCRIPTION, like every other value in this file: the spine's declaration
// is the reference and the parity wall compares the bytes.
func DispositionFact(incarnation string, cause string) (map[string]any, error) {
	if err := admitCause(cause); err != nil {
		return nil, err
	}
	return map[string]any{
		"v":           float64(0),
		"kind":        "substrate-incarnation-disposition",
		"incarnation": incarnation,
		"cause":       cause,
	}, nil
}

// EndedSessionFact is one connection's teardown, citing the cause the pinned
// client reported for itself.
//
// An empty cause is not a missing one: the client reports no cause for a
// teardown it took in order, so the empty string is the client's own account of
// an orderly end rather than a field somebody forgot. That is what keeps an
// orderly teardown and a hard kill distinguishable in the record.
//
// TRANSCRIPTION of the spine's session-lane teardown variant; the parity wall
// compares the bytes.
func EndedSessionFact(session string, cause string) map[string]any {
	return map[string]any{
		"v":       float64(0),
		"kind":    "substrate-session-ended",
		"session": session,
		"cause":   cause,
	}
}

// ReadLane reads one lane whole, newest last, and returns the decoded facts in
// the order they landed.
//
// The read is positional and total: every entry the lane carries is decoded, and
// an entry that is not a canonical record refuses rather than being skipped. A
// reader that skipped what it could not read would report a shorter history
// instead of a broken one.
func ReadLane(ctx context.Context, lane *journal.Journal) ([]map[string]any, error) {
	facts := make([]map[string]any, 0)
	cursor := journal.Cursor{Seq: -1, Head: canonical.Genesis}
	for {
		entries, next, err := lane.Read(ctx, cursor, 256)
		if err != nil {
			return nil, fmt.Errorf("read the lane: %w", err)
		}
		if len(entries) == 0 {
			return facts, nil
		}
		for _, entry := range entries {
			value, err := canonical.Decode([]byte(entry.Payload))
			if err != nil {
				return nil, fmt.Errorf("decode the fact at position %d: %w", entry.Seq, err)
			}
			record, ok := value.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("the fact at position %d is not a record", entry.Seq)
			}
			facts = append(facts, record)
		}
		cursor = next
	}
}

// Standing is what a fold over the incarnation lane can say about one
// incarnation.
//
// **There is deliberately no third value meaning "live".** The algebra observes
// liveness and never promises it, so the fold's answers are what the record
// carries — an incarnation was established, and it either was or was not
// retired. An incarnation whose process died reads as Established, forever,
// which is exactly the absence the supervisor's fenced decide is fed.
type Standing string

const (
	// StandingEstablished names an incarnation the record established and never
	// retired. It says nothing at all about whether a process is running.
	StandingEstablished Standing = "established"
	// StandingRetired names an incarnation the record retired, with its cause.
	StandingRetired Standing = "retired"
)

// IncarnationStanding is one incarnation's reading, folded from a lane.
type IncarnationStanding struct {
	// Incarnation is the incarnation's digest.
	Incarnation string
	// Store is the store directory it ran over, by digest.
	Store string
	// Predecessor is the incarnation it succeeded, empty for a store's first.
	Predecessor string
	// Position is where its establishment landed.
	Position int
	// Standing is established or retired, and never anything about liveness.
	Standing Standing
	// Cause is the retirement cause, empty while the incarnation is unretired.
	Cause string
}

// ErrTiedIncarnations refuses two distinct greatest incarnations for one store.
var ErrTiedIncarnations = errors.New("two distinct incarnations are greatest for one store directory")

// ErrNoIncarnation refuses a read over a store no incarnation was established
// for.
var ErrNoIncarnation = errors.New("no incarnation is established for that store directory")

// FoldIncarnations folds one incarnation lane into the standing of every
// incarnation it carries, ordered by the position each was established at.
//
// Retirement is applied where it is found and nowhere else: an incarnation with
// no retirement fact stays Established, and no elapsed anything moves it. This
// is the fold the crash arm's evidence is read from, and its output is recorded
// verbatim rather than summarised.
func FoldIncarnations(facts []map[string]any) ([]IncarnationStanding, error) {
	byDigest := make(map[string]*IncarnationStanding)
	order := make([]string, 0, len(facts))
	for position, fact := range facts {
		kind, _ := fact["kind"].(string)
		switch kind {
		case "substrate-incarnation-established":
			digest, ok := fact["incarnation"].(string)
			if !ok {
				return nil, fmt.Errorf("an establishment at position %d names no incarnation", position)
			}
			store, _ := fact["store"].(string)
			predecessor, _ := fact["predecessor"].(string)
			if _, already := byDigest[digest]; already {
				continue
			}
			byDigest[digest] = &IncarnationStanding{
				Incarnation: digest,
				Store:       store,
				Predecessor: predecessor,
				Position:    position,
				Standing:    StandingEstablished,
			}
			order = append(order, digest)
		case "substrate-incarnation-retired":
			digest, ok := fact["incarnation"].(string)
			if !ok {
				return nil, fmt.Errorf("a retirement at position %d names no incarnation", position)
			}
			standing, established := byDigest[digest]
			if !established {
				// A retirement for an incarnation the lane never established is
				// a broken record, not a shorter one.
				return nil, fmt.Errorf(
					"the retirement at position %d names an incarnation the lane never established", position,
				)
			}
			cause, _ := fact["cause"].(string)
			standing.Standing = StandingRetired
			standing.Cause = cause
		}
	}
	standings := make([]IncarnationStanding, 0, len(order))
	for _, digest := range order {
		standings = append(standings, *byDigest[digest])
	}
	sort.SliceStable(standings, func(left, right int) bool {
		return standings[left].Position < standings[right].Position
	})
	return standings, nil
}

// GreatestIncarnation is the greatest-position read over one store directory's
// incarnations — the proven provision fold, and the answer to "what incarnation
// is current".
//
// A tie at the greatest position REFUSES rather than picking. Two distinct
// incarnations established at one position is a disagreement, and choosing one
// of them would make the read a decision. The answer carries the standing, so a
// caller learns "current, and retired with this cause" or "current, and never
// retired" — and never "live", which this fold cannot say.
func GreatestIncarnation(
	standings []IncarnationStanding,
	store string,
) (IncarnationStanding, error) {
	greatest := -1
	var read *IncarnationStanding
	for index := range standings {
		candidate := standings[index]
		if candidate.Store != store {
			continue
		}
		if candidate.Position > greatest {
			greatest = candidate.Position
			read = &standings[index]
			continue
		}
		if candidate.Position == greatest && read != nil && candidate.Incarnation != read.Incarnation {
			return IncarnationStanding{}, fmt.Errorf("%w: position %d", ErrTiedIncarnations, greatest)
		}
	}
	if read == nil {
		return IncarnationStanding{}, ErrNoIncarnation
	}
	return *read, nil
}

// LatestMention is the greatest position at which one lane names one
// incarnation, or -1 for a lane that never names it.
func LatestMention(facts []map[string]any, incarnation string) int {
	latest := -1
	for position, fact := range facts {
		if named, _ := fact["incarnation"].(string); named == incarnation {
			latest = position
		}
	}
	return latest
}

// Staleness is the positional distance between a lane's head and the greatest
// position at which the lane names one incarnation.
//
// **It is a number a reader is handed, and it is never a verdict.** Nothing
// here reads a clock, nothing here compares against a tolerance, and nothing
// here has an answer that says an incarnation is or is not running: what the
// number says is how many positions the lane has taken since this incarnation
// last appeared on it, which is exactly as much as the record knows. A reader
// that wants to act on it brings its own tolerance and owns the reading.
//
// The second return is whether the lane names the incarnation at all. An
// unmentioned incarnation has no staleness rather than a staleness of zero,
// which is the same distinction the estate's other positional reads make: the
// absence of a reading is not a reading of zero.
func Staleness(facts []map[string]any, incarnation string) (int, bool) {
	latest := LatestMention(facts, incarnation)
	if latest < 0 {
		return 0, false
	}
	return len(facts) - 1 - latest, true
}

// ErrChainStep refuses a chain step the history does not carry, or one already
// walked.
var ErrChainStep = errors.New("an incarnation chain is walked by predecessor digest and every step names an incarnation the history carries")

// WalkChain walks one incarnation chain from a head, newest first.
//
// Total and acyclic, and both are checked rather than argued. A step naming an
// incarnation the history does not carry refuses instead of stopping quietly,
// because a chain that ends early reads as a shorter history rather than as a
// missing one. A step naming an incarnation already walked refuses instead of
// looping: a cycle cannot be built out of honest digests, since a value's name
// covers its predecessor's name, and the check is here for the histories that
// were not built out of honest digests.
//
// Nothing about liveness is read here. The walk is a history, and a history says
// what happened, never what is.
func WalkChain(history map[string]SubstrateIncarnation, head string) ([]string, error) {
	walked := make([]string, 0, len(history))
	seen := make(map[string]struct{}, len(history))
	cursor := head
	for cursor != "" {
		if _, already := seen[cursor]; already {
			return nil, fmt.Errorf("%w: %s was already walked", ErrChainStep, cursor)
		}
		value, carried := history[cursor]
		if !carried {
			return nil, fmt.Errorf("%w: %s is absent", ErrChainStep, cursor)
		}
		seen[cursor] = struct{}{}
		walked = append(walked, cursor)
		cursor = value.Predecessor
	}
	return walked, nil
}
