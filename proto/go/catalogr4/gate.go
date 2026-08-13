package catalogr4

import (
	"context"
	"fmt"
)

type SensitivityReport struct {
	Schedules int `json:"schedules"`
	Caught    int `json:"caught"`
}

type HonestReport struct {
	Planned     int         `json:"planned"`
	Attempted   int         `json:"attempted"`
	DrivenSteps int         `json:"drivenSteps"`
	Divergence  *Divergence `json:"divergence,omitempty"`
	Minimized   Schedule    `json:"minimized,omitempty"`
}

func RunCorruptedControls(ctx context.Context, corpus []Schedule) (SensitivityReport, error) {
	report := SensitivityReport{Schedules: len(corpus)}
	kinds := [...]MutationKind{MutateCatalog, MutateMirror, MutateData, MutateResolve}
	for index, schedule := range corpus {
		if len(schedule) == 0 {
			return report, fmt.Errorf("corrupted control %d has an empty schedule", index)
		}
		result, err := Replay(ctx, schedule, ReplayOptions{
			Mutation: Mutation{Step: 0, Kind: kinds[index%len(kinds)]},
		})
		if err != nil {
			return report, fmt.Errorf("corrupted control %d: %w", index, err)
		}
		if result.Divergence == nil {
			return report, fmt.Errorf("corrupted control %d (%s) went undetected", index, kinds[index%len(kinds)])
		}
		report.Caught++
	}
	return report, nil
}

// RunSabotageControl is run only in a binary built with the
// catalogr4_sabotage tag. That tag reintroduces the R2 AssertedIdentity
// behavior while keeping the production files unchanged.
func RunSabotageControl(ctx context.Context) (*Divergence, error) {
	schedule := Schedule{
		{Kind: CreateAtomic, Creator: 1, Daemon: 1, Value: 1},
	}
	result, err := Replay(ctx, schedule, ReplayOptions{})
	if err != nil {
		return nil, err
	}
	if result.Divergence == nil {
		return nil, fmt.Errorf("the AssertedIdentity sabotage went undetected")
	}
	return result.Divergence, nil
}

func RunHonestCorpus(ctx context.Context, corpus []Schedule) (HonestReport, error) {
	report := HonestReport{Planned: len(corpus)}
	for index, schedule := range corpus {
		result, err := Replay(ctx, schedule, ReplayOptions{})
		if err != nil {
			return report, fmt.Errorf("honest schedule %d: %w", index, err)
		}
		report.Attempted++
		report.DrivenSteps += result.Steps
		if result.Divergence == nil {
			continue
		}
		minimized, divergence, err := Minimize(ctx, schedule, ReplayOptions{})
		if err != nil {
			return report, fmt.Errorf("minimize honest schedule %d: %w", index, err)
		}
		report.Divergence = divergence
		report.Minimized = minimized
		return report, nil
	}
	return report, nil
}
