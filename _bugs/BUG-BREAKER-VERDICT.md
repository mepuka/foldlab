# BUG-BREAKER verdict

Adversarial correctness-bug hunt against the **real running code** (not the
TLA+/Apalache models). Every CONFIRMED entry has an executed reproduction under
`_bugs/` (TS) or `go/**/zz_bugbreaker_test.go` (Go); every CLEAN entry was
attacked with executed tests, not reasoned. No frozen fixture was touched; no
fix was applied (findings before fixes).

## Headline

**The effector (A6 register) — whose SAFETY is a machine-checked theorem —
survived an executed attack on the running binary with NO gap.** Fence-authority
holds (no commit lands below the highest fence), terminal-outcome uniqueness
holds, and the one premise the code cannot enforce (substrate immutability) is
lifted into an executable credential gate rather than assumed. This is the
positive compositionality-of-proof result of the cycle; full writeup in
`_bugs/EFFECTOR-CERTIFIED.md`.

The unifying reading of everything below: **proof composes exactly where a
single lawful admission point is reused, and leaks exactly where a parallel
encoder or an un-recertified construction reappears one layer up.**

## Surface attacked

- TS `@foldlab/core`: `entity.ts`, `stream.ts` (KV fold, merge, compaction),
  `jcs.ts` (RFC 8785), `algebra.ts` (declared fold algebra), `schema.ts`.
- Go substrate: `canonical/` (RFC 8785 + EntryDigest), `stream/` (KV algebra),
  `journal/` (CAS-append, verify-on-read), `effector/` (A6 register + watch),
  `cmd/journald/` (the live sidecar).
- Cross-language differential: TS↔Go via the persistent `cmd/jcsprobe` and by
  refusal-domain inspection.

## Confirmed / clean table

| ID | What | Severity | Exploitable? | Evidence |
| --- | --- | --- | --- | --- |
| C1 | `entity.applySync` inherits none of `applyKV`'s refusal law: NUL key poisons `anchors()` forever; `0xff`/`0xfe` collide to one stateDigest | HIGH | LATENT (no shipped ingress) | `_bugs/c1_repro.ts` |
| CG1 | `canonical.EntryDigest` folds invalid UTF-8 to U+FFFD (C1 pattern in Go); journal identity non-injective. `CanonicalizeValue` refuses the same bytes | MEDIUM | LATENT@ingress (JSON launders UTF-8); reachable by direct Go caller | `go/journal/zz_bugbreaker_test.go` |
| JR1 | journal `Open` trusts a non-canonical tail that `Read` refuses as `ErrTampered` — verify-on-read hole on the resume path | MEDIUM | EXPLOITABLE via store tamper / subject publish | `go/journal/zz_bugbreaker_test.go` |
| JR2 | losing writer's cursor never resyncs after `ErrConflict`; **shown end-to-end** — a journald client is wedged on a healthy journal until it issues a read | MEDIUM-HIGH | EXPLOITABLE (multi-writer; shipped daemon) | `go/cmd/journald/zz_bugbreaker_test.go` |
| JR3 (#10) | a real position conflict is returned as a raw `wrong last sequence` APIError (not `ErrConflict`) when the re-read fails; journald surfaces `reason:"unavailable"` | MEDIUM | LATENT/transient | `go/journal/` + `go/cmd/journald/zz_bugbreaker_test.go` |
| A1 (#5) | `mapped()` certifies a law-VIOLATING source via a forgeable `Symbol.for` Declaration digest — digest consensus is not the law | MEDIUM | LATENT (closed registry) | `_bugs/a1_impersonation.ts` |
| A2 | `mappedStep` omits even the source==hom.source digest check `mapped` has — certifies mapped views over unrelated declared sources, no forgery needed | MEDIUM | LATENT | `_bugs/a1_mappedstep.ts` |
| J1 | `jcs.encodeJsonValue` folds `Date`/`Map`/class instances to `{}`, colliding the equality witness for non-`JsonValue` inputs | MEDIUM | LATENT (type-guarded ingress) | `_bugs/ts_candidates.ts` |
| M1 | `applyMerge` last-write-wins on duplicate seqs within a source; no refusal | LOW-MED | LATENT | `_bugs/ts_candidates.ts` |
| S1 | `schema.ts` hard-references global `Bun.gzipSync`/`gunzipSync`; `ReferenceError` under Node | LOW | LATENT (repo targets Bun) | SUSPECTED (inspection) |
| — | **Effector A6 register** — fencing + terminal uniqueness on the binary | — | **CLEAN (certified)** | `go/effector/zz_bugbreaker_test.go`, `EFFECTOR-CERTIFIED.md` |
| — | **jcs canonical TS↔Go** — 29-case number/astral/degenerate battery | — | **CLEAN (no divergence)** | `_bugs/jcs_battery.ts` |
| — | **stream KV algebra TS↔Go** — refusal domains + UTF-8 key sort match | — | **CLEAN** | inspection + C1 cross-check |

Pattern: the WALLED core (jcs, stream KV) and the PROVEN core (effector) are
lawful and compose — cross-language and model-to-binary. Every confirmed leak is
OUTSIDE those: a second encoder of a walled form (`applySync`, `EntryDigest`), a
resume/second entry point that dropped an obligation (`Open` vs `Read`,
cursor-resync), or a certifier trusting a token instead of re-deriving the law
(`mapped`/`mappedStep`).

## Residual risk

The confirmed bugs are latent-until-wired except the journal multi-writer path
(JR1/JR2/JR3), which is exploitable in the shipped `journald` today; the deeper
untested residual is that the C1/CG1/A1/A2 class — a parallel implementation or a
construction that silently re-incurs a walled/proven obligation — is a pattern,
not a fixed list, so any NEW encoder of a canonical form or NEW consumer of the
declared-algebra registry should be assumed to have dropped the law until an
independent oracle (not both-sides-agree) says otherwise.
