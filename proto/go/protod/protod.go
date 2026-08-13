// Package protod is the tracer-bullet daemon: the runtime owner behind
// the system's one seam. The interface is data on subjects — canonical
// frames and requests in, facts and typed refusals out. Lifecycle
// (Acquire → URL → Release) is the only Go API a caller sees; every
// other seam in this package is internal.
package protod

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/journal"
)

// Assumption names one substrate property on which the daemon's proofs rely.
type Assumption string

const (
	AssumptionLinearizableReads      Assumption = "linearizable-reads"
	AssumptionTerminalImmutability   Assumption = "terminal-immutability"
	AssumptionAcknowledgedDurability Assumption = "acknowledged-write-durability"
)

// SyncMode declares which acknowledged-write durability envelope the daemon
// enters. The zero value is intentionally invalid: callers must choose the
// crash-only residual or pay for synchronous storage writes.
type SyncMode string

const (
	SyncCrashDurable SyncMode = "crash-durable"
	SyncPowerDurable SyncMode = "power-durable"
)

// ErrOutsideCertifiedEnvelope marks a lifecycle refusal for a substrate
// configuration whose assumptions have not passed an executable gate.
var ErrOutsideCertifiedEnvelope = errors.New("protod: outside certified substrate envelope")

// LifecycleError refuses daemon startup before any substrate resources are
// acquired. Assumption names the executable law the configuration uncovers.
type LifecycleError struct {
	Assumption    Assumption
	Configuration string
}

func (e *LifecycleError) Error() string {
	return fmt.Sprintf(
		"%v: %s uncovers assumption %s",
		ErrOutsideCertifiedEnvelope,
		e.Configuration,
		e.Assumption,
	)
}

func (e *LifecycleError) Unwrap() error { return ErrOutsideCertifiedEnvelope }

// Options configures an acquired daemon. StoreDir is required (tests pass
// temp dirs; tracer data is disposable). Listen defaults to "127.0.0.1:0" —
// a random port on loopback. SyncMode is required. LogWriter receives embedded
// server logs and defaults to stderr.
type Options struct {
	StoreDir           string
	Listen             string
	SyncMode           SyncMode
	LogWriter          io.Writer
	JetStreamClustered bool
	KVReplicas         int
	MemoryStorage      bool
}

// Daemon owns the embedded NATS server, the catalog, and every journal
// it is authority for. It writes only journals it owns (ADR-0009).
type Daemon struct {
	server  *server.Server
	conn    *nats.Conn
	js      jetstream.JetStream
	catalog *catalog

	mu       sync.Mutex
	journals map[string]*journal.Journal

	url  string
	subs []*nats.Subscription
	logs *natsLogSink
}

// Acquire starts the embedded NATS server (JetStream on StoreDir),
// opens the catalog, and subscribes the request and ingress surfaces.
// The daemon serves clients over a real loopback listener; its own
// connection is in-process.
func Acquire(ctx context.Context, opts Options) (*Daemon, error) {
	if opts.StoreDir == "" {
		return nil, errors.New("protod: StoreDir is required")
	}
	if opts.SyncMode != SyncCrashDurable && opts.SyncMode != SyncPowerDurable {
		return nil, &LifecycleError{
			Assumption:    AssumptionAcknowledgedDurability,
			Configuration: fmt.Sprintf("sync mode %q", opts.SyncMode),
		}
	}
	if opts.JetStreamClustered {
		return nil, &LifecycleError{
			Assumption:    AssumptionLinearizableReads,
			Configuration: "clustered JetStream",
		}
	}
	if opts.KVReplicas > 1 {
		return nil, &LifecycleError{
			Assumption:    AssumptionLinearizableReads,
			Configuration: "R>1 KV buckets",
		}
	}
	if opts.MemoryStorage {
		return nil, &LifecycleError{
			Assumption:    AssumptionTerminalImmutability,
			Configuration: "in-memory storage",
		}
	}
	listen := opts.Listen
	if listen == "" {
		listen = "127.0.0.1:0"
	}
	host, portText, err := net.SplitHostPort(listen)
	if err != nil {
		return nil, fmt.Errorf("protod: invalid listen address %q: %w", listen, err)
	}
	port, err := strconv.Atoi(portText)
	if err != nil {
		return nil, fmt.Errorf("protod: invalid listen port %q: %w", portText, err)
	}
	if port == 0 {
		port = server.RANDOM_PORT
	}
	internalPassword, err := randomCredential()
	if err != nil {
		return nil, fmt.Errorf("protod: create internal credential: %w", err)
	}
	applicationPassword, err := randomCredential()
	if err != nil {
		return nil, fmt.Errorf("protod: create application credential: %w", err)
	}
	logWriter := opts.LogWriter
	if logWriter == nil {
		logWriter = os.Stderr
	}
	logSink := newNATSLogSink(logWriter)

	natsServer, err := server.NewServer(&server.Options{
		ServerName: "flb-protod",
		Host:       host,
		Port:       port,
		JetStream:  true,
		StoreDir:   opts.StoreDir,
		NoLog:      false,
		NoSigs:     true,
		SyncAlways: opts.SyncMode == SyncPowerDurable,
		Users: []*server.User{
			{Username: "protod-internal", Password: internalPassword},
			{
				Username: "application", Password: applicationPassword,
				Permissions: &server.Permissions{
					Publish: &server.SubjectPermission{
						Allow: []string{subjectRequestWildcard, ingressWildcard},
					},
					Subscribe: &server.SubjectPermission{Allow: []string{"_INBOX.>"}},
				},
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("protod: create embedded nats-server: %w", err)
	}
	natsServer.SetLogger(logSink, false, false)
	go natsServer.Start()
	if !natsServer.ReadyForConnections(10 * time.Second) {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		return nil, errors.New("protod: embedded nats-server did not become ready")
	}

	release := func() {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
	}

	conn, err := nats.Connect(
		"",
		nats.InProcessServer(natsServer),
		nats.UserInfo("protod-internal", internalPassword),
		nats.Name("foldlab-protod/0.0.0/internal-runtime"),
	)
	if err != nil {
		release()
		return nil, fmt.Errorf("protod: connect in-process: %w", err)
	}
	js, err := jetstream.New(conn)
	if err != nil {
		conn.Close()
		release()
		return nil, fmt.Errorf("protod: create JetStream context: %w", err)
	}

	openedCatalog, err := openCatalog(ctx, js)
	if err != nil {
		conn.Close()
		release()
		return nil, fmt.Errorf("protod: open catalog: %w", err)
	}

	d := &Daemon{
		server:   natsServer,
		conn:     conn,
		js:       js,
		catalog:  openedCatalog,
		journals: map[string]*journal.Journal{catalogJournalName: openedCatalog.journal},
		url:      authenticatedURL(natsServer.ClientURL(), "application", applicationPassword),
		logs:     logSink,
	}

	requestSub, err := conn.Subscribe(subjectRequestWildcard, d.handleRequest)
	if err != nil {
		conn.Close()
		release()
		return nil, fmt.Errorf("protod: subscribe requests: %w", err)
	}
	ingressSub, err := conn.Subscribe(ingressWildcard, d.handleIngress)
	if err != nil {
		conn.Close()
		release()
		return nil, fmt.Errorf("protod: subscribe ingress: %w", err)
	}
	d.subs = []*nats.Subscription{requestSub, ingressSub}
	return d, nil
}

func authenticatedURL(raw, username, password string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	parsed.User = url.UserPassword(username, password)
	return parsed.String()
}

func randomCredential() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// URL is the client-facing NATS URL of the embedded server.
func (d *Daemon) URL() string { return d.url }

// Release drains the surfaces and shuts the embedded server down.
func (d *Daemon) Release() {
	for _, sub := range d.subs {
		_ = sub.Unsubscribe()
	}
	d.conn.Close()
	d.server.Shutdown()
	d.server.WaitForShutdown()
}

// openJournal opens (or creates) a journal this daemon is authority
// for. The catalog handle is shared with the catalog seam.
func (d *Daemon) openJournal(ctx context.Context, name string) (*journal.Journal, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if opened := d.journals[name]; opened != nil {
		return opened, nil
	}
	opened, err := journal.Open(ctx, d.js, name)
	if err != nil {
		return nil, err
	}
	d.journals[name] = opened
	return opened, nil
}
