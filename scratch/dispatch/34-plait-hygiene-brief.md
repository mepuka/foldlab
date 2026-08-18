# Dispatch 34 — Plait post-merge hygiene: the accumulated small debts, retired in one bounded pass (executor spec)

Status: spec FINAL for dispatch, 2026-08-17, under the Plait
ratification record (`docs/design/2026-08-17-plait-ratification-record.md`,
both waves). This is the follow-up brief the ratified grill sheet item
19 commissioned (the two `run.sh` amendments' ruled route) merged with
the PM retro's adopted environment disposition ("the gates-bootstrap
change rides the post-merge hygiene brief" —
`docs/design/2026-08-17-plait-pm-retro.md`, coordinator adoption
record), the coordinator's merge-time audit findings on the two
landed wave-1 PRs, and the wave-1 design-fidelity review's items
routed here (D2's bridge lemma; E1 `retryAbsence`; E2 taught `next`).
Every item is small, severable, and cites its source thread or
record; none states a new law or emits a new vector. Board: project
`plait`; the coordinator assigns the parent issue. The issue body is
this spec.

**Authority precedence** (retro adoption T1): binding records and the
ratified rulings above > the named threads and program-doc sections
cited per item > this spec's decisions. Where this spec's wording
appears to contradict a binding authority, the authority governs and
the executor FILES A FINDING rather than choosing a reading.

**Ledger law** (ruling G6): the executor never edits VERIFICATION.md.
This brief is expected to propose NO row change; if any item moves a
claim-bearing sentence (item 3 touches control attribution; item 4
touches the fabric row's F4 scope sentence), the
closing report proposes the amended text (short table row + full
Claim/Evidence/Bounds/Checkable section where applicable) and the
coordinator lands it.

## Objective

Nine named debts leave the tree: the two ratified `run.sh` amendments
land (divergent-row naming; a real `--self-test`); the two negative
controls without retained-property proofs get them; the F4 bridge
lemma connects the proven fold to the fold E4 will deploy; the
spine's public-surface gate closes its four verified quantifier blind
spots with a planted control per shape; one JSDoc residual-bound note
moves to where its charge put it; `retryAbsence` gains the temporal
semantics its own sort names; structural refusals teach a legal next
move; and the gate battery bootstraps itself so a fresh worktree
never buys a false red again.

## Spec-fixed decisions (the executor edits none of these)

1. **`run.sh` names the divergent row.** On the regeneration `cmp`
   failure, `verify/fabric/run.sh` keeps the fresh emission under
   `verify/fabric/.regen/` (gitignored) and prints a two-part FINDING:
   first the divergent row NAMED — row number, the row's `kind` and
   `name`, the model line and the committed line — then the two lawful
   exits stated so neither is a default: regenerate and commit corpus
   + manifest IN THE SAME COMMIT as the model change if the change is
   intended; report the finding and STOP if it is not — never edit the
   fixture to agree (findings-before-fixes; the divergent row IS the
   minimized counterexample). *Source:* draft-33 CI-2 as ratified via
   grill item 19; the retro C4 chain — built at `259077c57`, removed
   at `07acb5eb1` under the scope correction (DEV-695 comment
   `bf89a81a`); the reverted commit is citable reference where it
   matches this spec. The current script refuses all arguments with
   exit 2 (`run.sh:6-9`) — that refusal shape stays for unknown
   arguments.
2. **`run.sh --self-test` becomes real.** The flag runs two
   planted-mutation controls on TEMP copies, never the working tree:
   (i) a one-byte corpus mutation must be refused by the regeneration
   comparison NAMING the divergent row (item 1's message path proven
   able to fire); (ii) a mutated emission against the pristine corpus
   (simulating a model change without regeneration) must be refused.
   The gate's four law-dropping Lean controls already cover the proof
   layer; these two cover the DIFF machinery itself, which today can
   only fail in anger. The full gate's behavior with no arguments is
   byte-for-byte unchanged. The proposed fabric ledger row's check
   line stays `verify/fabric/run.sh` (the DEV-695 round-3 correction);
   whether it later also cites `--self-test` is the coordinator's
   call, noted in the closing report. *Source:* same route as item 1.
3. **Retained-property pinning on the two unpinned controls.**
   `verify/fabric/Fabric/ControlProofs.lean` proves what the
   idempotence and commutativity mutants RETAIN
   (`drop_idempotence_keeps_associativity`/`_commutativity`;
   `drop_commutativity_keeps_associativity`/`_idempotence`) so each
   kill is attributable to exactly the dropped law; the
   `drop-successor-discipline` and `drop-meet-clamping` controls carry
   no such pinning (verified in-tree). Add retained-property theorems,
   statements fixed in kind, exact phrasing the executor's: (i) the
   arrival-order mutant AGREES with the lawful consumer (equivalently,
   with the sequential fold) on every schedule whose arrival order IS
   the contiguous positioned trace — so its kill is attributable to
   reordering alone; (ii) the unclamped-child mutant AGREES with the
   meet whenever the requested policy is already `<=` the root — so
   its kill is attributable to escalation alone. Both are rostered and
   footprint-checked (the `run.sh` roster array and its count move
   with them); the four committed `.cex.txt` traces and the corpus are
   byte-unchanged — this item touches proofs, never vectors. Per the
   control discipline: each control names the component it removes and
   claims it load-bearing; a proof of non-load-bearingness is the
   deliverable and renames the control (the `guard_is_redundant`
   precedent, DEV-695 round-3 ruling `7cb08c80`). *Source:* the
   coordinator's DEV-695 merge-time audit; verified against
   `verify/fabric/Fabric/ControlProofs.lean` on main.
4. **The F4 bridge lemma: the proven fold meets the deployed fold.**
   F4 is stated over the contribution-form fold (`foldCommutative`,
   `verify/fabric/Fabric/Definitions.lean:219-225` — each op
   contributes, contributions merged by the declared monoid); the
   design's C4/§8.3 object and the demo's acceptance reference is the
   *(algebra, step)* fold — F3's object — and on main no theorem links
   the two, so the Commutative brand would license partitioned
   deployment of step folds F4 does not speak about. Add the bridge
   lemma, statement fixed in kind, exact phrasing and name the
   executor's (the review's candidate name `foldCommutative_eq_fold`
   is a suggestion, not a mandate): for a declared commutative
   algebra, `foldCommutative algebra contribution` over a trace equals
   the step fold whose step merges each op's contribution into the
   state (`fun s op => algebra.merge s (contribution op)` from
   `algebra.empty`) — the review prices it at ~15 lines and notes it
   needs commutativity for the right identity. Rostered and
   footprint-checked; the `run.sh` roster moves with it; corpus and
   traces byte-unchanged. This item is the model half of the closure
   whose runtime half is dispatch 31's step↔algebra-compatibility
   suite property; the review's routing sentence binds the sequencing:
   close it BEFORE E4 builds `Folds.deploy`. *Source:* fidelity review
   D2.
5. **The public-surface gate closes its four quantifier blind spots.**
   The landed derived gate
   (`packages/plait/test/PublicEffects.typecheck.ts`, DEV-694 round-2
   repair `1df4b2a22`) quantifies over the barrel but misses four
   shapes, each verified against the file on main: (i)
   **Stream-in-success** — a function returning
   `Effect<Stream<A, E>, Refusal>` never has the stream's own error
   channel checked (`FabricClient.subscribe` is the live instance of
   the shape); (ii) **plain Effect/Layer value exports** — an export
   that IS an Effect or Layer value, not a function returning one, is
   traversed as an object and its own error channel never checked;
   (iii) **curried data-last** — `(a) => (b) => Effect<...>` is
   unchecked past one function layer; (iv) **depth > 1** — functions
   nested more than one plain-object level below the barrel are
   unseen. Widen the quantifier to cover all four. The check stays
   DERIVED — a type-level quantifier over the export map (or a
   generated assertion from the built d.ts with byte-diff
   regeneration), never a hand-edited list (the ratified
   generated-not-hand-typed law applied to gates — the round-2
   charge's own words). Planted negative controls: one NEWLY ADDED
   surface per shape — never an edit to an existing listed export —
   each reddening the battery, traces committed (the
   `check-public-effects-negative.ts` idiom, extended per shape).
   *Source:* DEV-694 round-2 charge S1 (comment `e2e5d4de`); the
   DEV-701 verdict (`91c926cc`: "a list that must be edited by hand
   reproduces the escape shape"); the coordinator's merge-time audit
   naming the four shapes.
6. **The residual-bound JSDoc moves to where the charge put it.** The
   S2 repair's residual bound (core reports refusal locations as
   unescaped slash-joined strings; the seam re-runs the canonicalizer
   over a key-escaped shadow; a stateful accessor can change between
   passes, falling back to the joined-string form) is documented in
   the `canonicalBytes` FUNCTION JSDoc
   (`packages/plait/src/truth/Canonical.ts:106-111`); the charge said "the
   module JSDoc". Move the note to a module-level doc block on
   `Canonical.ts`, keep a one-line pointer at the function, and add
   the one-line inheritance pointer at `digestOf`
   (`packages/plait/src/truth/Digest.ts`), which inherits the seam (the
   DEV-701 R2 verdict sentence). Cosmetic; no behavior change; no
   fixture moves. *Source:* DEV-694 round-2 charge S2 (comment
   `e2e5d4de`); DEV-701 verdict R2.
7. **`retryAbsence` gets the temporal semantics its sort names.** The
   shipped helper (`packages/plait/src/truth/Refusal.ts:68-73`) is
   count-only, zero-delay, data-first-only — an immediate burst, which
   is semantically wrong for the one class it exists for (absence:
   "not-here-yet; retry later") and practically useless against
   `transport-unavailable`. Widen it: accept a `Schedule` (the pin's
   `Effect.retry` already does) with the count form kept as sugar, and
   add the pipeable data-last dual per the exemplar's own convention.
   The absence-only `while` discipline is unchanged — structural
   refusals stay non-retryable; the widening is typed surface only,
   verified by the (widened, item 5) public-surface gate. Land before
   E4 multiplies call sites — the review's own routing words.
   *Source:* fidelity review E1.
8. **Structural refusals teach a legal next move.** The estate's
   replies-teach discipline ("every local refusal carries at least one
   `next` action" — `proto/wire/CONTRACT.md:320`; grill item 12 spends
   proof budget precisely to buy refusals that teach) is met at
   exactly one shipped site; the rest ship `next: []`
   (`Wire.ts:137,165,199,271`; `Subjects.ts:44`;
   `internal/nats.ts:51,66`). Give every structural refusal KIND at
   least one taught `next` — `inline-body-too-large` teaches the
   `{blob}` form; `digest-mismatch` teaches re-derivation;
   `invalid-subject-token` shows a legal token; the lone existing
   teacher (`Wire.ts:150`) is the pattern. Refusal SHAPE is unchanged
   (no schema move); the corpus is regenerated only if a corpus row
   embeds a refusal whose `next` changes — in that case the
   regeneration diff and count pins move together in the same commit,
   per the generated-vectors law, and the closing report says so.
   *Source:* fidelity review E2.
9. **The battery bootstraps itself.** `scripts/gates.ts` gains a
   preflight: when `node_modules` is absent at the repo root, run the
   root `bun install --frozen-lockfile`; when absent at `proto/ts`
   (its own lockfile, non-workspace), run its frozen install; both
   before stage 1, both logged as named preflight lines. Frozen only —
   a lockfile that would change is a FAILURE, never a mutation. This
   RESTORES the local/CI mirror rather than bending it: `gates.yml`
   already runs exactly these two installs as workflow steps
   (`gates.yml` root and proto/ts install steps); the local battery
   was the side that could not. Self-test: the runner's `--self-test`
   (or the preflight's own control, executor's choice recorded in
   DECISIONS) proves the preflight fires on a simulated absent-install
   state against a TEMP directory and refuses a lockfile change —
   never exercising the real tree's installs destructively. *Source:*
   retro C12 (eight runs, ~16 min of pure diagnosis) and Q3; the
   adoption record's environment-hermeticity disposition routes it
   here.

## Gates (mechanical)

Each line names where the gate is wired; the PR must show it executing
at the head.

- `bash verify/fabric/run.sh` green, byte-identical corpus
  regeneration included (items 1–4 change no vector and no trace);
  `bash verify/fabric/run.sh --self-test` green, both planted
  mutations refused with the divergent row named; an unknown argument
  still exits 2. Wired: `lean-gates.yml` (the existing fabric step
  runs the full gate; the self-test's CI enrollment is the executor's
  DECISION recorded in DECISIONS — either beside the fabric step or in
  `negative-controls.yml`, wherever it lands it must be shown firing).
- The fabric roster/footprint check green with the retained-property
  theorems (item 3) AND the bridge lemma (item 4) rostered; the
  roster count in `run.sh` moves accordingly; footprints stay inside
  `{propext, Classical.choice, Quot.sound}`.
- The widened public-surface gate: root typecheck green at the head;
  each of the four planted shape controls reddens the battery with its
  committed trace, and each is a NEWLY ADDED surface; the widened
  `retryAbsence` surface (item 7) passes the widened gate. Wired:
  `test:packages` via the package test + control scripts, hence the
  battery and `gates.yml`.
- `retryAbsence` behavior: a package test proves a supplied `Schedule`
  is honored (delayed retries observed, not a zero-delay burst) and
  that a structural refusal is still never retried; both forms (data
  first and pipeable dual) typecheck against the pin.
- Taught `next`: a package test drives every structural refusal KIND
  the package can mint and asserts a non-empty `next` on each; the
  test enumerates kinds from the shipped refusal union, not from a
  hand list.
- The JSDoc move: no test moves; `bun run gates` green; the module
  doc block exists and the two pointers exist (Rev verifies by read).
- Fresh-worktree hermeticity, the C12 reproduction as the acceptance
  test: from a clean checkout with NO `node_modules` anywhere,
  `bun run gates` is green on Windows and Linux with the preflight
  lines visible in the log and no lockfile modified (`git diff
  --exit-code` on both lockfiles afterward).
- No imports from `repos/`; no new dependency anywhere; no
  VERIFICATION.md edit.

## Blockers and cross-slice writes

None at dispatch: both wave-1 PRs are merged. Cross-slice writes,
named: items 1–4 touch `verify/fabric` (run.sh and the proof files),
which dispatch 33's manifest emission and dispatch 31's fenced
emitter-family extension also touch — branches stay separate, the
coordinator sequences the merges, whichever lands later rebases and
reports; the changes are additive and disjoint in function (33 adds
the manifest emission after the byte-diff; 31 adds emitter families;
this brief adds the FINDING message, the self-test, and proof-file
theorems), and this brief touches neither the emitter families nor
the corpus bytes. Items 5, 7, and 8 touch `packages/plait`
src/test/control files that E4/E5 branches do not own — but the
fidelity review binds the ORDER: item 4's bridge lemma closes "before
E4 builds `Folds.deploy`" and item 7 lands "before E4 multiplies call
sites", so the coordinator sequences this brief's merge ahead of
E4's.

## Non-goals

No new laws or vectors (byte-identical regeneration is itself a gate
above; item 8's conditional regeneration is the one stated
exception, moving only if a corpus row embeds a changed `next`); no
change to battery membership (the preflight is not a stage; the
tripwire stage is dispatch 33's); no `run.sh` changes beyond items
1–2; no gate redesigns — every item strengthens a landed mechanism in
place; no reshaping of the refusal union or `ReceivedEnvelope` (the
pump seam is dispatch 31's); no CX-seat tooling changes (retro S2
stays deferred pending measurement); no branch-protection edit; no
daemon change; no VERIFICATION.md edit; no MCP, no codegen.

## Closing report extra

One line per item: landed / deviation-with-finding. The measured
fresh-worktree saving (the retro priced C12 at 1.5–2.5 min per run —
re-measure one fresh-worktree battery run before and after). The
self-test transcripts (run.sh both mutations; the preflight control;
the four shape-control traces). And — per the ledger law — either the
statement that no claim text moved, or the proposed amendment text:
item 4 lets the fabric row's F4 sentence say the proven fold IS the
deployable fold's shape (the bridge), and
item 3 slightly strengthens the fabric row's control sentence ("each
control drops exactly one law" gains "and provably retains the
rest"), offered to the coordinator, never landed by the executor.

Seats: Eng builds on `agent/<seat>/<ISSUE>` — the coordinator
substitutes the literal branch name in the issue body at dispatch and
deletes any abandoned-run branch first (retro Q5). Rev reviews the PR
head; if the head differs from the ref named in the charge, review the
head, say so, and state whether the difference is material (retro Q4).
Coordinator merges. DECISIONS log per house rule.
