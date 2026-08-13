package protod

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	"foldlab/canonical"
	"foldlab/journal"
)

const (
	sessionVersion       = "flb.session.v0"
	sessionJournalPrefix = "flb_session_v0_"
	sessionStateScheme   = "bytes-sha256-v1"

	retentionCompactible  = "compactible"
	retentionIrreducible  = "irreducible"
	retentionNeverDiscard = "never-discardable"

	// This build-relative refusal is absence-sort when Task 30's classifier
	// merges: the corpus seam may appear at a later build and repeal it.
	KindCompactionBlocked = "compaction-blocked"
)

type sessionJournal struct {
	mu        sync.Mutex
	journal   *journal.Journal
	cursor    journal.Cursor
	principal string
	state     any
}

type sessionOpenRequest struct {
	Grammar string `json:"grammar"`
	Seed    any    `json:"seed"`
	Author  string `json:"author"`
}

type sessionMoveRequest struct {
	Session      string   `json:"session"`
	ExpectedHead string   `json:"expectedHead"`
	Principal    string   `json:"principal"`
	Op           string   `json:"op"`
	Path         []string `json:"path"`
	Subtree      any      `json:"subtree"`
}

type sessionStateRequest struct {
	Session string `json:"session"`
}

type sessionCommitRequest struct {
	Session      string `json:"session"`
	ExpectedHead string `json:"expectedHead"`
	Principal    string `json:"principal"`
	Submitter    string `json:"submitter"`
}

type sessionAnchor struct {
	Key         string `json:"key"`
	Head        string `json:"head"`
	StateDigest string `json:"stateDigest"`
}

type sessionStateReply struct {
	OK          bool            `json:"ok"`
	Session     string          `json:"session"`
	Head        string          `json:"head"`
	Step        int             `json:"step"`
	Principal   string          `json:"principal"`
	Partial     any             `json:"partial"`
	StateDigest string          `json:"stateDigest"`
	StateScheme string          `json:"stateScheme"`
	CatalogHead string          `json:"catalogHead"`
	Frontier    []frontierEntry `json:"frontier"`
	Anchor      sessionAnchor   `json:"anchor"`
	Next        []NextHint      `json:"next"`
}

type sessionCommitReply struct {
	OK          bool       `json:"ok"`
	Session     string     `json:"session"`
	Head        string     `json:"head"`
	Step        int        `json:"step"`
	Principal   string     `json:"principal"`
	StateDigest string     `json:"stateDigest"`
	Digest      string     `json:"digest"`
	Scheme      string     `json:"scheme"`
	CatalogSeq  int64      `json:"catalogSeq"`
	CatalogHead string     `json:"catalogHead"`
	Next        []NextHint `json:"next"`
}

type sessionEvent struct {
	Version     string   `json:"version,omitempty"`
	Kind        string   `json:"kind"`
	Grammar     string   `json:"grammar,omitempty"`
	Seed        any      `json:"seed,omitempty"`
	Author      string   `json:"author,omitempty"`
	Principal   string   `json:"principal,omitempty"`
	Path        []string `json:"path,omitempty"`
	Subtree     any      `json:"subtree,omitempty"`
	Digest      string   `json:"digest,omitempty"`
	Scheme      string   `json:"scheme,omitempty"`
	CatalogSeq  int64    `json:"catalogSeq,omitempty"`
	CatalogHead string   `json:"catalogHead,omitempty"`
	Retention   string   `json:"retention"`
}

// MarshalJSON keeps each variant's required fields present (notably an empty
// root path and catalogSeq zero) without leaking irrelevant null/zero fields
// from the shared decode carrier.
func (e sessionEvent) MarshalJSON() ([]byte, error) {
	value := map[string]any{"kind": e.Kind, "retention": e.Retention}
	switch e.Kind {
	case "open":
		value["version"] = e.Version
		value["grammar"] = e.Grammar
		value["seed"] = e.Seed
		value["author"] = e.Author
	case "fill":
		value["principal"] = e.Principal
		value["path"] = e.Path
		value["subtree"] = e.Subtree
	case "unfill":
		value["principal"] = e.Principal
		value["path"] = e.Path
	case "commit":
		value["principal"] = e.Principal
		value["digest"] = e.Digest
		value["scheme"] = e.Scheme
		value["catalogSeq"] = e.CatalogSeq
		value["catalogHead"] = e.CatalogHead
	}
	return json.Marshal(value)
}

type retentionMark struct {
	Step int    `json:"step"`
	Kind string `json:"kind"`
	Tier string `json:"tier"`
}

func sessionGrammarDigest() string {
	bytes, err := canonicalBytes(sessionGrammarDescriptor())
	if err != nil {
		panic(err)
	}
	return bytesSHA256V1{}.Derive(bytes)
}

// sessionGrammarDescriptor is the owned, canonical grammar fact carried by an
// open event's digest. It commits production shapes, not merely kind names, so
// a shape change necessarily opens under a different grammar identity.
func sessionGrammarDescriptor() any {
	return map[string]any{
		"name":        "flb.type.v0",
		"partialKind": map[string]any{"k": "hole", "required": []any{"k"}},
		"productions": []any{
			map[string]any{"k": "bool", "required": []any{"k"}},
			map[string]any{"k": "brand", "required": []any{"k", "name", "of"}, "children": map[string]any{"name": "non-empty-string", "of": "T"}},
			map[string]any{"k": "check", "required": []any{"base", "check", "k"}, "children": map[string]any{"base": "T", "check": "{name:non-empty-string,args:json-object}"}},
			map[string]any{"k": "float", "required": []any{"k"}},
			map[string]any{"k": "int", "required": []any{"k"}},
			map[string]any{"k": "list", "required": []any{"k", "of"}, "children": map[string]any{"of": "T"}},
			map[string]any{"k": "literal", "required": []any{"k", "value"}, "children": map[string]any{"value": "json"}},
			map[string]any{"k": "null", "required": []any{"k"}},
			map[string]any{"k": "opaque", "required": []any{"k"}},
			map[string]any{"k": "ref", "required": []any{"digest", "k"}, "children": map[string]any{"digest": "hex64"}},
			map[string]any{"k": "string", "required": []any{"k"}},
			map[string]any{
				"k": "struct", "required": []any{"fields", "k"}, "optional": []any{"optional"},
				"children": map[string]any{"fields": "record<string,T>", "optional": "sorted-unique-field-names"},
			},
			map[string]any{"k": "union", "required": []any{"k", "of"}, "children": map[string]any{"of": "non-empty-unique-unordered-T-array"}},
		},
	}
}

func (d *Daemon) serveSessionOpen(ctx context.Context, body []byte) any {
	request := sessionOpenRequest{Seed: map[string]any{"k": "hole"}}
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "grammar", "author"); refusal != nil {
		return refuse(refusal)
	}
	if request.Grammar != sessionGrammarDigest() {
		return refuse(&Refusal{
			Kind: KindInvalidStructure, Law: "flb.session.v0 opens against the daemon's exact grammar digest",
			Path: []string{"grammar"}, Got: request.Grammar, Expected: sessionGrammarDigest(),
			Next: []NextHint{describeHint()},
		})
	}
	if request.Author == "" {
		return refuse(malformedSessionField("author", request.Author, "a non-empty author string"))
	}
	result, walkRefusal := walkPartial(request.Seed, []string{})
	if walkRefusal != nil {
		walkRefusal.Path = append([]string{"seed"}, walkRefusal.Path...)
		return refuse(walkRefusal)
	}
	if unknown := d.firstUnknownRef(result.refs, "seed", SubjectSessionOpen); unknown != nil {
		return refuse(unknown)
	}

	event := sessionEvent{
		Version: sessionVersion, Kind: "open", Grammar: request.Grammar,
		Seed: cloneJSON(request.Seed), Author: request.Author,
		Retention: retentionTier("open"),
	}
	payload, err := canonicalBytes(event)
	if err != nil {
		return nil
	}
	session := sessionJournalPrefix + canonical.DigestHex(payload)
	opened, err := d.openJournal(ctx, session)
	if err != nil {
		return nil
	}
	stored := d.cacheSession(session, opened)
	stored.mu.Lock()
	defer stored.mu.Unlock()
	if err := stored.refresh(ctx); err != nil {
		return nil
	}
	if stored.cursor.Seq == -1 {
		entry, _, appendErr := opened.Append(ctx, string(payload))
		if appendErr != nil {
			return nil
		}
		stored.cursor = journal.Cursor{Seq: int(entry.Seq), Head: opened.Head().Head}
		stored.principal = request.Author
		stored.state = cloneJSON(request.Seed)
	}
	return d.sessionReply(session, stored)
}

func (d *Daemon) serveSessionMove(ctx context.Context, body []byte) any {
	var request sessionMoveRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "session", "expectedHead", "principal", "op", "path"); refusal != nil {
		return refuse(refusal)
	}
	if request.Principal == "" {
		return refuse(malformedSessionField("principal", request.Principal, "the non-empty principal established by session.open author"))
	}
	if request.Op == "fill" {
		if refusal := requireSessionFields(body, "subtree"); refusal != nil {
			return refuse(refusal)
		}
	} else if request.Op != "unfill" {
		return refuse(malformedSessionField("op", request.Op, []string{"fill", "unfill"}))
	}
	stored, refusal, err := d.lookupSession(ctx, request.Session)
	if err != nil {
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	stored.mu.Lock()
	defer stored.mu.Unlock()
	if err := stored.refresh(ctx); err != nil {
		return nil
	}
	contextValue := map[string]any{"principal": request.Principal, "op": request.Op, "path": request.Path}
	if request.Op == "fill" {
		contextValue["subtree"] = request.Subtree
	}
	if request.Principal != stored.principal {
		return refuse(d.sessionPrincipalMismatch(request.Session, SubjectSessionMove, request.Principal, contextValue, stored))
	}
	if request.ExpectedHead != stored.cursor.Head {
		return refuse(d.sessionStale(request.Session, SubjectSessionMove, request.ExpectedHead, contextValue, stored))
	}

	replacement := any(map[string]any{"k": "hole"})
	requireHole := false
	if request.Op == "fill" {
		replacement = request.Subtree
		requireHole = true
	}
	updated, replacementRefusal := replaceTypeNode(stored.state, request.Path, replacement, requireHole)
	if replacementRefusal != nil {
		replacementRefusal.Next = []NextHint{describeHint()}
		return refuse(replacementRefusal)
	}
	result, walkRefusal := walkPartial(updated, []string{})
	if walkRefusal != nil {
		walkRefusal.Next = []NextHint{describeHint()}
		return refuse(walkRefusal)
	}
	if unknown := d.firstUnknownRef(result.refs, "partial", SubjectSessionMove); unknown != nil {
		return refuse(unknown)
	}
	event := sessionEvent{
		Kind: request.Op, Principal: request.Principal,
		Path: frozenPath(request.Path), Retention: retentionTier(request.Op),
	}
	if request.Op == "fill" {
		event.Subtree = cloneJSON(request.Subtree)
	}
	if err := stored.append(ctx, event, updated); err != nil {
		if errors.Is(err, journal.ErrConflict) {
			_ = stored.refresh(ctx)
			return refuse(d.sessionStale(request.Session, SubjectSessionMove, request.ExpectedHead, contextValue, stored))
		}
		return nil
	}
	return d.sessionReply(request.Session, stored)
}

func (d *Daemon) serveSessionState(ctx context.Context, body []byte) any {
	var request sessionStateRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "session"); refusal != nil {
		return refuse(refusal)
	}
	stored, refusal, err := d.lookupSession(ctx, request.Session)
	if err != nil {
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	stored.mu.Lock()
	defer stored.mu.Unlock()
	if err := stored.refresh(ctx); err != nil {
		return nil
	}
	return d.sessionReply(request.Session, stored)
}

func (d *Daemon) serveSessionCommit(ctx context.Context, body []byte) any {
	var request sessionCommitRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireSessionFields(body, "session", "expectedHead", "principal"); refusal != nil {
		return refuse(refusal)
	}
	if request.Principal == "" {
		return refuse(malformedSessionField("principal", request.Principal, "the non-empty principal established by session.open author"))
	}
	stored, refusal, err := d.lookupSession(ctx, request.Session)
	if err != nil {
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	stored.mu.Lock()
	defer stored.mu.Unlock()
	if err := stored.refresh(ctx); err != nil {
		return nil
	}
	contextValue := map[string]any{"principal": request.Principal, "op": "commit", "submitter": request.Submitter}
	if request.Principal != stored.principal {
		return refuse(d.sessionPrincipalMismatch(request.Session, SubjectSessionCommit, request.Principal, contextValue, stored))
	}
	if request.ExpectedHead != stored.cursor.Head {
		return refuse(d.sessionStale(request.Session, SubjectSessionCommit, request.ExpectedHead, contextValue, stored))
	}
	result, walkRefusal := walkPartial(stored.state, []string{"partial"})
	if walkRefusal != nil {
		return refuse(walkRefusal)
	}
	if len(result.holes) != 0 {
		return refuse(&Refusal{
			Kind: KindInvalidStructure,
			Law:  "flb.session.v0 commits only a zero-hole state; frontier-empty is exactly catalogable",
			Path: result.holes[0], Got: cloneJSON(stored.state), Expected: "a partial with no holes",
			Next: d.sessionMoveHints(request.Session, stored.cursor.Head, stored.principal, stored.state),
		})
	}

	// Session commit enters through the same byte-owned certification seam as
	// type.create. The session state remains position-preserving, so certify a
	// cloned request and keep the meaning-fold carrier untouched.
	createBody, err := json.Marshal(createRequest{
		Structure: cloneJSON(stored.state), Submitter: request.Submitter,
	})
	if err != nil {
		return nil
	}
	certificate, createRefusal, err := d.certify(ctx, createBody)
	if err != nil {
		return nil
	}
	if createRefusal != nil {
		return refuse(createRefusal)
	}
	fact := certificate.Fact
	stateDigest, err := sessionStateDigest(stored.state)
	if err != nil {
		return nil
	}
	if fact.Scheme != flbTypeV1Scheme || fact.Digest != stateDigest {
		return refuse(&Refusal{
			Kind:     KindDigestMismatch,
			Law:      "L7: replay, normalize, canonicalize, and digest must equal the commit digest",
			Got:      map[string]any{"digest": fact.Digest, "scheme": fact.Scheme},
			Expected: map[string]any{"digest": stateDigest, "scheme": flbTypeV1Scheme},
			Next:     []NextHint{describeHint()},
		})
	}
	event := sessionEvent{
		Kind: "commit", Principal: request.Principal,
		Digest: fact.Digest, Scheme: fact.Scheme,
		CatalogSeq: fact.seq, CatalogHead: d.catalog.journal.Head().Head,
		Retention: retentionTier("commit"),
	}
	if err := stored.append(ctx, event, stored.state); err != nil {
		return nil
	}
	return sessionCommitReply{
		OK: true, Session: request.Session, Head: stored.cursor.Head, Step: stored.cursor.Seq,
		Principal:   stored.principal,
		StateDigest: stateDigest, Digest: fact.Digest, Scheme: fact.Scheme,
		CatalogSeq: fact.seq, CatalogHead: event.CatalogHead,
		Next: []NextHint{{
			Subject: SubjectSessionState, Note: "resume this exact committed session from its verified journal head",
			Body: map[string]any{"session": request.Session},
		}},
	}
}

func (d *Daemon) cacheSession(name string, opened *journal.Journal) *sessionJournal {
	d.sessionMu.Lock()
	defer d.sessionMu.Unlock()
	if cached := d.sessions[name]; cached != nil {
		return cached
	}
	cached := &sessionJournal{
		journal: opened,
		cursor:  journal.Cursor{Seq: -1, Head: genesis},
	}
	d.sessions[name] = cached
	return cached
}

func (d *Daemon) lookupSession(ctx context.Context, name string) (*sessionJournal, *Refusal, error) {
	if !strings.HasPrefix(name, sessionJournalPrefix) || !hexDigest.MatchString(strings.TrimPrefix(name, sessionJournalPrefix)) {
		return nil, &Refusal{
			Kind: KindBadJournal, Law: "flb.session.v0 addresses a content-addressed session journal",
			Path: []string{"session"}, Got: name,
			Expected: sessionJournalPrefix + "<64 lowercase hex characters>",
			Next:     []NextHint{describeHint()},
		}, nil
	}
	opened, refusal, err := d.lookupJournal(ctx, name)
	if err != nil || refusal != nil {
		if refusal != nil {
			refusal.Next = []NextHint{{
				Subject: SubjectSessionOpen,
				Note:    "open a new content-addressed session; an absent session is never created by a read or move",
				Body: map[string]any{
					"grammar": sessionGrammarDigest(), "author": "agent",
				},
			}}
		}
		return nil, refusal, err
	}
	return d.cacheSession(name, opened), nil, nil
}

func (s *sessionJournal) refresh(ctx context.Context) error {
	head := s.journal.Head()
	if s.cursor == head && s.state != nil {
		return nil
	}
	entries, cursor, err := s.journal.Read(ctx, s.cursor, 0)
	if err != nil {
		return err
	}
	state := s.state
	principal := s.principal
	for _, entry := range entries {
		state, principal, err = applySessionEvent(state, principal, []byte(entry.Payload))
		if err != nil {
			return fmt.Errorf("session event %d: %w", entry.Seq, err)
		}
	}
	s.state = state
	s.principal = principal
	s.cursor = cursor
	return nil
}

func (s *sessionJournal) append(ctx context.Context, event sessionEvent, nextState any) error {
	payload, err := canonicalBytes(event)
	if err != nil {
		return err
	}
	entry := canonical.ChainEntry{
		Seq: int64(s.cursor.Seq + 1), Prev: s.cursor.Head, Payload: string(payload),
	}
	if _, err := s.journal.AppendEntry(ctx, entry); err != nil {
		return err
	}
	s.cursor = journal.Cursor{Seq: int(entry.Seq), Head: s.journal.Head().Head}
	s.state = cloneJSON(nextState)
	return nil
}

func applySessionEvent(state any, principal string, payload []byte) (any, string, error) {
	var event sessionEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, "", err
	}
	switch event.Kind {
	case "open":
		if state != nil {
			return nil, "", errors.New("a session contains more than one open event")
		}
		if event.Version != sessionVersion || event.Grammar != sessionGrammarDigest() {
			return nil, "", errors.New("session open names an unsupported version or grammar")
		}
		if event.Author == "" {
			return nil, "", errors.New("session open has no author-of-record principal")
		}
		if _, refusal := walkPartial(event.Seed, []string{"seed"}); refusal != nil {
			return nil, "", errors.New("session open seed is not a partial")
		}
		return cloneJSON(event.Seed), event.Author, nil
	case "fill":
		if state == nil {
			return nil, "", errors.New("fill precedes open")
		}
		if event.Principal == "" || event.Principal != principal {
			return nil, "", errors.New("stored fill principal differs from session open author")
		}
		updated, refusal := replaceTypeNode(state, event.Path, event.Subtree, true)
		if refusal != nil {
			return nil, "", errors.New("stored fill is not applicable")
		}
		if _, refusal := walkPartial(updated, []string{}); refusal != nil {
			return nil, "", errors.New("stored fill produces an invalid partial")
		}
		return updated, principal, nil
	case "unfill":
		if state == nil {
			return nil, "", errors.New("unfill precedes open")
		}
		if event.Principal == "" || event.Principal != principal {
			return nil, "", errors.New("stored unfill principal differs from session open author")
		}
		updated, refusal := replaceTypeNode(state, event.Path, map[string]any{"k": "hole"}, false)
		if refusal != nil {
			return nil, "", errors.New("stored unfill is not applicable")
		}
		if _, refusal := walkPartial(updated, []string{}); refusal != nil {
			return nil, "", errors.New("stored unfill produces an invalid partial")
		}
		return updated, principal, nil
	case "commit":
		if state == nil || event.Principal == "" || event.Principal != principal {
			return nil, "", errors.New("stored commit principal differs from session open author")
		}
		return state, principal, nil
	case "refusal", "read", "utterance", "proposal", "adoption":
		// The journal admits transcript traffic beyond the meaning fold. These
		// entries remain in the identity chain and are forgiven by the carrier.
		return state, principal, nil
	default:
		return state, principal, nil
	}
}

func (d *Daemon) sessionReply(name string, stored *sessionJournal) any {
	digest, err := sessionStateDigest(stored.state)
	if err != nil {
		return nil
	}
	result, refusal := walkPartial(stored.state, []string{})
	if refusal != nil {
		return nil
	}
	catalogHead, refs := d.catalog.frontierSnapshot(frontierRefLimit)
	frontier := buildFrontierFromSnapshot(result.holes, refs)
	return sessionStateReply{
		OK: true, Session: name, Head: stored.cursor.Head, Step: stored.cursor.Seq,
		Principal: stored.principal,
		Partial:   cloneJSON(stored.state), StateDigest: digest, StateScheme: sessionStateScheme,
		CatalogHead: catalogHead, Frontier: frontier,
		Anchor: sessionAnchor{Key: name, Head: stored.cursor.Head, StateDigest: digest},
		Next:   sessionNextHints(name, stored.cursor.Head, stored.principal, frontier),
	}
}

func (d *Daemon) sessionMoveHints(name, head, principal string, partial any) []NextHint {
	result, refusal := walkPartial(partial, []string{})
	if refusal != nil {
		return []NextHint{describeHint()}
	}
	_, refs := d.catalog.frontierSnapshot(frontierRefLimit)
	frontier := buildFrontierFromSnapshot(result.holes, refs)
	return sessionNextHints(name, head, principal, frontier)
}

func sessionNextHints(name, head, principal string, frontier []frontierEntry) []NextHint {
	if len(frontier) == 0 {
		return []NextHint{{
			Subject: SubjectSessionCommit, Note: "frontier is empty; commit the replay-audited type",
			Body: map[string]any{"session": name, "expectedHead": head, "principal": principal},
		}}
	}
	choice := frontier[0].Legal[0]
	return []NextHint{{
		Subject: SubjectSessionMove, Note: "fill the first remaining hole at the current head",
		Body: map[string]any{
			"session": name, "expectedHead": head, "principal": principal, "op": "fill",
			"path": frontier[0].Path, "subtree": choice.Example,
		},
	}}
}

func (d *Daemon) sessionPrincipalMismatch(
	name, subject, got string,
	moveContext map[string]any,
	stored *sessionJournal,
) *Refusal {
	retry := map[string]any{
		"session": name, "expectedHead": stored.cursor.Head, "principal": stored.principal,
	}
	for key, value := range moveContext {
		if key != "principal" && (key != "submitter" || value != "") {
			retry[key] = value
		}
	}
	return &Refusal{
		Kind: KindSessionPrincipal,
		Law:  "flb.session.v0 mutators carry exactly the asserted principal established by session.open author",
		Path: []string{"principal"}, Got: got, Expected: stored.principal,
		Next: []NextHint{
			{Subject: SubjectSessionState, Note: "read the journal-authoritative principal and current state", Body: map[string]any{"session": name}},
			{Subject: subject, Note: "retry only as the session's author-of-record principal", Body: retry},
		},
	}
}

func (d *Daemon) sessionStale(
	name, subject, expectedHead string,
	moveContext map[string]any,
	stored *sessionJournal,
) *Refusal {
	digest, _ := sessionStateDigest(stored.state)
	retry := map[string]any{
		"session": name, "expectedHead": stored.cursor.Head,
	}
	for key, value := range moveContext {
		if key != "submitter" || value != "" {
			retry[key] = value
		}
	}
	return &Refusal{
		Kind: KindSessionStale,
		Law:  "G3: every session move carries the current expectedHead; stale evidence is refused without an effector",
		Path: []string{"expectedHead"},
		Got:  map[string]any{"expectedHead": expectedHead, "context": moveContext},
		Expected: map[string]any{
			"currentHead": stored.cursor.Head, "step": stored.cursor.Seq,
			"stateDigest": digest, "partial": cloneJSON(stored.state),
		},
		Next: []NextHint{
			{Subject: SubjectSessionState, Note: "read the current verified state before deciding whether the refused move still applies", Body: map[string]any{"session": name}},
			{Subject: subject, Note: "retry this exact move against the current head when its path remains legal", Body: retry},
		},
	}
}

func sessionStateDigest(state any) (string, error) {
	normalized, err := normalizeSessionPartial(state)
	if err != nil {
		return "", err
	}
	bytes, err := canonicalBytes(normalized)
	if err != nil {
		return "", err
	}
	return bytesSHA256V1{}.Derive(bytes), nil
}

func normalizeSessionPartial(value any) (any, error) {
	node, ok := value.(map[string]any)
	if !ok {
		return cloneJSON(value), nil
	}
	clone := cloneMap(node)
	switch node["k"] {
	case "list", "brand":
		of, err := normalizeSessionPartial(node["of"])
		clone["of"] = of
		return clone, err
	case "check":
		base, err := normalizeSessionPartial(node["base"])
		clone["base"] = base
		return clone, err
	case "struct":
		fields, ok := node["fields"].(map[string]any)
		if !ok {
			return clone, nil
		}
		normalized := make(map[string]any, len(fields))
		for name, field := range fields {
			child, err := normalizeSessionPartial(field)
			if err != nil {
				return nil, err
			}
			normalized[name] = child
		}
		clone["fields"] = normalized
		return clone, nil
	case "union":
		members, ok := node["of"].([]any)
		if !ok {
			return clone, nil
		}
		normalized := make([]any, len(members))
		for index, member := range members {
			child, err := normalizeSessionPartial(member)
			if err != nil {
				return nil, err
			}
			normalized[index] = child
		}
		sort.Slice(normalized, func(i, j int) bool {
			left, leftErr := canonicalBytes(normalized[i])
			right, rightErr := canonicalBytes(normalized[j])
			if leftErr != nil || rightErr != nil {
				return false
			}
			return bytes.Compare(left, right) < 0
		})
		clone["of"] = normalized
		return clone, nil
	default:
		return clone, nil
	}
}

func retentionTier(kind string) string {
	switch kind {
	case "fill", "unfill", "refusal", "read":
		return retentionCompactible
	case "adoption", "commit":
		return retentionNeverDiscard
	default:
		return retentionIrreducible
	}
}

func sessionRetentionPlan(events []sessionEvent) []retentionMark {
	marks := make([]retentionMark, len(events))
	for index, event := range events {
		marks[index] = retentionMark{Step: index, Kind: event.Kind, Tier: retentionTier(event.Kind)}
	}
	return marks
}

// sessionCompaction refuses until task 32 supplies the certification-record
// corpus seam. Structural refusal traces must export first and the resulting
// corpus digest must seal the compacted prefix; absence traces may die with it.
// Proceeding without that evidence would violate G4's ratified amendment.
func sessionCompaction(name string, events []sessionEvent) ([]retentionMark, *Refusal) {
	return sessionRetentionPlan(events), &Refusal{
		Kind:     KindCompactionBlocked,
		Law:      "G4: session compaction refuses until structural refusals can be sealed into the refusal corpus",
		Got:      map[string]any{"session": name, "marked": len(events)},
		Expected: "the flb.certification.v0 corpus seam and its emitted corpus digest",
		Next:     []NextHint{{Subject: SubjectSessionState, Note: "retain the full session and continue without compaction", Body: map[string]any{"session": name}}},
	}
}

func requireSessionFields(body []byte, fields ...string) *Refusal {
	var decoded map[string]json.RawMessage
	if err := json.Unmarshal(body, &decoded); err != nil {
		return nil
	}
	for _, field := range fields {
		raw, present := decoded[field]
		if !present || string(raw) == "null" {
			return malformedSessionField(field, nil, "a required session request field")
		}
	}
	return nil
}

func malformedSessionField(field string, got, expected any) *Refusal {
	return &Refusal{
		Kind: KindMalformed,
		Law:  "flb.session.v0 requests carry every concurrency and move field in its declared shape",
		Path: []string{field}, Got: got, Expected: expected,
		Next: []NextHint{describeHint()},
	}
}
