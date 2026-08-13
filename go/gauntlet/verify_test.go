// COORDINATOR-OWNED — self-test for the G1 verifier: a synthetic valid
// bundle must pass; every tamper class must refuse with its named law;
// the G1 floors are pinned to the spec's numbers.
package gauntlet

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"

	"foldlab/canonical"
)

const testSalt = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"

var testFloors = Floors{Steps: 20, Workers: 2, Kills: 0, ServerRestarts: 0, Steals: 1, ConeMin: 5}

func mustDigest(t *testing.T, v any) string {
	t.Helper()
	d, err := digestOf(v)
	if err != nil {
		t.Fatalf("digestOf: %v", err)
	}
	return d
}

func mustCanonical(t *testing.T, v any) []byte {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	encoded, err := canonical.Canonicalize(raw)
	if err != nil {
		t.Fatalf("canonicalize: %v", err)
	}
	return encoded
}

// buildBundle writes a valid 20-step, 2-worker bundle with one steal
// (step 3 committed at fence 2 by worker b) and one duplicate run.
func buildBundle(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	steps := testFloors.Steps

	digests := make([]string, steps)
	results := make([]string, steps)
	prevResult := ""
	head := canonical.Genesis
	var journal []string
	for i := 0; i < steps; i++ {
		base := mustDigest(t, map[string]any{"salt": testSalt, "step": i})
		digests[i] = mustDigest(t, map[string]any{"base": base, "prev": prevResult})
		results[i] = mustDigest(t, map[string]any{"do": digests[i]})
		worker := "a"
		if i%2 == 1 || i == 3 {
			worker = "b"
		}
		payload := string(mustCanonical(t, map[string]any{
			"digest": digests[i], "result": results[i], "step": i, "worker": worker,
		}))
		entry := canonical.ChainEntry{Seq: int64(i), Prev: head, Payload: payload}
		wire := mustCanonical(t, map[string]any{"payload": payload, "prev": head, "seq": i})
		head = mustEntryDigest(t, entry)
		journal = append(journal, string(wire))
		prevResult = results[i]
	}
	writeFile(t, dir, "journal.ndjson", strings.Join(journal, "\n")+"\n")

	fences := make(map[string]uint64, steps)
	var registers []string
	sortedDigests := append([]string(nil), digests...)
	sort.Strings(sortedDigests)
	for _, d := range sortedDigests {
		fence := uint64(1)
		if d == digests[3] {
			fence = 2
		}
		fences[d] = fence
		registers = append(registers, string(mustCanonical(t, map[string]any{
			"digest": d, "fence": fence, "result": resultFor(digests, results, d),
		})))
	}
	writeFile(t, dir, "registers.ndjson", strings.Join(registers, "\n")+"\n")

	if err := os.MkdirAll(filepath.Join(dir, "ledger"), 0o755); err != nil {
		t.Fatal(err)
	}
	var ledgerA, ledgerB []string
	nonce := 0
	line := func(owner, digest string, fence uint64) string {
		nonce++
		return string(mustCanonical(t, map[string]any{
			"at": 1000 + nonce, "digest": digest, "fence": fence,
			"nonce": "n" + strconv.Itoa(nonce), "owner": owner,
		}))
	}
	for i, d := range digests {
		switch {
		case i == 3:
			// The steal: a ran at fence 1 (the duplicate run), b committed at 2.
			ledgerA = append(ledgerA, line("a", d, 1))
			ledgerB = append(ledgerB, line("b", d, 2))
		case i%2 == 0:
			ledgerA = append(ledgerA, line("a", d, 1))
		default:
			ledgerB = append(ledgerB, line("b", d, 1))
		}
	}
	writeFile(t, dir, filepath.Join("ledger", "a.ndjson"), strings.Join(ledgerA, "\n")+"\n")
	writeFile(t, dir, filepath.Join("ledger", "b.ndjson"), strings.Join(ledgerB, "\n")+"\n")

	writeFile(t, dir, "storm.ndjson", strings.Join([]string{
		string(mustCanonical(t, map[string]any{"action": "spawn", "at": 1, "target": "a"})),
		string(mustCanonical(t, map[string]any{"action": "spawn", "at": 2, "target": "b"})),
		string(mustCanonical(t, map[string]any{"action": "kill", "at": 3, "target": "a"})),
	}, "\n")+"\n")

	state := make(map[string]any, steps)
	for i, r := range results {
		state[strconv.Itoa(i)] = r
	}
	cfPosition := 4
	cfResult := mustDigest(t, map[string]any{"cf": digests[cfPosition]})
	cfState := make(map[string]any, steps)
	for i := 0; i < cfPosition; i++ {
		cfState[strconv.Itoa(i)] = results[i]
	}
	prime := cfResult
	cfState[strconv.Itoa(cfPosition)] = prime
	for i := cfPosition + 1; i < steps; i++ {
		base := mustDigest(t, map[string]any{"salt": testSalt, "step": i})
		d := mustDigest(t, map[string]any{"base": base, "prev": prime})
		prime = mustDigest(t, map[string]any{"do": d})
		cfState[strconv.Itoa(i)] = prime
	}

	writeFile(t, dir, "manifest.json", string(mustCanonical(t, map[string]any{
		"cf_position": cfPosition, "dup_runs": 1, "salt": testSalt,
		"seed": "self-test", "state_digest": mustDigest(t, state),
		"steals": 1, "steps": steps, "workers": 2,
	})))
	writeFile(t, dir, "counterfactual.json", string(mustCanonical(t, map[string]any{
		"position": cfPosition, "result": cfResult,
		"state_digest": mustDigest(t, cfState),
	})))
	return dir
}

func mustEntryDigest(t testing.TB, entry canonical.ChainEntry) string {
	t.Helper()
	digest, err := canonical.EntryDigest(entry)
	if err != nil {
		t.Fatalf("EntryDigest(%+v): %v", entry, err)
	}
	return digest
}

func resultFor(digests, results []string, d string) string {
	for i, x := range digests {
		if x == d {
			return results[i]
		}
	}
	return ""
}

func writeFile(t *testing.T, dir, name, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

// rewriteJournalPayload re-canonicalizes every payload and rebuilds the
// outer chain after one payload mutation. Controls using it therefore cannot
// fall through to the chain law: only the payload law under test may fire.
func rewriteJournalPayload(t *testing.T, dir string, at int, mutate func(map[string]any)) {
	t.Helper()
	path := filepath.Join(dir, "journal.ndjson")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	payloads := make([]string, len(lines))
	for i, line := range lines {
		var wire map[string]any
		mustUnmarshal(t, []byte(line), &wire)
		payloads[i] = wire["payload"].(string)
	}
	var payload map[string]any
	mustUnmarshal(t, []byte(payloads[at]), &payload)
	mutate(payload)
	payloads[at] = string(mustCanonical(t, payload))

	head := canonical.Genesis
	rebuilt := make([]string, len(payloads))
	for i, payload := range payloads {
		rebuilt[i] = string(mustCanonical(t, map[string]any{
			"payload": payload,
			"prev":    head,
			"seq":     i,
		}))
		head = mustEntryDigest(t, canonical.ChainEntry{Seq: int64(i), Prev: head, Payload: payload})
	}
	if err := os.WriteFile(path, []byte(strings.Join(rebuilt, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestValidBundlePasses(t *testing.T) {
	dir := buildBundle(t)
	report, err := Verify(dir, testFloors)
	if err != nil {
		t.Fatalf("valid bundle refused: %v", err)
	}
	if report.Steps != 20 || report.Workers != 2 || report.DupRuns != 1 || report.Steals != 1 {
		t.Fatalf("report is wrong: %+v", report)
	}
}

func TestGV1BrokenChainRefused(t *testing.T) {
	t.Run("non-canonical outer bytes", func(t *testing.T) {
		dir := buildBundle(t)
		path := filepath.Join(dir, "journal.ndjson")
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		lines := strings.Split(strings.TrimSpace(string(data)), "\n")
		lines[0] = strings.Replace(lines[0], "{", "{ ", 1)
		if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		_, err = Verify(dir, testFloors)
		if err == nil || !errors.Is(err, ErrChain) {
			t.Fatalf("non-canonical journal not refused as GV1: %v", err)
		}
	})

	t.Run("canonical bytes with broken position", func(t *testing.T) {
		dir := buildBundle(t)
		path := filepath.Join(dir, "journal.ndjson")
		data, _ := os.ReadFile(path)
		// Rewrite the first entry's wire seq: still canonical JSON, but the
		// position no longer matches — the chain law must catch it.
		tampered := strings.Replace(string(data), "\"seq\":0}", "\"seq\":1}", 1)
		if tampered == string(data) {
			t.Fatal("tamper pattern did not match — test is broken, not the verifier")
		}
		if err := os.WriteFile(path, []byte(tampered), 0o644); err != nil {
			t.Fatal(err)
		}
		_, err := Verify(dir, testFloors)
		if err == nil || !errors.Is(err, ErrChain) {
			t.Fatalf("broken chain not refused as GV1: %v", err)
		}
	})
}

func TestGV2WrongSemanticsRefusedWithValidChain(t *testing.T) {
	dir := buildBundle(t)
	rewriteJournalPayload(t, dir, 0, func(payload map[string]any) {
		payload["result"] = strings.Repeat("0", 64)
	})
	_, err := Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrSemantics) {
		t.Fatalf("wrong pinned semantics not refused as GV2: %v", err)
	}
}

func TestGV3UnsortedRegistersRefused(t *testing.T) {
	dir := buildBundle(t)
	path := filepath.Join(dir, "registers.ndjson")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	lines[0], lines[1] = lines[1], lines[0]
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err = Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrCommitment) {
		t.Fatalf("unsorted registers not refused as GV3: %v", err)
	}
}

func TestGV6WrongReplayDigestRefused(t *testing.T) {
	dir := buildBundle(t)
	rewriteManifest(t, dir, func(m map[string]any) {
		m["state_digest"] = strings.Repeat("ab", 32)
	})
	_, err := Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrReplay) {
		t.Fatalf("wrong replay digest not refused as GV6: %v", err)
	}
}

func TestGV9NonCanonicalManifestRefused(t *testing.T) {
	for _, name := range []string{"manifest.json", "counterfactual.json"} {
		t.Run(name, func(t *testing.T) {
			dir := buildBundle(t)
			path := filepath.Join(dir, name)
			data, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(path, append(data, '\n'), 0o644); err != nil {
				t.Fatal(err)
			}
			_, err = Verify(dir, testFloors)
			if err == nil || !errors.Is(err, ErrG1Manifest) || !errors.Is(err, ErrManifest) || !strings.Contains(err.Error(), "GV9") {
				t.Fatalf("non-canonical %s not refused as GV9: %v", name, err)
			}
		})
	}
}

func TestFencingViolationRefused(t *testing.T) {
	dir := buildBundle(t)
	// A second owner claims to have run (digest of step 5, fence 1),
	// which only one owner may hold.
	data, _ := os.ReadFile(filepath.Join(dir, "ledger", "a.ndjson"))
	var stolen map[string]any
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	for _, l := range lines {
		var run map[string]any
		if err := json.Unmarshal([]byte(l), &run); err == nil {
			stolen = run
			break
		}
	}
	stolen["owner"] = "b"
	stolen["nonce"] = "poached"
	line := mustCanonical(t, stolen)
	bPath := filepath.Join(dir, "ledger", "b.ndjson")
	bData, _ := os.ReadFile(bPath)
	if err := os.WriteFile(bPath, append(bData, append(line, '\n')...), 0o644); err != nil {
		t.Fatal(err)
	}
	// dup_runs changes too; keep manifest honest so ONLY the fencing law fires.
	rewriteManifest(t, dir, func(m map[string]any) { m["dup_runs"] = float64(2) })
	_, err := Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrLedger) {
		t.Fatalf("fencing violation not refused as ledger law: %v", err)
	}
	if !strings.Contains(err.Error(), "fencing") {
		t.Fatalf("refusal does not name fencing: %v", err)
	}
}

func TestDishonestDupCountRefused(t *testing.T) {
	dir := buildBundle(t)
	rewriteManifest(t, dir, func(m map[string]any) { m["dup_runs"] = float64(0) })
	_, err := Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrLedger) {
		t.Fatalf("dishonest dup count not refused: %v", err)
	}
}

func TestLedgerReownershipRefused(t *testing.T) {
	dir := buildBundle(t)
	aPath := filepath.Join(dir, "ledger", "a.ndjson")
	bPath := filepath.Join(dir, "ledger", "b.ndjson")
	aData, err := os.ReadFile(aPath)
	if err != nil {
		t.Fatal(err)
	}
	bData, err := os.ReadFile(bPath)
	if err != nil {
		t.Fatal(err)
	}
	reown := func(data []byte, owner string) []byte {
		t.Helper()
		lines := strings.Split(strings.TrimSpace(string(data)), "\n")
		for i, line := range lines {
			var run map[string]any
			mustUnmarshal(t, []byte(line), &run)
			run["owner"] = owner
			lines[i] = string(mustCanonical(t, run))
		}
		return []byte(strings.Join(lines, "\n") + "\n")
	}
	// Swap every physical run between the two owner files. The ledger is
	// still internally self-consistent, but no longer agrees with who
	// journaled the committed step.
	if err := os.WriteFile(aPath, reown(bData, "a"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(bPath, reown(aData, "b"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err = Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrLedger) {
		t.Fatalf("ledger reownership not refused as attribution failure: %v", err)
	}
}

func TestGhostStormTargetRefused(t *testing.T) {
	dir := buildBundle(t)
	path := filepath.Join(dir, "storm.ndjson")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var event map[string]any
	mustUnmarshal(t, []byte(lines[len(lines)-1]), &event)
	event["target"] = "ghost-that-never-existed"
	lines[len(lines)-1] = string(mustCanonical(t, event))
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err = Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrFloor) {
		t.Fatalf("ghost storm target not refused: %v", err)
	}
}

func TestStormTimestampRefused(t *testing.T) {
	dir := buildBundle(t)
	path := filepath.Join(dir, "storm.ndjson")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var event map[string]any
	mustUnmarshal(t, []byte(lines[0]), &event)
	event["at"] = float64(0)
	lines[0] = string(mustCanonical(t, event))
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err = Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrFloor) {
		t.Fatalf("zero storm timestamp not refused: %v", err)
	}
}

func TestWrongCounterfactualRefused(t *testing.T) {
	dir := buildBundle(t)
	path := filepath.Join(dir, "counterfactual.json")
	var cf map[string]any
	data, _ := os.ReadFile(path)
	if err := json.Unmarshal(data, &cf); err != nil {
		t.Fatal(err)
	}
	cf["state_digest"] = strings.Repeat("ab", 32)
	if err := os.WriteFile(path, mustCanonical(t, cf), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := Verify(dir, testFloors)
	if err == nil || !errors.Is(err, ErrCounterfactual) {
		t.Fatalf("wrong counterfactual not refused: %v", err)
	}
}

func TestFloorsRefused(t *testing.T) {
	dir := buildBundle(t)
	strict := testFloors
	strict.Kills = 5
	_, err := Verify(dir, strict)
	if err == nil || !errors.Is(err, ErrFloor) {
		t.Fatalf("unmet kill floor not refused: %v", err)
	}
}

// The G1 floors are the spec's numbers. A change here is a spec
// amendment, not a tweak.
func TestG1FloorsArePinned(t *testing.T) {
	want := Floors{Steps: 500, Workers: 8, Kills: 25, ServerRestarts: 5, Steals: 10, ConeMin: 10}
	if G1 != want {
		t.Fatalf("G1 floors drifted: %+v", G1)
	}
}

func rewriteManifest(t *testing.T, dir string, mutate func(map[string]any)) {
	t.Helper()
	path := filepath.Join(dir, "manifest.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatal(err)
	}
	mutate(m)
	if err := os.WriteFile(path, mustCanonical(t, m), 0o644); err != nil {
		t.Fatal(err)
	}
}
