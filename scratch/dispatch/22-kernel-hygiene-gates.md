# Kernel hygiene gates — the annotation gate and the panic-free source gate

Status: dispatchable now; lane-invariant (serves every build path —
wasm, native, or generator fallback identically). Authority:
post-sweep ruling 4, `docs/design/2026-08-16-ref0-extraction-grill-record.md`.
Evidence base: RQ-2 (`docs/research/2026-08-16-rq2-extraction-proved-or-trusted.md`)
and RQ-1 (`docs/research/2026-08-16-rq1-lean-c-backend.md`), each
with verification addendum.

## Why these two gates exist

RQ-2 demonstrated by execution that the estate's axiom-footprint
gate cannot see the compiled-code channel: a theorem clean under
`#print axioms` coexists with an exported C symbol computing a
different function, because `@[implemented_by]` and `@[extern]`
replace compiled code without touching the proof term. RQ-1
demonstrated that `panic!` in compiled Lean does not trap: it
returns the type's `Inhabited` default, writes one line to stderr,
and the process exits 0 — so a future kernel could silently return
defaulted bytes on the exact path the theorems cover. Both channels
must be closed at the source level before any extraction slice
lands, and closing them now also hardens the corpus generator the
estate already trusts.

## Scope

1. **Annotation gate.** A script that scans the owned model sources
   for `@[implemented_by]` and for `@[extern]` not on a committed
   allowlist, exiting nonzero on any hit. Initial scope: the
   verify/moves package (the future `Moves.Wire` namespace inherits
   the gate for free at REF-1 by living in the same package). The
   allowlist ships initially empty; every future entry requires an
   operator-ratified reason recorded beside it.
2. **Panic-free source gate.** The same sweep (or a sibling script)
   forbids `panic!`, `partial`, and `sorry` in kernel-bound model
   sources. Defining the kernel-bound file/namespace set is part of
   the task and is recorded in the DECISIONS log. Any EXISTING
   violation found in the current tree is a FINDING reported for
   disposition, never silently fixed — findings before fixes.
3. **Wiring.** Both checks join `verify/moves/run.sh` so the gate a
   reviewer already runs carries them; no new entrypoint.
4. **Negative controls**, per verify/AGENTS.md: a planted
   `@[implemented_by]` and a planted `panic!` each demonstrated
   refuted on exactly the check that exists to catch them, traces
   committed.

## Not in scope

The artifact-side half (asserting the panic routine's count in
emitted C is zero) belongs to REF-6, when emission exists — named
here as deferred, not built. The sweep's reword roster (D-d totality
wording, trusted-base completion, and the rest of synthesis §5) is
record wording awaiting operator ratification — this brief builds
machinery only.

## Gates (mechanical)

- `bash verify/moves/run.sh` green with both checks active.
- Both negative controls refuted with committed traces.
- Allowlist file present, empty, with its ratification rule stated
  in a header comment.
- DECISIONS log entry: the kernel-bound scope definition, decided /
  alternatives / why / load-bearing.

Seats: Eng builds on `agent/<name>/<issue>`; Rev reviews; operator
ratifies and merges. The issue body is this brief.
