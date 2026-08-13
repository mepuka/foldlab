<!-- Promoted from the bug-breaker evidence branch (worktree-agent-aaf7f65ab3380d246 @ dca06c265, _bugs/). Executable repros remain on that branch; the regression tests merged to main encode the confirmed findings. -->

# Effector (A6 register) — CERTIFIED against its machine-checked theorem

**Result:** the register whose SAFETY is a machine-checked theorem (Apalache
inductive invariant, R4 lockstep) survived an executed adversarial attack on the
**running Go binary** with **no gap**. This is a positive
compositionality-of-proof result: the proven model composes faithfully into the
shipped code.

**One-line reading:** the fencing theorem composes into the binary because every
state change funnels through **one lawful admission point** — a revision-CAS on a
single authority key — and the one premise the code cannot enforce (substrate
immutability) is **lifted into an executable credential gate** rather than
silently assumed.

---

## What was attacked (the running code, not the model)

Source: `go/effector/effector.go`, `go/effector/watch.go`.
Executed evidence: `go/effector/zz_bugbreaker_test.go` (bug-breaker, not
coordinator-owned) plus the coordinator-owned P3 fitness suite
`go/effector/effector_test.go`.

| Attack surface | Code | What could have leaked | Result |
| --- | --- | --- | --- |
| Steal CAS (claim a lapsed claim) | `effector.go:167-183` (Update at `stored.Revision()`) | two owners at one fence; fence non-monotonic | **holds** — revision-CAS serializes steals; fences strictly increase |
| Commit CAS (claim→outcome) | `effector.go:215-224` | a commit landing below the highest fence | **holds** — exact fence match (`:205`) then revision-CAS on the same key |
| Stale-read-then-mutate window | `effector.go:191` (Get) → `:220` (Update) | a superseded claim committing on a stale read | **holds** — a read that lost the race fails the revision-CAS and re-reads to `ErrFenced` (`:226-245`) |
| Expired-but-unsuperseded commit | `effector.go:205` (no expiry check in Commit) | a clock-dependent safety hole | **holds** — safety is fence-authority, not clock; committing an unstolen expired claim is the ratified law `EL3` |
| Terminal-outcome uniqueness | `effector.go:159`, `:202`, `classifyCommitted:422` | a committed outcome overwritten / re-run | **holds** — once `work.<d>` is an outcome, Claim and Commit both route to refusal; only the first claim→outcome CAS returns `first=true` |
| Watch `Initial` demarcation | `watch.go:41-53` | live plane inventing authority / mislabeling replay | **holds by design** — Watch is chatter; authority is only ever `Lookup`; non-Put ops and undecodable values are skipped |

## Executed tests

- **D2 — no commit below the highest fence (SAFETY, the headline).**
  `mise x go@1.26.5 -- go test ./effector/ -run TestBUG_D2`
  A claims fence 1 with a 1ms lease; the lease lapses unsuperseded; B steals to
  fence 2. A then commits under the superseded fence 1 →
  `ErrFenced` (`first=false`), and B commits at the highest fence →
  `first=true`. `Commit` never inspects expiry, yet the revision-CAS makes fence
  the sole authority. **The fencing law holds on the binary.**

- **D1 — deletion-resurrection is the admin negative control, NOT a leak.**
  `mise x go@1.26.5 -- go test ./effector/ -run TestBUG_D1`
  A KV bucket is inherently deletable; `Open`'s shape gate
  (`badShapeReason:465`) cannot config-deny deletion the way the journal's
  append-only stream sets `DenyDelete`/`DenyPurge`. Under **admin** credentials,
  `kv.Delete` of a committed key resurrects `Unclaimed` and lets a second
  distinct outcome commit at fence 1. This is exactly the **admin-success
  negative control** already proven in `go/substrate/assumptions_test.go`, where
  the same delete/purge is **refused to application credentials**. My repro runs
  as admin — it re-derives why that gate is load-bearing, and confirms the
  premise is discharged by credential scoping, not left to chance.

- **Coordinator-owned P3 suite** (`effector_test.go`, 1:1 obligation table
  EL0–EL10) is green, including `TestConcurrentDoCommitsOnce` (EL2),
  `TestStolenClaimCannotCommit` and `TestExpiredButUnsupersededClaimStillCommits`
  (EL3), `TestAdversarialCrashSchedule` (EL6), and
  `TestCommitRefusesToOverwriteAForeignOutcome` (EL10).

## Why this is the cycle's headline

Every OTHER confirmed finding in this hunt is a place where a **second
implementation** of a walled operation, or a **construction built on** the core,
re-incurred a proof obligation and dropped it:

- `entity.applySync` vs walled `applyKV` (C1) — a parallel fold that dropped the
  refusal law.
- `canonical.EntryDigest` vs `CanonicalizeValue` (CG1) — a parallel canonical
  encoder that dropped the UTF-8 refusal.
- journal `Open` vs `Read` (JR1) — a resume path that dropped verify-on-read.
- `mapped()` trusting a forgeable digest (A1) — a certifier admitting a
  law-violating source.

The effector is the **inverse**: one admission point, reused everywhere, so the
theorem's guarantee is inherited rather than re-derived — and the single
obligation the substrate cannot discharge is made an explicit, executable
credential law (`substrate/assumptions_test.go`) instead of an unstated
assumption. **That is what "the proof composes" looks like in a binary.**

The dossier team should cite this as the positive control for the thesis: proof
composes exactly when a lawful admission point is singular and reused, and leaks
exactly where a parallel path or an unrecertified construction reappears.
