package crashstorm

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"foldlab/canonical"
)

const (
	Steps          = 500
	Workers        = 8
	RequiredKills  = 25
	RequiredStarts = 5
	workflowName   = "g1_crash_storm"
)

type Step struct {
	Digest string `json:"digest"`
	Result string `json:"result"`
	Step   int    `json:"step"`
}

type Register struct {
	Digest string `json:"digest"`
	Fence  uint64 `json:"fence"`
	Result string `json:"result"`
}

type LedgerEvent struct {
	At     int64  `json:"at"`
	Digest string `json:"digest"`
	Fence  uint64 `json:"fence"`
	Nonce  string `json:"nonce"`
	Owner  string `json:"owner"`
}

type StormEvent struct {
	Action string `json:"action"`
	At     int64  `json:"at"`
	Target string `json:"target"`
}

type Manifest struct {
	CfPosition  int    `json:"cf_position"`
	DupRuns     int    `json:"dup_runs"`
	Salt        string `json:"salt"`
	Seed        string `json:"seed"`
	StateDigest string `json:"state_digest"`
	Steals      int    `json:"steals"`
	Steps       int    `json:"steps"`
	Workers     int    `json:"workers"`
}

type Counterfactual struct {
	Position    int    `json:"position"`
	Result      string `json:"result"`
	StateDigest string `json:"state_digest"`
}

func canonicalBytes(value any) ([]byte, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return canonical.Canonicalize(raw)
}

func digestOf(value any) (string, error) {
	encoded, err := canonicalBytes(value)
	if err != nil {
		return "", err
	}
	return canonical.DigestHex(encoded), nil
}

func SaltForSeed(seed string) string {
	return canonical.DigestHex([]byte("foldlab.gauntlet.g1:" + seed))
}

func DeriveStep(salt string, position int, previousResult string) (Step, error) {
	base, err := digestOf(map[string]any{"salt": salt, "step": position})
	if err != nil {
		return Step{}, err
	}
	digest, err := digestOf(map[string]any{"base": base, "prev": previousResult})
	if err != nil {
		return Step{}, err
	}
	result, err := digestOf(map[string]any{"do": digest})
	if err != nil {
		return Step{}, err
	}
	return Step{Digest: digest, Result: result, Step: position}, nil
}

func appendCanonicalLine(path string, value any) error {
	encoded, err := canonicalBytes(value)
	if err != nil {
		return err
	}
	encoded = append(encoded, '\n')
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	if _, err := file.Write(encoded); err != nil {
		_ = file.Close()
		return err
	}
	if err := file.Sync(); err != nil {
		_ = file.Close()
		return err
	}
	return file.Close()
}

func appendLedger(bundle, owner, digest string, fence uint64) error {
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return err
	}
	event := LedgerEvent{
		At:     time.Now().UnixMilli(),
		Digest: digest,
		Fence:  fence,
		Nonce:  hex.EncodeToString(nonceBytes),
		Owner:  owner,
	}
	return appendCanonicalLine(filepath.Join(bundle, "ledger", owner+".ndjson"), event)
}

func appendStorm(bundle, action, target string) error {
	return appendCanonicalLine(filepath.Join(bundle, "storm.ndjson"), StormEvent{
		Action: action,
		At:     time.Now().UnixMilli(),
		Target: target,
	})
}

func readLedgerEvents(bundle string) ([]LedgerEvent, error) {
	dir := filepath.Join(bundle, "ledger")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	var events []LedgerEvent
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".ndjson") {
			continue
		}
		file, err := os.Open(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, err
		}
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			var event LedgerEvent
			if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
				_ = file.Close()
				return nil, fmt.Errorf("decode %s: %w", entry.Name(), err)
			}
			events = append(events, event)
		}
		if err := scanner.Err(); err != nil {
			_ = file.Close()
			return nil, err
		}
		if err := file.Close(); err != nil {
			return nil, err
		}
	}
	return events, nil
}

func writeCanonicalFile(path string, value any) error {
	encoded, err := canonicalBytes(value)
	if err != nil {
		return err
	}
	return os.WriteFile(path, encoded, 0o644)
}

func writeCanonicalLines(path string, values []any) error {
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o644)
	if err != nil {
		return err
	}
	writer := bufio.NewWriter(file)
	for _, value := range values {
		encoded, encodeErr := canonicalBytes(value)
		if encodeErr != nil {
			_ = file.Close()
			return encodeErr
		}
		if _, writeErr := writer.Write(append(encoded, '\n')); writeErr != nil {
			_ = file.Close()
			return writeErr
		}
	}
	if err := writer.Flush(); err != nil {
		_ = file.Close()
		return err
	}
	if err := file.Sync(); err != nil {
		_ = file.Close()
		return err
	}
	return file.Close()
}

func writeRawLines(path string, lines [][]byte) error {
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o644)
	if err != nil {
		return err
	}
	writer := bufio.NewWriter(file)
	for _, line := range lines {
		if strings.Contains(string(line), "\n") {
			_ = file.Close()
			return fmt.Errorf("NDJSON record contains a newline")
		}
		if _, err := writer.Write(append(line, '\n')); err != nil {
			_ = file.Close()
			return err
		}
	}
	if err := writer.Flush(); err != nil {
		_ = file.Close()
		return err
	}
	if err := file.Sync(); err != nil {
		_ = file.Close()
		return err
	}
	return file.Close()
}

func stateDigest(results []string) (string, error) {
	state := make(map[string]any, len(results))
	for position, result := range results {
		state[strconv.Itoa(position)] = result
	}
	return digestOf(state)
}
