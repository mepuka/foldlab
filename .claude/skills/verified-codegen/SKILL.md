---
name: verified-codegen
description: The discipline for building code generation and verified artifacts that cannot silently lie — generated types, schemas, conformance corpora, canonical serializations, AST-driven tooling, cross-language type projections, DSLs and prose derived from one grammar. Use this skill whenever the user asks for code generation, generated constants/types/schemas, a canonical or deterministic file format, conformance or parity between two representations (model↔runtime, two languages, spec↔implementation), metaprogramming-based derivation, emitters, fixtures another system consumes, or a checker/validator/gate — even if they never say "codegen". Also use it when dispatching multiple agents to build such artifacts in parallel.
---

# Verified codegen

Generated artifacts sit between systems: one side emits, another
trusts. Every failure mode of this arrangement is silent — a
hand-retyped constant drifts, a checker that cannot fail passes
forever, a "canonical" serializer disagrees with its twin in another
language by one escape sequence. This skill is the discipline that
makes those failures loud, mechanical, and cheap to catch. It was
distilled from building a Lean-model → conformance-corpus →
TypeScript/Go pipeline where every one of these rules earned its place
by catching a real defect or preventing a known one.

## The workflow

Assess → Freeze → Build → Falsify → Gate → Record. Each step below
says why it exists; skip a step only when you can say why the failure
mode it guards against cannot occur.

### 1. Find or create the single source of truth

Before generating anything, identify the one place the ground truth
lives — a grammar, a type universe, a schema, a model. Everything else
becomes a *projection* of it: generated types, serialized corpora,
docs, DSL surfaces. The rule that follows is strict because the
alternative decays without any visible event:

**Hand-writing what could be generated is a defect.** A hand-copied
table is correct on the day it is written and unverifiable every day
after. If a value, name, signature, or docstring exists in the source
of truth, the generator must read it from there — by executing the
source's own code, or by metaprogramming against its environment
(compiler API, reflection, AST inspection) — never by transcription.
If some part genuinely cannot be derived (a closed list that pins
WHICH declarations are in scope, a vector-selection choice), commit it
as small, reviewed *data* (a manifest), and let the checker treat the
manifest as the pin and the environment as the truth.

### 2. Freeze the contract before building consumers

When an artifact will have more than one producer or consumer (two
languages, two agents, spec and implementation), write the interchange
contract down FIRST, byte-precisely: record shapes, field order or
ordering rule, escaping, number domain, line endings, record order,
version field. Two ends built against a frozen contract converge; two
ends built "to be reconciled later" produce a third project called
reconciliation.

The freeze will be silent on something — it always is. State in
advance which implementation is normative where the freeze is silent,
and keep a reconciliation table in the spec that records each such
point and how it resolved. Read `references/canonical-form.md` before
designing any serialization — it carries the rules that prevent the
classic traps (the big-integer/double trap, the sorted-vs-fixed key
order decision, the version discipline).

### 3. Build the emitter with self-checks inside

The generator itself refuses to emit anything inconsistent:
round-trips (everything encoded must decode back to itself), count
reconciliation (a header that declares counts must be checked against
the rendered records — and the check must compare *independent*
derivations, see step 4), domain checks (ASCII, integer bounds,
ordering). A generator that prints whatever it computed is half a
generator; the other half is the part that aborts loudly.

Commit the generated output and add a byte-identical regeneration
check (regenerate to a temp file, diff against the committed one).
This single check converts "is the committed artifact fresh?" from a
review question into a gate arm, and it is the backbone every other
check hangs from. Two consecutive regenerations must also agree —
determinism is a property you test, not assume (no timestamps, no
map-iteration order, no floats, no locale).

### 4. Falsify your own machinery

A checker that cannot fail proves nothing — this is the core of the
discipline and the step most often skipped. For every check you build,
demonstrate the failure: mutate the artifact (or temporarily the
source), confirm the check fires *for its own named reason*, restore,
and confirm byte-identity of the restoration. Keep the strongest of
these as committed controls: mutant fixtures with pinned refusal
messages, planted wrong rows, must-not-compile (or must-fail-
typecheck) files each paired with a witness twin that compiles — the
twin proves the refusal is for the intended reason and not file rot.

Watch specifically for **self-comparison**: a check that compares two
values derived from the same expression is vacuously green. (The
session this skill comes from shipped exactly this bug — a header
count checked against the list it was computed from — and only the
falsification probe exposed it.) When writing any consistency check,
ask: could both sides be wrong together? If yes, re-derive one side
independently — from the environment, from the committed bytes, from
a second parser.

### 5. Cross-verify against the living environment

Where the platform has metaprogramming — Lean's environment API,
TypeScript's schema/AST layers, Go's analysis framework, any
compiler's reflection — use it to rebuild the generated artifact's
claims from the environment and compare. This is the strongest form of
verification available: the artifact says "type T has constructors A,
B with fields x, y" and a checker asks the compiler whether that is
true, failing elaboration/compilation on any disagreement. Emission by
execution plus verification by metaprogramming closes the loop from
both sides; drift then requires two independent mechanisms to be wrong
identically.

### 6. Wrap it in a gate

A gate is a single script that runs every check and fails loudly with
a named reason per arm. Read `references/gate-anatomy.md` for the full
arm catalog and the reasons behind each (rosters with orphan
detection, footprint sweeps, partition checks, byte-pinned control
traces, dependency pins asserted from both sides). Two rules that pay
for themselves immediately:

- **Counts verified before quoted.** Any number the gate or your
  report states (records, theorems, tests, vectors) must come from
  running the counting, not from memory or documentation — prose
  counts rot within hours of being written.
- **Quote actual output.** A report of green that does not quote the
  run's own pass lines is a report of nothing; "a report without the
  run is a failed run."

### 6b. Ship the target, not the twin — wire to wire

A conformance harness needs a target before the real artifact exists, so
a reference implementation gets written test-side. That is scaffolding
with an expiry date: when the artifact ships, PROMOTE the reference into
the shipping tree and re-point the harness at the shipped object — the
vectors must gate the thing callers call, never a test-only twin beside
it. Two failure modes bite here, and the second is subtler:

- **The surviving twin.** A reference left test-side means two
  implementations of one judgment, one checked and one shipped.
- **The hand-written re-spelling.** Promoting the logic while
  hand-typing its types re-creates the drift you just removed one layer
  up: machine-VALIDATED is not machine-GENERATED. Before writing any
  type in a generated domain, grep the generated family for it — the
  emitter has usually already produced it.

The chain reads wire to wire, each link with its own wall: model →
emitter → corpus → generated schemas and tables → shipped
implementation → one public seam → hosts. (Worked example, including a
reverted twin and why:
`scratch/dispatch/2026-08-18-wire-to-wire-door-brief.md`.)

### 7. Keep the blast radius deletable

Prefer a new package/directory that *reads* existing code over edits
to existing code; assert the read-only relationship mechanically
(byte-identity via git diff, dependency-manifest pins asserted from
the dependent side, no reverse references from the upstream). The test
of a well-scoped artifact project: rollback is a directory deletion
and one revert, and nothing upstream noticed. This is also what makes
un-reviewed generated machinery acceptable to land at all — it can be
removed as mechanically as it was added.

### 8. Record honestly

Ship a short notes record with the artifact: a ledger of what is
proven/checked vs stated vs deliberately refused (with reasons —
refusals are content, not gaps), corrections to prior documentation
found along the way, and open decision points surfaced for the owner
rather than silently decided. Statements of what is NOT claimed are as
load-bearing as the claims: "conformance vectors check verdicts; they
promote no runtime guarantee" prevents the artifact from being cited
for more than it proves.

## Multi-agent amplification

Parallel agents multiply this discipline's throughput when — and only
when — the contract-freeze comes first. Read
`references/fleet-dispatch.md` before dispatching a fleet; the short
version: freeze the interchange contract yourself before fan-out;
give every lane an exclusive file territory (one writer per file,
including generated artifacts); require structured returns whose
verification sections quote real command output; forbid lane commits;
and integrate as the coordinator by re-running every gate and test
yourself — lane reports are testimony, your runs are evidence. For
design-space exploration (before building), fan out *perspectives*
instead of territories: several agents, one question, forced-distinct
lenses, no coordination — convergence is signal, divergence is a
decision list.

## Quick reference

| Smell | Rule violated |
| --- | --- |
| A constant table typed by hand from another file | Generate by executing the source (§1) |
| "We'll align the two implementations afterward" | Freeze the contract first (§2) |
| Emitter prints without validating its own output | Self-checks inside (§3) |
| A green check nobody has ever seen red | Falsify your machinery (§4) |
| Check compares a value to itself in disguise | Independent derivation (§4) |
| Generated claims about types nobody re-verifies | Metaprogram against the environment (§5) |
| A count in prose ("about 200 theorems") | Counts verified before quoted (§6) |
| Codegen edits sprinkled through existing modules | Deletable blast radius (§7) |
| Ledger lists only what worked | Refusals and non-claims are content (§8) |
