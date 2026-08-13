package transfleet

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"foldlab/canonical"
)

const (
	N            = 40
	Workers      = 8
	TotalStates  = (N + 1) * (N + 1)
	workflowName = "rg_a_transposition"
)

type State struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Payload struct {
	Result string `json:"result"`
	State  State  `json:"state"`
	Worker string `json:"worker"`
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

type Manifest struct {
	Expansions  int    `json:"expansions"`
	N           int    `json:"n"`
	Salt        string `json:"salt"`
	StateDigest string `json:"state_digest"`
	Workers     int    `json:"workers"`
}

type journalWire struct {
	Payload string `json:"payload"`
	Prev    string `json:"prev"`
	Seq     int64  `json:"seq"`
}

func SaltForSeed(seed string) string {
	return canonical.DigestHex([]byte("foldlab.gauntlet.rg-a:" + seed))
}

func WorkerName(index int) string {
	return fmt.Sprintf("worker-%02d", index)
}

func OwnerIndex(state State) int {
	return (state.X + 3*state.Y) % Workers
}

func Derive(state State, salt string) (digest string, result string, err error) {
	digest, err = digestOf(map[string]any{"salt": salt, "x": state.X, "y": state.Y})
	if err != nil {
		return "", "", err
	}
	result, err = digestOf(map[string]any{"do": digest})
	if err != nil {
		return "", "", err
	}
	return digest, result, nil
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

func encodePayload(state State, result, owner string) (string, error) {
	encoded, err := canonicalBytes(Payload{Result: result, State: state, Worker: owner})
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func decodePayload(raw string, salt string) (Payload, string, error) {
	var payload Payload
	if err := strictDecode([]byte(raw), &payload); err != nil {
		return Payload{}, "", err
	}
	canonicalPayload, err := canonicalBytes(payload)
	if err != nil || !bytes.Equal(canonicalPayload, []byte(raw)) {
		return Payload{}, "", errors.New("payload is not canonical JSON")
	}
	if payload.State.X < 0 || payload.State.X > N || payload.State.Y < 0 || payload.State.Y > N {
		return Payload{}, "", fmt.Errorf("state (%d,%d) is out of bounds", payload.State.X, payload.State.Y)
	}
	digest, result, err := Derive(payload.State, salt)
	if err != nil {
		return Payload{}, "", err
	}
	if result != payload.Result {
		return Payload{}, "", fmt.Errorf("state (%d,%d) result disagrees with derivation", payload.State.X, payload.State.Y)
	}
	return payload, digest, nil
}

func strictDecode(raw []byte, target any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("trailing JSON")
	}
	return nil
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
	encoded, err := canonicalBytes(event)
	if err != nil {
		return err
	}
	encoded = append(encoded, '\n')
	path := filepath.Join(bundle, "ledger", owner+".ndjson")
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
		if bytes.Contains(line, []byte("\n")) {
			_ = file.Close()
			return errors.New("NDJSON record contains a newline")
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

func readLines(path string) ([][]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	rawLines := bytes.Split(data, []byte("\n"))
	lines := make([][]byte, 0, len(rawLines))
	for _, line := range rawLines {
		line = bytes.TrimSuffix(line, []byte("\r"))
		if len(line) > 0 {
			lines = append(lines, line)
		}
	}
	return lines, nil
}

func stateKey(state State) string {
	return strconv.Itoa(state.X) + "," + strconv.Itoa(state.Y)
}
