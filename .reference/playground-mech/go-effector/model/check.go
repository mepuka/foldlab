package model

import (
	"fmt"
	"strings"
)

// An Invariant is checked on every transition, not merely on every state:
// fencing safety is a property of a WRITE (a commit that lands under a
// superseded fence), and a property of a write is invisible to a state
// predicate once the state has moved on.
type Invariant struct {
	Name string
	// Violated returns "" when the transition is legal, or a human-readable
	// reason when it is not.
	Violated func(m Model, pre State, a Action, out Outcome, post State) string
}

// FencingSafety is SPEC §6.3: a commit under fence f can NEVER succeed after
// any generation f' > f has linearized. Equivalently — and this is the form
// the audit searched for — no successful commit may carry a fence below the
// maximum linearized generation.
var FencingSafety = Invariant{
	Name: "fencing safety (SPEC 6.3)",
	Violated: func(m Model, pre State, a Action, out Outcome, post State) string {
		if out.Kind != OutFirst {
			return ""
		}
		if out.Fence == post.MaxFence {
			return ""
		}
		return fmt.Sprintf(
			"%s committed at fence %d while generation %d had already linearized",
			ownerName(a.Owner), out.Fence, post.MaxFence)
	},
}

// UniqueTerminalOutcome is SPEC §6.2: Done is terminal, so once a terminal
// outcome exists no transition may change it.
var UniqueTerminalOutcome = Invariant{
	Name: "unique terminal outcome (SPEC 6.2)",
	Violated: func(m Model, pre State, a Action, out Outcome, post State) string {
		before := m.terminal(pre)
		if before.Tag != TagDone {
			return ""
		}
		after := m.terminal(post)
		if after == before {
			return ""
		}
		return fmt.Sprintf("terminal outcome changed from %s to %s", before, after)
	},
}

// TerminalFenceIsMaximal is the state-level shadow of fencing safety: a stored
// outcome always carries the greatest generation ever linearized. It is listed
// separately because it can fail where FencingSafety cannot look — a later
// generation linearizing ON TOP of an existing outcome.
var TerminalFenceIsMaximal = Invariant{
	Name: "terminal fence is maximal",
	Violated: func(m Model, pre State, a Action, out Outcome, post State) string {
		t := m.terminal(post)
		if t.Tag != TagDone || t.Fence == post.MaxFence {
			return ""
		}
		return fmt.Sprintf("stored outcome is at fence %d, max generation is %d",
			t.Fence, post.MaxFence)
	},
}

// GenerationsAreMonotone: fences never go backwards.
var GenerationsAreMonotone = Invariant{
	Name: "generations are monotone",
	Violated: func(m Model, pre State, a Action, out Outcome, post State) string {
		if post.MaxFence >= pre.MaxFence {
			return ""
		}
		return fmt.Sprintf("max generation fell from %d to %d", pre.MaxFence, post.MaxFence)
	},
}

// DefaultInvariants is what the gate checks.
var DefaultInvariants = []Invariant{
	FencingSafety,
	UniqueTerminalOutcome,
	TerminalFenceIsMaximal,
	GenerationsAreMonotone,
}

// A TraceStep is one transition of a counterexample or a conformance schedule.
type TraceStep struct {
	Action  Action
	Outcome Outcome
	Before  State
	After   State
}

// A Violation is a minimal-depth counterexample: BFS guarantees no shorter
// trace reaches the same failure.
type Violation struct {
	Invariant string
	Detail    string
	Trace     []TraceStep
}

// Report is the result of a bounded check.
type Report struct {
	Model       Model
	Depth       int   // 0 means "explored to closure under FenceCap"
	FenceCap    uint8 // the generation bound that makes the system finite
	States      int   // distinct states reached
	Transitions int   // (state, enabled action) pairs fired
	MaxDepth    int   // deepest level actually reached
	Fingerprint uint64
	Violation   *Violation
}

func (r Report) Summary() string {
	bound := fmt.Sprintf("depth %d", r.Depth)
	if r.Depth <= 0 {
		bound = "closure"
	}
	verdict := "no violation"
	if r.Violation != nil {
		// BFS stops the moment an invariant fails, so States/Transitions are
		// the search EFFORT spent finding it, not a measure of coverage, and
		// the counterexample length is what matters.
		verdict = fmt.Sprintf("VIOLATED after %d transitions: %s (minimal counterexample %d transitions)",
			r.Transitions, r.Violation.Invariant, len(r.Violation.Trace))
	}
	return fmt.Sprintf("%s / %s, fence cap %d: %d states, %d transitions, deepest state expanded %d, fingerprint %016x -- %s",
		r.Model, bound, r.FenceCap, r.States, r.Transitions, r.MaxDepth, r.Fingerprint, verdict)
}

// FormatTrace renders a counterexample as a numbered schedule.
func (m Model) FormatTrace(trace []TraceStep) string {
	var b strings.Builder
	for i, st := range trace {
		fmt.Fprintf(&b, "  %2d. %-10s -> %-14s | %s\n",
			i+1, st.Action, st.Outcome, m.Describe(st.After))
	}
	return b.String()
}

type link struct {
	parent  int // -1 for the initial state
	action  Action
	outcome Outcome
}

// Check runs a deterministic breadth-first search of the transition system and
// returns the first invariant violation, which by BFS is a minimal-depth one.
//
// depth <= 0 means "explore to closure", which requires Model.MaxFence > 0 so
// that the state space is finite.
func Check(m Model, depth int) Report {
	return CheckWith(m, depth, DefaultInvariants)
}

// CheckWith is Check with an explicit invariant set.
func CheckWith(m Model, depth int, invariants []Invariant) Report {
	if depth <= 0 && m.MaxFence == 0 {
		panic("model: closure check needs Model.MaxFence > 0 to be finite")
	}
	fenceCap := m.maxFenceCap(depth)

	report := Report{Model: m, Depth: depth, FenceCap: fenceCap}

	initial := m.Initial()
	m.normalize(&initial)

	index := map[string]int{initial.Key(): 0}
	states := []State{initial}
	depths := []int{0}
	links := []link{{parent: -1}}
	report.Fingerprint = initial.Hash64()

	for head := 0; head < len(states); head++ {
		cur := states[head]
		curDepth := depths[head]
		if curDepth > report.MaxDepth {
			report.MaxDepth = curDepth
		}
		if depth > 0 && curDepth >= depth {
			continue
		}
		for _, a := range m.Actions(cur, fenceCap) {
			next, out := m.Step(cur, a, fenceCap)
			report.Transitions++
			for _, inv := range invariants {
				reason := inv.Violated(m, cur, a, out, next)
				if reason == "" {
					continue
				}
				report.States = len(states)
				report.Violation = &Violation{
					Invariant: inv.Name,
					Detail:    reason,
					Trace:     reconstruct(states, links, head, TraceStep{Action: a, Outcome: out, Before: cur, After: next}),
				}
				return report
			}
			key := next.Key()
			if _, seen := index[key]; seen {
				continue
			}
			index[key] = len(states)
			states = append(states, next)
			depths = append(depths, curDepth+1)
			links = append(links, link{parent: head, action: a, outcome: out})
			report.Fingerprint += next.Hash64()
		}
	}
	report.States = len(states)
	return report
}

// reconstruct walks parent links back to the initial state and appends the
// violating step.
func reconstruct(states []State, links []link, node int, last TraceStep) []TraceStep {
	var rev []TraceStep
	for i := node; i > 0; i = links[i].parent {
		rev = append(rev, TraceStep{
			Action:  links[i].action,
			Outcome: links[i].outcome,
			Before:  states[links[i].parent],
			After:   states[i],
		})
	}
	trace := make([]TraceStep, 0, len(rev)+1)
	for i := len(rev) - 1; i >= 0; i-- {
		trace = append(trace, rev[i])
	}
	return append(trace, last)
}

// ---------- path enumeration (the conformance schedules) ----------

// A PathFilter decides whether a completed schedule is worth driving against
// the implementation.
type PathFilter func(m Model, path []TraceStep) bool

// PathSet is the result of enumerating schedules.
type PathSet struct {
	Model    Model
	Depth    int
	Paths    [][]TraceStep
	Explored int  // complete schedules considered
	Limit    int  // 0 = unlimited
	Capped   bool // the limit was hit, so coverage is a SAMPLE, not exhaustive
}

// EnumeratePaths performs a deterministic depth-first enumeration of every
// schedule of exactly `depth` actions (plus any shorter schedule that runs out
// of enabled actions). Every shorter schedule is a prefix of an emitted one,
// so emitting only maximal schedules loses no coverage.
//
// allow restricts the action alphabet — the conformance driver uses it to drop
// actions it cannot faithfully realize. keep selects which completed schedules
// to emit; a nil keep emits all of them.
//
// limit > 0 stops enumeration early and sets Capped. Callers MUST report
// Capped: a truncated sweep is a sample, and calling a sample exhaustive is
// exactly the mistake this whole lane exists to prevent.
func EnumeratePaths(m Model, depth, limit int, allow func(Action) bool, keep PathFilter) PathSet {
	fenceCap := m.maxFenceCap(depth)
	out := PathSet{Model: m, Depth: depth, Limit: limit}

	initial := m.Initial()
	m.normalize(&initial)

	path := make([]TraceStep, 0, depth)
	var walk func(s State)
	walk = func(s State) {
		if out.Capped {
			return
		}
		if len(path) == depth {
			out.emit(m, path, keep)
			return
		}
		fired := 0
		for _, a := range m.Actions(s, fenceCap) {
			if allow != nil && !allow(a) {
				continue
			}
			fired++
			next, res := m.Step(s, a, fenceCap)
			path = append(path, TraceStep{Action: a, Outcome: res, Before: s, After: next})
			walk(next)
			path = path[:len(path)-1]
			if out.Capped {
				return
			}
		}
		if fired == 0 {
			out.emit(m, path, keep)
		}
	}
	walk(initial)
	return out
}

func (p *PathSet) emit(m Model, path []TraceStep, keep PathFilter) {
	p.Explored++
	if keep != nil && !keep(m, path) {
		return
	}
	clone := make([]TraceStep, len(path))
	copy(clone, path)
	p.Paths = append(p.Paths, clone)
	if p.Limit > 0 && len(p.Paths) >= p.Limit {
		p.Capped = true
	}
}

// CounterexampleShaped is the filter for "adjacent to the historical
// counterexample": a commit that BEGAN under one generation and FINISHED after
// a strictly later generation had linearized. That is the begin/steal/finish
// shape which refuted the two-key protocol, and it is the shape the single-key
// protocol must refuse every time.
func CounterexampleShaped(m Model, path []TraceStep) bool {
	for i, st := range path {
		if st.Action.Kind != ActFinish {
			continue
		}
		used := st.Before.Procs[st.Action.Owner].Pend.UsedFence
		if used < st.Before.MaxFence && beganBefore(path[:i], st.Action.Owner) {
			return true
		}
	}
	return false
}

func beganBefore(prefix []TraceStep, owner int) bool {
	for i := len(prefix) - 1; i >= 0; i-- {
		a := prefix[i].Action
		if a.Owner == owner && a.Kind == ActBegin {
			return true
		}
	}
	return false
}

// ---------- bounded terminal reachability ----------

// ProgressReport is the result of the bounded terminal-reachability check.
type ProgressReport struct {
	Model    Model
	FenceCap uint8
	States   int
	// Owed is the number of reachable INTERIOR states that still have an
	// uncrashed process and no terminal outcome. Interior means at least one
	// generation short of the cap, so the state is not being starved by the
	// bound itself.
	Owed int
	// Stuck are interior states from which NO finite schedule reaches a
	// terminal outcome even though an uncrashed process remains. An empty
	// Stuck set proves non-trapping (EF Done), not fairness or liveness.
	Stuck []State
	// CapTruncated counts states sitting exactly ON the generation cap with no
	// route to a terminal outcome. These are artifacts of the bound — the
	// steal that would rescue them is the one the cap forbids — so they are
	// excluded from the verdict and reported here rather than dropped
	// silently. Raising the cap moves each of them into the interior, which is
	// why the check is run at several caps.
	CapTruncated int
	// LongestToDone is the greatest length of a shortest route from an
	// interior state to a terminal outcome. It is existential and does not
	// bound every scheduler.
	LongestToDone int
}

// CheckProgress explores the state space to closure under the model's
// generation cap and asks, of every reachable state that still has an
// uncrashed process, whether a terminal outcome is reachable at all.
//
// What this establishes, precisely: every reported interior state has at
// least one finite route to Done inside the generation bound. This is CTL
// reachability (EF Done), not a fairness relation, an all-path property, or a
// liveness proof. SPEC §6.4's conditional liveness still rests on partial
// synchrony and fair retry.
func CheckProgress(m Model) ProgressReport {
	if m.MaxFence == 0 {
		panic("model: progress check needs Model.MaxFence > 0 to be finite")
	}
	fenceCap := m.MaxFence
	rep := ProgressReport{Model: m, FenceCap: fenceCap}

	initial := m.Initial()
	m.normalize(&initial)
	index := map[string]int{initial.Key(): 0}
	states := []State{initial}
	var forward [][]int

	for head := 0; head < len(states); head++ {
		cur := states[head]
		forward = append(forward, nil)
		for _, a := range m.Actions(cur, fenceCap) {
			next, _ := m.Step(cur, a, fenceCap)
			key := next.Key()
			id, seen := index[key]
			if !seen {
				id = len(states)
				index[key] = id
				states = append(states, next)
			}
			if id != head {
				forward[head] = append(forward[head], id)
			}
		}
	}
	rep.States = len(states)

	// Reverse edges, then a backward BFS from every terminal state gives the
	// exact distance-to-progress for each reachable state.
	reverse := make([][]int, len(states))
	for from, tos := range forward {
		for _, to := range tos {
			reverse[to] = append(reverse[to], from)
		}
	}
	const unreachable = -1
	dist := make([]int, len(states))
	for i := range dist {
		dist[i] = unreachable
	}
	queue := make([]int, 0, len(states))
	for i, s := range states {
		if m.terminal(s).Tag == TagDone {
			dist[i] = 0
			queue = append(queue, i)
		}
	}
	for head := 0; head < len(queue); head++ {
		cur := queue[head]
		for _, prev := range reverse[cur] {
			if dist[prev] != unreachable {
				continue
			}
			dist[prev] = dist[cur] + 1
			queue = append(queue, prev)
		}
	}

	for i, s := range states {
		if m.terminal(s).Tag == TagDone {
			continue
		}
		if !m.hasLiveProcess(s) {
			// Every process has crashed. Nothing can progress and nothing
			// claims otherwise: SPEC §6.4 promises recovery by a LATER
			// claimant, and a state with no claimant left is out of scope.
			continue
		}
		if s.MaxFence >= fenceCap {
			// On the boundary: the only route out may be a steal the cap
			// forbids, so this state's fate is undecided by THIS run.
			if dist[i] == unreachable {
				rep.CapTruncated++
			}
			continue
		}
		rep.Owed++
		if dist[i] == unreachable {
			rep.Stuck = append(rep.Stuck, s)
			continue
		}
		if dist[i] > rep.LongestToDone {
			rep.LongestToDone = dist[i]
		}
	}
	return rep
}

func (m Model) hasLiveProcess(s State) bool {
	for o := 0; o < m.Owners; o++ {
		if !s.Procs[o].Crashed {
			return true
		}
	}
	return false
}
