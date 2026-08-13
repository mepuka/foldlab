// COORDINATOR-OWNED — self-test for the R1 verifier: a synthetic valid
// bundle passes; each tamper class refuses with its named law; the R1
// floors are pinned to the spec's numbers.
package gauntlet

import (
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"foldlab/canonical"
)

// Small but honest shape: K=3 variants x L=3 steps x Q=4 questions = 36
// logical steps. Variants 1 and 2 differ from variant 0 only at the LAST
// step, so per question: 3 base calls + 1 + 1 = 5 physical, 20 total,
// reuse = 36/20 = 1.8x. Test floors sit below that; the R1 floors demand
// more and are pinned separately.
var realTestFloors = RealFloors{LogicalMin: 36, ReuseMilli: 1500, KillsMin: 1}

const (
	k = 3
	l = 3
	q = 4
)

func templateDigest(t *testing.T, variant, step int) string {
	t.Helper()
	// Variants share templates at all steps except the last, where each
	// variant has its own.
	if step < l-1 {
		return mustDigest(t, map[string]any{"template": "base", "step": step})
	}
	return mustDigest(t, map[string]any{"template": "variant", "step": step, "variant": variant})
}

func buildRealBundle(t *testing.T) string {
	return buildRealBundleWithTemplates(t, templateDigest)
}

func buildRealBundleWithTemplates(t *testing.T, templates func(*testing.T, int, int) string) string {
	t.Helper()
	dir := t.TempDir()
	model := "claude-haiku-4-5-20251001"

	type rowKey struct{ v, qi, s int }
	works := make(map[rowKey]string)
	results := make(map[string]string) // work -> result digest
	var planRows []string
	var factOrder []string
	seen := make(map[string]bool)

	head := canonical.Genesis
	var journal []string
	seqNo := 0
	appendFact := func(work string) {
		result := mustDigest(t, map[string]any{"out": work})
		results[work] = result
		payload := string(mustCanonical(t, map[string]any{
			"digest": work, "input_tokens": 100, "model": model,
			"output_tokens": 40, "result": result, "stop": "end_turn",
		}))
		wire := mustCanonical(t, map[string]any{"payload": payload, "prev": head, "seq": seqNo})
		head = mustEntryDigest(t, canonical.ChainEntry{Seq: int64(seqNo), Prev: head, Payload: payload})
		journal = append(journal, string(wire))
		seqNo++
	}

	for vi := 0; vi < k; vi++ {
		for qi := 0; qi < q; qi++ {
			prevResult := ""
			for s := 0; s < l; s++ {
				var inputs []string
				if s == 0 {
					inputs = []string{mustDigest(t, map[string]any{"question": qi, "seed": "r1-self-test"})}
				} else {
					inputs = []string{prevResult}
				}
				tmpl := templates(t, vi, s)
				work := mustDigest(t, map[string]any{"inputs": inputs, "model": model, "template": tmpl})
				works[rowKey{vi, qi, s}] = work
				if !seen[work] {
					seen[work] = true
					appendFact(work)
					factOrder = append(factOrder, work)
				}
				prevResult = results[work]
				planRows = append(planRows, string(mustCanonical(t, map[string]any{
					"inputs": inputs, "question": qi, "step": s,
					"template": tmpl, "variant": vi, "work": work,
				})))
			}
		}
	}

	writeFile(t, dir, "journal.ndjson", strings.Join(journal, "\n")+"\n")
	writeFile(t, dir, "plan.ndjson", strings.Join(planRows, "\n")+"\n")
	writeFile(t, dir, "storm.ndjson", strings.Join([]string{
		string(mustCanonical(t, map[string]any{"action": "spawn", "at": 1, "target": "worker"})),
		string(mustCanonical(t, map[string]any{"action": "kill", "at": 2, "target": "worker"})),
		string(mustCanonical(t, map[string]any{"action": "resume", "at": 3, "target": "worker"})),
	}, "\n")+"\n")
	writeFile(t, dir, "manifest.json", string(mustCanonical(t, map[string]any{
		"caps": map[string]any{
			"max_calls": 100, "max_output_tokens": 64, "max_spend_usd_micro": 5_000_000,
		},
		"k": k, "l": l, "model": model,
		"prices": map[string]any{"input_micro_per_token": 1, "output_micro_per_token": 5},
		"q":      q, "seed": "r1-self-test",
	})))
	_ = factOrder
	_ = strconv.Itoa
	return dir
}

func TestRealValidBundlePasses(t *testing.T) {
	dir := buildRealBundle(t)
	report, err := VerifyReal(dir, realTestFloors)
	if err != nil {
		t.Fatalf("valid bundle refused: %v", err)
	}
	if report.Logical != 36 || report.Physical != 20 {
		t.Fatalf("counts wrong: %+v", report)
	}
	if report.ReuseMilli != 1800 {
		t.Fatalf("reuse is %d milli, want 1800", report.ReuseMilli)
	}
	// 20 calls x (100 in x 1 + 40 out x 5) = 20 x 300 = 6000 micro-usd.
	if report.SpendMicro != 6000 {
		t.Fatalf("spend is %d micro, want 6000", report.SpendMicro)
	}
	// Naive: 36 rows x 300 = 10800.
	if report.NaiveSpendMicro != 10800 {
		t.Fatalf("naive spend is %d micro, want 10800", report.NaiveSpendMicro)
	}
}

func TestRealDoubleBuyRefused(t *testing.T) {
	dir := buildRealBundle(t)
	// Append a second receipt for an already-bought digest (re-chained).
	path := filepath.Join(dir, "journal.ndjson")
	data, _ := os.ReadFile(path)
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var first map[string]any
	mustUnmarshal(t, []byte(lines[0]), &first)
	// Rebuild the chain with the first payload duplicated at the end.
	payloads := make([]string, 0, len(lines)+1)
	for _, ln := range lines {
		var wire map[string]any
		mustUnmarshal(t, []byte(ln), &wire)
		payloads = append(payloads, wire["payload"].(string))
	}
	payloads = append(payloads, payloads[0])
	head := canonical.Genesis
	var rebuilt []string
	for i, p := range payloads {
		wire := mustCanonical(t, map[string]any{"payload": p, "prev": head, "seq": i})
		head = mustEntryDigest(t, canonical.ChainEntry{Seq: int64(i), Prev: head, Payload: p})
		rebuilt = append(rebuilt, string(wire))
	}
	if err := os.WriteFile(path, []byte(strings.Join(rebuilt, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := VerifyReal(dir, realTestFloors)
	if err == nil || !errors.Is(err, ErrReceipts) {
		t.Fatalf("double buy not refused: %v", err)
	}
}

func TestRealBrokenWiringRefused(t *testing.T) {
	dir := buildRealBundle(t)
	path := filepath.Join(dir, "plan.ndjson")
	data, _ := os.ReadFile(path)
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	// Row index 1 is (variant 0, question 0, step 1): point its input at
	// garbage — and recompute its work so ONLY the wiring law can fire.
	var row map[string]any
	mustUnmarshal(t, []byte(lines[1]), &row)
	fake := strings.Repeat("ab", 32)
	row["inputs"] = []any{fake}
	row["work"] = mustDigest(t, map[string]any{
		"inputs": []any{fake}, "model": row["template"].(string)[0:0] + "claude-haiku-4-5-20251001",
		"template": row["template"],
	})
	lines[1] = string(mustCanonical(t, row))
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := VerifyReal(dir, realTestFloors)
	if err == nil || !errors.Is(err, ErrWiring) {
		t.Fatalf("broken wiring not refused: %v", err)
	}
}

func TestRealCapBreachRefused(t *testing.T) {
	dir := buildRealBundle(t)
	// Lower the spend cap below the recomputed spend.
	rewriteRealManifest(t, dir, func(m map[string]any) {
		caps := m["caps"].(map[string]any)
		caps["max_spend_usd_micro"] = float64(100)
	})
	_, err := VerifyReal(dir, realTestFloors)
	if err == nil || !errors.Is(err, ErrReceipts) {
		t.Fatalf("cap breach not refused: %v", err)
	}
}

func TestRealReuseFloorRefused(t *testing.T) {
	dir := buildRealBundle(t)
	strict := realTestFloors
	strict.ReuseMilli = 2500
	_, err := VerifyReal(dir, strict)
	if err == nil || !errors.Is(err, ErrFloor) {
		t.Fatalf("reuse floor not refused: %v", err)
	}
}

func TestRealMissingKillRefused(t *testing.T) {
	dir := buildRealBundle(t)
	writeFile(t, dir, "storm.ndjson", string(mustCanonical(t,
		map[string]any{"action": "spawn", "at": 1, "target": "worker"},
	))+"\n")
	_, err := VerifyReal(dir, realTestFloors)
	if err == nil || !errors.Is(err, ErrFloor) {
		t.Fatalf("missing kill not refused: %v", err)
	}
}

func TestRealIdenticalVariantsRefused(t *testing.T) {
	dir := buildRealBundleWithTemplates(t, func(t *testing.T, _ int, step int) string {
		return templateDigest(t, 0, step)
	})
	_, err := VerifyReal(dir, realTestFloors)
	if err == nil || !errors.Is(err, ErrPlan) {
		t.Fatalf("identical variants not refused: %v", err)
	}
	if !strings.Contains(err.Error(), "identical template shapes") {
		t.Fatalf("identical variants refused by wrong control: %v", err)
	}
}

func TestRealGhostStormTargetRefused(t *testing.T) {
	dir := buildRealBundle(t)
	rewriteStormTarget(t, dir, "kill", "ghost-that-never-existed")
	_, err := VerifyReal(dir, realTestFloors)
	if err == nil || !errors.Is(err, ErrFloor) {
		t.Fatalf("ghost storm target not refused: %v", err)
	}
}

// The R1 floors are the spec's numbers. A change here is a spec
// amendment, not a tweak.
func TestR1FloorsArePinned(t *testing.T) {
	want := RealFloors{LogicalMin: 480, ReuseMilli: 2500, KillsMin: 1}
	if R1 != want {
		t.Fatalf("R1 floors drifted: %+v", R1)
	}
}

func rewriteRealManifest(t *testing.T, dir string, mutate func(map[string]any)) {
	t.Helper()
	path := filepath.Join(dir, "manifest.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	mustUnmarshal(t, data, &m)
	mutate(m)
	if err := os.WriteFile(path, mustCanonical(t, m), 0o644); err != nil {
		t.Fatal(err)
	}
}

func rewriteStormTarget(t *testing.T, dir, action, target string) {
	t.Helper()
	path := filepath.Join(dir, "storm.ndjson")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	found := false
	for i, line := range lines {
		var event map[string]any
		mustUnmarshal(t, []byte(line), &event)
		if event["action"] == action && !found {
			event["target"] = target
			lines[i] = string(mustCanonical(t, event))
			found = true
		}
	}
	if !found {
		t.Fatalf("storm action %q not found", action)
	}
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}
