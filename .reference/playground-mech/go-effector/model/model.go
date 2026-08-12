// Package model is a deterministic explicit-state model of the effector's
// abstract commitment protocol (SPEC §6.1), together with a bounded checker
// (check.go) over its transition system.
//
// Why it exists. The two-key protocol that SPEC §6 originally ratified was
// refuted during the formal audit by a hand-rolled breadth-first enumeration
// that split commit into a read half and a write half and searched for a
// successful commit under a superseded fence
// (docs/research/kernel-formal-specification-primary-sources.md, CEX-3 and
// "Bounded transition-system check"). That was a one-off. This package makes
// it standing infrastructure: the same search, run by the Go gate, over both
// the ratified single-key protocol and the withdrawn two-key one, so that a
// checker which cannot rediscover the known bug is itself caught.
//
// Determinism is a requirement, not a nicety. The model never reads the wall
// clock (lease expiry is an explicit scheduled event, not a timestamp), never
// lets Go map iteration order reach an output, and enumerates actions in a
// fixed order. A counterexample is therefore byte-for-byte reproducible.
//
// Modelling decisions, stated so they can be argued with:
//
//   - ONE work digest. The protocol is per-key; distinct digests share no
//     state, so a single key is the whole protocol.
//   - Time is a boolean. A claim is Live until an explicit expire event
//     lapses it. Expiry is a client-side comparison against a stored
//     timestamp, so it mutates no register and bumps no revision.
//   - Commit is SPLIT into begin (the read that observes fence and revision)
//     and finish (the conditional write), so a client-side pause between them
//     is schedulable. This split is what found CEX-3.
//   - Claim is atomic. Its read and CAS are one step; a lost steal race is
//     ErrHeld either way, which the atomic model also produces.
//   - Owners are sequential crash-stop processes: an owner blocked in commit
//     performs no other action. SelfInterleave relaxes this to reproduce the
//     audit's same-owner counterexample shape.
//   - Revisions are not counted. The CAS only ever asks "is my snapshot still
//     current?", and a snapshot once stale stays stale, so the unbounded
//     revision counter collapses to one Fresh bit per pending commit. This is
//     exact, not an abstraction.
package model

import (
	"fmt"
	"strings"
)

// MaxOwners bounds the process count a model may carry. It fixes the width of
// the canonical state encoding; raising it costs encoding width, nothing else.
const MaxOwners = 4

// Protocol selects the wire layout under check.
type Protocol uint8

const (
	// SingleKey is the ratified protocol (SPEC §6.1, P4 wire mapping as
	// amended by A6): ONE authority register per digest, holding either a
	// claim or a terminal outcome, with commit a revision-CAS on that same
	// register. Fence validation and protected mutation share one
	// linearization point.
	SingleKey Protocol = iota
	// TwoKey is the WITHDRAWN protocol: a claim register and a separate
	// outcome register. Commit validates the fence by reading the claim
	// register and then creates the outcome register. Nothing binds the two.
	TwoKey
)

func (p Protocol) String() string {
	if p == TwoKey {
		return "two-key"
	}
	return "single-key"
}

// Tag names what a register currently holds.
type Tag uint8

const (
	TagAbsent Tag = iota
	TagClaim
	TagDone
)

func (t Tag) String() string {
	switch t {
	case TagClaim:
		return "Claim"
	case TagDone:
		return "Done"
	default:
		return "Absent"
	}
}

// A register is one abstract 𝕂 register (SPEC §3.3).
type register struct {
	Tag    Tag
	Fence  uint8 // meaningful for TagClaim and TagDone
	Owner  uint8 // meaningful for TagClaim: 1-based owner id
	Live   bool  // meaningful for TagClaim: the lease has not lapsed
	Result uint8 // meaningful for TagDone: 1-based id of the committing owner
}

func (r register) String() string {
	switch r.Tag {
	case TagClaim:
		lease := "expired"
		if r.Live {
			lease = "live"
		}
		return fmt.Sprintf("Claim(f=%d,o=%d,%s)", r.Fence, r.Owner, lease)
	case TagDone:
		return fmt.Sprintf("Done(f=%d,r=%d)", r.Fence, r.Result)
	default:
		return "Absent"
	}
}

// A pending is a commit that has begun (read the register) but not finished
// (written). It is the client-side pause the audit's enumerator introduced.
type pending struct {
	Active     bool
	UsedFence  uint8 // fence of the claim handle this commit commits under
	SnapTag    Tag   // what the begin-side read observed
	SnapFence  uint8
	SnapResult uint8
	Fresh      bool // the observed revision is still current (single-key CAS)
}

// A process is one crash-stop owner.
type process struct {
	Crashed  bool
	HasClaim bool
	Fence    uint8 // fence of the claim handle it holds
	Pend     pending
}

// State is the whole modelled world for one digest. It contains no pointers,
// slices or maps: it is a value, and its encoding is canonical.
type State struct {
	Key1     register // authority register (single-key) / claim register (two-key)
	Key2     register // outcome register (two-key only)
	MaxFence uint8    // the greatest claim generation ever linearized
	Procs    [MaxOwners]process
}

// Model is a configured transition system.
type Model struct {
	Owners   int
	Protocol Protocol
	// AdversarialSteal enables a steal against a LIVE claim. This is strictly
	// stronger than the real protocol, which waits for the lease to lapse; the
	// audit used it deliberately, since fencing safety must not depend on the
	// clock (SPEC §6.3).
	AdversarialSteal bool
	// SelfInterleave lets an owner act while its own commit is paused, which
	// models one identity running concurrent workers. Off means owners are
	// strictly sequential processes.
	SelfInterleave bool
	// AllowCrash enables crash-stop at every point.
	AllowCrash bool
	// MaxFence caps generations so the transition system stays finite
	// independently of the depth bound. 0 means "the depth bound decides".
	MaxFence uint8
}

func (m Model) String() string {
	var b strings.Builder
	fmt.Fprintf(&b, "%s owners=%d", m.Protocol, m.Owners)
	for _, f := range []struct {
		on   bool
		name string
	}{
		{m.AdversarialSteal, "adversarial-steal"},
		{m.SelfInterleave, "self-interleave"},
		{m.AllowCrash, "crash-stop"},
	} {
		if f.on {
			b.WriteString(" +" + f.name)
		}
	}
	return b.String()
}

// Kind names an action of the transition system.
type Kind uint8

const (
	ActClaim  Kind = iota // claim(d, o, lease): create, or steal a lapsed claim
	ActExpire             // the environment: this claim's lease lapses
	ActBegin              // commit, first half: read the fence and revision
	ActFinish             // commit, second half: the conditional write
	ActCrash              // crash-stop
)

func (k Kind) String() string {
	switch k {
	case ActClaim:
		return "claim"
	case ActExpire:
		return "expire"
	case ActBegin:
		return "begin"
	case ActFinish:
		return "finish"
	default:
		return "crash"
	}
}

// An Action is a transition label: a kind plus the owner performing it.
// ActExpire is an environment action and ignores Owner.
type Action struct {
	Kind  Kind
	Owner int
}

func (a Action) String() string {
	if a.Kind == ActExpire {
		return "expire"
	}
	return fmt.Sprintf("%s(%s)", a.Kind, ownerName(a.Owner))
}

func ownerName(o int) string {
	return string(rune('A' + o))
}

// OutcomeKind is what the implementation would return to the caller. These map
// 1:1 onto the Go effector's return values and sentinel errors.
type OutcomeKind uint8

const (
	OutNone         OutcomeKind = iota // no client-visible result (expire, begin, crash)
	OutClaimed                         // Claim returned a claim at Fence
	OutHeld                            // ErrHeld
	OutCommittedErr                    // ErrCommitted
	OutFenced                          // ErrFenced
	OutFirst                           // Commit returned first=true
	OutIdempotent                      // Commit returned first=false, nil
)

func (o OutcomeKind) String() string {
	switch o {
	case OutClaimed:
		return "claimed"
	case OutHeld:
		return "ErrHeld"
	case OutCommittedErr:
		return "ErrCommitted"
	case OutFenced:
		return "ErrFenced"
	case OutFirst:
		return "first"
	case OutIdempotent:
		return "idempotent"
	default:
		return "-"
	}
}

// Outcome is a client-visible result of one action.
type Outcome struct {
	Kind  OutcomeKind
	Fence uint8 // the claimed fence (OutClaimed) or committing fence (OutFirst/OutIdempotent)
}

func (o Outcome) String() string {
	if o.Kind == OutClaimed || o.Kind == OutFirst || o.Kind == OutIdempotent {
		return fmt.Sprintf("%s@f%d", o.Kind, o.Fence)
	}
	return o.Kind.String()
}

// LookupState is the observable state SPEC §6.1's lookup reports.
type LookupState uint8

const (
	Unclaimed LookupState = iota
	Held
	Committed
)

func (l LookupState) String() string {
	switch l {
	case Held:
		return "held"
	case Committed:
		return "committed"
	default:
		return "unclaimed"
	}
}

// Initial is the state before anything has happened: the authority register is
// absent and every process is idle.
func (m Model) Initial() State {
	return State{}
}

func resultOf(owner int) uint8 { return uint8(owner) + 1 }

// terminal returns the register that carries the terminal outcome, if any.
func (m Model) terminal(s State) register {
	if m.Protocol == TwoKey {
		return s.Key2
	}
	if s.Key1.Tag == TagDone {
		return s.Key1
	}
	return register{}
}

// Lookup is SPEC §6.1's lookup: absent or expired claim => Unclaimed, live
// claim => Held, outcome => Committed. It is a pure observation; it is not a
// transition, so the conformance driver checks it at EVERY state rather than
// only where a schedule happens to place it.
func (m Model) Lookup(s State) (LookupState, uint8, uint8) {
	if t := m.terminal(s); t.Tag == TagDone {
		return Committed, t.Fence, t.Result
	}
	if s.Key1.Tag == TagClaim && s.Key1.Live {
		return Held, 0, 0
	}
	return Unclaimed, 0, 0
}

// maxFenceCap is the effective generation cap.
func (m Model) maxFenceCap(depth int) uint8 {
	if m.MaxFence > 0 {
		return m.MaxFence
	}
	if depth > 0 && depth < 255 {
		return uint8(depth)
	}
	return 255
}

// Enabled reports whether an action can fire in s. fenceCap bounds generations.
func (m Model) Enabled(s State, a Action, fenceCap uint8) bool {
	if a.Kind == ActExpire {
		return s.Key1.Tag == TagClaim && s.Key1.Live
	}
	if a.Owner < 0 || a.Owner >= m.Owners {
		return false
	}
	p := s.Procs[a.Owner]
	if p.Crashed {
		return false
	}
	// A process blocked inside commit performs no other action, unless the
	// model deliberately allows one identity to run concurrent workers.
	blocked := p.Pend.Active && !m.SelfInterleave
	switch a.Kind {
	case ActClaim:
		if blocked {
			return false
		}
		// A steal past the generation cap is not modelled: the bound is the
		// bound, and silently wrapping a fence would be a lie. A claim that
		// would NOT steal (live claim, terminal outcome, absent register) is
		// still enabled — its refusal is an observable this checks.
		if s.Key1.Tag == TagClaim && m.terminal(s).Tag != TagDone {
			steals := !s.Key1.Live || m.AdversarialSteal
			if steals && s.Key1.Fence >= fenceCap {
				return false
			}
		}
		return true
	case ActBegin:
		return p.HasClaim && !p.Pend.Active
	case ActFinish:
		return p.Pend.Active
	case ActCrash:
		return m.AllowCrash
	}
	return false
}

// Actions returns every enabled action in a FIXED order: by kind, then by
// owner index. Nothing here iterates a map.
func (m Model) Actions(s State, fenceCap uint8) []Action {
	out := make([]Action, 0, 1+4*m.Owners)
	for _, k := range []Kind{ActClaim, ActExpire, ActBegin, ActFinish, ActCrash} {
		if k == ActExpire {
			a := Action{Kind: ActExpire}
			if m.Enabled(s, a, fenceCap) {
				out = append(out, a)
			}
			continue
		}
		for o := 0; o < m.Owners; o++ {
			a := Action{Kind: k, Owner: o}
			if m.Enabled(s, a, fenceCap) {
				out = append(out, a)
			}
		}
	}
	return out
}

// classify reproduces the implementation's classifyCommitted: a stored outcome
// under a different fence means the claim was superseded; the same fence with
// the same result is idempotent success; the same fence with a different
// result is a conflicting commitment.
func classify(usedFence, result, doneFence, doneResult uint8) Outcome {
	if doneFence != usedFence {
		return Outcome{Kind: OutFenced}
	}
	if doneResult == result {
		return Outcome{Kind: OutIdempotent, Fence: usedFence}
	}
	return Outcome{Kind: OutCommittedErr}
}

// markKey1Written records that the authority register's revision moved: every
// outstanding begin-side snapshot of it is now stale, forever.
func markKey1Written(s *State) {
	for i := range s.Procs {
		if s.Procs[i].Pend.Active {
			s.Procs[i].Pend.Fresh = false
		}
	}
}

// Step fires an enabled action. It returns the successor state and the
// client-visible outcome. Firing a disabled action is a programming error, so
// callers filter with Actions or Enabled first.
func (m Model) Step(s State, a Action, cap uint8) (State, Outcome) {
	next := s
	out := Outcome{}

	switch a.Kind {
	case ActExpire:
		next.Key1.Live = false

	case ActCrash:
		next.Procs[a.Owner] = process{Crashed: true}

	case ActClaim:
		o := a.Owner
		if t := m.terminal(s); t.Tag == TagDone {
			out = Outcome{Kind: OutCommittedErr}
			break
		}
		switch {
		case s.Key1.Tag == TagAbsent:
			next.Key1 = register{Tag: TagClaim, Fence: 1, Owner: resultOf(o), Live: true}
			markKey1Written(&next)
			next.MaxFence = maxU8(next.MaxFence, 1)
			next.Procs[o].HasClaim = true
			next.Procs[o].Fence = 1
			out = Outcome{Kind: OutClaimed, Fence: 1}
		case s.Key1.Live && !m.AdversarialSteal:
			out = Outcome{Kind: OutHeld}
		default:
			// A lapsed claim is stolen with fence+1. There is no owner
			// exception: fencing is about generations, not identity.
			f := s.Key1.Fence + 1
			next.Key1 = register{Tag: TagClaim, Fence: f, Owner: resultOf(o), Live: true}
			markKey1Written(&next)
			next.MaxFence = maxU8(next.MaxFence, f)
			next.Procs[o].HasClaim = true
			next.Procs[o].Fence = f
			out = Outcome{Kind: OutClaimed, Fence: f}
		}

	case ActBegin:
		o := a.Owner
		next.Procs[o].Pend = pending{
			Active:     true,
			UsedFence:  s.Procs[o].Fence,
			SnapTag:    s.Key1.Tag,
			SnapFence:  s.Key1.Fence,
			SnapResult: s.Key1.Result,
			Fresh:      true,
		}

	case ActFinish:
		o := a.Owner
		pd := s.Procs[o].Pend
		mine := resultOf(o)
		if m.Protocol == TwoKey {
			out = m.finishTwoKey(&next, pd, mine)
		} else {
			out = m.finishSingleKey(&next, pd, mine)
		}
		next.Procs[o].Pend = pending{}
	}

	m.normalize(&next)
	return next, out
}

// finishSingleKey is the ratified commit: the fence observed at begin must be
// the caller's, and the write is a CAS at the revision observed at begin, so
// validation and mutation are ONE linearization point.
func (m Model) finishSingleKey(next *State, pd pending, mine uint8) Outcome {
	switch pd.SnapTag {
	case TagAbsent:
		// Get returned "no such key": there is no claim to commit under.
		return Outcome{Kind: OutFenced}
	case TagDone:
		return classify(pd.UsedFence, mine, pd.SnapFence, pd.SnapResult)
	}
	if pd.SnapFence != pd.UsedFence {
		return Outcome{Kind: OutFenced}
	}
	if pd.Fresh {
		next.Key1 = register{Tag: TagDone, Fence: pd.UsedFence, Result: mine}
		markKey1Written(next)
		return Outcome{Kind: OutFirst, Fence: pd.UsedFence}
	}
	// Revision mismatch: re-read and map, exactly as the implementation does.
	switch next.Key1.Tag {
	case TagDone:
		return classify(pd.UsedFence, mine, next.Key1.Fence, next.Key1.Result)
	default:
		return Outcome{Kind: OutFenced}
	}
}

// finishTwoKey is the WITHDRAWN commit: the fence is validated by reading the
// claim register, and the outcome is then CREATED on a different register.
// Nothing binds the create to the validation — that gap is CEX-3.
func (m Model) finishTwoKey(next *State, pd pending, mine uint8) Outcome {
	if pd.SnapTag != TagClaim || pd.SnapFence != pd.UsedFence {
		return Outcome{Kind: OutFenced}
	}
	if next.Key2.Tag == TagAbsent {
		next.Key2 = register{Tag: TagDone, Fence: pd.UsedFence, Result: mine}
		return Outcome{Kind: OutFirst, Fence: pd.UsedFence}
	}
	return classify(pd.UsedFence, mine, next.Key2.Fence, next.Key2.Result)
}

// StepAtomicFinish fires a finish as if begin had happened just now — the
// snapshot is retaken from the current state. It models what an UNSPLIT commit
// (one atomic client call) would return in this state, under the same claim
// handle the pending commit is using.
//
// Comparing it against the split finish answers a question the conformance
// lane needs: is the client-side pause between the fence read and the
// protected write observable at the client boundary at all?
func (m Model) StepAtomicFinish(s State, owner int) (State, Outcome) {
	pd := s.Procs[owner].Pend
	if !pd.Active {
		panic("model: StepAtomicFinish on an owner with no pending commit")
	}
	retaken := s
	retaken.Procs[owner].Pend = pending{
		Active:     true,
		UsedFence:  pd.UsedFence,
		SnapTag:    s.Key1.Tag,
		SnapFence:  s.Key1.Fence,
		SnapResult: s.Key1.Result,
		Fresh:      true,
	}
	m.normalize(&retaken)
	return m.Step(retaken, Action{Kind: ActFinish, Owner: owner}, m.maxFenceCap(0))
}

// normalize zeroes every field the protocol cannot read, so that two states
// which behave identically encode identically. Without it the state counts
// would be inflated by ghost distinctions.
func (m Model) normalize(s *State) {
	switch s.Key1.Tag {
	case TagAbsent:
		s.Key1 = register{}
	case TagClaim:
		s.Key1.Result = 0
	case TagDone:
		s.Key1.Owner = 0
		s.Key1.Live = false
	}
	if s.Key2.Tag != TagDone || m.Protocol != TwoKey {
		s.Key2 = register{}
	} else {
		s.Key2.Owner = 0
		s.Key2.Live = false
	}
	for i := range s.Procs {
		p := &s.Procs[i]
		if p.Crashed {
			*p = process{Crashed: true}
			continue
		}
		if !p.HasClaim {
			p.Fence = 0
		}
		if !p.Pend.Active {
			p.Pend = pending{}
			continue
		}
		if m.Protocol == TwoKey {
			p.Pend.Fresh = false // the two-key finish never consults a revision
		}
		switch p.Pend.SnapTag {
		case TagAbsent:
			p.Pend.SnapFence = 0
			p.Pend.SnapResult = 0
		case TagClaim:
			p.Pend.SnapResult = 0
		}
	}
}

func maxU8(a, b uint8) uint8 {
	if a > b {
		return a
	}
	return b
}

// EncodedLen is the width of the canonical state encoding: two 5-byte
// registers, the max generation, and nine bytes per process.
const EncodedLen = 5 + 5 + 1 + MaxOwners*9

// Encode renders the state as a fixed-width canonical byte string. Equal
// states encode equal (normalize guarantees it) and unequal states encode
// unequal, so the encoding is used directly as the visited-set key: there is
// no hash collision to reason about.
func (s State) Encode() [EncodedLen]byte {
	var b [EncodedLen]byte
	i := 0
	put := func(v uint8) {
		b[i] = v
		i++
	}
	putBool := func(v bool) {
		if v {
			put(1)
		} else {
			put(0)
		}
	}
	putReg := func(r register) {
		put(uint8(r.Tag))
		put(r.Fence)
		put(r.Owner)
		put(r.Result)
		putBool(r.Live)
	}
	putReg(s.Key1)
	putReg(s.Key2)
	put(s.MaxFence)
	for _, p := range s.Procs {
		putBool(p.Crashed)
		putBool(p.HasClaim)
		put(p.Fence)
		putBool(p.Pend.Active)
		put(p.Pend.UsedFence)
		put(uint8(p.Pend.SnapTag))
		put(p.Pend.SnapFence)
		put(p.Pend.SnapResult)
		putBool(p.Pend.Fresh)
	}
	return b
}

// Key is the canonical encoding as a map key.
func (s State) Key() string {
	e := s.Encode()
	return string(e[:])
}

// Hash64 is FNV-1a over the canonical encoding. It is used for reporting a
// state-set fingerprint, never for identity.
func (s State) Hash64() uint64 {
	const (
		offset64 = 14695981039346656037
		prime64  = 1099511628211
	)
	h := uint64(offset64)
	e := s.Encode()
	for _, c := range e {
		h ^= uint64(c)
		h *= prime64
	}
	return h
}

// Describe renders a state for a counterexample listing.
func (m Model) Describe(s State) string {
	var b strings.Builder
	if m.Protocol == TwoKey {
		fmt.Fprintf(&b, "claim=%s done=%s maxFence=%d", s.Key1, s.Key2, s.MaxFence)
	} else {
		fmt.Fprintf(&b, "work=%s maxFence=%d", s.Key1, s.MaxFence)
	}
	for o := 0; o < m.Owners; o++ {
		p := s.Procs[o]
		if p.Crashed {
			fmt.Fprintf(&b, " %s:crashed", ownerName(o))
			continue
		}
		if !p.HasClaim && !p.Pend.Active {
			continue
		}
		fmt.Fprintf(&b, " %s:", ownerName(o))
		if p.HasClaim {
			fmt.Fprintf(&b, "holds(f=%d)", p.Fence)
		}
		if p.Pend.Active {
			fmt.Fprintf(&b, "begun(used=%d,saw=%s@%d",
				p.Pend.UsedFence, p.Pend.SnapTag, p.Pend.SnapFence)
			if m.Protocol == SingleKey {
				// The two-key finish binds its write to no revision at all,
				// so reporting freshness there would imply a check that the
				// protocol does not perform.
				if p.Pend.Fresh {
					b.WriteString(",fresh")
				} else {
					b.WriteString(",stale")
				}
			}
			b.WriteString(")")
		}
	}
	return b.String()
}
