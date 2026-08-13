package transfleet

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestControllerAbortsOnWorkerFailure(t *testing.T) {
	want := errors.New("worker found a verifier violation")
	controller := &Controller{workers: map[string]*workerProcess{
		"worker-00": {},
	}}
	exits := make(chan workerExit, 1)
	exits <- workerExit{owner: "worker-00", err: want}

	err := controller.waitForFleet(context.Background(), nil, exits)
	if err == nil || !errors.Is(err, want) || !strings.Contains(err.Error(), "worker-00") {
		t.Fatalf("waitForFleet() error = %v, want worker identity wrapping %v", err, want)
	}
}
