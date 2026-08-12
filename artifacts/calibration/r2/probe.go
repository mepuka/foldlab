// R2 calibration probe (pre-spec scoping, NOT the harness).
// Runs the SEED pipeline (extract -> plan -> solve -> answer) over the
// pinned integer-answer corpus (corpus.json) against Haiku 4.5 and
// reports exact-match accuracy per source tier.
//
// SECURITY: key from env / repo .env, fail-closed, never printed.
// Requests go to api.anthropic.com only. Caps enforced BEFORE every
// call; receipts journaled and synced before results are consumed.
package main

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

const (
	maxTokensReq = 1600
	capMaxCalls  = 400
	capSpendNano = 5_000_000_000 // $5.00 per run (operator-raised)
	concurrency  = 6
	repoEnv      = `C:\Users\kokok\Dev\foldlab\.env`
)

// provider is selected by PROBE_PROVIDER=anthropic|openai (default
// anthropic); model and nano-USD-per-token prices ride along.
var (
	provider     = envOr("PROBE_PROVIDER", "anthropic")
	model        = envOr("PROBE_MODEL", "claude-haiku-4-5-20251001")
	priceInNano  = envInt("PROBE_PRICE_IN_NANO", 1000)
	priceOutNano = envInt("PROBE_PRICE_OUT_NANO", 5000)
	runDir       = envOr("PROBE_DIR", "run-haiku")
	mode         = envOr("PROBE_MODE", "seed")
)

func envOr(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func envInt(k string, def int64) int64 {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		var n int64
		fmt.Sscanf(v, "%d", &n)
		if n > 0 {
			return n
		}
	}
	return def
}

var templates = []string{
	"Read this competition math problem. List every given quantity and condition, and state precisely what is being asked.\n\nProblem: %s",
	"Write a short numbered plan for solving the problem based on this analysis:\n%s",
	"Carry out the plan step by step, showing all work, and finish with the final answer:\n%s",
	"From the working above, state ONLY the final answer as a single integer, with no words, units, or punctuation:\n%s",
}

// ceiling mode: one direct solve step with extended thinking — probes
// the reachable top of the variant space, not the seed.
var ceilingTemplates = []string{
	"Solve this competition math problem. Reason carefully and thoroughly. End your response with the final answer on its own line in the form ANSWER: <integer>\n\nProblem: %s",
}

type question struct {
	ID      string `json:"id"`
	Source  string `json:"source"`
	Problem string `json:"problem"`
	Answer  string `json:"answer"`
}

type fact struct{ result string }

type journalMu struct {
	mu        sync.Mutex
	journal   *os.File
	facts     map[string]fact
	calls     int
	spendNano int64
}

func digestHex(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }

func workDigest(tmplDigest string, inputs []string) string {
	b, _ := json.Marshal(map[string]any{"inputs": inputs, "model": model, "template": tmplDigest})
	return digestHex(b)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "probe: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	key, err := loadKey()
	if err != nil {
		return err
	}
	raw, err := os.ReadFile("corpus.json")
	if err != nil {
		return err
	}
	fmt.Printf("corpus sha256: %s\n", digestHex(raw))
	var corpus []question
	if err := json.Unmarshal(raw, &corpus); err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Join(runDir, "outputs"), 0o755); err != nil {
		return err
	}
	st := &journalMu{facts: make(map[string]fact)}

	// Resume: reload receipts; outputs dir holds the texts.
	if data, err := os.ReadFile(filepath.Join(runDir, "receipts.ndjson")); err == nil {
		for _, line := range bytes.Split(data, []byte("\n")) {
			if len(bytes.TrimSpace(line)) == 0 {
				continue
			}
			var r struct {
				Digest       string `json:"digest"`
				InputTokens  int64  `json:"input_tokens"`
				OutputTokens int64  `json:"output_tokens"`
				Result       string `json:"result"`
			}
			if err := json.Unmarshal(line, &r); err != nil {
				return fmt.Errorf("corrupt receipts: %w", err)
			}
			st.facts[r.Digest] = fact{r.Result}
			st.calls++
			st.spendNano += r.InputTokens*priceInNano + r.OutputTokens*priceOutNano
		}
	}
	journal, err := os.OpenFile(filepath.Join(runDir, "receipts.ndjson"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	defer journal.Close()
	st.journal = journal

	// High-effort reasoning calls can run several minutes; a short
	// timeout turns them into billed-but-unrecorded retry cycles.
	client := &http.Client{Timeout: 600 * time.Second}

	type outcome struct {
		q         question
		predicted string
		correct   bool
		err       error
	}
	results := make([]outcome, len(corpus))
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for i, q := range corpus {
		wg.Add(1)
		go func(i int, q question) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			text, err := runPipeline(client, key, st, q)
			if err != nil {
				results[i] = outcome{q: q, err: err}
				return
			}
			pred := normalize(text)
			results[i] = outcome{q: q, predicted: pred, correct: pred == q.Answer}
		}(i, q)
	}
	wg.Wait()

	// Report.
	type tally struct{ total, correct, errs int }
	tiers := map[string]*tally{}
	var rows []map[string]any
	for _, r := range results {
		t := tiers[r.q.Source]
		if t == nil {
			t = &tally{}
			tiers[r.q.Source] = t
		}
		t.total++
		row := map[string]any{"id": r.q.ID, "gold": r.q.Answer, "predicted": r.predicted, "correct": r.correct}
		if r.err != nil {
			t.errs++
			row["error"] = r.err.Error()
		} else if r.correct {
			t.correct++
		}
		rows = append(rows, row)
	}
	out, _ := json.MarshalIndent(map[string]any{
		"corpus_sha256": digestHex(raw), "model": model, "results": rows,
		"spend_nano": st.spendNano, "physical_calls": st.calls,
	}, "", " ")
	if err := os.WriteFile(filepath.Join(runDir, "results.json"), out, 0o644); err != nil {
		return err
	}

	fmt.Printf("\n=== CALIBRATION (seed pipeline, %s via %s) ===\n", model, provider)
	total, correct := 0, 0
	for _, src := range []string{"hmmt_nov_2025", "aime_2026", "hmmt_feb_2026"} {
		t := tiers[src]
		if t == nil {
			continue
		}
		fmt.Printf("%-15s %d/%d correct (%d errors)\n", src, t.correct, t.total, t.errs)
		total += t.total
		correct += t.correct
	}
	fmt.Printf("%-15s %d/%d = %.1f%%\n", "OVERALL", correct, total, 100*float64(correct)/float64(total))
	fmt.Printf("physical calls: %d   spend: $%.4f\n", st.calls, float64(st.spendNano)/1e9)
	return nil
}

func activeTemplates() []string {
	if mode == "ceiling" {
		return ceilingTemplates
	}
	return templates
}

func runPipeline(client *http.Client, key string, st *journalMu, q question) (string, error) {
	tmpls := activeTemplates()
	prevText := q.Problem
	var prevWork string
	for s := 0; s < len(tmpls); s++ {
		tmplDigest := digestHex([]byte(tmpls[s]))
		var inputs []string
		if s == 0 {
			inputs = []string{digestHex([]byte(q.ID))}
		} else {
			inputs = []string{prevWork}
		}
		work := workDigest(tmplDigest, inputs)

		st.mu.Lock()
		_, bought := st.facts[work]
		st.mu.Unlock()

		if bought {
			data, err := os.ReadFile(filepath.Join(runDir, "outputs", work+".txt"))
			if err != nil {
				return "", fmt.Errorf("missing output for recorded fact: %w", err)
			}
			prevText, prevWork = string(data), work
			continue
		}

		st.mu.Lock()
		if st.calls >= capMaxCalls {
			st.mu.Unlock()
			return "", fmt.Errorf("cap reached: %d calls", st.calls)
		}
		if st.spendNano >= capSpendNano {
			st.mu.Unlock()
			return "", fmt.Errorf("spend cap reached: %d nano", st.spendNano)
		}
		st.mu.Unlock()

		prompt := fmt.Sprintf(tmpls[s], prevText)
		text, inTok, outTok, stop, err := callModel(client, key, prompt)
		if err != nil {
			return "", err
		}
		if err := os.WriteFile(filepath.Join(runDir, "outputs", work+".txt"), []byte(text), 0o644); err != nil {
			return "", err
		}
		receipt, _ := json.Marshal(map[string]any{
			"digest": work, "input_tokens": inTok, "model": model,
			"output_tokens": outTok, "result": digestHex([]byte(text)), "stop": stop,
		})
		st.mu.Lock()
		if _, werr := st.journal.Write(append(receipt, '\n')); werr != nil {
			st.mu.Unlock()
			return "", werr
		}
		if serr := st.journal.Sync(); serr != nil {
			st.mu.Unlock()
			return "", serr
		}
		st.calls++
		st.spendNano += inTok*priceInNano + outTok*priceOutNano
		st.facts[work] = fact{digestHex([]byte(text))}
		if st.calls%25 == 0 {
			fmt.Printf("probe: %d calls, $%.4f\n", st.calls, float64(st.spendNano)/1e9)
		}
		st.mu.Unlock()

		prevText, prevWork = text, work
	}
	return prevText, nil
}

// normalize is the dumb frozen acceptor: strip whitespace, $, commas,
// trailing period; accept if the remainder is a bare integer, else take
// the LAST integer token in the text.
var intRe = regexp.MustCompile(`-?\d+`)

func normalize(text string) string {
	s := strings.TrimSpace(text)
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, ",", "")
	s = strings.TrimSuffix(strings.TrimSpace(s), ".")
	s = strings.TrimSpace(s)
	if regexp.MustCompile(`^-?\d+$`).MatchString(s) {
		return s
	}
	all := intRe.FindAllString(s, -1)
	if len(all) == 0 {
		return ""
	}
	return all[len(all)-1]
}

func callModel(client *http.Client, key, prompt string) (text string, inTok, outTok int64, stop string, err error) {
	var body []byte
	var url string
	if provider == "openai" {
		url = "https://api.openai.com/v1/chat/completions"
		// seed = minimal reasoning (analog of Haiku no-thinking);
		// ceiling = high reasoning (analog of the 6k thinking budget).
		effort, maxOut := "minimal", maxTokensReq*4
		if mode == "ceiling" {
			effort, maxOut = "high", 20000
		}
		body, _ = json.Marshal(map[string]any{
			"model":                 model,
			"max_completion_tokens": maxOut, // reasoning tokens bill as output
			"reasoning_effort":      effort,
			"messages":              []map[string]any{{"role": "user", "content": prompt}},
		})
	} else {
		url = "https://api.anthropic.com/v1/messages"
		payload := map[string]any{
			"model":      model,
			"max_tokens": maxTokensReq,
			"messages":   []map[string]any{{"role": "user", "content": prompt}},
		}
		if mode == "ceiling" {
			payload["max_tokens"] = 8000
			payload["thinking"] = map[string]any{"type": "enabled", "budget_tokens": 6000}
		}
		body, _ = json.Marshal(payload)
	}
	for attempt := 1; ; attempt++ {
		req, rerr := http.NewRequest("POST", url, bytes.NewReader(body))
		if rerr != nil {
			return "", 0, 0, "", rerr
		}
		if provider == "openai" {
			req.Header.Set("Authorization", "Bearer "+key)
		} else {
			req.Header.Set("x-api-key", key)
			req.Header.Set("anthropic-version", "2023-06-01")
		}
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
			return "", 0, 0, "", fmt.Errorf("api status %d: %s", resp.StatusCode, truncate(respBody, 200))
		}
		if provider == "openai" {
			var parsed struct {
				Choices []struct {
					Message struct {
						Content string `json:"content"`
					} `json:"message"`
					FinishReason string `json:"finish_reason"`
				} `json:"choices"`
				Model string `json:"model"`
				Usage struct {
					PromptTokens     int64 `json:"prompt_tokens"`
					CompletionTokens int64 `json:"completion_tokens"`
				} `json:"usage"`
			}
			if err := json.Unmarshal(respBody, &parsed); err != nil {
				return "", 0, 0, "", err
			}
			if len(parsed.Choices) == 0 {
				return "", 0, 0, "", errors.New("openai: empty choices")
			}
			c := parsed.Choices[0]
			return c.Message.Content, parsed.Usage.PromptTokens, parsed.Usage.CompletionTokens, c.FinishReason, nil
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

func loadKey() (string, error) {
	name := "ANTHROPIC_API_KEY"
	if provider == "openai" {
		name = "OPENAI_API_KEY"
	}
	if key := strings.TrimSpace(os.Getenv(name)); key != "" {
		return key, nil
	}
	file, err := os.Open(repoEnv)
	if err == nil {
		defer file.Close()
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if rest, ok := strings.CutPrefix(line, name+"="); ok {
				return strings.Trim(strings.TrimSpace(rest), `"'`), nil
			}
		}
	}
	return "", errors.New(name + " not found in env or repo .env — failing closed, nothing spent")
}
