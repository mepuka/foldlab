// Provider layer. SECURITY: the API key is read from env / repo .env
// only, never printed, logged, or written into the bundle. Requests go
// to api.anthropic.com only. The fake provider is for the $0 dry-run:
// fully deterministic in the prompt bytes, no network, no key.
package main

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func (e *engine) call(prompt string, p stepParams) (string, int64, int64, string, error) {
	if e.fake {
		return fakeCall(prompt)
	}
	payload := map[string]any{
		"model":      model,
		"max_tokens": p.MaxTokens,
		"messages":   []map[string]any{{"role": "user", "content": prompt}},
	}
	if p.ThinkingBudget > 0 {
		payload["thinking"] = map[string]any{"type": "enabled", "budget_tokens": p.ThinkingBudget}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", 0, 0, "", err
	}
	for attempt := 1; ; attempt++ {
		req, err := http.NewRequestWithContext(e.ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
		if err != nil {
			return "", 0, 0, "", err
		}
		req.Header.Set("x-api-key", e.key)
		req.Header.Set("anthropic-version", "2023-06-01")
		req.Header.Set("content-type", "application/json")
		resp, herr := e.client.Do(req)
		if herr != nil {
			if attempt >= 5 {
				return "", 0, 0, "", herr
			}
			time.Sleep(time.Duration(attempt*attempt) * time.Second)
			continue
		}
		respBody, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			return "", 0, 0, "", fmt.Errorf("read provider response: %w", readErr)
		}
		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			if attempt >= 5 {
				return "", 0, 0, "", fmt.Errorf("api status %d after %d attempts", resp.StatusCode, attempt)
			}
			time.Sleep(time.Duration(attempt*attempt) * time.Second)
			continue
		}
		if resp.StatusCode != 200 {
			// Body may carry an error message; it never contains the key.
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

// ---------- the fake provider (dry-run only) ----------

// The fake climbs on purpose: pipeline steps carry the corpus-embedded
// ANSWER token forward, and a step whose template came from a mutation
// (it says "variant") always succeeds while an unmutated step succeeds
// 3/5 of the time — so mutated candidates genuinely outscore the seed
// and the dry-run exercises the full R2 floors, gains included, at $0.
var fakeAnswerRe = regexp.MustCompile(`ANSWER (-?\d+)`)

func fakeCall(prompt string) (string, int64, int64, string, error) {
	time.Sleep(8 * time.Millisecond)
	h := sha256.Sum256([]byte(prompt))
	inTok := int64(len(prompt)/4 + 1)
	outTok := int64(30 + int(h[5])%40)
	if strings.Contains(prompt, "Reply with ONLY a JSON object") {
		text := fmt.Sprintf(
			`{"template":"Fake mutated step (variant %x). Carry the ANSWER token forward verbatim.\n\n%s","params":{"max_tokens":%d,"thinking_budget":0}}`,
			h[:6], placeholder, 1536+int(h[6])%4*128)
		return text, inTok, outTok, "end_turn", nil
	}
	success := strings.Contains(prompt, "variant") || int(h[0])%5 < 3
	if m := fakeAnswerRe.FindAllStringSubmatch(prompt, -1); m != nil && success {
		return "Fake working towards the goal.\nANSWER " + m[len(m)-1][1], inTok, outTok, "end_turn", nil
	}
	junk := int(binary.BigEndian.Uint32(h[8:12])) % 1_000_000_000
	return fmt.Sprintf("Fake working, signal lost. 9%09d", junk), inTok, outTok, "end_turn", nil
}

// fakeCorpus mirrors the real corpus shape (30/21/16 across the three
// tiers) with synthetic problems that embed their own answers, so the
// dry-run never touches the competition-owned text.
func fakeCorpus() ([]byte, error) {
	tiers := []struct {
		name string
		n    int
	}{{"aime_2026", 30}, {"hmmt_feb_2026", 16}, {"hmmt_nov_2025", 21}}
	var qs []question
	for _, tier := range tiers {
		for i := 0; i < tier.n; i++ {
			id := fmt.Sprintf("%s-%d", tier.name, i)
			h := sha256.Sum256([]byte("fake-answer:" + id))
			ans := fmt.Sprintf("%d", 100000+int(binary.BigEndian.Uint32(h[:4]))%900000)
			qs = append(qs, question{
				Answer:  ans,
				ID:      id,
				Problem: fmt.Sprintf("FAKE problem %s. The hidden ANSWER %s must be carried to the final step.", id, ans),
				Source:  tier.name,
			})
		}
	}
	return json.Marshal(qs)
}
