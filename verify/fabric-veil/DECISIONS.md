# Fabric Veil decisions

## DEV-711 — proof and replay wall

- The work digest remains a theory/runtime key supplied by the caller. The model
  never derives it and makes no cross-register claim.
- Veil is pinned at `300c305e945750ab3fb62de4a79c23161b24da39` under Lean
  4.28.0. Claimed obligations set `veil.smt.trust=false`; the trusted twin is a
  negative control outside `theorem-roster.txt`.
- The small model cap is falsification evidence only. The proof claim is the
  generated initialization and per-action invariant preservation checked by the
  kernel after lean-smt reconstruction.
- Trust is enforced by artifact, never prose (round 2): `#gen_theorems` lands
  all 36 generated verification conditions as addressable theorems, and the
  census in `FabricVeil/Proofs.lean` reads each proof term's axiom footprint
  out of the kernel — anything outside {propext, Classical.choice, Quot.sound}
  (sorryAx included) is a failed build. The gate's source/log greps are
  fast-fail hints with no evidentiary weight. Measured while building the
  control: a `veil.smt.trust true` override scoped `in #check_invariants` is
  INERT at this pin (dischargers bind options at spec finalization), so the
  round-1 plant's proofs were in fact reconstructed; the load-bearing site is
  the option in force at `#gen_spec`, which is where the committed control
  plants it and where the census REDs on sorryAx.
- The exported corpus is checked semantics, not trusted semantics (round 2):
  `FabricVeil/Bridge.lean` drives every exported prefix step and attempt
  through the module's generated transition relation via
  `Register.enumerableTransitionSystem` — the `#model_check interpreted`
  execution machinery — at the instance Fin 3 holders / Fin 4 outcomes /
  tokenCap 3 / `presentedToken h = h.val`, chosen minimal to carry every
  corpus row (four distinct outcome strings; presented tokens 1 and 2 embed
  as attempt holders). Verdict or state disagreement fails the library build,
  which runs before regeneration in the gate and in CI. The trusted base for
  the corpus shrinks to the serializer, the holder/outcome name tables, and
  the exporter binary. The model-level negative controls are executed
  mutants: generation runs each mutated step to its violating state and
  refuses to emit a non-violating exhibit; the bridge executes the model-side
  refutation (the generated relation refuses what each mutant accepts).
- The exporter executable links only the corpus module's closure (the pinned
  Veil Trace files): linking the full Veil/Mathlib closure into one binary is
  what deterministically killed the ubuntu CI link step in round 1
  (2316-object link, diagnostic swallowed, 883 ms death). The corpus↔model
  agreement does not ride the exporter; it rides the library build.
- Statement-shape deviations from the B-2 candidate, recorded: (a) tokens are
  `Nat` with a falsification cap rather than an uninterpreted total order —
  the KV mapping is numeric revisions, and the cap is a bound parameter the
  invariants are proved for every positive value of; (b) `renew` advances the
  token because a KV renewal is an append that advances the revision — I1's
  strictness sentence concerns grant/steal, and renew's advance is monotone,
  never decreasing; (c) `expireSteal` requires `¬committed`, freezing the
  register at landing by guard where the candidate kept steal enabled and
  carried a corollary invariant — in kind equivalent because the runtimes
  refuse the same way, and the three post-terminal corpus rows
  (`grant-after-commit`, `renew-after-commit`, `steal-after-commit`) wall
  that correspondence; (d) I1 is encoded with one-step history fields
  (`previousToken`, `lastGrantOrSteal`) instead of the candidate's
  `wasCurrent` history relation — each action stores its pre-state token, so
  step-wise `previousToken ≤ token` chains to global monotonicity.
- The runtime fencing token is the per-key NATS KV revision-CAS order. Grant uses
  `create`; renew and steal use `update(current revision)` and return the new
  revision; commit compares its presented lease revision and preserves that
  token in the terminal outcome. Holder identity is never consulted as
  authority.
- The bucket is exactly `flb-fab-reg`, file-backed, non-clustered R=1, with
  history 64, TTL 0, and max bytes -1. Thus there is no age or byte-size eviction
  lever; 64 revisions are deep enough for the bounded replay/crash audit.
- `go/register` is a fresh path and fresh implementation. This is the named
  dispatch deviation from the ordinary restore rule; archived `go/effector` and
  its watch finding remain checkable only at `archive/pre-estate-focus`.
- Scope-bound TypeScript `hold` races the user's Refusal-only Effect against its
  heartbeat. A failed revision renewal wins the race and interrupts the holder
  fiber. Heartbeats are liveness machinery and carry no theorem claim.
- The trace driver's serializer and name tables, the exporter binary, the
  bridge's finite-instance choice, JSON serialization, TypeScript/Go decoders,
  SHA-256 elsewhere in Plait, cvc5 with proof reconstruction, Lean/compiler,
  and the probed NATS substrate are named trusted base. The corpus twin's step
  SEMANTICS left the trusted base in round 2 (bridge-checked row by row
  against the generated relation); corpus regeneration remains a byte-for-byte
  gate, not a proof of the export glue.
- All runtime rows and claims are bounded to a fixed backing-stream
  incarnation; administrative lifecycle mutation is outside the credential
  guard. The incarnation pin at register-open is a recorded deferral
  (`packages/plait/DECISIONS.md` T6); the DEV-716 ACL suite is the other half
  of the guard. Epoch-bearing tokens are ruled OUT for v0.

## Recorded Windows run

- Platform: Windows 11 x64. Lean 4.28.0 reported Clang 19.1.2. The reference
  cvc5 patch changed its Windows FFI compiler from `cc` to `clang` and was
  applied to pinned cvc5 FFI `ef0efbf`.
- MSYS2 package:
  `mingw-w64-ucrt-x86_64-libc++-19.1.4-1-any.pkg.tar.zst`, SHA-256
  `A1E582F8D00250C1F40F47BF377FE2D7AAF80881DD4CC049482128ECD638BCBA`;
  detached signature SHA-256
  `9553B82A2783EE7D4847E4A63CBE2E046BDFA8F89DD76263D4149714A17CEF25`;
  good MSYS2 signature by key
  `5F944B027F7FE2091985AA2EFA11531AA0AA7F57` (Christoph Reiter).
- The pinned cvc5 1.3.2 Windows binary SHA-256 was
  `DC7CC2A62A348BFC973509760819531996BCDAF73497297A228DEF74703FE9BD`.
  `CPLUS_INCLUDE_PATH` and `LIBRARY_PATH` used the workspace-local libc++,
  Lean library, and MSYS2 UCRT64 directories exactly as scripted.
- First native dependency/model build: 513.4 seconds, exit 1 after dependencies
  succeeded because the local definitions file initially used the wrong JSON
  namespace. Corrected cached `lake build FabricVeil`: 29.1 seconds, exit 0.
  First exporter link/check: 471.1 seconds, exit 1 on Veil-reserved local names;
  corrected exporter build: 60.7 seconds, exit 0. Trusted control build: 14.0
  seconds, exit 0 and `[sorryAx]` observed/refused. Live `run.sh` prints its own
  wall-clock and exit record on every execution; the final full Windows gate
  recorded 40 seconds and exit 0.

## CI cache-fit measurement

Measured locally before finalizing the first key with `tar | zstd -3`: Lake
dependencies were 7,596,303,277 expanded bytes and 2,555,647,160 compressed
bytes (30.78%); the pinned Lean 4.28.0 toolchain was 2,889,878,762 expanded and
688,285,068 compressed bytes. Their combined compressed size was 3,243,932,228
bytes (3.021 GiB), below GitHub's 10 GiB ceiling. PR/push/manual runs may cache
`~/.elan` plus `.lake/packages`; the weekly tier restores no cache.
