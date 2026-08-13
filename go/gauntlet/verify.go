// COORDINATOR-OWNED — the G1 fitness function (docs/gauntlet/G1-crash-storm.md).
// Climbers build harnesses that produce bundles this package accepts;
// they do not edit it.
package gauntlet

import (
	"bytes"
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

// Floors are the hardness minima a bundle must clear. G1 is the pinned
// rung; tests may verify semantics with relaxed floors, but a G1 pass
// means Verify(dir, G1) succeeded.
type Floors struct {
	Steps          int
	Workers        int
	Kills          int
	ServerRestarts int
	Steals         int
	ConeMin        int
}

var G1 = Floors{
	Steps:          500,
	Workers:        8,
	Kills:          25,
	ServerRestarts: 5,
	Steals:         10,
	ConeMin:        10,
}

var (
	ErrManifest       = errors.New("gauntlet: manifest refused")
	ErrG1Manifest     = fmt.Errorf("%w (GV9)", ErrManifest)
	ErrChain          = errors.New("gauntlet: chain refused (GV1)")
	ErrSemantics      = errors.New("gauntlet: semantics refused (GV2)")
	ErrCommitment     = errors.New("gauntlet: commitment refused (GV3)")
	ErrLedger         = errors.New("gauntlet: ledger refused (GV4/GV5)")
	ErrReplay         = errors.New("gauntlet: replay refused (GV6)")
	ErrCounterfactual = errors.New("gauntlet: counterfactual refused (GV7)")
	ErrFloor          = errors.New("gauntlet: hardness floor not met (GV8)")
)

var (
	hex64      = regexp.MustCompile(`^[0-9a-f]{64}$`)
	validOwner = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
)

// Report is what a passing bundle proved, by recomputation.
type Report struct {
	Steps          int
	Workers        int
	DupRuns        int
	Steals         int
	Kills          int
	ServerRestarts int
	Head           string
	StateDigest    string
	CfPosition     int
	CfStateDigest  string
}

type manifest struct {
	CfPosition  int    `json:"cf_position"`
	DupRuns     int    `json:"dup_runs"`
	Salt        string `json:"salt"`
	Seed        string `json:"seed"`
	StateDigest string `json:"state_digest"`
	Steals      int    `json:"steals"`
	Steps       int    `json:"steps"`
	Workers     int    `json:"workers"`
}

type wireEntry struct {
	Payload string `json:"payload"`
	Prev    string `json:"prev"`
	Seq     int64  `json:"seq"`
}

type stepPayload struct {
	Digest string `json:"digest"`
	Result string `json:"result"`
	Step   int    `json:"step"`
	Worker string `json:"worker"`
}

type registerLine struct {
	Digest string `json:"digest"`
	Fence  uint64 `json:"fence"`
	Result string `json:"result"`
}

type ledgerLine struct {
	At     int64  `json:"at"`
	Digest string `json:"digest"`
	Fence  uint64 `json:"fence"`
	Nonce  string `json:"nonce"`
	Owner  string `json:"owner"`
}

type stormLine struct {
	Action string `json:"action"`
	At     int64  `json:"at"`
	Target string `json:"target"`
}

type cfClaim struct {
	Position    int    `json:"position"`
	Result      string `json:"result"`
	StateDigest string `json:"state_digest"`
}

// Verify checks a bundle directory against every GV law at the given
// floors, returning what it proved. Any refusal wraps one of the
// sentinel errors above and names the offending position or file.
func Verify(dir string, floors Floors) (Report, error) {
	var report Report

	var man manifest
	if err := readCanonicalJSON(filepath.Join(dir, "manifest.json"), &man); err != nil {
		return report, fmt.Errorf("%w: %v", ErrG1Manifest, err)
	}
	if !hex64.MatchString(man.Salt) {
		return report, fmt.Errorf("%w: salt is not 64 hex chars", ErrG1Manifest)
	}
	if !hex64.MatchString(man.StateDigest) {
		return report, fmt.Errorf("%w: state_digest is not 64 hex chars", ErrG1Manifest)
	}
	if man.Steps < 1 {
		return report, fmt.Errorf("%w: steps must be positive", ErrG1Manifest)
	}

	// GV1 + GV2: walk the journal, verifying chain and recomputing the
	// entire pinned workload as we go.
	journalLines, err := readLines(filepath.Join(dir, "journal.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrChain, err)
	}
	if len(journalLines) != man.Steps {
		return report, fmt.Errorf(
			"%w: journal has %d entries, manifest says %d",
			ErrChain, len(journalLines), man.Steps,
		)
	}

	head := canonical.Genesis
	digests := make([]string, man.Steps)
	results := make([]string, man.Steps)
	workers := make([]string, man.Steps)
	prevResult := ""
	for i, line := range journalLines {
		if !isCanonical(line) {
			return report, fmt.Errorf("%w: entry %d bytes are not canonical", ErrChain, i)
		}
		var wire wireEntry
		if err := strictDecode(line, &wire); err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrChain, i, err)
		}
		if wire.Seq != int64(i) {
			return report, fmt.Errorf("%w: entry %d has seq %d", ErrChain, i, wire.Seq)
		}
		if wire.Prev != head {
			return report, fmt.Errorf("%w: entry %d prev does not match head", ErrChain, i)
		}
		digest, err := canonical.EntryDigest(canonical.ChainEntry{
			Seq:     wire.Seq,
			Prev:    wire.Prev,
			Payload: wire.Payload,
		})
		if err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrChain, i, err)
		}
		head = digest

		payloadBytes := []byte(wire.Payload)
		if !isCanonical(payloadBytes) {
			return report, fmt.Errorf("%w: step %d payload is not canonical", ErrSemantics, i)
		}
		var step stepPayload
		if err := strictDecode(payloadBytes, &step); err != nil {
			return report, fmt.Errorf("%w: step %d: %v", ErrSemantics, i, err)
		}
		if step.Step != i {
			return report, fmt.Errorf("%w: step %d payload says step %d", ErrSemantics, i, step.Step)
		}
		if !validOwner.MatchString(step.Worker) {
			return report, fmt.Errorf("%w: step %d worker %q is invalid", ErrSemantics, i, step.Worker)
		}
		base, err := digestOf(map[string]any{"salt": man.Salt, "step": i})
		if err != nil {
			return report, err
		}
		wantDigest, err := digestOf(map[string]any{"base": base, "prev": prevResult})
		if err != nil {
			return report, err
		}
		if step.Digest != wantDigest {
			return report, fmt.Errorf("%w: step %d work digest is not the pinned derivation", ErrSemantics, i)
		}
		wantResult, err := digestOf(map[string]any{"do": wantDigest})
		if err != nil {
			return report, err
		}
		if step.Result != wantResult {
			return report, fmt.Errorf("%w: step %d result is not effect(digest)", ErrSemantics, i)
		}
		digests[i] = step.Digest
		results[i] = step.Result
		workers[i] = step.Worker
		prevResult = step.Result
	}
	report.Head = head
	report.Steps = man.Steps

	// GV3: registers in bijection with journal digests.
	registerLines, err := readLines(filepath.Join(dir, "registers.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrCommitment, err)
	}
	if len(registerLines) != man.Steps {
		return report, fmt.Errorf(
			"%w: %d registers for %d steps",
			ErrCommitment, len(registerLines), man.Steps,
		)
	}
	resultByDigest := make(map[string]string, man.Steps)
	workerByDigest := make(map[string]string, man.Steps)
	for i, d := range digests {
		resultByDigest[d] = results[i]
		workerByDigest[d] = workers[i]
	}
	fenceByDigest := make(map[string]uint64, man.Steps)
	steals := 0
	prevDigest := ""
	for n, line := range registerLines {
		if !isCanonical(line) {
			return report, fmt.Errorf("%w: register line %d is not canonical", ErrCommitment, n)
		}
		var reg registerLine
		if err := strictDecode(line, &reg); err != nil {
			return report, fmt.Errorf("%w: register line %d: %v", ErrCommitment, n, err)
		}
		if reg.Digest <= prevDigest {
			return report, fmt.Errorf("%w: registers not strictly digest-sorted at line %d", ErrCommitment, n)
		}
		prevDigest = reg.Digest
		want, known := resultByDigest[reg.Digest]
		if !known {
			return report, fmt.Errorf("%w: register for unknown digest at line %d", ErrCommitment, n)
		}
		if reg.Result != want {
			return report, fmt.Errorf("%w: register result disagrees with journal at line %d", ErrCommitment, n)
		}
		if reg.Fence < 1 {
			return report, fmt.Errorf("%w: register fence < 1 at line %d", ErrCommitment, n)
		}
		if _, dup := fenceByDigest[reg.Digest]; dup {
			return report, fmt.Errorf("%w: duplicate register for a digest at line %d", ErrCommitment, n)
		}
		fenceByDigest[reg.Digest] = reg.Fence
		if reg.Fence > 1 {
			steals++
		}
	}
	report.Steals = steals

	// GV4 + GV5: the physical-execution ledger.
	ledgerFiles, err := filepath.Glob(filepath.Join(dir, "ledger", "*.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrLedger, err)
	}
	sort.Strings(ledgerFiles)
	nonces := make(map[string]bool)
	ownersSeen := make(map[string]bool)
	ownerByDigestFence := make(map[string]string)
	ranByDigestFence := make(map[string]bool)
	totalRuns := 0
	for _, file := range ledgerFiles {
		owner := strings.TrimSuffix(filepath.Base(file), ".ndjson")
		if !validOwner.MatchString(owner) {
			return report, fmt.Errorf("%w: invalid ledger owner file %q", ErrLedger, filepath.Base(file))
		}
		lines, err := readLines(file)
		if err != nil {
			return report, fmt.Errorf("%w: %v", ErrLedger, err)
		}
		for n, line := range lines {
			var run ledgerLine
			if err := strictDecode(line, &run); err != nil {
				return report, fmt.Errorf("%w: %s line %d: %v", ErrLedger, owner, n, err)
			}
			if run.Owner != owner {
				return report, fmt.Errorf("%w: %s line %d claims owner %q", ErrLedger, owner, n, run.Owner)
			}
			if _, known := resultByDigest[run.Digest]; !known {
				return report, fmt.Errorf("%w: %s line %d names unknown digest", ErrLedger, owner, n)
			}
			if run.Nonce == "" || nonces[run.Nonce] {
				return report, fmt.Errorf("%w: %s line %d nonce empty or reused", ErrLedger, owner, n)
			}
			nonces[run.Nonce] = true
			key := run.Digest + "/" + strconv.FormatUint(run.Fence, 10)
			if prior, held := ownerByDigestFence[key]; held && prior != owner {
				return report, fmt.Errorf(
					"%w: two owners ran (digest,fence) %s — fencing violated",
					ErrLedger, key,
				)
			}
			ownerByDigestFence[key] = owner
			ranByDigestFence[key] = true
			ownersSeen[owner] = true
			totalRuns++
		}
	}
	for digest, fence := range fenceByDigest {
		key := digest + "/" + strconv.FormatUint(fence, 10)
		if !ranByDigestFence[key] {
			return report, fmt.Errorf(
				"%w: committed fence has no physical run for digest %s",
				ErrLedger, digest,
			)
		}
		if ownerByDigestFence[key] != workerByDigest[digest] {
			return report, fmt.Errorf(
				"%w: digest %s journaled by %q but committed fence ran under %q",
				ErrLedger, digest, workerByDigest[digest], ownerByDigestFence[key],
			)
		}
	}
	dupRuns := totalRuns - man.Steps
	if dupRuns < 0 {
		return report, fmt.Errorf("%w: fewer ledger lines than steps", ErrLedger)
	}
	if dupRuns != man.DupRuns {
		return report, fmt.Errorf(
			"%w: manifest claims %d dup runs, ledger shows %d",
			ErrLedger, man.DupRuns, dupRuns,
		)
	}
	if len(ownersSeen) != man.Workers {
		return report, fmt.Errorf(
			"%w: manifest claims %d workers, ledger shows %d owners",
			ErrLedger, man.Workers, len(ownersSeen),
		)
	}
	if steals != man.Steals {
		return report, fmt.Errorf(
			"%w: manifest claims %d steals, registers show %d",
			ErrLedger, man.Steals, steals,
		)
	}
	report.DupRuns = dupRuns
	report.Workers = len(ownersSeen)

	// GV6: replay — fold the state and compare digests.
	state := make(map[string]any, man.Steps)
	for i, r := range results {
		state[strconv.Itoa(i)] = r
	}
	stateDigest, err := digestOf(state)
	if err != nil {
		return report, err
	}
	if stateDigest != man.StateDigest {
		return report, fmt.Errorf(
			"%w: recomputed state digest %s != claimed %s",
			ErrReplay, stateDigest, man.StateDigest,
		)
	}
	report.StateDigest = stateDigest

	// GV7: the counterfactual cone.
	var cf cfClaim
	if err := readCanonicalJSON(filepath.Join(dir, "counterfactual.json"), &cf); err != nil {
		return report, fmt.Errorf("%w: %v", ErrG1Manifest, err)
	}
	if cf.Position != man.CfPosition {
		return report, fmt.Errorf("%w: position disagrees with manifest", ErrCounterfactual)
	}
	if cf.Position < 0 || cf.Position > man.Steps-floors.ConeMin {
		return report, fmt.Errorf(
			"%w: position %d leaves a cone smaller than %d",
			ErrCounterfactual, cf.Position, floors.ConeMin,
		)
	}
	pinnedAlt, err := digestOf(map[string]any{"cf": digests[cf.Position]})
	if err != nil {
		return report, err
	}
	if cf.Result != pinnedAlt {
		return report, fmt.Errorf("%w: substituted result is not the pinned alternative", ErrCounterfactual)
	}
	cfState := make(map[string]any, man.Steps)
	for i := 0; i < cf.Position; i++ {
		cfState[strconv.Itoa(i)] = results[i]
	}
	primeResult := pinnedAlt
	cfState[strconv.Itoa(cf.Position)] = primeResult
	for i := cf.Position + 1; i < man.Steps; i++ {
		base, err := digestOf(map[string]any{"salt": man.Salt, "step": i})
		if err != nil {
			return report, err
		}
		primeDigest, err := digestOf(map[string]any{"base": base, "prev": primeResult})
		if err != nil {
			return report, err
		}
		primeResult, err = digestOf(map[string]any{"do": primeDigest})
		if err != nil {
			return report, err
		}
		cfState[strconv.Itoa(i)] = primeResult
	}
	cfStateDigest, err := digestOf(cfState)
	if err != nil {
		return report, err
	}
	if cfStateDigest != cf.StateDigest {
		return report, fmt.Errorf(
			"%w: recomputed cone state %s != claimed %s",
			ErrCounterfactual, cfStateDigest, cf.StateDigest,
		)
	}
	report.CfPosition = cf.Position
	report.CfStateDigest = cfStateDigest

	// GV8: the storm floors.
	stormLines, err := readLines(filepath.Join(dir, "storm.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrFloor, err)
	}
	kills, restarts, err := verifyStorm(stormLines, ownersSeen, true)
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrFloor, err)
	}
	report.Kills = kills
	report.ServerRestarts = restarts
	if man.Steps < floors.Steps {
		return report, fmt.Errorf("%w: steps %d < %d", ErrFloor, man.Steps, floors.Steps)
	}
	if len(ownersSeen) < floors.Workers {
		return report, fmt.Errorf("%w: workers %d < %d", ErrFloor, len(ownersSeen), floors.Workers)
	}
	if kills < floors.Kills {
		return report, fmt.Errorf("%w: kills %d < %d", ErrFloor, kills, floors.Kills)
	}
	if restarts < floors.ServerRestarts {
		return report, fmt.Errorf("%w: server restarts %d < %d", ErrFloor, restarts, floors.ServerRestarts)
	}
	if steals < floors.Steals {
		return report, fmt.Errorf("%w: steals %d < %d", ErrFloor, steals, floors.Steals)
	}

	return report, nil
}

// verifyStorm binds attested adversary events to known actors and rejects
// impossible timestamps. Server restarts have one pinned target; all worker
// actions must resolve to an actor supplied by the verifier's evidence.
func verifyStorm(lines [][]byte, workerTargets map[string]bool, allowServerRestart bool) (int, int, error) {
	kills, restarts := 0, 0
	var previousAt int64
	for n, line := range lines {
		if !isCanonical(line) {
			return 0, 0, fmt.Errorf("storm line %d is not canonical", n)
		}
		var event stormLine
		if err := strictDecode(line, &event); err != nil {
			return 0, 0, fmt.Errorf("storm line %d: %v", n, err)
		}
		if event.At <= 0 || (n > 0 && event.At < previousAt) {
			return 0, 0, fmt.Errorf("storm line %d timestamp %d is not positive and ordered", n, event.At)
		}
		previousAt = event.At
		switch event.Action {
		case "kill":
			if !workerTargets[event.Target] {
				return 0, 0, fmt.Errorf("storm line %d kill target %q is not a known worker", n, event.Target)
			}
			kills++
		case "spawn", "resume":
			if !workerTargets[event.Target] {
				return 0, 0, fmt.Errorf("storm line %d %s target %q is not a known worker", n, event.Action, event.Target)
			}
		case "restart-server":
			if !allowServerRestart || event.Target != "nats-server" {
				return 0, 0, fmt.Errorf("storm line %d restart target %q is not the pinned server", n, event.Target)
			}
			restarts++
		default:
			return 0, 0, fmt.Errorf("storm line %d unknown action %q", n, event.Action)
		}
	}
	return kills, restarts, nil
}

func digestOf(v any) (string, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	encoded, err := canonical.Canonicalize(raw)
	if err != nil {
		return "", err
	}
	return canonical.DigestHex(encoded), nil
}

func isCanonical(data []byte) bool {
	encoded, err := canonical.Canonicalize(data)
	return err == nil && bytes.Equal(encoded, data)
}

func strictDecode(data []byte, target any) error {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	var trailing struct{}
	if err := decoder.Decode(&trailing); err == nil || err.Error() != "EOF" {
		return errors.New("trailing JSON")
	}
	return nil
}

func readCanonicalJSON(path string, target any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if !isCanonical(data) {
		return fmt.Errorf("%s is not canonical JSON bytes", filepath.Base(path))
	}
	return strictDecode(data, target)
}

func readLines(path string) ([][]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	raw := bytes.Split(data, []byte("\n"))
	lines := make([][]byte, 0, len(raw))
	for _, line := range raw {
		line = bytes.TrimSuffix(line, []byte("\r"))
		if len(line) == 0 {
			continue
		}
		lines = append(lines, line)
	}
	return lines, nil
}
