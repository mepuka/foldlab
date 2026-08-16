# The debt-free wire: hard-cutover v0, versioned identity, policy-dissolved divergence

Issue: DEV-675 (created 2026-08-16, parent DEV-664, board stage 4 —
DEV-670 and later shifted up one). Grill closed 2026-08-16; rulings
below. Position: this stage lands BEFORE the DEV-670 corpus is generated,
because the wall freezes semantics into a regeneration-gated corpus
and every semantic change after that freeze costs a corpus rewrite
plus divergence-enum churn. Generate the wall once, against debt-free
semantics. This brief ABSORBS AND RETIRES draft 03
(completion-declaration): its grill and build items appear here,
extended by the versioning ruling draft 03 predates.

Base: DEV-674 merged (`agent/fable/DEV-674`, commit 0d14642 — the
fill kernel `protocolFillStep` and the reopen-equivalence harness are
landed interfaces this brief builds on).

## Why now

- **D84 is a wrong-outcome fault, not a refusal.** Close keys on the
  literal hole name `decision` at BOTH close sites
  (`protocol_session.go:360` serve, `:512` replay); any protocol
  without that hole closes `abandoned` silently. The ontology test
  bed is the second scheme that makes this debt due.
- **The close fold is duplicated across serve and replay** — the same
  lockstep hazard the fill path had before DEV-674 collapsed it into
  one kernel. Today the two close bodies agree by inspection, not by
  construction.
- **D89 landed a digest-preimage change inside an unchanged version
  string** (evidence entered the close digest; safe once because no
  journals existed, and recorded — but the pattern must become
  impossible, not survived). Versioned preimages are the discipline.
- **One divergence remains** (no-self-revision). It is governance, and
  D85's own record says seat governance is a protocol-layer concern.
  Declared policy dissolves it: an absorb-declared protocol has a
  fill path that IS the model's `repair`, and the DEV-670 wall then
  tests the naked calculus with an empty fill-path divergence set.

## Sniff first: fault hunt on the landed work (commits 1–2, before any semantic change)

Run these against the CURRENT daemon before touching semantics; they
are the negative controls DEV-674 shipped without. A red result is a
FINDING — minimize, report, STOP per AGENTS.md; do not repair first.

1. **Replay-validator negative-control roster** (new internal test
   file `protocol_step_test.go`, package `protod`): a table-driven
   test enumerating EVERY refusal branch of `applyProtocolEvent` and
   `protocolFillStep`, each row a hand-built corrupt event asserting
   the exact error fires: repeated open; open with a wrong/missing
   version; fill before open; fill with an underived or mismatched
   seat; fill with a nonconforming value; stored duplicate pair;
   stored self-revision; stored post-close fill on an unfilled hole;
   stored fill on a stable state; close repeated; close unauthorized;
   close with a mismatched outcome; close with a mismatched digest;
   disputed hole with no fence-represented candidate; unknown event
   kind. The table is the completeness claim: a validator error
   string with no table row is a review failure (rostered by
   convention, checked by Rev — there is no honest grep for it).
2. **Permutation/redelivery property test** (black-box, deterministic
   seeds per house style, e.g. `0x06750001`/`0x06750002`, bounded
   ~48 cases): random fill multisets over a small value alphabet and
   three seats, driven through fresh daemons in two random orders
   with redeliveries injected at random points; assert final digests
   equal and every redelivery leaves head and fold unchanged. This
   claims a self-consistency law (permutation and idempotence), not a
   model verdict — legal under the fixture ruling, and it holds the
   line until the generated wall subsumes it.
3. **Restart-redelivery test**: fill, restart the daemon over the same
   store, redeliver the identical fill; head unchanged, fold
   byte-identical (the at-least-once collapse surviving a process
   boundary, which the DEV-674 reopen tests did not redeliver across).

## Rulings (operator, 2026-08-16 — the grill is closed; the executor
transcribes these into task-local D-entries at build time)

- **R1 — completion declaration: RATIFIED as recommended.** The
  protocol record gains a required `completion` field: a non-empty,
  UTF-16-sorted, duplicate-free array of declared hole names (the
  `struct.optional` law, D9, applied again); close records
  `completed` exactly when every named hole ends `filled` or
  `decided`, else `abandoned`; creation refuses unknown names,
  duplicates, unsorted order, and the empty list (an empty ∀ would
  be vacuously `completed`; unconditional completion is expressed by
  naming a hole the protocol always fills). Rejected: per-hole
  `required` flag (same facts scattered); declared outcome
  expression (grammar creep); reserved `decision` convention (D84
  with a permit).
- **R2 — HARD CUTOVER, overriding the succession recommendation.**
  What lands now IS `flb.protocol.v0`: the redefined grammar
  (`completion` and `revision` required) ships under the existing
  version string, and every trace of the prior protocol shape is
  discarded — no succession machinery, no teaching refusal naming a
  successor, no bridge, no prior-version history maintained.
  Operator's rationale: this is the first actually verified valid
  protocol; versioning becomes a critical correctness concern FROM
  THIS POINT, and there is no reason to maintain adherence or
  reference to the pre-cutover shape. An old-shape value refuses as
  malformed at its missing required field through the ordinary
  grammar refusal — nothing names a "v1" anywhere. Preconditions,
  verified at the grill: creation's key allowlist means no cataloged
  fact carrying the new fields can exist, and D89 records that no
  real session journals exist.
- **R3 — versioned digest preimages: RATIFIED, composed with the
  cutover.** The session version string stays
  `flb.protocol.session.v0` (journal prefix unchanged); the
  final-state digest's meaning map gains
  `"v": "flb.protocol.session.v0"`. The law for CONTRACT.md
  §versioning, binding from this cutover forward: a digest preimage
  is frozen for the life of its version string; any change to what
  the bytes cover mints the next version, and the version lives
  inside the digested bytes, so two preimage shapes can never
  collide on one digest domain. Replay refuses a version it does not
  carry with a named error ("a journal written under an unknown
  session version refuses replay rather than misfolding") — the
  open case splits "repeated open" from "unknown session version".
  D89 needs no retroactive boundary: pre-cutover history is
  discarded outright, and the redefined v0 is the FIRST frozen
  preimage.
- **R4 — revision policy field: RATIFIED as recommended.** Required
  `revision` field, `"successor-round"` (today's D88 refusal: a seat
  that contributed a pair for the filled value may not submit a
  differing value in the open round) or `"absorb"` (model-pure: such
  a fill disputes like any clash; fills are total). No default — an
  identity-bearing semantic is never defaulted. The policy threads
  through `protocolFillStep` as a parameter; one kernel, both call
  sites, both policies. The bootstrap task-acceptance protocol
  declares `successor-round` (behavior unchanged). Rejected:
  absorb-only without a field (deletes the governance protection
  with no declared opt-in); per-hole granularity (build when a
  consumer asks); hard-coded refusal (divergence enum non-empty
  forever).
- **R5 — fence tie-break: RATIFIED.** Within the fence-chosen seat,
  smallest canonical value bytes win — D91's emergent behavior
  becomes law, pinned with a contract test. Noted at ratification:
  the refuse-to-fence alternative would hand any seat a veto on
  close (submit two values into a dispute and the session never
  terminates) — a griefing vector, beyond making close partial.
- **R6 — D87–D90 retro-ratified as law, all four as-is**
  (pair-newness journaling, self-revision scoping, evidence in the
  close digest, refusal-precedence order): CONTRACT.md law under the
  cutover grammar, quoted where they changed.
- **R7 (added at the grill) — the DEV-670 wall corpus declares
  `absorb` only.** The wall tests the naked calculus with an EMPTY
  open-session fill divergence set; `selfRevisionRefusedByDaemon`
  leaves the enum and returns only if a successor-round protocol
  later joins the corpus (the enum grows by one constructor without
  invalidating anything). Successor-round remains contract-tested at
  the daemon by this stage's named tests. The DEV-670 brief re-pin
  applying this is the coordinator's and is applied (scope item 9).

## Scope (build, after ratification)

1. **The redefined `flb.protocol.v0`** in
   `proto/go/protod/protocol.go`: `completion` and `revision` parsed
   and validated (unknown names / empty / unsorted / duplicates
   refuse; unknown `revision` value refuses); an old-shape value
   refuses as malformed at its missing required field — no
   succession refusal, no successor string; law strings keep naming
   `flb.protocol.v0` (hard cutover, R2).
2. **The versioned session preimage** in `protocol_session.go`: the
   version string and journal prefix stay `flb.protocol.session.v0`
   / `flb_protocol_session_v0_`; the digest preimage gains
   `"v": "flb.protocol.session.v0"`; the replay open case splits its
   error — "repeated open" vs "unknown session version" — so a
   future-version journal refuses by name.
3. **The close kernel.** Extract the close fold (seal / fence /
   unfilled / completion outcome / digest) into one pure function
   consumed by BOTH `serveProtocolSessionClose` and
   `applyProtocolEvent`'s close case, exactly as `protocolFillStep`
   did for fills. The `decision` literal is deleted; the grep
   `"decision"` over `protocol_session.go` returns zero (draft 03's
   acceptance line, kept verbatim).
4. **The pure-step seam.** Move both kernels plus a
   `protocolSessionTransition(fold, event) (fold', error)` wrapper
   into `protocol_step.go`, with event validation (catalog
   type-check, seat derivation — the impure half) separated in the
   caller. This is the "Step-shaped function" the DEV-670 brief
   already names for its Tier-1 harness; hand it over as a landed
   interface, not a to-do.
5. **Revision policy through the kernel** per R4; the self-revision
   refusal text unchanged under `"successor-round"`.
6. **Fixtures and TS, same commit as the scheme change**:
   `proto/wire/fixtures/protocol-moves.json` bootstrap protocol
   gains `completion: ["decision"]` and `revision:
   "successor-round"`; new vectors — a protocol whose completion
   names a non-`decision` hole closing `completed` (the D84 defect
   demonstrated dead), an unfilled completion hole closing
   `abandoned`, and an absorb-declared protocol absorbing a
   contributing seat's differing value; `proto/ts/src/protocol.ts`
   bootstrap emits the new fields; TS decode path green.
7. **CONTRACT.md**: §flb.protocol.v0 rewritten for the cutover
   grammar (completion, revision), the D84 caveat deleted,
   §versioning added with R3's law as composed with the cutover; the
   session-closed and scheme refusal laws re-quoted where they
   changed. No section references the pre-cutover shape.
8. **DECISIONS.md**: task-local entries for R1–R6 outcomes; D84 gains
   `SUPERSEDED BY` naming the completion entry; D91 gains its
   disposition line.
9. **Docs hygiene — APPLIED at the grill (2026-08-16)**: the
   coordinator's revision pass on the DEV-670 brief landed with
   these rulings (an executor never edits the spec it builds
   against): divergence enum shrinks under R4/R7 (corpus protocol
   declares `absorb`; `selfRevisionRefusedByDaemon` leaves the
   enum), the stale `decidedMaskedBySessionClosed` example became
   the post-close unfilled-hole mask, and the mapping note "sealed
   folds map to `.decided`" is recorded as a stated mapping premise.

## Structural rules (the anti-divergence discipline, restated as law)

- One kernel per verb: no semantic branch on hole state, session
  status, outcome, or digest exists outside `protocol_step.go`. The
  serve paths validate, call the kernel, and translate outcomes to
  replies; the replay validator validates, calls the kernel, and
  refuses non-journal outcomes. A reviewer finding a semantic `switch`
  outside that file fails the review.
- Preimage-freeze law (R3): version strings inside digested bytes;
  refusal, never misfolding, for unknown versions.
- Refusals teach the grammar: a value missing `completion` or
  `revision` refuses at the missing field's path with `next` hints
  naming the repair — no refusal names any successor or prior scheme
  (hard cutover, R2).

## Acceptance (mechanical)

- `bun run gates` green; new contract tests under `-count=1`;
  `bash verify/moves/run.sh` green at close (belt — the model is
  untouched).
- Sniff-first tests landed FIRST and green (or their findings
  reported and dispositioned before the build resumed).
- Named tests, each present and green:
  - `TestReplayValidatorRefusesEveryCorruption` (the roster, every
    branch driven);
  - `TestFillPermutationsConvergeUnderRedelivery` (seeds recorded);
  - `TestRestartRedeliveryCollapses`;
  - `TestCloseOutcomeFollowsTheCompletionDeclaration` (including the
    non-`decision` completion closing `completed`);
  - `TestProtocolCreationRefusalsTeach` (empty/unknown/unsorted
    completion, missing/unknown revision — each refusal naming the
    repair at its path);
  - `TestRevisionPolicyAbsorbIsTotal` and
    `TestRevisionPolicySuccessorRoundRefuses` (same fill sequence,
    both policies, diverging exactly at the declared point);
  - `TestSessionDigestPreimageCarriesItsVersion` (internal, on
    `protocolFinalStateDigest`) and
    `TestUnknownSessionVersionRefusesReplay` (internal, on the open
    case);
  - `TestFenceTieBreakIsCanonicalWithinTheSeat` (R5 pinned).
- Reopen equivalence on every new admitting path (the DEV-674 harness
  reused: restart over the same store, byte-identical fold).
- Grep gates: `"decision"` absent from `protocol_session.go`;
  `protocol.v1` and `protocol.session.v1` absent from the tree (the
  cutover mints no successor string); no refusal text names a prior
  or successor scheme.
- D-entries recorded; CONTRACT.md sections landed; the closing report
  lists findings from the sniff-first commits explicitly, including
  "none" if none.

## Out of scope (named, ticketed, not silently deferred)

- **Post-close journal growth** (any authorized seat may append
  unbounded distinct-value receipts; pair-newness bounds only
  duplicates): a governance quota is protocol-layer policy — ticket
  it beside the ontology test bed, do not invent it here.
- **Replay cost** (O(n) fold per request, journals now grow past
  close): the head-keyed derived cache has a Task-37 precedent;
  ticket, blocked on nothing, urgent for nothing yet.
- **Compaction** (retention marks recorded, unimplemented): ticket.
- **The wall itself** (DEV-670 follows this stage; its brief revision
  is the coordinator's, per scope item 9).
- **TS convenience surface for evidence reads**: ticket, rides any
  later client pass.
- **Model corollary `spec_redelivery_idempotent`** (state-level
  redelivery idempotence licensing the daemon's idempotent reply):
  small, real, belongs to the verify/moves lane — ticket it there so
  the Spec.lean freeze discipline is respected (Rev re-pin, never an
  executor edit).

## Pointers

`scratch/dispatch/15-daemon-absorb.md` and the DEV-674 closing
comment (landed kernel, reopen harness, D87–D91);
`scratch/dispatch/03-completion-declaration.md` (absorbed here);
`proto/go/protod/protocol_session.go:360,512` (the duplicated close
sites); `proto/go/protod/protocol.go` (creation validation);
`proto/DECISIONS.md` D84, D87–D91, and the Task 36 scheme-succession
precedent; `docs/research/2026-08-15-dev670-adversarial-review.md`
(why the wall must generate against final semantics);
`proto/wire/CONTRACT.md` §fill semantics (rewritten by DEV-674).
