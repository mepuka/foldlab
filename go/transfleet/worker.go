package transfleet

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/effector"
	"foldlab/journal"
)

const claimLease = 30 * time.Minute

type worker struct {
	owner      string
	index      int
	salt       string
	bundle     string
	journal    *journal.Journal
	effector   *effector.Effector
	cursor     journal.Cursor
	discovered map[State]Payload
	expansions int
}

func RunWorker(ctx context.Context, url, bundle, salt, owner string, index int) error {
	if index < 0 || index >= Workers || WorkerName(index) != owner {
		return fmt.Errorf("worker identity %q/%d is invalid", owner, index)
	}
	connection, js, err := connect(ctx, url, "rg-a-"+owner)
	if err != nil {
		return err
	}
	defer connection.Close()

	openedJournal, openedEffector, err := openPrimitives(ctx, js)
	if err != nil {
		return err
	}
	w := &worker{
		owner:      owner,
		index:      index,
		salt:       salt,
		bundle:     bundle,
		journal:    openedJournal,
		effector:   openedEffector,
		cursor:     journal.Cursor{Seq: -1, Head: canonical.Genesis},
		discovered: make(map[State]Payload, TotalStates),
	}

	for len(w.discovered) < TotalStates {
		if err := w.refresh(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			time.Sleep(5 * time.Millisecond)
			continue
		}
		state, eligible := w.nextEligible()
		if !eligible {
			time.Sleep(2 * time.Millisecond)
			continue
		}
		if err := w.expand(ctx, state); err != nil {
			return err
		}
	}
	fmt.Printf("worker complete owner=%s expansions=%d\n", w.owner, w.expansions)
	return nil
}

func openPrimitives(
	ctx context.Context,
	js jetstream.JetStream,
) (*journal.Journal, *effector.Effector, error) {
	opCtx, cancel := operationContext(ctx)
	defer cancel()
	openedJournal, err := journal.Open(opCtx, js, workflowName)
	if err != nil {
		return nil, nil, err
	}
	openedEffector, err := effector.Open(opCtx, js, workflowName)
	if err != nil {
		return nil, nil, err
	}
	return openedJournal, openedEffector, nil
}

func (w *worker) refresh(ctx context.Context) error {
	opCtx, cancel := operationContext(ctx)
	entries, cursor, err := w.journal.Read(opCtx, w.cursor, 0)
	cancel()
	if err != nil {
		return err
	}
	for _, entry := range entries {
		payload, _, decodeErr := decodePayload(entry.Payload, w.salt)
		if decodeErr != nil {
			return fmt.Errorf("decode journal position %d: %w", entry.Seq, decodeErr)
		}
		if payload.Worker != WorkerName(OwnerIndex(payload.State)) {
			return fmt.Errorf(
				"state (%d,%d) has non-designated worker %q",
				payload.State.X,
				payload.State.Y,
				payload.Worker,
			)
		}
		if _, duplicate := w.discovered[payload.State]; duplicate {
			return fmt.Errorf("state (%d,%d) appears twice", payload.State.X, payload.State.Y)
		}
		if !parentsDiscovered(payload.State, w.discovered) {
			return fmt.Errorf("state (%d,%d) precedes a parent", payload.State.X, payload.State.Y)
		}
		w.discovered[payload.State] = payload
	}
	w.cursor = cursor
	return nil
}

func (w *worker) nextEligible() (State, bool) {
	candidates := make(map[State]bool, len(w.discovered)*2+1)
	if len(w.discovered) == 0 {
		candidates[State{}] = true
	}
	for parent := range w.discovered {
		if parent.X < N {
			candidates[State{X: parent.X + 1, Y: parent.Y}] = true
		}
		if parent.Y < N {
			candidates[State{X: parent.X, Y: parent.Y + 1}] = true
		}
	}
	for depth := 0; depth <= 2*N; depth++ {
		for x := 0; x <= N; x++ {
			y := depth - x
			if y < 0 || y > N {
				continue
			}
			state := State{X: x, Y: y}
			if !candidates[state] {
				continue
			}
			if OwnerIndex(state) != w.index {
				continue
			}
			if _, exists := w.discovered[state]; exists {
				continue
			}
			if parentsDiscovered(state, w.discovered) {
				return state, true
			}
		}
	}
	return State{}, false
}

func parentsDiscovered(state State, discovered map[State]Payload) bool {
	if state.X > 0 {
		if _, ok := discovered[State{X: state.X - 1, Y: state.Y}]; !ok {
			return false
		}
	}
	if state.Y > 0 {
		if _, ok := discovered[State{X: state.X, Y: state.Y - 1}]; !ok {
			return false
		}
	}
	return true
}

func (w *worker) expand(ctx context.Context, state State) error {
	digest, result, err := Derive(state, w.salt)
	if err != nil {
		return err
	}
	payload, err := encodePayload(state, result, w.owner)
	if err != nil {
		return err
	}

	for {
		opCtx, cancel := operationContext(ctx)
		registerState, outcome, lookupErr := w.effector.Lookup(opCtx, digest)
		cancel()
		if lookupErr != nil {
			time.Sleep(3 * time.Millisecond)
			continue
		}
		switch registerState {
		case effector.Committed:
			if outcome.Result != result {
				return fmt.Errorf("committed result for (%d,%d) disagrees", state.X, state.Y)
			}
			return w.appendDiscovery(ctx, state, payload)
		case effector.Held:
			time.Sleep(3 * time.Millisecond)
			continue
		case effector.Unclaimed:
		}

		opCtx, cancel = operationContext(ctx)
		claim, claimErr := w.effector.Claim(opCtx, digest, w.owner, claimLease)
		cancel()
		if claimErr != nil {
			if errors.Is(claimErr, effector.ErrHeld) || errors.Is(claimErr, effector.ErrCommitted) {
				time.Sleep(2 * time.Millisecond)
				continue
			}
			time.Sleep(5 * time.Millisecond)
			continue
		}

		// The physical expansion is durable before its result can cross
		// into the register. Commit retries reuse this one execution.
		if err := appendLedger(w.bundle, w.owner, digest, claim.Fence); err != nil {
			return fmt.Errorf("append physical ledger for (%d,%d): %w", state.X, state.Y, err)
		}
		w.expansions++
		for {
			opCtx, cancel = operationContext(ctx)
			_, commitErr := w.effector.Commit(opCtx, claim, result)
			cancel()
			if commitErr == nil {
				return w.appendDiscovery(ctx, state, payload)
			}
			if errors.Is(commitErr, effector.ErrFenced) || errors.Is(commitErr, effector.ErrCommitted) {
				return fmt.Errorf("commit refused for (%d,%d): %w", state.X, state.Y, commitErr)
			}
			time.Sleep(3 * time.Millisecond)
		}
	}
}

func (w *worker) appendDiscovery(ctx context.Context, state State, payload string) error {
	for {
		if existing, discovered := w.discovered[state]; discovered {
			if existing.Worker != w.owner || existing.Result == "" || payload != mustPayload(existing) {
				return fmt.Errorf("state (%d,%d) was journaled by a different expansion", state.X, state.Y)
			}
			return nil
		}
		entry := canonical.ChainEntry{
			Seq:     w.cursor.Seq + 1,
			Prev:    w.cursor.Head,
			Payload: payload,
		}
		opCtx, cancel := operationContext(ctx)
		_, appendErr := w.journal.AppendEntry(opCtx, entry)
		cancel()
		if appendErr == nil {
			head, err := canonical.EntryDigest(entry)
			if err != nil {
				return err
			}
			w.cursor = journal.Cursor{
				Seq:  entry.Seq,
				Head: head,
			}
			decoded, _, err := decodePayload(payload, w.salt)
			if err != nil {
				return err
			}
			w.discovered[state] = decoded
			return nil
		}
		if err := w.refresh(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
		}
		time.Sleep(1 * time.Millisecond)
	}
}

func mustPayload(payload Payload) string {
	encoded, err := canonicalBytes(payload)
	if err != nil {
		panic(err)
	}
	return string(encoded)
}
