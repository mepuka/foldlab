package canonical_test

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"math"
	"math/rand/v2"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"foldlab/canonical"
)

const (
	goDifferentialSeedA uint64 = 0x09c50003
	goDifferentialSeedB uint64 = 0x09c50004
	goDifferentialRuns         = 160
)

type probeRequest struct {
	Input string `json:"input"`
}

type probeResponse struct {
	Accepted  bool   `json:"accepted"`
	Canonical string `json:"canonical,omitempty"`
	Error     string `json:"error,omitempty"`
}

type tsJCSProbe struct {
	command *exec.Cmd
	stdin   io.WriteCloser
	writer  *bufio.Writer
	scanner *bufio.Scanner
	stderr  lockedBuffer
	mu      sync.Mutex
}

type lockedBuffer struct {
	mu     sync.Mutex
	buffer bytes.Buffer
}

func (buffer *lockedBuffer) Write(data []byte) (int, error) {
	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	return buffer.buffer.Write(data)
}

func (buffer *lockedBuffer) String() string {
	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	return buffer.buffer.String()
}

func startTSJCSProbe(t testing.TB) *tsJCSProbe {
	t.Helper()
	root, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatalf("resolve repository root: %v", err)
	}
	command := exec.Command("bun", filepath.Join("packages", "core", "scripts", "jcs-probe.ts"))
	command.Dir = root
	stdin, err := command.StdinPipe()
	if err != nil {
		t.Fatalf("open TS JCS probe stdin: %v", err)
	}
	stdout, err := command.StdoutPipe()
	if err != nil {
		t.Fatalf("open TS JCS probe stdout: %v", err)
	}
	probe := &tsJCSProbe{
		command: command,
		stdin:   stdin,
		writer:  bufio.NewWriter(stdin),
		scanner: bufio.NewScanner(stdout),
	}
	probe.scanner.Buffer(make([]byte, 64*1024), 8*1024*1024)
	command.Stderr = &probe.stderr
	if err := command.Start(); err != nil {
		t.Fatalf("start TS JCS probe: %v", err)
	}
	t.Cleanup(func() {
		_ = probe.stdin.Close()
		if err := probe.command.Wait(); err != nil {
			t.Errorf("TS JCS probe exit: %v: %s", err, strings.TrimSpace(probe.stderr.String()))
		}
	})
	return probe
}

func (probe *tsJCSProbe) canonicalize(t testing.TB, input []byte) probeResponse {
	t.Helper()
	probe.mu.Lock()
	defer probe.mu.Unlock()
	requestBytes, err := json.Marshal(probeRequest{Input: base64.StdEncoding.EncodeToString(input)})
	if err != nil {
		t.Fatalf("encode TS probe request: %v", err)
	}
	if _, err := probe.writer.Write(append(requestBytes, '\n')); err != nil {
		t.Fatalf("write TS probe request: %v", err)
	}
	if err := probe.writer.Flush(); err != nil {
		t.Fatalf("flush TS probe request: %v", err)
	}
	if !probe.scanner.Scan() {
		if err := probe.scanner.Err(); err != nil {
			t.Fatalf("read TS probe reply: %v", err)
		}
		t.Fatalf("TS JCS probe exited before replying: %s", strings.TrimSpace(probe.stderr.String()))
	}
	var response probeResponse
	if err := json.Unmarshal(probe.scanner.Bytes(), &response); err != nil {
		t.Fatalf("decode TS probe reply %q: %v", probe.scanner.Bytes(), err)
	}
	if response.Accepted && response.Error != "" {
		t.Fatalf("TS probe decoded but could not canonicalize %x: %s", input, response.Error)
	}
	return response
}

func goProbeOutcome(t testing.TB, input []byte) probeResponse {
	t.Helper()
	value, err := canonical.Decode(input)
	if err != nil {
		return probeResponse{Accepted: false}
	}
	encoded, err := canonical.CanonicalizeValue(value)
	if err != nil {
		t.Fatalf("Go decoded but could not canonicalize %x: %v", input, err)
	}
	return probeResponse{Accepted: true, Canonical: string(encoded)}
}

func compareDifferential(t testing.TB, probe *tsJCSProbe, input []byte) {
	t.Helper()
	goOutcome := goProbeOutcome(t, input)
	tsOutcome := probe.canonicalize(t, input)
	if goOutcome.Accepted != tsOutcome.Accepted ||
		(goOutcome.Accepted && goOutcome.Canonical != tsOutcome.Canonical) {
		t.Fatalf(
			"Task 09 FINDING; fuzzing stopped; minimized input hex=%x base64=%s utf8=%q; Go=%+v TS=%+v",
			input,
			base64.StdEncoding.EncodeToString(input),
			input,
			goOutcome,
			tsOutcome,
		)
	}
}

func nestedJSON(depth int) []byte {
	return []byte(strings.Repeat("[", depth) + "0" + strings.Repeat("]", depth))
}

func jcsDifferentialCorpus() [][]byte {
	return [][]byte{
		[]byte("9007199254740989"),
		[]byte("9007199254740990"),
		[]byte("9007199254740991"),
		[]byte("9007199254740992"),
		[]byte("9007199254740993"),
		[]byte("9007199254740994"),
		[]byte("-0"),
		[]byte("1e21"),
		[]byte("999999999999999900000"),
		[]byte("1e-7"),
		[]byte("0.0000001"),
		[]byte("0.000001"),
		[]byte("333333333.33333329"),
		[]byte("1.23456789012345678901234567890123456789e-200"),
		[]byte(`"\ud83d\ude80"`),
		[]byte(`"\u0000\b\t\n\f\r"`),
		[]byte(`"\ud800"`),
		[]byte(`"\udc00"`),
		[]byte{'"', '\\'},
		[]byte(`{"":0,"":1}`),
		[]byte(`{"a":0,"\u0061":1}`),
		[]byte(`{"�":0,"😀":1,"":2}`),
		nestedJSON(128),
		nestedJSON(257),
		[]byte("{}[]"),
		{0x22, 0xff, 0x22},
	}
}

func randomJSONString(random *rand.Rand) string {
	alphabet := []rune{'a', 'Z', '0', 'é', '🚀', '\x00', '\x1f', '\u2028', '"', '\\'}
	length := random.IntN(12)
	value := make([]rune, length)
	for index := range value {
		value[index] = alphabet[random.IntN(len(alphabet))]
	}
	return string(value)
}

func randomJSONValue(random *rand.Rand, depth int) any {
	if depth >= 5 {
		switch random.IntN(5) {
		case 0:
			return nil
		case 1:
			return random.IntN(2) == 0
		case 2:
			return randomJSONString(random)
		default:
			value := math.Float64frombits(random.Uint64())
			if math.IsNaN(value) || math.IsInf(value, 0) {
				return math.Copysign(0, -1)
			}
			return value
		}
	}
	switch random.IntN(7) {
	case 0:
		return nil
	case 1:
		return random.IntN(2) == 0
	case 2:
		return randomJSONString(random)
	case 3:
		value := math.Float64frombits(random.Uint64())
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return math.Copysign(0, -1)
		}
		return value
	case 4:
		length := random.IntN(6)
		values := make([]any, length)
		for index := range values {
			values[index] = randomJSONValue(random, depth+1)
		}
		return values
	default:
		length := random.IntN(6)
		value := make(map[string]any, length)
		for index := 0; index < length; index++ {
			value[randomJSONString(random)] = randomJSONValue(random, depth+1)
		}
		return value
	}
}

func TestJCSDeterministicDifferential(t *testing.T) {
	probe := startTSJCSProbe(t)
	for _, input := range jcsDifferentialCorpus() {
		compareDifferential(t, probe, input)
	}
	random := rand.New(rand.NewPCG(goDifferentialSeedA, goDifferentialSeedB))
	for run := 0; run < goDifferentialRuns; run++ {
		var input []byte
		if run%2 == 0 {
			input = make([]byte, random.IntN(512))
			for index := range input {
				input[index] = byte(random.Uint32())
			}
		} else {
			var err error
			input, err = json.Marshal(randomJSONValue(random, 0))
			if err != nil {
				t.Fatalf("marshal generated JSON value: %v", err)
			}
		}
		compareDifferential(t, probe, input)
	}
}

func FuzzJCSDifferential(f *testing.F) {
	for _, input := range jcsDifferentialCorpus() {
		f.Add(input)
	}
	probe := startTSJCSProbe(f)
	f.Fuzz(func(t *testing.T, input []byte) {
		if len(input) > 1024*1024 {
			t.Skip("input exceeds the differential probe bound")
		}
		compareDifferential(t, probe, input)
	})
}
