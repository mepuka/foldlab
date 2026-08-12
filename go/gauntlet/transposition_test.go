// COORDINATOR-OWNED — self-test for the RG-A verifier: a synthetic
// valid bundle passes; each tamper class refuses with its named law;
// the RGA floors are pinned to the spec's numbers.
package gauntlet

import (
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"

	"foldlab/canonical"
)

var transTestFloors = TransFloors{N: 3, Workers: 2, MinSharePct: 5}

// buildTransBundle writes a valid n=3 (16 states), 2-worker bundle.
// Journal order is by anti-diagonal (x+y ascending), which satisfies
// the frontier law; workers alternate by parity of x+2y.
func buildTransBundle(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	n := transTestFloors.N
	states := (n + 1) * (n + 1)

	type st struct{ x, y int }
	var order []st
	for k := 0; k <= 2*n; k++ {
		for x := 0; x <= n; x++ {
			y := k - x
			if y >= 0 && y <= n {
				order = append(order, st{x, y})
			}
		}
	}

	head := canonical.Genesis
	var journal []string
	digests := make(map[st]string, states)
	results := make(map[st]string, states)
	workers := make(map[st]string, states)
	for i, s := range order {
		d := mustDigest(t, map[string]any{"salt": testSalt, "x": s.x, "y": s.y})
		r := mustDigest(t, map[string]any{"do": d})
		w := "a"
		if (s.x+2*s.y)%2 == 1 {
			w = "b"
		}
		digests[s], results[s], workers[s] = d, r, w
		payload := string(mustCanonical(t, map[string]any{
			"result": r,
			"state":  map[string]any{"x": s.x, "y": s.y},
			"worker": w,
		}))
		wire := mustCanonical(t, map[string]any{"payload": payload, "prev": head, "seq": i})
		head = canonical.EntryDigest(canonical.ChainEntry{Seq: i, Prev: head, Payload: payload})
		journal = append(journal, string(wire))
	}
	writeFile(t, dir, "journal.ndjson", strings.Join(journal, "\n")+"\n")

	var sortedDigests []string
	resultByDigest := make(map[string]string, states)
	for s, d := range digests {
		sortedDigests = append(sortedDigests, d)
		resultByDigest[d] = results[s]
	}
	sort.Strings(sortedDigests)
	var registers []string
	for _, d := range sortedDigests {
		registers = append(registers, string(mustCanonical(t, map[string]any{
			"digest": d, "fence": 1, "result": resultByDigest[d],
		})))
	}
	writeFile(t, dir, "registers.ndjson", strings.Join(registers, "\n")+"\n")

	if err := os.MkdirAll(filepath.Join(dir, "ledger"), 0o755); err != nil {
		t.Fatal(err)
	}
	var ledgerA, ledgerB []string
	nonce := 0
	for _, s := range order {
		nonce++
		line := string(mustCanonical(t, map[string]any{
			"at": 1000 + nonce, "digest": digests[s], "fence": 1,
			"nonce": "n" + strconv.Itoa(nonce), "owner": workers[s],
		}))
		if workers[s] == "a" {
			ledgerA = append(ledgerA, line)
		} else {
			ledgerB = append(ledgerB, line)
		}
	}
	writeFile(t, dir, filepath.Join("ledger", "a.ndjson"), strings.Join(ledgerA, "\n")+"\n")
	writeFile(t, dir, filepath.Join("ledger", "b.ndjson"), strings.Join(ledgerB, "\n")+"\n")

	state := make(map[string]any, states)
	for s, r := range results {
		state[strconv.Itoa(s.x)+","+strconv.Itoa(s.y)] = r
	}
	writeFile(t, dir, "manifest.json", string(mustCanonical(t, map[string]any{
		"expansions": states, "n": n, "salt": testSalt,
		"state_digest": mustDigest(t, state), "workers": 2,
	})))
	return dir
}

func TestTranspositionValidBundlePasses(t *testing.T) {
	dir := buildTransBundle(t)
	report, err := VerifyTransposition(dir, transTestFloors)
	if err != nil {
		t.Fatalf("valid bundle refused: %v", err)
	}
	if report.States != 16 || report.Workers != 2 {
		t.Fatalf("report is wrong: %+v", report)
	}
	// n=3: path-tree nodes = sum C(x+y,x) over the 4x4 lattice
	// = 4 + 10 + 20 + 35 = 69 (row sums by y).
	if report.PathTreeNodes != "69" {
		t.Fatalf("path-tree count is %s, want 69", report.PathTreeNodes)
	}
}

func TestTranspositionSurplusExpansionRefused(t *testing.T) {
	dir := buildTransBundle(t)
	// Worker a runs one extra expansion of a state b owns at fence 1:
	// this is BOTH surplus (TV6 economy) and a fencing violation; the
	// fencing check fires first and either refusal is ErrLedger/ErrEconomy.
	bData, _ := os.ReadFile(filepath.Join(dir, "ledger", "b.ndjson"))
	firstB := strings.SplitN(strings.TrimSpace(string(bData)), "\n", 2)[0]
	var run map[string]any
	mustUnmarshal(t, []byte(firstB), &run)
	run["owner"] = "a"
	run["nonce"] = "surplus"
	aPath := filepath.Join(dir, "ledger", "a.ndjson")
	aData, _ := os.ReadFile(aPath)
	line := mustCanonical(t, run)
	if err := os.WriteFile(aPath, append(aData, append(line, '\n')...), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := VerifyTransposition(dir, transTestFloors)
	if err == nil || (!errors.Is(err, ErrEconomy) && !errors.Is(err, ErrLedger)) {
		t.Fatalf("surplus expansion not refused: %v", err)
	}
}

func TestTranspositionFrontierViolationRefused(t *testing.T) {
	dir := buildTransBundle(t)
	// Swap journal entries 1 and 2 — both are depth-1 states whose
	// parent is entry 0, so the swap alone would be legal; instead swap
	// entry 1 (a depth-1 state) with entry 3 (a depth-2 state): the
	// depth-2 state now precedes one of its parents. Re-chain so ONLY
	// the frontier law is violated, not the chain law.
	path := filepath.Join(dir, "journal.ndjson")
	data, _ := os.ReadFile(path)
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var payloads []string
	for _, l := range lines {
		var wire map[string]any
		mustUnmarshal(t, []byte(l), &wire)
		payloads = append(payloads, wire["payload"].(string))
	}
	payloads[1], payloads[3] = payloads[3], payloads[1]
	head := canonical.Genesis
	var rebuilt []string
	for i, p := range payloads {
		wire := mustCanonical(t, map[string]any{"payload": p, "prev": head, "seq": i})
		head = canonical.EntryDigest(canonical.ChainEntry{Seq: i, Prev: head, Payload: p})
		rebuilt = append(rebuilt, string(wire))
	}
	if err := os.WriteFile(path, []byte(strings.Join(rebuilt, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := VerifyTransposition(dir, transTestFloors)
	if err == nil || !errors.Is(err, ErrFrontier) {
		t.Fatalf("frontier violation not refused as TV4: %v", err)
	}
}

func TestTranspositionMissingStateRefused(t *testing.T) {
	dir := buildTransBundle(t)
	path := filepath.Join(dir, "journal.ndjson")
	data, _ := os.ReadFile(path)
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	truncated := strings.Join(lines[:len(lines)-1], "\n") + "\n"
	if err := os.WriteFile(path, []byte(truncated), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := VerifyTransposition(dir, transTestFloors)
	if err == nil || !errors.Is(err, ErrCompleteness) {
		t.Fatalf("missing state not refused as TV3: %v", err)
	}
}

func TestTranspositionHeroWorkerRefused(t *testing.T) {
	dir := buildTransBundle(t)
	strict := transTestFloors
	strict.MinSharePct = 60 // neither worker holds 60% of 16 states
	_, err := VerifyTransposition(dir, strict)
	if err == nil || !errors.Is(err, ErrParticipation) {
		t.Fatalf("participation floor not refused: %v", err)
	}
}

// The RGA floors are the spec's numbers. A change here is a spec
// amendment, not a tweak.
func TestRGAFloorsArePinned(t *testing.T) {
	want := TransFloors{N: 40, Workers: 8, MinSharePct: 5}
	if RGA != want {
		t.Fatalf("RGA floors drifted: %+v", RGA)
	}
}

func mustUnmarshal(t *testing.T, data []byte, target any) {
	t.Helper()
	if err := strictDecode(data, target); err != nil {
		t.Fatalf("decode: %v", err)
	}
}
