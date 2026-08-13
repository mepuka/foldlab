# BUG-BREAKER worklog

Adversarial correctness-bug hunt against the real running code. Evidence
discipline: a bug is CONFIRMED only with an executed reproduction saved here
(command + verbatim output). Framing spine (per coordinator): each finding is
read as a **compositionality-of-proof failure** — an abstraction carries a law
established once (e.g. `applyKV`'s refusal law), and a construction built on it
silently re-incurs the obligation without inheriting the law.

Runner: `bash _bugs/run.sh _bugs/<file>.ts` (rewrites import paths and runs
under `packages/core` so the effect catalog dep resolves).

---

## 2026-08-13 — C1 CONFIRMED (calibration; seed bug)

- **Command:** `bash _bugs/run.sh _bugs/c1_repro.ts`
- **Output:** `_bugs/c1_repro.out`
- **Verdict:** CONFIRMED.
  1. Walled `applyKV` (stream.ts) refuses a NUL-key payload (`refused = true`).
  2. `entity.ts` `applySync` accepts the same payload; `anchors()` then throws
     `RangeError: KV entry is outside the state-digest domain` — permanently,
     because `Backing` has no delete.
  3. Lossy-decode collision: payloads `0xff "=v"` and `0xfe "=v"` fold to the
     same `U+FFFD` key → identical `stateDigest` while chain heads differ.
- **Severity:** HIGH (permanent poisoning of the collector) + correctness
  (state-digest collision breaks the "converge ⇒ equal digest" contract by
  admitting values the digest domain excludes).
- **Exploitable vs latent:** LATENT today — `makeCollector`/`applySync` has no
  shipped ingress caller wiring untrusted bytes into it. The divergence is real
  and reachable the moment a collector is fed raw payloads.
- **Compositionality reading:** `applyKV` is the lawful fold (total-refusal
  domain: strict UTF-8, no NUL, bounded count). `applySync` is a SECOND
  implementation of the same fold that inherited none of that law. The proof
  obligation reappeared one layer up (the entity collector) and was dropped.
  Two implementations of one operation disagree on what they refuse.
