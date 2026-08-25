# Dispatch brief — worktree 3: SHELL-v0 (executable store, CLI + differential harness)

Operational dispatch instrument, coordinator-issued 2026-08-25. Not a claim-bearing
document. Branch from the tip of `main`. The governing spec is
[STORE-SHELL.md](../STORE-SHELL.md) (RATIFIED, SH1–SH8) — read it whole before writing
anything; this brief adds mechanics only and restates nothing it owns.

## Mission

Build SHELL-v0 exactly as ruled: a NEW Lake package `experiments/entity-store-shell/`
— library, CLI verbs, and the differential harness. v0 ONLY: the daemon (SHELL-v1) is
out of scope until the Windows Std.Http spike runs; do not write socket code.

## Mechanics

- Package: `lean-toolchain` = `leanprover/lean4:v4.33.1`; path-require both
  `entity-store` (`../../formal/entity-store`, lib `E2`) and `fips202`
  (`../../formal/fips202`, lib `Sha3`). Both pin the same toolchain (verified).
- `H := fun b => (⟨Sha3.Impl.sha3_512 b⟩ : E2.Address)`. Confirm the namespace with
  `#check` before use; the KATs in `Sha3/Kats.lean` are your smoke fixtures (the empty
  message and `[0x37, 0xd5, 0x18]` digests are kernel-proved — reuse them, do not mint
  new expected values by hand).
- Pure calls only through the core: `preimageS`/`preimageE`/`addressS`,
  `canonS`/`canonV`, `encSchema`/`decodeSchema`/`decodeValue`, `resolveSchema`/
  `resolveEntity`/`stripPre`/`refsOfPreimage` (in `E2.Resolve`), `refsS`/`refsV`,
  `StoreMap` operations. If a pure function you need is missing from the core, that is
  a FINDING for the coordinator — do not re-implement pure logic in the shell (the
  spec's layer-2 discipline: every shell function is a pure core call, a whitelisted
  IO primitive, or a composition; nothing else).
- The E2 carriers have `DecidableEq`/`BEq` but NO `Repr`: build hex/rendering helpers
  in the shell package; never add instances or code to `formal/`.
- Hex: lowercase, two digits per byte, no separators — the object filename IS the hex
  of the address of the file's exact bytes.
- IO whitelist is spec §3 v0, to the letter: file IO under the store root, argv,
  stdout/stderr, exit codes, temp-file + atomic rename (`IO.FS.rename` after writing
  `objects/.tmp-<hex>`); no clock, no randomness, no environment reads, no network.
  Deterministic output: identical invocations produce identical bytes on stdout.
- Boundary checks and CLI verbs: spec §5, including the SH6 obligation record for
  entity conformance (a `check`-visible marker, e.g. an `obligations/` line per entity
  PUT — pick a mechanism, document it in the README, keep it deterministic).
- Verification-on-open: spec §4 — full WF1+WF2 scan; `check` exits nonzero on any
  violation with a one-line-per-violation report.
- Harness: spec §6 — committed script fixtures under `harness/`; a runner that
  executes each script against (a) the in-process pure `StoreMap` model and (b) a
  fresh disk store via the CLI codepaths, comparing every observable byte-for-byte.
  Minimum scripts: schema put/dedup (same schema twice, field-reorder same address —
  R-10; Q11 twin for entity `vobj` reorder), entity put with schema present, dangling
  ref REJECTED, name set/get, get/resolve round-trips, `check` on a hand-corrupted
  store (flip one byte in an object file — WF1 catch). Divergence anywhere = nonzero
  exit.

## Law of the worktree

- Touch nothing outside `experiments/entity-store-shell/`. `formal/` is read-only
  (building it via the path-require is fine).
- No new dependencies beyond the two path-requires and the toolchain's own `Std`. No
  network at build or run time.
- A design question (anything the spec does not settle) is a STOP-and-report finding,
  not a choice.
- Done = `lake build` green, all harness scripts green, README with run instructions
  and a NOT-CLAIMED section mirroring spec §7. Never push. Declarative commit titles.

## Report

Branch + diff summary; harness runner output (all scripts); the corrupted-store
`check` transcript; any findings (missing pure functions, spec gaps). Performance
notes welcome but claims-free (the pure SHA3 is expected to be slow; v0 correctness
only).
