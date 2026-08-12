// COORDINATOR-OWNED — the sidecar conformance gate. Do not edit.
//
// In-concert review finding F1 (measured): the TS-side trustless fold and
// the Go-side read verification MASK EACH OTHER — a journald whose read
// handler verifies nothing still passes all 53 TypeScript laws, because the
// TS store re-folds every read. This test closes that hole from the Go side:
// it is black-box (builds the binary, speaks the pinned NDJSON protocol over
// stdio) and proves the sidecar's OWN read refuses a tampered journal.
package main_test

import (
	"bufio"
	"encoding/json"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

type resp map[string]any

type sidecar struct {
	t     *testing.T
	cmd   *exec.Cmd
	stdin *json.Encoder
	lines chan string
}

func buildJournald(t *testing.T) string {
	t.Helper()
	bin := filepath.Join(t.TempDir(), "journald")
	if runtime.GOOS == "windows" {
		bin += ".exe"
	}
	out, err := exec.Command("go", "build", "-o", bin, ".").CombinedOutput()
	if err != nil {
		t.Fatalf("go build journald: %v\n%s", err, out)
	}
	return bin
}

func spawn(t *testing.T, bin string) *sidecar {
	t.Helper()
	cmd := exec.Command(bin, "--store", t.TempDir())
	in, err := cmd.StdinPipe()
	if err != nil {
		t.Fatalf("stdin pipe: %v", err)
	}
	out, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("stdout pipe: %v", err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatalf("start journald: %v", err)
	}
	t.Cleanup(func() {
		_ = in.Close()
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	})

	lines := make(chan string, 16)
	go func() {
		scanner := bufio.NewScanner(out)
		scanner.Buffer(make([]byte, 0, 1<<20), 1<<24)
		for scanner.Scan() {
			lines <- scanner.Text()
		}
		close(lines)
	}()

	s := &sidecar{t: t, cmd: cmd, stdin: json.NewEncoder(in), lines: lines}
	ready := s.readLine()
	if !strings.Contains(ready, `"ready":true`) {
		t.Fatalf("first line is not the ready line: %q", ready)
	}
	return s
}

func (s *sidecar) readLine() string {
	s.t.Helper()
	select {
	case line, ok := <-s.lines:
		if !ok {
			s.t.Fatal("journald stdout closed unexpectedly")
		}
		return line
	case <-time.After(30 * time.Second):
		s.t.Fatal("timed out waiting for a journald response")
		return ""
	}
}

func (s *sidecar) request(body map[string]any) resp {
	s.t.Helper()
	if err := s.stdin.Encode(body); err != nil {
		s.t.Fatalf("write request: %v", err)
	}
	var r resp
	if err := json.Unmarshal([]byte(s.readLine()), &r); err != nil {
		s.t.Fatalf("response is not JSON: %v", err)
	}
	return r
}

func TestSidecarReadRefusesTamperedJournal(t *testing.T) {
	s := spawn(t, buildJournald(t))
	genesis := strings.Repeat("0", 64)

	if r := s.request(map[string]any{"id": 1, "op": "open", "name": "conf"}); r["ok"] != true {
		t.Fatalf("open: %v", r)
	}
	for i, payload := range []string{"a", "b"} {
		if r := s.request(map[string]any{"id": 2 + i, "op": "append", "name": "conf", "payload": payload}); r["ok"] != true {
			t.Fatalf("append %q: %v", payload, r)
		}
	}

	// the honest read succeeds with both entries
	honest := s.request(map[string]any{"id": 4, "op": "read", "name": "conf", "seq": -1, "head": genesis, "max": 0})
	if honest["ok"] != true {
		t.Fatalf("honest read refused: %v", honest)
	}
	entries, ok := honest["entries"].([]any)
	if !ok || len(entries) != 2 {
		t.Fatalf("honest read returned %v entries, want 2 (and `entries` must be present)", honest["entries"])
	}

	// a forged, unchained entry lands at a fresh CAS position (P3's EL9
	// ruling: appendEntry accepts the caller's entry as given)
	forged := map[string]any{"seq": 2, "prev": strings.Repeat("f", 64), "payload": "forged"}
	if r := s.request(map[string]any{"id": 5, "op": "appendEntry", "name": "conf", "entry": forged}); r["ok"] != true {
		t.Fatalf("forged appendEntry refused (must land; verification is read-side): %v", r)
	}

	// THE LAW: journald's OWN read refuses the tampered journal — reason
	// "tampered", no entries — with no TypeScript in the loop.
	refusal := s.request(map[string]any{"id": 6, "op": "read", "name": "conf", "seq": -1, "head": genesis, "max": 0})
	if refusal["ok"] != false {
		t.Fatalf("read over a forged tail succeeded: %v", refusal)
	}
	if refusal["reason"] != "tampered" {
		t.Fatalf("refusal reason is %v, want \"tampered\"", refusal["reason"])
	}
	if got, present := refusal["entries"].([]any); present && len(got) > 0 {
		t.Fatalf("refusal leaked %d entries", len(got))
	}
}
