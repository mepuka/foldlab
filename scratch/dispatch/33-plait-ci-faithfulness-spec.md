# Dispatch 33 — Plait: model-faithfulness CI — tripwire, evidence, and the verifier bundle (executor spec)

Status: spec FINAL for dispatch, 2026-08-17, under the Plait
ratification record (`docs/design/2026-08-17-plait-ratification-record.md`,
both waves). The ratified grill sheet BINDS this slice's shape: item 16
(`lean-gates` stays non-required; the tripwire is the required-lane
enforcement; revisit trigger recorded), item 17 (toolchain tarball sha
at first bundle, toolchain-line logging now), item 18 (first bundle at
the slice-1 tag, every slice tag thereafter), item 19 (the two
`run.sh` amendments are brief 34's, NOT this slice's). Consumes — does
not redesign — what dispatch 30 landed (`verify/fabric` + emitter +
`run.sh`, merged `850779722`) and dispatch 29 landed (`packages/plait`,
merged `b51d1d8c4`). Standing law: `docs/OPERATIONS.md` (branch
protection, releases), `AGENTS.md` (the battery split), the
generated-vectors ruling. Board: project `plait`; the coordinator
assigns the parent issue (no epic owns CI; the issue body is this
spec). Measured ground, from live runs 2026-08-17: the whole
`lean-gates` job is ~31 s wall (elan-init 1.8 s; toolchain download
3.5 s; moves+ir 19 s); topology follows the measurements, not the
folklore — no caching for zero-dependency 4.33.0 jobs.

**Authority precedence** (retro adoption T1): binding records and the
ratified rulings above > the named program-doc sections
(`2026-08-17-plait-coordination-fabric.md` §9; the architecture record
§7) > this spec's decisions. Where this spec's wording appears to
contradict a binding authority, the authority governs and the executor
FILES A FINDING rather than choosing a reading.

**Ledger law** (ruling G6): the executor never edits VERIFICATION.md.
This slice is expected to propose NO new row; if any claim-bearing
surface moves, the closing report proposes the row text (short table
row + full Claim/Evidence/Bounds/Checkable section) and the
coordinator lands it. The fabric row was amended per the fidelity
review's D1 to record that nothing consumes the corpus yet and that
its only guard is the non-required lane — this slice's tripwire is
half of what closes that named gap (E4's replay wall is the other
half), and the closing report proposes the row's guard-sentence
update for the coordinator. The vintage discipline of decision 6
binds how FUTURE rows cite the corpus.

## Objective

The model-faithfulness lane becomes mechanical end to end: every PR
carries regeneration evidence (`lean-gates` already runs the fabric
gate — this slice makes its failures carry evidence and its toolchain
recorded); the REQUIRED battery gains the fixture-manifest drift
tripwire that closes the hand-edit channel without a Lean toolchain —
the required-lane guard the amended fabric ledger row names as
missing (fidelity review D1); and the verifier-bundle machinery is
landed and self-tested, ready to assemble the first bundle at the
slice-1 tag. A stranger with only `sha256sum` can check integrity;
one with bun can replay the wall; one with elan can re-derive the
corpus.

## Spec-fixed decisions (the executor edits none of these)

1. **The required lane does not grow a Lean toolchain.** `lean-gates`
   stays non-required (ratified item 16; the required-check ≡
   local-battery equation is documented law twice — OPERATIONS branch
   protection; AGENTS.md). The revisit trigger is recorded here
   verbatim: promotion is reconsidered when the corpus count grows
   enough that the forgery-window argument (decision 4's stated bound)
   feels thin. No branch-protection edit anywhere in this slice
   (operator act).
2. **CI topology residue on `lean-gates.yml`** (the fabric step itself
   landed with PR #66 — this slice does not re-wire it): (a) print
   `elan --version` and the resolved toolchain line into the job log —
   recorded data, the cheap tier of pins-by-recording (ratified item
   17 defers tarball-sha recording to the first bundle); (b) tee the
   fabric step's output to `fabric-gate.log` and on failure upload it
   plus `verify/fabric/.regen/**` as a run artifact
   (`if-no-files-found: ignore` — the `.regen/` retention itself is
   brief 34's amendment; this upload path is deliberately tolerant
   until it lands, per ratified item 19's grounding). No caching: at
   the measured numbers a ~1 GiB cache restore costs more than the
   5 s download it replaces and adds a staleness channel; re-measure
   if the job grows past ~5 min and record the number in the workflow
   header (the model-gate idiom).
3. **The manifest** — `packages/plait/fixtures/fabric-manifest.json`,
   a GENERATED artifact (the generated-vectors law applies to it):
   emitted under the fabric gate's flow only after the corpus
   byte-diff passes, byte-diffed against the committed copy exactly
   like the corpus; sorted-key deterministic, LF (the
   `.gitattributes` pin already covers `packages/plait/fixtures/**`).
   Content, minimal: `format`, `command` (the emitter provenance
   command), `toolchain` (the resolved `lean-toolchain` line),
   `sourceDigest` (sha256 over the sorted `(path, sha256(content))`
   list of every git-tracked file under `verify/fabric/`),
   `fixtures` (name → sha256 for every fixture file the model emits),
   `vectors` (the pinned count, 11 today — it moves only with a
   regeneration). The exact emission wiring is an executor DECISION
   within those constraints, recorded in DECISIONS; the manifest
   doubles as the bundle manifest (decision 6) — one artifact, two
   consumers.
4. **The drift tripwire in the REQUIRED battery** —
   `scripts/check-fabric-drift.ts` (bun + git only, no Lean; the
   `check-laws.ts` idiom), ONE stage appended to `scripts/gates.ts`
   and the SAME single stage added to `gates.yml` with the same label
   (mirror exact; `gates.sh`/`gates.ps1` byte-untouched). It fails the
   battery in both drift directions against the recorded baseline:
   (a) a fixture whose sha256 mismatches its manifest entry —
   "fixtures are generated only; regenerate via verify/fabric/run.sh
   or revert the edit"; (b) a `sourceDigest` mismatch recomputed from
   the checkout (`git ls-files --cached --others --exclude-standard
   verify/fabric`, hashing contents, so an uncommitted local model
   edit trips too) — "verify/fabric changed without regeneration: run
   bash verify/fabric/run.sh and commit corpus + manifest with the
   model change". **The bound is stated in the script's header and in
   its failure text: the tripwire cannot detect a forged baseline** —
   a fixture hand-edited and the manifest recomputed over it passes;
   that forgery is exactly what the per-PR Lean gate catches by fresh
   execution. Two layers, each named for what it proves. Landing this
   stage also makes the ratified grill sheet item 16's present-tense
   description of the tripwire TRUE (the fidelity review's S5 noted
   the tense ran ahead of the tree); the executor edits no ruling
   record — the closing report notes the closure for the coordinator.
5. **Self-tests** (a prover that cannot fail proves nothing):
   `check-fabric-drift.ts --self-test`, operating on temp copies,
   never the working tree: (i) a planted one-byte fixture edit MUST
   fail naming the file; (ii) a planted model-source content change
   MUST fail naming the source-digest mismatch; (iii) the REACH
   control — a manifest recomputed over the flipped fixture MUST PASS
   the tripwire, with the control's message stating that forgery
   detection belongs to the Lean gate (the negative-controls.yml
   "untagged sabotage must go undetected" idiom).
   `negative-controls.yml` adds the pair (self-test, then the real
   run) to its per-push battery beside `check-laws.ts` — that workflow
   is what keeps controls COMPILED and RUN. The battery runner's own
   `--self-test` is untouched (its three controls test the runner; the
   new stage's controls live in its own script, per the established
   split).
6. **The verifier bundle machinery** (OPERATIONS releases law: tag at
   ladder milestones; artifacts are verifier bundles a stranger can
   recompute). Committed in-repo this slice: `scripts/plait-bundle/
   verify.sh` with three tiers, each naming what it certifies — tier 1
   digests (needs `sha256sum` only: every bundle file matches
   SHA256SUMS; every fixture matches the manifest; certifies bundle
   integrity, nothing about the model); tier 2 the wall (needs bun +
   the tagged checkout: run the package conformance wall against the
   bundle corpus — E4's test once it lands; the tier states its
   dependency and refuses cleanly before then); tier 3 re-emission
   (needs elan + the tagged checkout: `bash verify/fabric/run.sh`,
   fresh emission byte-diffed against the bundle corpus — the
   "stranger recomputes it" tier, ~30 s measured). Plus
   `.github/workflows/plait-bundle.yml` on `workflow_dispatch` + tag
   push (`plait-*`), `ubuntu-latest`: (1) runs the fabric gate at the
   tag — a bundle is never assembled from a red tree; (2) assembles
   `corpus/ + manifest + verify.sh (copied, never generated) +
   SHA256SUMS + PROVENANCE`; (3) attaches it to the GitHub release.
   PROVENANCE records: tag, commit sha, toolchain line, **the
   toolchain tarball's sha256** (ratified item 17 — first recorded
   here, at first bundle), designated platform, the green `lean-gates`
   run URL + id, and the regeneration command. **Cadence is ruled:
   the first bundle at the slice-1 tag, every slice tag thereafter**
   (ratified item 18) — this slice lands the machinery and does NOT
   mint a tag; the coordinator tags at the E4 milestone and the
   workflow fires. A corpus **vintage** is the tuple the manifest +
   PROVENANCE record (commit, sourceDigest, toolchain, command);
   downstream VERIFICATION.md rows cite the vintage digest so "walled
   against the model" always names WHICH model.
7. **The designated regeneration platform is `ubuntu-latest`** (the
   REF-0 grill record's D-bc rule applied to Plait): its byte-diff is
   the gate of record; the corpus is LF-pinned text, so a local
   Windows regeneration equality is EXPECTED and each local run is a
   recorded datum; if any platform ever emits differently, that is a
   FINDING about emitter nondeterminism (report, stop), never a
   reason to loosen the gate to per-platform fixtures. One rule for
   the text vectors now and the REF-6 wasm artifact later.
8. **Named homes for what this slice does NOT build** (the
   cross-slice map, so nothing is improvised here): the L0→L2
   faithfulness wall — the package conformance test replaying the
   corpus row-for-row — is E4's deliverable (dispatch 31 decision 7;
   it consumes this slice's manifest unchanged and arrives in the
   battery via `test:packages` with no plan edit); `plait attest`
   over real NATS is a later, separate claim; `fabric-veil-gate.yml`
   is E5's (dispatch 32, per the mid-flight CI ruling); the `run.sh`
   divergent-row FINDING message and the real `--self-test` are brief
   34's (ratified item 19).

## Gates (mechanical)

Each line names where the gate is wired; the PR must show it executing
at the head.

1. `lean-gates.yml` at the head shows the toolchain lines in the job
   log and, on a forced failure, uploads `fabric-gate.log` (the
   `.regen/**` path may be empty until brief 34 lands — the upload is
   tolerant by spec).
2. Control run A, committed as a replayable artifact (throwaway
   branch + linked red run, the REF-9 idiom): a one-byte edit to
   `packages/plait/fixtures/fabric-conformance.ndjson` with no model
   change goes red in BOTH lanes — the battery's tripwire stage and
   the fabric gate — each with its own message.
3. Control run B, same discipline: an emitter-visible edit under
   `verify/fabric/` without regeneration goes red in both lanes.
4. `fabric-manifest.json` exists, is emitted and byte-diffed by the
   fabric gate's flow, and a hand edit to it fails that gate.
5. `scripts/check-fabric-drift.ts` lands; `bun run gates` and
   `gates.yml` carry the same single new stage with the same label;
   `gates.sh`/`gates.ps1` are byte-untouched; the battery is green on
   Windows and Linux.
6. `check-fabric-drift.ts --self-test` refutes planted controls (i)
   and (ii) and passes reach control (iii) with its bound stated;
   `negative-controls.yml` runs the self-test + real pair per push.
7. `scripts/plait-bundle/verify.sh` tier 1 passes from a bare
   checkout with only `sha256sum` against a locally assembled dry-run
   bundle; a tampered bundle row fails tier 1; tier 3 on
   `ubuntu-latest` (dry run via `workflow_dispatch`) matches the
   committed corpus byte-for-byte; the workflow's tag trigger is
   demonstrated by the dry run only — no tag is minted (ruled
   cadence, decision 6).
8. No VERIFICATION.md edit; no branch-protection edit; no new
   dependency (bun + git + sha256sum only — nothing enters any
   manifest).

## Blockers and cross-slice writes

None at dispatch: both wave-1 PRs are merged. Cross-slice writes,
named: decision 3's manifest emission touches `verify/fabric`'s gate
flow, and brief 34 amends `verify/fabric/run.sh` independently (items
19's two amendments) — branches stay separate, the coordinator
sequences the merge, and whichever lands second rebases and reports;
the two changes are additive and disjoint in function, and neither
touches the emitter or the corpus bytes. `packages/plait/fixtures/`
gains one file (the manifest); E4/E5 branches add fixture files of
their own — additive, no shared rows.

## Non-goals

No change to the required battery's membership beyond the one tripwire
stage; no Lean toolchain in `gates.yml`; no branch-protection edit
(operator act; ratified item 16 records the revisit trigger); the two
`run.sh` amendments (divergent-row naming; `--self-test`) — brief
34's; the L0→L2 package wall and `plait attest` — E4's; `verify/
fabric-veil` CI — E5's per the mid-flight ruling; REF-program
artifacts (the wasm kernel's regeneration CI is REF-6's); no
dependency bots, no auto-bump of elan/toolchain — pins are law;
re-pinning is a deliberate hand move with the gates re-run; no
VERIFICATION.md edits; no tag minted.

## Closing report extra

The measured before/after job numbers (lean-gates wall time with the
additions; the tripwire stage's battery cost), the recorded toolchain
lines as they appear in a live log, the dry-run bundle transcript
(tier 1 pass, tampered-row fail, tier 3 byte-diff pass), and — per the
ledger law — either the statement that no claim surface moved, or the
proposed row text for the coordinator. State plainly, for the
operator, what each of the two layers proves and does not prove: the
tripwire pins the tree to its recorded baseline everywhere the battery
runs; only the Lean gate's fresh execution catches a forged baseline.

Seats: Eng builds on `agent/<seat>/<ISSUE>` — the coordinator
substitutes the literal branch name in the issue body at dispatch and
deletes any abandoned-run branch first (retro Q5). Rev reviews the PR
head; if the head differs from the ref named in the charge, review the
head, say so, and state whether the difference is material (retro Q4).
Coordinator merges. DECISIONS log per house rule.
