# The debt-free wire: protocol v1, versioned identity, policy-dissolved divergence

Issue: DEV-675 (create on dispatch; parent DEV-664). Position: slice
stage 3.5 — this stage lands BEFORE the DEV-670 corpus is generated,
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

## The grill (operator ratifies before the build; recommended option first)

- **R1 — completion declaration.** Recommended: `flb.protocol.v1`
  gains a required `completion` field: a non-empty, UTF-16-sorted,
  duplicate-free array of declared hole names (the `struct.optional`
  law, D9, applied again); close records `completed` exactly when
  every named hole is `filled` or `decided`, else `abandoned`;
  creation refuses unknown names, duplicates, unsorted order, or an
  empty list (an empty ∀ would be vacuously `completed` — a footgun,
  so unconditional completion is expressed by naming a hole the
  protocol always fills). Alternatives: per-hole `required` flag; a
  declared outcome expression (grammar creep); reserved `decision`
  convention (D84 with a permit).
- **R2 — scheme succession, not amendment.** Recommended: mint
  `flb.protocol.v1`; `protocol.create` refuses `flb.protocol.v0`
  with a teaching refusal naming v1 and its two new fields;
  session.open on a v0 catalog fact already refuses by the existing
  scheme check (`protocol_session.go:158`) — reword its law to teach
  v1. No v0→v1 bridge machinery: the flb.type bridge precedent
  (Task 36) existed for real facts, and no protocol fact has a real
  consumer. v0 facts remain readable catalog history (the journal is
  append-only; nothing is deleted). Alternative: amend v0 in place
  (silently changes what a version string admits — exactly the
  pattern this stage exists to end).
- **R3 — versioned digest preimages, stated as law.** Recommended:
  mint `flb.protocol.session.v1` (open-event version string, journal
  name prefix `flb_protocol_session_v1_`), and the final-state
  digest's meaning map gains `"v": "flb.protocol.session.v1"`. The
  law for CONTRACT.md §versioning: a digest preimage is frozen for
  the life of its version string; any change to what the bytes cover
  mints the next version, and the version appears inside the digested
  bytes, so two preimage shapes can never collide on one digest
  domain. Replay refuses a version it does not carry with a named
  error ("a journal written under an unknown session version refuses
  replay rather than misfolding"). This retroactively legitimizes
  D89's change as the v0→v1 boundary. Alternative: keep session v0
  and document the preimage change (documentation is not a
  mechanism).
- **R4 — revision policy field.** Recommended: `flb.protocol.v1`
  gains a required `revision` field, `"successor-round"` (today's
  D88 refusal: a seat that contributed a pair for the filled value
  may not submit a differing value in the open round) or `"absorb"`
  (model-pure: such a fill disputes like any clash; fills are total).
  No default — an identity-bearing semantic is never defaulted. The
  policy threads through `protocolFillStep` as a parameter; one
  kernel, both call sites, both policies. Alternatives: per-hole
  granularity (build when a consumer asks); keep the hard-coded
  refusal (keeps the divergence enum non-empty forever).
- **R5 — fence tie-break ratified.** Recommended: ratify D91's
  emergent behavior — when the fence's chosen seat holds several
  candidate values, the smallest canonical value bytes win —
  and pin it with a contract test. Alternative: refuse to fence a
  multi-value seat (makes close partial; close must be total).
- **R6 — retro-ratify D87–D90** as v1 law in the same sitting (they
  are currently Eng-recorded decisions the spec did not fix:
  pair-newness journaling, self-revision scoping, evidence in the
  digest, refusal-precedence order). Cheap now, expensive after the
  wall pins them.

## Scope (build, after ratification)

1. **`flb.protocol.v1`** in `proto/go/protod/protocol.go`: scheme
   constant, `completion` and `revision` parsed and validated
   (unknown names / empty / unsorted / duplicates refuse; unknown
   `revision` value refuses); v0 creation refused with the teaching
   refusal; all refusal law strings updated to name v1.
2. **`flb.protocol.session.v1`** in `protocol_session.go`: version
   constant, journal prefix, digest preimage gains `"v"`; the replay
   open case splits its error — "repeated open" vs "unknown session
   version" — so a future-version journal refuses by name.
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
7. **CONTRACT.md**: §flb.protocol.v1 (completion, revision), the D84
   caveat deleted, §versioning added with R3's law; the
   session-closed and scheme refusal laws re-quoted where they
   changed.
8. **DECISIONS.md**: task-local entries for R1–R6 outcomes; D84 gains
   `SUPERSEDED BY` naming the completion entry; D91 gains its
   disposition line.
9. **Docs hygiene**: the DEV-670 brief needs its revision pass by the
   coordinator, NOT this executor (an executor never edits the spec
   it builds against): divergence enum shrinks under R4 (corpus
   protocol declares `absorb`; `selfRevisionRefusedByDaemon` remains
   only if a successor-round protocol joins the corpus), the stale
   `decidedMaskedBySessionClosed` example becomes the unfilled-hole
   mask, and the mapping note "sealed folds map to `.decided`" is
   recorded as a constructor premise. This brief flags it; DEV-670's
   re-pin applies it.

## Structural rules (the anti-divergence discipline, restated as law)

- One kernel per verb: no semantic branch on hole state, session
  status, outcome, or digest exists outside `protocol_step.go`. The
  serve paths validate, call the kernel, and translate outcomes to
  replies; the replay validator validates, calls the kernel, and
  refuses non-journal outcomes. A reviewer finding a semantic `switch`
  outside that file fails the review.
- Preimage-freeze law (R3): version strings inside digested bytes;
  refusal, never misfolding, for unknown versions.
- Refusals teach succession: every refusal minted by the v0→v1 move
  names the successor scheme and the missing fields in `next` hints.

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
  - `TestProtocolV1CreationRefusalsTeach` (v0 scheme, empty/unknown/
    unsorted completion, missing/unknown revision — each refusal
    naming the repair);
  - `TestRevisionPolicyAbsorbIsTotal` and
    `TestRevisionPolicySuccessorRoundRefuses` (same fill sequence,
    both policies, diverging exactly at the declared point);
  - `TestSessionV1DigestPreimageCarriesItsVersion` (internal, on
    `protocolFinalStateDigest`) and
    `TestUnknownSessionVersionRefusesReplay` (internal, on the open
    case);
  - `TestFenceTieBreakIsCanonicalWithinTheSeat` (R5 pinned).
- Reopen equivalence on every new admitting path (the DEV-674 harness
  reused: restart over the same store, byte-identical fold).
- Grep gates: `"decision"` absent from `protocol_session.go`;
  `flb.protocol.v0` absent from creation-path law strings except the
  teaching refusal that names it.
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
