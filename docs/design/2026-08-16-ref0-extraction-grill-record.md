# REF-0 grill record — the extraction decisions

Operator session, 2026-08-16. Five decisions from
`scratch/dispatch/17-the-refinement-ladder.md` REF-0, each put to the
operator with a prepared recommendation and ratified as stated below.
The REF-0 spike's measurements complete this record; its thresholds
are pre-registered here so the spike's results cannot be rationalized
after the fact.

## D-a — extraction mechanism: backend-first, thresholds pre-registered

Lean's own C backend is primary: the kernel's functions are the exact
proved definitions compiled by the same compiler and runtime the
corpus generator (`lake exe oracle emit`) already runs through — no
new kind of trusted component. The freestanding C generator (a Lean
program printing dependency-free C, certified by corpus + mutants) is
the named fallback. Hand-written C was named and killed: hand-authoring
where generation is possible, refused by the 2026-08-15 ruling.

The fallback triggers only if the spike breaches a pre-registered
threshold:

| # | Threshold |
| --- | --- |
| T1 | the spike cannot link and run on Windows at all, after honest effort |
| T2 | added artifact exceeds 64 MB (wasm lane: the `.wasm` file; native lane: static lib plus linked-binary delta over a bare driver) |
| T3 | per-call overhead exceeds 1 ms at the bytes ABI — binding cell: steady-state p50 of `spike_step` at the 10 KB payload, breached if any host on any platform exceeds it; other sizes and percentiles are recorded as data, not verdicts |
| T4 | the runtime is unsafe under per-session serialization (concurrent sessions corrupt it) — threading contract, written in per the ratified roster (RQ-1): per-session serialization is safe ONLY IF every calling thread is a pinned OS thread known to the runtime and no Lean object is shared across sessions; a naive host faults, a lucky one passes, and the difference is invisible to output-only tests, so the host's threading pattern is part of the claim |

## D-bc — binding topology: WASM-preferred, native fallback

One `.wasm` artifact, one digest everywhere: wazero in Go (no cgo, no
C toolchain in protod's build), native WebAssembly in Bun. Ratified
over the draft's original native lean because of a grill finding: in
the native lane the artifact that runs is per-platform by construction,
so REF-6's "regeneration byte-diffed on both platforms" gate could pin
only the emitted C source, not the running kernel. In the WASM lane
the deployed kernel has exactly one content digest across Go, TS,
Windows, Linux, and any future browser rendering — the gate pins the
thing that actually runs, which is the estate's content-addressed
thesis applied to its own seam.

Amended 2026-08-16 (same session): the load-bearing pin is the
**deployed artifact's digest** — built once, embedded everywhere.
Byte-identical regeneration is gated on a designated build platform
(two clean-checkout builds, byte-equal); cross-platform build
byte-identity is recorded as a datum and promoted to a gate only if
RQ-6 finds it achievable. A toolchain-nondeterminism finding then
rewords the gate instead of reopening this decision.

Costs, stated: emscripten joins the trusted base and build chain;
wazero joins protod's dependencies. Two further costs added by the
ratified roster (RQ-8, the Cedar dissent — AWS considered and
rejected exactly this deploy-generated-C shape, and two of their
objections survive our narrower scope): debugging a kernel failure
means stepping through generated code and mapping it back to the
Lean source, a cost SHARPENED by our hand-written-host /
generated-kernel boundary; and the generated C is not memory-safe,
mitigated by the wasm sandbox in the preferred lane but live in the
native fallback. Behavioral identity across hosts rests on two named
conditions (RQ-3, measured): the module declares ZERO imports, and
the artifact is a single standalone `.wasm` with no generated-JS
half. The native lane (cgo static lib + `bun:ffi` dlopen) is the
pre-registered fallback; the D-a thresholds govern both lanes.
Post-sweep ruling 3 re-scoped the spike to the wasm lane (native
discharged by RQ-1); if the wasm lane breaches, selection falls to
the proven native lane, and D-a's generator fallback activates only
if new evidence invalidates that result.

## D-d — kernel ABI: stateless, total by refusal, self-identifying

All three ratified:

1. **Stateless pure function.** `step(stateBytes, opBytes) →
   (stateBytes', receiptBytes)`; canonical bytes (RFC 8785) both
   directions; the host owns all state, the kernel owns none. The
   proved object is a pure function; a stateful handle would
   reintroduce state the theorems do not quantify over.
2. **Total by refusal.** Every input byte string — malformed and
   non-canonical included — returns a typed refusal payload. A WASM
   trap or native crash on any input is a gate failure — **and so is
   a defaulted return** (roster-ratified rewording, RQ-1): on the
   chosen backend `panic!` does not trap, it returns the type's
   `Inhabited` default and exits 0, so the obligation reads "no trap
   AND no defaulted return", enforced by a source gate (no
   `panic!`/`partial`/`sorry` in kernel code — landed as the brief-22
   machinery) plus an artifact gate at REF-6 (the panic routine's
   count in the emitted C is zero). Allocation failure is inside the
   obligation (RQ-3): the wasm spec licenses `memory.grow` to fail
   for embedder-resource reasons even under the deterministic
   profile, so out-of-memory returns a typed refusal, never a trap —
   with the residue stated honestly: a typed refusal preserves
   totality but not cross-host determinism, since the same input can
   refuse on a tighter host and succeed on a looser one, and the
   artifact digest cannot see that difference.
3. **Self-identifying.** The kernel exports its model version and its
   **build identity** — the model-source digest stamped at generation
   time. The **host** computes the content digest of the artifact it
   actually loaded and journals it per session; a replay under a
   different kernel digest refuses by name. Together these close the
   swapped-kernel silent channel ahead of REF-9. (Amended 2026-08-16,
   same session: an artifact cannot embed the digest of its own bytes
   — that fixed point does not exist. The embedded-self-digest
   variant, digesting the artifact with a custom section zeroed, was
   named and killed: it adds post-build tooling to the trusted chain
   and the journaled digest would no longer cover the raw deployed
   bytes.)

## D-e — `proved` status: five obligations, unconditional

The seam-ledger `proved` status (verification-ladder ticket amendment)
requires, in one flipping commit:

1. the refinement equation proved, statement sha-pinned,
   footprint-clean;
2. divergence constant = **0** — unconditional; a seam with named
   exceptions stays `walled`, no proved-with-asterisks status exists;
3. the running seam is the generated kernel: single-source gate
   green; the host-journaled artifact digest equals the digest of the
   artifact the model build emitted, and the kernel's exported build
   identity matches the model source;
4. the trusted base stated in VERIFICATION.md;
5. **status-as-gate**: one command re-verifies obligations 1–4 at
   HEAD, cited by the ledger row and run by CI — downgrade is
   automatic: a red gate means the row is false and the build fails.
   Job-shape constraint, roster-ratified (RQ-5, from documented
   GitHub behavior): the command runs in an UNCONDITIONAL job, in a
   workflow with no `paths:` filter and no `continue-on-error`,
   because a required check carried on an `if:`-guarded job reports
   Success when skipped — a job-level conditional fails OPEN; and
   required-check configuration matches JOB IDS, not display names.
   Precedent, placed honestly: this obligation adapts mathlib4's
   `lake exe check-yaml` (documentation claims re-derived against
   the environment at HEAD, exit 1 on falsehood, on the PR path)
   rather than inventing the shape; like the precedent, it checks
   that the cited gate exists and passes, not that prose says what
   it should.

## What completes REF-0

The hello-kernel spike, dispatched per house cadence: one exported
Lean function through the backend, built in both lanes (wasm via
emscripten → wazero + Bun; native via gcc → cgo + `bun:ffi`), from a
clean checkout on Windows and Linux, with measured artifact size and
per-call overhead recorded against T1–T4. The lane the measurements
select is recorded here; then draft 17 goes to the board.

Lane selection additionally weighs the wasm lane's per-instance
costs — instantiation time and resident memory per concurrent
session, since the safe concurrency pattern may be
instance-per-session. These carry **no pre-registered threshold**:
no grounded number exists yet. They enter lane selection as named
evidence beside the T1–T4 table, and this judgment locus is stated
here so it cannot operate silently.

## OCaml, named and killed

Raised by the operator 2026-08-16, eliminated the same day. OCaml
models types but proves nothing: the proof role means switching to
Rocq or F\* and abandoning the verified Lean estate (`verify/moves`,
`verify/ir`) for a full rewrite and re-ratification. The kernel role
means hand-porting — no Lean→OCaml backend exists, and hand-authoring
where generation is possible is already refused — or a custom
generator with strictly more machinery than the D-a fallback for no
added reach; its wasm lane targets WasmGC, which the ratified Go host
(wazero) is not known to implement (unverified lead, moot after
elimination). Preserved niche, on record: a small hand-written OCaml
**certificate checker** remains an admissible REF-8 diversity
candidate — a checker re-derives verdicts rather than standing in for
the model's, so the no-hand-authored-verdicts ruling does not bar it.

## Amendments — 2026-08-16, same session

Authority: operator delegation ("make your corrections to the record
as it stands"), given after the coordinator's review of this record
and drafts 17–19. Each amendment is listed for veto; none reverses a
ratified direction.

1. **T2** — measurement definition mirrored from the spike spec into
   the threshold row (per-lane meaning of "added artifact"), killing
   an ambiguity, not changing the number.
2. **T3** — binding cell pinned before the spike runs: steady-state
   p50 of `spike_step` at 10 KB, any host, any platform. 10 KB
   approximates a mid-session state crossing; p50 because the
   threshold guards the representative per-fill path — tail behavior
   is recorded as data. An unpinned threshold reopens the
   rationalization door pre-registration exists to close.
3. **D-bc** — regeneration gate two-tiered (designated-platform
   byte-identity gated now; cross-platform identity a datum pending
   RQ-6). The deployed artifact's digest is the load-bearing pin.
4. **D-d item 3** — self-identity split between kernel (exported
   build identity) and host (journaled digest of the loaded
   artifact); the embedded-self-digest fixed point does not exist.
5. **D-e obligation 3** — reworded to match amendment 4.
6. **Lane-selection evidence** — wasm per-instance instantiation and
   memory measured by the spike with no pre-registered threshold;
   the judgment locus stated openly above.
7. **Wire-model home** — draft 17's REF-1 said "REF-0 decides" the
   `verify/wire/` vs `Moves.Wire` question; this record never did and
   deliberately does not. The decision moves to REF-1 dispatch,
   informed by RQ-8's layout recommendations.
8. **OCaml** — eliminated as kernel or proof language (section
   above), REF-8 checker niche preserved.

## Post-sweep rulings — 2026-08-16, operator session

The nine-question research sweep completed the same day (reports and
verification addenda in `docs/research/2026-08-16-rq*.md`; synthesis
in `docs/research/2026-08-16-rq-synthesis.md`). No ratified decision
was reversed. The operator then ruled on the sweep's three re-grill
items and the spike's disposition, each put with a prepared
recommendation and taken as recommended:

1. **REF-8 independence = host independence.** The certificate gate
   is the same deployed artifact re-deriving every verdict under
   both hosts (wazero and Bun). Build independence is recorded as
   discharged by REF-6's regeneration gate; a differently-authored
   checker (the OCaml niche above) is a named optional follow-on
   slice; builder independence — a different party on different
   infrastructure reproducing the digest — is named here so a future
   slice chooses it deliberately rather than overlooking it.
2. **The float leaf leaves v0.** The mintable `{"k":"float"}` value
   leaf (declared in proto/SPEC.md, admitted by value_check.go) is
   dropped from the wire grammar, before DEV-670 generates: REF-2a
   then satisfies REF-2's whole-grammar charter, and `proved` is
   reachable without formalizing shortest-round-trip printing.
   Floats re-enter, if ever, through the REF-9 living-model loop
   with REF-2b (ES2019 §7.1.12.1 step 5) as their pre-registered
   proof obligation. Urgent consequence, recorded: this ruling must
   reach the DEV-670 brief before corpus generation bakes the value
   alphabet. Dispatch brief: `scratch/dispatch/21-float-leaf-drop.md`.
3. **The spike re-scopes to the wasm lane**, superseding this
   record's "What completes REF-0" both-lanes wording. The native
   lane's T1–T4 are discharged by RQ-1's independently verified
   minimal example (all four clear on Windows, evidence at
   `docs/research/reference/rq1-lean-c-backend/`); re-proving it is
   waste. The spike now exists to produce and measure a Lean-runtime
   `.wasm`: zero-import goal; validation under wazero's DEFAULT
   feature configuration and under Bun; the D-a thresholds plus
   per-instance instantiation and memory (amendment 6) plus three
   records from RQ-3 — the declared import list, the default-config
   validation verdict, and the host call pattern used.
   Linux-native confirmation folds into REF-6 CI. Fallback logic
   after this ruling: if the wasm lane breaches, the selection falls
   to the proven native lane; D-a's freestanding-generator fallback
   activates only if new evidence invalidates RQ-1's native result.
Later the same session (2026-08-17), on the Rev seat's findings
against the brief-21/22 branch
(`docs/research/2026-08-16-review-float-hygiene-branch.md`), two
further rulings, each taken as recommended:

5. **Literal scalars narrow to integers** (cures blocker F1). The
   `{"k":"literal"}` value position admits string | integral number
   | bool | null, reusing the exact bound the estate already wrote
   for `int` (Trunc(n) = n and |n| ≤ 2^53−1). A type-grammar
   narrowing, not a JCS narrowing — the recorded rejection reason in
   proto/DECISIONS.md does not apply. This completes ruling 2's
   intent: non-integer numbers no longer enter type identity bytes
   by any construct. Non-integer literals re-enter, if ever, with
   floats via the REF-9 loop and REF-2b.
6. **Opaque is uninterpreted canonical bytes** (dispositions F2).
   `{"k":"opaque"}` keeps admitting any value; its law under the
   canonical value theorem is definitional — identity IS byte
   equality, there is no semantics to diverge from, so the REF-2a
   theorem's opaque clause is trivially sound. Canonicity of
   float-bearing opaque payloads is enforced at the shell's JCS
   seam (differentially walled), named in the trusted base; the
   kernel never parses opaque.

On the cure re-review's blocker (check.args, the third position in
the same family), 2026-08-17:

7. **The closure law.** No position in a `flb.type.v0` type term
   admits a non-integral number — the integrality bound
   (Trunc(n) = n and |n| ≤ 2^53−1) is enforced in the type walker's
   number-decoding path itself, so `check.args` and every future
   JSON-bearing position inherit it automatically rather than by
   per-position patches. Opaque remains the sole byte-leaf exception
   (ruling 6). SPEC.md states this as one law and gains the missing
   `{"k":"opaque"}` production its own amendment 3 already ratified
   — the grammar block and the certifier must not disagree. Ruled as
   a class-killer after two serial blockers (literal, then
   check.args) proved instance-by-instance narrowing does not
   converge. Cure brief: `scratch/dispatch/26-closure-law-cure.md`.

4. **Lane-invariant model work dispatches now**, ratifying draft
   20's lane-invariance recommendation ahead of DEV-670's close. The
   kernel-hygiene gates (the annotation gate forbidding
   `@[implemented_by]` and non-allowlisted `@[extern]` in owned
   model sources; the panic-free source gate) are buildable today
   against verify/moves. The REF-2a spec is authored under ruling 2.
   The REF-1 spec is authored now adopting RQ-8's evidenced answers,
   hereby ruled: one Lake package with a `Moves.Wire` namespace (not
   a separate verify/wire/ package); the journal lives outside
   `stateBytes`, host-owned; the journal records each operation as
   the canonical opBytes the kernel saw. REF-1's build dispatches at
   DEV-670 close.

**Reword roster: RATIFIED WHOLESALE** by the operator later the same
day and implemented by the coordinator across this record and drafts
17/18 (amendment trail in place above; the ladder's trusted base,
REF-1/2/6/8/9 gate wordings, and the spike's reproducibility
qualifiers carry the rest). The five report bodies flagged by the
synthesis stand UNREWRITTEN: their verification addenda are the
record, and the synthesis §5 digest is the citable surface — a later
reader cites the synthesis or the addenda, never an uncorrected
paragraph. "Stands" dispositions required no action; the three
re-grill items were ruled above.
