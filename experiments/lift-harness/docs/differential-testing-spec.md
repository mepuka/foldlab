# Differential testing spec — the lift-harness suite

Status: PROPOSED 2026-08-28, pre-grade until grilled. Nothing here is
implemented yet except the evidence rows in §3, which were observed by
running both engines (provenance in §3). Terms marked *proposed mint*
enter the owning CONTEXT.md only through the grill.

## 1. What this is, in the literature's words

The harness already practices **differential testing** (McKeeman 1998;
pin pending): several independent implementations of one specification
are run on the same inputs, and any disagreement is a defect signal in
at least one of them — or, as here, evidence that the specification
underdetermines the answer. The agreement gate is an instance of
**N-version agreement** (Avizienis; pin pending) with N=2 today and a
Lean walker as the intended N=3. The largest-scale precedent is
compiler differential testing under generated inputs (Csmith — Yang,
Chen, Eide, Regehr, PLDI 2011; pin pending), whose operational lesson
we adopt wholesale: *every discriminating input found becomes a
permanently pinned regression case, tracked in a ledger with the
ruling that resolved it.*

Two adjacent techniques complete the suite: **property-based testing**
(Claessen & Hughes, ICFP 2000 — QuickCheck; realized in TypeScript by
fast-check, which the pinned `effect` Schema module can derive
generators for) and **metamorphic testing** (Chen et al.; pin
pending): asserting that semantics-preserving transformations of a
source text never change its verdicts.

## 2. Vocabulary (proposed mints — grill before use in claims)

- **form probe** — a minimal source text that varies *concrete syntax*
  along one declared axis while the manifest's intended ruling is
  fixed. A probe is hoover-side evidence input; it never mints
  anything. (This is the "token thing": one spelling of a form the
  grammar must rule on.)
- **divergence witness** — a form probe on which the engines'
  canonical-JSON verdicts differ (including verdict-vs-silence).
  A witness is proof that the manifest underdetermines the ruling;
  it is never resolved by editing one engine to taste — it goes to
  the grill.
- **divergence ledger** — the append-only register of witnesses:
  input, both observed outputs, run provenance, ruling status
  (`open` → `ruled` → `pinned`). A pinned witness has joined the
  fixture corpus and the agreement gate owns it forever.
- **contract gap** — a probe on which the engines *agree* on a verdict
  the contract should refuse (garbage accepted symmetrically). Same
  ledger, same lifecycle; the gate alone can never find these, which
  is why the suite has non-differential tiers.

## 3. The observed ledger (seed)

Provenance: run 2026-08-28 on the Windows host, from this package with
its committed lockfile (`typescript@5.9.2`, `oxlint@1.80.0`,
`effect-oxlint@0.3.4`). ck leg via `bun src/cli.ts lift <probe>`; oxc
leg via `bun x oxlint -c .oxlintrc.json -A all --format json`. Single
host, single run: sampled evidence, G4 ceiling, exactly what the suite
in §5 mechanizes. Probe sources are inline so the ledger is
self-contained; each is the baseline lift shape (one `put`, one-element
return) with only the named cell varied. Baseline (`p0`) lifts
identically on both engines.

| id | axis | varied cell | ck observed | oxc observed | class |
|---|---|---|---|---|---|
| W1 | payload form | `payload: hex(`` `ff` ``)` (template literal) | lifted, `payloadHex:"ff"` | refusal `E-ARG-DYNAMIC` | witness |
| W2 | chain form | `yield* store?.put(...)` | lifted | refusal `E-YIELD-POSITION` "yield* of a non-call" | witness |
| W3 | import form | only effect import is inside `// a comment` | lifted (regex scan sees it) | silent (no `ImportDeclaration`) | witness |
| W4 | candidate depth | `.gen` spine nested 45 literals deep | refusal `E-SPINE-ESCAPE` | silent (`containsGen` depth-40 cutoff) | witness |
| W5 | chain form | `yield* (store).put(...)` | refusal `E-STMT-SHAPE` "unrecognizable callee" | lifted (parser strips parentheses) | witness |
| G1 | literal domain | `tag: 1.5` | lifted, `tag:1.5` | lifted, `tag:1.5` | contract gap |
| G2 | payload domain | `hex("zz")` | lifted, `payloadHex:"zz"` | lifted, `payloadHex:"zz"` | contract gap |
| A1 | numeric form | `version: 1_000` | lifted, `1000` | lifted, `1000` | agree via normalization — ruling still owed (§4 R6) |
| A2 | numeric form | `version: 0x1f` | lifted, `31` | lifted, `31` | agree via normalization — same ruling |

Two read-predictions were falsified by the run (A1 was predicted to
produce `NaN` on the ck leg; it does not — the TypeScript scanner
normalizes separators). Recorded deliberately: the ledger holds what
ran, not what was read.

Status update 2026-08-28: every row above is `ruled` (§4); rows move
to `pinned` as their probes enter the fixture corpus during landing.

## 4. Rulings (RULED by the operator 2026-08-28, this session)

All eleven items were grilled and ruled the same day, three at a
time. R5 reversed from this spec's original recommendation under
run evidence — recorded below. Engines are edited only to these
rulings; each ruling's probe joins the pinned corpus.

- **R1 (W1) payload literal form — RULED: refuse templates.**
  `payload` is a plain string literal; ck tightens
  `isStringLiteralLike` → `isStringLiteral`; refusal `E-ARG-DYNAMIC`
  with a manifest-pinned detail string.
- **R2 (W2) optional chaining — RULED: refuse deliberately.** Any
  `?.` or non-null `!` in the recognized spine refuses
  `E-STMT-SHAPE`, detail "optional chain in the spine"; both engines
  detect it explicitly (ck: `questionDotToken`; oxc:
  `ChainExpression`) — no accidental codes.
- **R3 (W3) binding source — RULED: parsed imports only.** The ck
  engine gets its own AST import walk; the regex scan stays
  sieve-side. `import type` bindings still count (declared
  deviation: the recognizer is syntax-only and type-blind,
  symmetric on both legs).
- **R4 (W4) candidate search bound — RULED: manifest bound 64.**
  `candidateDepthMax: 64` as manifest data, enforced identically by
  both engines; a spine deeper than the bound is a non-candidate
  (silence from both legs, by rule). Boundary probes at 64 and 65
  pin it.
- **R5 (W5) parenthesized receivers — RULED: accept as trivia.**
  REVERSED from this spec's original refuse-recommendation: the run
  showed the oxc plugin AST arrives with parentheses already
  stripped, so refusal is implementable on that leg only by raw-span
  sniffing — a ruling one engine cannot faithfully implement is a
  bad ruling. ck's `chainParts` walks through
  `ParenthesizedExpression`; both legs lift; parens are a
  parser-stratum concern (the Lean walker treats them the same way).
- **R6 (A1/A2, G1) numeric literal domain — RULED: canonical decimal
  Nat32.** Raw literal text must match `0|[1-9][0-9]*` and the value
  fit 32 bits (`natBits: 32` as manifest data); separators, radix
  prefixes, floats, exponents, negatives all refuse `E-ARG-DYNAMIC`
  with a pinned detail. Accept-and-normalize is out: the source must
  BE canonical, not be forgiven into it.
- **R7 (G2) payload hex domain — RULED: lowercase even-length.**
  `payloadHex` matches `^([0-9a-f]{2})*$` (empty admissible);
  anything else refuses `E-ARG-DYNAMIC` with a pinned detail. The
  recognizer's output now decodes through the estate's stock hex
  transformation with zero normalization.
- **R8 word field — RULED: dropped.** The hoover-side Lift document
  carries instructions only; words are minted exclusively by the
  execute leg (the Lean reference handler) under the direction law.
  Document-shape change: fixture verdicts regenerate and the gate
  re-runs.
- **R9 unreachable codes — RULED: declared unreachable-in-v0.**
  `UNREACHABLE_V0 = [E-REF-FORWARD, E-IMPORT-OPAQUE,
  E-HELPER-UNPINNED]` as contract data, each entry carrying its
  revival condition (two-pass binder walk / import-form rules /
  Rule 7 landing). The T1 audit asserts every code NOT in the list
  is produced by some pinned input.
- **R10 gate equality — RULED: ordered + detail-inclusive.**
  Declaration-ordered verdict lists, detail strings included (they
  are manifest-pinned law after R1/R2/R6/R7); `pos` stays
  engine-local and excluded. The gate now enforces exactly what the
  chassis admission claimed ("265/265 including detail strings").
- **R11 manifest authority — RULED: `src/manifest.json`, both
  engines read it.** The manifest extracts to canonical-JSON data:
  rule enables, `candidateDepthMax`, `natBits`, the hex domain,
  pinned detail strings, `UNREACHABLE_V0`. `contract.ts` imports and
  types it; `plugin.mjs` reads the same bytes; engines share data,
  never code. When the Lean port lands, this file stops being
  hand-authored and becomes the generated projection of Lean
  first-order data — same file, new authority.

  *Status 2026-08-29 (the ruling stands; the file moved).* The Lean
  port landed: the authority is now
  `library/effects/src/cas/generated/lift/manifest.json`, emitted by
  `lake exe emitlift` from `Cas.Lift.manifestV0` and byte-gated in
  `check:cas`. `src/manifest.json` survived the port as an unread
  second copy and had already drifted — the oxc leg was reading it
  while `contract.ts` read the generated file, so R11's premise was
  false at HEAD even though every load-bearing field still agreed.
  The copy is deleted; both legs name the generated file, and
  `test/T1-contract.test.ts` fails if a second manifest reappears
  under `src/`.

## 5. The suite (tiers)

Runner: `vitest` + `@effect/vitest` at the pinned rc — the estate's
admitted Effect-native harness. Directory `test/` beside `src/`;
`mise run check` grows the suite; everything stays G4 sampled
evidence, hoover-side, minting nothing.

- **T1 — contract unit tier.** Pure-function facts: `canonJson`
  determinism and key-order independence; `verdictKey` stability and
  `pos`-exclusion; `SPECTRUM` totality over `RefusalCode` (runtime
  assertion beside the type-level one); the R9 reachability audit —
  every code either produced by some pinned input or explicitly
  declared unreachable.
- **T2 — divergence ledger tier.** Every ledger row runs both engines
  and asserts the *ruled* outcome (while `open`, the row asserts the
  observed divergence still reproduces, so a silent engine edit can't
  bury a witness). Ledger lives as data (`test/ledger.json`), rows in
  §3 seed it.
- **T3 — metamorphic tier.** Relations that must never change any
  verdict, applied mechanically across the fixture corpus: comment
  insertion, whitespace/indentation reflow, object-property
  reordering inside `put` literals, semicolon presence. Each relation
  is a function `source → source` plus the invariance assertion on
  both engines.
- **T4 — property tier** (the generative arm). fast-check generators,
  two kinds: (a) *in-grammar* — generate well-formed v0 programs from
  `MANIFEST_V0` as data (arbitrary instruction counts, payloads,
  refs) and assert both engines lift with the expected document;
  (b) *adversarial* — mutate in-grammar sources along the §6 axes and
  assert byte-identical verdicts (or identical silence) between
  engines. Shrinking hands back a minimal witness; every shrunk
  counterexample is appended to the ledger. fast-check requires a pin
  and a TOOLS.md admission before its output enters gated work; the
  pinned `effect` Schema module's derivation seam is the intended
  route so generators come from schemas, not hand-rolled.
- **T5 — agreement gate + adequacy.** The existing 265-fixture gate,
  grown by one fixture per pinned witness. Adequacy check in the
  estate's mutant tradition: small declared mutants of each engine
  (flip a refusal code, drop a rule check) must turn the gate or T2
  red — a corpus that no engine mutant can trip is too weak.
- **T6 — reproducibility tier.** `census` and every `records/*.json`
  regenerate byte-identically from the same corpus slice (the
  standing generated-not-hand-maintained law, mechanized).
- **T7 — portability tier.** The suite runs green on both hosts;
  covers the `fileURLToPath` fixes (`gate.ts`, `cli.ts`) and the
  typed missing-fixture-lane report the README promises.

## 6. Form-axis expansion (probe generation targets)

The axes T4(b) draws from; confirmed entries reference §3.

- **Payload forms**: template literal (W1); string escapes
  (`"\x66\x66"` — engine `.text`/`value` normalization vs raw
  spelling); string concatenation; unicode escapes.
- **Numeric forms**: separators (A1), radix prefixes (A2), floats
  (G1), exponent, leading zeros, negatives (unary minus is a distinct
  AST node — expected symmetric refusal, unconfirmed), bigint `1n`.
- **Chain/receiver forms**: optional chain (W2), parenthesized
  receiver (W5), non-null assertion `store!.put`, `as`-casts on the
  literal or receiver, computed member `store["put"]`, comma
  expressions.
- **Import/binding forms**: comment-shadowed (W3), import text inside
  string literals, aliased imports, type-only imports, default vs
  namespace, `require`, dynamic `import()`, local shadowing of an
  import binding (v0 is scope-blind — needs its own ruling row).
- **Candidate detection**: nesting depth (W4), `export default`,
  declarations inside namespaces/blocks (standing top-level-only
  deviation — probes document the boundary).
- **Trivia**: interleaved comments, ASI/semicolon variance,
  CRLF vs LF (this repo is cross-host; lexers must agree).
- **Identifier forms**: unicode escapes in identifiers
  (`store`), `$`/`_` names, exotic-but-valid identifiers.

## 7. Landing order

1. Grill the docket (§4) — rulings first, code second.
2. Tighten contract + both engines to the rulings; every ledger row
   flips `ruled`.
3. Pin witnesses into the fixture corpus (fixture-gen grammar grows
   an arm per axis so pinned cases are *generated*; the verbatim
   witness sources stay in the ledger as the historical evidence).
4. Land tiers T1–T7 under `mise run check` in this package.
5. Only then freeze `contract.ts` as the v0 surface and start the
   Lean port — the formalization inherits a contract whose edges have
   been fought over, not guessed.

## 8. Sources (C6: all pins pending into .reference/provenance/)

- W. M. McKeeman, "Differential Testing for Software", Digital
  Technical Journal 10(1), 1998.
- X. Yang, Y. Chen, E. Eide, J. Regehr, "Finding and Understanding
  Bugs in C Compilers" (Csmith), PLDI 2011.
- K. Claessen, J. Hughes, "QuickCheck: A Lightweight Tool for Random
  Testing of Haskell Programs", ICFP 2000.
- T. Y. Chen et al., "Metamorphic Testing: A Review of Challenges and
  Opportunities", ACM Computing Surveys 2018.
- A. Avizienis, "The N-Version Approach to Fault-Tolerant Software",
  IEEE TSE 1985.
- fast-check (TypeScript property-testing library) — pin at admission
  time, TOOLS.md row required before use in gated work.
