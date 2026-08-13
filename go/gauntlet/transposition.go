// COORDINATOR-OWNED — the RG-A fitness function
// (docs/gauntlet/RG-A-transposition.md). Climbers build fleets that
// produce bundles this accepts; they do not edit it.
package gauntlet

import (
	"errors"
	"fmt"
	"math/big"
	"path/filepath"
	"sort"
	"strconv"

	"foldlab/canonical"
)

// TransFloors are RG-A's hardness minima. RGA is the pinned rung.
type TransFloors struct {
	N           int
	Workers     int
	MinSharePct int
}

var RGA = TransFloors{N: 40, Workers: 8, MinSharePct: 5}

var (
	ErrEconomy       = errors.New("gauntlet: economy refused (TV6)")
	ErrFrontier      = errors.New("gauntlet: frontier order refused (TV4)")
	ErrCompleteness  = errors.New("gauntlet: completeness refused (TV3)")
	ErrParticipation = errors.New("gauntlet: participation refused (TV7)")
)

// TransReport is what a passing bundle proved, by recomputation.
type TransReport struct {
	N              int
	States         int
	Workers        int
	Head           string
	StateDigest    string
	PathTreeNodes  string // sum over states of C(x+y, x), exact
	CollapseFactor string // PathTreeNodes / States, integer division
	MinWorkerShare int    // smallest per-worker expansion count
}

type transManifest struct {
	Expansions  int    `json:"expansions"`
	N           int    `json:"n"`
	Salt        string `json:"salt"`
	StateDigest string `json:"state_digest"`
	Workers     int    `json:"workers"`
}

type latticeState struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type transPayload struct {
	Result string       `json:"result"`
	State  latticeState `json:"state"`
	Worker string       `json:"worker"`
}

// VerifyTransposition checks an RG-A bundle against TV1-TV8 at the
// given floors.
func VerifyTransposition(dir string, floors TransFloors) (TransReport, error) {
	var report TransReport

	var man transManifest
	if err := readCanonicalJSON(filepath.Join(dir, "manifest.json"), &man); err != nil {
		return report, fmt.Errorf("%w: %v", ErrManifest, err)
	}
	if !hex64.MatchString(man.Salt) {
		return report, fmt.Errorf("%w: salt is not 64 hex chars", ErrManifest)
	}
	if !hex64.MatchString(man.StateDigest) {
		return report, fmt.Errorf("%w: state_digest is not 64 hex chars", ErrManifest)
	}
	if man.N < 1 {
		return report, fmt.Errorf("%w: n must be positive", ErrManifest)
	}
	states := (man.N + 1) * (man.N + 1)
	if man.Expansions != states {
		return report, fmt.Errorf(
			"%w: manifest expansions %d != (n+1)^2 = %d",
			ErrManifest, man.Expansions, states,
		)
	}

	// TV1 + TV2: chain walk with pinned-derivation recomputation.
	journalLines, err := readLines(filepath.Join(dir, "journal.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrChain, err)
	}
	if len(journalLines) != states {
		return report, fmt.Errorf(
			"%w: journal has %d entries for %d states",
			ErrCompleteness, len(journalLines), states,
		)
	}

	head, err := walkChain(journalLines)
	if err != nil {
		return report, err
	}
	report.Head = head

	seen := make(map[latticeState]int, states) // state -> journal position
	workerOf := make(map[latticeState]string, states)
	resultOf := make(map[string]string, states) // digest -> result
	digestByState := make(map[latticeState]string, states)
	for i, line := range journalLines {
		var wire wireEntry
		if err := strictDecode(line, &wire); err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrChain, i, err)
		}
		payloadBytes := []byte(wire.Payload)
		if !isCanonical(payloadBytes) {
			return report, fmt.Errorf("%w: entry %d payload not canonical", ErrSemantics, i)
		}
		var p transPayload
		if err := strictDecode(payloadBytes, &p); err != nil {
			return report, fmt.Errorf("%w: entry %d: %v", ErrSemantics, i, err)
		}
		s := p.State
		if s.X < 0 || s.X > man.N || s.Y < 0 || s.Y > man.N {
			return report, fmt.Errorf("%w: entry %d state out of bounds", ErrSemantics, i)
		}
		if !validOwner.MatchString(p.Worker) {
			return report, fmt.Errorf("%w: entry %d worker name invalid", ErrSemantics, i)
		}
		d, err := digestOf(map[string]any{"salt": man.Salt, "x": s.X, "y": s.Y})
		if err != nil {
			return report, err
		}
		r, err := digestOf(map[string]any{"do": d})
		if err != nil {
			return report, err
		}
		if p.Result != r {
			return report, fmt.Errorf("%w: entry %d result is not effect(digest)", ErrSemantics, i)
		}
		// TV3: no repeats.
		if _, dup := seen[s]; dup {
			return report, fmt.Errorf(
				"%w: state (%d,%d) journaled twice",
				ErrCompleteness, s.X, s.Y,
			)
		}
		// TV4: parents precede children.
		if s.X > 0 {
			if _, ok := seen[latticeState{X: s.X - 1, Y: s.Y}]; !ok {
				return report, fmt.Errorf(
					"%w: state (%d,%d) at entry %d precedes its parent (%d,%d)",
					ErrFrontier, s.X, s.Y, i, s.X-1, s.Y,
				)
			}
		}
		if s.Y > 0 {
			if _, ok := seen[latticeState{X: s.X, Y: s.Y - 1}]; !ok {
				return report, fmt.Errorf(
					"%w: state (%d,%d) at entry %d precedes its parent (%d,%d)",
					ErrFrontier, s.X, s.Y, i, s.X, s.Y-1,
				)
			}
		}
		seen[s] = i
		workerOf[s] = p.Worker
		resultOf[d] = r
		digestByState[s] = d
	}
	// TV3: none missing (count + no-repeat over the exact domain).
	if len(seen) != states {
		return report, fmt.Errorf("%w: %d distinct states of %d", ErrCompleteness, len(seen), states)
	}
	report.States = states
	report.N = man.N

	// TV5: registers in bijection with states.
	registerLines, err := readLines(filepath.Join(dir, "registers.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrCommitment, err)
	}
	if len(registerLines) != states {
		return report, fmt.Errorf(
			"%w: %d registers for %d states",
			ErrCommitment, len(registerLines), states,
		)
	}
	fenceByDigest := make(map[string]uint64, states)
	prevDigest := ""
	for n, line := range registerLines {
		if !isCanonical(line) {
			return report, fmt.Errorf("%w: register line %d not canonical", ErrCommitment, n)
		}
		var reg registerLine
		if err := strictDecode(line, &reg); err != nil {
			return report, fmt.Errorf("%w: register line %d: %v", ErrCommitment, n, err)
		}
		if reg.Digest <= prevDigest {
			return report, fmt.Errorf("%w: registers not digest-sorted at line %d", ErrCommitment, n)
		}
		prevDigest = reg.Digest
		want, known := resultOf[reg.Digest]
		if !known {
			return report, fmt.Errorf("%w: register for unknown digest at line %d", ErrCommitment, n)
		}
		if reg.Result != want {
			return report, fmt.Errorf("%w: register result disagrees at line %d", ErrCommitment, n)
		}
		if reg.Fence < 1 {
			return report, fmt.Errorf("%w: register fence < 1 at line %d", ErrCommitment, n)
		}
		fenceByDigest[reg.Digest] = reg.Fence
	}

	// TV6: economy + fencing + expander-appends.
	ledgerFiles, err := filepath.Glob(filepath.Join(dir, "ledger", "*.ndjson"))
	if err != nil {
		return report, fmt.Errorf("%w: %v", ErrLedger, err)
	}
	sort.Strings(ledgerFiles)
	nonces := make(map[string]bool)
	ownerByDigestFence := make(map[string]string)
	expansionsByOwner := make(map[string]int)
	totalRuns := 0
	for _, file := range ledgerFiles {
		owner := filepath.Base(file)
		owner = owner[:len(owner)-len(".ndjson")]
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
			if _, known := resultOf[run.Digest]; !known {
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
			expansionsByOwner[owner]++
			totalRuns++
		}
	}
	if totalRuns != states {
		return report, fmt.Errorf(
			"%w: %d physical expansions for %d states — surplus or missing",
			ErrEconomy, totalRuns, states,
		)
	}
	for s, d := range digestByState {
		fence := fenceByDigest[d]
		key := d + "/" + strconv.FormatUint(fence, 10)
		runner, ran := ownerByDigestFence[key]
		if !ran {
			return report, fmt.Errorf(
				"%w: committed fence for state (%d,%d) has no physical run",
				ErrLedger, s.X, s.Y,
			)
		}
		if runner != workerOf[s] {
			return report, fmt.Errorf(
				"%w: state (%d,%d) journaled by %q but expanded by %q",
				ErrLedger, s.X, s.Y, workerOf[s], runner,
			)
		}
	}

	// TV7: participation.
	if len(expansionsByOwner) != man.Workers {
		return report, fmt.Errorf(
			"%w: manifest claims %d workers, ledger shows %d owners",
			ErrParticipation, man.Workers, len(expansionsByOwner),
		)
	}
	if len(expansionsByOwner) < floors.Workers {
		return report, fmt.Errorf(
			"%w: workers %d < %d",
			ErrParticipation, len(expansionsByOwner), floors.Workers,
		)
	}
	if man.N < floors.N {
		return report, fmt.Errorf("%w: n %d < %d", ErrParticipation, man.N, floors.N)
	}
	minShare := (states * floors.MinSharePct) / 100
	minSeen := states
	for owner, count := range expansionsByOwner {
		if count < minShare {
			return report, fmt.Errorf(
				"%w: worker %q expanded %d states, floor is %d (%d%% of %d)",
				ErrParticipation, owner, count, minShare, floors.MinSharePct, states,
			)
		}
		if count < minSeen {
			minSeen = count
		}
	}
	report.Workers = len(expansionsByOwner)
	report.MinWorkerShare = minSeen

	// TV8: replay + the collapse factor.
	state := make(map[string]any, states)
	for s, d := range digestByState {
		state[strconv.Itoa(s.X)+","+strconv.Itoa(s.Y)] = resultOf[d]
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

	treeNodes := pathTreeNodes(man.N)
	report.PathTreeNodes = treeNodes.String()
	report.CollapseFactor = new(big.Int).Div(treeNodes, big.NewInt(int64(states))).String()

	return report, nil
}

// pathTreeNodes counts the nodes of the unfolded path tree over L(n):
// sum over states (x,y) of C(x+y, x), exactly.
func pathTreeNodes(n int) *big.Int {
	total := new(big.Int)
	for x := 0; x <= n; x++ {
		for y := 0; y <= n; y++ {
			total.Add(total, new(big.Int).Binomial(int64(x+y), int64(x)))
		}
	}
	return total
}

func genesisHead() string { return canonical.Genesis }

func entryHead(w wireEntry) (string, error) {
	return canonical.EntryDigest(canonical.ChainEntry{Seq: w.Seq, Prev: w.Prev, Payload: w.Payload})
}

// walkChain verifies TV1 over raw journal lines and returns the head.
func walkChain(lines [][]byte) (string, error) {
	head := genesisHead()
	for i, line := range lines {
		if !isCanonical(line) {
			return "", fmt.Errorf("%w: entry %d bytes are not canonical", ErrChain, i)
		}
		var wire wireEntry
		if err := strictDecode(line, &wire); err != nil {
			return "", fmt.Errorf("%w: entry %d: %v", ErrChain, i, err)
		}
		if wire.Seq != int64(i) {
			return "", fmt.Errorf("%w: entry %d has seq %d", ErrChain, i, wire.Seq)
		}
		if wire.Prev != head {
			return "", fmt.Errorf("%w: entry %d prev does not match head", ErrChain, i)
		}
		digest, err := entryHead(wire)
		if err != nil {
			return "", fmt.Errorf("%w: entry %d: %v", ErrChain, i, err)
		}
		head = digest
	}
	return head, nil
}
