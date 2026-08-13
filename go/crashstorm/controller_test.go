package crashstorm

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func TestControllerAbortsOnUnexpectedWorkerExit(t *testing.T) {
	want := errors.New("worker found a verifier violation")
	done := make(chan error, 1)
	done <- want
	controller := &Controller{workers: map[string]*workerProcess{
		"worker-00": {
			owner:   "worker-00",
			command: &exec.Cmd{},
			done:    done,
		},
	}}

	err := controller.observeWorkerExits()
	if err == nil {
		t.Fatal("unexpected worker exit was converted into a respawn")
	}
	if !strings.Contains(err.Error(), "worker-00") || !errors.Is(err, want) {
		t.Fatalf("observeWorkerExits() error = %v, want worker identity wrapping %v", err, want)
	}
}

func TestPreserveRuntimeLogsCopiesEvidenceWithoutTheStore(t *testing.T) {
	bundle := filepath.Join(t.TempDir(), "bundle")
	runtimeDir := filepath.Join(t.TempDir(), "runtime")
	if err := os.MkdirAll(filepath.Join(runtimeDir, "store"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(bundle, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(runtimeDir, "server.log"), []byte("server finding"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(runtimeDir, "worker-00.log"), []byte("worker finding"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(runtimeDir, "store", "state"), []byte("not a log"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := preserveRuntimeLogs(bundle, runtimeDir); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"server.log", "worker-00.log"} {
		if _, err := os.Stat(filepath.Join(bundle, "runtime-logs", name)); err != nil {
			t.Fatalf("preserved %s: %v", name, err)
		}
	}
	if _, err := os.Stat(filepath.Join(bundle, "runtime-logs", "store", "state")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("runtime store was preserved as evidence: %v", err)
	}
}

func TestControllerRespawnsOnlyWorkersItKilled(t *testing.T) {
	controller := &Controller{workers: map[string]*workerProcess{
		"controller-kill": {owner: "controller-kill", killedByController: true},
		"unexpected-exit": {owner: "unexpected-exit"},
	}}

	var spawned []string
	err := controller.respawnReadyWorkers(func(slot *workerProcess) error {
		spawned = append(spawned, slot.owner)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(spawned, []string{"controller-kill"}) {
		t.Fatalf("respawned workers = %v, want only the controller-killed worker", spawned)
	}
}
