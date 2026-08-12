package model

import (
	"fmt"
	"strings"
	"testing"
)

// The gate configuration: three crash-stop owners, steals allowed against a
// LIVE claim (strictly stronger than the protocol, which waits for the lease
// to lapse — fencing safety must not depend on the clock), crash-stop enabled
// everywhere.
func gateModel(p Protocol) Model {
	return Model{
		Owners:           3,
		Protocol:         p,
		AdversarialSteal: true,
		AllowCrash:       true,
	}
}

const gateDepth = 12

// ---------- OUTCOME 1: the checker, over the ratified protocol ----------

func TestSingleKeyProtocolIsFencingSafe(t *testing.T) {
	m := gateModel(SingleKey)
	report := Check(m, gateDepth)
	t.Log(report.Summary())
	if report.Violation != nil {
		t.Fatalf("%s violated:\n%s\n%s",
			report.Violation.Invariant, report.Violation.Detail, m.FormatTrace(report.Violation.Trace))
	}
	if report.States < 100 {
		t.Fatalf("only %d states explored; the search collapsed and proves nothing", report.States)
	}
}

// The depth bound is not the only bound available. Capping the number of claim
// GENERATIONS makes the transition system finite outright, so the search runs
// to closure: every state reachable under at most N generations, at any trace
// length whatsoever.
func TestSingleKeyProtocolIsFencingSafeToClosure(t *testing.T) {
	for _, generations := range []uint8{2, 3, 4} {
		m := gateModel(SingleKey)
		m.MaxFence = generations
		report := Check(m, 0)
		t.Log(report.Summary())
		if report.Violation != nil {
			t.Fatalf("%s violated at %d generations:\n%s\n%s", report.Violation.Invariant,
				generations, report.Violation.Detail, m.FormatTrace(report.Violation.Trace))
		}
	}
}

// Two owners, matching the shape the audit ran, so the numbers are comparable
// with the recorded 3,919 states / 9,254 transitions.
func TestSingleKeyProtocolTwoOwnerBaseline(t *testing.T) {
	m := gateModel(SingleKey)
	m.Owners = 2
	report := Check(m, gateDepth)
	t.Log(report.Summary())
	if report.Violation != nil {
		t.Fatalf("%s violated:\n%s\n%s", report.Violation.Invariant,
			report.Violation.Detail, m.FormatTrace(report.Violation.Trace))
	}
}

// Fencing safety mentions neither `now` nor `expiry` (SPEC §6.3). Running the
// same check with steals gated on a lapsed lease must also come out clean; if
// only the clock-free variant were checked, a clock-dependent repair could
// hide here.
func TestSingleKeyProtocolIsSafeWithLeaseGatedSteals(t *testing.T) {
	m := gateModel(SingleKey)
	m.AdversarialSteal = false
	report := Check(m, gateDepth)
	t.Log(report.Summary())
	if report.Violation != nil {
		t.Fatalf("%s violated:\n%s\n%s", report.Violation.Invariant,
			report.Violation.Detail, m.FormatTrace(report.Violation.Trace))
	}
}

// ---------- OUTCOME 2: self-validation against the withdrawn protocol ----------

// A checker that cannot find the known bug proves nothing by finding no bugs.
func TestTwoKeyProtocolRediscoversTheFencingViolation(t *testing.T) {
	m := gateModel(TwoKey)
	report := Check(m, gateDepth)
	t.Log(report.Summary())
	if report.Violation == nil {
		t.Fatalf("the withdrawn two-key protocol passed the check: the checker is broken, "+
			"not the protocol (%d states, %d transitions)", report.States, report.Transitions)
	}
	if report.Violation.Invariant != FencingSafety.Name {
		t.Fatalf("two-key failed %q; the recorded defect is fencing safety", report.Violation.Invariant)
	}
	t.Logf("minimal counterexample (%d transitions):\n%s",
		len(report.Violation.Trace), m.FormatTrace(report.Violation.Trace))

	// The recorded shape (P4 ratification note, audit CEX-3): a commit begins,
	// a later generation linearizes, and the commit then lands anyway.
	if !CounterexampleShaped(m, report.Violation.Trace) {
		t.Fatalf("counterexample is not the recorded begin/steal/finish shape:\n%s",
			m.FormatTrace(report.Violation.Trace))
	}
	kinds := make([]string, 0, len(report.Violation.Trace))
	for _, st := range report.Violation.Trace {
		kinds = append(kinds, st.Action.String())
	}
	t.Logf("trace = %s", strings.Join(kinds, ", "))
}

// The audit's own trace used ONE owner, because a lapsed claim re-taken by its
// original owner still increments the fence. That needs an owner able to act
// while its own commit is paused, which the sequential-process model forbids;
// SelfInterleave restores it, and the same defect appears.
func TestTwoKeyProtocolFailsWithASingleOwnerToo(t *testing.T) {
	m := Model{Owners: 1, Protocol: TwoKey, AdversarialSteal: true, SelfInterleave: true}
	report := Check(m, gateDepth)
	t.Log(report.Summary())
	if report.Violation == nil {
		t.Fatal("a single self-interleaving owner did not reproduce CEX-3")
	}
	if report.Violation.Invariant != FencingSafety.Name {
		t.Fatalf("failed %q, want fencing safety", report.Violation.Invariant)
	}
	t.Logf("single-owner counterexample (%d transitions):\n%s",
		len(report.Violation.Trace), m.FormatTrace(report.Violation.Trace))
}

// The withdrawn protocol is not wrong about everything, and saying so
// precisely is the point: unique commitment SURVIVED, fencing safety did not
// (P4 ratification note). If this ever started failing, the two-key model
// would be a strawman rather than a faithful record of what was withdrawn.
func TestTwoKeyProtocolStillHoldsUniqueTerminalOutcome(t *testing.T) {
	m := gateModel(TwoKey)
	report := CheckWith(m, gateDepth, []Invariant{UniqueTerminalOutcome})
	t.Log(report.Summary())
	if report.Violation != nil {
		t.Fatalf("two-key lost unique commitment as well:\n%s\n%s",
			report.Violation.Detail, m.FormatTrace(report.Violation.Trace))
	}
}

// The lease-gated (non-adversarial) two-key model must fail too: the defect is
// not an artifact of allowing steals against live claims.
func TestTwoKeyProtocolFailsWithLeaseGatedStealsToo(t *testing.T) {
	m := gateModel(TwoKey)
	m.AdversarialSteal = false
	report := Check(m, gateDepth)
	t.Log(report.Summary())
	if report.Violation == nil {
		t.Fatal("two-key survived with lease-gated steals; the defect must survive the weaker model")
	}
	t.Logf("lease-gated counterexample (%d transitions):\n%s",
		len(report.Violation.Trace), m.FormatTrace(report.Violation.Trace))
}

// ---------- determinism ----------

// Go randomizes map iteration order on every range statement, so repeating the
// search in one process is a real test of map-order independence — provided
// the search never lets map order reach an output, which is the point.
func TestCheckIsDeterministic(t *testing.T) {
	for _, p := range []Protocol{SingleKey, TwoKey} {
		m := gateModel(p)
		want := dump(m, Check(m, gateDepth))
		for i := 0; i < 8; i++ {
			got := dump(m, Check(m, gateDepth))
			if got != want {
				t.Fatalf("%s run %d diverged:\nfirst:\n%s\nlater:\n%s", p, i+1, want, got)
			}
		}
		t.Logf("%s: 9 identical runs\n%s", p, want)
	}
}

func dump(m Model, r Report) string {
	var b strings.Builder
	fmt.Fprintf(&b, "states=%d transitions=%d maxDepth=%d fingerprint=%016x\n",
		r.States, r.Transitions, r.MaxDepth, r.Fingerprint)
	if r.Violation != nil {
		fmt.Fprintf(&b, "violation=%s: %s\n%s", r.Violation.Invariant, r.Violation.Detail,
			m.FormatTrace(r.Violation.Trace))
	}
	return b.String()
}

// The canonical encoding is the visited-set key, so it must be injective on
// states that differ in any field the protocol can read.
func TestCanonicalEncodingSeparatesStates(t *testing.T) {
	m := gateModel(SingleKey)
	seen := map[string]State{}
	forEachReachable(m, gateDepth, func(s State) {
		key := s.Key()
		if prev, ok := seen[key]; ok && prev != s {
			t.Fatalf("two distinct states share an encoding:\n%s\n%s", m.Describe(prev), m.Describe(s))
		}
		seen[key] = s
	})
	t.Logf("%d states, all encodings distinct", len(seen))
}

func forEachReachable(m Model, depth int, visit func(State)) {
	fenceCap := m.maxFenceCap(depth)
	initial := m.Initial()
	m.normalize(&initial)
	index := map[string]bool{initial.Key(): true}
	queue := []State{initial}
	depths := []int{0}
	for head := 0; head < len(queue); head++ {
		cur := queue[head]
		visit(cur)
		if depths[head] >= depth {
			continue
		}
		for _, a := range m.Actions(cur, fenceCap) {
			next, _ := m.Step(cur, a, fenceCap)
			key := next.Key()
			if index[key] {
				continue
			}
			index[key] = true
			queue = append(queue, next)
			depths = append(depths, depths[head]+1)
		}
	}
}

// ---------- what the split buys, measured ----------

// On the single key, is the client-side pause between the fence read and the
// protected write observable AT THE CLIENT BOUNDARY? For every reachable state
// with a paused commit, compare the split finish against an unsplit one.
//
// This is not decoration. The real Commit is atomic at the client boundary —
// there is no public seam to pause in — so knowing whether the seam is
// observable tells the conformance lane exactly how much it must go out of its
// way to reproduce the schedule.
func TestSplitCommitIsInertOnTheSingleKeyAndDecisiveOnTheTwoKey(t *testing.T) {
	for _, tc := range []struct {
		protocol   Protocol
		wantDiffer bool
	}{
		{SingleKey, false},
		{TwoKey, true},
	} {
		m := gateModel(tc.protocol)
		differ := 0
		compared := 0
		var witness string
		forEachReachable(m, gateDepth, func(s State) {
			for o := 0; o < m.Owners; o++ {
				if !s.Procs[o].Pend.Active || s.Procs[o].Crashed {
					continue
				}
				compared++
				splitPost, splitOut := m.Step(s, Action{Kind: ActFinish, Owner: o}, m.maxFenceCap(gateDepth))
				atomicPost, atomicOut := m.StepAtomicFinish(s, o)
				if splitOut == atomicOut && splitPost == atomicPost {
					continue
				}
				differ++
				if witness == "" {
					witness = fmt.Sprintf("at %s\n  owner %s split -> %s, unsplit -> %s",
						m.Describe(s), ownerName(o), splitOut, atomicOut)
				}
			}
		})
		t.Logf("%s: %d paused commits compared, %d differ", tc.protocol, compared, differ)
		if witness != "" {
			t.Logf("%s witness: %s", tc.protocol, witness)
		}
		if tc.wantDiffer && differ == 0 {
			t.Fatalf("%s: the split made no observable difference, so the two-key defect "+
				"would be reachable without it", tc.protocol)
		}
		if !tc.wantDiffer && differ != 0 {
			t.Fatalf("%s: the split is observable at the client boundary in %d states; "+
				"conformance may not project it away\n%s", tc.protocol, differ, witness)
		}
	}
}

// ---------- STRETCH: fairness-bounded liveness ----------

func TestNoLivelockInTheClaimStealLoop(t *testing.T) {
	for _, generations := range []uint8{2, 3, 4} {
		m := gateModel(SingleKey)
		m.MaxFence = generations
		rep := CheckProgress(m)
		t.Logf("single-key, %d generations: %d states, %d interior states owe progress, "+
			"longest route to a terminal outcome %d transitions, %d stuck, %d truncated by the cap",
			generations, rep.States, rep.Owed, rep.LongestToDone, len(rep.Stuck), rep.CapTruncated)
		if rep.Owed == 0 {
			t.Fatal("no interior state owed progress; the check is vacuous")
		}
		if len(rep.Stuck) > 0 {
			t.Fatalf("%d reachable states can never reach a terminal outcome, e.g.\n  %s",
				len(rep.Stuck), m.Describe(rep.Stuck[0]))
		}
	}
}
