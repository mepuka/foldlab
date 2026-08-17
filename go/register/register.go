// Package register is a fresh Go twin of Plait's five-action commitment register.
//
// Incarnation bound: every claim this twin's walls make holds within a fixed
// backing-stream incarnation; administrative lifecycle mutation is outside
// the credential guard. KV revisions are stream sequences, so a bucket
// delete+recreate resets the token order and a stale holder's revision CAS
// can land on the reborn bucket. The incarnation pin at Open (record the
// backing stream's creation time; refuse on mismatch) is NOT yet implemented
// — recorded deferral, see packages/plait/DECISIONS.md; the DEV-716 ACL
// suite is the other half of the guard.
package register

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"

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

type Refusal struct {
	Kind string
	Law  string
	Got  any
	Want any
}

func (r *Refusal) Error() string {
	return fmt.Sprintf("%s: %s (got %v, want %v)", r.Kind, r.Law, r.Got, r.Want)
}

func refuse(kind, law string, got, want any) error {
	return &Refusal{Kind: kind, Law: law, Got: got, Want: want}
}

type Client struct {
	kv nats.KeyValue
}

func Open(nc *nats.Conn) (*Client, error) {
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
	return &Client{kv: kv}, nil
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
		// Vanishing mid-flight is lifecycle mutation: outside the fixed
		// backing-stream incarnation this twin is bounded to.
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

func (c *Client) get(work string) (nats.KeyValueEntry, storedState, error) {
	if err := validateWork(work); err != nil {
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
