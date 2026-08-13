// R2 harness (climbing artifact, coordinator-executed — see
// docs/gauntlet/R2-verified-climb.md). Controller mode spawns the
// worker, hard-kills it once mid-run, resumes it, then runs the frozen
// verifier. `--fake` runs the same machinery against the deterministic
// offline provider: a $0 rehearsal of every law, gates included.
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"time"

	"foldlab/canonical"
	"foldlab/gauntlet"
)

func main() {
	if len(os.Args) < 3 {
		usage()
	}
	bundle := os.Args[2]
	fake := len(os.Args) > 3 && os.Args[3] == "--fake"
	var err error
	switch os.Args[1] {
	case "run":
		err = controller(bundle, fake)
	case "worker":
		err = worker(bundle, fake)
	case "fetch":
		err = fetchCorpus(bundle)
	default:
		usage()
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "climb: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: climb run|worker|fetch <bundle-dir> [--fake]")
	os.Exit(2)
}

// ---------- controller: spawn, kill once, resume, verify ----------

func controller(bundle string, fake bool) error {
	if err := os.MkdirAll(bundle, 0o755); err != nil {
		return err
	}
	storm, err := os.OpenFile(filepath.Join(bundle, "storm.ndjson"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	defer storm.Close()
	stormEvent := func(action string) error {
		line, err := canonicalJSON(map[string]any{
			"action": action, "at": time.Now().UnixMilli(), "target": "worker",
		})
		if err != nil {
			return err
		}
		if _, err := storm.Write(append(line, '\n')); err != nil {
			return err
		}
		return storm.Sync()
	}

	exe, err := os.Executable()
	if err != nil {
		return err
	}
	args := []string{"worker", bundle}
	if fake {
		args = append(args, "--fake")
	}
	spawn := func() (*exec.Cmd, error) {
		cmd := exec.Command(exe, args...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		return cmd, cmd.Start()
	}

	// Phase 1: run until the journal is mid-climb, then hard kill.
	const killAt = 350
	poll := 2 * time.Second
	if fake {
		poll = 30 * time.Millisecond
	}
	if err := stormEvent("spawn"); err != nil {
		return err
	}
	cmd, err := spawn()
	if err != nil {
		return err
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	journalPath := filepath.Join(bundle, "journal.ndjson")
	for countLines(journalPath) < killAt {
		select {
		case werr := <-done:
			if werr == nil {
				werr = errors.New("worker finished")
			}
			return fmt.Errorf("worker exited before the kill window: %w", werr)
		case <-time.After(poll):
		}
	}
	if err := cmd.Process.Kill(); err != nil {
		return fmt.Errorf("kill worker: %w", err)
	}
	<-done
	if err := stormEvent("kill"); err != nil {
		return err
	}
	fmt.Printf("controller: worker killed at %d journal lines\n", countLines(journalPath))

	// Phase 2: resume; the journal is the recovery mechanism.
	if err := stormEvent("resume"); err != nil {
		return err
	}
	preResume := countLines(journalPath)
	cmd, err = spawn()
	if err != nil {
		return err
	}
	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("resumed worker failed: %w", err)
	}
	fmt.Printf("controller: resume started at %d lines, finished at %d\n",
		preResume, countLines(journalPath))

	// The frozen gate, at the full R2 floors either way; the committed
	// check remains `go run ./cmd/climbverify <bundle>`.
	report, err := gauntlet.VerifyClimb(bundle, gauntlet.R2)
	if err != nil {
		return fmt.Errorf("frozen verifier REFUSED the bundle: %w", err)
	}
	label := "R2 VERIFIED"
	if fake {
		label = "R2 DRY-RUN VERIFIED (fake provider — a rehearsal, not a claim)"
	}
	fmt.Printf("%s\n  logical=%d physical=%d reuse=%d.%03dx workers=%d kills=%d\n"+
		"  dev %d->%d holdout %d->%d winner=%s\n"+
		"  spend=$%.4f naive=$%.4f model=%s head=%s\n",
		label, report.Logical, report.Physical, report.ReuseMilli/1000, report.ReuseMilli%1000,
		report.Workers, report.Kills,
		report.SeedDev, report.FinalDev, report.SeedHoldout, report.WinnerHoldout, report.Winner[:12],
		float64(report.SpendNano)/1e9, float64(report.NaiveNano)/1e9, report.Model, report.Head[:12])
	return nil
}

func countLines(path string) int {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	return bytes.Count(data, []byte("\n"))
}

// ---------- fetch: rebuild the corpus against the pinned digest ----------

// fetchCorpus mirrors artifacts/calibration/r2/fetch_corpus.py: the
// corpus is never committed (competition-owned problem text); the
// digest plus this fetcher ARE the corpus reference. RFC 8785
// canonicalization reproduces Python's sort_keys+compact+utf-8 bytes.
func fetchCorpus(bundle string) error {
	if err := os.MkdirAll(bundle, 0o755); err != nil {
		return err
	}
	intRe := regexp.MustCompile(`^-?\d+$`)
	client := &http.Client{Timeout: 60 * time.Second}
	var qs []question
	for _, src := range []string{"aime_2026", "hmmt_nov_2025", "hmmt_feb_2026"} {
		url := fmt.Sprintf(
			"https://datasets-server.huggingface.co/rows?dataset=MathArena%%2F%s&config=default&split=train&offset=0&length=100", src)
		resp, err := client.Get(url)
		if err != nil {
			return err
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return err
		}
		if resp.StatusCode != 200 {
			return fmt.Errorf("datasets-server status %d for %s", resp.StatusCode, src)
		}
		var parsed struct {
			Rows []struct {
				Row struct {
					ProblemIdx json.RawMessage `json:"problem_idx"`
					Problem    string          `json:"problem"`
					Answer     json.RawMessage `json:"answer"`
				} `json:"row"`
			} `json:"rows"`
		}
		if err := json.Unmarshal(body, &parsed); err != nil {
			return err
		}
		for _, r := range parsed.Rows {
			answer := rawScalar(r.Row.Answer)
			if !intRe.MatchString(answer) {
				continue
			}
			qs = append(qs, question{
				Answer:  answer,
				ID:      fmt.Sprintf("%s-%s", src, rawScalar(r.Row.ProblemIdx)),
				Problem: r.Row.Problem,
				Source:  src,
			})
		}
	}
	sort.Slice(qs, func(i, j int) bool { return qs[i].ID < qs[j].ID })
	blob, err := canonicalJSON(qs)
	if err != nil {
		return err
	}
	digest := canonical.DigestHex(blob)
	if digest != pinnedCorpusSHA {
		return fmt.Errorf("corpus digest MISMATCH: %s != pinned %s (fall back to artifacts/calibration/r2/fetch_corpus.py)",
			digest, pinnedCorpusSHA)
	}
	if err := os.WriteFile(filepath.Join(bundle, "corpus.json"), blob, 0o644); err != nil {
		return err
	}
	fmt.Printf("corpus.json rebuilt and verified: %d questions, sha256 %s\n", len(qs), digest)
	return nil
}

// rawScalar is Python's str() over a JSON scalar: quoted strings lose
// their quotes, numbers keep their literal text.
func rawScalar(raw json.RawMessage) string {
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	return string(bytes.TrimSpace(raw))
}
