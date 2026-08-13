package catalogr4

import "fmt"

type CorpusConfig struct {
	RandomSchedules int    `json:"randomSchedules"`
	Depth           int    `json:"depth"`
	BaseSeed        uint64 `json:"baseSeed"`
}

func DefaultCorpusConfig() CorpusConfig {
	return CorpusConfig{
		RandomSchedules: 128,
		Depth:           24,
		BaseSeed:        0x17ca0001,
	}
}

// GenerateCorpus first emits short branch witnesses, then one uniform random
// walk per recorded seed. At each step the choice is uniform over the stable,
// fully enumerated enabled-action list. This is sampling, not DPOR and not an
// exhaustive claim; the exact state coverage is reported separately.
func GenerateCorpus(config CorpusConfig) ([]Schedule, error) {
	if config.RandomSchedules < 0 || config.Depth < 1 || config.BaseSeed == 0 {
		return nil, fmt.Errorf("invalid corpus config: %+v", config)
	}
	corpus := coverageWitnesses()
	for index := 0; index < config.RandomSchedules; index++ {
		seed := config.BaseSeed + uint64(index)*0x9e3779b97f4a7c15
		rng := xorshift64{state: seed}
		state := InitialState()
		schedule := make(Schedule, 0, config.Depth)
		for step := 0; step < config.Depth; step++ {
			actions := EnabledActions(state)
			if len(actions) == 0 {
				break
			}
			action := actions[int(rng.next()%uint64(len(actions)))]
			next, _, err := Step(state, action)
			if err != nil {
				return nil, err
			}
			schedule = append(schedule, action)
			state = next
		}
		corpus = append(corpus, schedule)
	}
	return corpus, nil
}

func coverageWitnesses() []Schedule {
	return []Schedule{
		{{Kind: Publish, Daemon: 1, Value: 1}},
		{
			{Kind: CreateBegin, Creator: 1, Daemon: 1, Value: 1},
			{Kind: CreateFinish, Creator: 1},
			{Kind: CreateBegin, Creator: 2, Daemon: 1, Value: 1},
			{Kind: Publish, Daemon: 1, Value: 1},
		},
		{
			{Kind: CreateBegin, Creator: 1, Daemon: 1, Value: 1},
			{Kind: CreateFinish, Creator: 1},
			{Kind: MirrorAdvance, Daemon: 2, Origin: 1},
			{Kind: Publish, Daemon: 2, Value: 1},
		},
		{
			{Kind: CreateBegin, Creator: 1, Daemon: 1, Value: 1},
			{Kind: CreateBegin, Creator: 2, Daemon: 1, Value: 1},
			{Kind: CreateFinish, Creator: 1},
			{Kind: CreateFinish, Creator: 2},
		},
		StaleDistinctValueConflictSchedule(),
	}
}

func StaleDistinctValueConflictSchedule() Schedule {
	return Schedule{
		{Kind: CreateBegin, Creator: 1, Daemon: 1, Value: 1},
		{Kind: CreateBegin, Creator: 2, Daemon: 1, Value: 2},
		{Kind: CreateFinish, Creator: 2},
		{Kind: CreateFinish, Creator: 1},
	}
}

type xorshift64 struct{ state uint64 }

func (r *xorshift64) next() uint64 {
	x := r.state
	x ^= x << 13
	x ^= x >> 7
	x ^= x << 17
	r.state = x
	return x
}

type Coverage struct {
	Schedules            int             `json:"schedules"`
	Steps                int             `json:"steps"`
	DistinctStates       int             `json:"distinctStates"`
	ReachableDenominator int             `json:"reachableDenominator"`
	StatePercent         float64         `json:"statePercent"`
	Disjuncts            map[string]bool `json:"disjuncts"`
	Branches             map[string]bool `json:"branches"`
}

func MeasureCoverage(corpus []Schedule) Coverage {
	coverage := Coverage{
		Schedules:            len(corpus),
		ReachableDenominator: R2ReachableStates,
		Disjuncts:            map[string]bool{},
		Branches:             map[string]bool{},
	}
	states := map[string]bool{InitialState().Key(): true}
	for _, schedule := range corpus {
		trace, err := Trace(schedule)
		if err != nil {
			panic(err)
		}
		for _, step := range trace {
			coverage.Steps++
			coverage.Disjuncts[string(step.Action.Kind)] = true
			coverage.Branches[step.Outcome.Branch] = true
			states[step.After.Key()] = true
		}
	}
	coverage.DistinctStates = len(states)
	coverage.StatePercent = 100 * float64(len(states)) / float64(R2ReachableStates)
	return coverage
}
