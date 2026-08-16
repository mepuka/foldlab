// The pure step seam for flb.protocol.session.v0: every semantic branch on
// hole state, session status, close outcome, or digest lives in this file.
// The serve paths validate a request, call a kernel, and translate its
// outcome into a reply; the replay validator validates a stored event, calls
// the same kernels through protocolSessionTransition, and refuses every
// outcome the serve paths never journal. A semantic switch on these facts
// anywhere else is a review failure.
package protod

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
)

// The fold data model lives beside the kernels because its state-dependent
// marshal shapes the digest preimage: which fields a hole state exposes is
// identity, not presentation.

type protocolCandidate struct {
	Value any    `json:"value"`
	Seat  string `json:"seat"`
}

type protocolHoleFold struct {
	State      string              `json:"state"`
	Value      any                 `json:"value,omitempty"`
	Candidates []protocolCandidate `json:"candidates,omitempty"`
	Sealed     bool                `json:"sealed,omitempty"`
}

// MarshalJSON keeps meaning and journal evidence in separate fields: value
// carries the hole's meaning, candidates carries its retained (value, seat)
// evidence pairs. Every non-open state exposes its evidence — a confirming
// refill must be readable in the state read, not only in the raw journal.
// A JSON null is still a present filled/decided value rather than being
// erased by omitempty.
func (h protocolHoleFold) MarshalJSON() ([]byte, error) {
	value := map[string]any{"state": h.State}
	switch h.State {
	case "filled":
		value["value"] = h.Value
		value["candidates"] = h.Candidates
		if h.Sealed {
			value["sealed"] = true
		}
	case "disputed":
		value["candidates"] = h.Candidates
	case "decided":
		value["value"] = h.Value
		value["candidates"] = h.Candidates
	}
	return json.Marshal(value)
}

type protocolSessionFold struct {
	Session          string                      `json:"session"`
	Protocol         string                      `json:"protocol"`
	Bindings         map[string]string           `json:"bindings"`
	Holes            map[string]protocolHoleFold `json:"holes"`
	Status           string                      `json:"status"`
	Outcome          string                      `json:"outcome,omitempty"`
	Predecessor      *protocolPredecessor        `json:"predecessor,omitempty"`
	FinalStateDigest string                      `json:"final_state_digest,omitempty"`
	definition       protocolDefinition
}

func cloneProtocolFold(fold *protocolSessionFold) *protocolSessionFold {
	return &protocolSessionFold{
		Session: fold.Session, Protocol: fold.Protocol, Bindings: cloneBindings(fold.Bindings),
		Holes: cloneHoles(fold.Holes), Status: fold.Status, Outcome: fold.Outcome,
		Predecessor: clonePredecessor(fold.Predecessor), FinalStateDigest: fold.FinalStateDigest,
		definition: fold.definition,
	}
}

func cloneHoles(holes map[string]protocolHoleFold) map[string]protocolHoleFold {
	result := make(map[string]protocolHoleFold, len(holes))
	for name, state := range holes {
		result[name] = cloneHoleFold(state)
	}
	return result
}

func cloneHoleFold(state protocolHoleFold) protocolHoleFold {
	candidates := make([]protocolCandidate, len(state.Candidates))
	for index, candidate := range state.Candidates {
		candidates[index] = protocolCandidate{Value: cloneJSON(candidate.Value), Seat: candidate.Seat}
	}
	return protocolHoleFold{
		State: state.State, Value: cloneJSON(state.Value), Candidates: candidates, Sealed: state.Sealed,
	}
}

type fillOutcome int

const (
	fillJournal fillOutcome = iota
	fillIdempotent
	fillRefusedSelfRevision
	fillRefusedClosed
	fillRefusedState
)

// protocolFillStep is the one fill kernel: the serve path and the replay
// validator both apply it, so admitted wire behavior and stored-event
// validation cannot drift. A fill journals exactly when its (value, seat)
// pair is new to the hole's retained evidence; a pair already present is the
// idempotent outcome, so at-least-once redelivery never grows the journal.
// While the session is open, an open hole fills, a filled hole takes a
// confirming refill or becomes a dispute built from every evidence pair plus
// the offender, and a disputed hole absorbs from any authorized seat. After
// close, meaning is fenced: decided and sealed holes append evidence
// receipts, anything else refuses. The revision policy is the protocol's own
// declaration: under "successor-round" a seat that contributed an evidence
// pair for the filled value may not submit a different value in the same
// round, while under "absorb" that fill disputes like any other clash and
// fills are total.
func protocolFillStep(revision string, status string, current protocolHoleFold, value any, valueBytes []byte, seat string) (protocolHoleFold, fillOutcome, error) {
	pair := protocolCandidate{Value: cloneJSON(value), Seat: seat}
	withPair := func(state protocolHoleFold) protocolHoleFold {
		next := cloneHoleFold(state)
		next.Candidates = canonicalCandidates(append(next.Candidates, pair))
		return next
	}
	if status == "closed" {
		if current.State != "decided" && !(current.State == "filled" && current.Sealed) {
			return protocolHoleFold{}, fillRefusedClosed, nil
		}
		present, err := candidatePairPresent(current.Candidates, valueBytes, seat)
		if err != nil {
			return protocolHoleFold{}, fillRefusedState, err
		}
		if present {
			return current, fillIdempotent, nil
		}
		return withPair(current), fillJournal, nil
	}
	switch current.State {
	case "open":
		return protocolHoleFold{
			State: "filled", Value: cloneJSON(value),
			Candidates: []protocolCandidate{pair},
		}, fillJournal, nil
	case "filled":
		present, err := candidatePairPresent(current.Candidates, valueBytes, seat)
		if err != nil {
			return protocolHoleFold{}, fillRefusedState, err
		}
		if present {
			return current, fillIdempotent, nil
		}
		filledBytes, err := canonicalBytes(current.Value)
		if err != nil {
			return protocolHoleFold{}, fillRefusedState, err
		}
		if bytes.Equal(filledBytes, valueBytes) {
			return withPair(current), fillJournal, nil
		}
		if revision == protocolRevisionSuccessorRound {
			contributed, err := candidatePairPresent(current.Candidates, filledBytes, seat)
			if err != nil {
				return protocolHoleFold{}, fillRefusedState, err
			}
			if contributed {
				return protocolHoleFold{}, fillRefusedSelfRevision, nil
			}
		}
		next := withPair(current)
		next.State = "disputed"
		next.Value = nil
		return next, fillJournal, nil
	case "disputed":
		present, err := candidatePairPresent(current.Candidates, valueBytes, seat)
		if err != nil {
			return protocolHoleFold{}, fillRefusedState, err
		}
		if present {
			return current, fillIdempotent, nil
		}
		return withPair(current), fillJournal, nil
	default:
		return protocolHoleFold{}, fillRefusedState, nil
	}
}

type closeOutcome int

const (
	closeJournal closeOutcome = iota
	closeRefusedClosed
)

// protocolCloseStep is the one close kernel: it seals filled holes, fences
// disputes by the declared seat order, records open holes as unfilled,
// takes the outcome from the protocol's completion declaration — completed
// exactly when every declared hole ends filled or decided — and pins the
// versioned final-state digest. An error is substrate corruption (a fold
// the fence cannot represent or the canonical encoding refuses), never a
// lawful outcome.
func protocolCloseStep(fold *protocolSessionFold) (*protocolSessionFold, closeOutcome, error) {
	if fold.Status != "open" {
		return nil, closeRefusedClosed, nil
	}
	closed := cloneProtocolFold(fold)
	closed.Status = "closed"
	for _, hole := range closed.definition.Holes {
		state := closed.Holes[hole.Name]
		switch state.State {
		case "open":
			state.State = "unfilled"
		case "filled":
			state.Sealed = true
		case "disputed":
			chosen, ok := fenceChoice(hole, state.Candidates)
			if !ok {
				return nil, closeJournal, errors.New("stored disputed hole has no fence-represented candidate")
			}
			state.State = "decided"
			state.Value = cloneJSON(chosen)
		}
		closed.Holes[hole.Name] = state
	}
	closed.Outcome = "completed"
	for _, name := range closed.definition.Completion {
		if state := closed.Holes[name]; state.State != "filled" && state.State != "decided" {
			closed.Outcome = "abandoned"
			break
		}
	}
	digest, err := protocolFinalStateDigest(closed)
	if err != nil {
		return nil, closeJournal, err
	}
	closed.FinalStateDigest = digest
	return closed, closeJournal, nil
}

// protocolSessionTransition folds one validated journal event. The caller
// owns the impure half — catalog resolution for open (which constructs the
// fold via protocolOpenFold), hole existence, seat derivation, and value
// conformance for fill, declared close authority for close — and every semantic
// outcome here is decided by the two kernels. A non-journal outcome refuses:
// the serve paths never write one, so a stored event carrying one is
// corruption.
//
// Ownership: the transition never mutates its input — fill and close each
// return a fresh fold, so a harness may step several events from one
// snapshot. The O(fold) clone per fill is the price of that purity, paid
// once per replayed event.
func protocolSessionTransition(fold *protocolSessionFold, event protocolSessionEvent) (*protocolSessionFold, error) {
	switch event.Kind {
	case "fill":
		valueBytes, err := canonicalBytes(event.Value)
		if err != nil {
			return nil, errors.New("stored fill value has no canonical bytes")
		}
		next, outcome, err := protocolFillStep(fold.definition.Revision, fold.Status, fold.Holes[event.Hole], event.Value, valueBytes, event.Seat)
		if err != nil {
			return nil, err
		}
		if outcome != fillJournal {
			return nil, errors.New(storedFillCorruption(outcome))
		}
		stepped := cloneProtocolFold(fold)
		stepped.Holes[event.Hole] = next
		return stepped, nil
	case "close":
		closed, outcome, err := protocolCloseStep(fold)
		if err != nil {
			return nil, err
		}
		if outcome != closeJournal {
			return nil, errors.New("stored close is unauthorized or repeated")
		}
		if closed.Outcome != event.Outcome {
			return nil, errors.New("stored close outcome does not match the fold")
		}
		if closed.FinalStateDigest != event.FinalStateDigest {
			return nil, errors.New("stored close final state digest does not match the fold")
		}
		return closed, nil
	default:
		return nil, fmt.Errorf("unknown protocol session event kind %q", event.Kind)
	}
}

// protocolOpenFold constructs the opened fold from a resolved definition;
// resolving that definition from the catalog is the caller's impure half.
func protocolOpenFold(name string, definition protocolDefinition, event protocolSessionEvent) *protocolSessionFold {
	holes := make(map[string]protocolHoleFold, len(definition.Holes))
	for _, hole := range definition.Holes {
		holes[hole.Name] = protocolHoleFold{State: "open"}
	}
	return &protocolSessionFold{
		Session: name, Protocol: event.Protocol, Bindings: cloneBindings(event.Bindings),
		Holes: holes, Status: "open", Predecessor: clonePredecessor(event.Predecessor),
		definition: definition,
	}
}

func candidatePairPresent(candidates []protocolCandidate, valueBytes []byte, seat string) (bool, error) {
	for _, candidate := range candidates {
		if candidate.Seat != seat {
			continue
		}
		stored, err := canonicalBytes(candidate.Value)
		if err != nil {
			return false, err
		}
		if bytes.Equal(stored, valueBytes) {
			return true, nil
		}
	}
	return false, nil
}

func storedFillCorruption(outcome fillOutcome) string {
	switch outcome {
	case fillIdempotent:
		return "stored fill repeats an already-journaled evidence pair"
	case fillRefusedSelfRevision:
		return "stored fill is a refused self-revision"
	case fillRefusedClosed:
		return "stored fill after close targets an unfilled hole"
	default:
		return "stored fill targets a stable hole state"
	}
}

func canonicalCandidates(candidates []protocolCandidate) []protocolCandidate {
	result := append([]protocolCandidate{}, candidates...)
	sort.Slice(result, func(i, j int) bool {
		if result[i].Seat != result[j].Seat {
			return utf16Less(result[i].Seat, result[j].Seat)
		}
		left, _ := canonicalBytes(result[i].Value)
		right, _ := canonicalBytes(result[j].Value)
		return bytes.Compare(left, right) < 0
	})
	return result
}

// fenceChoice picks the first fence-order seat holding a candidate; within
// that seat the candidates already sit in canonical order, so the tie-break
// is smallest canonical value bytes — deterministic and arrival-free.
func fenceChoice(hole protocolHole, candidates []protocolCandidate) (any, bool) {
	if hole.Fence == nil {
		return nil, false
	}
	for _, seat := range hole.Fence.Order {
		for _, candidate := range candidates {
			if candidate.Seat == seat {
				return candidate.Value, true
			}
		}
	}
	return nil, false
}

// protocolFinalStateDigest derives the versioned terminal identity: the
// preimage names its session version inside the digested bytes, so two
// preimage shapes can never collide on one digest domain, and covers
// protocol, bindings, hole folds (retained evidence included), status,
// outcome, and optional predecessor — never the journal head, which would
// be circular.
func protocolFinalStateDigest(fold *protocolSessionFold) (string, error) {
	meaning := map[string]any{
		"v":        protocolSessionVersion,
		"protocol": fold.Protocol, "bindings": fold.Bindings, "holes": fold.Holes,
		"status": fold.Status, "outcome": fold.Outcome,
	}
	if fold.Predecessor != nil {
		meaning["predecessor"] = fold.Predecessor
	}
	preimage, err := canonicalBytes(meaning)
	if err != nil {
		return "", err
	}
	return bytesSHA256V1{}.Derive(preimage), nil
}
