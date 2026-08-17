# Local gates unification — determination (Lean build cost)

> **ADOPTED BY THE COORDINATOR, 2026-08-17.** Mitigation 1 (one built
> tree per branch; never fresh-worktree the fabric-veil package;
> in-place plants; incremental runs only) is IN FORCE by operator
> directive — it converted a ~35-minute cycle into 40–113 s the same
> day it was measured. Mitigations 2–5 are standing operational rules.
> The durable store (host-level, junctioned `.lake/packages`, keyed
> byte-identically to the CI cache key) is ticketed as DEV-721, held
> until the DEV-711 repair round merges — its seeding step consumes
> that round's built tree, and its `fabric-veil-gate.yml` key citation
> resolves when PR #74 lands. The weekly no-cache CI tier stays the
> cold-truth canary.

Author: Fable review seat, 2026-08-17, immediately after the DEV-711
review under the operator's no-full-rebuild directive. Provenance
note: the determination's original charge text was not in this seat's
context; this document is built from the directive's specification
(mandatory head section + durable store design) and this run's own
measurements. The coordinator should graft any charged sections this
misses.

All numbers below are measured on this host (Windows 11 x64, Git
Bash, scoop elan 4.2.3) during the DEV-711 review, or read from the
PR's CI runs. No estimates.

---

## MITIGATIONS AVAILABLE TODAY, ZERO NEW MACHINERY

1. **Never fresh-worktree the fabric-veil package.** One built tree
   per branch is the working asset; plants and repairs mutate files
   in place and revert with `git checkout --`; every subsequent gate
   run pays incremental elaboration only. The DEV-711 review's built
   tree is live at
   `C:\Users\kokok\AppData\Local\Temp\claude\C--Users-kokok-Dev-foldlab\785426dc-3dbf-43e8-992c-b457257f4515\scratchpad\wt-711`
   (PR #74 head, tracked files byte-clean, `.lake` fully populated:
   Mathlib olean cache, Veil, lean-smt, lean-auto, patched cvc5,
   MSYS2 libc++ substrate). The repair round works THERE.
   **Measured incremental costs once a tree is built** (this run's
   own plants):
   - full `run.sh` with a MODEL EDIT (Statements.lean changed, SMT
     discharge re-runs): **113 s** end-to-end, of which
     `FabricVeil.Statements` re-elaboration was 63 s;
   - full `run.sh` with no Lean edit (pure replay — the seat's
     recorded final run): **40 s**;
   - TS replay wall `bun test Register.test.ts`: **24 s**;
   - Go replay wall `go test ./register/`: **1.4 s**.
   Versus cold: **1172 s** for the gate proper plus ~15–20 min of
   dependency fetch/cache download before it (and CI paid 19–40 min
   cold both times). The asset converts a ~35-min cycle into 40–113 s.

2. **The toolchain layer is already unified and free.** elan serves
   4.28.0 / 4.33.0 / 4.34.0-rc1 from one global store
   (`scoop/apps/elan/4.2.3/.elan/toolchains`); no per-tree toolchain
   cost exists today. Nothing to build; just never vendor a toolchain
   into a tree.

3. **Mathlib's olean cloud cache already does the heavy lifting** via
   the dependency's post-update hook — my cold run compiled almost no
   Mathlib. Keep the network path to it open in any environment where
   gates run cold; the cost of losing it is the difference between
   minutes and hours.

4. **Serialize gate runs against a shared tree.** Two `lake build`s
   in one `.lake` at once is the only way today's zero-machinery
   sharing corrupts anything. The operator's one-seat-at-a-time flow
   already satisfies this; state it as a rule rather than relying on
   luck.

5. **Record the two Windows preconditions this run hit** (they cost
   two failed cold attempts): `core.longpaths=true` must be in effect
   for deep worktree paths (the mathlib clone dies with "Filename too
   long" under a ~120-char base path; process-scoped
   `GIT_CONFIG_PARAMETERS="'core.longpaths=true'"` suffices — no
   global config edit needed), and `setup-windows.ps1`'s bare `tar`
   must resolve to System32 bsdtar, not MSYS tar (review finding 14;
   until the script pins the binary, run gates from a shell where
   System32 precedes Git's `usr/bin`).

---

## Durable store design (the smallest thing worth building)

**Problem.** Every fresh checkout of a Veil-pinned package pays
~8 GiB of dependency fetch plus dependency builds before the first
gate. Branches, review worktrees, and seats multiply that cost. CI
already solved this for itself with a keyed cache; local runs have no
equivalent, so today's answer is mitigation 1 (keep built trees).

**Design: one host-level dependency store, keyed exactly like CI.**

- **Location**: `C:\Users\kokok\.foldlab\lean-store\<key>\packages`
  (outside every checkout and every tmp dir; survives worktree
  lifecycle and scratchpad cleanup — the current asset tree lives in
  a Temp path precisely because no such store exists yet).
- **Key**: `hash(lean-toolchain, lake-manifest.json,
  setup-windows.ps1)` — byte-identical inputs to the CI cache key in
  `.github/workflows/fabric-veil-gate.yml:48`. One invalidation
  discipline everywhere: a pin move changes the key in CI and locally
  at the same commit, by construction.
- **Mechanism**: junction, not copy. A tree at the same key runs
  `New-Item -ItemType Junction .lake\packages -> <store>\packages`
  before its first `lake update`. Lake builds dependencies in place
  under `packages/<dep>/.lake/build`, so the junction shares BOTH
  sources and built dep artifacts. The package's OWN artifacts stay
  per-tree in `verify/fabric-veil/.lake/build` (six FabricVeil
  modules — the 63 s Statements elaboration is the dominant per-tree
  cost, paid once per tree, which is correct: it is the part that
  differs between branches).
- **Population**: the first tree at a new key builds into the store
  through the junction (no separate populate step). Seeding from the
  existing asset: move `wt-711/verify/fabric-veil/.lake/packages`
  into the store under the current key and junction it back — one
  `Move-Item` + one `New-Item`, after the DEV-711 repair round lands
  (not before; the directive freezes that tree as-is).
- **Concurrency rule**: the store inherits mitigation 4 — one gate
  run per key at a time. If parallel seats ever become the norm, the
  upgrade is per-seat clones from the store (`robocopy`), not locks.
- **`lake update` discipline**: at fixed pins, `lake update` is
  deterministic and rewrote nothing in three runs on this host (the
  committed manifest stayed byte-identical). On a PIN MOVE, the key
  changes and the first build populates a fresh store dir; old key
  dirs are garbage — delete manually when disk pressure says so
  (measured store size: ~7.6 GB expanded; 2.55 GB as tar|zstd -3 if
  a machine-move snapshot is ever wanted — same bytes CI caches
  against its 10 GiB ceiling, measured fit 3.021 GiB combined with
  the toolchain).
- **What this deliberately does NOT do**: no daemon, no symlink
  farms into repos/, no sharing across different manifest keys, no
  background sync, no change to any gate script — `run.sh` remains
  byte-identical; the junction is invisible to it. The weekly
  no-cache CI tier stays the cold-truth canary (already ruled),
  which bounds the blast radius of any store corruption to one week.

**Order of adoption**: mitigation 1 now (in force by directive);
preconditions recorded now (item 5); the store lands as a one-page
follow-up brief after the DEV-711 repair round merges, seeded from
the asset tree. Nothing here needs ratification machinery beyond
that brief — it changes no gate, no pin, and no claim.
