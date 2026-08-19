package daemon

import (
	"errors"
	"fmt"
	"time"

	"github.com/nats-io/nats-server/v2/server"

	"foldlab/canonical"
)

// The ruled option values, as declared rows.
//
// Operator ruling, 2026-08-19, riding the supervisor lane. Three rows leave the
// priced-grill list and enter the declared value; each is stated here with what
// it costs.
const (
	// DeclaredSyncInterval is the interval at which the vendor flushes its
	// file store to disk. The vendor's own baseline is this value, and the
	// ruling ACCEPTS it rather than tightening it.
	//
	// **The residual, stated rather than buried.** Between two flushes the
	// substrate's durability against POWER LOSS is not guaranteed: a host that
	// loses power mid-interval can lose acknowledged writes that had not yet
	// reached the platter. Process crash is a different failure and is covered
	// — the recovery suite measures it. The reversible field that would close
	// the power-loss residual is [DeclaredServerOptions.SyncAlways], declared
	// false, and flipping it is a one-field change with a measured throughput
	// cost. The ruling is: accept the interval, state the residual, keep the
	// field reversible.
	DeclaredSyncInterval = 120 * time.Second
	// DeclaredSyncAlways is the reversible field the residual above names. It
	// stays false: every write synchronous is the other end of the trade and
	// the ruling did not take it.
	DeclaredSyncAlways = false
)

// ErrUndeclaredServerName refuses a daemon posture with no server name.
//
// Left unset the vendor aliases a fresh identity per run, and that identity is
// what a substrate-session fact carries as its server name and what a lame-duck
// fact names as its server — so an unnamed server makes both facts carry a
// coordinate that means nothing across a restart. The ruling is that the daemon
// NAMES its server, and the refusal is how that ruling is kept rather than
// remembered.
var ErrUndeclaredServerName = errors.New("the declared server-options value must name its server")

// ErrUndeclaredSyncInterval refuses a declared value with no sync interval.
//
// An absent interval is not the same fact as an accepted one: the vendor would
// fill its own baseline and the estate would be running under a value nobody
// declared. The row is accepted at the vendor's own number, and it is accepted
// out loud.
var ErrUndeclaredSyncInterval = errors.New("the declared server-options value must declare its sync interval")

// DeclaredServerOptions is the declared server-options value the daemon starts
// under.
//
// It carries the fields this slice's lifecycle depends on — the store directory
// that is the substrate's durable identity, the listen address, the JetStream
// enablement, the server name, the log posture, and the two durability rows.
// The schema for the FULL declared option set, and the refusal that closes the
// channels the vendor leaves unopened, are a later slice's work and are
// deliberately absent here: an option this value does not carry is an option the
// vendor's own baseline fills, and reading that baseline back is honest where
// re-declaring it would be a transcription this slice has no wall for.
//
// **Every key below is the pinned vendor's own.** The server, the store
// directory, the listen host, the listen port, the JetStream enablement, the
// no-listen switch, the log suppression, and the two durability rows are the
// vendor's option names verbatim, spelled as that vendor's own configuration
// spells them. No estate word enters the value.
type DeclaredServerOptions struct {
	// ServerName is the vendor's `server_name`, and under the daemon posture
	// it is SET. See [ErrUndeclaredServerName] for why it is refused empty.
	ServerName string
	// StoreDir is the vendor's `store_dir` — the substrate's durable
	// identity, and the coordinate a later slice's incarnation chain is
	// keyed by.
	StoreDir string
	// Host is the vendor's `addr`. Empty with Listen false is the hermetic
	// no-socket posture.
	Host string
	// Port is the vendor's `port`. The vendor's own random-port sentinel is
	// carried verbatim; the resolved port is read back from the running
	// server, never re-declared.
	Port int
	// JetStream is the vendor's `jetstream`.
	JetStream bool
	// Listen declares whether the substrate binds a socket at all. False
	// sets the vendor's `dont_listen`, which is the fully hermetic posture
	// the Go-only suites keep.
	Listen bool
	// NoLog is the vendor's `no_log`. **Under the daemon posture it is
	// false**: a daemon owns its process and therefore owns its log, and
	// suppressing the substrate's own account of what it did would be the
	// daemon keeping a private silence rather than a private truth. The
	// hermetic test harness sites keep their own true, because a test process
	// owns neither its output nor the battery's.
	//
	// Suppression is the only thing this row governs. Nothing here configures
	// a logger, so a false value writes nothing until the process that owns
	// the log says where it goes.
	NoLog bool
	// SyncInterval is the vendor's `sync_interval`. Accepted at
	// [DeclaredSyncInterval] with the power-loss residual stated there.
	SyncInterval time.Duration
	// SyncAlways is the vendor's `sync_always`, the one reversible field the
	// residual names. Declared [DeclaredSyncAlways].
	SyncAlways bool
}

// Value is the declared value's own shape, in the JSON domain the
// canonicalizer speaks.
func (d DeclaredServerOptions) Value() map[string]any {
	return map[string]any{
		"v":    float64(0),
		"kind": "substrate-server-options",
		"options": map[string]any{
			"server_name":   d.ServerName,
			"store_dir":     d.StoreDir,
			"addr":          d.Host,
			"port":          float64(d.Port),
			"jetstream":     d.JetStream,
			"dont_listen":   !d.Listen,
			"no_log":        d.NoLog,
			"sync_interval": d.SyncInterval.String(),
			"sync_always":   d.SyncAlways,
		},
	}
}

// Bytes are the declared value's canonical bytes.
func (d DeclaredServerOptions) Bytes() ([]byte, error) {
	return canonical.CanonicalizeValue(d.Value())
}

// Digest is the declared value's name — the digest of its canonical bytes, and
// the digest a running incarnation cites.
func (d DeclaredServerOptions) Digest() (string, error) {
	return digestOf(d.Value())
}

// ServerOptions constructs the pinned vendor's options struct from the
// declared value.
//
// Nothing is set here that the declared value did not carry, with ONE stated
// exception that is a property of being embedded rather than configuration: the
// vendor's signal handling is suppressed, because a library inside another
// process does not own its process's signals. The log posture used to be the
// second such exception and is not any more — it is a declared row now, and the
// declared value is what decides it.
func (d DeclaredServerOptions) ServerOptions() (*server.Options, error) {
	if d.ServerName == "" {
		return nil, ErrUndeclaredServerName
	}
	if d.SyncInterval == 0 {
		return nil, ErrUndeclaredSyncInterval
	}
	if d.JetStream && d.StoreDir == "" {
		return nil, errors.New("a JetStream-enabled declared value must declare a store directory")
	}
	return &server.Options{
		ServerName:   d.ServerName,
		StoreDir:     d.StoreDir,
		Host:         d.Host,
		Port:         d.Port,
		JetStream:    d.JetStream,
		DontListen:   !d.Listen,
		NoLog:        d.NoLog,
		NoSigs:       true,
		SyncInterval: d.SyncInterval,
		SyncAlways:   d.SyncAlways,
	}, nil
}

// PositionedOptions is one declared server-options value at the position it
// was declared at.
type PositionedOptions struct {
	Position int
	Declared DeclaredServerOptions
}

// ErrNoDeclaredOptions refuses a read over no declared value at all.
var ErrNoDeclaredOptions = errors.New("no server-options value is declared")

// ErrTiedDeclaredOptions refuses two distinct declared values at one position.
var ErrTiedDeclaredOptions = errors.New("two distinct server-options values are declared at one position")

// GreatestDeclaredOptions is the greatest-position read over declared
// server-options values — the same read the provision fold already proves.
//
// A tie at the greatest position REFUSES rather than picking: two distinct
// values at one position is a disagreement, and choosing one of them would
// make the read a decision. Two IDENTICAL values at one position are one
// value declared twice and are admitted, because there is nothing to choose
// between.
func GreatestDeclaredOptions(declared []PositionedOptions) (DeclaredServerOptions, error) {
	if len(declared) == 0 {
		return DeclaredServerOptions{}, ErrNoDeclaredOptions
	}
	greatest := declared[0].Position
	for _, candidate := range declared[1:] {
		if candidate.Position > greatest {
			greatest = candidate.Position
		}
	}
	var read *DeclaredServerOptions
	for index := range declared {
		candidate := declared[index]
		if candidate.Position != greatest {
			continue
		}
		if read != nil && *read != candidate.Declared {
			return DeclaredServerOptions{}, fmt.Errorf(
				"%w: position %d", ErrTiedDeclaredOptions, greatest,
			)
		}
		read = &declared[index].Declared
	}
	return *read, nil
}
