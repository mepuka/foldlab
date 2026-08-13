// COORDINATOR-OWNED — the R2 fitness function
// (docs/gauntlet/R2-verified-climb.md). Climbers build harnesses that
// produce bundles this accepts; they do not edit it.
package gauntlet

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"foldlab/canonical"
)

// ClimbFloors are R2's hardness minima. ReuseMilli is logical rows /
// physical receipts in thousandths. Gains are in dev/holdout question
// COUNTS, compared within the run's own record.
type ClimbFloors struct {
	LogicalMin     int
	ReuseMilli     int
	KillsMin       int
	WorkersMin     int
	GenerationsMin int
	PopulationMin  int
	StepsMin       int
	DevMin         int
	HoldoutMin     int
	DevGainMin     int
	HoldoutGainMin int
}

var R2 = ClimbFloors{
	LogicalMin:     3840,
	ReuseMilli:     3000,
	KillsMin:       1,
	WorkersMin:     4,
	GenerationsMin: 4,
	PopulationMin:  6,
	StepsMin:       4,
	DevMin:         40,
	HoldoutMin:     27,
	DevGainMin:     4,
	HoldoutGainMin: 1,
}

// R2CorpusSHA256 is the verifier-owned benchmark anchor from the ratified
// R2 contract. A bundle's manifest may repeat it, but cannot choose it.
const R2CorpusSHA256 = "8ce15a57d0d8a6b8bba1efb7f04ceeb64358a8d2e8227c6651d90af8c9fae5f2"

var (
	ErrScore     = errors.New("gauntlet: score refused (CL1)")
	ErrSelection = errors.New("gauntlet: selection refused (CL2/CL3)")
	ErrLineage   = errors.New("gauntlet: lineage refused (CL4)")
	ErrFleet     = errors.New("gauntlet: fleet economy refused (CL5)")
)

// ClimbReport is what a passing bundle proved, by recomputation. Spend
// figures are integer nano-USD; scores are correct-question counts.
type ClimbReport struct {
	Logical       int
	Physical      int
	ReuseMilli    int
	Kills         int
	Workers       int
	Generations   int
	Population    int
	Survivors     int
	Dev           int
	Holdout       int
	SeedDev       int
	FinalDev      int
	SeedHoldout   int
	WinnerHoldout int
	SpendNano     int64
	NaiveNano     int64
	Winner        string
	Head          string
	Model         string
}

type climbManifest struct {
	Caps struct {
		MaxCalls        int   `json:"max_calls"`
		MaxOutputTokens int   `json:"max_output_tokens"`
		MaxSpendNano    int64 `json:"max_spend_usd_nano"`
	} `json:"caps"`
	CorpusSHA256   string         `json:"corpus_sha256"`
	Generations    int            `json:"generations"`
	HoldoutPerTier map[string]int `json:"holdout_per_tier"`
	KPopulation    int            `json:"k_population"`
	KSurvivors     int            `json:"k_survivors"`
	L              int            `json:"l"`
	Model          string         `json:"model"`
	Prices         struct {
		InputNanoPerTok  int64 `json:"input_nano_per_token"`
		OutputNanoPerTok int64 `json:"output_nano_per_token"`
	} `json:"prices"`
	Seed          string `json:"seed"`
	SeedCandidate string `json:"seed_candidate"`
}

type corpusQuestion struct {
	Answer  string `json:"answer"`
	ID      string `json:"id"`
	Problem string `json:"problem"`
	Source  string `json:"source"`
}

type stepSpec struct {
	Model    string          `json:"model"`
	Params   json.RawMessage `json:"params"`
	Template string          `json:"template"`
}

type candidateRow struct {
	Digest string     `json:"digest"`
	Steps  []stepSpec `json:"steps"`
}

type climbReceipt struct {
	Digest       string `json:"digest"`
	InputTokens  int64  `json:"input_tokens"`
	Kind         string `json:"kind"`
	Model        string `json:"model"`
	OutputTokens int64  `json:"output_tokens"`
	Result       string `json:"result"`
	Stop         string `json:"stop"`
}

type mutationFact struct {
	Child  string `json:"child"`
	Kind   string `json:"kind"`
	Parent string `json:"parent"`
	Via    string `json:"via"`
}

type selectionFact struct {
	Generation int      `json:"generation"`
	Kind       string   `json:"kind"`
	Survivors  []string `json:"survivors"`
}

type climbPlanRow struct {
	Candidate  string   `json:"candidate"`
	Generation int      `json:"generation"`
	Inputs     []string `json:"inputs"`
	Question   string   `json:"question"`
	Split      string   `json:"split"`
	Step       int      `json:"step"`
	Work       string   `json:"work"`
}

// climbNormalize is the frozen dumb acceptor: trim; strip $ and commas;
// drop one trailing period; a bare integer wins, else the LAST integer
// token in the text, else empty.
var (
	climbBareInt = regexp.MustCompile(`^-?\d+$`)
	climbAnyInt  = regexp.MustCompile(`-?\d+`)
)

func climbNormalize(text string) string {
	s := strings.TrimSpace(text)
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, ",", "")
	s = strings.TrimSuffix(strings.TrimSpace(s), ".")
	s = strings.TrimSpace(s)
	if climbBareInt.MatchString(s) {
		return s
	}
	all := climbAnyInt.FindAllString(s, -1)
	if len(all) == 0 {
		return ""
	}
	return all[len(all)-1]
}

// VerifyClimb checks an R2 bundle against RL1-RL7 and CL1-CL5 at the
// given floors.
func VerifyClimb(dir string, floors ClimbFloors) (ClimbReport, error) {
	return verifyClimbAgainstCorpus(dir, floors, R2CorpusSHA256)
}

func verifyClimbAgainstCorpus(dir string, floors ClimbFloors, corpusSHA256 string) (ClimbReport, error) {
	var report ClimbReport

	var man climbManifest
	if err := readCanonicalJSON(filepath.Join(dir, "manifest.json"), &man); err != nil {
		return report, fmt.Errorf("%w: %v", ErrManifest, err)
	}
	if man.Model == "" || man.Seed == "" || !hex64.MatchString(man.SeedCandidate) ||
		!hex64.MatchString(man.CorpusSHA256) {
		return report, fmt.Errorf("%w: model/seed/seed_candidate/corpus_sha256 must be set", ErrManifest)
	}
	if !hex64.MatchString(corpusSHA256) {
		return report, fmt.Errorf("%w: verifier corpus pin is malformed", ErrManifest)
	}
	if man.CorpusSHA256 != corpusSHA256 {
		return report, fmt.Errorf("%w: manifest corpus digest does not match verifier pin", ErrManifest)
	}
	if man.Prices.InputNanoPerTok < 0 || man.Prices.OutputNanoPerTok < 0 ||
		man.Caps.MaxCalls < 1 || man.Caps.MaxOutputTokens < 1 || man.Caps.MaxSpendNano < 1 {
		return report, fmt.Errorf("%w: prices and caps must be positive", ErrManifest)
	}
	if man.Generations < floors.GenerationsMin {
		return report, fmt.Errorf("%w: generations %d < %d", ErrFloor, man.Generations, floors.GenerationsMin)
	}
	if man.KPopulation < floors.PopulationMin {
		return report, fmt.Errorf("%w: population %d < %d", ErrFloor, man.KPopulation, floors.PopulationMin)
	}
	if man.KSurvivors < 2 || man.KSurvivors >= man.KPopulation {
		return report, fmt.Errorf("%w: k_survivors %d out of [2, k_population)", ErrManifest, man.KSurvivors)
	}
	if man.L < floors.StepsMin {
		return report, fmt.Errorf("%w: pipeline steps %d < %d", ErrFloor, man.L, floors.StepsMin)
	}
	report.Model = man.Model
	report.Generations = man.Generations
	report.Population = man.KPopulation
	report.Survivors = man.KSurvivors

	// The corpus is pinned by digest, never by trust.
	corpusRaw, err := os.ReadFile(filepath.Join(dir, "corpus.json"))
	if err != nil {
		return report, fmt.Errorf("%w: corpus: %v", ErrManifest, err)
	}
	sum := sha256.Sum256(corpusRaw)
	if hex.EncodeToString(sum[:]) != corpusSHA256 {
		return report, fmt.Errorf("%w: corpus digest mismatch", ErrManifest)
	}
	var corpus []corpusQuestion
	if err := json.Unmarshal(corpusRaw, &corpus); err != nil {
		return report, fmt.Errorf("%w: corpus: %v", ErrManifest, err)
	}
	answers := make(map[string]string, len(corpus))
	tiers := make(map[string][]string)
	for _, q := range corpus {
		if q.ID == "" || q.Source == "" {
			return report, fmt.Errorf("%w: corpus question missing id/source", ErrManifest)
		}
		if _, dup := answers[q.ID]; dup {
			return report, fmt.Errorf("%w: duplicate corpus id %s", ErrManifest, q.ID)
		}
		answers[q.ID] = q.Answer
		tiers[q.Source] = append(tiers[q.Source], q.ID)
	}

	// The split is DERIVED, never chosen: per tier, order ids by
	// H({id, seed}); the first holdout_per_tier[source] are holdout.
	holdoutSet := make(map[string]bool)
	for source, ids := range tiers {
		n, ok := man.HoldoutPerTier[source]
		if !ok {
			return report, fmt.Errorf("%w: tier %q missing from holdout_per_tier", ErrManifest, source)
		}
		if n < 1 || n >= len(ids) {
			return report, fmt.Errorf("%w: holdout_per_tier[%s]=%d out of range", ErrManifest, source, n)
		}
		type ranked struct{ key, id string }
		rankedIDs := make([]ranked, 0, len(ids))
		for _, id := range ids {
			key, err := digestOf(map[string]any{"id": id, "seed": man.Seed})
			if err != nil {
				return report, err
			}
			rankedIDs = append(rankedIDs, ranked{key, id})
		}
		sort.Slice(rankedIDs, func(i, j int) bool { return rankedIDs[i].key < rankedIDs[j].key })
		for i := 0; i < n; i++ {
			holdoutSet[rankedIDs[i].id] = true
		}
	}
	if len(man.HoldoutPerTier) != len(tiers) {
		return report, fmt.Errorf("%w: holdout_per_tier names unknown tiers", ErrManifest)
	}
	devCount := len(corpus) - len(holdoutSet)
	if devCount < floors.DevMin {
		return report, fmt.Errorf("%w: dev questions %d < %d", ErrFloor, devCount, floors.DevMin)
	}
	if len(holdoutSet) < floors.HoldoutMin {
		return report, fmt.Errorf("%w: holdout questions %d < %d", ErrFloor, len(holdoutSet), floors.HoldoutMin)
	}
	report.Dev = devCount
	report.Holdout = len(holdoutSet)

	// Candidates: full specs bundled; digests recomputed; all steps on
	// the manifest model; params must be canonical bytes (opaque —
	// hashed, never interpreted).
	candLines, err := readLines(filepath.Join(dir, "candidates.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: candidates: %v", ErrLineage, err)
	}
	stepDigests := make(map[string][]string, len(candLines))
	for i, line := range candLines {
		if !isCanonical(line) {
			return report, fmt.Errorf("%w: candidate row %d not canonical", ErrLineage, i)
		}
		var row candidateRow
		if err := strictDecode(line, &row); err != nil {
			return report, fmt.Errorf("%w: candidate row %d: %v", ErrLineage, i, err)
		}
		if len(row.Steps) != man.L {
			return report, fmt.Errorf("%w: candidate row %d has %d steps, want %d", ErrLineage, i, len(row.Steps), man.L)
		}
		digests := make([]string, man.L)
		for s, step := range row.Steps {
			if step.Model != man.Model {
				return report, fmt.Errorf("%w: candidate row %d step %d model %q != manifest", ErrLineage, i, s, step.Model)
			}
			if step.Template == "" {
				return report, fmt.Errorf("%w: candidate row %d step %d empty template", ErrLineage, i, s)
			}
			if len(step.Params) == 0 || !isCanonical(step.Params) {
				return report, fmt.Errorf("%w: candidate row %d step %d params not canonical", ErrLineage, i, s)
			}
			d, err := digestOf(step)
			if err != nil {
				return report, err
			}
			digests[s] = d
		}
		recomputed, err := digestOf(map[string]any{"steps": row.Steps})
		if err != nil {
			return report, err
		}
		if row.Digest != recomputed {
			return report, fmt.Errorf("%w: candidate row %d digest is not the pinned derivation", ErrLineage, i)
		}
		if _, dup := stepDigests[row.Digest]; dup {
			return report, fmt.Errorf("%w: duplicate candidate %s", ErrLineage, row.Digest)
		}
		stepDigests[row.Digest] = digests
	}
	if _, ok := stepDigests[man.SeedCandidate]; !ok {
		return report, fmt.Errorf("%w: seed candidate not among candidates", ErrLineage)
	}

	// RL1 + typed facts: one chained journal of receipts, mutations,
	// and selections.
	journalLines, err := readLines(filepath.Join(dir, "journal.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrChain, err)
	}
	head, err := walkChain(journalLines)
	if err != nil {
		return report, err
	}
	report.Head = head

	factByWork := make(map[string]climbReceipt)
	receiptPos := make(map[string]int)
	mutationByChild := make(map[string]mutationFact)
	mutationVia := make(map[string]bool)
	var selections []selectionFact
	var selectionPos []int
	var spendNano int64
	for i, line := range journalLines {
		var wire wireEntry
		if err := strictDecode(line, &wire); err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrChain, i, err)
		}
		payload := []byte(wire.Payload)
		if !isCanonical(payload) {
			return report, fmt.Errorf("%w: entry %d payload not canonical", ErrSemantics, i)
		}
		var peek struct {
			Kind string `json:"kind"`
		}
		if err := json.Unmarshal(payload, &peek); err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrSemantics, i, err)
		}
		switch peek.Kind {
		case "receipt":
			var fact climbReceipt
			if err := strictDecode(payload, &fact); err != nil {
				return report, fmt.Errorf("%w: entry %d: %v", ErrSemantics, i, err)
			}
			if !hex64.MatchString(fact.Digest) || !hex64.MatchString(fact.Result) {
				return report, fmt.Errorf("%w: entry %d digests malformed", ErrSemantics, i)
			}
			if _, dup := factByWork[fact.Digest]; dup {
				return report, fmt.Errorf("%w: work digest bought twice at entry %d (%s)", ErrReceipts, i, fact.Digest)
			}
			if fact.Model != man.Model {
				return report, fmt.Errorf("%w: entry %d model %q != manifest %q", ErrReceipts, i, fact.Model, man.Model)
			}
			if fact.InputTokens < 0 || fact.OutputTokens < 0 {
				return report, fmt.Errorf("%w: entry %d negative token counts", ErrReceipts, i)
			}
			if fact.OutputTokens > int64(man.Caps.MaxOutputTokens) {
				return report, fmt.Errorf("%w: entry %d output tokens %d exceed cap %d",
					ErrReceipts, i, fact.OutputTokens, man.Caps.MaxOutputTokens)
			}
			spendNano += fact.InputTokens*man.Prices.InputNanoPerTok +
				fact.OutputTokens*man.Prices.OutputNanoPerTok
			factByWork[fact.Digest] = fact
			receiptPos[fact.Digest] = i
		case "mutation":
			var fact mutationFact
			if err := strictDecode(payload, &fact); err != nil {
				return report, fmt.Errorf("%w: entry %d: %v", ErrSemantics, i, err)
			}
			if !hex64.MatchString(fact.Child) || !hex64.MatchString(fact.Parent) {
				return report, fmt.Errorf("%w: entry %d mutation digests malformed", ErrLineage, i)
			}
			if fact.Child == man.SeedCandidate {
				return report, fmt.Errorf("%w: entry %d mutates INTO the seed", ErrLineage, i)
			}
			if _, dup := mutationByChild[fact.Child]; dup {
				return report, fmt.Errorf("%w: entry %d second mutation for child %s", ErrLineage, i, fact.Child)
			}
			if _, ok := stepDigests[fact.Child]; !ok {
				return report, fmt.Errorf("%w: entry %d mutation child unknown", ErrLineage, i)
			}
			if _, ok := stepDigests[fact.Parent]; !ok {
				return report, fmt.Errorf("%w: entry %d mutation parent unknown", ErrLineage, i)
			}
			if fact.Via == "" {
				return report, fmt.Errorf("%w: entry %d mutation missing via", ErrLineage, i)
			}
			if hex64.MatchString(fact.Via) {
				mutationVia[fact.Via] = true
			}
			mutationByChild[fact.Child] = fact
		case "selection":
			var fact selectionFact
			if err := strictDecode(payload, &fact); err != nil {
				return report, fmt.Errorf("%w: entry %d: %v", ErrSemantics, i, err)
			}
			if fact.Generation != len(selections) {
				return report, fmt.Errorf("%w: entry %d selection generation %d out of order", ErrSelection, i, fact.Generation)
			}
			wantLen := man.KSurvivors
			if fact.Generation == 0 {
				wantLen = 1
			}
			if len(fact.Survivors) != wantLen {
				return report, fmt.Errorf("%w: entry %d selection has %d survivors, want %d",
					ErrSelection, i, len(fact.Survivors), wantLen)
			}
			for _, s := range fact.Survivors {
				if _, ok := stepDigests[s]; !ok {
					return report, fmt.Errorf("%w: entry %d survivor unknown", ErrSelection, i)
				}
			}
			selections = append(selections, fact)
			selectionPos = append(selectionPos, i)
		default:
			return report, fmt.Errorf("%w: entry %d unknown kind %q", ErrSemantics, i, peek.Kind)
		}
	}
	if len(factByWork) > man.Caps.MaxCalls {
		return report, fmt.Errorf("%w: %d physical calls exceed max_calls %d", ErrReceipts, len(factByWork), man.Caps.MaxCalls)
	}
	if spendNano > man.Caps.MaxSpendNano {
		return report, fmt.Errorf("%w: spend %d nano-usd exceeds cap %d", ErrReceipts, spendNano, man.Caps.MaxSpendNano)
	}
	if len(selections) != man.Generations+1 {
		return report, fmt.Errorf("%w: %d selection facts for %d generations", ErrSelection, len(selections), man.Generations)
	}
	if len(selections[0].Survivors) != 1 || selections[0].Survivors[0] != man.SeedCandidate {
		return report, fmt.Errorf("%w: generation 0 must select exactly the seed", ErrSelection)
	}
	finalSelPos := selectionPos[len(selectionPos)-1]
	winner := selections[len(selections)-1].Survivors[0]
	report.Physical = len(factByWork)
	report.SpendNano = spendNano
	report.Winner = winner

	// CL4: every non-seed candidate has recorded provenance reaching
	// the seed, acyclically.
	for cand := range stepDigests {
		if cand == man.SeedCandidate {
			continue
		}
		visited := map[string]bool{cand: true}
		cur := cand
		for cur != man.SeedCandidate {
			m, ok := mutationByChild[cur]
			if !ok {
				return report, fmt.Errorf("%w: candidate %s has no mutation fact", ErrLineage, cur)
			}
			if visited[m.Parent] {
				return report, fmt.Errorf("%w: mutation cycle at %s", ErrLineage, cur)
			}
			visited[m.Parent] = true
			cur = m.Parent
		}
	}
	for via := range mutationVia {
		if _, ok := factByWork[via]; !ok {
			return report, fmt.Errorf("%w: mutation via receipt %s unresolved", ErrLineage, via)
		}
	}

	// The plan: every logical step, wiring enforced, work digests
	// recomputed, receipts resolved, split membership derived.
	planLines, err := readLines(filepath.Join(dir, "plan.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrPlan, err)
	}
	type rowKey struct {
		cand     string
		gen      int
		question string
		step     int
	}
	rowByKey := make(map[rowKey]climbPlanRow, len(planLines))
	devMembers := make([]map[string]bool, man.Generations+1)
	devRowsPerCand := make([]map[string]int, man.Generations+1)
	for g := range devMembers {
		devMembers[g] = make(map[string]bool)
		devRowsPerCand[g] = make(map[string]int)
	}
	holdoutRowsPerCand := make(map[string]int)
	usedWorks := make(map[string]bool)
	var naiveNano int64
	for i, line := range planLines {
		if !isCanonical(line) {
			return report, fmt.Errorf("%w: plan row %d not canonical", ErrPlan, i)
		}
		var row climbPlanRow
		if err := strictDecode(line, &row); err != nil {
			return report, fmt.Errorf("%w: plan row %d: %v", ErrPlan, i, err)
		}
		if _, ok := stepDigests[row.Candidate]; !ok {
			return report, fmt.Errorf("%w: plan row %d unknown candidate", ErrPlan, i)
		}
		if _, ok := answers[row.Question]; !ok {
			return report, fmt.Errorf("%w: plan row %d unknown question %q", ErrPlan, i, row.Question)
		}
		if row.Step < 0 || row.Step >= man.L {
			return report, fmt.Errorf("%w: plan row %d step out of range", ErrPlan, i)
		}
		if row.Generation < 0 || row.Generation > man.Generations {
			return report, fmt.Errorf("%w: plan row %d generation out of range", ErrPlan, i)
		}
		isHoldout := holdoutSet[row.Question]
		switch row.Split {
		case "dev":
			if isHoldout {
				return report, fmt.Errorf("%w: plan row %d claims dev for a derived-holdout question", ErrPlan, i)
			}
		case "holdout":
			if !isHoldout {
				return report, fmt.Errorf("%w: plan row %d claims holdout for a derived-dev question", ErrPlan, i)
			}
			if row.Generation != man.Generations {
				return report, fmt.Errorf("%w: plan row %d holdout outside the final generation", ErrSelection, i)
			}
		default:
			return report, fmt.Errorf("%w: plan row %d unknown split %q", ErrPlan, i, row.Split)
		}
		key := rowKey{row.Candidate, row.Generation, row.Question, row.Step}
		if _, dup := rowByKey[key]; dup {
			return report, fmt.Errorf("%w: duplicate plan row %v", ErrPlan, key)
		}
		// Pinned wiring, as R1: step 0 consumes the seeded question;
		// step s consumes exactly the parent's recorded result.
		if row.Step == 0 {
			q0, err := digestOf(map[string]any{"question": row.Question, "seed": man.Seed})
			if err != nil {
				return report, err
			}
			if len(row.Inputs) != 1 || row.Inputs[0] != q0 {
				return report, fmt.Errorf("%w: row %v step-0 input is not the seeded question", ErrWiring, key)
			}
		} else {
			parent, ok := rowByKey[rowKey{row.Candidate, row.Generation, row.Question, row.Step - 1}]
			if !ok {
				return report, fmt.Errorf("%w: row %v precedes its parent in the plan", ErrWiring, key)
			}
			parentFact, ok := factByWork[parent.Work]
			if !ok {
				return report, fmt.Errorf("%w: row %v parent work unresolved", ErrWiring, key)
			}
			if len(row.Inputs) != 1 || row.Inputs[0] != parentFact.Result {
				return report, fmt.Errorf("%w: row %v input is not the parent's recorded result", ErrWiring, key)
			}
		}
		work, err := digestOf(map[string]any{
			"inputs": row.Inputs,
			"step":   stepDigests[row.Candidate][row.Step],
		})
		if err != nil {
			return report, err
		}
		if row.Work != work {
			return report, fmt.Errorf("%w: row %v work digest is not the pinned derivation", ErrPlan, key)
		}
		fact, ok := factByWork[work]
		if !ok {
			return report, fmt.Errorf("%w: row %v resolves to no receipt", ErrPlan, key)
		}
		// CL3: holdout work is bought only after the final selection.
		if row.Split == "holdout" && receiptPos[work] < finalSelPos {
			return report, fmt.Errorf("%w: row %v holdout receipt precedes the final selection", ErrSelection, key)
		}
		naiveNano += fact.InputTokens*man.Prices.InputNanoPerTok +
			fact.OutputTokens*man.Prices.OutputNanoPerTok
		usedWorks[work] = true
		rowByKey[key] = row
		if row.Split == "dev" {
			devMembers[row.Generation][row.Candidate] = true
			devRowsPerCand[row.Generation][row.Candidate]++
		} else {
			holdoutRowsPerCand[row.Candidate]++
		}
	}
	// Every receipt demanded by the plan or by a mutation.
	for work := range factByWork {
		if !usedWorks[work] && !mutationVia[work] {
			return report, fmt.Errorf("%w: receipt %s demanded by nothing", ErrPlan, work)
		}
	}
	report.Logical = len(planLines)
	report.NaiveNano = naiveNano

	// Population laws: gen 0 is the seed alone; every later generation is
	// exactly k_population candidates, each a prior survivor or a
	// mutation child of one, with all prior survivors carried, and
	// every member fully evaluated on dev.
	if len(devMembers[0]) != 1 || !devMembers[0][man.SeedCandidate] {
		return report, fmt.Errorf("%w: generation 0 population must be the seed alone", ErrSelection)
	}
	for g := 1; g <= man.Generations; g++ {
		pop := devMembers[g]
		if len(pop) != man.KPopulation {
			return report, fmt.Errorf("%w: generation %d population %d != k_population %d",
				ErrSelection, g, len(pop), man.KPopulation)
		}
		prev := make(map[string]bool, len(selections[g-1].Survivors))
		for _, s := range selections[g-1].Survivors {
			prev[s] = true
			if !pop[s] {
				return report, fmt.Errorf("%w: generation %d drops survivor %s", ErrSelection, g, s)
			}
		}
		for cand := range pop {
			if prev[cand] {
				continue
			}
			m, ok := mutationByChild[cand]
			if !ok || !prev[m.Parent] {
				return report, fmt.Errorf("%w: generation %d member %s is neither survivor nor child of one",
					ErrSelection, g, cand)
			}
		}
	}
	for g := 0; g <= man.Generations; g++ {
		for cand, rows := range devRowsPerCand[g] {
			if rows != devCount*man.L {
				return report, fmt.Errorf("%w: generation %d candidate %s has %d dev rows, want %d",
					ErrPlan, g, cand, rows, devCount*man.L)
			}
		}
	}
	// Holdout: exactly {seed, winner}, each complete.
	if len(holdoutRowsPerCand) != 2 || holdoutRowsPerCand[man.SeedCandidate] == 0 || holdoutRowsPerCand[winner] == 0 {
		return report, fmt.Errorf("%w: holdout must evaluate exactly the seed and the winner", ErrSelection)
	}
	for cand, rows := range holdoutRowsPerCand {
		if rows != len(holdoutSet)*man.L {
			return report, fmt.Errorf("%w: candidate %s has %d holdout rows, want %d",
				ErrPlan, cand, rows, len(holdoutSet)*man.L)
		}
	}

	// CL1: scores recomputed from bundled final-step outputs, bound to
	// the chain by result digest, under the frozen normalizer.
	scoreCache := make(map[string]int)
	scoreOn := func(cand string, gen int, split string, ids map[string]bool) (int, error) {
		cacheKey := cand + "/" + split + "/" + strconv.Itoa(gen)
		if s, ok := scoreCache[cacheKey]; ok {
			return s, nil
		}
		correct := 0
		for id := range ids {
			row, ok := rowByKey[rowKey{cand, gen, id, man.L - 1}]
			if !ok {
				return 0, fmt.Errorf("%w: candidate %s missing final step for %s", ErrScore, cand, id)
			}
			data, err := os.ReadFile(filepath.Join(dir, "outputs", row.Work+".txt"))
			if err != nil {
				return 0, fmt.Errorf("%w: output for %s missing: %v", ErrScore, row.Work, err)
			}
			// The receipt's result is the digest of the raw output
			// bytes — the text is bound to the chain, not trusted.
			if canonical.DigestHex(data) != factByWork[row.Work].Result {
				return 0, fmt.Errorf("%w: output for %s does not match its receipt", ErrScore, row.Work)
			}
			if climbNormalize(string(data)) == answers[id] {
				correct++
			}
		}
		scoreCache[cacheKey] = correct
		return correct, nil
	}
	devIDs := make(map[string]bool, devCount)
	for _, q := range corpus {
		if !holdoutSet[q.ID] {
			devIDs[q.ID] = true
		}
	}

	// CL2: each generation's recorded survivors are exactly the top-k
	// by (score desc, digest asc), in rank order.
	for g := 1; g <= man.Generations; g++ {
		type scored struct {
			cand  string
			score int
		}
		var ranking []scored
		for cand := range devMembers[g] {
			s, err := scoreOn(cand, g, "dev", devIDs)
			if err != nil {
				return report, err
			}
			ranking = append(ranking, scored{cand, s})
		}
		sort.Slice(ranking, func(i, j int) bool {
			if ranking[i].score != ranking[j].score {
				return ranking[i].score > ranking[j].score
			}
			return ranking[i].cand < ranking[j].cand
		})
		for i, want := range selections[g].Survivors {
			if ranking[i].cand != want {
				return report, fmt.Errorf(
					"%w: generation %d survivor %d is %s, recomputed top-k says %s",
					ErrSelection, g, i, want, ranking[i].cand)
			}
		}
	}

	holdoutIDs := make(map[string]bool, len(holdoutSet))
	for id := range holdoutSet {
		holdoutIDs[id] = true
	}
	seedDev, err := scoreOn(man.SeedCandidate, 0, "dev", devIDs)
	if err != nil {
		return report, err
	}
	finalDev, err := scoreOn(winner, man.Generations, "dev", devIDs)
	if err != nil {
		return report, err
	}
	seedHoldout, err := scoreOn(man.SeedCandidate, man.Generations, "holdout", holdoutIDs)
	if err != nil {
		return report, err
	}
	winnerHoldout, err := scoreOn(winner, man.Generations, "holdout", holdoutIDs)
	if err != nil {
		return report, err
	}
	report.SeedDev = seedDev
	report.FinalDev = finalDev
	report.SeedHoldout = seedHoldout
	report.WinnerHoldout = winnerHoldout

	// CL5: the fleet — one claim per receipt, enough distinct workers.
	ledgerLines, err := readLines(filepath.Join(dir, "ledger.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrFleet, err)
	}
	claimed := make(map[string]bool, len(ledgerLines))
	owners := make(map[string]bool)
	nonces := make(map[string]bool, len(ledgerLines))
	ownerByDigestFence := make(map[string]string, len(ledgerLines))
	for n, line := range ledgerLines {
		if !isCanonical(line) {
			return report, fmt.Errorf("%w: ledger line %d is not canonical", ErrFleet, n)
		}
		var claim ledgerLine
		if err := strictDecode(line, &claim); err != nil {
			return report, fmt.Errorf("%w: ledger line %d: %v", ErrFleet, n, err)
		}
		if !hex64.MatchString(claim.Digest) || !validOwner.MatchString(claim.Owner) ||
			claim.At <= 0 || claim.Fence < 1 || claim.Nonce == "" || nonces[claim.Nonce] {
			return report, fmt.Errorf("%w: ledger line %d malformed", ErrFleet, n)
		}
		nonces[claim.Nonce] = true
		if _, ok := factByWork[claim.Digest]; !ok {
			return report, fmt.Errorf("%w: ledger line %d claims unknown work", ErrFleet, n)
		}
		if claimed[claim.Digest] {
			return report, fmt.Errorf("%w: ledger line %d second claim for %s", ErrFleet, n, claim.Digest)
		}
		key := claim.Digest + "/" + strconv.FormatUint(claim.Fence, 10)
		if prior, ok := ownerByDigestFence[key]; ok && prior != claim.Owner {
			return report, fmt.Errorf("%w: ledger line %d shares (digest,fence) across owners", ErrFleet, n)
		}
		ownerByDigestFence[key] = claim.Owner
		claimed[claim.Digest] = true
		owners[claim.Owner] = true
	}
	if len(claimed) != len(factByWork) {
		return report, fmt.Errorf("%w: %d claims for %d receipts", ErrFleet, len(claimed), len(factByWork))
	}
	if len(owners) < floors.WorkersMin {
		return report, fmt.Errorf("%w: %d workers < %d", ErrFleet, len(owners), floors.WorkersMin)
	}
	report.Workers = len(owners)

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

	// The headline, recomputed; then the floors.
	reuseMilli := (len(planLines) * 1000) / len(factByWork)
	report.ReuseMilli = reuseMilli
	if len(planLines) < floors.LogicalMin {
		return report, fmt.Errorf("%w: logical steps %d < %d", ErrFloor, len(planLines), floors.LogicalMin)
	}
	if reuseMilli < floors.ReuseMilli {
		return report, fmt.Errorf("%w: reuse %d.%03dx < %d.%03dx",
			ErrFloor, reuseMilli/1000, reuseMilli%1000, floors.ReuseMilli/1000, floors.ReuseMilli%1000)
	}
	if kills < floors.KillsMin {
		return report, fmt.Errorf("%w: kills %d < %d", ErrFloor, kills, floors.KillsMin)
	}
	if finalDev < seedDev+floors.DevGainMin {
		return report, fmt.Errorf("%w: final dev %d < seed dev %d + %d",
			ErrFloor, finalDev, seedDev, floors.DevGainMin)
	}
	if winnerHoldout < seedHoldout+floors.HoldoutGainMin {
		return report, fmt.Errorf("%w: winner holdout %d < seed holdout %d + %d",
			ErrFloor, winnerHoldout, seedHoldout, floors.HoldoutGainMin)
	}
	return report, nil
}
