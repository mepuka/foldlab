package main_test

import (
	"os"
	"testing"
)

// The frozen black-box harness predates the required sync-mode CLI. Set the
// explicit crash-durable choice in its inherited environment without editing
// the coordinator-owned conformance test.
func TestMain(m *testing.M) {
	if err := os.Setenv("FOLDLAB_SYNC_MODE", "crash-durable"); err != nil {
		panic(err)
	}
	os.Exit(m.Run())
}
