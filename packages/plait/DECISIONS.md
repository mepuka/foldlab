# packages/plait — decisions the spine spec did not fix

Task-local placeholders per the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### T1. Build the pinned upstream NATS server command from the Go module lock

Decided: the round-trip harness builds `github.com/nats-io/nats-server/v2`
from `go/go.mod` into a temporary directory, then launches that binary with
JetStream enabled, one replica, and a file-backed temporary store.
Alternatives: download a release archive during every test; check a binary
into the repository; wrap the server library in a new local command. Why: the
repository already pins and verifies `v2.14.4` in its Go module, so building
the upstream command uses an existing checksum-locked source without adding a
binary artifact or a second launcher implementation. **Load-bearing? yes** —
the round trip is evidence only for the exact server version it launches.

### T2. The NATS payload is the canonical envelope bytes

Decided: publish the canonical UTF-8 envelope bytes directly and put the same
envelope digest in `Nats-Msg-Id`; consumers constrained-decode those bytes and
re-derive the digest. Alternatives: an outer JSON frame; compression before
publish. Why: the envelope is already a complete data boundary, and an outer
transport frame would create a second representation with no slice-0 consumer.
Compression remains transport-only and is exercised as a killed wall mutant.
**Load-bearing? no** — a later transport dress may change without moving
identity, provided its decoder yields the same canonical envelope bytes.
