// Package register is a fresh Go twin of Plait's five-action commitment register.
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

func observed(entry nats.KeyValueEntry, stored storedState) State {
	token := entry.Revision()
	if stored.Outcome != nil {
		token = stored.Outcome.Token
	}
	holder := stored.Holder
	return State{Token: token, Holder: &holder, Outcome: stored.Outcome}
}

func (c *Client) Grant(work, holder string) (State, error) {
	if err := validateWork(work); err != nil {
		return State{}, err
	}
	b, err := encode(storedState{Holder: holder})
	if err != nil {
		return State{}, err
	}
	token, err := c.kv.Create(work, b)
	if err != nil {
		return State{}, refuse("duplicate-grant", "grant requires the register to be absent", "present or concurrently created", "absent")
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
	if stored.Outcome != nil || token != entry.Revision() {
		return State{}, refuse("stale-register-token", "renew requires the current fencing token", token, entry.Revision())
	}
	b, err := encode(stored)
	if err != nil {
		return State{}, err
	}
	next, err := c.kv.Update(work, b, token)
	if err != nil {
		return State{}, refuse("stale-register-token", "renew requires the current fencing token", token, "the current revision")
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
	b, err := encode(storedState{Holder: stored.Holder, Outcome: landed})
	if err != nil {
		return State{}, err
	}
	if _, err := c.kv.Update(work, b, token); err != nil {
		return State{}, refuse("stale-register-token", "no stale token ever lands", token, "the current revision")
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
	b, err := encode(storedState{Holder: holder})
	if err != nil {
		return State{}, err
	}
	next, err := c.kv.Update(work, b, entry.Revision())
	if err != nil {
		return State{}, refuse("concurrent-register-update", "expire-steal grants a strictly larger token from the current revision", entry.Revision(), "the current revision")
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
