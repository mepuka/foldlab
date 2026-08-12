package transfleet

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"foldlab/canonical"
	"foldlab/effector"
	"foldlab/journal"
)

func ExportBundle(ctx context.Context, url, bundle, salt string) error {
	connection, js, err := connect(ctx, url, "rg-a-export")
	if err != nil {
		return err
	}
	defer connection.Close()

	openedJournal, openedEffector, err := openPrimitives(ctx, js)
	if err != nil {
		return err
	}
	opCtx, cancel := operationContext(ctx)
	entries, cursor, err := openedJournal.Read(
		opCtx,
		journal.Cursor{Seq: -1, Head: canonical.Genesis},
		0,
	)
	cancel()
	if err != nil {
		return fmt.Errorf("read journal for export: %w", err)
	}
	if len(entries) != TotalStates || cursor.Seq != TotalStates-1 {
		return fmt.Errorf("journal has %d of %d states", len(entries), TotalStates)
	}

	opCtx, cancel = operationContext(ctx)
	rawStream, err := js.Stream(opCtx, "J_"+workflowName)
	cancel()
	if err != nil {
		return fmt.Errorf("open raw journal stream: %w", err)
	}
	rawLines := make([][]byte, TotalStates)
	digestByState := make(map[State]string, TotalStates)
	resultByDigest := make(map[string]string, TotalStates)
	stateResults := make(map[string]any, TotalStates)
	seen := make(map[State]bool, TotalStates)
	for position, entry := range entries {
		payload, digest, decodeErr := decodePayload(entry.Payload, salt)
		if decodeErr != nil {
			return fmt.Errorf("decode journal position %d: %w", position, decodeErr)
		}
		if seen[payload.State] {
			return fmt.Errorf("state (%d,%d) appears twice", payload.State.X, payload.State.Y)
		}
		seen[payload.State] = true
		digestByState[payload.State] = digest
		resultByDigest[digest] = payload.Result
		stateResults[stateKey(payload.State)] = payload.Result

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
		rawLines[position] = append([]byte(nil), stored.Data...)
	}
	if len(seen) != TotalStates {
		return fmt.Errorf("journal has %d distinct states", len(seen))
	}
	if err := writeRawLines(filepath.Join(bundle, "journal.ndjson"), rawLines); err != nil {
		return fmt.Errorf("export raw journal: %w", err)
	}

	registers := make([]Register, 0, TotalStates)
	for state, digest := range digestByState {
		opCtx, cancel = operationContext(ctx)
		registerState, outcome, lookupErr := openedEffector.Lookup(opCtx, digest)
		cancel()
		if lookupErr != nil {
			return fmt.Errorf("lookup register (%d,%d): %w", state.X, state.Y, lookupErr)
		}
		if registerState != effector.Committed {
			return fmt.Errorf("register (%d,%d) is %s", state.X, state.Y, registerState)
		}
		if outcome.Result != resultByDigest[digest] {
			return fmt.Errorf("register (%d,%d) disagrees with journal", state.X, state.Y)
		}
		registers = append(registers, Register{
			Digest: digest,
			Fence:  outcome.Fence,
			Result: outcome.Result,
		})
	}
	sort.Slice(registers, func(i, j int) bool { return registers[i].Digest < registers[j].Digest })
	registerLines := make([]any, len(registers))
	for index, register := range registers {
		registerLines[index] = register
	}
	if err := writeCanonicalLines(filepath.Join(bundle, "registers.ndjson"), registerLines); err != nil {
		return fmt.Errorf("export registers: %w", err)
	}

	stateDigest, err := digestOf(stateResults)
	if err != nil {
		return err
	}
	if err := writeCanonicalFile(filepath.Join(bundle, "manifest.json"), Manifest{
		Expansions:  TotalStates,
		N:           N,
		Salt:        salt,
		StateDigest: stateDigest,
		Workers:     Workers,
	}); err != nil {
		return fmt.Errorf("export manifest: %w", err)
	}
	if err := os.Mkdir(filepath.Join(bundle, "viz"), 0o755); err != nil {
		return err
	}
	if err := RenderSVG(bundle); err != nil {
		return fmt.Errorf("render bundle SVG: %w", err)
	}
	return nil
}
