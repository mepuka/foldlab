# proto/ — tracer bullet spec (coordinator-owned; builders do not edit)

Ratified 2026-08-12 from a four-way design comparison (minimal / flexible /
agent-first / machine-author-first). This spec is BEHAVIORAL: it fixes the
laws, the scenarios, and the skeleton. Every decision it does not fix is
the builder's to make AND LOG — see Deliverables. Ratified context:
ticket 002 resolution (ownership model), ticket 004 (identity laws),
ADR-0003/0006/0009, the dir contracts (go/daemon/AGENTS.md,
packages/client/AGENTS.md).

## What the bullet proves

One thread, both directions, no trust anywhere:

1. An author (LLM via MCP, or TS via the client) CREATES a type by
   submitting an `flb.type.v0` structure in a narrow-writ REQUEST.
2. The daemon canonicalizes (RFC 8785), derives the digest itself
   (interim scheme: SHA-256 over the canonical structure bytes), refuses
   any asserted digest it cannot re-derive, and appends a scheme-tagged
   type fact to the catalog journal. Same-bytes resubmission converges
   (`created:false`, existing fact) — never an error.
3. A canonical event frame claiming that digest, PUBLISHed to ingress,
   is admitted to a journal; a frame claiming an unknown digest is
   refused. Publish is request/reply — a refusal always has a reply
   home. Admission checks IDENTITY RESOLUTION ONLY: payload conformance
   against the claimed structure is explicitly NOT checked and the spec
   of the admit reply must say so (ratified; conformance arrives later
   as a codegen-derived codec).
4. The author READs journals (including the catalog — it is just a
   journal) and recomputes every chain head locally. Heads are claims;
   readers check them.
5. `contract.describe` returns the daemon's own request/reply contract
   described in `flb.type.v0`; the MCP server derives its tool schemas
   from that reply at startup (drift is structurally impossible).
6. Codegen derives artifacts from a cataloged fact — Effect Schema TS,
   JSON Schema, Go source — deterministically; the round-trip wall
   (derive → compile → re-fold → same digest) passes for the
   effect-schema target. The go target is verified by re-parse in the
   bullet; its byte-level codec wall is a stated future obligation.

## Laws (each one is a test somewhere; violating any is a spec failure)

- W1 No asserted identity: every committed digest is recomputed by the
  daemon from submitted bytes; a mismatch refuses with both values.
- W2 Canonical or refused — but the daemon canonicalizes submitted JSON
  itself first: formatting can never move identity or cause refusal.
- W3 Create converges by content address.
- W4 Create before publish: unknown identity never enters a journal —
  no quarantine, no admission on faith; lag is absence.
- W5 Read-your-admissions: an admit reply means durably appended and
  readable.
- W6 Heads are claims: every read is verified locally by the reader.
- W7 Replies teach: every fact carries what to do next (subjects,
  filled body templates); every refusal carries the law sentence that
  refused, `path`/`got`/`expected`/`example` where applicable, and
  `next` hints sufficient for self-repair without external docs.
- W8 Refusals are data: nothing throws across the seam; no NATS error
  ever carries a domain "no"; client-local failures (unreachable,
  malformed reply) surface as local refusal values, marked local.
- W9 The writ is three verbs: read / publish / request. The client
  implements no authority protocol (no CAS, no fencing). A missing
  capability is a missing request kind on the daemon.
- W10 Every catalog fact is scheme-tagged (`bytes-sha256-v1` interim).
  The identity derivation is an internal seam (`Scheme`) so ticket
  004's exhaustive fold lands as a second scheme with no wire change.

## The authoring grammar — `flb.type.v0` (first cut of the owned structure, ratified)

```
T ::= {"k":"string"|"bool"|"int"|"float"|"null"}
    | {"k":"literal","value":<json scalar>}
    | {"k":"list","of":T}
    | {"k":"struct","fields":{<name>:T,...},"optional":[<name>,...]?}
    | {"k":"union","of":[T,...]}
    | {"k":"brand","name":<string>,"of":T}
    | {"k":"check","base":T,"check":{"name":<string>,"args":{...}}}
    | {"k":"ref","digest":<hex64>}
```

This IS ticket 004's owned canonical structure, v0 — not a throwaway.
Its shape encodes the ratified identity laws: brands identity-bearing;
checks declared-metadata only; refs must resolve to cataloged digests
(the catalog is a DAG by construction — no forward refs, no cycles).
Unknown `"k"` refuses. The grammar grows toward full SchemaAST coverage
under 004; it never gets a parallel competitor.

## Skeleton (the unanimous shape; internal layout is the builder's)

```
proto/
  SPEC.md            this file (do not edit)
  DECISIONS.md       the builder's decisions-encountered log (see below)
  AGENTS.md          bullet laws + graduation map (builder writes)
  CONTEXT.md         bullet-local vocabulary (builder writes)
  wire/              the seam as DATA: SPEC of subjects/shapes + golden
                     byte fixtures, generated once by the Go side,
                     frozen; both sides wall against them independently
  go/                own go.mod (replace foldlab => ../../go); public
                     API = lifecycle only (Acquire/Ready/URL/Release);
                     internal seams: request dispatch, catalog,
                     structure walk, ingress, refusals, contract;
                     cmd/protod binary; black-box conformance test on
                     embedded NATS (journald pattern)
  ts/                own package.json (effect pinned 4.0.0-rc.108 +
                     one NATS TS client, nothing else): wire shapes
                     (Schema), three-verb client + verify-on-read,
                     author fold (Effect Schema → flb.type.v0, partial,
                     refuses beyond v0), codegen (derive + targets +
                     round-trip wall), mcp server (tools derived from
                     contract.describe), session facade with transcript
                     (sugar strictly above the writ), smoke thread test
```

Graduation map (no-redesign claim): go/ → go/daemon + go/cmd;
ts/client → packages/client; ts/author → packages/core; ts/codegen →
packages/codegen; ts/mcp → packages/ai; wire fixtures → fixtures/.

## Ratified amendments (2026-08-12, post-build grilling of DECISIONS.md)

Codex-executed rework; fixture regeneration is AUTHORIZED for these,
with this section as the stated reason:

1. **Refs are Declarations** (supersedes the builder's `flb.ref`
   identity-bearing annotation, D13): in TS authoring a ref is modeled
   as a Declaration whose required identifier IS the digest — covered
   by the existing carve-out. The general law: an annotation is
   identity-bearing exactly when it is the node's only canonicalizable
   substance.
2. **Order never moves identity in unordered collections** (supersedes
   D10; ratifies D9's principle): union members are canonically sorted
   by their canonical bytes before digesting; `optional` stays
   UTF-16-sorted. The sort is grammar law, stated in CONTRACT.md.
3. **`{"k":"opaque"}` joins the grammar** (supersedes the
   `flb.v0.opaque` brand convention, D21): a first-class node meaning
   "any well-formed v0 value, not structurally described here";
   json-schema target renders `{}`. Full self-description stays
   deferred to 004-full.

## Non-goals (out of scope, on purpose)

Effector operations and named bindings; replica roles live (the Role
enum socket may exist and refuse); live tailing/subscription reads;
payload conformance at ingress; self-cataloging the contract's own
types (deferred until 004 full); chunking for large structures (log it
if you hit message limits); multi-daemon anything.

## Deliverables

1. The working thread: TS smoke test AND Go black-box conformance test
   both green, plus fixture walls on both sides.
2. All gates green: `cd proto/go && gofmt -l . && go vet ./... &&
   go test ./...`; `cd proto/ts && bun install && bunx tsc --noEmit &&
   bun test .` — the root gates (`bun run typecheck`, `bun test`,
   go gate in go/) must remain untouched and green.
3. `proto/DECISIONS.md` — the co-deliverable this bullet exists for:
   every decision made that this spec did not fix, one entry each:
   what was decided, alternatives considered, why, and whether it
   smells load-bearing (should be grilled) or incidental. Nothing is
   too small: subject strings, field names, timeouts, journal naming,
   fixture organization, dependency versions.
4. Tracer DATA is disposable: nothing outside proto/ is written;
   catalogs created by tests live in temp dirs.
