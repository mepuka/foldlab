package substrate

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	recoveryHelperModeEnv = "FOLDLAB_SUBSTRATE_RECOVERY_HELPER"
	recoveryStoreEnv      = "FOLDLAB_SUBSTRATE_RECOVERY_STORE"
	recoveryReadyEnv      = "FOLDLAB_SUBSTRATE_RECOVERY_READY"
	recoverySyncModeEnv   = "FOLDLAB_SUBSTRATE_RECOVERY_SYNC_MODE"
	recoveryMessageCount  = 128
)

type syncMode string

const (
	crashDurable syncMode = "crash-durable"
	powerDurable syncMode = "power-durable"
)

func recoveryServerOptions(storeDir string, mode syncMode) *server.Options {
	return &server.Options{
		ServerName: "foldlab-substrate-recovery",
		Host:       "127.0.0.1",
		Port:       server.RANDOM_PORT,
		JetStream:  true,
		StoreDir:   storeDir,
		NoLog:      true,
		NoSigs:     true,
		SyncAlways: mode == powerDurable,
	}
}

func TestSIGKILLRecovery(t *testing.T) {
	if recoveryServerOptions("store", crashDurable).SyncAlways {
		t.Fatal("crash-durable unexpectedly sets SyncAlways")
	}
	if !recoveryServerOptions("store", powerDurable).SyncAlways {
		t.Fatal("power-durable must set SyncAlways")
	}
	if runtime.GOOS != "linux" {
		t.Skip("SIGKILL process-crash witness runs on Linux; SyncAlways configuration assertion passed")
	}

	for _, mode := range []syncMode{crashDurable, powerDurable} {
		t.Run(string(mode), func(t *testing.T) {
			for trial := 1; trial <= 3; trial++ {
				trial := trial
				t.Run(fmt.Sprintf("trial-%d", trial), func(t *testing.T) {
					root := t.TempDir()
					storeDir := filepath.Join(root, "store")
					readyPath := filepath.Join(root, "ready")
					process := startRecoveryProcess(t, storeDir, readyPath, mode)
					nc, js := connectRecoveryJetStream(t, process.url)
					stream := createStream(t, js, jetstream.StreamConfig{
						Name:              "RECOVERY",
						Subjects:          []string{"recovery"},
						Retention:         jetstream.LimitsPolicy,
						MaxMsgs:           -1,
						MaxBytes:          -1,
						MaxMsgsPerSubject: -1,
						Storage:           jetstream.FileStorage,
						Replicas:          1,
					})
					_ = stream
					var finalAck *jetstream.PubAck
					for sequence := 1; sequence <= recoveryMessageCount; sequence++ {
						ack, err := js.Publish(
							testContext(t),
							"recovery",
							[]byte(fmt.Sprintf("message-%03d", sequence)),
						)
						if err != nil || ack.Sequence != uint64(sequence) || ack.Duplicate {
							t.Fatalf("publish recovery sequence %d: ack=%+v err=%v", sequence, ack, err)
						}
						finalAck = ack
					}

					// Kill immediately after the final synchronous PubAck. The client is
					// deliberately neither flushed nor drained before SIGKILL.
					process.kill(t)
					nc.Close()
					if err := os.Remove(readyPath); err != nil && !os.IsNotExist(err) {
						t.Fatalf("remove first ready file: %v", err)
					}

					restarted := startRecoveryProcess(t, storeDir, readyPath, mode)
					recoveredConn, recoveredJS := connectRecoveryJetStream(t, restarted.url)
					recovered, err := recoveredJS.Stream(testContext(t), "RECOVERY")
					if err != nil {
						t.Fatalf("open recovered stream: %v", err)
					}
					info, err := recovered.Info(testContext(t))
					if err != nil {
						t.Fatalf("inspect recovered stream: %v", err)
					}
					if info.State.Msgs != recoveryMessageCount || info.State.LastSeq != recoveryMessageCount {
						t.Fatalf(
							"recovered state msgs=%d last=%d, want %d/%d",
							info.State.Msgs,
							info.State.LastSeq,
							recoveryMessageCount,
							recoveryMessageCount,
						)
					}
					restarted.kill(t)
					recoveredConn.Close()
					t.Logf(
						"TRACE recovery mode=%s SyncAlways=%t trial=%d acked=%d final-ack=%d recovered-msgs=%d recovered-last=%d os=linux filesystem=%s failure=SIGKILL scope=process-crash-only-not-power-loss",
						mode,
						recoveryServerOptions(storeDir, mode).SyncAlways,
						trial,
						recoveryMessageCount,
						finalAck.Sequence,
						info.State.Msgs,
						info.State.LastSeq,
						describeFilesystem(storeDir),
					)
				})
			}
		})
	}
}

// TestRecoveryServerProcess is an internal subprocess entrypoint. The parent
// kills this test process; it is not a separately shipped server command.
func TestRecoveryServerProcess(t *testing.T) {
	if os.Getenv(recoveryHelperModeEnv) != "1" {
		return
	}
	storeDir := os.Getenv(recoveryStoreEnv)
	readyPath := os.Getenv(recoveryReadyEnv)
	mode := syncMode(os.Getenv(recoverySyncModeEnv))
	if storeDir == "" || readyPath == "" || (mode != crashDurable && mode != powerDurable) {
		t.Fatalf("invalid recovery helper environment: store=%q ready=%q mode=%q", storeDir, readyPath, mode)
	}
	natsServer, err := server.NewServer(recoveryServerOptions(storeDir, mode))
	if err != nil {
		t.Fatalf("new recovery server: %v", err)
	}
	go natsServer.Start()
	if !natsServer.ReadyForConnections(10 * time.Second) {
		t.Fatal("recovery server did not become ready")
	}
	if err := os.WriteFile(readyPath, []byte(natsServer.ClientURL()), 0o600); err != nil {
		t.Fatalf("write recovery ready file: %v", err)
	}
	select {}
}

type synchronizedBuffer struct {
	mu     sync.Mutex
	buffer bytes.Buffer
}

func (buffer *synchronizedBuffer) Write(data []byte) (int, error) {
	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	return buffer.buffer.Write(data)
}

func (buffer *synchronizedBuffer) String() string {
	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	return buffer.buffer.String()
}

type recoveryProcess struct {
	command *exec.Cmd
	url     string
	done    chan error
	output  *synchronizedBuffer
	mu      sync.Mutex
	waited  bool
	waitErr error
}

func startRecoveryProcess(t *testing.T, storeDir, readyPath string, mode syncMode) *recoveryProcess {
	t.Helper()
	command := exec.Command(os.Args[0], "-test.run=^TestRecoveryServerProcess$")
	command.Env = append(
		os.Environ(),
		recoveryHelperModeEnv+"=1",
		recoveryStoreEnv+"="+storeDir,
		recoveryReadyEnv+"="+readyPath,
		recoverySyncModeEnv+"="+string(mode),
	)
	output := &synchronizedBuffer{}
	command.Stdout = output
	command.Stderr = output
	if err := command.Start(); err != nil {
		t.Fatalf("start recovery helper: %v", err)
	}
	process := &recoveryProcess{
		command: command,
		done:    make(chan error, 1),
		output:  output,
	}
	go func() {
		process.done <- command.Wait()
	}()
	t.Cleanup(func() {
		process.kill(nil)
	})

	deadline := time.Now().Add(15 * time.Second)
	for {
		ready, err := os.ReadFile(readyPath)
		if err == nil && strings.TrimSpace(string(ready)) != "" {
			process.url = strings.TrimSpace(string(ready))
			return process
		}
		select {
		case waitErr := <-process.done:
			process.recordWait(waitErr)
			t.Fatalf("recovery helper exited before ready: %v\n%s", waitErr, process.output.String())
		default:
		}
		if time.Now().After(deadline) {
			process.kill(nil)
			t.Fatalf("recovery helper did not become ready\n%s", process.output.String())
		}
		time.Sleep(25 * time.Millisecond)
	}
}

func (process *recoveryProcess) recordWait(waitErr error) {
	process.mu.Lock()
	defer process.mu.Unlock()
	process.waited = true
	process.waitErr = waitErr
}

func (process *recoveryProcess) kill(t *testing.T) {
	process.mu.Lock()
	if process.waited {
		process.mu.Unlock()
		return
	}
	process.mu.Unlock()
	if err := process.command.Process.Kill(); err != nil {
		if t != nil {
			t.Fatalf("SIGKILL recovery helper: %v\n%s", err, process.output.String())
		}
		return
	}
	waitErr := <-process.done
	process.recordWait(waitErr)
}

func connectRecoveryJetStream(t *testing.T, url string) (*nats.Conn, jetstream.JetStream) {
	t.Helper()
	nc, err := nats.Connect(url, nats.Timeout(5*time.Second), nats.NoReconnect())
	if err != nil {
		t.Fatalf("connect recovery server %s: %v", url, err)
	}
	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		t.Fatalf("create recovery JetStream context: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := js.AccountInfo(ctx); err != nil {
		nc.Close()
		t.Fatalf("recovery JetStream account is not ready: %v", err)
	}
	return nc, js
}
