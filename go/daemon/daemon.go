// Package daemon holds the estate's substrate as a scoped process value.
//
// One Go process owns one embedded server: the declared server-options value
// is resolved by a greatest-position read, the options become the pinned
// vendor's own options struct, the server is constructed and started on its
// own goroutine, and readiness is the vendor's readiness gate plus its
// in-process health read with JetStream enablement requested. Every lifecycle
// verb below is the pinned vendor's own — construct, start, readiness,
// liveness, client URL, in-process connection, stop, wait-for-stop. The estate
// adds no verb of its own to that list.
//
// **The daemon is carriage.** It decides nothing. It holds no private truth:
// the options it starts under are a declared value with a digest, the
// readiness it observes lands as positioned observations on the incarnation
// lane, and the identity of every connection it serves — its own included — is
// a substrate-session fact folded from declared groups. A value this package
// keeps only in a Go field is the drift class it exists to refuse.
//
// **What this package does NOT do, deliberately.** It speaks no `decide` and
// holds no register: the fenced start, the lame-duck disposition, and the
// incarnation retirement fact are a later slice's, and a local "make sure only
// one runs" check here would be exactly the unfenced act that slice exists to
// fence. It defines no schema for the full server-option set and refuses
// nothing. It opens no channel the vendor closes by default — no WebSocket, no
// MQTT, no leafnode, no cluster, no gateway, no monitoring port.
//
// The fully hermetic no-socket posture stays available and stays in use for
// Go-only suites that need no TypeScript client: a declared value with no
// listen address constructs a server with the vendor's own no-listen option
// set. The daemon listens only because the JavaScript client ecosystem is
// client-only and no server embeds in it, so every TypeScript-visible
// capability has to cross as data over a socket.
package daemon

import (
	"errors"
	"fmt"
	"net"
	"runtime"
	"sync"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
)

// Daemon is one embedded substrate held as a process value.
//
// The zero value is not usable; acquire one with [Acquire] and release it with
// [Daemon.Shutdown] followed by [Daemon.WaitForShutdown].
type Daemon struct {
	declared      DeclaredServerOptions
	optionsDigest string
	options       *server.Options
	server        *server.Server

	identityOnce sync.Once
	identity     IncarnationIdentity
	identityErr  error
}

// IncarnationIdentity is what the constructed server declares about ITSELF
// that its options do not carry.
//
// Two rows of the group-1 field roster are in this class. The server mints a
// fresh nkey identity and a fresh exchange key at construction, so neither is
// a function of the options value the daemon declared, and neither belongs to
// any one connection's registration. The server identifier has an exported
// accessor on the pinned vendor's surface; the exchange key does NOT — see
// [Daemon.IncarnationIdentity] for how that gap is closed and what it costs.
type IncarnationIdentity struct {
	// ServerID is the server's own nkey identity, read from the pinned
	// vendor's exported accessor.
	ServerID string
	// XKey is the server's public exchange key, read once from the
	// incarnation's own protocol greeting.
	XKey string
}

// Acquire resolves nothing and constructs everything: it takes one already
// resolved declared server-options value, records the digest the incarnation
// will cite, builds the pinned vendor's options struct from it, and constructs
// the server.
//
// No server option reaches the constructed value except through the declared
// value passed here. The vendor's own baseline fills every option the estate
// has not declared, and those filled values are read back rather than
// re-declared — a transcribed default passed as an argument would turn a
// transcription mistake into a silent change to what the estate runs under.
func Acquire(declared DeclaredServerOptions) (*Daemon, error) {
	digest, err := declared.Digest()
	if err != nil {
		return nil, fmt.Errorf("digest the declared server options: %w", err)
	}
	options, err := declared.ServerOptions()
	if err != nil {
		return nil, err
	}
	constructed, err := server.NewServer(options)
	if err != nil {
		return nil, fmt.Errorf("construct the embedded server: %w", err)
	}
	return &Daemon{
		declared:      declared,
		optionsDigest: digest,
		options:       options,
		server:        constructed,
	}, nil
}

// Declared returns the declared server-options value this daemon started under.
func (d *Daemon) Declared() DeclaredServerOptions { return d.declared }

// OptionsDigest is the name of the declared server-options value — the digest
// the incarnation cites.
func (d *Daemon) OptionsDigest() string { return d.optionsDigest }

// Start runs the server on its own goroutine, which is what makes the pinned
// vendor's blocking start non-blocking. It is not a readiness signal: nothing
// may connect until [Daemon.ReadyForConnections] returns.
func (d *Daemon) Start() { go d.server.Start() }

// ReadyForConnections is the vendor's readiness gate, verbatim.
func (d *Daemon) ReadyForConnections(within time.Duration) bool {
	return d.server.ReadyForConnections(within)
}

// Healthz is the vendor's in-process health read with JetStream enablement
// requested. It reaches no socket and needs no monitoring port.
func (d *Daemon) Healthz() *server.HealthStatus {
	return d.server.Healthz(&server.HealthzOptions{JSEnabledOnly: true})
}

// Running is the vendor's liveness predicate.
func (d *Daemon) Running() bool { return d.server.Running() }

// ClientURL is the address a client outside this process connects to.
func (d *Daemon) ClientURL() string { return d.server.ClientURL() }

// Shutdown stops the server. The retirement FACT is a later slice's; this is
// carriage release and claims no meaning.
func (d *Daemon) Shutdown() { d.server.Shutdown() }

// WaitForShutdown blocks until the stop completes.
func (d *Daemon) WaitForShutdown() { d.server.WaitForShutdown() }

// IncarnationIdentity reads the construct-time identity the options do not
// carry, once, and caches it for the life of the incarnation.
//
// **The gap this closes, stated rather than hidden.** The pinned vendor
// exports `(*server.Server).ID` but exports NO accessor for the server's
// public exchange key, and the key is generated at construction from a fresh
// curve keypair — so it is a function of neither the options value nor any
// connection's registration. The only surface that carries it is the protocol
// greeting the server writes to a connecting client. This method therefore
// opens ONE in-process connection at acquire time, reads the greeting, takes
// the exchange key out of it, and closes the connection again; the greeting is
// read as the INCARNATION's declaration about itself, never as any served
// connection's carriage.
//
// The cost is a real bound on the carriage-invariance differential and the
// closing report states it: of the sixteen group-1 rows, fourteen are folded
// from the options value and the registration alone, one comes from an
// exported accessor, and one — the exchange key — comes from this read. A
// differential arm over those sixteen rows discriminates every row but that
// last one, whose two carriages share a source.
func (d *Daemon) IncarnationIdentity() (IncarnationIdentity, error) {
	d.identityOnce.Do(func() {
		greeting, err := d.readGreeting()
		if err != nil {
			d.identityErr = err
			return
		}
		key, _ := greeting["xkey"].(string)
		d.identity = IncarnationIdentity{ServerID: d.server.ID(), XKey: key}
	})
	return d.identity, d.identityErr
}

// readGreeting opens one in-process connection, reads the first protocol line
// the server writes, and closes it.
func (d *Daemon) readGreeting() (map[string]any, error) {
	conn, err := d.server.InProcessConn()
	if err != nil {
		return nil, fmt.Errorf("open the in-process connection: %w", err)
	}
	defer conn.Close()
	if err := conn.SetReadDeadline(time.Now().Add(greetingDeadline)); err != nil {
		return nil, fmt.Errorf("bound the greeting read: %w", err)
	}
	return readGreetingFrom(conn)
}

const greetingDeadline = 10 * time.Second

// ClientZero is the daemon's own connection to its own substrate.
//
// Per the commission the daemon's connection is a client like any other and
// mints a substrate-session fact exactly like any other. What differs is its
// carriage, which is the whole point of the differential: this handle carries
// BOTH the greeting the connection received and the registration the server
// recorded for it, so the same connection's identity can be folded twice from
// two sources and the two results compared.
type ClientZero struct {
	// Conn is the established in-process connection.
	Conn *nats.Conn
	// Greeting is the protocol greeting THIS connection received, parsed.
	Greeting map[string]any
	// CID is the connection identifier the substrate assigned.
	CID uint64
	// Name is the connection name the daemon registered under.
	Name string
}

// ConnectClientZero establishes the daemon's own in-process connection and
// captures the greeting that connection received on the way in.
//
// The capture wraps the vendor's in-process connection provider rather than
// re-implementing the handshake: the pinned client takes any provider of a
// network connection, so a provider that returns the vendor's own connection
// behind a reader that tees the first protocol line changes nothing about the
// handshake and observes all of it.
func (d *Daemon) ConnectClientZero(name string) (*ClientZero, error) {
	provider := &teeingProvider{server: d.server}
	conn, err := nats.Connect(
		"",
		nats.InProcessServer(provider),
		nats.Name(name),
	)
	if err != nil {
		return nil, fmt.Errorf("connect client zero: %w", err)
	}
	// One round trip before the greeting is read. The server writes its
	// post-connect greeting AFTER the reply to the connect exchange's own
	// round trip, so a fold taken the instant establishment resolves can
	// race it. A second round trip cannot: the greeting was enqueued ahead
	// of this one's reply and is therefore already read.
	if err := conn.Flush(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("settle the client-zero greeting: %w", err)
	}
	greeting, err := provider.greeting()
	if err != nil {
		conn.Close()
		return nil, err
	}
	cid, err := conn.GetClientID()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("read the client-zero connection identifier: %w", err)
	}
	return &ClientZero{Conn: conn, Greeting: greeting, CID: cid, Name: name}, nil
}

// Registration is what the server recorded about one connection when it
// accepted it — the daemon's half of the carriage the greeting is the other
// half of.
type Registration struct {
	// CID is the connection identifier the substrate assigned.
	CID uint64
	// ClientIP is the host the server recorded, empty for an in-process
	// connection which has no address.
	ClientIP string
	// Name is the connection name the connecting process registered under.
	Name string
	// Account is the account the connection is bound to. The registration
	// names it only when it is not the global one, so the global account's
	// own name fills in — which is a read of the server, not a default this
	// package chose.
	Account string
}

// ErrUnregistered refuses a connection identifier the server holds no
// registration for.
var ErrUnregistered = errors.New("the substrate holds no registration for that connection")

// Registration reads the server's own record of one connection.
//
// The read is in-process and needs no monitoring port and no system-account
// credential; it is the registration, not an authority, and nothing here
// treats it as one.
func (d *Daemon) Registration(cid uint64) (Registration, error) {
	connections, err := d.server.Connz(&server.ConnzOptions{CID: cid, Username: true})
	if err != nil {
		return Registration{}, fmt.Errorf("read the connection registrations: %w", err)
	}
	for _, connection := range connections.Conns {
		if connection.Cid != cid {
			continue
		}
		account := connection.Account
		if account == "" {
			account = d.server.GlobalAccount().GetName()
		}
		return Registration{
			CID:      connection.Cid,
			ClientIP: connection.IP,
			Name:     connection.Name,
			Account:  account,
		}, nil
	}
	return Registration{}, fmt.Errorf("%w: %d", ErrUnregistered, cid)
}

// SubstrateFromRegistration folds group one — what the substrate declares
// about itself and about one connection — from the options value, the
// construct-time incarnation identity, and that connection's registration.
//
// No greeting is read here, and that absence is the claim: this is the mint a
// party that never saw the connection's greeting can still perform, and the
// differential is the measurement of whether it produces the same bytes.
//
// The vendor's own omission discipline is transcribed rather than approximated.
// The greeting omits a field whose value is the zero of its sort, and the fold
// reads an omitted field as null, so this carriage must omit exactly where the
// vendor omits: an empty client address, a disabled JetStream, an absent
// exchange key, and the two leafnode-only rows are omitted here for the same
// reason the server omits them there.
func (d *Daemon) SubstrateFromRegistration(registration Registration) (map[string]any, error) {
	identity, err := d.IncarnationIdentity()
	if err != nil {
		return nil, err
	}
	if d.options.ClientAdvertise != "" {
		return nil, errors.New(
			"the declared server options carry a client-advertise address, which this slice does not fold",
		)
	}
	declaration := map[string]any{
		"server_id":   identity.ServerID,
		"server_name": d.server.Name(),
		"version":     server.VERSION,
		"proto":       float64(server.PROTO),
		"go":          runtime.Version(),
		"host":        d.options.Host,
		"port":        float64(d.options.Port),
		"headers":     !d.options.NoHeaderSupport,
		"max_payload": float64(d.options.MaxPayload),
		"client_id":   float64(registration.CID),
	}
	// Omitted exactly where the vendor omits, so the fold reads null exactly
	// where the greeting leaves the key out.
	if d.options.JetStream {
		declaration["jetstream"] = true
	}
	if registration.ClientIP != "" {
		declaration["client_ip"] = registration.ClientIP
	}
	if server.JSApiLevel != 0 {
		declaration["api_lvl"] = float64(server.JSApiLevel)
	}
	if identity.XKey != "" {
		declaration["xkey"] = identity.XKey
	}
	// The two rows the roster calls MEASURED, and the bound they carry.
	//
	// The pinned server writes a second greeting after the connect exchange
	// to any client whose registration declared it understands asynchronous
	// greetings, and that greeting — the one a connection then holds as its
	// current declaration — is the only one carrying the connect-info flag
	// and the bound account. A registration exists only after that exchange,
	// so a connection this method can describe at all is a connection past
	// it, and the flag is true of the declaration it now holds.
	//
	// The bound, stated: the server writes that second greeting only to a
	// client that registered at a protocol understanding it, and the
	// registration this method reads does not carry the protocol. Both
	// pinned clients register at one that does — MEASURED, not assumed, and
	// measured by the differential itself: a client that did not would fold
	// a null here against a true there and redden arm A on the spot.
	declaration["connect_info"] = true
	if registration.Account != "" {
		declaration["remote_account"] = registration.Account
	}
	return SubstrateDeclarationOf(declaration)
}

// teeingProvider hands the pinned client the vendor's own in-process
// connection behind a reader that captures the first protocol line.
type teeingProvider struct {
	server *server.Server

	mu      sync.Mutex
	buffer  []byte
	line    []byte
	settled bool
}

func (p *teeingProvider) InProcessConn() (net.Conn, error) {
	conn, err := p.server.InProcessConn()
	if err != nil {
		return nil, err
	}
	return &teeingConn{Conn: conn, provider: p}, nil
}

// observe keeps the LAST complete greeting the connection has been sent.
//
// A connection receives more than one. The pinned server writes its opening
// greeting before anything else, and then — for a client whose registration
// declared it understands asynchronous greetings — writes a second one after
// the connect exchange, carrying the flag that says so and the account the
// connection bound to. The reference fold reads the connection's CURRENT
// declaration, which is the later of the two, so this capture keeps the later
// of the two as well: capturing only the opening greeting would make this side
// of the differential fold a declaration the connection no longer holds.
func (p *teeingProvider) observe(read []byte) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.settled || len(p.buffer) > maxCapture {
		return
	}
	p.buffer = append(p.buffer, read...)
	for {
		index := indexCRLF(p.buffer)
		if index < 0 {
			return
		}
		if line := p.buffer[:index]; hasGreetingOp(line) {
			p.line = append(p.line[:0], line...)
		}
		p.buffer = p.buffer[index+2:]
	}
}

// maxCapture bounds what the tee retains. The greeting exchange is a few
// hundred bytes; beyond this bound the connection is carrying traffic rather
// than establishing itself.
const maxCapture = 1 << 16

// greeting parses the last greeting captured and SEALS the capture: nothing
// the connection carries afterwards is a declaration about the connection.
func (p *teeingProvider) greeting() (map[string]any, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.settled = true
	if len(p.line) == 0 {
		return nil, errors.New("the connection produced no complete protocol greeting")
	}
	return parseGreeting(p.line)
}

type teeingConn struct {
	net.Conn
	provider *teeingProvider
}

func (c *teeingConn) Read(into []byte) (int, error) {
	read, err := c.Conn.Read(into)
	if read > 0 {
		c.provider.observe(into[:read])
	}
	return read, err
}
