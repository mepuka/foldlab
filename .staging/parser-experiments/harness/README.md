# effect-lift-harness — the v0 recognition harness, organized

Pre-grade (`.staging`), extracted 2026-08-28 from the session lanes
(`ngram/`, `lift/`, `dslv0/` hold the original run records and superseded
scripts; this package is canonical). Architecture per the grill rulings:
parser-spined, oxc hot path, sieve demoted to triage, trust only through
the agreement gate.

```
src/contract.ts   the PORTABLE layer: verdict types, refusal taxonomy +
                  spectrum, the v0 rule manifest as data, canonical JSON,
                  verdictKey (the gate's equality). No IO, no parser.
src/sieve.ts      non-parsing triage: transliteration, § anchor, n-grams.
src/lift.ts       engine 1 (ck): typescript@5.9.2, source → Verdict[].
src/plugin.mjs    engine 2 (oxc): the oxlint rule. DELIBERATELY
                  self-contained — engines share only the contract, or
                  the gate proves nothing.
src/gate.ts       the agreement gate + oxc invocation.
src/cli.ts        gate | lift | census | sieve.
models/           sieve-r1.json (NB model + threshold + anchor config).
examples/         blobTree32.ts — the 97-operation showpiece.
```

```sh
mise run check     # tsc --noEmit (strict, green) + agreement gate (green)
mise run census    # wild refusal histogram + spectrum rollup
bun src/cli.ts lift examples/blobTree32.ts
```

State at extraction: gate 265/265 verdict agreement, 9/9 lifts both
engines; strict typecheck clean; census reproduces the session numbers
(6,908 candidates, 0 v0 lifts, branches/loops/handlers < 1.2%).

## The Lean port seam (invocation semantics, left open)

The harness fixes WHAT an engine is, not HOW it runs. The seam:

- **An engine is** any realization of `recognize : SourceText → List Verdict`
  whose output round-trips canonical JSON (`contract.canonJson`). Sync
  function, CLI process, oxlint plugin, Lake executable — all admissible;
  nothing in the contract assumes a runtime.
- **Engine equality is verdict equality** under `contract.verdictKey`
  (refusals on `(kind, name, code)`; lifts on the whole document; `pos`
  engine-local) over the by-construction fixture corpus. That equality IS
  the admission gate — a Lean walker joins by passing `gate` beside the
  existing engines, exactly as oxc joined beside ck.
- **What ports first**: `contract.ts` is the TypeScript mirror of the
  recognition proposal's §7.2 first-order data model, whose ratified
  authoring surface is Lean data — the port direction is Lean-as-source,
  TS-as-mirror, with the manifest generated both ways (R11) once grilled.
  The lift document (`Instruction`/`Ref`/word) is already the shape of
  the store language's run instructions; a Lean engine would emit the
  same canonical JSON and could additionally EXECUTE the document
  against the reference handler — the leg no TS engine is allowed:
  hoover here, execute only in Lean (direction law).
- **What likely never ports**: the oxc chassis (speed instrument) and
  the NB sieve (triage). They are evidence-preparation tools; the gates
  carry the trust, so their hosts are free.

## Standing deviations (inherited knowingly, recorded in contract.ts)

Rule 7 hex pinning disabled (`helperUnpinned: true` on every lift);
`const-yield-load` disabled (load-not-yet-documented); E-BRANCH arms
unattempted (nothing lands in `selective`); engines walk top-level
declarations only. Each is a manifest revision away, and each revision
re-runs the gate.
