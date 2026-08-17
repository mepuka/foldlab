# Dispatch 32 — Plait slice 2: the register — `verify/fabric-veil` + `Registers` (executor spec)

Status: spec FINAL for dispatch, 2026-08-17, under the Plait
ratification record (`docs/design/2026-08-17-plait-ratification-record.md`,
both waves; rulings G3, G5, G6, G7 binding; the mid-flight coordinator
rulings recorded in the grill sheet §B bind decisions 7, 11, and the CI
gate below; laws: `2026-08-17-plait-coordination-fabric.md` §5.5/§6.3/
§9/§10 slice 2). Evidence base: the Lean landscape exploration
(`docs/research/2026-08-17-lean4-landscape-exploration.md` §Veil) and
its reference directory
(`docs/research/reference/lean4-landscape-2026-08-17/`), whose measured
recipe this slice promotes. The dispatch trigger is met: dispatch 29
(the spine) is merged; dispatch 30 is not a dependency — this slice may
run in parallel with E4. Board: project `plait`, epic E5. The issue
body is this spec.

**Authority precedence** (retro adoption T1): binding architecture
record (for `Register.ts` placement) > the named program-doc sections
and rulings above > this spec's decisions. Where this spec's wording
appears to contradict a binding authority, the authority governs and
the executor FILES A FINDING rather than choosing a reading.

**Ledger law** (ruling G6): the executor never edits VERIFICATION.md.
The closing report PROPOSES the row text — the short status-table row
plus the full section in the house four-part shape (Claim / Evidence /
Bounds and residuals / Checkable at) — and the coordinator lands it.
Decision 11 fixes what that proposal must say.

> **[SEAM — coordinator folds any DEV-704 substrate findings here at
> landing. The executor treats this block as absent if it is empty at
> dispatch.]**

## Objective

F5 becomes a machine-checked safety theorem and a running, walled
register. A NEW Veil-pinned Lean package `verify/fabric-veil` states
the lease register as a five-action transition system and proves token
monotonicity and at-most-one-landed-commit with reconstructed — never
trusted — SMT proofs; its exported trace corpus drives a TS `Registers`
service and a Go twin over real KV CAS with verdict equality; and the
slice formally RE-EARNS the effector claims archived at the 2026-08-15
estate purge, with the evidence in-tree this time.

## Spec-fixed decisions (the executor edits none of these)

1. **Home and pins**: `verify/fabric-veil/`, its own Lake package,
   toolchain `leanprover/lean4:v4.28.0` — Veil's own pin, sanctioned by
   ruling G5 (the estate's 4.33.0 governs `verify/fabric` only; one
   package cannot straddle the two). Veil is required by git URL at
   commit `300c305e945750ab3fb62de4a79c23161b24da39` (Apache-2.0);
   transitive pins (lean-smt `5c14319`, cvc5 FFI `ef0efbf` / cvc5
   1.3.2, Mathlib `8f9d9cff`) ride Veil's manifest with the lockfile
   committed. `repos/veil` is reference material only — nothing builds
   against `repos/`, which stays outside every gate. Disk cost is
   ~8 GiB by the landscape measurement; pins are law — nothing beyond
   this package's own toolchain and rulings G5/G7 is admitted.
2. **`veil.smt.trust=false` is MANDATORY for any claimed proof.**
   Trusted mode injects `sorryAx` — the exact channel the hygiene gates
   exist to refuse (landscape probe, ran-it: trust=true footprints
   `[sorryAx]`; trust=false footprints
   `[propext, Classical.choice, Quot.sound]`). The package sets it at
   the Lake target (`weak.veil.smt.trust=false`, as upstream `VeilTest`
   does) and in the proof files. The footprint gate is the mechanical
   enforcement: `#print axioms` over every rostered theorem stays
   inside `{propext, Classical.choice, Quot.sound}`; `sorryAx` anywhere
   is red. Pinned lean-smt's bit-vector reconstruction carries an
   upstream `sorry` (Bitblast); this model uses no bit-vectors, and the
   footprint gate is the check either way.
3. **The Windows recipe is scripted and RECORDED.** The pinned cvc5
   fails a clean Windows build (hardcoded Clang-only `-stdlib=libc++`
   meets GCC `cc`). The gate's setup step applies
   `docs/research/reference/lean4-landscape-2026-08-17/veil-cvc5-windows.patch`
   to the fetched pinned dependency idempotently, provisions the
   signature-verified MSYS2 libc++ 19.1.4 workspace-locally, and sets
   `CPLUS_INCLUDE_PATH`/`LIBRARY_PATH` per the report's recipe
   (§Veil, "The Windows substrate issue and its resolution") — cite,
   do not re-derive. The executor RECORDS exactly what ran — platform,
   compiler, package hashes, patch applied or skipped, wall-clock, exit
   status — in the DECISIONS log and the closing report; an unrecorded
   environment is a failed gate. On non-Windows the patch step no-ops
   cleanly and the record says which path ran.
4. **The model**: one register — the per-work-digest authority; the
   work digest is a theory parameter, never re-derived inside the
   model — with state `(token, holder, outcome?)` and exactly five
   actions: **grant** (requires absent; mints the first token),
   **renew** (requires the current token; extends the hold), **commit**
   (requires the current token AND outcome absent; lands the outcome),
   **expire-steal** (enabled nondeterministically — the model has no
   clocks; deadlines are runtime liveness heuristics with no
   meaning-side effect — granting a NEW holder a strictly larger
   token), **observe** (reads, changes nothing). The token decides,
   never the who: no precondition anywhere consults holder identity as
   authority. Exact Veil/Lean phrasing is the executor's, recorded in
   the statements file (the dispatch-30 idiom).
5. **The theorems** (statements fixed in kind): **I1 token
   monotonicity** — the register's token never decreases, and every
   grant/steal strictly increases it; **I2 at-most-one-landed-commit
   per work digest** — outcome, once set, never changes, and no
   reachable state admits a second landing commit; corollary, stated:
   no stale token ever lands. `#check_invariants` discharges
   initialization and per-action preservation under trust=false;
   `#model_check` enumerates small instances (bounded holders and
   tokens) as **falsification evidence, never a proof substitute** (the
   landscape recommendation, verbatim). Model-level negative controls,
   each refuted with its trace committed, each NAMING the guard it
   drops and claiming it load-bearing (if a drop is proved
   non-load-bearing, that proof is the deliverable and the control is
   renamed — the `guard_is_redundant` precedent): a variant dropping
   the commit token guard, and a variant dropping strict increase on
   steal.
6. **The exported corpus** (the L0→L2 bridge): an executable driver
   walks interleavings of the five actions on small instances —
   crash-steal races, zombie commits, duplicate grants and renews — and
   exports each run as Veil trace JSON via the pinned
   `ToJson (Trace ρ σ l)` instance
   (`Veil/Core/Tools/ModelChecker/Trace.lean`), validity carried by
   construction (`Trace.isValid_empty` / `Trace.push_isValid`) or
   checked executably against the model's transition relation. Refusal
   rows export `(state, attempted action, verdict: refused)` backed by
   the model's enabledness — the stale-token commit family included.
   Serialization is deterministic; provenance line = the generation
   command; the gate diffs a fresh regeneration byte-for-byte;
   hand-typed rows are refused on sight. These files are fixture
   format, not wire values — RFC 8785 is not required of the trace
   JSON, and any digest inside a row that names a fabric value is a
   canonical-bytes digest. The export glue (driver, printer) is
   unproven and NAMED in the trusted base.
7. **The runtimes**: `Register.ts` (the `Registers` service) in
   `packages/plait` per the architecture record — hold by KV `create`
   on `flb-fab-reg`, renew/steal by `update(rev)`, commit fenced by
   token with a stale commit refusing as a typed refusal naming the
   law, observe by read; holds are `Scope`-bound with heartbeat
   renewals, and lease loss interrupts the holder's fiber —
   heartbeats and deadlines are liveness machinery carrying no claims.
   The Go twin is a fresh, minimal register client in the `go/` module
   (nats.go `v1.53.1` is already pinned there; zero new Go
   dependencies) at a fresh package path — **written fresh at a new
   path, never a restore of archived `go/effector`, recorded as a
   NAMED deviation from the restore rule** (mid-flight ruling, grill
   sheet §B item 6); the name `go/effector` stays with the archived
   record it is checkable at. The archived `go/effector` at
   `archive/pre-estate-focus` is cited reference, NOT restored: the F5
   surface differs (five actions; no watch machinery — the archived
   watch lane and its open finding stay archived), and both twins are
   walled against the model, which is now the source of truth. The
   token's total order per key IS the revision-CAS order (the §6.3
   mapping sentence); the concrete token representation is an executor
   DECISION constrained hard by: strictly increasing across
   grant/steal, compared on commit, holder identity never consulted.
8. **The replay wall**: the model-exported corpus replayed on the real
   substrate by BOTH runtimes — verdict equality TS ≡ Go ≡ model over
   every row (accepted/refused plus observed token/holder/outcome),
   counts pinned, zero skips. The substrate envelope is asserted
   executably, not by prose: local pinned `nats-server v2.14.4`, single
   node, non-clustered, R=1 bucket (reuse dispatch 29's server harness
   and its recorded binary decision), plus in-harness probes of the two
   CAS laws the register leans on — `create` refuses a second create;
   `update(rev)` refuses a stale revision. The archived substrate gate
   at `archive/pre-estate-focus` is the shape reference for those
   probes; restoring the full gate is ruling-G3 territory, not this
   slice.
9. **Retention posture stated, never inherited** (part 1 §12 risk 4;
   ratified grill item 9 generalizes this discipline): the
   `flb-fab-reg` bucket's history depth is declared in this slice —
   deep enough that the harness audits "no stale commit ever landed"
   from the register's own history — with no TTL and no eviction
   lever; the declared posture is recorded in DECISIONS.
10. **Crash-steal harness**: one TS contender and one Go contender race
    one register — heterogeneity is the point of the twin. Crash a
    holder mid-hold (hard kill), steal with a strictly higher token,
    let the dispossessed zombie complete and attempt its commit: the
    commit refuses on the stale token. The schedule is scripted and
    committed; where the corpus expresses an interleaving, the harness
    replays the corpus row rather than improvising.
11. **The ledger act** (ruling G6 + the mid-flight rung ruling): the
    executor never edits VERIFICATION.md. The closing report PROPOSES
    the row text (short table row + full four-part section), which
    must state, in these words, that **this slice formally RE-EARNS
    the effector claims archived at the 2026-08-15 estate purge** —
    the archived row: fencing safety and unique terminal outcome,
    R3 + R4, whose proof artifacts were never shipped (`.reference/`,
    ticket 013's standing debt) — now with the evidence in-tree: the
    inductive invariant kernel-checked through reconstructed SMT
    proofs (trust=false, footprint-clean) and the replay wall over the
    exported corpus. **The rung stamp is R3 plus the replay wall; R4
    stays RESERVED at the 15,378-schedule bar** — the archived rung's
    own lockstep count (`VERIFICATION.md:82` at this writing; the
    ruling's citation says :80, the file has since moved) — and no R4
    language
    appears anywhere until a lockstep run at that bar exists (ruled
    mid-flight; binds this proposal verbatim in kind). Bounds
    included, verbatim in kind: SAFETY ONLY — no liveness, no
    fair-retry, no lease-progress claim (the pre-registered
    kind-change discipline); the non-clustered R=1 envelope per ruling
    G3; per-work-digest registers with no cross-register claim;
    trusted base named — cvc5 with proof reconstruction, the export
    glue, SHA-256, the substrate contract as probed. The coordinator
    lands the row.

## Gates (mechanical)

Each line names where the gate is wired; the PR must show it executing
at the head.

- `lake build` exit 0 under the pinned toolchain;
  `bash verify/fabric-veil/run.sh` green: roster check, footprint check
  (`#print axioms` over every rostered theorem inside the pinned set;
  `sorryAx` red), partition check (definitions / statements / proofs in
  separate files, no law file orphaned), model-level negative controls
  refuted with committed traces, corpus regeneration byte-identical,
  counts pinned.
- Footprint-check demonstration control: a trusted-mode twin of one
  theorem (trust=true) shows `sorryAx` in its footprint and the gate is
  shown refusing it — the checker proven able to fail — trace
  committed, the twin excluded from the roster.
- **CI enrollment is RULED, not open** (mid-flight ruling, grill sheet
  §B item 4): this slice lands `.github/workflows/fabric-veil-gate.yml`
  per the draft-33 CI-6 shape — its own path-filtered workflow
  (`verify/fabric-veil/**`, the Veil corpus path under
  `packages/plait/fixtures/`, the workflow file itself; plus
  push-to-main, `workflow_dispatch`, and a weekly schedule);
  `~/.elan` + lake-deps caching with the compressed cache fit against
  GitHub's 10 GiB ceiling MEASURED at first landing and recorded in
  the workflow header before the key is finalized (if it will not
  fit, cache `~/.elan` only); the weekly tier restores NO cache; the
  cvc5 binary's sha256 recorded in the log by `run.sh`;
  `veil.smt.trust=false` asserted; `sorryAx` refused;
  `ubuntu-latest` the designated platform. A scheduled tier's green is
  not citable evidence until it has fired at least once. The Lean gate
  is NOT in the required battery (house law; ratified grill item 16).
- Replay wall green in both runtimes; verdict equality over every row;
  counts pinned; zero skips; envelope probes green — wired as package
  tests plus the Go module's test lane, both in the battery's existing
  stages.
- Crash-steal harness green; the zombie's stale commit refused with the
  typed refusal naming the law; trace committed.
- Runtime negative controls, each with its trace: (i) a build variant
  that accepts a stale token is killed by a named corpus vector; (ii) a
  hand-edited corpus row fails the regeneration diff.
- `bun run gates` green with the TS side wired.
- No imports from `repos/`; no dependency beyond decisions 1 and 7; no
  VERIFICATION.md edit.

## Blockers, partial-dispatch order, and cross-slice writes

Dispatch 29 merged (the spine: `Digest`, `Refusal`, `FabricClient`,
internal adapters) — satisfied. Independent of dispatch 30 and of E4;
may run in parallel with both. Cross-slice writes, named: E4
(dispatch 31) also adds internal KV machinery under `packages/plait`
— branches stay separate; the coordinator sequences the merge; the
second lane to merge rebases and reports. The slice may land the Lean
package + corpus in a first gated commit and the runtimes + replay
wall in a second — both halves inside this one issue, neither claimed
done without the other.

## Non-goals

Actions, policies, and the action register's declaration semantics
(E9 — C7 rides this register later; nothing action-shaped lands here);
work-queue claim hints (exclusivity is the register's job; hints are a
later epic's advisory layer); federation (slice 3); cells, anchors,
folds (E4's); the F6 automaton and any CSLib package; any liveness or
fair-retry theorem — stating one is refused in advance as a
ratification-gated kind change; any R4 language (decision 11);
restoring the archived substrate gate (ruling-G3 territory); clustered
commons (ruling G3); daemon changes; VERIFICATION.md edits.

## Closing report extra

A guided tour for a reader learning Lean and new to Veil — what a
`veil module` is, what state and actions the model declares, what
`#check_invariants` generated and discharged, what the footprint check
proves and does not prove, what the model checker explored — glossing
all notation (the education rule: this package is machinery the
operator will ratify extensions of). Plus the environment record of
decision 3, in full. Plus the measured first-landing cache-fit number
of the CI gate. Plus the proposed VERIFICATION.md row text of decision
11, in the house four-part shape.

Seats: Eng builds on `agent/<seat>/<ISSUE>` — the coordinator
substitutes the literal branch name in the issue body at dispatch and
deletes any abandoned-run branch first (retro Q5). Rev reviews the PR
head; if the head differs from the ref named in the charge, review the
head, say so, and state whether the difference is material (retro Q4).
Coordinator merges. DECISIONS log per house rule.
