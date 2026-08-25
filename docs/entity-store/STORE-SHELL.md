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

- **SHELL-v0 (CLI + harness):** file read/write under the store root, argv,
  stdout/stderr, exit codes, temp-file + atomic rename. No clock, no randomness, no
  environment, no network.
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
  names/<name>              # one address per file — the mutable plane, beside the store
```

- An object file's content is exactly the pre-image (`versionByte ∷ kind ∷ body`); its
  name is exactly the hex of `H` of its content. `getChecked` made physical: open =
  hash-check (STORE-MODEL §4: getChecked's purpose is "the implementation boundary,
  where the map may be a disk").
- **Verification-on-open (SH5)**: opening a directory as a store ESTABLISHES
  reachability — v0 does the full scan: every object re-hashed (WF1), parsed, refs
  resolved (WF2). Manifest/append-log optimizations arrive only by amendment.
- No packfiles, no GC, no deletion (GC is stated-only in the model; deletion exists
  only below the model).

## 5. Operations and the PUT boundary (SH6)

CLI verbs (v0): `init`, `check` (verification-on-open, exit code = verdict),
`put-schema <file>`, `put-entity <schema-addr> <file>`, `get <addr>`, `resolve <addr>`,
`name-set <name> <addr>`, `name-get <name>`, `refs <addr>`.

The PUT boundary enforces `legalInsert` with exactly what is decidable today:

1. bytes parse as a well-formed pre-image of a known kind (decode — M4a's machinery);
2. canonicity: re-canonicalize and byte-compare (canonical-image strictness, Q5);
3. refs resolve in the store (WF2 precondition);
4. entities: the schema address resolves (typing precondition, schema half);
5. entities: `Conforms` — NOT enforceable until the M18 seat delivers the decision
   procedure. Ruled (SH6): v0 enforces 1–4 and records 5 as an explicit accepted
   obligation per entity PUT, flagged in `check` output; when M18 lands, enforcement
   with no grace period.

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

## 8. Ruling record

| # | Joint | Ruling (2026-08-25, all as recommended) |
|---|---|---|
| SH1 | Shell language | Lean only, v1 included; a TypeScript client speaks the protocol later, never the disk format |
| SH2 | First interface | library + CLI + harness (v0) before any daemon; daemon is v1 |
| SH3 | IO whitelist rungs | as §3; Std.Http spike green on both hosts before v1 starts |
| SH4 | Disk layout | as §4: one file per object, hex names, temp+rename; packing/GC deferred |
| SH5 | Verification-on-open depth | full WF1+WF2 scan in v0; amortized forms only by amendment |
| SH6 | Conformance at PUT | v0 enforces boundary checks 1–4; check 5 recorded as an explicit accepted obligation per entity PUT until M18 lands, then enforced, no grace period |
| SH7 | Harness shape | committed deterministic scripts as the acceptance gate; generated scripts later |
| SH8 | Std trust posture | TOOLS.md trust-statement addendum; no new instrument row |

Home: `experiments/entity-store-shell/` at instrument grade; verified parts promote to
`formal/` later as declared transformations. No file contact with the E2 tree or the
other dispatched worktrees.
