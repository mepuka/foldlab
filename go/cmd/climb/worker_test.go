package main

import (
	"fmt"
	"sync"
	"testing"
)

func TestEnsureReservesTheLastCallAndSpendBudget(t *testing.T) {
	e, _, _, err := openEngine(t.TempDir(), true)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(e.close)

	e.calls = capMaxCalls - 1
	e.spend = capSpendNano - int64(capMaxOutTok)*priceOutNano

	start := make(chan struct{})
	results := make(chan error, fleetSize)
	var workers sync.WaitGroup
	for index := 0; index < fleetSize; index++ {
		workers.Add(1)
		go func(index int) {
			defer workers.Done()
			<-start
			_, err := e.ensure(
				fmt.Sprintf("work-%d", index),
				fmt.Sprintf("worker-%d", index),
				fmt.Sprintf("prompt-%d", index),
				stepParams{MaxTokens: capMaxOutTok},
			)
			results <- err
		}(index)
	}
	close(start)
	workers.Wait()
	close(results)

	succeeded := 0
	for err := range results {
		if err == nil {
			succeeded++
		}
	}
	if succeeded != 1 {
		t.Fatalf("%d concurrent buyers succeeded with one call budget left, want exactly 1", succeeded)
	}
	if e.calls != capMaxCalls {
		t.Fatalf("calls = %d, want cap %d", e.calls, capMaxCalls)
	}
}
