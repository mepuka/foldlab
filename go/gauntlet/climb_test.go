// COORDINATOR-OWNED — self-test for the R2 verifier: a synthetic valid
// bundle passes; each tamper class refuses with its named law; the R2
// floors are pinned to the spec's numbers.
package gauntlet

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"foldlab/canonical"
)

// Small but honest shape: corpus of 6 questions in two tiers (A: 4,
// B: 2), holdout 1 per tier (=> dev 4, holdout 2), L=2 steps,
// population 3, survivors 2, generations 2. Scores are designed so
// seed=1/4 dev, c1=3/4, c2=2/4, c3=4/4: gen-1 survivors [c1 c2],
// gen-2 survivors [c3 c1], winner c3; holdout seed 0/2, winner 1/2.
var climbTestFloors = ClimbFloors{
	LogicalMin:     64,
	ReuseMilli:     1500,
	KillsMin:       1,
	WorkersMin:     2,
	GenerationsMin: 2,
	PopulationMin:  3,
	StepsMin:       2,
	DevMin:         4,
	HoldoutMin:     2,
	DevGainMin:     1,
	HoldoutGainMin: 1,
}

const climbSeed = "r2-self-test"

type climbFixture struct {
	dir      string
	seed     string // candidate digests
	c1, c2   string
	c3       string
	devIDs   []string
	holdIDs  []string
	journal  []string // canonical payloads in order (pre-chain)
	planRows []string
}

func climbStep(t *testing.T, template string) map[string]any {
	t.Helper()
	return map[string]any{
		"model":    "claude-haiku-4-5-20251001",
		"params":   json.RawMessage(`{"max_tokens":100}`),
		"template": template,
	}
}

func climbCandidate(t *testing.T, finalTemplate string) (string, []map[string]any) {
	t.Helper()
	steps := []map[string]any{climbStep(t, "solve"), climbStep(t, finalTemplate)}
	digest := mustDigest(t, map[string]any{"steps": steps})
	return digest, steps
}

// buildClimbBundle fabricates a fully consistent bundle. It returns the
// fixture so tamper tests can rewrite parts surgically.
func buildClimbBundle(t *testing.T) climbFixture {
	t.Helper()
	dir := t.TempDir()
	model := "claude-haiku-4-5-20251001"

	// Corpus: answers are the id suffix; scores are steered by making a
	// candidate's final output equal or differ from the answer.
	type cq struct{ id, source, answer string }
	corpus := []cq{
		{"A-1", "A", "11"}, {"A-2", "A", "12"}, {"A-3", "A", "13"}, {"A-4", "A", "14"},
		{"B-1", "B", "21"}, {"B-2", "B", "22"},
	}
	var corpusRows []map[string]any
	for _, q := range corpus {
		corpusRows = append(corpusRows, map[string]any{
			"answer": q.answer, "id": q.id, "problem": "p-" + q.id, "source": q.source,
		})
	}
	corpusBytes, err := json.Marshal(corpusRows)
	if err != nil {
		t.Fatal(err)
	}
	writeFile(t, dir, "corpus.json", string(corpusBytes))
	corpusSHA := canonical.DigestHex(corpusBytes)

	// Derive the split exactly as the verifier does.
	holdout := map[string]bool{}
	for _, tier := range []string{"A", "B"} {
		type ranked struct{ key, id string }
		var ids []ranked
		for _, q := range corpus {
			if q.source == tier {
				ids = append(ids, ranked{mustDigest(t, map[string]any{"id": q.id, "seed": climbSeed}), q.id})
			}
		}
		sort.Slice(ids, func(i, j int) bool { return ids[i].key < ids[j].key })
		holdout[ids[0].id] = true
	}
	var devIDs, holdIDs []string
	for _, q := range corpus {
		if holdout[q.id] {
			holdIDs = append(holdIDs, q.id)
		} else {
			devIDs = append(devIDs, q.id)
		}
	}

	// Candidates: seed and three mutants differing at the final step.
	seedD, seedSteps := climbCandidate(t, "answer-v0")
	c1D, c1Steps := climbCandidate(t, "answer-v1")
	c2D, c2Steps := climbCandidate(t, "answer-v2")
	c3D, c3Steps := climbCandidate(t, "answer-v3")
	var candLines []string
	for _, c := range []struct {
		d     string
		steps []map[string]any
	}{{seedD, seedSteps}, {c1D, c1Steps}, {c2D, c2Steps}, {c3D, c3Steps}} {
		candLines = append(candLines, string(mustCanonical(t, map[string]any{
			"digest": c.d, "steps": c.steps,
		})))
	}
	writeFile(t, dir, "candidates.ndjson", strings.Join(candLines, "\n")+"\n")

	// devCorrect steers the scores; holdout likewise.
	devCorrect := map[string]int{seedD: 1, c1D: 3, c2D: 2, c3D: 4}
	holdCorrect := map[string]int{seedD: 0, c3D: 1}
	answers := map[string]string{}
	for _, q := range corpus {
		answers[q.id] = q.answer
	}
	stepDigest := func(steps []map[string]any, s int) string {
		return mustDigest(t, steps[s])
	}
	candSteps := map[string][]map[string]any{seedD: seedSteps, c1D: c1Steps, c2D: c2Steps, c3D: c3Steps}

	outputsDir := filepath.Join(dir, "outputs")
	if err := os.MkdirAll(outputsDir, 0o755); err != nil {
		t.Fatal(err)
	}

	var payloads []string
	receiptSeen := map[string]bool{}
	results := map[string]string{}
	emitReceipt := func(work, text string) {
		if receiptSeen[work] {
			return
		}
		receiptSeen[work] = true
		result := canonical.DigestHex([]byte(text))
		results[work] = result
		if err := os.WriteFile(filepath.Join(outputsDir, work+".txt"), []byte(text), 0o644); err != nil {
			t.Fatal(err)
		}
		payloads = append(payloads, string(mustCanonical(t, map[string]any{
			"digest": work, "input_tokens": 100, "kind": "receipt", "model": model,
			"output_tokens": 40, "result": result, "stop": "end_turn",
		})))
	}

	var planRows []string
	// evaluate emits plan rows (and receipts for unseen work) for one
	// candidate over one question set in one generation.
	evaluate := func(cand string, gen int, split string, ids []string, correctBudget int) {
		correctLeft := correctBudget
		sortedIDs := append([]string(nil), ids...)
		sort.Strings(sortedIDs)
		for _, id := range sortedIDs {
			prevResult := ""
			var prevWork string
			for s := 0; s < 2; s++ {
				var inputs []string
				if s == 0 {
					inputs = []string{mustDigest(t, map[string]any{"question": id, "seed": climbSeed})}
				} else {
					inputs = []string{results[prevWork]}
				}
				_ = prevResult
				work := mustDigest(t, map[string]any{
					"inputs": inputs, "step": stepDigest(candSteps[cand], s),
				})
				var text string
				if s == 1 {
					if correctLeft > 0 {
						text = "ANSWER: " + answers[id]
						correctLeft--
					} else {
						text = "ANSWER: 999999"
					}
				} else {
					text = "working for " + cand[:8] + "/" + id
				}
				emitReceipt(work, text)
				planRows = append(planRows, string(mustCanonical(t, map[string]any{
					"candidate": cand, "generation": gen, "inputs": inputs,
					"question": id, "split": split, "step": s, "work": work,
				})))
				prevWork = work
			}
		}
	}

	selection := func(gen int, survivors []string) {
		payloads = append(payloads, string(mustCanonical(t, map[string]any{
			"generation": gen, "kind": "selection", "survivors": survivors,
		})))
	}
	mutation := func(parent, child string) {
		payloads = append(payloads, string(mustCanonical(t, map[string]any{
			"child": child, "kind": "mutation", "parent": parent, "via": "move:rephrase",
		})))
	}

	// Generation 0: seed alone on dev, then its trivial selection.
	evaluate(seedD, 0, "dev", devIDs, devCorrect[seedD])
	selection(0, []string{seedD})
	// Generation 1: mutations recorded, population {seed, c1, c2}.
	mutation(seedD, c1D)
	mutation(seedD, c2D)
	evaluate(seedD, 1, "dev", devIDs, devCorrect[seedD])
	evaluate(c1D, 1, "dev", devIDs, devCorrect[c1D])
	evaluate(c2D, 1, "dev", devIDs, devCorrect[c2D])
	selection(1, []string{c1D, c2D})
	// Generation 2: c3 mutates off c1; population {c1, c2, c3}.
	mutation(c1D, c3D)
	evaluate(c1D, 2, "dev", devIDs, devCorrect[c1D])
	evaluate(c2D, 2, "dev", devIDs, devCorrect[c2D])
	evaluate(c3D, 2, "dev", devIDs, devCorrect[c3D])
	selection(2, []string{c3D, c1D})
	// Holdout: after the final selection, seed and winner only.
	evaluate(seedD, 2, "holdout", holdIDs, holdCorrect[seedD])
	evaluate(c3D, 2, "holdout", holdIDs, holdCorrect[c3D])

	// Chain the journal.
	head := canonical.Genesis
	var journal []string
	for i, p := range payloads {
		wire := mustCanonical(t, map[string]any{"payload": p, "prev": head, "seq": i})
		head = mustEntryDigest(t, canonical.ChainEntry{Seq: i, Prev: head, Payload: p})
		journal = append(journal, string(wire))
	}
	writeFile(t, dir, "journal.ndjson", strings.Join(journal, "\n")+"\n")
	writeFile(t, dir, "plan.ndjson", strings.Join(planRows, "\n")+"\n")

	// Ledger: alternate two workers over the receipts.
	var ledger []string
	i := 0
	for work := range receiptSeen {
		owner := "w1"
		if i%2 == 1 {
			owner = "w2"
		}
		ledger = append(ledger, string(mustCanonical(t, map[string]any{
			"at": 1, "digest": work, "fence": i + 1, "nonce": "n", "owner": owner,
		})))
		i++
	}
	writeFile(t, dir, "ledger.ndjson", strings.Join(ledger, "\n")+"\n")

	writeFile(t, dir, "storm.ndjson", strings.Join([]string{
		string(mustCanonical(t, map[string]any{"action": "spawn", "at": 1, "target": "worker"})),
		string(mustCanonical(t, map[string]any{"action": "kill", "at": 2, "target": "worker"})),
		string(mustCanonical(t, map[string]any{"action": "resume", "at": 3, "target": "worker"})),
	}, "\n")+"\n")

	writeFile(t, dir, "manifest.json", string(mustCanonical(t, map[string]any{
		"caps": map[string]any{
			"max_calls": 100, "max_output_tokens": 64, "max_spend_usd_nano": 50_000_000,
		},
		"corpus_sha256": corpusSHA,
		"generations":   2,
		"holdout_per_tier": map[string]any{
			"A": 1, "B": 1,
		},
		"k_population": 3, "k_survivors": 2, "l": 2, "model": model,
		"prices": map[string]any{"input_nano_per_token": 1000, "output_nano_per_token": 5000},
		"seed":   climbSeed, "seed_candidate": seedD,
	})))

	return climbFixture{
		dir: dir, seed: seedD, c1: c1D, c2: c2D, c3: c3D,
		devIDs: devIDs, holdIDs: holdIDs, journal: payloads, planRows: planRows,
	}
}

// rechain rewrites journal.ndjson from a payload list.
func rechain(t *testing.T, dir string, payloads []string) {
	t.Helper()
	head := canonical.Genesis
	var journal []string
	for i, p := range payloads {
		wire := mustCanonical(t, map[string]any{"payload": p, "prev": head, "seq": i})
		head = mustEntryDigest(t, canonical.ChainEntry{Seq: i, Prev: head, Payload: p})
		journal = append(journal, string(wire))
	}
	if err := os.WriteFile(filepath.Join(dir, "journal.ndjson"),
		[]byte(strings.Join(journal, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

func journalPayloads(t *testing.T, dir string) []string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(dir, "journal.ndjson"))
	if err != nil {
		t.Fatal(err)
	}
	var payloads []string
	for _, ln := range strings.Split(strings.TrimSpace(string(data)), "\n") {
		var wire map[string]any
		mustUnmarshal(t, []byte(ln), &wire)
		payloads = append(payloads, wire["payload"].(string))
	}
	return payloads
}

func TestClimbValidBundlePasses(t *testing.T) {
	fx := buildClimbBundle(t)
	report, err := VerifyClimb(fx.dir, climbTestFloors)
	if err != nil {
		t.Fatalf("valid bundle refused: %v", err)
	}
	// Logical: gen0 1x4x2=8, gens 1-2 3x4x2=24 each, holdout 2x2x2=8 => 64.
	if report.Logical != 64 {
		t.Fatalf("logical = %d, want 64", report.Logical)
	}
	// Physical: step-0 templates are shared, so step-0 works dedup
	// across candidates — dev: 4 step-0 + 4x4 final = 20; holdout:
	// 2 step-0 (shared seed/winner) + 2x2 final = 6. Total 26.
	if report.Physical != 26 {
		t.Fatalf("physical = %d, want 26", report.Physical)
	}
	if report.ReuseMilli != 64*1000/26 {
		t.Fatalf("reuse = %d milli", report.ReuseMilli)
	}
	if report.SeedDev != 1 || report.FinalDev != 4 {
		t.Fatalf("dev scores seed=%d final=%d, want 1 and 4", report.SeedDev, report.FinalDev)
	}
	if report.SeedHoldout != 0 || report.WinnerHoldout != 1 {
		t.Fatalf("holdout scores seed=%d winner=%d, want 0 and 1", report.SeedHoldout, report.WinnerHoldout)
	}
	if report.Winner != fx.c3 {
		t.Fatalf("winner = %s, want c3", report.Winner)
	}
	if report.Workers != 2 || report.Kills != 1 {
		t.Fatalf("fleet/storm wrong: %+v", report)
	}
}

func TestClimbSelectionTamperRefused(t *testing.T) {
	fx := buildClimbBundle(t)
	payloads := journalPayloads(t, fx.dir)
	// Swap the gen-2 survivors so the recorded winner is not the top-k.
	for i, p := range payloads {
		var m map[string]any
		mustUnmarshal(t, []byte(p), &m)
		if m["kind"] == "selection" && m["generation"] == float64(2) {
			m["survivors"] = []any{fx.c1, fx.c2}
			payloads[i] = string(mustCanonical(t, m))
		}
	}
	rechain(t, fx.dir, payloads)
	_, err := VerifyClimb(fx.dir, climbTestFloors)
	if err == nil || !errors.Is(err, ErrSelection) {
		t.Fatalf("selection tamper not refused as CL2: %v", err)
	}
}

func TestClimbHoldoutBeforeSelectionRefused(t *testing.T) {
	fx := buildClimbBundle(t)
	payloads := journalPayloads(t, fx.dir)
	// Move the LAST receipt (a holdout buy) to the front of the chain.
	last := len(payloads) - 1
	moved := payloads[last]
	var m map[string]any
	mustUnmarshal(t, []byte(moved), &m)
	if m["kind"] != "receipt" {
		t.Fatalf("fixture drift: last payload is %v, want a holdout receipt", m["kind"])
	}
	reordered := append([]string{moved}, payloads[:last]...)
	rechain(t, fx.dir, reordered)
	_, err := VerifyClimb(fx.dir, climbTestFloors)
	if err == nil || !errors.Is(err, ErrSelection) {
		t.Fatalf("holdout-before-selection not refused as CL3: %v", err)
	}
}

func TestClimbMissingLineageRefused(t *testing.T) {
	fx := buildClimbBundle(t)
	payloads := journalPayloads(t, fx.dir)
	var kept []string
	for _, p := range payloads {
		var m map[string]any
		mustUnmarshal(t, []byte(p), &m)
		if m["kind"] == "mutation" && m["child"] == fx.c3 {
			continue // orphan c3
		}
		kept = append(kept, p)
	}
	rechain(t, fx.dir, kept)
	_, err := VerifyClimb(fx.dir, climbTestFloors)
	if err == nil || !errors.Is(err, ErrLineage) {
		t.Fatalf("missing lineage not refused as CL4: %v", err)
	}
}

func TestClimbOutputTamperRefused(t *testing.T) {
	fx := buildClimbBundle(t)
	// Corrupt one bundled output: the winner's first holdout answer.
	outputs := filepath.Join(fx.dir, "outputs")
	entries, err := os.ReadDir(outputs)
	if err != nil {
		t.Fatal(err)
	}
	// Find a final-step holdout output of c3 by recomputing its work.
	steps := []map[string]any{climbStep(t, "solve"), climbStep(t, "answer-v3")}
	sort.Strings(fx.holdIDs)
	id := fx.holdIDs[0]
	q0 := mustDigest(t, map[string]any{"question": id, "seed": climbSeed})
	w0 := mustDigest(t, map[string]any{"inputs": []string{q0}, "step": mustDigest(t, steps[0])})
	data, err := os.ReadFile(filepath.Join(outputs, w0+".txt"))
	if err != nil {
		t.Fatal(err)
	}
	r0 := canonical.DigestHex(data)
	w1 := mustDigest(t, map[string]any{"inputs": []string{r0}, "step": mustDigest(t, steps[1])})
	if err := os.WriteFile(filepath.Join(outputs, w1+".txt"), []byte("ANSWER: forged"), 0o644); err != nil {
		t.Fatal(err)
	}
	_ = entries
	_, err = VerifyClimb(fx.dir, climbTestFloors)
	if err == nil || !errors.Is(err, ErrScore) {
		t.Fatalf("output tamper not refused as CL1: %v", err)
	}
}

func TestClimbSplitTamperRefused(t *testing.T) {
	fx := buildClimbBundle(t)
	path := filepath.Join(fx.dir, "plan.ndjson")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	// Claim a derived-holdout question as dev.
	tampered := false
	for i, ln := range lines {
		var row map[string]any
		mustUnmarshal(t, []byte(ln), &row)
		if row["split"] == "holdout" && !tampered {
			row["split"] = "dev"
			lines[i] = string(mustCanonical(t, row))
			tampered = true
		}
	}
	if !tampered {
		t.Fatal("fixture drift: no holdout row found")
	}
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err = VerifyClimb(fx.dir, climbTestFloors)
	if err == nil || !errors.Is(err, ErrPlan) {
		t.Fatalf("split tamper not refused: %v", err)
	}
}

func TestClimbSingleWorkerRefused(t *testing.T) {
	fx := buildClimbBundle(t)
	path := filepath.Join(fx.dir, "ledger.ndjson")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	for i, ln := range lines {
		var claim map[string]any
		mustUnmarshal(t, []byte(ln), &claim)
		claim["owner"] = "w1"
		lines[i] = string(mustCanonical(t, claim))
	}
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err = VerifyClimb(fx.dir, climbTestFloors)
	if err == nil || !errors.Is(err, ErrFleet) {
		t.Fatalf("single worker not refused as CL5: %v", err)
	}
}

func TestClimbGainFloorRefused(t *testing.T) {
	fx := buildClimbBundle(t)
	strict := climbTestFloors
	strict.DevGainMin = 10 // fixture gain is 3
	_, err := VerifyClimb(fx.dir, strict)
	if err == nil || !errors.Is(err, ErrFloor) {
		t.Fatalf("dev gain floor not refused: %v", err)
	}
}

// The R2 floors are the spec's numbers. A change here is a spec
// amendment, not a tweak.
func TestR2FloorsArePinned(t *testing.T) {
	want := ClimbFloors{
		LogicalMin: 3840, ReuseMilli: 3000, KillsMin: 1, WorkersMin: 4,
		GenerationsMin: 4, PopulationMin: 6, StepsMin: 4,
		DevMin: 40, HoldoutMin: 27, DevGainMin: 4, HoldoutGainMin: 1,
	}
	if R2 != want {
		t.Fatalf("R2 floors drifted: %+v", R2)
	}
}
