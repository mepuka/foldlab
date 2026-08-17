package substrate

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	testTimeout             = 45 * time.Second
	permissionTimeout       = 5 * time.Second
	wrongLastSequence       = jetstream.ErrorCode(10071)
	workQueueOverlap        = jetstream.ErrorCode(10100)
	messageNotFound         = jetstream.ErrorCode(10037)
	serverPin               = "2.14.4"
	goClientPin             = "1.53.1"
	configuredDuplicateWait = 2 * time.Second
)

type testHarness struct {
	server            *server.Server
	storeDir          string
	adminConn         *nats.Conn
	admin             jetstream.JetStream
	applicationConn   *nats.Conn
	applicationErrors <-chan error
}

func TestMain(m *testing.M) {
	probeDir, err := os.MkdirTemp("", "foldlab-substrate-environment-")
	filesystem := "unknown"
	if err == nil {
		filesystem = describeFilesystem(probeDir)
		_ = os.RemoveAll(probeDir)
	}
	fmt.Printf(
		"SUBSTRATE ENV server=v%s go-client=v%s os=%s arch=%s filesystem=%s sync-modes=crash-durable(SyncAlways=false),power-durable(SyncAlways=true)\n",
		server.VERSION,
		nats.Version,
		runtime.GOOS,
		runtime.GOARCH,
		filesystem,
	)
	os.Exit(m.Run())
}

func TestPinnedVersions(t *testing.T) {
	if server.VERSION != serverPin {
		t.Fatalf("nats-server pin=%s, want %s", server.VERSION, serverPin)
	}
	if nats.Version != goClientPin {
		t.Fatalf("nats.go pin=%s, want %s", nats.Version, goClientPin)
	}
}

func describeFilesystem(path string) string {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		command = exec.Command("stat", "-f", "-c", "%T", path)
	case "darwin":
		command = exec.Command("stat", "-f", "%T", path)
	case "windows":
		volume := strings.TrimSuffix(filepath.VolumeName(path), ":")
		if volume == "" {
			return "unknown"
		}
		command = exec.Command(
			"powershell",
			"-NoProfile",
			"-Command",
			fmt.Sprintf("(Get-Volume -DriveLetter '%s').FileSystem", volume),
		)
	default:
		return "unknown"
	}
	output, err := command.Output()
	if err != nil {
		return "unknown"
	}
	description := strings.TrimSpace(string(output))
	if description == "" {
		return "unknown"
	}
	return strings.ReplaceAll(description, " ", "-")
}

func startJetStream(t *testing.T) *testHarness {
	t.Helper()
	return startJetStreamWithOptions(t, &server.Options{
		ServerName: "foldlab-substrate-assumptions",
		JetStream:  true,
		StoreDir:   t.TempDir(),
		DontListen: true,
		NoLog:      true,
		NoSigs:     true,
	})
}

func startPermissionedJetStream(t *testing.T) *testHarness {
	t.Helper()
	applicationErrors := make(chan error, 16)
	harness := startJetStreamWithOptions(t, &server.Options{
		ServerName: "foldlab-substrate-permissions",
		JetStream:  true,
		StoreDir:   t.TempDir(),
		DontListen: true,
		NoLog:      true,
		NoSigs:     true,
		Users: []*server.User{
			{Username: "admin", Password: "admin"},
			{
				Username: "application",
				Password: "application",
				Permissions: &server.Permissions{
					Publish: &server.SubjectPermission{Allow: []string{"flb.req.>", "flb.ing.>"}},
					Subscribe: &server.SubjectPermission{
						Allow: []string{"_INBOX.>"},
					},
				},
			},
		},
	})

	applicationConn, err := nats.Connect(
		"",
		nats.InProcessServer(harness.server),
		nats.UserInfo("application", "application"),
		nats.ErrorHandler(func(_ *nats.Conn, _ *nats.Subscription, err error) {
			select {
			case applicationErrors <- err:
			default:
			}
		}),
	)
	if err != nil {
		t.Fatalf("connect application credential: %v", err)
	}
	t.Cleanup(applicationConn.Close)
	harness.applicationConn = applicationConn
	harness.applicationErrors = applicationErrors
	return harness
}

func startJetStreamWithOptions(t *testing.T, options *server.Options) *testHarness {
	t.Helper()
	natsServer, err := server.NewServer(options)
	if err != nil {
		t.Fatalf("new embedded nats-server: %v", err)
	}
	go natsServer.Start()
	if !natsServer.ReadyForConnections(10 * time.Second) {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		t.Fatal("embedded nats-server did not become ready")
	}
	t.Cleanup(func() {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
	})

	connectOptions := []nats.Option{nats.InProcessServer(natsServer), nats.Name("foldlab/substrate assumptions")}
	if len(options.Users) != 0 {
		connectOptions = append(connectOptions, nats.UserInfo("admin", "admin"))
	}
	adminConn, err := nats.Connect("", connectOptions...)
	if err != nil {
		t.Fatalf("connect admin credential: %v", err)
	}
	t.Cleanup(adminConn.Close)
	js, err := jetstream.New(adminConn)
	if err != nil {
		t.Fatalf("create JetStream context: %v", err)
	}
	return &testHarness{
		server:    natsServer,
		storeDir:  options.StoreDir,
		adminConn: adminConn,
		admin:     js,
	}
}

func testContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	t.Cleanup(cancel)
	return ctx
}

func createStream(t *testing.T, js jetstream.JetStream, config jetstream.StreamConfig) jetstream.Stream {
	t.Helper()
	stream, err := js.CreateStream(testContext(t), config)
	if err != nil {
		t.Fatalf("create stream %s: %v", config.Name, err)
	}
	return stream
}

func createKeyValue(t *testing.T, js jetstream.JetStream, config jetstream.KeyValueConfig) jetstream.KeyValue {
	t.Helper()
	bucket, err := js.CreateKeyValue(testContext(t), config)
	if err != nil {
		t.Fatalf("create KV bucket %s: %v", config.Bucket, err)
	}
	return bucket
}

func requireAPIError(t *testing.T, err error, status int, code jetstream.ErrorCode) *jetstream.APIError {
	t.Helper()
	if err == nil {
		t.Fatalf("got nil error, want API %d/%d", status, code)
	}
	var apiError *jetstream.APIError
	if !errors.As(err, &apiError) {
		t.Fatalf("error %T %v is not a JetStream API error", err, err)
	}
	if apiError.Code != status || apiError.ErrorCode != code {
		t.Fatalf(
			"API error=%d/%d %q, want %d/%d",
			apiError.Code,
			apiError.ErrorCode,
			apiError.Description,
			status,
			code,
		)
	}
	return apiError
}

type wrongLastOperation string

const (
	operationJournalCAS wrongLastOperation = "journal-cas"
	operationKVCreate   wrongLastOperation = "kv-create"
	operationKVUpdate   wrongLastOperation = "kv-update"
	operationKVDelete   wrongLastOperation = "kv-delete"
	operationKVPurge    wrongLastOperation = "kv-purge"
)

func classifyWrongLastSequence(t *testing.T, operation wrongLastOperation, err error) string {
	t.Helper()
	requireAPIError(t, err, 400, wrongLastSequence)
	switch operation {
	case operationJournalCAS:
		return "cas-conflict"
	case operationKVCreate:
		return "key-exists"
	case operationKVUpdate, operationKVDelete, operationKVPurge:
		return "revision-mismatch"
	default:
		t.Fatalf("unknown operation context %q", operation)
		return ""
	}
}

func publishSubjectCAS(
	t *testing.T,
	js jetstream.JetStream,
	subject string,
	payload string,
	expected uint64,
	messageID string,
) (*jetstream.PubAck, error) {
	t.Helper()
	message := nats.NewMsg(subject)
	message.Data = []byte(payload)
	if messageID != "" {
		message.Header.Set(nats.MsgIdHdr, messageID)
	}
	return js.PublishMsg(
		testContext(t),
		message,
		jetstream.WithExpectLastSequencePerSubject(expected),
	)
}

func expectPermissionViolation(t *testing.T, harness *testHarness, message *nats.Msg) {
	t.Helper()
	for {
		select {
		case <-harness.applicationErrors:
			continue
		default:
		}
		break
	}
	if err := harness.applicationConn.PublishMsg(message); err != nil {
		if errors.Is(err, nats.ErrPermissionViolation) {
			return
		}
		t.Fatalf("application publish %s: %v", message.Subject, err)
	}
	if err := harness.applicationConn.FlushTimeout(time.Second); err != nil && !errors.Is(err, nats.ErrPermissionViolation) {
		t.Fatalf("flush application publish %s: %v", message.Subject, err)
	}
	select {
	case permissionErr := <-harness.applicationErrors:
		if !errors.Is(permissionErr, nats.ErrPermissionViolation) {
			t.Fatalf("application error=%v, want permission violation", permissionErr)
		}
		if !strings.Contains(permissionErr.Error(), message.Subject) {
			t.Fatalf("permission error does not name subject %q: %v", message.Subject, permissionErr)
		}
	case <-time.After(permissionTimeout):
		t.Fatalf("application publish to %s produced no permission refusal", message.Subject)
	}
}
