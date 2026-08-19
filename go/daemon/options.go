package daemon

import (
	"errors"
	"fmt"

	"github.com/nats-io/nats-server/v2/server"

	"foldlab/canonical"
)

// DeclaredServerOptions is the declared server-options value the daemon starts
// under.
//
// It carries exactly the fields this slice's skeleton depends on — the store
// directory that is the substrate's durable identity, the listen address, the
// JetStream enablement, and the server name if one is declared. The schema for
// the FULL declared option set, and the refusal that closes the channels the
// vendor leaves unopened, are a later slice's work and are deliberately absent
// here: an option this value does not carry is an option the vendor's own
// baseline fills, and reading that baseline back is honest where re-declaring
// it would be a transcription this slice has no wall for.
//
// **Every key below is the pinned vendor's own.** The server, the store
// directory, the listen host, the listen port, the JetStream enablement, and
// the no-listen switch are the vendor's option names verbatim, spelled as that
// vendor's own configuration spells them. No estate word enters the value.
type DeclaredServerOptions struct {
	// ServerName is the vendor's `server_name`. Empty means the vendor
	// aliases a fresh per-incarnation identity, which this slice does not
	// rule on.
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
}

// Value is the declared value's own shape, in the JSON domain the
// canonicalizer speaks.
func (d DeclaredServerOptions) Value() map[string]any {
	return map[string]any{
		"v":    float64(0),
		"kind": "substrate-server-options",
		"options": map[string]any{
			"server_name": d.ServerName,
			"store_dir":   d.StoreDir,
			"addr":        d.Host,
			"port":        float64(d.Port),
			"jetstream":   d.JetStream,
			"dont_listen": !d.Listen,
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
// Nothing is set here that the declared value did not carry, with two stated
// exceptions that are properties of being embedded rather than configuration:
// the vendor's logging and signal handling are suppressed because a library
// inside another process owns neither its process's log nor its signals. Both
// are the vendor's own option names.
func (d DeclaredServerOptions) ServerOptions() (*server.Options, error) {
	if d.JetStream && d.StoreDir == "" {
		return nil, errors.New("a JetStream-enabled declared value must declare a store directory")
	}
	return &server.Options{
		ServerName: d.ServerName,
		StoreDir:   d.StoreDir,
		Host:       d.Host,
		Port:       d.Port,
		JetStream:  d.JetStream,
		DontListen: !d.Listen,
		NoLog:      true,
		NoSigs:     true,
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
