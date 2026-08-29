# EXT / ACC / FIX — spec drafts (extractor lane)

Status: staged, pre-grade drafts — 2026-08-25. Three specifications for the operator to
grill; none is frozen. EXT is implemented (this directory); ACC and FIX are contracts
for the next seats.

---

## EXT — the extractor specification

**EXT-1 (input identity).** The extractor reads exactly the files named in its `PIN`
table, verifies each by git blob SHA-1 before parsing, and refuses (non-zero exit,
`pin-mismatch`) on any deviation. It never fetches; absence of a file is a stop, not a
download. [implemented; tamper test green]

**EXT-2 (instrument).** Syntax-only walk via the pinned TypeScript compiler API
(`typescript@5.9.2`, classic JS API — deliberately not the 7.x native port). No type
checker, no program construction, no lib resolution. Facts requiring resolution enter
only through the two declared name tables, echoed in the output. [implemented]

**EXT-3 (enumerations).** Five independent enumerations, census §7 item 6: (A) the
`AST` union alias members; (B) the `makeGuard` call-site tags; (C) the Base-extending
class declarations with their `_tag` literals; (D) the `Representation` union alias;
(E) the `RepresentationUnion` runtime array. Agreement required: A = C-names (21),
B = C-tags (21), D = A ∪ {Reference} (22), E = D (22). Any mismatch is a loud failure
naming both sides. The 23-tag count trap (Filter/FilterGroup) is a separate executable
test, not folded into the union check. [implemented; all green at the pin]

**EXT-4 (determinism).** Output is a pure function of the pinned bytes: variants
sorted by name (source order preserved via `unionIndex`), fixed key order, LF, final
newline, no timestamps, no host paths, no randomness. Gate: two runs byte-identical +
committed-copy drift test. [implemented]

**EXT-5 (contract stability).** `inventory.json` conforms to INVENTORY-SCHEMA.md
schemaVersion 1; changes bump the version and amend the schema doc in the same commit.

**EXT-6 (eventual home).** Promotion target: a `mise run gen` step regenerating
`inventory.json`, with `git diff --exit-code` as the drift gate (KICKOFF §12 pipeline
step 2 proves the gate by breaking it three ways). Not wired in this staged package —
root `mise.toml` is outside this lane's write footprint.

## ACC — the admission-map specification (draft, next seat)

**ACC-1 (total coverage).** A committed `admission-map.json` assigns every inventory
variant exactly one status: `admitted` (with the target Lean constructor(s) and the
per-field disposition), `deferred` (with the reopening trigger), or `rejected` (with
the stable rejection code the parser emits). The correspondence gate fails on any
uncovered variant. Direction of the check per INVENTORY-SCHEMA.md: inventory → map is
total; model-side extras live in `model-extensions.json`, listed never inferred (A-1
affordance: `ref`/`var`/`mu` today, `vaddr` + address-node when A-1 lands).

**ACC-2 (field discipline).** For every `admitted` variant, every inventory field is
dispositioned: `carried` (names its wire/Lean seat), `checked-then-dropped` (names the
check), or `reject-if-present` (names the code — e.g. `encoding`, `encodingChecks`).
No field may be undispositioned — L3's rule (nothing routed around the encoder) made a
coverage check.

**ACC-3 (Shape B alignment).** The generated Lean correspondence file derives its
ascriptions and exhaustive tag match from inventory + admission map together, so a new
upstream variant fails the gate as `Missing cases: …` until the map covers it.

**ACC-4 (D2/D3 seats).** The admission map is where the mandatory-discriminator rule
and the banned-identifier scan attach (parser design §5); ACC replaces the scaffold's
`ObligationD2D3Pending` placeholder with real statements.

## FIX — the fixture-corpus specification (draft)

**FIX-1 (deterministic generation).** Fixture schemas and values are generated from the
inventory + admission map by seed-free enumeration (size-bounded, per-constructor),
never sampled: reruns converge byte-identically (§10 rule 5).

**FIX-2 (three-way use).** Each fixture serves (i) the TS parser lane (accept/reject
with expected codes), (ii) the Lean decode/encode KATs, (iii) the G4 differential lane
against the pinned build — one corpus, three consumers, provenance shared.

**FIX-3 (decide-wall discipline).** Lean-side KATs compare byte lists / Nat measures
only, never whole-string kernel reduction; per-fixture size bounded (§12 scaling
findings: String-valued kernel work walls near 2k chars; Nat folds are cheap).

**FIX-4 (dumper trust).** The fixture dumper that serializes pinned-build observations
is a trusted seam (T-2, parser design §6) and needs its own TOOLS.md row before its
output enters gated work.
