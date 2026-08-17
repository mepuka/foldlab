# Transcript — proof-edit artifact stability

Recorded 2026-08-16 on Windows 11 (x86_64-w64-windows-gnu), against
`verify/moves` at working-tree state of commit `e9fe0a3be`.
Command: `bash run.sh` in this directory.

```
== toolchain ==
Lake version 5.0.0-src+d8b1897 (Lean version 4.33.0)

== cold build (timed) ==
✔ [23/23] Built oracle:exe (3.9s)
Build completed successfully (23 jobs).

real	0m20.136s

corpus digest before: 37ead01ea48e6c1508ce44deb87bee48a615a7ab8f0dbafd7f83b08cd59284cf

== patch: insert a vacuous 'have' into the proof of no_loss ==
   (statement line byte-identical; only the tactic block changes)
patched

== rebuild (timed) ==
✔ [12/23] Built Moves (588ms)
✔ [15/23] Built Oracle.Instance (640ms)
✔ [17/23] Built Oracle.Codec (726ms)
✔ [18/23] Built Oracle.Gen (683ms)
✔ [21/23] Built Main (721ms)
Build completed successfully (23 jobs).

real	0m10.255s

corpus digest after:  37ead01ea48e6c1508ce44deb87bee48a615a7ab8f0dbafd7f83b08cd59284cf

== verdict ==
GENERATED C: byte-identical across the proof edit
CORPUS: byte-identical across the proof edit
```

## Companion measurements (same machine, same session)

Taken by hand in a separate scratch copy of `verify/moves`, not by this
script:

| operation | wall clock |
| --- | --- |
| cold `lake build` from a clean `.lake` | 15.0 s (a second cold run measured 20.1 s) |
| no-op `lake build` | 0.25 s |
| `lake build` after touching `Moves/Model.lean` content | 4.2 s |
| `lake build` after touching `Moves/Violations.lean` content | 1.1 s |

Composition of the sources at that commit:

| file | definitions | `theorem`s | lines |
| --- | --- | --- | --- |
| `Moves/Model.lean` | 42 | 94 | 1961 |
| `Moves/Spec.lean` | 34 (`Prop`-valued statements) | 1 | 175 |
| `Moves/SpecProofs.lean` | 0 | 14 | 143 |
| `Moves/SpecDischarge.lean` | 0 | 1 | 45 |
| `Moves/Violations.lean` | 11 | 5 | 361 |

Import graph, as read from the sources:

```
Moves/Model.lean  ──┬─→ Moves/Spec.lean → Moves/SpecProofs.lean → Moves/SpecDischarge.lean
                    └─→ Moves/Violations.lean
Moves.lean = Model + Violations + SpecDischarge
Oracle/Instance.lean → Moves          (i.e. transitively → every proof in Model.lean)
Oracle/{Codec,Gen}.lean → Oracle/Instance.lean
Main.lean → Oracle/{Codec,Gen}.lean
```

## What this shows

1. A proof-body edit forces re-elaboration of the edited module **and every
   module downstream of it**, including the corpus generator. Cost here:
   about 10 s.
2. The *outputs* are unaffected: every generated `.c` file and the emitted
   conformance corpus were byte-identical across the edit. Lean erases proofs
   before code generation, so proof maintenance does not perturb the
   artifact digest.
3. Therefore REF-6's byte-identical regeneration gate will not produce false
   alarms from proof churn — and, symmetrically, it cannot detect proof
   breakage. The two gates are independent, which is why D-e requires both.
