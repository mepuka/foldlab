package crashstorm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/effector"
	"foldlab/journal"
)

const (
	claimLease    = 300 * time.Millisecond
	takeoverDelay = 35 * time.Millisecond
)

func RunWorker(
	ctx context.Context,
	url string,
	bundle string,
	salt string,
	owner string,
	ownerIndex int,
	paceFile string,
) error {
	connection, js, err := connect(ctx, url, "g1-"+owner)
	if err != nil {
		return err
	}
	defer connection.Close()

	cursor := journal.Cursor{Seq: -1, Head: canonical.Genesis}
	position := 0
	previousResult := ""
	observedPosition := -1
	var observedAt time.Time

	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		openedJournal, openedEffector, err := openWorkerPrimitives(ctx, js)
		if err != nil {
			time.Sleep(20 * time.Millisecond)
			continue
		}

		entries, nextCursor, err := readFrom(ctx, openedJournal, cursor)
		if err != nil {
			time.Sleep(20 * time.Millisecond)
			continue
		}
		for _, entry := range entries {
			entryPosition, positionErr := localPosition(entry.Seq)
			if positionErr != nil {
				return positionErr
			}
			step, decodeErr := decodeAndVerifyStep(entry.Payload, salt, entryPosition, previousResult)
			if decodeErr != nil {
				return decodeErr
			}
			position = entryPosition + 1
			previousResult = step.Result
		}
		cursor = nextCursor
		if position >= Steps {
			return nil
		}

		if observedPosition != position {
			observedPosition = position
			observedAt = time.Now()
		}
		if position%Workers != ownerIndex && time.Since(observedAt) < takeoverDelay {
			time.Sleep(2 * time.Millisecond)
			continue
		}

		step, err := DeriveStep(salt, position, previousResult)
		if err != nil {
			return err
		}
		state, outcome, err := lookup(ctx, openedEffector, step.Digest)
		if err != nil {
			time.Sleep(10 * time.Millisecond)
			continue
		}
		if state == effector.Committed {
			if outcome.Result != step.Result {
				return fmt.Errorf("committed result for step %d disagrees with derivation", position)
			}
			if appendStep(ctx, openedJournal, cursor, step) {
				head, err := canonical.EntryDigest(canonical.ChainEntry{
					Seq: int64(position), Prev: cursor.Head, Payload: mustStepPayload(step),
				})
				if err != nil {
					return err
				}
				cursor = journal.Cursor{
					Seq:  position,
					Head: head,
				}
				position++
				previousResult = step.Result
				observedPosition = -1
			}
			continue
		}

		claim, err := claimWork(ctx, openedEffector, step.Digest, owner)
		if err != nil {
			switch {
			case errors.Is(err, effector.ErrHeld), errors.Is(err, effector.ErrCommitted), errors.Is(err, effector.ErrFenced):
				time.Sleep(4 * time.Millisecond)
			default:
				time.Sleep(12 * time.Millisecond)
			}
			continue
		}

		// This append+fsync is the physical side effect. No result crosses
		// the body boundary until its evidence is durable in the owner ledger.
		if err := appendLedger(bundle, owner, step.Digest, claim.Fence); err != nil {
			return fmt.Errorf("append physical ledger: %w", err)
		}
		if delay := readPace(paceFile); delay > 0 {
			time.Sleep(delay)
		}
		if _, err := commitWork(ctx, openedEffector, claim, step.Result); err != nil {
			time.Sleep(5 * time.Millisecond)
			continue
		}
		if appendStep(ctx, openedJournal, cursor, step) {
			head, err := canonical.EntryDigest(canonical.ChainEntry{
				Seq: int64(position), Prev: cursor.Head, Payload: mustStepPayload(step),
			})
			if err != nil {
				return err
			}
			cursor = journal.Cursor{
				Seq:  position,
				Head: head,
			}
			position++
			previousResult = step.Result
			observedPosition = -1
		}
	}
}

func localPosition(seq int64) (int, error) {
	if seq < 0 || uint64(seq) >= uint64(^uint(0)>>1) {
		return 0, fmt.Errorf("journal seq %d exceeds platform index range", seq)
	}
	return int(seq), nil
}

func openWorkerPrimitives(
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

func readFrom(
	ctx context.Context,
	opened *journal.Journal,
	cursor journal.Cursor,
) ([]canonical.ChainEntry, journal.Cursor, error) {
	opCtx, cancel := operationContext(ctx)
	defer cancel()
	return opened.Read(opCtx, cursor, 0)
}

func lookup(
	ctx context.Context,
	opened *effector.Effector,
	digest string,
) (effector.State, effector.Outcome, error) {
	opCtx, cancel := operationContext(ctx)
	defer cancel()
	return opened.Lookup(opCtx, digest)
}

func claimWork(
	ctx context.Context,
	opened *effector.Effector,
	digest string,
	owner string,
) (effector.Claim, error) {
	opCtx, cancel := operationContext(ctx)
	defer cancel()
	return opened.Claim(opCtx, digest, owner, claimLease)
}

func commitWork(
	ctx context.Context,
	opened *effector.Effector,
	claim effector.Claim,
	result string,
) (bool, error) {
	opCtx, cancel := operationContext(ctx)
	defer cancel()
	return opened.Commit(opCtx, claim, result)
}

func appendStep(
	ctx context.Context,
	opened *journal.Journal,
	cursor journal.Cursor,
	step Step,
) bool {
	payload := mustStepPayload(step)
	entry := canonical.ChainEntry{Seq: int64(step.Step), Prev: cursor.Head, Payload: payload}
	opCtx, cancel := operationContext(ctx)
	defer cancel()
	_, err := opened.AppendEntry(opCtx, entry)
	return err == nil
}

func mustStepPayload(step Step) string {
	encoded, err := canonicalBytes(step)
	if err != nil {
		panic(err)
	}
	return string(encoded)
}

func decodeAndVerifyStep(payload, salt string, position int, previousResult string) (Step, error) {
	var step Step
	if err := json.Unmarshal([]byte(payload), &step); err != nil {
		return Step{}, fmt.Errorf("decode step %d: %w", position, err)
	}
	reencoded, err := canonicalBytes(step)
	if err != nil || !bytes.Equal(reencoded, []byte(payload)) {
		return Step{}, fmt.Errorf("step %d payload is not canonical", position)
	}
	want, err := DeriveStep(salt, position, previousResult)
	if err != nil {
		return Step{}, err
	}
	if step != want {
		return Step{}, fmt.Errorf("step %d payload disagrees with pinned derivation", position)
	}
	return step, nil
}

func readPace(path string) time.Duration {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	milliseconds, err := strconv.Atoi(strings.TrimSpace(string(raw)))
	if err != nil || milliseconds <= 0 {
		return 0
	}
	return time.Duration(milliseconds) * time.Millisecond
}
