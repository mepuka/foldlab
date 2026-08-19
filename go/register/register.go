// Package register is a fresh Go twin of Plait's five-action commitment register.
//
// Incarnation bound, and how it is now closed. KV revisions are stream
// sequences, so a bucket delete+recreate resets the token order and a stale
// holder's revision CAS could land on the reborn bucket. That bound used to be
// recorded here as a deferral; it is now PAID. [Open] records the backing
// stream's creation identity and every action re-asserts it before its own law
// checks, so a fence minted under one backing-stream incarnation is never
// honored by another — it refuses `incarnation-mismatch` with a taught repair
// instead. [OpenUnpinned] is the same client with that assertion removed and
// exists only so the pin's refutation can be executed rather than argued; no
// shipped consumer opens it.
//
// The pin is a TRANSCRIPTION of the TypeScript spine's, which landed first: the
// identity, the refusal kind, its law, and its repair are read out of that
// implementation and restated here. A divergence is a defect on this side.
//
// The other half of the guard, the credential suite, is unchanged and still
// outside this package: administrative lifecycle mutation is refused here, not
// prevented here.
package register

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/nats-io/nats.go"
)

const (
	Bucket  = "flb-fab-reg"
	History = uint8(64)
)

var workPattern = regexp.MustCompile(`^[^.*>\s]+$`)

type Outcome struct {
	Token uint64 `json:"token"`
	Value string `json:"value"`
}

type State struct {
	Token   uint64   `json:"token"`
	Holder  *string  `json:"holder"`
	Outcome *Outcome `json:"outcome"`
}

type storedState struct {
	Holder  string   `json:"holder"`
	Outcome *Outcome `json:"outcome"`
}

// Next is one taught repair step: the surface to go to, and what to do there.
//
// Transcribed from the spine's refusal shape so the two languages teach one
// repair. A refusal without one is a bare error wearing a type.
type Next struct {
	Subject string
	Note    string
}

type Refusal struct {
	Kind string
	Law  string
	Got  any
	Want any
	// Next is the repair. Every refusal this package mints carries one.
	Next []Next
}

func (r *Refusal) Error() string {
	return fmt.Sprintf("%s: %s (got %v, want %v)", r.Kind, r.Law, r.Got, r.Want)
}

func refuse(kind, law string, got, want any) error {
	return &Refusal{Kind: kind, Law: law, Got: got, Want: want, Next: repairFor(kind)}
}

// repairFor is the repair table, keyed by refusal kind, transcribed from the
// spine's taught notes. A kind with no row would be a refusal that teaches
// nothing, so the table is total over the kinds this package mints and the
// wall below reads it back.
func repairFor(kind string) []Next {
	switch kind {
	case "incarnation-mismatch":
		return []Next{{
			Subject: "register.open",
			Note:    "Re-open the register and re-derive the fence from the live bucket; a reborn bucket's revisions restart, so every token minted under the destroyed incarnation is void and none of them may be presented again.",
		}}
	case "duplicate-grant":
		return []Next{{
			Subject: "register.observe",
			Note:    "Observe the register for its current token, holder, and landed outcome; this round already has a holder and this contender does not start.",
		}}
	case "outcome-already-landed":
		return []Next{{
			Subject: "register.observe",
			Note:    "Observe the landed outcome and take it as this round's result; an outcome, once set, never changes.",
		}}
	case "stale-register-token":
		return []Next{{
			Subject: "register.observe",
			Note:    "Observe the register for the current token and landed outcome; this fence is superseded and must not be presented again.",
		}}
	case "concurrent-register-update":
		return []Next{{
			Subject: "register.observe",
			Note:    "Re-read the register at its current revision and re-attempt the expire-steal against it.",
		}}
	case "register-absent":
		return []Next{{
			Subject: "register.grant",
			Note:    "Grant the register before renewing, committing, or stealing it; an absent register holds no fence to present.",
		}}
	case "invalid-register-key":
		return []Next{{
			Subject: "register.key",
			Note:    "Present one literal key with no dots, whitespace, or wildcards; a work digest is already one.",
		}}
	case "malformed-register-state":
		return []Next{{
			Subject: "register.observe",
			Note:    "Read the stored state back and repair it to a holder/outcome record; this register's bytes are not one.",
		}}
	case "register-substrate-shape":
		return []Next{{
			Subject: "register.open",
			Note:    "Provision the register bucket file-backed at R=1 with 64 retained revisions and no age or size eviction, then re-open.",
		}}
	default:
		return nil
	}
}

// RefusalKinds is the roster of kinds this package mints, so the repair table's
// totality is checkable rather than asserted.
var RefusalKinds = []string{
	"incarnation-mismatch",
	"duplicate-grant",
	"outcome-already-landed",
	"stale-register-token",
	"concurrent-register-update",
	"register-absent",
	"invalid-register-key",
	"malformed-register-state",
	"register-substrate-shape",
}

// incarnationLaw is the law the pin defends: the fencing order is an order
// within one backing stream, and a reborn stream is a different one.
const incarnationLaw = "A fencing token is honored only by the backing-stream incarnation that minted it."

type Client struct {
	kv nats.KeyValue
	// pinned is the backing stream's creation identity, recorded at open.
	// Empty only on a client opened by [OpenUnpinned].
	pinned string
	// pin says whether every action re-asserts the identity above.
	pin bool
}

// incarnationOf is the backing stream's incarnation identity.
//
// `StreamInfo.Created` is the strongest identity the pinned client publishes:
// the bucket's name is identical across incarnations by construction and every
// state field moves under ordinary writes, while the creation stamp is fixed
// for a stream's whole life and re-minted by its rebirth. The empty string is
// the answer for a status the server did not stamp, and it refuses rather than
// pins — pinning an empty identity would compare equal to every later empty one
// and leave a guard that guards nothing.
func incarnationOf(status nats.KeyValueStatus) string {
	bucket, ok := status.(*nats.KeyValueBucketStatus)
	if !ok {
		return ""
	}
	info := bucket.StreamInfo()
	if info == nil || info.Created.IsZero() {
		return ""
	}
	return info.Created.UTC().Format(time.RFC3339Nano)
}

// Open opens the register bucket and PINS the backing stream's incarnation.
func Open(nc *nats.Conn) (*Client, error) { return open(nc, true) }

// OpenUnpinned opens the register bucket with the incarnation assertion
// removed.
//
// It exists for exactly one purpose: the pin's committed refutation. A control
// that cannot fail proves nothing, so the wall runs the same stale-token
// sequence both ways and records both outcomes — with the pin the stale CAS
// refuses, without it the stale CAS lands on the reborn bucket. No shipped
// consumer calls this, and the wall that does says so in its own output.
func OpenUnpinned(nc *nats.Conn) (*Client, error) { return open(nc, false) }

func open(nc *nats.Conn, pin bool) (*Client, error) {
	js, err := nc.JetStream()
	if err != nil {
		return nil, fmt.Errorf("jetstream: %w", err)
	}
	kv, err := js.KeyValue(Bucket)
	if errors.Is(err, nats.ErrBucketNotFound) {
		kv, err = js.CreateKeyValue(&nats.KeyValueConfig{
			Bucket: Bucket, History: History, TTL: 0, MaxBytes: -1,
			Storage: nats.FileStorage, Replicas: 1,
		})
	}
	if err != nil {
		return nil, fmt.Errorf("open bucket: %w", err)
	}
	status, err := kv.Status()
	if err != nil {
		return nil, fmt.Errorf("bucket status: %w", err)
	}
	cfg := status.Config()
	if status.BackingStore() != "JetStream" || status.History() != int64(History) ||
		status.TTL() != 0 || cfg.MaxBytes != -1 || cfg.Replicas != 1 || cfg.Storage != nats.FileStorage {
		return nil, refuse("register-substrate-shape",
			"The register bucket is file-backed R=1 with 64 retained revisions and no age or size eviction.",
			cfg, "file/R=1/history=64/ttl=0/max_bytes=-1")
	}
	// The pin costs no extra round trip at open: it reads the status the shape
	// check already took.
	pinned := incarnationOf(status)
	if pin && pinned == "" {
		return nil, refuse("incarnation-mismatch", incarnationLaw,
			"a backing stream that reports no creation time",
			"a backing stream that reports its creation time")
	}
	return &Client{kv: kv, pinned: pinned, pin: pin}, nil
}

// Incarnation is the backing-stream identity this client is bound to.
func (c *Client) Incarnation() string { return c.pinned }

// Pinned reports whether this client asserts its incarnation.
func (c *Client) Pinned() bool { return c.pin }

// assertIncarnation re-reads the backing stream's identity and refuses unless
// it is still the incarnation this client pinned at open.
//
// Every action runs this FIRST, ahead of its own law checks, and the ordering
// is the whole point: a reborn bucket's revisions restart from one, so a stale
// token compared against them would refuse `stale-register-token` naming a
// "current" fence no holder of this register was ever granted. The pin refuses
// the question instead of answering it wrongly.
func (c *Client) assertIncarnation() error {
	if !c.pin {
		return nil
	}
	status, err := c.kv.Status()
	if err != nil {
		// A destroyed bucket is not a retryable absence: no future retry can
		// make the pinned incarnation exist again. Classified by operation
		// context plus the error the pinned client returns for "this bucket is
		// not here", never by an error identity alone.
		if errors.Is(err, nats.ErrBucketNotFound) || errors.Is(err, nats.ErrStreamNotFound) {
			return refuse("incarnation-mismatch", incarnationLaw,
				"a destroyed backing stream", c.pinned)
		}
		return fmt.Errorf("assert the register incarnation: %w", err)
	}
	observed := incarnationOf(status)
	if observed == c.pinned {
		return nil
	}
	if observed == "" {
		observed = "a backing stream that reports no creation time"
	}
	return refuse("incarnation-mismatch", incarnationLaw, observed, c.pinned)
}

func validateWork(work string) error {
	if !workPattern.MatchString(work) {
		return refuse("invalid-register-key", "A work digest maps to one literal NATS KV key.", work, "one literal token")
	}
	return nil
}

func encode(s storedState) ([]byte, error) {
	b, err := json.Marshal(s)
	if err != nil {
		return nil, fmt.Errorf("encode register: %w", err)
	}
	return b, nil
}

func decode(entry nats.KeyValueEntry) (storedState, error) {
	var s storedState
	if err := json.Unmarshal(entry.Value(), &s); err != nil {
		return s, refuse("malformed-register-state", "Register state is a holder/outcome record.", err.Error(), "valid JSON state")
	}
	return s, nil
}

func storedEqual(a, b storedState) bool {
	if a.Holder != b.Holder {
		return false
	}
	if (a.Outcome == nil) != (b.Outcome == nil) {
		return false
	}
	if a.Outcome == nil {
		return true
	}
	return a.Outcome.Token == b.Outcome.Token && a.Outcome.Value == b.Outcome.Value
}

func observed(entry nats.KeyValueEntry, stored storedState) State {
	token := entry.Revision()
	if stored.Outcome != nil {
		token = stored.Outcome.Token
	}
	holder := stored.Holder
	return State{Token: token, Holder: &holder, Outcome: stored.Outcome}
}

type reconcileVerdict int

const (
	// The intended append is in place at a later revision: it landed before
	// the failure surfaced.
	reconciledLanded reconcileVerdict = iota
	// A different current revision holds other content: a genuine CAS
	// conflict.
	reconciledConflict
	// The presented revision is still current: nothing landed.
	reconciledUnchanged
)

// reconcileUpdate resolves one failed revision-CAS append per the DEV-704
// seam rules: the outcome of a failed CAS append is ambiguous (it may have
// LANDED before the failure surfaced), so the subject is read back and
// compared to the intended append — never resolved by expecting a duplicate
// PubAck. Within this envelope only this register's contenders write the
// key, so a matching read-back identifies the caller's append (holder names
// are descriptive; identical contender names are one principal).
func (c *Client) reconcileUpdate(work string, presented uint64, intended storedState) (reconcileVerdict, nats.KeyValueEntry, error) {
	entry, err := c.kv.Get(work)
	if err != nil {
		// Vanishing mid-flight is lifecycle mutation. Ask the pin which kind it
		// was: a bucket reborn under this call refuses on the pin's law, and a
		// still-pinned incarnation leaves this write's outcome genuinely
		// ambiguous, which is a transport absence.
		if pinErr := c.assertIncarnation(); pinErr != nil {
			return reconciledUnchanged, nil, pinErr
		}
		return reconciledUnchanged, nil, fmt.Errorf("read-back after failed update: %w", err)
	}
	stored, err := decode(entry)
	if err != nil {
		return reconciledUnchanged, nil, err
	}
	if entry.Revision() > presented && storedEqual(stored, intended) {
		return reconciledLanded, entry, nil
	}
	if entry.Revision() != presented {
		return reconciledConflict, entry, nil
	}
	return reconciledUnchanged, entry, nil
}

// classifyUpdate maps one failed Update to the register's typed refusal or a
// transport error: classification is by operation context plus code (rule 2
// — Update wraps ErrKeyRevisionMismatch), and an ambiguous outcome is
// reconciled by read-back comparison first (rule 1). It returns the landed
// entry when the append turns out to have landed.
func (c *Client) classifyUpdate(op, work string, presented uint64, intended storedState, kind, law string, cause error) (nats.KeyValueEntry, error) {
	verdict, entry, err := c.reconcileUpdate(work, presented, intended)
	if err != nil {
		return nil, fmt.Errorf("%s: %w (update failure: %w)", op, err, cause)
	}
	switch verdict {
	case reconciledLanded:
		return entry, nil
	case reconciledConflict:
		return nil, refuse(kind, law, presented, entry.Revision())
	default:
		if errors.Is(cause, nats.ErrKeyRevisionMismatch) {
			return nil, refuse(kind, law, presented, "the current revision")
		}
		return nil, fmt.Errorf("%s: ambiguous update outcome, nothing landed: %w", op, cause)
	}
}

func (c *Client) Grant(work, holder string) (State, error) {
	if err := validateWork(work); err != nil {
		return State{}, err
	}
	if err := c.assertIncarnation(); err != nil {
		return State{}, err
	}
	intended := storedState{Holder: holder}
	b, err := encode(intended)
	if err != nil {
		return State{}, err
	}
	token, err := c.kv.Create(work, b)
	if err != nil {
		// Reconcile the ambiguous create by read-back (rule 1); classify the
		// conflict by context plus code (rule 2 — Create matches ErrKeyExists).
		entry, gerr := c.kv.Get(work)
		if gerr == nil {
			stored, derr := decode(entry)
			if derr != nil {
				return State{}, derr
			}
			if storedEqual(stored, intended) {
				return State{Token: entry.Revision(), Holder: &holder}, nil
			}
			return State{}, refuse("duplicate-grant", "grant requires the register to be absent", "present", "absent")
		}
		if !errors.Is(gerr, nats.ErrKeyNotFound) {
			return State{}, fmt.Errorf("grant: read-back failed: %w (create failure: %w)", gerr, err)
		}
		if errors.Is(err, nats.ErrKeyExists) {
			return State{}, refuse("duplicate-grant", "grant requires the register to be absent", "present or concurrently created", "absent")
		}
		return State{}, fmt.Errorf("grant register: %w", err)
	}
	return State{Token: token, Holder: &holder}, nil
}

// get is the read every fenced action starts from, and the incarnation
// assertion runs ahead of it: Renew, Commit and ExpireSteal all reach the
// backing stream through here, so one assertion site covers all three without
// any of them being able to forget it.
func (c *Client) get(work string) (nats.KeyValueEntry, storedState, error) {
	if err := validateWork(work); err != nil {
		return nil, storedState{}, err
	}
	if err := c.assertIncarnation(); err != nil {
		return nil, storedState{}, err
	}
	entry, err := c.kv.Get(work)
	if errors.Is(err, nats.ErrKeyNotFound) {
		return nil, storedState{}, refuse("register-absent", "Renew, commit, and expire-steal require a present register.", "absent", "present")
	}
	if err != nil {
		return nil, storedState{}, fmt.Errorf("read register: %w", err)
	}
	stored, err := decode(entry)
	return entry, stored, err
}

func (c *Client) Renew(work string, token uint64) (State, error) {
	entry, stored, err := c.get(work)
	if err != nil {
		return State{}, err
	}
	// A landed outcome refuses on its own law even when the presented token
	// is current: the outcome, not staleness, is the reason.
	if stored.Outcome != nil {
		return State{}, refuse("outcome-already-landed", "an outcome, once set, never changes", stored.Outcome.Value, "absent")
	}
	if token != entry.Revision() {
		return State{}, refuse("stale-register-token", "renew requires the current fencing token", token, entry.Revision())
	}
	b, err := encode(stored)
	if err != nil {
		return State{}, err
	}
	next, err := c.kv.Update(work, b, token)
	if err != nil {
		landed, cerr := c.classifyUpdate("renew", work, token, stored, "stale-register-token", "renew requires the current fencing token", err)
		if cerr != nil {
			return State{}, cerr
		}
		next = landed.Revision()
	}
	holder := stored.Holder
	return State{Token: next, Holder: &holder}, nil
}

func (c *Client) Commit(work string, token uint64, value string) (State, error) {
	entry, stored, err := c.get(work)
	if err != nil {
		return State{}, err
	}
	if stored.Outcome != nil {
		return State{}, refuse("outcome-already-landed", "an outcome, once set, never changes", stored.Outcome.Value, "absent")
	}
	if token != entry.Revision() {
		return State{}, refuse("stale-register-token", "no stale token ever lands", token, entry.Revision())
	}
	landed := &Outcome{Token: token, Value: value}
	intended := storedState{Holder: stored.Holder, Outcome: landed}
	b, err := encode(intended)
	if err != nil {
		return State{}, err
	}
	if _, err := c.kv.Update(work, b, token); err != nil {
		if _, cerr := c.classifyUpdate("commit", work, token, intended, "stale-register-token", "no stale token ever lands", err); cerr != nil {
			return State{}, cerr
		}
	}
	holder := stored.Holder
	return State{Token: token, Holder: &holder, Outcome: landed}, nil
}

func (c *Client) ExpireSteal(work, holder string) (State, error) {
	entry, stored, err := c.get(work)
	if err != nil {
		return State{}, err
	}
	if stored.Outcome != nil {
		return State{}, refuse("outcome-already-landed", "an outcome, once set, never changes", stored.Outcome.Value, "absent")
	}
	intended := storedState{Holder: holder}
	b, err := encode(intended)
	if err != nil {
		return State{}, err
	}
	next, err := c.kv.Update(work, b, entry.Revision())
	if err != nil {
		landed, cerr := c.classifyUpdate("expire-steal", work, entry.Revision(), intended,
			"concurrent-register-update", "expire-steal grants a strictly larger token from the current revision", err)
		if cerr != nil {
			return State{}, cerr
		}
		next = landed.Revision()
	}
	return State{Token: next, Holder: &holder}, nil
}

func (c *Client) Observe(work string) (State, error) {
	if err := validateWork(work); err != nil {
		return State{}, err
	}
	if err := c.assertIncarnation(); err != nil {
		return State{}, err
	}
	entry, err := c.kv.Get(work)
	if errors.Is(err, nats.ErrKeyNotFound) {
		return State{}, nil
	}
	if err != nil {
		return State{}, fmt.Errorf("read register: %w", err)
	}
	stored, err := decode(entry)
	if err != nil {
		return State{}, err
	}
	return observed(entry, stored), nil
}

func (c *Client) History(work string) ([]nats.KeyValueEntry, error) {
	return c.kv.History(work)
}
