// R1 harness (climbing artifact, coordinator-executed — see
// docs/gauntlet/R1-variant-loop-real.md). Controller mode spawns the
// worker, hard-kills it once mid-run, resumes it, then runs the frozen
// verifier. Worker mode performs the real inference calls with caps
// enforced in code and receipts journaled before results are consumed.
//
// SECURITY: the API key is read from .env / env and is never printed,
// logged, or written anywhere. Requests go to api.anthropic.com only.
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"foldlab/canonical"
	"foldlab/gauntlet"
)

const (
	model         = "claude-haiku-4-5-20251001"
	seed          = "r1-001"
	kVariants     = 8
	lSteps        = 6
	qQuestions    = 20
	maxTokensReq  = 150
	capMaxCalls   = 500
	capMaxOutTok  = 300
	capSpendMicro = 5_000_000 // $5.00
	priceInMicro  = 1         // haiku: $1 / MTok input  = 1 micro-usd per token
	priceOutMicro = 5         // haiku: $5 / MTok output = 5 micro-usd per token
)

func main() {
	if len(os.Args) < 3 || (os.Args[1] != "run" && os.Args[1] != "worker") {
		fmt.Fprintln(os.Stderr, "usage: realrun run|worker <bundle-dir>")
		os.Exit(2)
	}
	bundle := os.Args[2]
	var err error
	if os.Args[1] == "run" {
		err = controller(bundle)
	} else {
		err = worker(bundle)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "realrun: %v\n", err)
		os.Exit(1)
	}
}

// ---------- controller: spawn, kill once, resume, verify ----------

func controller(bundle string) error {
	if err := os.MkdirAll(bundle, 0o755); err != nil {
		return err
	}
	storm, err := os.OpenFile(filepath.Join(bundle, "storm.ndjson"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	defer storm.Close()
	exe, err := os.Executable()
	if err != nil {
		return err
	}

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

	spawn := func() (*exec.Cmd, error) {
		cmd := exec.Command(exe, "worker", bundle)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		return cmd, cmd.Start()
	}

	// Phase 1: run until ~60 receipts, then hard kill.
	if err := stormEvent("spawn"); err != nil {
		return err
	}
	cmd, err := spawn()
	if err != nil {
		return err
	}
	journalPath := filepath.Join(bundle, "journal.ndjson")
	for {
		time.Sleep(2 * time.Second)
		if n := countLines(journalPath); n >= 60 {
			break
		}
		if cmd.ProcessState != nil {
			return errors.New("worker exited before the kill window")
		}
	}
	if err := cmd.Process.Kill(); err != nil {
		return fmt.Errorf("kill worker: %w", err)
	}
	_ = cmd.Wait()
	if err := stormEvent("kill"); err != nil {
		return err
	}
	fmt.Printf("controller: worker killed at %d receipts\n", countLines(journalPath))

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
	fmt.Printf("controller: resume started at %d receipts, finished at %d\n",
		preResume, countLines(journalPath))

	// The frozen gate, run in-process for convenience; the committed
	// check remains `go run ./cmd/realverify <bundle>`.
	report, err := gauntlet.VerifyReal(bundle, gauntlet.R1)
	if err != nil {
		return fmt.Errorf("frozen verifier REFUSED the bundle: %w", err)
	}
	fmt.Printf(
		"R1 VERIFIED logical=%d physical=%d reuse=%d.%03dx kills=%d spend_micro=%d naive_micro=%d\n",
		report.Logical, report.Physical, report.ReuseMilli/1000, report.ReuseMilli%1000,
		report.Kills, report.SpendMicro, report.NaiveSpendMicro,
	)
	return nil
}

func countLines(path string) int {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	return bytes.Count(data, []byte("\n"))
}

// ---------- worker: the variant loop with receipts ----------

type fact struct {
	result       string
	inputTokens  int64
	outputTokens int64
}

func worker(bundle string) error {
	key, err := loadKey()
	if err != nil {
		return err // fail closed; the error never contains the key
	}
	outputsDir := filepath.Join(bundle, "outputs")
	if err := os.MkdirAll(outputsDir, 0o755); err != nil {
		return err
	}

	// Resume: the journal is authoritative. Load facts and continue the
	// chain from the recorded head.
	journalPath := filepath.Join(bundle, "journal.ndjson")
	facts := make(map[string]fact)
	head := canonical.Genesis
	nextSeq := 0
	var spendMicro int64
	if data, err := os.ReadFile(journalPath); err == nil {
		for _, line := range bytes.Split(data, []byte("\n")) {
			if len(bytes.TrimSpace(line)) == 0 {
				continue
			}
			var wire struct {
				Payload string `json:"payload"`
				Prev    string `json:"prev"`
				Seq     int    `json:"seq"`
			}
			if err := json.Unmarshal(line, &wire); err != nil {
				return fmt.Errorf("corrupt journal at seq %d: %w", nextSeq, err)
			}
			if wire.Prev != head {
				return fmt.Errorf("journal chain broken at seq %d", wire.Seq)
			}
			head = canonical.EntryDigest(canonical.ChainEntry{Seq: wire.Seq, Prev: wire.Prev, Payload: wire.Payload})
			var receipt struct {
				Digest       string `json:"digest"`
				InputTokens  int64  `json:"input_tokens"`
				Model        string `json:"model"`
				OutputTokens int64  `json:"output_tokens"`
				Result       string `json:"result"`
				Stop         string `json:"stop"`
			}
			if err := json.Unmarshal([]byte(wire.Payload), &receipt); err != nil {
				return err
			}
			facts[receipt.Digest] = fact{receipt.Result, receipt.InputTokens, receipt.OutputTokens}
			spendMicro += receipt.InputTokens*priceInMicro + receipt.OutputTokens*priceOutMicro
			nextSeq = wire.Seq + 1
		}
	}
	journal, err := os.OpenFile(journalPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	defer journal.Close()

	outputText := func(work string) (string, error) {
		data, err := os.ReadFile(filepath.Join(outputsDir, work+".txt"))
		return string(data), err
	}

	client := &http.Client{Timeout: 60 * time.Second}
	var planRows [][]byte
	calls := nextSeq

	for vi := 0; vi < kVariants; vi++ {
		for qi := 0; qi < qQuestions; qi++ {
			prevResult, prevWork := "", ""
			for s := 0; s < lSteps; s++ {
				tmplText := template(vi, s)
				tmplDigest := canonical.DigestHex([]byte(tmplText))
				var inputs []string
				if s == 0 {
					q0, err := digestOf(map[string]any{"question": qi, "seed": seed})
					if err != nil {
						return err
					}
					inputs = []string{q0}
				} else {
					inputs = []string{prevResult}
				}
				work, err := digestOf(map[string]any{"inputs": inputs, "model": model, "template": tmplDigest})
				if err != nil {
					return err
				}

				if _, bought := facts[work]; !bought {
					// Caps enforced BEFORE the call — fail closed.
					if calls >= capMaxCalls {
						return fmt.Errorf("cap reached: %d calls — stopping, bundle is partial", calls)
					}
					if spendMicro >= capSpendMicro {
						return fmt.Errorf("spend cap reached: %d micro-usd — stopping, bundle is partial", spendMicro)
					}
					var prompt string
					if s == 0 {
						prompt = fmt.Sprintf(tmplText, question(qi))
					} else {
						parentText, err := outputText(prevWork)
						if err != nil {
							return fmt.Errorf("missing parent output for resume: %w", err)
						}
						prompt = fmt.Sprintf(tmplText, parentText)
					}
					text, inTok, outTok, stop, err := callModel(client, key, prompt)
					if err != nil {
						return err
					}
					result := canonical.DigestHex([]byte(text))
					// Output persisted, then the receipt journaled and
					// synced, BEFORE the result is consumed downstream.
					if err := os.WriteFile(filepath.Join(outputsDir, work+".txt"), []byte(text), 0o644); err != nil {
						return err
					}
					payload, err := canonicalJSON(map[string]any{
						"digest": work, "input_tokens": inTok, "model": model,
						"output_tokens": outTok, "result": result, "stop": stop,
					})
					if err != nil {
						return err
					}
					wire, err := canonicalJSON(map[string]any{
						"payload": string(payload), "prev": head, "seq": nextSeq,
					})
					if err != nil {
						return err
					}
					if _, err := journal.Write(append(wire, '\n')); err != nil {
						return err
					}
					if err := journal.Sync(); err != nil {
						return err
					}
					head = canonical.EntryDigest(canonical.ChainEntry{
						Seq: nextSeq, Prev: head, Payload: string(payload),
					})
					nextSeq++
					calls++
					spendMicro += inTok*priceInMicro + outTok*priceOutMicro
					facts[work] = fact{result, inTok, outTok}
					if calls%25 == 0 {
						fmt.Printf("worker: %d receipts, %d micro-usd\n", calls, spendMicro)
					}
				}

				row, err := canonicalJSON(map[string]any{
					"inputs": inputs, "question": qi, "step": s,
					"template": tmplDigest, "variant": vi, "work": work,
				})
				if err != nil {
					return err
				}
				planRows = append(planRows, row)
				prevResult = facts[work].result
				prevWork = work
			}
		}
	}

	plan := bytes.Join(planRows, []byte("\n"))
	if err := os.WriteFile(filepath.Join(bundle, "plan.ndjson"), append(plan, '\n'), 0o644); err != nil {
		return err
	}
	man, err := canonicalJSON(map[string]any{
		"caps": map[string]any{
			"max_calls": capMaxCalls, "max_output_tokens": capMaxOutTok,
			"max_spend_usd_micro": capSpendMicro,
		},
		"k": kVariants, "l": lSteps, "model": model,
		"prices": map[string]any{
			"input_micro_per_token": priceInMicro, "output_micro_per_token": priceOutMicro,
		},
		"q": qQuestions, "seed": seed,
	})
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(bundle, "manifest.json"), man, 0o644); err != nil {
		return err
	}
	fmt.Printf("WORKER DONE receipts=%d spend_micro=%d\n", calls, spendMicro)
	return nil
}

// ---------- the workload ----------

func question(i int) string {
	a := 12 + (i*7)%40
	b := 3 + (i*5)%9
	c := 4 + (i*3)%11
	d := 5 + (i*11)%20
	return fmt.Sprintf(
		"A warehouse stores %d pallets. Each pallet holds %d boxes, and each box holds %d parts. "+
			"An inspection finds that %d percent of all parts are defective. "+
			"How many non-defective parts does the warehouse hold?",
		a, b, c, d,
	)
}

func template(variant, step int) string {
	base := [lSteps]string{
		"List every quantity in the problem with its unit, one per line.\n\nProblem: %s",
		"Restate the problem in exactly one sentence, keeping every quantity.\n\nExtracted quantities:\n%s",
		"Write a numbered two-step plan to solve the problem described here:\n%s",
		"Execute the plan, showing each arithmetic step on its own line:\n%s",
		"Check the arithmetic above. If any step is wrong, correct it. Reply with the corrected working:\n%s",
		"From the working above, state only the final numeric answer:\n%s",
	}
	// Variant edits: v1-v5 rephrase the LAST step (late, shallow cones);
	// v6 rephrases step 4; v7 rephrases step 0 (early, deep cone).
	switch {
	case variant >= 1 && variant <= 5 && step == 5:
		finals := [5]string{
			"Reply with only the final number.\n\nWorking:\n%s",
			"Answer with the number alone, no words:\n%s",
			"Give the final count as a bare integer:\n%s",
			"Output exactly one number — the answer:\n%s",
			"State the final answer as digits only:\n%s",
		}
		return finals[variant-1]
	case variant == 6 && step == 4:
		return "Independently verify each arithmetic step above and fix any errors. Reply with the corrected working:\n%s"
	case variant == 7 && step == 0:
		return "Extract all numbers from the problem as a bulleted list with units.\n\nProblem: %s"
	default:
		return base[step]
	}
}

// ---------- the API call (api.anthropic.com only) ----------

func callModel(client *http.Client, key, prompt string) (text string, inTok, outTok int64, stop string, err error) {
	body, _ := json.Marshal(map[string]any{
		"model":      model,
		"max_tokens": maxTokensReq,
		"messages":   []map[string]any{{"role": "user", "content": prompt}},
	})
	for attempt := 1; ; attempt++ {
		req, rerr := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
		if rerr != nil {
			return "", 0, 0, "", rerr
		}
		req.Header.Set("x-api-key", key)
		req.Header.Set("anthropic-version", "2023-06-01")
		req.Header.Set("content-type", "application/json")
		resp, herr := client.Do(req)
		if herr != nil {
			if attempt >= 5 {
				return "", 0, 0, "", herr
			}
			time.Sleep(time.Duration(attempt*attempt) * time.Second)
			continue
		}
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			if attempt >= 5 {
				return "", 0, 0, "", fmt.Errorf("api status %d after %d attempts", resp.StatusCode, attempt)
			}
			time.Sleep(time.Duration(attempt*attempt) * time.Second)
			continue
		}
		if resp.StatusCode != 200 {
			// Body may contain an error message; it never contains the key.
			return "", 0, 0, "", fmt.Errorf("api status %d: %s", resp.StatusCode, truncate(respBody, 200))
		}
		var parsed struct {
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
			Model      string `json:"model"`
			StopReason string `json:"stop_reason"`
			Usage      struct {
				InputTokens  int64 `json:"input_tokens"`
				OutputTokens int64 `json:"output_tokens"`
			} `json:"usage"`
		}
		if err := json.Unmarshal(respBody, &parsed); err != nil {
			return "", 0, 0, "", err
		}
		if parsed.Model != model {
			return "", 0, 0, "", fmt.Errorf("response model %q != requested %q", parsed.Model, model)
		}
		var sb strings.Builder
		for _, c := range parsed.Content {
			if c.Type == "text" {
				sb.WriteString(c.Text)
			}
		}
		return sb.String(), parsed.Usage.InputTokens, parsed.Usage.OutputTokens, parsed.StopReason, nil
	}
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "..."
}

// ---------- key handling (never printed, never logged) ----------

func loadKey() (string, error) {
	if key := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")); key != "" {
		return key, nil
	}
	for _, dir := range []string{".", "..", "../.."} {
		file, err := os.Open(filepath.Join(dir, ".env"))
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if rest, ok := strings.CutPrefix(line, "ANTHROPIC_API_KEY="); ok {
				file.Close()
				return strings.Trim(strings.TrimSpace(rest), `"'`), nil
			}
		}
		file.Close()
	}
	return "", errors.New("ANTHROPIC_API_KEY not found in env or .env — failing closed, nothing spent")
}

// ---------- canonical helpers ----------

func canonicalJSON(v any) ([]byte, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return canonical.Canonicalize(raw)
}

func digestOf(v any) (string, error) {
	encoded, err := canonicalJSON(v)
	if err != nil {
		return "", err
	}
	return canonical.DigestHex(encoded), nil
}
