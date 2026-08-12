package crashstorm

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"path/filepath"
	"sort"

	"foldlab/canonical"
	"foldlab/effector"
	"foldlab/journal"
)

type journalWire struct {
	Payload string `json:"payload"`
	Prev    string `json:"prev"`
	Seq     int    `json:"seq"`
}

func ExportBundle(ctx context.Context, url, bundle, seed, salt string) error {
	connection, js, err := connect(ctx, url, "g1-export")
	if err != nil {
		return err
	}
	defer connection.Close()

	opCtx, cancel := operationContext(ctx)
	openedJournal, err := journal.Open(opCtx, js, workflowName)
	cancel()
	if err != nil {
		return fmt.Errorf("open journal for export: %w", err)
	}
	opCtx, cancel = operationContext(ctx)
	entries, cursor, err := openedJournal.Read(
		opCtx,
		journal.Cursor{Seq: -1, Head: canonical.Genesis},
		0,
	)
	cancel()
	if err != nil {
		return fmt.Errorf("read journal for export: %w", err)
	}
	if len(entries) != Steps || cursor.Seq != Steps-1 {
		return fmt.Errorf("journal has %d of %d steps", len(entries), Steps)
	}

	digests := make([]string, Steps)
	results := make([]string, Steps)
	journalLines := make([][]byte, Steps)
	opCtx, cancel = operationContext(ctx)
	rawStream, err := js.Stream(opCtx, "J_"+workflowName)
	cancel()
	if err != nil {
		return fmt.Errorf("open raw journal stream: %w", err)
	}
	previousResult := ""
	for position, entry := range entries {
		step, decodeErr := decodeAndVerifyStep(entry.Payload, salt, position, previousResult)
		if decodeErr != nil {
			return decodeErr
		}
		opCtx, cancel = operationContext(ctx)
		stored, getErr := rawStream.GetMsg(opCtx, uint64(position+1))
		cancel()
		if getErr != nil {
			return fmt.Errorf("read raw journal position %d: %w", position, getErr)
		}
		wantWire, encodeErr := canonicalBytes(journalWire{
			Payload: entry.Payload,
			Prev:    entry.Prev,
			Seq:     entry.Seq,
		})
		if encodeErr != nil || !bytes.Equal(stored.Data, wantWire) {
			return fmt.Errorf("stored journal position %d is not the verified wire entry", position)
		}
		digests[position] = step.Digest
		results[position] = step.Result
		previousResult = step.Result
		journalLines[position] = append([]byte(nil), stored.Data...)
	}
	if err := writeRawLines(filepath.Join(bundle, "journal.ndjson"), journalLines); err != nil {
		return fmt.Errorf("export journal: %w", err)
	}

	opCtx, cancel = operationContext(ctx)
	openedEffector, err := effector.Open(opCtx, js, workflowName)
	cancel()
	if err != nil {
		return fmt.Errorf("open effector for export: %w", err)
	}
	registers := make([]Register, Steps)
	steals := 0
	for position, digest := range digests {
		opCtx, cancel = operationContext(ctx)
		state, outcome, lookupErr := openedEffector.Lookup(opCtx, digest)
		cancel()
		if lookupErr != nil {
			return fmt.Errorf("lookup register %d: %w", position, lookupErr)
		}
		if state != effector.Committed {
			return fmt.Errorf("register %d is %s, not committed", position, state)
		}
		if outcome.Result != results[position] {
			return fmt.Errorf("register %d result disagrees with journal", position)
		}
		registers[position] = Register{
			Digest: digest,
			Fence:  outcome.Fence,
			Result: outcome.Result,
		}
		if outcome.Fence > 1 {
			steals++
		}
	}
	sort.Slice(registers, func(i, j int) bool { return registers[i].Digest < registers[j].Digest })
	registerLines := make([]any, len(registers))
	for index, register := range registers {
		registerLines[index] = register
	}
	if err := writeCanonicalLines(filepath.Join(bundle, "registers.ndjson"), registerLines); err != nil {
		return fmt.Errorf("export registers: %w", err)
	}

	ledgerEvents, err := readLedgerEvents(bundle)
	if err != nil {
		return err
	}
	if len(ledgerEvents) < Steps {
		return fmt.Errorf("only %d physical executions for %d steps", len(ledgerEvents), Steps)
	}
	owners := make(map[string]bool, Workers)
	for _, event := range ledgerEvents {
		owners[event.Owner] = true
	}
	if len(owners) != Workers {
		return fmt.Errorf("physical ledger has %d of %d worker owners", len(owners), Workers)
	}

	state, err := stateDigest(results)
	if err != nil {
		return err
	}
	cfPosition := counterfactualPosition(seed)
	cfResult, cfState, err := buildCounterfactual(salt, digests, results, cfPosition)
	if err != nil {
		return err
	}
	if err := writeCanonicalFile(filepath.Join(bundle, "counterfactual.json"), Counterfactual{
		Position:    cfPosition,
		Result:      cfResult,
		StateDigest: cfState,
	}); err != nil {
		return err
	}
	return writeCanonicalFile(filepath.Join(bundle, "manifest.json"), Manifest{
		CfPosition:  cfPosition,
		DupRuns:     len(ledgerEvents) - Steps,
		Salt:        salt,
		Seed:        seed,
		StateDigest: state,
		Steals:      steals,
		Steps:       Steps,
		Workers:     Workers,
	})
}

func counterfactualPosition(seed string) int {
	digest := sha256.Sum256([]byte("foldlab.gauntlet.g1.cf:" + seed))
	return int(binary.BigEndian.Uint32(digest[:4]) % uint32(Steps-9))
}

func buildCounterfactual(
	salt string,
	digests []string,
	results []string,
	position int,
) (string, string, error) {
	alternative, err := digestOf(map[string]any{"cf": digests[position]})
	if err != nil {
		return "", "", err
	}
	cfResults := append([]string(nil), results...)
	cfResults[position] = alternative
	previous := alternative
	for next := position + 1; next < len(results); next++ {
		step, deriveErr := DeriveStep(salt, next, previous)
		if deriveErr != nil {
			return "", "", deriveErr
		}
		cfResults[next] = step.Result
		previous = step.Result
	}
	digest, err := stateDigest(cfResults)
	if err != nil {
		return "", "", err
	}
	return alternative, digest, nil
}
