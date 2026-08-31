# Claude/Fable blackout recovery and jump-start packet

Status: **pre-grade operational recovery record**

Date: 2026-08-29

Repository baseline: `3ffb5f564e0c356c4bfe8b17760b93aba5be03fc`

Code-probe baseline: `ce2300d759c803cf3f9a5ed311cf078536fbb928`
(the intervening tip changes only `README.md` and adds
`.staging/corpus-mechanization/SPEC.md`)

Authority: none. This packet records evidence, contradictions, unfinished work,
and proposed restart instructions. It does not ratify a definition, settle a
design question, admit an artifact, merge a branch, or transfer ownership from
the Claude/Fable fleet.

The frontend and ornamentation lane remains Claude/Fable-owned under decision
33 and its correction. Codex acted here only as recovery support: reading the
interrupted transcripts, checking the surviving files and worktrees, probing
the formal/runtime boundary, and preparing bounded restart prompts.

## 1. Executive recovery verdict

The work is recoverable, but it should **not** resume as a blind continuation
of the blackout handoff.

Four facts change the restart:

1. A Gatekeeper worktree described as rescued still holds substantial unique,
   uncommitted formal work. It must be preserved and split into reviewable
   slices; committing or deleting the whole worktree would both be unsafe.
2. The current TypeScript Brain Stem calls a put-answer history a `Word`, but
   that value disagrees with the Lean reference handler on duplicate puts and
   cannot represent a nonempty ordered starting Word. More theorem work on top
   of that carrier would deepen the wrong refinement boundary.
3. The daemon's loopback trust rule can be bypassed after a wide bind by a
   non-browser client that supplies `Host: localhost`. A live LAN probe reached
   unauthenticated reads, writes, and publication. This needs classification
   and repair before the daemon branch is treated as remotely safe.
4. The ornament core drafts are substantial, but the WASM and streaming files
   are truncated, external research remains provenance-PENDING, and several
   recommendations are written as rulings or theorems that the record does not
   support.

The safest restart is therefore:

1. preserve every surviving worktree and draft;
2. resolve the Brain Stem carrier/refinement mismatch on current main;
3. salvage and hard-review the unique Gatekeeper proof work without merging
   its mixed worktree wholesale;
4. hard-review the core plan using those two discoveries;
5. finish the CLI, word-log, and daemon branches in the declared merge order;
6. run the auth audit against the exact repaired daemon commit;
7. resume, rather than recreate, the ornament, WASM, and streaming documents;
8. release artboard, color, and asset production only after the presentation
   algebra and palette obligations have been ruled.

No completed Paper, pi, ACP/AG-UI, provider-stream, foldkit, or daemon-security
research needs to be repeated. It needs to be pinned, checked against current
main, and incorporated with honest evidence labels.

## 2. Evidence vocabulary used here

This packet keeps distinct kinds of support that the blackout handoff sometimes
collapsed:

| Label | Meaning in this packet |
|---|---|
| **PROVED** | A Lean declaration was built and its axiom report was inspected. The result applies only to the stated formal model. |
| **MODEL-CHECKED** | A finite model or enumerated domain was checked. This is not a universal proof. |
| **TESTED** | A named executable test passed at a named revision. It covers only that test. |
| **MEASURED** | A command or live probe produced the reported observation. It is not automatically a theorem or production guarantee. |
| **MONITORED** | A continuing observation exists. No claim in this packet currently earns this label. |
| **ASSUMED** | Work presently depends on a premise not established here. |
| **UNKNOWN** | The evidence was absent, incomplete, or terminated before a result. |

`PENDING` has a different meaning: an external claim has not yet acquired the
estate's required source pin and receipt. A PENDING claim may be plausible or
useful in conception; it is not admitted evidence.

## 3. Current repository and survivor snapshot

### 3.1 Main tree

Fresh Git checks after a final fetch and fast-forward show:

- local `main`: `3ffb5f564e0c356c4bfe8b17760b93aba5be03fc`;
- `origin/main`: the same commit;
- ahead/behind: `0/0`;
- the one commit that arrived during recovery changed `README.md` and added
  `.staging/corpus-mechanization/SPEC.md`; it did not change the code or theorem
  files used by the semantic probes;
- the tracked main tree is otherwise unchanged;
- five pre-existing Fable outputs remain untracked:
  - `.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md`;
  - `.staging/ornamentation/ORNAMENTATION.md`;
  - `.staging/ornamentation/PROOF-OBLIGATIONS.md`;
  - `.staging/ornamentation/WASM-CANVAS.md`;
  - `.staging/research-backlog/agent-streaming-integrations.md`.

This packet is a sixth, deliberately isolated untracked file. Nothing above
was edited, staged, committed, or promoted during recovery.

### 3.2 Merge branches and interrupted fix passes

| Lane | Revision | Working state | Recovery consequence |
|---|---:|---|---|
| CLI naming | `66a328e4` | **Dirty:** 5 files, 152 insertions, 51 deletions | Preserve. A partial fix pass is not mergeable and has a current type error. |
| CAS word | `ad44b40b` | Clean | The consolidated fix pass reproduced three defects but changed nothing. |
| Daemon spine | `0aeeefd7` | Clean | Both reviews said merge-with-fixes; no consolidated fix pass landed. |
| Auth audit | detached at `0aeeefd7` | Clean | Live probes exist in transcript, but no `AUTH-AUDIT.md` exists. |
| Gatekeeper | `c042afa3` | **Dirty:** 17 tracked files plus one untracked README; 487 insertions, 45 deletions | Preserve and split. This is unique work, not a disposable scratch tree. |

The declared integration order remains **CLI → CAS word → daemon**. That order
does not authorize merging any lane before its blockers and exact-commit gates
are green.

### 3.3 Transcript sources

Primary session records:

- `/Users/pooks/.claude/projects/-Users-pooks-Dev-foldlab/8d533ba0-bb22-42b3-9153-b3784aba0694.jsonl` — the main blackout push;
- `/Users/pooks/.claude/projects/-Users-pooks-Dev-foldlab/e268ae74-7597-4607-891c-cff71bd681c1.jsonl` — the preceding frontend/Gatekeeper push;
- `/Users/pooks/.claude/projects/-Users-pooks-Dev-foldlab/3534c798-d21b-409f-8fae-748825c02e1e.jsonl` — the terminated two-hour mechanization audit.

Important child records under the main blackout session:

- `agent-ae2e9faae8ae05f53.jsonl` — ACP and AG-UI;
- `agent-ac4c308fc4e765cad.jsonl` — MCP 2026-07-28, AI SDK 7, and provider streams;
- `agent-ae62488a559e0edd2.jsonl` — agent-harness landscape;
- `agent-a06b912bf8da69c17.jsonl` — unfinished auth audit;
- `agent-afb9ea41beb1a865e.jsonl` — completed daemon security review.

Other recoverable child records under the preceding session:

- `agent-a1997956e8eab5080.jsonl` — Gatekeeper implementation;
- `agent-a9de4b00528e140e1.jsonl` — Paper research;
- `agent-ad504a12c854689b3.jsonl` — foldkit study;
- `agent-ab8a36439c8d46846.jsonl` — frontend document writer.

These are recovery evidence, not durable estate references. Any result promoted
from them must acquire the appropriate document, pin, receipt, and gate.

## 4. Critical discrepancy A: the Gatekeeper work was not fully rescued

The preserved worktree is:

`/Users/pooks/Dev/foldlab/.claude/worktrees/agent-a1997956e8eab5080`

It is no longer Git-locked, but it is dirty and based on `c042afa3`, six commits
behind the recovered main at the time of inspection. Its 17 tracked changes mix
formal theorems, generator/registry changes, lift-harness ledgers, parser-census
work, CLI fixes, and operational prose. That mixture is why it must not be
committed wholesale.

### Unique formal content

The worktree contains formal work that is not present in the purported rescue
commit:

- `payload_eq_of_encodeNode_eq_refs_nil` in
  `library/cas/Cas/Codec/Separation.lean`;
- `lineAddr_inj_of_injective`;
- `lineAddr_sep_of_injective`;
- `progAddr`;
- `progAddr_inj`;
- `decodeProgAt`;
- `find_encodeProg_progAddr`;
- `decodeProgAt_encodeProg`;
- working-tag registry additions in `EmitGrammar.lean` and `REGISTRY.md`.

The interrupted implementation also records:

- a W7 defaulted-parameter parser divergence;
- an open T4 property axis;
- a parser-census twin-status correction;
- a doctor current-directory seam;
- generated surface and obligation ledger changes;
- an R5 diagnostic that partly overlaps work rescued elsewhere.

### What was actually checked

- **TESTED:** the transcript records `check:cas` green.
- **TESTED:** local Lean builds completed.
- **TESTED:** 46 Effect test files and 323 tests passed.
- **TESTED:** lint passed.
- **MEASURED:** type checking reported only the then-pre-existing
  `commands.ts` warning.
- **PROVED, model scope only:** the four inspected new theorem reports used
  only the estate's accepted standard allowances (`propext`/`Quot.sound`).
- **UNKNOWN:** the mixed 17-file worktree has never passed a clean root gate.
  `mise run check` regenerated outputs and then stopped at the clean-tree
  assertion because the intended changes were dirty. That is neither a code
  pass nor a code failure.

The dirty `PROPOSED-LOGIC.md` calls some of this work “LANDED.” That status is
false until a reviewed commit actually lands and must be corrected during
salvage.

Only `.staging/e2/README.md` is an untracked candidate. The large
`.staging/e2/src-cache/**` source cache is ignored host-local input and must
never be staged blindly.

### Planner collision

`CORE-ABSTRACTIONS-PLAN.md` independently proposes the same P1/P2/P3 address
and decode work. Its hard reviewer must treat the preserved implementation as
new evidence, not commission a duplicate proof effort.

## 5. Critical discrepancy B: Brain Stem runtime does not refine Lean `Word`

This gap is on current main, independent of any dirty branch.

### 5.1 Duplicate-put counterexample

The Lean reference handler treats `Word` as the ordered addresses admitted to
the store. Repeating an identical put does not admit a second address. The
formal duplicate-put example evaluates to a Word of length one.

The TypeScript `runProgram` implementation appends every answered put to its
reported `word`, whether the address was newly admitted or already present.
A live probe with two identical puts returned the same address twice in both
`word` and `answers`.

Evidence:

- **PROVED:** the Lean duplicate-put law and executable example in
  `library/cas/Cas/Lang/Defun.lean`;
- **MEASURED:** current-main TypeScript returned two entries for the duplicate;
- **TESTED:** `bun --bun vitest run test/Programs.test.ts` passed all 8 existing
  tests, showing that the current suite does not exercise the distinction;
- **UNKNOWN:** no differential vector currently relates the TypeScript result
  to Lean `runP` for duplicate puts or a nonempty starting Word.

The unconditional append is in `library/effects/src/cas/Programs.ts` inside
`runProgram`. The `answers` field already represents answer history. The second
field therefore cannot honestly be both answer history and final Lean Word.

Five distinct carriers are currently being discussed with overlapping “word”
language:

| Carrier | Actual content |
|---|---|
| `Tree.flatten` | Replay bindings; duplicates remain. |
| `PProg.answersFrom` | One address answer per line; loads are included. |
| Lean `runP` Word | Starting Word plus fresh admitted bindings. |
| TypeScript `RunOutcome.word` | Put-answer addresses; duplicates remain. |
| `WordLog` | Fresh-admission receipts, possibly partial and without nodes. |

The types do not currently enforce those distinctions. Renaming alone is not a
repair unless the corresponding refinement claim and public API also change.

### 5.2 Missing starting order

The TypeScript runner accepts a `Store`, initializes an empty local `word`, and
does not accept an ordered starting Word. A Store projection alone cannot
reconstruct the Word's order. Therefore its current result is:

- not the final Lean Word for a nonempty starting state;
- not a fresh-admission delta, because duplicates are included;
- effectively a put-answer trace, already duplicated by `answers`.

The backend design prose currently promises binding-for-binding Word agreement,
including duplicate behavior. The more modest formal `TreeProg` result proves a
sublist/store-projection relationship. The prose is ahead of the established
refinement.

The strongest honest current-main claim is narrower:

> The TypeScript codec agrees with Lean addresses on the checked, well-formed
> fixture fragment, and successful fresh unique-put programs return the
> expected put-answer addresses. General `PProg` Word refinement is false.

### 5.3 Unchecked public Program carrier

There is a second current-main boundary error. TypeScript exposes raw numeric
fields for `Program`; its `bounded()` function checks only upper bounds on
answer indexes and does not validate byte fields. `programAddress()` bypasses
even that incomplete check.

Live round trips showed:

- load answer index `-1` becoming `4294967295`;
- put tag `257` becoming tag `1`.

The Lean codec theorems require `PLine.WF`. An MCP schema may reject some bad
inputs, but the directly exported TypeScript API does not carry or enforce the
same precondition. The host boundary therefore owes one of:

- a checked `Program` constructor/schema used by every public entry point; or
- a complete TypeScript mirror of `PLine.WF`, including nonnegative safe
  nat32 answer indexes and byte-sized version/tag/expected-tag fields.

`runProgram`, `putProgram`, and `programAddress` must share the same admission
gate. A theorem over `PLine.WF` cannot justify behavior for unchecked host
values.

### 5.4 Proof trust and claim boundary

A fresh main `lake --wfail build` completed 91 jobs. The inspected Brain Stem
theorems use only `propext`, `Quot.sound`, and, where expected,
`Classical.choice`; no `sorry`, `admit`, `native_decide`, custom `axiom`, or
`implemented_by` was found in the audited formal files. The targeted Programs,
Brain Stem, and vector suite passed 10 tests across 3 files.

That establishes proof cleanliness for the formal declarations and test
agreement for the tested fixture fragment. It does **not** repair the host
counterexample. The failure is in the modeled/refinement boundary, not the Lean
kernel.

Two nearby claims also need tightening:

- `PLine.HashDetermined` quantifies over successful executions of the reference
  `runPFrom`; it does not prove that every possible handler must return the same
  answer. Handler-independent prose requires an explicit realization/refinement
  predicate.
- The speculative-build rescue claim that loser writes cannot affect winner
  status or answer lacks a non-interference premise. A loser may admit a node
  that the winner later loads or references, changing refusal into success.
  Pure reference-handler equality needs loser-write/winner-read disjointness
  and collision premises. Host equality additionally owes isolation of file
  writes, RootStore publication, WordLog, process execution, telemetry, and
  transport effects.

A `SystemNode.build` arm can describe addressed build topology; it does not
execute a build. Execution still requires a declared effect such as `BuildSig`
or an equivalent first-order table. Declared-output and floating-output regimes
must remain separate.

### Required ruling before repair

The fleet must name the runtime result explicitly:

1. **final Word** — thread an ordered starting Word through the interpreter and
   return the final ordered admissions;
2. **fresh-admission delta** — expose backend admission outcome and return only
   newly admitted addresses, with a theorem relating the delta to the final
   Word; or
3. **put-answer trace** — rename and model the current intent, remove the false
   Word claim, and prove only the trace relation actually implemented.

The ratified backend prose currently points to option 1, but this packet does
not silently make that product ruling. Whichever option is chosen needs
duplicate-put, nonempty-starting-Word, and malformed-carrier differential
vectors before further Brain Stem productization claims.

## 6. CLI lane

Branch: `merge/cli-naming` at `66a328e4`

Worktree: the main blackout session's `scratchpad/m3-cli-wt`

The interrupted fix pass changed exactly five files:

- `library/cas/Cas/Schema/Annotation.lean`;
- `library/cas/tools/Schemas.lean`;
- `library/effects/bin/cli/naming.ts`;
- `library/effects/bin/cli/render.ts`;
- generated `library/effects/src/cas/generated/annotationPlane.ts`.

It partially addressed annotation word/revision display, registry-seeded
overlay behavior, R5 error reshaping, and propagation of outer-root failures.
The diff is whitespace-clean, and a background Lean build completed 230 jobs.

It is not green:

- **MEASURED:** `bun run typecheck` fails at `naming.ts:148` because the code
  expects `CasError` while the operation can return `BackendFailure`;
- **UNKNOWN:** no post-edit TypeScript test or lint gate ran;
- fixes 2, 5, 6, 7, and 8 from the consolidated review remain untouched;
- paperwork items 9–12 remain untouched;
- the rescue prose is partial.

The first resumed action is to repair the error channel honestly, not cast it
away. Then finish the existing consolidated brief and run the lane gates before
creating a commit.

## 7. CAS word lane

Branch: `merge/cas-word` at `ad44b40b`

Worktree: the main blackout session's `scratchpad/m2-casword-wt`

The branch itself is clean. The terminated fix agent reproduced, but did not
repair, three correctness defects:

1. **Torn tail without newline.** A following receipt can concatenate with the
   partial tail, losing acknowledged marks and allowing them to be reissued.
2. **Cross-process file concurrency.** Concurrent writers can allocate the same
   sequence and permanently wedge receipt history.
3. **Blank failure rendering.** `cas history` exits with status 1 but renders
   only a bare `ERROR` for `BackendFailure`.

The full review also owes stronger fail-together coverage, correction of the
`since_compose` prose/theorem mismatch, active lint enforcement, and the
remaining F1–F9/L1–L5 items from the handoff.

The Lean Worded spine itself is coherent:

- **PROVED:** seven inspected laws built with accepted axiom reports;
- **UNKNOWN:** no theorem or conformance vector connects receipt-log `since`
  to Lean `WordSig.since`;
- **UNKNOWN:** public layer compositions remain unreceipted while the CLI
  open-codes the worded stack;
- **ASSUMED, not established:** bytes-first/receipt-second “fail together”
  behavior under crash and cross-process concurrency.

The proof plan must also distinguish prefix and suffix well-formedness. A
proposed `wf_take` theorem does not license `since`, because `since` returns a
suffix and that suffix may reference the omitted prefix. The useful statement
is relative, for example a relation of the form
`wfFrom (take n w) (drop n w) = true`, followed by an explicit
receipt-to-binding refinement. Likewise, a noninjectivity witness for running
history should use two reachable admitted histories—such as different orders
of independent fresh nodes—not a duplicate binding that the reference handler
would never append.

Decision 34 is still owed after the implementation is fixed: settle the
bytes/receipt order, failure semantics, optional-log behavior, history wording,
and the exact relationship between receipt history and semantic Word.

## 8. Daemon and auth lane

Branch: `merge/daemon-spine` at `0aeeefd7`

Worktree: the main blackout session's `scratchpad/m1-daemon-wt`

The clean branch had 346 tests passing when reviewed. Both independent reviews
returned merge-with-fixes, not merge-ready.

### Correctness issues still open

- case-sensitive host/origin comparison;
- only one of seven projection artifacts served by the package;
- duplicate `Infinity`/`+Inf` Prometheus bucket;
- bind failures bypass declared registration and receive the wrong diagnosis;
- `idleTimeout` is inert on Bun;
- unbounded MCP session map;
- URL pathname encoding error;
- silent OTLP failures.

The relevant law decisions are already recorded in decision 32: `/projections`
is released, SERVING was promoted, profile co-tenancy belongs in §14, and the
known-red state must remain explicit. The fix pass should implement those
rulings, not reopen them by accident.

### Live auth evidence recovered from the terminated audit

The auth writer never produced `AUTH-AUDIT.md`, but it ran useful probes:

- **MEASURED, clean within the tested topology:** default loopback host/origin
  refusals, null/foreign Origin rejection, unknown MCP session 404, request
  limits, traversal checks, and in-flight caps behaved as intended;
- **MEASURED:** loopback MCP writes are unauthenticated by design, which also
  creates a local disk-growth surface;
- **MEASURED, high severity:** with the daemon bound to `0.0.0.0`, a request
  through the LAN address was refused under its natural Host, but succeeded
  when the client supplied `Host: localhost`; unauthenticated get, put, and
  publish operations were reached;
- **MEASURED:** the wide bind emitted no warning about this trust transition;
- **MEASURED:** a custom allowed Host/Origin permitted metrics and projections,
  while MCP still failed unless its Origin was separately admitted;
- **MEASURED:** host/origin comparison is case-sensitive, same-origin ignores
  scheme, and IPv6 allow-host handling failed closed in the tested form;
- **MEASURED:** backup targets are logged verbatim, which can expose a
  credential-bearing URL even though no such value was observed in the probe;
- **MEASURED:** tracked/history scans found no committed estate credential;
- **MEASURED:** CI actions are tag-pinned rather than SHA-pinned and workflows
  do not declare explicit permissions.

No credential value is reproduced in this packet. A local ignored
credential-shaped file exists; its rotation status remains an operator action,
not an inferred code result.

The design question beneath the exploit is larger than string normalization:
`anonymousReads` currently gates a host that also serves writes. The name and
the authority do not match. The repaired lane must either separate read and
write authority or explicitly rule and name the wider capability. Treating a
client-supplied Host header as proof of loopback network position is not safe.

The final auth audit must run against the exact post-fix daemon commit, grade
each surface `BROKEN-SILENT`, `DRIFT`, `DECLARED-LIMIT`, or `CLEAN`, and retain
command evidence. The current transcript is a head start, not the final audit.

## 9. Core abstractions planner

File: `.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md`

Size: 1,182 lines

State: substantial pre-grade plan; no hard review or commit

The plan contains ten implementation lanes and a proof batch. Its own open
points include:

- unmeasured annotation-bag behavior;
- a recursive denotation gap;
- no CLI theorem carrier;
- a Prop-spelling scout rather than a settled account;
- a false unrestricted CANON permutation claim unless `Nodup` or an equivalent
  precondition is carried;
- no plane on the theorem arm;
- an uncertain/possibly ghost Word-registry conflict;
- no fresh-clone modification-time test;
- one assumed `tableNode` lemma.

The hard reviewer must now add two first-class blockers:

1. Lane D's P1/P2/P3 work already exists in the preserved dirty Gatekeeper
   worktree and must be reviewed/salvaged rather than duplicated.
2. The TypeScript Brain Stem/Lean Word mismatch invalidates any plan step that
   assumes the runtime carrier already refines `runP`.

It must also correct the recorded main revision, the stale MCP manifest-version
claim (the actual manifest version on current main is 1, not 0), the weak raw
Word noninjectivity witness, and the misuse of `wf_take` for suffix paging.
CANON-1 remains scoped to authored topology; arbitrary `SystemNode`
constructors are not thereby canonical. SPEC-1 needs non-interference, and
SPEC-2 needs host-effect isolation. `STATE-OF-MECHANIZATION.md` is also stale
where it says the Brain Stem is still in flight and lacks a host codec.

Hard review remains required before promotion, but “review the plan first” no
longer means “ignore the semantic floor and the endangered proof worktree until
afterward.” Preserve both immediately; settle their effect on the plan during
review.

## 10. Frontend and ornamentation lane

Ownership remains with the Claude/Fable frontend lane. The correct recovery is
editorial hard review and completion, not a Codex rewrite.

### 10.1 Surviving files

| File | State | Recovery action |
|---|---|---|
| `ORNAMENTATION.md` | 939 lines; structurally complete | Adversarial correction and current-main refresh. |
| `PROOF-OBLIGATIONS.md` | 630 lines; structurally complete | Correct false/overstated obligations; align carriers and evidence. |
| `WASM-CANVAS.md` | 351 lines; truncated | Resume missing §3.1–§3.6 survey and accessibility/performance analysis. |
| `agent-streaming-integrations.md` | 444 lines; truncated after pi §1.8 | Incorporate completed child research and write §§2–6. |

Tracked groundwork already exists: `FRONTEND.md`, `PLAIN-LANGUAGE.md`, the
`Cas.Schema.Exchange` kind and TypeScript mirror/tests, the foldkit workbench
skeleton, and `.staging/ornamentation/COORDINATION.md`. `PLAIN-LANGUAGE.md` is a
design report, not an implemented prose emitter. The workbench is a small
probe/state/service seam, not an implemented ornamented product.

Three raster conception studies were generated outside the repository: a
browser artifact inspector, a motif/palette sheet, and a terminal/Markdown/
plain-text projection study. They have no vector source, deterministic recipe,
model/version/seed receipt, rights record, or accessibility specification.
They are useful pre-grade visual evidence only.

### 10.2 Corrections required before ratification

1. **Recommendations are presented as rulings.** Fixed row height, exactly two
   levels, exactly three gestures, and “no graph” originate in archival Paper
   notes, not decisions 21, 23, or 31–33. Mark them PROPOSED unless an actual
   ruling is found.
2. **The lane self-ratifies.** A pre-grade document may recommend one
   presentation authority; it cannot declare the question ruled.
3. **The proposed carrier is too monolithic.** Prefer one addressed
   `PresentationManifest` root that references separately kinded
   `PrinterStyle`, `Palette`, `DensityPolicy`, `MotifGraph`, and projection
   profiles. One authority does not require unrelated changes to share one
   address.
4. **FE-O2 dispatches at the wrong level.** `viewOf : Ty → ViewDescriptor`
   makes a UI a function of a wire sort. Decision 23 permits new described
   kinds, not new sorts. Dispatch belongs to the described-kind registry/schema
   declaration; the sort selects the substrate decoder.
5. **The OkLCH claim is not a proof.** An `L` threshold does not establish
   grayscale distinction. Authoring in OkLCH is reasonable, but actual
   gamut-mapped colors must be checked for relative luminance/contrast, forced
   colors, grayscale, and color-vision simulations. Shape and text remain the
   non-color carrier.
6. **One verdict collapses independent facts.** Lifecycle, provenance,
   evidence grade, economy, and “not computed” should remain a product of axes;
   a compact verdict is a derived projection.
7. **Ornament needs roles, not one slogan.** Distinguish structural,
   epistemic, ceremonial, and ambient ornament. Ambient ornament owes an
   erasure law. Epistemic ornament owes an evidence receipt. Ceremonial marks
   must be earned. Structural marks derive from modeled boundaries, order, or
   placement.
8. **Trust marks need receipts.** “Generated” is not “gated.” A gated mark names
   the exact gate/build receipt and commit; an owed mark names its obligation.
9. **The DOM/canvas conclusion uses the wrong argument.** Canvas can be a
   projection. It would require a second emitter, semantic tree, accessibility
   surface, and agreement gate. The cost and duplication support DOM-first;
   impossibility does not.
10. **Current UI tests are narrower than the prose.** VNode role/name tests are
    not browser, keyboard, screen-reader, forced-color, layout, or performance
    evidence.
11. **Foldkit's actual boundary must stay visible.** A view is a function that
    emits a `Document`; its VNode output is inspectable, message-free viewers
    suit generated read-only surfaces, authored overrides own interaction, and
    SSR remains experimental at the examined foldkit version.
12. **Projection direction must be explicit.** Estate denotation/AST to DOM,
    SVG, terminal, Markdown, or plain text is projection. Target bytes do not
    become authority. A target can lift only through a declared recognized
    subset. Capability degradation across registers should be explicit and
    monotone.

### 10.3 Ornament roles and precedence proposed for grilling

The recovery review suggests the following coherent starting algebra. It is a
proposal, not a ruling:

```text
OrnamentRole := structural | epistemic | ceremonial | ambient

precedence:
  semantic content
    > accessibility and interaction state
    > epistemic evidence marks
    > structural grouping/order
    > ceremonial earned marks
    > ambient atmosphere
```

Required laws:

- **Ambient erasure:** removing ambient ornament changes no semantic,
  accessibility, interaction, ordering, or evidence observation.
- **Epistemic receipt:** every epistemic mark resolves to an exact claim,
  obligation, gate receipt, and revision.
- **Ceremonial earning:** a ceremonial mark appears only after its named state
  transition or gate; it cannot be authored as decoration.
- **Structural derivation:** structural ornament is determined by modeled
  boundary, containment, order, relationship, or projection loss.
- **Non-color sufficiency:** color may reinforce but never solely carry role,
  status, provenance, focus, error, or action.
- **Monotone degradation:** when a target loses geometry, color, motion, or
  density, it may lose ambient richness but must not gain or change semantic or
  epistemic meaning.
- **Projection agreement:** browser, SVG, terminal, Markdown, plain text,
  print, and forced-colors projections agree on content identity, ordering,
  role, and evidence; target-specific affordances are declared extensions.

This yields a Wright-informed language without treating historical style as a
bag of copied motifs: ornament grows from the carrier's order, boundary,
material/register, and earned state. Geometry is a projection of structure;
color is a supporting relation; repeated motifs expose algebraic repetition;
ceremony marks completed obligations rather than decorating everything.

### 10.4 Artboard and asset work still uncommissioned

The next visual seat should produce new, separately reserved files rather than
editing the recovery drafts:

- `PRESENTATION-ALGEBRA.md`;
- `COLOR.md`;
- `INTERACTION-DENSITY.md`;
- `ARTBOARDS.md`;
- `ASSET-PRODUCTION.md`;
- a new `.staging/ornamentation/assets/` subtree.

Required artboards cover dense transcript, kind inspector, running/refused/owed
states, mobile/narrow layout, keyboard focus, high contrast, grayscale,
screen-reader order, CLI, Markdown, plain text, and print. Deterministic SVG or
other vector sources are the candidate assets; raster images are previews.
Every generated study records prompt/specification, model, version, seed when
available, inputs, provenance, rights, and export recipe. No generated asset is
an estate artifact merely because it exists.

## 11. Streaming lane

The surviving file is useful through pi §1.8 but its status line incorrectly
says “Not dispatched,” and the promised protocol synthesis is absent.

The three completed research children do not need to be rerun. Their recoverable
conclusions, all external and therefore PENDING until pinned, are:

- ACP is the editor-to-local-agent leg with a versioned JSON-RPC/stdio surface;
- AG-UI is an agent-to-browser event leg over HTTP/SSE and has weaker
  validation/versioning than its prose may imply;
- MCP is the tool/resource leg, not a general substitute for either ACP or
  AG-UI;
- MCP 2026-07-28 is materially different from the estate's retained
  2025-11-25 pin and requires a version ruling rather than an implicit update;
- AI SDK 7 offers typed SSE UI-message parts, while provider streams still
  require explicit adapters;
- surveyed harnesses do not converge on one internal event schema;
- pi's strongest transferable ideas are a small inspectable extension model
  and a declared, versioned telemetry vocabulary with adapter conformance
  tests—not arbitrary plugin execution.

The resumed document should finish a leg-by-leg protocol matrix and define the
estate's own event vocabulary, framing, backpressure, cancellation, retry,
resume, durable-task, provenance, ordering, and telemetry obligations. It must
not call CAS word-log receipts a live semantic Word until the Brain Stem and
receipt/refinement gaps above are settled.

## 12. Scheduled two-hour audit

The scheduled task was correctly triggered two hours after the baseline
mechanization report. Its agent later mistook a newer blackout-handoff commit
for the baseline and incorrectly doubted the two-hour premise. Quota ended the
task before it wrote anything.

No `## Two-hour audit` entry or audit commit exists. When resumed, rerun from
the current main revision rather than reusing the terminated inference. The
target remains:

`.staging/sessions/2026-08-29-the-great-ratification.md`

The task should compare the new revision with the original baseline, record
what mechanization actually changed, and keep finite tests, theorem results,
and unverified claims separate.

## 13. Collision-free restart order

### Phase 0 — preserve and reserve

1. Record all exact revisions and dirty diffs before any rebase, cleanup, or
   regeneration.
2. Keep the Gatekeeper and CLI dirty worktrees intact.
3. Assign one writer per file group. Do not let document recovery touch
   generated code, merge branches, `COORDINATION.md`, `docs/SPECS.md`, or the
   session record.
4. Do not stage `.staging/e2/src-cache/**` or the three unreceipted raster
   studies.

### Phase 1 — settle the semantic floor

1. Rule the runtime result carrier: final Word, fresh-admission delta, or
   put-answer trace.
2. Align the TypeScript carrier and all public admission boundaries with
   `PLine.WF`.
3. Add duplicate-put, nonempty-starting-Word, and invalid-number differential
   vectors.
4. Run exact Lean, TypeScript, generation, and clean-tree gates.

### Phase 2 — salvage and hard-review

1. Inventory the Gatekeeper worktree against current main and existing rescue
   commits.
2. Split unique formal/generator work from overlapping CLI, R5, lift-harness,
   parser-census, and prose changes.
3. Review theorem statements before accepting proof success.
4. Correct false “LANDED” status and regenerate owned surfaces only through the
   declared generator.
5. Hard-review `CORE-ABSTRACTIONS-PLAN.md` with the salvaged P1/P2/P3 work and
   Brain Stem refinement blocker in view.

### Phase 3 — repair merge lanes

1. Finish CLI from its preserved partial diff; green its exact gates.
2. Integrate CLI into CAS word as planned, then repair F1–F9/L1–L5 and green
   crash/concurrency tests.
3. Integrate CAS word into daemon, implement the consolidated correctness/law
   fixes, and green daemon gates.
4. Run the read-only auth audit against that exact daemon commit. Resolve the
   wide-bind/forged-Host authority bug before any remote-safe claim.
5. Record decision 34, run the full clean-tree gate, then let the fleet decide
   whether and how to merge. This packet performs no merge.

### Phase 4 — recover research and design

In parallel, with separate file reservations:

- hard-correct `ORNAMENTATION.md` and `PROOF-OBLIGATIONS.md`;
- finish `WASM-CANVAS.md`;
- finish `agent-streaming-integrations.md`;
- rerun the two-hour audit.

After those are reviewed, grill the presentation manifest, ornament roles,
palette law, density policy, and proposed kinds. Only then release the visual
asset/artboard seat.

## 14. Ready-to-paste Fable restart prompts

Each prompt is intentionally bounded. The coordinator should add the exact
reservation/branch and wait for C1 assent before it permits a write.

### Fable G1 — Gatekeeper salvage and proof review

> Work in `/Users/pooks/Dev/foldlab`. Read `AGENTS.md`, the estate skill, the
> Lean assurance-review workflow, the blackout handoff, and this recovery
> packet. Preserve
> `.claude/worktrees/agent-a1997956e8eab5080`; do not clean, reset, rebase, or
> commit it wholesale. Inventory its 17 tracked edits and `.staging/e2/README.md`
> against current main `3ffb5f56`, rescue commit `dd54bc5f`, and the planner's
> Lane D. Separate unique formal declarations and generator/registry changes
> from overlapping CLI, R5, lift-harness, parser-census, and prose changes.
> Review each theorem's statement and preconditions before relying on its proof;
> rerun local builds and `#print axioms` for accepted declarations. Treat the
> prior root check as UNKNOWN because it stopped at the dirty-tree gate. Correct
> any false “LANDED” status. Never stage `.staging/e2/src-cache/**`. Do not
> commit or merge until the coordinator approves the split. Return a file-by-file
> salvage map, declaration DAG, exact gates, and unresolved overlaps.

### Fable B1 — Brain Stem carrier/refinement repair

> Start from current main `3ffb5f56`. The semantic probes were run at
> `ce2300d7`, whose successor changed only README/staged prose; reproduce them
> before editing. Read the store-language skill,
> `EFFECTS-BACKEND.md`, `Programs.ts`, the Lean `Defun`/`TreeProg` semantics,
> and this packet. First present the smallest explicit ruling choice between
> final Word, fresh-admission delta, and put-answer trace; do not silently rename
> or redefine the carrier. Reproduce the duplicate-put mismatch and the
> malformed-number round trips. Align every exported Program entry point,
> including `programAddress`, with `PLine.WF` using one checked host boundary.
> Add differential vectors for duplicate puts, a nonempty starting Word,
> negative/overflow answer indexes, and non-byte tag/version fields. State the
> exact refinement relation and theorem obligation; do not call test agreement
> a proof. Use generated surfaces only through their emitter. Do not commit
> until the ruling and file reservation are approved. Return the selected
> carrier, changed boundaries, counterexamples, tests, Lean obligations, and
> remaining UNKNOWNs.

### Fable P1 — core-plan hard reviewer

> Perform a no-write adversarial hard review of
> `.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md` on current main.
> Read this recovery packet and inspect the preserved Gatekeeper worktree. Do
> not recommission Lane D P1/P2/P3: determine what is already mechanized, what
> its statements actually establish, and what remains. Make the Brain Stem
> TypeScript/Lean Word mismatch and unchecked Program carrier explicit blockers
> wherever the plan assumes runtime refinement. Challenge the CANON permutation
> claim, annotation-bag measurement, recursive denotation, CLI carrier, theorem
> arm, registry conflict, fresh-clone mtime, and assumed `tableNode` lemma.
> Separate PROVED, TESTED, MEASURED, ASSUMED, and UNKNOWN. Produce a line-specific
> verdict and revised dependency order; edit nothing and make no commit.

### Fable C1 — CLI fix-pass resumption

> Resume the existing dirty `merge/cli-naming` worktree at `66a328e4`; do not
> restart or discard its five-file diff. Read both original reviews and the
> consolidated handoff. First repair the real `BackendFailure`/`CasError` error
> channel at `naming.ts:148` without a cast or swallowed failure. Then finish
> fixes 2 and 5–8 plus paperwork 9–12, reconcile the partial annotation/R5/root
> changes, and regenerate the annotation mirror through the declared emitter.
> Run `bun run typecheck`, the lane lint/tests, `mise run check:cas`, and
> `git diff --check`; report exact results. Keep merge work out of this seat.
> Commit only after all gates are green and the coordinator approves the
> reviewed diff.

### Fable W1 — CAS word consolidated repair

> Resume the clean `merge/cas-word` worktree at `ad44b40b` after the approved CLI
> integration point. Do not repeat the already conclusive F1/F2/F3 probes.
> Implement the complete F1–F9 and L1–L5 review brief, including torn tails
> without newlines, cross-process sequence allocation, honest BackendFailure
> rendering, fail-together crash tests, active lint enforcement, and accurate
> `since_compose` language. Expose and test the receipt/semantic-Word boundary;
> do not claim a `WordSig.since` refinement until a theorem or conformance
> vector exists. Preserve optional-log semantics and make Decision 34's open
> choices explicit. Run local Lean builds, axiom reports, TypeScript tests,
> concurrency/crash tests, typecheck, lint, generation, and the clean-tree gate.
> No merge without coordinator approval.

### Fable D1 — daemon consolidated repair

> Resume `merge/daemon-spine` at `0aeeefd7` only at the approved post-CAS-word
> integration point. Implement the two merge-with-fixes reviews and decision
> 32: normalize host/origin safely; serve the released projections; repair the
> Prometheus terminal bucket; route bind errors through declared registration;
> make timeout behavior real or remove the false control; bound and expire MCP
> sessions; correct path encoding; and surface OTLP failures. Treat loopback
> network position as distinct from a client-supplied Host header. Reproduce and
> close the wide-bind + `Host: localhost` unauthenticated read/write/publish
> path, and emit an explicit warning or refusal for unsafe topology. Separate
> anonymous read and write authority or raise the naming/authority question for
> a ruling. Run the full daemon test/probe matrix at the exact commit. Do not
> write the auth audit, merge, or claim remote safety in this seat.

### Fable A1 — exact-commit auth audit

> Start only after the daemon consolidated fix pass has a clean exact commit.
> You are a read-only auth-orientation auditor and own one new file:
> `.staging/operational-structure/AUTH-AUDIT.md`. Modify no implementation.
> Audit bind policy, forwarded Host/Origin handling, CORS, loopback/remote
> topology, proxy trust, anonymous read/write authority, credentials,
> environment secrets, logging/OTLP, path normalization, request/body caps,
> concurrency, MCP session lifetime, projections, cas-http resources, error
> classification, and shutdown/restart. Rerun the known wide-bind forged-Host,
> case-normalization, custom-proxy, backup-log, and session-growth probes without
> printing secrets. Grade every surface BROKEN-SILENT, DRIFT, DECLARED-LIMIT, or
> CLEAN with command evidence and the exact commit. The daemon's deliberate
> refusal of credentialed stores is a declared subset, not proof of the full
> profile. Do not fix, commit, or silently advance the MCP version.

### Fable O1 — ornament algebra editor

> Read `AGENTS.md`, the estate and interface-design skills,
> `.staging/ornamentation/COORDINATION.md`, decisions 21, 23, and 31–33, and this
> packet. Resume the existing `ORNAMENTATION.md` and `PROOF-OBLIGATIONS.md`; do
> not rewrite them. Own exactly those two files. Audit every “ruled”, “decided”,
> and “inherited” claim. Downgrade archival W-* requirements to PROPOSED unless
> an actual ruling exists. Replace the monolithic carrier with one addressed
> presentation manifest referencing deep, separately kinded modules. Correct
> FE-O2 so dispatch is by described kind/schema declaration, not `Ty`. Keep
> verdict axes separate; make any compact verdict a projection. Replace the
> OkLCH `L` theorem with target-color contrast and non-color obligations. Give
> ornament structural, epistemic, ceremonial, and ambient roles with erasure,
> receipt, earning, and projection-agreement laws. Preserve useful Paper work
> but keep all external claims PENDING. Refresh citations to current main. Touch
> no code, coordination/spec file, WASM file, or asset. Do not commit. Return a
> line-specific report and unresolved ruling asks.

### Fable O2 — WASM/WebGPU evidence completion

> Own exactly `.staging/ornamentation/WASM-CANVAS.md`. Resume the draft and fill
> the missing §3.1–§3.6; do not discard its useful workload analysis. Use
> primary sources and exact versions for DOM/SVG virtualization,
> Canvas2D/WebGL2/WebGPU, CanvasKit/Skia, Figma, Rive, Rust `wgpu`/Vello-class
> stacks, data grids, and sqlite-wasm/OPFS. Every size/performance/browser claim
> needs a published/measured value or UNVERIFIED, and every external claim stays
> C6 PENDING until pinned. Correct “canvas cannot be a projection”: it is a
> second target owing a second emitter, semantic tree, accessibility surface,
> and agreement gate. Cover keyboard, screen reader, forced colors,
> reduced-motion, selection, copy/paste, IME, zoom/reflow, and fallback. Keep
> store/interpreter WASM separate from rendering. End with falsifiable thresholds
> that would reopen DOM-first. Touch no other file and do not commit.

### Fable S1 — streaming synthesis recovery

> Own exactly `.staging/research-backlog/agent-streaming-integrations.md`.
> Resume after §1.8; do not redo the pi study. Read the completed ACP/AG-UI,
> MCP/AI-SDK/provider, and harness child transcripts named in this packet.
> Finish the protocol landscape, leg-by-leg matrix, daemon translation, event
> vocabulary, framing, backpressure, cancellation, retry/resume, durable tasks,
> provenance, ordering, telemetry, and adoption recommendation. Keep ACP
> editor↔agent, AG-UI agent↔browser, MCP tool/resource, provider stream, and
> internal estate-event legs distinct. Map separately to current main and
> `merge/daemon-spine` at its exact unmerged commit. Decision 28 retains MCP
> 2025-11-25 until a consumer forces a version event; treat 2026-07-28 as PENDING
> evidence and a ruling ask. Reconcile receipt language with the unresolved
> semantic Word gaps. No code, other file, or commit.

### Fable V1 — presentation, color, artboards, and assets

> Release this seat only after O1/O2 review and a coordinator ruling on the
> presentation carrier and palette direction. Own only new files:
> `PRESENTATION-ALGEBRA.md`, `COLOR.md`, `INTERACTION-DENSITY.md`, `ARTBOARDS.md`,
> `ASSET-PRODUCTION.md`, and a newly reserved
> `.staging/ornamentation/assets/` subtree. Do not edit the existing drafts or
> code. Design one addressed presentation manifest referencing separate
> palette, density, motif, placement, printer, and projection-profile values;
> introduce no new sort. Specify structural, epistemic, ceremonial, and ambient
> ornament roles, precedence, erasure, receipts, accessibility, and monotone
> degradation across browser, terminal, CLI, Markdown, plain text, print, and
> forced colors. Inventory the three existing PNG studies as evidence only.
> Produce deterministic vector concept assets and a manifest recording
> prompt/specification, model, version, seed when available, inputs, provenance,
> rights, and export recipe. Raster exports are previews. Cover dense transcript,
> kind inspector, running/refused/owed states, narrow layout, high contrast,
> grayscale, keyboard focus, screen-reader order, CLI, Markdown, plain text, and
> print. No admission claim, new kind, code edit, or commit.

### Fable M1 — two-hour mechanization audit rerun

> Rerun the scheduled mechanization audit from current main `3ffb5f56`. Use
> `STATE-OF-MECHANIZATION.md` at `8fb91f83` as the original baseline; do not use
> the later blackout-handoff commit as the start time. Inspect the intervening
> commits, current branches, and this recovery packet. Append the promised
> `## Two-hour audit` entry to
> `.staging/sessions/2026-08-29-the-great-ratification.md` only after a C1
> reservation. Report what became mechanized, what remained prose, what is dirty
> or unmerged, and what evidence level each result earns. Do not treat a finite
> sweep as a universal proof. Commit only if the coordinator explicitly
> authorizes the session-record update.

## 15. Completion gates for the recovered push

The fleet can call the blackout recovered only when all applicable items below
have exact evidence:

- [ ] main and `origin/main` revision recorded at dispatch time;
- [ ] Gatekeeper dirty work preserved, split, and reviewed without cache
      promotion;
- [ ] Brain Stem result carrier ruled and aligned across Lean, TypeScript, and
      prose;
- [ ] public Program admission enforces the formal WF carrier;
- [ ] duplicate, nonempty-starting-Word, and malformed-value vectors pass;
- [ ] core plan hard review completed with no duplicate Lane D commission;
- [ ] CLI partial pass completed with typecheck, tests, lint, CAS gate, and
      whitespace gate green;
- [ ] CAS word torn-tail and cross-process failures fixed and stress-tested;
- [ ] receipt history/semantic Word relationship stated at its honest gate;
- [ ] daemon consolidated fixes green at an exact commit;
- [ ] wide-bind/forged-Host path closed or explicitly refused;
- [ ] exact-commit auth audit written with no secrets disclosed;
- [ ] integration order CLI → CAS word → daemon respected;
- [ ] decision 34 recorded before final integration claim;
- [ ] ornament drafts corrected and provenance gaps marked PENDING;
- [ ] WASM and streaming documents completed from surviving research;
- [ ] presentation algebra and palette law grilled before asset production;
- [ ] generated visual studies carry deterministic recipes and accessibility
      checks;
- [ ] scheduled mechanization audit rerun from the correct baseline;
- [ ] final root generation/test/clean-tree gate run from a clean checkout;
- [ ] every “proved”, “tested”, “measured”, “assumed”, and “unknown” claim still
      says exactly which layer it describes.

## 16. Known unknowns retained deliberately

- Whether the fleet will select final Word, fresh delta, or answer trace as the
  TypeScript runtime result is **UNKNOWN pending ruling**.
- Whether every Gatekeeper theorem statement matches the intended public
  contract is **UNKNOWN pending hard review**, despite successful proofs.
- The behavior of the CAS word lane after actual fixes is **UNKNOWN**; only the
  defects were reproduced.
- Remote daemon safety after repair is **UNKNOWN**; the existing wide-bind probe
  failed it.
- Full WASM/rendering comparison is **UNKNOWN**; several research children
  terminated before final reports.
- Paper, Figma, Rive, pi, ACP, AG-UI, MCP 2026-07-28, AI SDK, provider, and
  harness claims remain **PENDING** until estate provenance is resolved.
- The three raster conception studies have no admitted production recipe,
  rights receipt, or accessibility contract.
- No visual asset, presentation kind, or ornament law proposed here is ratified.

That uncertainty is part of the recovery state. Removing the labels would not
make the work more complete; it would only make the next Fables easier to
misdirect.
