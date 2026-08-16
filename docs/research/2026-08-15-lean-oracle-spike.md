# Lean 4 as executable oracle — tooling report and working spike

Primary report of the Lean-tooling research thread (Opus 5 agent,
2026-08-15, operator-ordered independent review). **This agent built
and ran the thing rather than reviewing it on paper**: a working
oracle over the unmodified `verify/moves` model, compiled to a native
binary, benchmarked, and diffed against the repo's own RFC 8785
canonicalizer. The spike is preserved at `scratch/spike-lean-oracle/`
(206 lines of Lean: `Oracle/Instance.lean`, `Oracle/Codec.lean`,
`Oracle/Gen.lean`, `Main.lean`; un-ratified evidence, not machinery).
Condensed; all measurements preserved.

## Measured facts

- `lake build oracle` works on the pinned 4.33.0 toolchain with **no
  edits to the model** — `step`/`repair` are ordinary compilable
  definitions.
- **Instantiation is a proof obligation, not boilerplate**: no
  `Ord (α × β)` exists in core/Std; `compareLex` gets `TransCmp` by
  search but **`LawfulEqCmp` is a hand proof** (~5 lines);
  `FiniteCarrier.complete` is a proof. Good news in disguise:
  discharging these means the 17 kernel-checked laws apply to the
  instantiated oracle.
- Performance: `emit 1000000` in 8.66s (~115k cases/s, 369 MiB);
  `serve` (persistent JSON-lines process) ~79k req/s; cold start
  ~56ms; binary 103 MiB. **Never spawn per case** (~4000× slower).
- **Determinism verified**: two 100k-case runs byte-identical
  (sha256); output is LF-only on Windows; `ExtTreeSet.toList` is
  comparator-sorted; `Json.obj` keys self-sort (TreeMap).
  Cross-platform byte-identity is argued (no floats, no entropy, no
  hash iteration, fixed-width ints, GMP Nat, pure String.compare) but
  **must be confirmed in CI across runners before the diff gate
  relies on it**.
- **Offline corpus and online oracle are the same binary and
  compose**: emitted 50k cases, stripped verdicts, replayed through
  `serve` → byte-identical to the original. The fixture is a memoized
  prefix of the oracle, not a separate artifact that can drift.

## The trust base, precisely

- **The Lean 4 compiler is not verified.** The kernel checked the
  *definitions*; the binary runs the *compiler's rendering* of them
  through C. No external checker covers that step. The repo's
  axiom-footprint gate constrains the proofs, not the binary.
- `#print axioms Moves.step` = `{propext, Classical.choice,
  Quot.sound}` — core-clean; orthogonal to compilation.
- **Using the compiler as an oracle generator is categorically safer
  than `native_decide`**: a codegen bug produces a wrong vector that
  the Go side disagrees with — a visible red — not a false theorem.
  No `native_decide`/`Lean.ofReduceBool` enters any theorem.
- Cedar's stance on extraction, verbatim rationale: "C is a
  memory-unsafe language, so a bug in the Lean compiler could lead to
  security issues" — keep the hand-written implementation, test
  differentially.

Recorded trust statement for VERIFICATION.md (as drafted by the
agent): the corpus is authored by the model at concrete carriers
whose lawfulness is discharged by proof; the theorems hold of the
instantiated model, NOT of the binary that emitted the corpus;
agreement is evidence, not proof, bounded by the generator's reach.

## JSON gotchas — measured against the repo's own `jcsprobe`

Within a restricted grammar (ASCII keys, small Nat, ASCII strings),
5000/5000 corpus lines round-tripped **byte-identical** through the
repo's RFC 8785 canonicalizer. Outside it, five divergence classes:

| input | Lean `Json.compress` | Go RFC 8785 |
|---|---|---|
| tab in string | `"a	b"` | `"a\tb"` |
| backspace / form feed | `` / `` | `\b` / `\f` |
| non-BMP object keys | code-point order | UTF-16 code-unit order |
| `9007199254740993` | preserved | `…992` (silent, both sides) |
| `2^70` | integer digits | `1.18…e+21` |

Rules: keep control chars out of the corpus or write a dedicated
emitter; fixed ASCII keys; **bound values below 2^53 or encode as
strings; never Float** (`1e-7` → `0`, `-0.0` → `0`, Infinity → the
string `"Infinity"`); only `.compress` is wire-safe; duplicate keys
drop silently.

Toolchain gotchas: pin Plausible to `rev = "v4.33.0"` or `lake
update` silently bumps the toolchain; don't commit the 103 MiB
binary — build in CI, cache `.lake` on the toolchain hash;
`Oracle:static` fails (imports `Lean.Data.Json`) — relevant only to
the rejected FFI path; `partial def` needed for the serve loop;
changing the candidate comparator silently rewrites the whole corpus
— treat it as a wire-format change.

## Recommended pipeline (as delivered)

- `verify/moves/lakefile.toml` gains `Oracle` lib + `oracle` exe;
  `Oracle/Instance.lean` (carriers + discharged instances),
  `Oracle/Codec.lean`, `Oracle/Gen.lean` (30-line splitmix64 —
  simpler than Plausible for corpus work, index-addressable cases),
  `Main.lean` (`emit N` | `serve`).
- **Tier 1 (every PR)**: `oracle emit 20000 > fixtures/…ndjson`
  (~7.7 MiB, 0.2s); gate = regenerate and `diff`. Go replays as a
  table test — no Lean needed in the Go job.
- **Tier 2 (nightly)**: swap the `bun` probe in
  `go/canonical/differential_fuzz_test.go` for
  `exec.Command(oraclePath, "serve")` — the harness drops in
  verbatim; raise runs from 160 to millions; on failure commit the
  minimized case into the corpus as a permanent regression.
- CI: cache `.lake` keyed on `lean-toolchain`; prove cross-platform
  byte-identity by hashing `emit` output on both runners.

Sources: Lean reference (ValidatingProofs, Lake, FFI), lean4 v4.33.0
Json source, cedar-spec (build_lean_lib.sh, CedarFFI/Main.lean,
create_corpus.sh, workflows), arXiv:2407.01688, Plausible, RFC 8785.
