package protod

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"

	"foldlab/canonical"
	"foldlab/journal"
)

const (
	protocolSessionVersion       = "flb.protocol.session.v0"
	protocolSessionJournalPrefix = "flb_protocol_session_v0_"
)

type protocolPredecessor struct {
	Session     string `json:"session"`
	StateDigest string `json:"state_digest"`
}

type protocolSessionOpenRequest struct {
	Protocol    string               `json:"protocol"`
	Bindings    map[string]string    `json:"bindings"`
	Predecessor *protocolPredecessor `json:"predecessor,omitempty"`
}

type protocolSessionFillRequest struct {
	Session   string `json:"session"`
	Principal string `json:"principal"`
	Hole      string `json:"hole"`
	Value     any    `json:"value"`
}

type protocolSessionCloseRequest struct {
	Session   string `json:"session"`
	Principal string `json:"principal"`
}

type protocolSessionStateRequest struct {
	Session string `json:"session"`
}

type protocolSessionEvent struct {
	Version          string               `json:"version,omitempty"`
	Kind             string               `json:"kind"`
	Protocol         string               `json:"protocol,omitempty"`
	Bindings         map[string]string    `json:"bindings,omitempty"`
	Predecessor      *protocolPredecessor `json:"predecessor,omitempty"`
	Principal        string               `json:"principal,omitempty"`
	Seat             string               `json:"seat,omitempty"`
	Hole             string               `json:"hole,omitempty"`
	Value            any                  `json:"value,omitempty"`
	Outcome          string               `json:"outcome,omitempty"`
	FinalStateDigest string               `json:"final_state_digest,omitempty"`
	Retention        string               `json:"retention"`
}

type protocolSessionJournal struct {
	mu      sync.Mutex
	journal *journal.Journal
}

type protocolOpenReply struct {
	OK      bool       `json:"ok"`
	Session string     `json:"session"`
	Head    string     `json:"head"`
	Next    []NextHint `json:"next"`
}

type protocolFillReply struct {
	OK        bool             `json:"ok"`
	Head      string           `json:"head"`
	HoleState protocolHoleFold `json:"hole_state"`
	Next      []NextHint       `json:"next"`
}

type protocolCloseReply struct {
	OK      bool       `json:"ok"`
	Head    string     `json:"head"`
	Outcome string     `json:"outcome"`
	Next    []NextHint `json:"next"`
}

type protocolStateReply struct {
	OK               bool                        `json:"ok"`
	Session          string                      `json:"session"`
	Protocol         string                      `json:"protocol"`
	Bindings         map[string]string           `json:"bindings"`
	Holes            map[string]protocolHoleFold `json:"holes"`
	Status           string                      `json:"status"`
	Outcome          string                      `json:"outcome,omitempty"`
	Predecessor      *protocolPredecessor        `json:"predecessor,omitempty"`
	FinalStateDigest string                      `json:"final_state_digest,omitempty"`
	Head             string                      `json:"head"`
	Next             []NextHint                  `json:"next"`
}

func (d *Daemon) serveProtocolSessionOpen(ctx context.Context, body []byte) any {
	var request protocolSessionOpenRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "protocol", "bindings"); refusal != nil {
		return refuse(refusal)
	}
	fact, known := d.catalog.resolveFact(request.Protocol)
	if !known || fact.Scheme != protocolScheme {
		return refuse(&Refusal{
			Kind: KindUnknownRef,
			Law:  "protocol.session.open resolves its protocol identity before creating a session",
			Path: []string{"protocol"}, Got: request.Protocol,
			Expected: "a cataloged flb.protocol.v0 digest",
			Next:     []NextHint{{Subject: SubjectProtocolCreate, Note: "create the protocol first, then open its session"}, readCatalogHint()},
		})
	}
	definition, err := protocolFromFact(fact)
	if err != nil {
		return refuse(&Refusal{
			Kind: KindInvalidStructure,
			Law:  "a cataloged fact that does not satisfy the flb.protocol.v0 grammar refuses at session open rather than folding",
			Path: []string{"protocol"}, Got: request.Protocol,
			Expected: "a cataloged flb.protocol.v0 value carrying the required completion, close, and revision declarations",
			Next:     []NextHint{{Subject: SubjectProtocolCreate, Note: "recreate the protocol under the current grammar, then open its session"}, describeHint()},
		})
	}
	if refusal := validateBindings(definition, request.Bindings); refusal != nil {
		return refuse(refusal)
	}
	if request.Predecessor != nil {
		if refusal, err := d.validatePredecessor(ctx, request.Predecessor); err != nil {
			return nil
		} else if refusal != nil {
			return refuse(refusal)
		}
	}
	event := protocolSessionEvent{
		Version: protocolSessionVersion, Kind: "open", Protocol: request.Protocol,
		Bindings: cloneBindings(request.Bindings), Predecessor: clonePredecessor(request.Predecessor),
		Retention: retentionIrreducible,
	}
	payload, err := canonicalBytes(event)
	if err != nil {
		return nil
	}
	name := protocolSessionJournalPrefix + canonical.DigestHex(payload)
	opened, err := d.openJournal(ctx, name)
	if err != nil {
		return nil
	}
	stored := d.cacheProtocolSession(name, opened)
	stored.mu.Lock()
	defer stored.mu.Unlock()
	fold, cursor, err := d.replayProtocolSession(ctx, name, stored.journal)
	if err != nil {
		return nil
	}
	if fold == nil {
		entry := canonical.ChainEntry{Seq: 0, Prev: genesis, Payload: string(payload)}
		if _, err := stored.journal.AppendEntry(ctx, entry); err != nil {
			return nil
		}
		cursor = stored.journal.Head()
	}
	return protocolOpenReply{
		OK: true, Session: name, Head: cursor.Head,
		Next: []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the verified protocol-session fold", Body: map[string]any{"session": name}}},
	}
}

func (d *Daemon) serveProtocolSessionFill(ctx context.Context, body []byte) any {
	var request protocolSessionFillRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "session", "principal", "hole"); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireProtocolValue(body); refusal != nil {
		return refuse(refusal)
	}
	stored, refusal, err := d.lookupProtocolSession(ctx, request.Session)
	if err != nil {
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	stored.mu.Lock()
	defer stored.mu.Unlock()
	fold, cursor, err := d.replayProtocolSession(ctx, request.Session, stored.journal)
	if err != nil {
		return nil
	}
	if fold == nil {
		// A journal with no open event replays to no fold: silence until the
		// open is redelivered, never a panic.
		return nil
	}
	hole, known := protocolHoleByName(fold.definition, request.Hole)
	if !known {
		return refuse(protocolSessionMoveRefusal(request.Session, []string{"hole"}, request.Hole, "a hole declared by this session's protocol", "choose a declared hole"))
	}
	seat, authorized := principalSeat(hole.Seats, fold.Bindings, request.Principal)
	if !authorized {
		return refuse(&Refusal{
			Kind: KindSeatUnauthorized,
			Law:  "a protocol fill principal must hold one of the target hole's declared seats",
			Path: []string{"principal"}, Got: request.Principal, Expected: cloneJSON(hole.Seats),
			Next: []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the immutable seat bindings before choosing an authorized principal", Body: map[string]any{"session": request.Session}}},
		})
	}
	if refusal := d.checkCatalogedValue(hole.Type, request.Value, []string{"value"}); refusal != nil {
		refusal.Next = []NextHint{{
			Subject: SubjectProtocolSessionState,
			Note:    "read the session and submit a conforming value to a hole this session still admits",
			Body:    map[string]any{"session": request.Session},
		}, describeHint()}
		return refuse(refusal)
	}
	valueBytes, err := canonicalBytes(request.Value)
	if err != nil {
		return refuse(protocolValueDomainRefusal(request.Session))
	}
	_, outcome, err := protocolFillStep(fold.definition.Revision, fold.Status, fold.Holes[request.Hole], request.Value, valueBytes, seat)
	if err != nil {
		// A retained value that lost its canonical bytes is substrate
		// corruption: silence, never a fabricated law.
		return nil
	}
	switch outcome {
	case fillIdempotent:
		return protocolFillReply{
			OK: true, Head: cursor.Head, HoleState: cloneHoleFold(fold.Holes[request.Hole]),
			Next: protocolSessionNext(request.Session),
		}
	case fillRefusedSelfRevision:
		return refuse(protocolSessionMoveRefusal(
			request.Session,
			[]string{"value"}, request.Value,
			"no self-revision: a seat opens a new protocol round to revise its own filled value",
			"correction is a new round: close this round, then open a successor that cites it",
		))
	case fillRefusedClosed:
		return refuse(protocolClosed(request.Session))
	case fillRefusedState:
		return refuse(protocolSessionMoveRefusal(request.Session, []string{"hole"}, request.Hole, "an open, filled, or disputed hole", "read session state"))
	}
	event := protocolSessionEvent{
		Kind: "fill", Principal: request.Principal, Seat: seat, Hole: request.Hole,
		Value: cloneJSON(request.Value), Retention: retentionCompactible,
	}
	head, err := appendProtocolEvent(ctx, stored.journal, cursor, event)
	if err != nil {
		return nil
	}
	nextFold, _, err := d.replayProtocolSession(ctx, request.Session, stored.journal)
	if err != nil {
		return nil
	}
	return protocolFillReply{
		OK: true, Head: head, HoleState: cloneHoleFold(nextFold.Holes[request.Hole]),
		Next: protocolSessionNext(request.Session),
	}
}

func (d *Daemon) serveProtocolSessionClose(ctx context.Context, body []byte) any {
	var request protocolSessionCloseRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "session", "principal"); refusal != nil {
		return refuse(refusal)
	}
	stored, refusal, err := d.lookupProtocolSession(ctx, request.Session)
	if err != nil {
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	stored.mu.Lock()
	defer stored.mu.Unlock()
	fold, cursor, err := d.replayProtocolSession(ctx, request.Session, stored.journal)
	if err != nil {
		return nil
	}
	if fold == nil {
		// A journal with no open event replays to no fold: silence until the
		// open is redelivered, never a panic.
		return nil
	}
	closed, outcome, err := protocolCloseStep(fold)
	if outcome == closeRefusedClosed {
		return refuse(protocolClosed(request.Session))
	}
	if _, authorized := principalSeat(fold.definition.Close, fold.Bindings, request.Principal); !authorized {
		return refuse(&Refusal{
			Kind: KindSeatUnauthorized,
			Law:  "a close principal must hold one of the protocol's declared close seats",
			Path: []string{"principal"}, Got: request.Principal, Expected: cloneJSON(fold.definition.Close),
			Next: []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the immutable seat bindings before choosing a principal bound to a declared close seat", Body: map[string]any{"session": request.Session}}},
		})
	}
	if err != nil {
		// A fold the close kernel cannot fence or digest is substrate
		// corruption: silence, never a fabricated law — and it answers only
		// after the teachable closed and close-authority refusals, preserving the
		// pre-kernel refusal precedence.
		return nil
	}
	event := protocolSessionEvent{
		Kind: "close", Principal: request.Principal, Outcome: closed.Outcome,
		FinalStateDigest: closed.FinalStateDigest, Retention: retentionNeverDiscard,
	}
	head, err := appendProtocolEvent(ctx, stored.journal, cursor, event)
	if err != nil {
		return nil
	}
	// head and outcome are captured while the per-session critical section is
	// still held; no later append can leak into this close reply.
	return protocolCloseReply{
		OK: true, Head: head, Outcome: closed.Outcome,
		Next: []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the terminal verified fold and its final state digest", Body: map[string]any{"session": request.Session}}},
	}
}

func (d *Daemon) serveProtocolSessionState(ctx context.Context, body []byte) any {
	var request protocolSessionStateRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "session"); refusal != nil {
		return refuse(refusal)
	}
	stored, refusal, err := d.lookupProtocolSession(ctx, request.Session)
	if err != nil {
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	stored.mu.Lock()
	defer stored.mu.Unlock()
	fold, cursor, err := d.replayProtocolSession(ctx, request.Session, stored.journal)
	if err != nil {
		return nil
	}
	if fold == nil {
		// A journal with no open event replays to no fold: silence until the
		// open is redelivered, never a panic.
		return nil
	}
	return protocolStateReply{
		OK: true, Session: request.Session, Protocol: fold.Protocol,
		Bindings: cloneBindings(fold.Bindings), Holes: cloneHoles(fold.Holes),
		Status: fold.Status, Outcome: fold.Outcome,
		Predecessor: clonePredecessor(fold.Predecessor), FinalStateDigest: fold.FinalStateDigest,
		Head: cursor.Head, Next: protocolSessionNext(request.Session),
	}
}

func (d *Daemon) replayProtocolSession(ctx context.Context, name string, opened *journal.Journal) (*protocolSessionFold, journal.Cursor, error) {
	entries, cursor, err := opened.Read(ctx, journal.Cursor{Seq: -1, Head: genesis}, 0)
	if err != nil {
		return nil, journal.Cursor{}, err
	}
	var fold *protocolSessionFold
	for _, entry := range entries {
		var event protocolSessionEvent
		if err := json.Unmarshal([]byte(entry.Payload), &event); err != nil {
			return nil, journal.Cursor{}, fmt.Errorf("protocol session %s event %d: %w", name, entry.Seq, err)
		}
		fold, err = d.applyProtocolEvent(name, fold, event)
		if err != nil {
			return nil, journal.Cursor{}, fmt.Errorf("protocol session %s event %d: %w", name, entry.Seq, err)
		}
	}
	return fold, cursor, nil
}

// applyProtocolEvent owns the impure half of stored-event validation —
// catalog resolution, seat derivation, value conformance, declared close
// authority — and hands every semantic outcome to the kernels in
// protocol_step.go through protocolSessionTransition.
func (d *Daemon) applyProtocolEvent(name string, fold *protocolSessionFold, event protocolSessionEvent) (*protocolSessionFold, error) {
	switch event.Kind {
	case "open":
		if fold != nil {
			return nil, errors.New("repeated protocol session open")
		}
		if event.Version != protocolSessionVersion {
			return nil, errors.New("a journal written under an unknown session version refuses replay rather than misfolding")
		}
		fact, known := d.catalog.resolveFact(event.Protocol)
		if !known {
			return nil, errors.New("protocol session protocol is absent from catalog")
		}
		definition, err := protocolFromFact(fact)
		if err != nil {
			return nil, err
		}
		if refusal := validateBindings(definition, event.Bindings); refusal != nil {
			return nil, errors.New("stored protocol session bindings are invalid")
		}
		return protocolOpenFold(name, definition, event), nil
	case "fill":
		if fold == nil {
			return nil, errors.New("fill precedes its protocol session open")
		}
		hole, known := protocolHoleByName(fold.definition, event.Hole)
		seat, authorized := principalSeat(hole.Seats, fold.Bindings, event.Principal)
		if !known || !authorized || seat != event.Seat {
			return nil, errors.New("stored fill does not carry its derived authorized seat")
		}
		if refusal := d.checkCatalogedValue(hole.Type, event.Value, []string{"value"}); refusal != nil {
			return nil, errors.New("stored fill value does not conform to its hole type")
		}
		return protocolSessionTransition(fold, event)
	case "close":
		var authorized bool
		if fold != nil {
			_, authorized = principalSeat(fold.definition.Close, fold.Bindings, event.Principal)
		}
		if !authorized {
			return nil, errors.New("stored close is unauthorized or repeated")
		}
		return protocolSessionTransition(fold, event)
	default:
		return nil, fmt.Errorf("unknown protocol session event kind %q", event.Kind)
	}
}

func validateBindings(definition protocolDefinition, bindings map[string]string) *Refusal {
	if len(bindings) != len(definition.Seats) {
		return protocolMoveRefusal([]string{"bindings"}, cloneBindings(bindings), "exactly one non-empty principal for every protocol seat and no unknown seats", "supply exact bindings")
	}
	declared := stringSet(definition.Seats)
	for seat, principal := range bindings {
		if !declared[seat] || principal == "" {
			return protocolMoveRefusal([]string{"bindings", seat}, principal, "a declared seat bound to a non-empty trusted-principal name", "repair the binding")
		}
	}
	return nil
}

func (d *Daemon) validatePredecessor(ctx context.Context, predecessor *protocolPredecessor) (*Refusal, error) {
	if predecessor.Session == "" || !hexDigest.MatchString(predecessor.StateDigest) {
		return protocolMoveRefusal([]string{"predecessor"}, predecessor, "a prior closed session id and its 64-character final state digest", "supply a verified predecessor"), nil
	}
	stored, refusal, err := d.lookupProtocolSession(ctx, predecessor.Session)
	if err != nil || refusal != nil {
		return refusal, err
	}
	stored.mu.Lock()
	defer stored.mu.Unlock()
	fold, _, err := d.replayProtocolSession(ctx, predecessor.Session, stored.journal)
	if err != nil {
		return nil, err
	}
	if fold.Status != "closed" || fold.FinalStateDigest != predecessor.StateDigest {
		return &Refusal{
			Kind: KindDigestMismatch,
			Law:  "a successor cites the exact final state digest of a verified closed predecessor session",
			Path: []string{"predecessor", "state_digest"}, Got: predecessor.StateDigest,
			Expected: fold.FinalStateDigest,
			Next:     []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the predecessor's verified terminal state", Body: map[string]any{"session": predecessor.Session}}},
		}, nil
	}
	return nil, nil
}

func (d *Daemon) cacheProtocolSession(name string, opened *journal.Journal) *protocolSessionJournal {
	d.protocolSessionMu.Lock()
	defer d.protocolSessionMu.Unlock()
	if cached := d.protocolSessions[name]; cached != nil {
		return cached
	}
	cached := &protocolSessionJournal{journal: opened}
	d.protocolSessions[name] = cached
	return cached
}

func (d *Daemon) lookupProtocolSession(ctx context.Context, name string) (*protocolSessionJournal, *Refusal, error) {
	if !strings.HasPrefix(name, protocolSessionJournalPrefix) || !hexDigest.MatchString(strings.TrimPrefix(name, protocolSessionJournalPrefix)) {
		return nil, &Refusal{
			Kind: KindBadJournal,
			Law:  "flb.protocol.session.v0 addresses a content-addressed protocol-session journal",
			Path: []string{"session"}, Got: name,
			Expected: protocolSessionJournalPrefix + "<64 lowercase hex characters>",
			Next:     []NextHint{describeHint()},
		}, nil
	}
	opened, refusal, err := d.lookupJournal(ctx, name)
	if err != nil || refusal != nil {
		return nil, refusal, err
	}
	return d.cacheProtocolSession(name, opened), nil, nil
}

func appendProtocolEvent(ctx context.Context, opened *journal.Journal, cursor journal.Cursor, event protocolSessionEvent) (string, error) {
	payload, err := canonicalBytes(event)
	if err != nil {
		return "", err
	}
	entry := canonical.ChainEntry{Seq: int64(cursor.Seq + 1), Prev: cursor.Head, Payload: string(payload)}
	if _, err := opened.AppendEntry(ctx, entry); err != nil {
		return "", err
	}
	return opened.Head().Head, nil
}

func protocolHoleByName(definition protocolDefinition, name string) (protocolHole, bool) {
	for _, hole := range definition.Holes {
		if hole.Name == name {
			return hole, true
		}
	}
	return protocolHole{}, false
}

func principalSeat(seats []string, bindings map[string]string, principal string) (string, bool) {
	for _, seat := range seats {
		if bindings[seat] == principal {
			return seat, true
		}
	}
	return "", false
}

func protocolValueDomainRefusal(session string) *Refusal {
	return &Refusal{
		Kind: KindInvalidStructure,
		Law:  "a protocol fill value must have canonical bytes; identity cannot retain a value the canonical encoding refuses",
		Path: []string{"value"}, Got: "a value outside the canonical encoding domain",
		Expected: "a JSON value the RFC 8785 encoding admits",
		Next: []NextHint{{
			Subject: SubjectProtocolSessionState,
			Note:    "submit a value inside the canonical identity domain",
			Body:    map[string]any{"session": session},
		}, describeHint()},
	}
}

func cloneBindings(bindings map[string]string) map[string]string {
	result := make(map[string]string, len(bindings))
	for seat, principal := range bindings {
		result[seat] = principal
	}
	return result
}

func clonePredecessor(predecessor *protocolPredecessor) *protocolPredecessor {
	if predecessor == nil {
		return nil
	}
	copy := *predecessor
	return &copy
}

func protocolMoveRefusal(path []string, got, expected any, repair string) *Refusal {
	return &Refusal{
		Kind: KindInvalidStructure,
		Law:  "flb.protocol.session.v0 admits only moves licensed by the current hole state",
		Path: frozenPath(path), Got: got, Expected: expected,
		Next: []NextHint{{Subject: SubjectContractDescribe, Note: repair, Body: map[string]any{}}},
	}
}

func protocolSessionMoveRefusal(session string, path []string, got, expected any, repair string) *Refusal {
	refusal := protocolMoveRefusal(path, got, expected, repair)
	refusal.Next = []NextHint{{
		Subject: SubjectProtocolSessionState, Note: repair,
		Body: map[string]any{"session": session},
	}}
	return refusal
}

func protocolClosed(session string) *Refusal {
	return &Refusal{
		Kind: KindSessionClosed,
		Law:  "a closed protocol session is terminal for meaning: evidence receipts append only to decided and sealed holes; unfilled holes and repeated closes never append",
		Path: []string{"session"}, Got: session, Expected: "an open protocol session",
		Next: []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the terminal fold; revision requires a successor round", Body: map[string]any{"session": session}}},
	}
}

func protocolSessionNext(session string) []NextHint {
	return []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the verified current protocol-session fold", Body: map[string]any{"session": session}}}
}

func requireProtocolValue(body []byte) *Refusal {
	var decoded map[string]json.RawMessage
	if err := json.Unmarshal(body, &decoded); err != nil {
		return nil
	}
	if _, present := decoded["value"]; !present {
		return malformedSessionField("value", nil, "a required JSON value, including null when the hole type licenses it")
	}
	return nil
}
