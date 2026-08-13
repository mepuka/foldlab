package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func TestDefaultLifetimeExitsCleanlyWhenStdinCloses(t *testing.T) {
	binary := filepath.Join(t.TempDir(), "protod")
	if runtime.GOOS == "windows" {
		binary += ".exe"
	}
	build := exec.Command("go", "build", "-o", binary, ".")
	if output, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build the real protod binary: %v\n%s", err, output)
	}

	command := exec.Command(binary, "--store", t.TempDir())
	stdin, err := command.StdinPipe()
	if err != nil {
		t.Fatal(err)
	}
	stdout, err := command.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	var stderr bytes.Buffer
	command.Stderr = &stderr
	if err := command.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if command.ProcessState == nil || !command.ProcessState.Exited() {
			_ = command.Process.Kill()
		}
	})

	type readyResult struct {
		line []byte
		err  error
	}
	ready := make(chan readyResult, 1)
	go func() {
		line, err := bufio.NewReader(stdout).ReadBytes('\n')
		ready <- readyResult{line: line, err: err}
	}()

	var result readyResult
	select {
	case result = <-ready:
	case <-time.After(10 * time.Second):
		t.Fatalf("real protod process did not become ready; stderr: %s", stderr.String())
	}
	if result.err != nil {
		t.Fatalf("read ready line: %v; stderr: %s", result.err, stderr.String())
	}
	var fact struct {
		Ready bool   `json:"ready"`
		URL   string `json:"url"`
	}
	if err := json.Unmarshal(result.line, &fact); err != nil {
		t.Fatalf("decode ready line %q: %v", result.line, err)
	}
	if !fact.Ready || fact.URL == "" {
		t.Fatalf("invalid ready fact: %s", result.line)
	}

	if err := stdin.Close(); err != nil {
		t.Fatal(err)
	}
	exited := make(chan error, 1)
	go func() { exited <- command.Wait() }()
	select {
	case err := <-exited:
		if err != nil {
			t.Fatalf("default protod lifetime did not exit cleanly on stdin EOF: %v; stderr: %s", err, stderr.String())
		}
	case <-time.After(10 * time.Second):
		t.Fatal("default protod lifetime did not exit after stdin EOF")
	}
}
