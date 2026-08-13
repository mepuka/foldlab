// Package catalogr4 is the executable refinement oracle for verify/catalog.
// It restates Catalog.tla's ratified transition table at exactly the R2 bounds
// and drives those transitions against protod through its public NATS writ.
package catalogr4

import (
	"encoding/json"
	"fmt"
)

const (
	R2Daemons         = 2
	R2Values          = 3
	R2Creators        = 2
	R2DataCap         = 2
	R2ReachableStates = 12_707_989
)

type ActionKind string

const (
	CreateBegin   ActionKind = "CreateBegin"
	CreateFinish  ActionKind = "CreateFinish"
	MirrorAdvance ActionKind = "MirrorAdvance"
	Publish       ActionKind = "Publish"
)

// Action uses the same one-based domains as Catalog.tla. Fields irrelevant to
// a kind stay zero, which makes schedules compact and deterministic to encode.
type Action struct {
	Kind    ActionKind `json:"kind"`
	Creator int        `json:"creator,omitempty"`
	Daemon  int        `json:"daemon,omitempty"`
	Origin  int        `json:"origin,omitempty"`
	Value   int        `json:"value,omitempty"`
}

func (a Action) String() string {
	switch a.Kind {
	case CreateBegin:
		return fmt.Sprintf("CreateBegin(c=%d,d=%d,v=%d)", a.Creator, a.Daemon, a.Value)
	case CreateFinish:
		return fmt.Sprintf("CreateFinish(c=%d)", a.Creator)
	case MirrorAdvance:
		return fmt.Sprintf("MirrorAdvance(d=%d,o=%d)", a.Daemon, a.Origin)
	case Publish:
		return fmt.Sprintf("Publish(d=%d,i=%d)", a.Daemon, a.Value)
	default:
		return fmt.Sprintf("Action(%q)", a.Kind)
	}
}

type Schedule []Action

type Fact struct {
	Value int `json:"value"`
}

type CreatorState struct {
	Busy     bool `json:"busy"`
	Daemon   int  `json:"daemon"`
	Value    int  `json:"value"`
	Expected int  `json:"expected"`
}

type State struct {
	Catalog  [R2Daemons][]Fact            `json:"catalog"`
	Mirror   [R2Daemons][R2Daemons][]Fact `json:"mirror"`
	Data     [R2Daemons][]int             `json:"data"`
	Creators [R2Creators]CreatorState     `json:"creators"`
}

func InitialState() State { return State{} }

func (s State) Clone() State {
	next := s
	for daemon := range next.Catalog {
		next.Catalog[daemon] = append([]Fact(nil), s.Catalog[daemon]...)
		next.Data[daemon] = append([]int(nil), s.Data[daemon]...)
		for origin := range next.Mirror[daemon] {
			next.Mirror[daemon][origin] = append([]Fact(nil), s.Mirror[daemon][origin]...)
		}
	}
	return next
}

func (s State) Key() string {
	encoded, err := json.Marshal(s)
	if err != nil {
		panic(err)
	}
	return string(encoded)
}

func (s State) resolves(daemon, value int) bool {
	for _, fact := range s.Catalog[daemon-1] {
		if fact.Value == value {
			return true
		}
	}
	for origin := 0; origin < R2Daemons; origin++ {
		if origin == daemon-1 {
			continue
		}
		for _, fact := range s.Mirror[daemon-1][origin] {
			if fact.Value == value {
				return true
			}
		}
	}
	return false
}

func (s State) Resolvable(daemon int) []int {
	var values []int
	for value := 1; value <= R2Values; value++ {
		if s.resolves(daemon, value) {
			values = append(values, value)
		}
	}
	return values
}

type Outcome struct {
	Branch string `json:"branch"`
}

type TraceStep struct {
	Before  State   `json:"before"`
	Action  Action  `json:"action"`
	Outcome Outcome `json:"outcome"`
	After   State   `json:"after"`
}

func Step(before State, action Action) (State, Outcome, error) {
	next := before.Clone()
	switch action.Kind {
	case CreateBegin:
		if action.Creator < 1 || action.Creator > R2Creators ||
			action.Daemon < 1 || action.Daemon > R2Daemons ||
			action.Value < 1 || action.Value > R2Values {
			return State{}, Outcome{}, fmt.Errorf("out-of-domain %s", action)
		}
		creator := &next.Creators[action.Creator-1]
		if creator.Busy {
			return State{}, Outcome{}, fmt.Errorf("disabled %s: creator is busy", action)
		}
		if before.resolves(action.Daemon, action.Value) {
			return before, Outcome{Branch: "CreateBegin.converged"}, nil
		}
		*creator = CreatorState{
			Busy:     true,
			Daemon:   action.Daemon,
			Value:    action.Value,
			Expected: len(before.Catalog[action.Daemon-1]),
		}
		return next, Outcome{Branch: "CreateBegin.pending"}, nil

	case CreateFinish:
		if action.Creator < 1 || action.Creator > R2Creators {
			return State{}, Outcome{}, fmt.Errorf("out-of-domain %s", action)
		}
		pending := before.Creators[action.Creator-1]
		if !pending.Busy {
			return State{}, Outcome{}, fmt.Errorf("disabled %s: creator is idle", action)
		}
		next.Creators[action.Creator-1] = CreatorState{}
		if len(before.Catalog[pending.Daemon-1]) != pending.Expected {
			return next, Outcome{Branch: "CreateFinish.conflict"}, nil
		}
		next.Catalog[pending.Daemon-1] = append(
			next.Catalog[pending.Daemon-1], Fact{Value: pending.Value})
		return next, Outcome{Branch: "CreateFinish.appended"}, nil

	case MirrorAdvance:
		if action.Daemon < 1 || action.Daemon > R2Daemons ||
			action.Origin < 1 || action.Origin > R2Daemons ||
			action.Daemon == action.Origin {
			return State{}, Outcome{}, fmt.Errorf("out-of-domain %s", action)
		}
		mirror := next.Mirror[action.Daemon-1][action.Origin-1]
		origin := before.Catalog[action.Origin-1]
		if len(mirror) >= len(origin) {
			return State{}, Outcome{}, fmt.Errorf("disabled %s: origin has no next fact", action)
		}
		next.Mirror[action.Daemon-1][action.Origin-1] = append(mirror, origin[len(mirror)])
		return next, Outcome{Branch: "MirrorAdvance.advanced"}, nil

	case Publish:
		if action.Daemon < 1 || action.Daemon > R2Daemons ||
			action.Value < 1 || action.Value > R2Values {
			return State{}, Outcome{}, fmt.Errorf("out-of-domain %s", action)
		}
		if len(before.Data[action.Daemon-1]) >= R2DataCap {
			return State{}, Outcome{}, fmt.Errorf("disabled %s: data journal reached cap", action)
		}
		if !before.resolves(action.Daemon, action.Value) {
			return before, Outcome{Branch: "Publish.refused"}, nil
		}
		next.Data[action.Daemon-1] = append(next.Data[action.Daemon-1], action.Value)
		return next, Outcome{Branch: "Publish.admitted"}, nil
	default:
		return State{}, Outcome{}, fmt.Errorf("unknown action kind %q", action.Kind)
	}
}

func Trace(schedule Schedule) ([]TraceStep, error) {
	state := InitialState()
	trace := make([]TraceStep, 0, len(schedule))
	for index, action := range schedule {
		next, outcome, err := Step(state, action)
		if err != nil {
			return nil, fmt.Errorf("step %d %s: %w", index+1, action, err)
		}
		trace = append(trace, TraceStep{Before: state, Action: action, Outcome: outcome, After: next})
		state = next
	}
	return trace, nil
}

func EnabledActions(state State) []Action {
	actions := make([]Action, 0, 32)
	for creator := 1; creator <= R2Creators; creator++ {
		if state.Creators[creator-1].Busy {
			continue
		}
		for daemon := 1; daemon <= R2Daemons; daemon++ {
			for value := 1; value <= R2Values; value++ {
				actions = append(actions, Action{Kind: CreateBegin, Creator: creator, Daemon: daemon, Value: value})
			}
		}
	}
	for creator := 1; creator <= R2Creators; creator++ {
		if state.Creators[creator-1].Busy {
			actions = append(actions, Action{Kind: CreateFinish, Creator: creator})
		}
	}
	for daemon := 1; daemon <= R2Daemons; daemon++ {
		for origin := 1; origin <= R2Daemons; origin++ {
			if daemon != origin &&
				len(state.Mirror[daemon-1][origin-1]) < len(state.Catalog[origin-1]) {
				actions = append(actions, Action{Kind: MirrorAdvance, Daemon: daemon, Origin: origin})
			}
		}
	}
	for daemon := 1; daemon <= R2Daemons; daemon++ {
		if len(state.Data[daemon-1]) >= R2DataCap {
			continue
		}
		for value := 1; value <= R2Values; value++ {
			actions = append(actions, Action{Kind: Publish, Daemon: daemon, Value: value})
		}
	}
	return actions
}
