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

## 2026-08-13 — J1 CONFIRMED (jcs canonical domain gap)

- **Command:** `bash _bugs/run.sh _bugs/ts_candidates.ts` (section J1)
- **Output:** `_bugs/ts_candidates.out`
- **Verdict:** CONFIRMED. `jcs.encodeJsonValue` treats any non-array object by
  its enumerable own keys. `new Date(0)` and `new Map([["a",1]])` both encode to
  `{}` — colliding with the genuine empty object `{}`. A class instance encodes
  its enumerable fields only (methods/getters dropped).
- **Severity:** MEDIUM (breaks the "canonical bytes are a unique equality
  witness" claim for inputs outside `JsonValue`).
- **Exploitable vs latent:** LATENT. The `canonicalizeJson` ingress goes through
  `decodeJson`, which only ever yields real `JsonValue`; the raw `encodeJsonValue`
  / `encodeFoldState` entry is type-guarded (`JsonValue`/`FoldState`), so only a
  type-bypassing caller reaches it. No shipped caller feeds it a `Date`/`Map`.
- **Compositionality reading:** the RFC 8785 uniqueness law is stated over the
  `JsonValue` domain; the function's runtime domain is wider than its type. The
  law holds on its stated domain but the surface does not REFUSE outside it — it
  silently produces a colliding witness. Fluency-is-theatre: the equality-witness
  guarantee a builder inherits is only as strong as the unenforced type guard.

## 2026-08-13 — A1 CONFIRMED (algebra Declaration brand forgeable)

- **Command:** `bash _bugs/run.sh _bugs/ts_candidates.ts` (section A1)
- **Output:** `_bugs/ts_candidates.out`
- **Verdict:** CONFIRMED. `DeclarationTypeId = Symbol.for("@foldlab/core/Declaration")`
  is a globally-registered symbol, so any code can construct a `Declaration`.
  A forged declaration that copies the real `max` digest, attached to an
  algebra whose `combine` is NOT max (`(l,_r)=>l`), passes `mapped()`'s
  compatibility gate (`source.declaration.digest === hom.source.declaration.digest`)
  and is CERTIFIED (declaration present, `identityIssue === undefined`).
- **Severity:** MEDIUM (certification integrity — the admission witness is
  forgeable, and the gate compares digests without checking behavior).
- **Exploitable vs latent:** LATENT. `algebras`/`homomorphisms` are a closed
  registry; no shipped path admits an externally-supplied `Algebra`. Reachable
  the moment a caller accepts a foreign algebra and trusts its declaration.
- **Compositionality reading:** THIS is the certifier-as-single-lawful-admission-
  point abstraction, and the impersonation shows the admission proves consensus
  of a digest, not the law. `Symbol.for` (vs a module-private `Symbol()`) leaks
  the brand; and even an unforgeable brand would not help, because `mapped`
  never re-derives or checks the source's combine against the declared spec — it
  trusts the digest. The homomorphism "replay-free derived view" right is
  inherited on a forgeable token.

## 2026-08-13 — M1 CONFIRMED (applyMerge duplicate-seq last-write-wins)

- **Command:** `bash _bugs/run.sh _bugs/ts_candidates.ts` (section M1)
- **Output:** `_bugs/ts_candidates.out`
- **Verdict:** CONFIRMED. `applyMerge` indexes each source `new Map(events.map(e => [e.seq, e]))`.
  Two distinct events sharing `seq=1` in one source collapse to one slot; the
  pick resolves to the LAST (`"SECOND"`), the first is silently discarded. No
  refusal of the malformed (duplicate-seq) source.
- **Severity:** LOW-MEDIUM (silent ambiguity; a merge replay is not a function
  of the fact + declared source identities when a source has duplicate seqs).
- **Exploitable vs latent:** LATENT. Depends on whether any producer can hand
  `applyMerge` a source array with duplicate seqs; the journal assigns unique
  seqs, so no shipped ingress today.
- **Compositionality reading:** `applyMerge` is total over "complete sources"
  and refuses gaps with a typed `MergeGap`, but its refusal domain omits
  duplicate seqs — a second total-vs-partial mismatch (the C1 pattern): the fact
  is treated as replayable, yet replay silently depends on source array order.
