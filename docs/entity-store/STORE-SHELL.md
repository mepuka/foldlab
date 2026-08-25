# STORE-SHELL — the executable store

Status: RATIFIED by grilling 2026-08-25 (joints SH1–SH8, all as recommended; operator
ruling in-session). Promoted from `.staging/shell/STORE-SHELL-draft.md` the same day —
the promoting act is this commit. This spec implements
[STORE-MODEL.md](STORE-MODEL.md) and never restates it. Working labels throughout
(R-1 pending).

## 1. Thesis: refinement by construction of sharing

The shell is Lean. It imports the gated pure core (`E2`) and every state transition it
performs IS a call to the proved functions — `preimageS`/`preimageE`, `addressS`,
`canonS`/`canonV`, `encSchema`/`decodeSchema`, the `getChecked` discipline. IO moves
bytes between disk/socket and those functions; it never re-implements them. The
implementation cannot drift from the model in any pure respect, because the pure
respects are the same compiled code.

Toolchain receipts (verified on the pinned v4.33.1 source tree, 2026-08-25): `Std.Http`
(Protocol/Server/Transport; `Std.Http.Server.serve` over a `Handler` typeclass),
`Std.Async` (TCP/UDP/DNS/Timer/Process/Signal), `Std.Sync` module family
(`Std.Mutex`/Channel/Broadcast/CancellationToken/SharedMutex — constants live in the
`Std` namespace), `Std.Do` (SPred/WP/Triple — Hoare triples over monadic code).

`H` instantiates with the estate's own proved SHA3-512:
`Sha3.Impl.sha3_512 : List UInt8 → List UInt8` from `formal/fips202` (refinement bridge
`sha3_512_bridge`, kernel-checked KATs; same v4.33.1 toolchain pin), wrapped as
`fun b => (⟨Sha3.Impl.sha3_512 b⟩ : Address)` — a 64-byte digest, matching the
carrier's declared placeholder width.

**The claim ladder (claim discipline C5 — each rung is a distinct claim, never
conflated):**

- **Rung 0 — shared core (by construction).** Pure behavior of the shell equals the
  model's, because it is the model's code. Not a theorem; an architectural invariant,
  checked by the import graph (the shell defines no function whose type could shadow a
  core function).
- **Rung 1 — differential harness (tested).** The same operation scripts run against
  the pure `StoreMap` model and the disk store; observable results compare
  byte-for-byte. Divergence is a hard failure. This is the test-and-iterate loop.
- **Rung 2 — Hoare triples (proved, per-operation).** `Std.Do` specifications on shell
  operations where the state is modelable (e.g. the in-memory index); scope grows by
  seat.
- **Rung 3 — full refinement/bisimulation (research-grade, later).** The interactive
  system against a labeled-transition/ITree model — the KICKOFF §13 advanced lane's
  business. Until a theorem exists, the word "bisimulation" appears only inside this
  rung's name.

## 2. Architecture

Three layers, strictly ordered by import:

1. **`E2` core** — unchanged, pure, gated, axiom-clean. Never imports IO. The
   opaque/unsafe gate continues to scan exactly these namespaces.
2. **`Shell` storage engine** — a separate Lake package requiring `entity-store` and
   `fips202` by path. Directory-backed store; verification-on-open per STORE-MODEL
   joint A; `Std.Mutex` single-writer discipline. Deliberately OUTSIDE the E2 gate
   boundary (IO is extern by nature); its own discipline instead: every function is
   (a) a pure core call, (b) a whitelisted IO primitive, or (c) a composition of
   (a)/(b) — nothing else.
3. **Interfaces** — CLI verbs first (v0); `Std.Http.Server` daemon second (v1).

## 3. IO whitelist (SH3)

- **SHELL-v0 (CLI + harness):** file read/write under the store root, **file-type
  interrogation of store entries without following symlinks
  (`System.FilePath.symlinkMetadata`)**, argv, stdout/stderr, exit codes, temp-file +
  atomic rename. No clock, no randomness, no environment, no network. **The file-type
  primitive is admitted for one purpose only (F-42): a directory entry is read only when
  it is a regular file, so that `readView` is total on arbitrary directories and
  `check`'s exit code stays a verdict.** Note `Metadata` carries no clock reading the
  shell may use: `accessed`/`modified` are timestamps and are OUT of the whitelist's
  spirit; the shell reads `Metadata.type` and nothing else. G-S5 gate leg owed (W3-15).
  (W3-15 ruling, 2026-08-25; implementation seat owed.)
- **SHELL-v1 (daemon):** v0 plus a listening socket via `Std.Http.Server` on an
  argv-given port, `Std.Sync` primitives, cancellation. Still no clock/rand/env.
- The v1 rung does not START until the `Std.Http` spike is green on both hosts
  (dual-host gate). Mac leg done 2026-08-25: `#check @Std.Http.Server.serve`
  elaborates with signature
  `{σ} → [Handler σ] → SocketAddress → σ → Config → UInt32 → Async Server`;
  `Std.Mutex` and `Std.Do.Triple` elaborate. Windows leg owed.

Trust statement: rungs 0–2 trust the Lean compiler, the toolchain's `Std` extern/libuv
layer, and the OS filesystem/network. The kernel-checked story covers the pure core
only. Recorded in [TOOLS.md](../lab-core/TOOLS.md) as a trust-statement addendum (SH8:
toolchain-internal, same pin as the compiler; no new instrument row).

## 4. On-disk layout (SH4)

```
store/
  objects/<hex-address>     # pre-image bytes, verbatim; write-temp-then-rename
  names/<hex-of-name>       # one address per file, filename = lowercase hex of the
                            # name's UTF-8 bytes — the mutable plane, beside the store.
                            # The FILENAME IS NOT THE KEY (F-39): a case-folding
                            # filesystem would otherwise merge two model bindings into
                            # one file and answer `name-get` differently on each plane,
                            # both exiting 0.
                            # Name length capped at 64 characters; a names listing verb
                            # restores inspectability (seat owed).
                            # (W3-14 ruling, 2026-08-25; implementation seat owed.)
```

- An object file's content is exactly the pre-image (`versionByte ∷ kind ∷ body`); its
  name is exactly the hex of `H` of its content. `getChecked` made physical: open =
  hash-check (STORE-MODEL §4: getChecked's purpose is "the implementation boundary,
  where the map may be a disk").
- **Verification-on-open (SH5)**: opening a directory as a store **establishes every
  clause of reachability that is decidable today, and no more**. v0 does the full scan:
  every object re-hashed (WF1), parsed, checked well-formed (`wfsB` on schemas,
  `dupFreeV` on entity values), canonicity byte-compared (Q5), refs resolved (WF2),
  entity schema addresses resolved as schemas, and **the reference graph decided acyclic
  by Kahn's algorithm, which also emits the insertion order (WF3; M19's witness,
  computed rather than asserted)**. What remains undecided is exactly `Conforms` — the
  M18 seat — carried as the SH6 obligation record. **The scan therefore establishes
  `Admissible` (R3 §6), not `Reachable`; the bridge between them is
  `ObligationM19_transport`, stated and unproved.** Manifest/append-log optimizations
  arrive only by amendment (see §4 amortization, SH5′). (W3-12/W3-13 ruling, 2026-08-25;
  implementation seat owed.)
- No packfiles, no GC, no deletion (GC is stated-only in the model; deletion exists
  only below the model).

## 5. Operations and the PUT boundary (SH6)

CLI verbs (v0): `init`, `check` (verification-on-open, exit code = verdict: **0 checked
and clean, 1 checked and violations found, 2 could not check — an environment fault,
never a verdict**; W3-15 ruling, 2026-08-25, implementation seat owed),
`put-schema <file>`, `put-entity <schema-addr> <file>`, `get <addr>`, `resolve <addr>`,
`name-set <name> <addr>`, `name-get <name>`, `refs <addr>`.

The PUT boundary enforces `Reachable`'s insert premises with exactly what is decidable
today. `legalInsert` as STORE-MODEL §3 words it is **strictly weaker** than
`Reachable.putS`/`putE`; where the two differ, this boundary implements the latter
(F-33, F-40).

1. bytes parse as a well-formed pre-image of a known kind (decode — M4a's machinery);
2. **well-formedness: schemas satisfy `E2.wfsB` — `closedB 0`, `guardedB`, `dupFreeS`,
   which IS `Reachable.putS`'s `WFS` premise; entities satisfy `dupFreeV`, which is
   A-3's value-plane boundary admission (STORE-MODEL §7). The rejection names the
   failing clause;** (W3-12 ruling, 2026-08-25; implementation seat owed)
3. canonicity: re-canonicalize and byte-compare (canonical-image strictness, Q5).
   **Runs AFTER check 2 — see the ordering note below;** (W3-13 ruling, 2026-08-25;
   implementation seat owed)
4. refs resolve in the store (WF2 precondition);
5. entities: the schema address resolves (typing precondition, schema half);
6. entities: `Conforms` — NOT enforceable until the M18 seat delivers the decision
   procedure. Ruled (SH6): v0 enforces 1–5 and records 6 as an explicit accepted
   obligation per entity PUT.

**Ordering note (F-40/F-41).** Well-formedness precedes canonicity because
`ObligationCanonIdempotent` is conditional on `dupFreeS`: on a duplicate-key carrier
`canonS` is an involution, not idempotent, so the byte-compare's verdict is not a
statement about canonicity. Running check 2 first produced `non-canonical` on bytes the
shell had itself assembled from a carrier literal — the boundary rejecting its own
output. With check 2 ahead of it, a `non-canonical` verdict means what §5 says it means.
The §4 scan runs this same order (W3-13).

Wire protocol (v1): `GET /objects/{addr}` (immutable bytes, infinitely cacheable),
`PUT /objects` (body = pre-image; server runs the same boundary checks; responds with
the computed address), `GET/PUT /names/{name}`. Localhost, single node. This spec rules
NO topology: R-15a/b stay deferred; git-as-transport (R-15c) remains the bulk-sync
story; the daemon is the interactive dev-loop instrument.

## 6. The differential harness (SH7 — rung 1, the v0 acceptance gate)

Operation scripts — deterministic sequences of the verbs above with inline fixture
bytes — execute against (a) the pure model (`StoreMap` via E2 functions, in-process)
and (b) the disk store through the shell. Every observable (addresses, resolve results,
check verdicts, exit codes) must compare equal. Scripts are committed fixtures; a
script generator may be an unconstrained separate tool, but the shell itself stays
deterministic and rand-free. Every future model theorem gains a differential script;
every shell behavior question gets a model answer first.

## 7. Not claimed

No concurrency claims (single-writer mutex; multi-writer is a future ruling). No
durability claims (no fsync discipline yet). No security claims (localhost v1). No
claim that `Std`'s HTTP/TCP stack is itself verified. Nothing about the pinned Effect
implementation. Windows leg unverified until the spike runs (dual-host gate).

No claim that a clean `check` implies `Reachable`: the scan decides the `Admissible`
clauses (R3 §6) and `Admissible → Reachable` is `ObligationM19_transport`, stated and
unproved. No claim that `check` is total on arbitrary directories beyond §3's
file-type discipline (see §5 amendment).

No claim of totality on directories the shell did not create beyond the file-type
discipline of §3: entries that are not regular files are reported and not read, and any
residual IO fault exits 2 without a verdict. No claim about a store on a filesystem the
shell cannot interrogate.

## 8. Ruling record

| # | Joint | Ruling (2026-08-25, all as recommended) |
|---|---|---|
| SH1 | Shell language | Lean only, v1 included; a TypeScript client speaks the protocol later, never the disk format |
| SH2 | First interface | library + CLI + harness (v0) before any daemon; daemon is v1 |
| SH3 | IO whitelist rungs | as §3; Std.Http spike green on both hosts before v1 starts |
| SH4 | Disk layout | as §4: one file per object, hex names, temp+rename; packing/GC deferred |
| SH5 | Verification-on-open depth | full scan in v0 — WF1, parse, `wfsB`/`dupFreeV`, canonicity, WF2, typing-schema-half, WF3 by Kahn's; `Conforms` deferred to M18 as an obligation record. The scan establishes `Admissible`, not `Reachable`. Amortized forms only by amendment (SH5′) (W3-12/W3-13 ruling, 2026-08-25; implementation seat owed) |
| SH6 | Conformance at PUT | v0 enforces boundary checks 1–4; check 5 recorded as an explicit accepted obligation per entity PUT until M18 lands, then enforced, no grace period |
| SH7 | Harness shape | committed deterministic scripts as the acceptance gate; generated scripts later |
| SH8 | Std trust posture | TOOLS.md trust-statement addendum; no new instrument row |

Home: `experiments/entity-store-shell/` at instrument grade; verified parts promote to
`formal/` later as declared transformations. No file contact with the E2 tree or the
other dispatched worktrees.

## 9. Delivery record — SHELL-v0 (2026-08-25, codex worktree, adjudicated at merge)

Delivered at rung 1 and claiming nothing above it: library, CLI verbs, and the
differential harness — ten committed scripts, all green on the merged tree
("9 scripts, all model/disk observables identical"), including corrupted-store (WF1),
corrupted-typing, canonicity-strict, and hostile-bytes cases. The seat exceeded the
brief with `Shell/Gate.lean`, making §1 rung 0 and §3's whitelist mechanical: G-S1
opaque/unsafe scan (884 constants), G-S2 IO confinement to exactly
`Shell.{Store,Cli,Encode,Harness}`, G-S3 an enumerated proof that every referenced
IO/FilePath constant is whitelisted, G-S4 no core shadowing. Known follow-up: the
branch predates A-3, so the boundary does not yet name `dupFreeS` explicitly —
operationally covered today because a duplicate-key submission fails the §5 check-2
re-canonicalization byte-compare. The daemon rung remains untouched (Windows
`Std.Http` spike still owed).

**Addendum 2026-08-25 (F-40, superseding F-21).** The sentence above is FALSE.
`canonFields` is an involution on a duplicate-key run, and an involution has fixed
points: a *palindromic* run byte-compares equal to its own re-canonicalization and is
admitted (`r2-12`, kernel receipt `dup_canon_fixed`). The canonicity byte-compare
covers sortedness only; it cannot see duplicate keys at all. Corrected by the §5 check-2
amendment above.
