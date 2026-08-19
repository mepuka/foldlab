package daemon

import (
	"bytes"
	"errors"
	"fmt"
	"net/url"
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
// It carries a setting for every option in [ServerOptionRoster] — the store
// directory that is the substrate's durable identity, the listen address, the
// JetStream enablement, the server name, the log and signal posture, the two
// durability rows, and the eight admission channels the closed inventory reads.
// The roster is the schema and this struct is its Go carriage; a row in one and
// not the other is a defect, and the option-table wall is what says so.
//
// **Every key below is the pinned vendor's own.** The vendor's configuration
// word is used wherever the vendor has one, and its own field name in the
// vendor's snake spelling wherever it does not; [ServerOption.Named] records
// which, per row. No estate word enters the value.
//
// **Two fields are declared inverted, and the inversion is deliberate.** The
// listen switch and the signal switch are the vendor's `dont_listen` and
// `no_sigs` read the positive way round, so that the zero value of this struct
// is the hermetic, signal-free posture an embedded server has to hold. The
// declared VALUE carries the vendor's own key at the vendor's own polarity —
// the inversion is in this struct's field, never in the bytes.
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
	// Signals declares whether the substrate installs the vendor's own signal
	// handlers, and it is the positive reading of the vendor's `no_sigs`. It
	// is false under every posture the estate runs: a library inside another
	// process does not own that process's signals. This used to be the one
	// value the construction set behind the declared value's back; it is a
	// declared row now, transcribed at what is measured, and the constructor
	// reads it like every other row.
	Signals bool
	// HTTPPort is the vendor's `http_port`, the monitoring listener. Its value
	// is a priced row belonging to the operator; what is recorded here is what
	// is MEASURED — the port is unset, so the listener does not exist, and the
	// daemon's own health and registration reads are in-process and need none.
	// Transcribing a measurement is not ruling it.
	HTTPPort int
	// HTTPSPort is the vendor's `https_port`, a closed-inventory row.
	HTTPSPort int
	// ProfPort is the vendor's `prof_port`, a closed-inventory row.
	ProfPort int
	// WebsocketPort is the vendor's `websocket` block's `port`, a
	// closed-inventory row.
	WebsocketPort int
	// MQTTPort is the vendor's `mqtt` block's `port`, a closed-inventory row.
	MQTTPort int
	// ClusterPort is the vendor's `cluster` block's `port`, a closed-inventory
	// row.
	ClusterPort int
	// GatewayPort is the vendor's `gateway` block's `port`, a closed-inventory
	// row.
	GatewayPort int
	// LeafNodePort is the vendor's `leafnodes` block's `port`, a
	// closed-inventory row.
	LeafNodePort int
	// LeafNodeRemotes is the vendor's `leafnodes` block's `remotes`, each
	// declared by the address the substrate would dial. A closed-inventory
	// row, and the one that admits in the other direction.
	LeafNodeRemotes []string
}

// Value is the declared value's own shape, in the JSON domain the
// canonicalizer speaks.
//
// The nesting is the VENDOR's. A row the vendor declares inside a
// configuration block is declared inside that block here, spelled with that
// block's own word, so the table's key for it is a path through the vendor's
// own structure rather than a name the estate flattened and rejoined.
func (d DeclaredServerOptions) Value() map[string]any {
	remotes := make([]any, 0, len(d.LeafNodeRemotes))
	for _, remote := range d.LeafNodeRemotes {
		remotes = append(remotes, remote)
	}
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
			"no_sigs":       !d.Signals,
			"sync_interval": d.SyncInterval.String(),
			"sync_always":   d.SyncAlways,
			"http_port":     float64(d.HTTPPort),
			"https_port":    float64(d.HTTPSPort),
			"prof_port":     float64(d.ProfPort),
			"websocket":     map[string]any{"port": float64(d.WebsocketPort)},
			"mqtt":          map[string]any{"port": float64(d.MQTTPort)},
			"cluster":       map[string]any{"port": float64(d.ClusterPort)},
			"gateway":       map[string]any{"port": float64(d.GatewayPort)},
			"leafnodes": map[string]any{
				"port":    float64(d.LeafNodePort),
				"remotes": remotes,
			},
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

// ServerOptions constructs the pinned vendor's options struct from the declared
// value.
//
// **Nothing is set here that the declared value did not carry.** The struct is a
// CARRIAGE type and never enters the truth plane: it is built from the declared
// value on the way to the vendor's constructor and read back nowhere. The signal
// posture used to be the one exception, set behind the declared value's back
// because an embedded server does not own its process's signals; it is a
// declared row now, so the exception is retired and the sentence above is total.
//
// The closed-inventory rows are constructed from the declared value like every
// other row rather than being pinned shut here. That is deliberate: a
// constructor that zeroed them would make the door decorative, and the door is
// what the estate is relying on. This function is reached only after admission.
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
	remotes := make([]*server.RemoteLeafOpts, 0, len(d.LeafNodeRemotes))
	for _, remote := range d.LeafNodeRemotes {
		address, err := url.Parse(remote)
		if err != nil {
			return nil, fmt.Errorf("read the declared leafnode remote %q: %w", remote, err)
		}
		remotes = append(remotes, &server.RemoteLeafOpts{URLs: []*url.URL{address}})
	}
	return &server.Options{
		ServerName:   d.ServerName,
		StoreDir:     d.StoreDir,
		Host:         d.Host,
		Port:         d.Port,
		JetStream:    d.JetStream,
		DontListen:   !d.Listen,
		NoLog:        d.NoLog,
		NoSigs:       !d.Signals,
		SyncInterval: d.SyncInterval,
		SyncAlways:   d.SyncAlways,
		HTTPPort:     d.HTTPPort,
		HTTPSPort:    d.HTTPSPort,
		ProfPort:     d.ProfPort,
		Websocket:    server.WebsocketOpts{Port: d.WebsocketPort},
		MQTT:         server.MQTTOpts{Port: d.MQTTPort},
		Cluster:      server.ClusterOpts{Port: d.ClusterPort},
		Gateway:      server.GatewayOpts{Port: d.GatewayPort},
		LeafNode:     server.LeafNodeOpts{Port: d.LeafNodePort, Remotes: remotes},
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
//
// "Distinct" is decided by CANONICAL BYTES rather than by Go equality. Identity
// is of canonical bytes throughout this estate, and the declared value now
// carries a list, which Go cannot compare at all — so the comparison the tie
// check needs and the comparison the digest already makes are one comparison.
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
	var readBytes []byte
	for index := range declared {
		candidate := declared[index]
		if candidate.Position != greatest {
			continue
		}
		encoded, err := candidate.Declared.Bytes()
		if err != nil {
			return DeclaredServerOptions{}, fmt.Errorf(
				"take the canonical bytes of the value at position %d: %w", greatest, err,
			)
		}
		if read != nil && !bytes.Equal(readBytes, encoded) {
			return DeclaredServerOptions{}, fmt.Errorf(
				"%w: position %d", ErrTiedDeclaredOptions, greatest,
			)
		}
		read = &declared[index].Declared
		readBytes = encoded
	}
	return *read, nil
}
