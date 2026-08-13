// COORDINATOR-OWNED — the R1 fitness function
// (docs/gauntlet/R1-variant-loop-real.md). Climbers build harnesses that
// produce bundles this accepts; they do not edit it.
package gauntlet

import (
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
)

// RealFloors are R1's hardness minima. ReuseMilli is the reuse factor
// (naive logical calls / physical calls) in thousandths: 2500 = 2.5x.
type RealFloors struct {
	LogicalMin int
	ReuseMilli int
	KillsMin   int
}

var R1 = RealFloors{LogicalMin: 480, ReuseMilli: 2500, KillsMin: 1}

var (
	ErrPlan     = errors.New("gauntlet: plan refused (RL2/RL4)")
	ErrReceipts = errors.New("gauntlet: receipts refused (RL3/RL6)")
	ErrWiring   = errors.New("gauntlet: input wiring refused (RL2)")
)

// RealReport is what a passing bundle proved, by recomputation. Spend
// figures are integer micro-USD.
type RealReport struct {
	Logical         int
	Physical        int
	ReuseMilli      int
	Kills           int
	SpendMicro      int64
	NaiveSpendMicro int64
	Head            string
	Model           string
}

type realManifest struct {
	Caps struct {
		MaxCalls        int   `json:"max_calls"`
		MaxOutputTokens int   `json:"max_output_tokens"`
		MaxSpendMicro   int64 `json:"max_spend_usd_micro"`
	} `json:"caps"`
	K      int    `json:"k"`
	L      int    `json:"l"`
	Model  string `json:"model"`
	Prices struct {
		InputMicroPerTok  int64 `json:"input_micro_per_token"`
		OutputMicroPerTok int64 `json:"output_micro_per_token"`
	} `json:"prices"`
	Q    int    `json:"q"`
	Seed string `json:"seed"`
}

type planRow struct {
	Inputs   []string `json:"inputs"`
	Question int      `json:"question"`
	Step     int      `json:"step"`
	Template string   `json:"template"`
	Variant  int      `json:"variant"`
	Work     string   `json:"work"`
}

type receiptFact struct {
	Digest       string `json:"digest"`
	InputTokens  int64  `json:"input_tokens"`
	Model        string `json:"model"`
	OutputTokens int64  `json:"output_tokens"`
	Result       string `json:"result"`
	Stop         string `json:"stop"`
}

// VerifyReal checks an R1 bundle against RL1-RL7 at the given floors.
func VerifyReal(dir string, floors RealFloors) (RealReport, error) {
	var report RealReport

	var man realManifest
	if err := readCanonicalJSON(filepath.Join(dir, "manifest.json"), &man); err != nil {
		return report, fmt.Errorf("%w: %v", ErrManifest, err)
	}
	if man.K < 1 || man.L < 1 || man.Q < 1 || man.Model == "" || man.Seed == "" {
		return report, fmt.Errorf("%w: k/l/q/model/seed must be set", ErrManifest)
	}
	if man.Prices.InputMicroPerTok < 0 || man.Prices.OutputMicroPerTok < 0 ||
		man.Caps.MaxCalls < 1 || man.Caps.MaxOutputTokens < 1 || man.Caps.MaxSpendMicro < 1 {
		return report, fmt.Errorf("%w: prices and caps must be positive", ErrManifest)
	}
	report.Model = man.Model

	// RL1: the journal chain, and every fact is a well-formed receipt.
	journalLines, err := readLines(filepath.Join(dir, "journal.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrChain, err)
	}
	head, err := walkChain(journalLines)
	if err != nil {
		return report, err
	}
	report.Head = head

	factByWork := make(map[string]receiptFact, len(journalLines))
	var spendMicro int64
	for i, line := range journalLines {
		var wire wireEntry
		if err := strictDecode(line, &wire); err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrChain, i, err)
		}
		payload := []byte(wire.Payload)
		if !isCanonical(payload) {
			return report, fmt.Errorf("%w: entry %d payload not canonical", ErrSemantics, i)
		}
		var fact receiptFact
		if err := strictDecode(payload, &fact); err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrSemantics, i, err)
		}
		if !hex64.MatchString(fact.Digest) || !hex64.MatchString(fact.Result) {
			return report, fmt.Errorf("%w: entry %d digests malformed", ErrSemantics, i)
		}
		// RL2: no digest has two receipts — a rerun re-reads, never re-buys.
		if _, dup := factByWork[fact.Digest]; dup {
			return report, fmt.Errorf(
				"%w: work digest bought twice at entry %d (%s)",
				ErrReceipts, i, fact.Digest,
			)
		}
		// RL3 + RL6: model pinned, tokens within caps.
		if fact.Model != man.Model {
			return report, fmt.Errorf("%w: entry %d model %q != manifest %q", ErrReceipts, i, fact.Model, man.Model)
		}
		if fact.InputTokens < 0 || fact.OutputTokens < 0 {
			return report, fmt.Errorf("%w: entry %d negative token counts", ErrReceipts, i)
		}
		if fact.OutputTokens > int64(man.Caps.MaxOutputTokens) {
			return report, fmt.Errorf(
				"%w: entry %d output tokens %d exceed cap %d",
				ErrReceipts, i, fact.OutputTokens, man.Caps.MaxOutputTokens,
			)
		}
		spendMicro += fact.InputTokens*man.Prices.InputMicroPerTok +
			fact.OutputTokens*man.Prices.OutputMicroPerTok
		factByWork[fact.Digest] = fact
	}
	if len(journalLines) > man.Caps.MaxCalls {
		return report, fmt.Errorf(
			"%w: %d physical calls exceed max_calls %d",
			ErrReceipts, len(journalLines), man.Caps.MaxCalls,
		)
	}
	if spendMicro > man.Caps.MaxSpendMicro {
		return report, fmt.Errorf(
			"%w: spend %d micro-usd exceeds cap %d",
			ErrReceipts, spendMicro, man.Caps.MaxSpendMicro,
		)
	}
	report.Physical = len(journalLines)
	report.SpendMicro = spendMicro

	// RL2 + RL4: the plan — every logical step, its work digest
	// recomputed, its input wiring enforced, its fact resolved.
	planLines, err := readLines(filepath.Join(dir, "plan.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrPlan, err)
	}
	if len(planLines) != man.K*man.L*man.Q {
		return report, fmt.Errorf(
			"%w: %d plan rows for k*l*q = %d",
			ErrPlan, len(planLines), man.K*man.L*man.Q,
		)
	}
	rowByKey := make(map[string]planRow, len(planLines))
	templateByVariantStep := make(map[string]string, man.K*man.L)
	var naiveMicro int64
	usedWorks := make(map[string]bool, len(planLines))
	for i, line := range planLines {
		if !isCanonical(line) {
			return report, fmt.Errorf("%w: plan row %d not canonical", ErrPlan, i)
		}
		var row planRow
		if err := strictDecode(line, &row); err != nil {
			return report, fmt.Errorf("%w: plan row %d: %v", ErrPlan, i, err)
		}
		if row.Variant < 0 || row.Variant >= man.K ||
			row.Step < 0 || row.Step >= man.L ||
			row.Question < 0 || row.Question >= man.Q {
			return report, fmt.Errorf("%w: plan row %d out of range", ErrPlan, i)
		}
		if !hex64.MatchString(row.Template) {
			return report, fmt.Errorf("%w: plan row %d template digest malformed", ErrPlan, i)
		}
		key := strconv.Itoa(row.Variant) + "/" + strconv.Itoa(row.Question) + "/" + strconv.Itoa(row.Step)
		if _, dup := rowByKey[key]; dup {
			return report, fmt.Errorf("%w: duplicate plan row %s", ErrPlan, key)
		}
		variantStep := strconv.Itoa(row.Variant) + "/" + strconv.Itoa(row.Step)
		if prior, ok := templateByVariantStep[variantStep]; ok && prior != row.Template {
			return report, fmt.Errorf("%w: variant %d step %d changes template across questions", ErrPlan, row.Variant, row.Step)
		}
		templateByVariantStep[variantStep] = row.Template
		// Pinned input wiring: step 0 consumes the seeded question digest;
		// step s consumes exactly the recorded result of step s-1.
		if row.Step == 0 {
			q0, err := digestOf(map[string]any{"question": row.Question, "seed": man.Seed})
			if err != nil {
				return report, err
			}
			if len(row.Inputs) != 1 || row.Inputs[0] != q0 {
				return report, fmt.Errorf("%w: row %s step-0 input is not the seeded question", ErrWiring, key)
			}
		} else {
			parentKey := strconv.Itoa(row.Variant) + "/" + strconv.Itoa(row.Question) + "/" + strconv.Itoa(row.Step-1)
			parent, ok := rowByKey[parentKey]
			if !ok {
				return report, fmt.Errorf("%w: row %s precedes its parent in the plan", ErrWiring, key)
			}
			parentFact, ok := factByWork[parent.Work]
			if !ok {
				return report, fmt.Errorf("%w: row %s parent work unresolved", ErrWiring, key)
			}
			if len(row.Inputs) != 1 || row.Inputs[0] != parentFact.Result {
				return report, fmt.Errorf("%w: row %s input is not the parent's recorded result", ErrWiring, key)
			}
		}
		// RL4: the work digest is the pinned derivation, recomputed.
		work, err := digestOf(map[string]any{
			"inputs":   row.Inputs,
			"model":    man.Model,
			"template": row.Template,
		})
		if err != nil {
			return report, err
		}
		if row.Work != work {
			return report, fmt.Errorf("%w: row %s work digest is not the pinned derivation", ErrPlan, key)
		}
		fact, ok := factByWork[work]
		if !ok {
			return report, fmt.Errorf("%w: row %s resolves to no receipt — plan incomplete", ErrPlan, key)
		}
		naiveMicro += fact.InputTokens*man.Prices.InputMicroPerTok +
			fact.OutputTokens*man.Prices.OutputMicroPerTok
		usedWorks[work] = true
		rowByKey[key] = row
	}
	variantShapes := make(map[string]int, man.K)
	for variant := 0; variant < man.K; variant++ {
		templates := make([]string, man.L)
		for step := 0; step < man.L; step++ {
			template, ok := templateByVariantStep[strconv.Itoa(variant)+"/"+strconv.Itoa(step)]
			if !ok {
				return report, fmt.Errorf("%w: variant %d step %d has no template", ErrPlan, variant, step)
			}
			templates[step] = template
		}
		shape, err := digestOf(map[string]any{"templates": templates})
		if err != nil {
			return report, err
		}
		if prior, dup := variantShapes[shape]; dup {
			return report, fmt.Errorf("%w: variants %d and %d have identical template shapes", ErrPlan, prior, variant)
		}
		variantShapes[shape] = variant
	}
	// Every receipt must be demanded by the plan — no padding the journal.
	if len(usedWorks) != len(factByWork) {
		return report, fmt.Errorf(
			"%w: %d receipts but only %d demanded by the plan",
			ErrPlan, len(factByWork), len(usedWorks),
		)
	}
	report.Logical = len(planLines)
	report.NaiveSpendMicro = naiveMicro

	// RL5: the storm — at least one hard kill, attested.
	stormLines, err := readLines(filepath.Join(dir, "storm.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrFloor, err)
	}
	kills, _, err := verifyStorm(stormLines, map[string]bool{"worker": true}, false)
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrFloor, err)
	}
	report.Kills = kills

	// RL4 headline + floors.
	reuseMilli := (len(planLines) * 1000) / len(journalLines)
	report.ReuseMilli = reuseMilli
	if len(planLines) < floors.LogicalMin {
		return report, fmt.Errorf("%w: logical steps %d < %d", ErrFloor, len(planLines), floors.LogicalMin)
	}
	if reuseMilli < floors.ReuseMilli {
		return report, fmt.Errorf(
			"%w: reuse %d.%03dx < %d.%03dx",
			ErrFloor, reuseMilli/1000, reuseMilli%1000, floors.ReuseMilli/1000, floors.ReuseMilli%1000,
		)
	}
	if kills < floors.KillsMin {
		return report, fmt.Errorf("%w: kills %d < %d", ErrFloor, kills, floors.KillsMin)
	}
	return report, nil
}
