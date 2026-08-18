# Unity bridge notes: verify/unity, gate-green

Date: 2026-08-18. Branch: agent/kernel-model. Author: Fable (coordinator),
building on a five-architect commission (memos in the main repo under
`scratch/unity-bridge/`, one per lens: instance discharge, translation and
simulation, proof-shape inheritance, adversarial gates, precedent).

## What landed

`verify/unity` — a third Lean package that requires `verify/fabric` and
`verify/kernel` read-only by path and proves the unity claim: the kernel
model is a sound abstraction of the fabric model on a named seam ledger,
witnessed by total translation functions, never by analogy. Both upstream
manifests stay `"packages": []`, both upstream gates are byte-identical
and re-ran green after the bridge landed, and rollback is a directory
deletion.

Verified counts (each from the gate that owns it, all three run this
session): unity 19 theorems / 13 laws / 3 executable controls / 1
must-not-compile refusal, axiom footprint within
{propext, Classical.choice, Quot.sound}; kernel 60 theorems / 18 door
controls / 4 must-not-compile refusals; fabric full roster green with 16
law-dropping controls and 27 byte-identical conformance vectors.

## The unity ledger

Each row is a law in `Unity/Laws.lean` with a proof in
`Unity/Proofs.lean`. Statuses: all thirteen PROVEN; refused seams listed
after the table.

| Row | Law | Content | Status |
|---|---|---|---|
| U1 | UStageErasureRankAgrees | stage erasure preserves epistemic rank | proven |
| U2 | UDerivedOrdersAgree | the two derived join orders are one relation | proven |
| U3 | UAdmissionTransports | admitted program erases to admitted ledger | proven |
| U4 | UPinsTransport | consumption edges erase to pin edges | proven |
| U5 | UProgramWfFromC7 | kernel pin law derived from fabric C7 through the erasure | proven |
| U6 | URankAgrees | admission rank invariant under erasure | proven |
| U7 | UGroundPinInhabited | transported relations inhabited at a committed program | proven |
| U8 | UInterpInflationaryAtCell | kernel growth law discharged at fabric's ground cell | proven |
| U9 | UEvidenceStrictlyGrows | fresh emit strictly grows the cell (membership form) | proven |
| U10 | UWellFencedByConstruction | positioned facts satisfy fabric's well-fenced premise by construction | proven |
| U11 | UGreatestReadIsArbitratedRead | fabric's greatest-token arbitration = kernel's newest-first read | proven |
| U12 | UGreatestReadsAgree | fabric's arbitration = kernel's greatest-position read | proven |
| U13 | UGreatestTieDiverges | at a token tie the two reads disagree (99 vs 10) — the refutation | proven |

U5 is the inheritance claim at its sharpest: `program_wf_from_c7` derives
`Kernel.Laws.KProgramPinWellFounded` from `Fabric.c7_pin_well_founded`
via `Subrelation.wf` over `InvImage` along the node erasure
{name -> work, uses -> pins}. No kernel-side rank lemma appears; the
bridge gate greps for and forbids them.

U10 is the one row where the bridge adds a fact to the estate rather
than checking one: fabric names `SealsWellFenced` as a premise and
discharges it by citation across the toolchain split; the kernel's
positioner PROVES it for every record image of a positioned chain.

U13 is the falsifiability core, doubly enforced: a rostered refutation
(the kernel fold keeps the later arrival at a tie, fabric's arbitrator
the earlier — same fact list, reads 99 and 10) and an executable
control on the same committed row. U11/U12 are stated premise-free
because the positioned construction makes ties impossible; U13 is what
makes that restriction visibly load-bearing rather than convenient.

## Refused and not-claimed seams, with reasons

- `at_most_one_landed_commit` and the register invariants: live in
  `verify/fabric-veil` at a different toolchain pin; the split rules out
  import, so the bridge only venue-checks the citation (see gate).
- Trigger grammar transport: kernel patterns are single values, fabric
  patterns are observation lists, and the kernel carries no trigger
  denotation — a transport would have to invent semantics. Refused;
  candidate for a declared pattern-denotation map later.
- World ≅ FabricState as a composite: the kernel's world deliberately
  thins fabric's state (one evidence carrier for the plane; catalog has
  no fabric component). Stated per-hypothesis instead (U8), never as an
  isomorphism.
- Replay composition (the stated-only kernel law): fenced. The kernel
  gate's fence cannot see a third package, so the bridge gate re-erects
  it over its own sources, including the composed-execution vocabulary.
- Landed-set dedup seam: transportable but insensitive to the dedup —
  honestly weak, skipped rather than decorated.
- Attribution: `recordOf` invents a constant holder because arbitration
  is holder-blind on both sides; real attribution semantics are not
  claimed anywhere in the bridge.
- No runtime claims, no liveness, nothing above Type 0.

## The bridge gate (verify/unity/run.sh)

Beyond the house machinery (hygiene at the kernel's word list,
partition, law roster, theorem roster + axiom footprint, controls with
byte-pinned traces and orphan checks, must-not-compile with witness
twins): toolchain unanimity across the three packages; the bridge
manifest must name exactly fabric and kernel by path with no git
dependencies; both upstream manifests asserted zero-dependency from the
dependent side; no reverse mention of the bridge in either upstream
gate; upstream trees byte-identical under git diff; the replay fence
re-erected; the independent-derivation check (kernel pin-proof names
forbidden); the ground-carrier pin (GroundEvidence required in the laws,
numeral carriers forbidden); and the citation ledger — the eight law
names the kernel's taught table cites, extracted from kernel source,
diffed against committed `citations.txt`, each fabric row resolved into
fabric's roster and the one veil row asserted absent from it. This
closes the citation-drift bound the kernel notes recorded.

## Controls

- `tie-orientation`: the committed tie row read by both models — kernel
  99, fabric 10, refuted. A translation that flipped orientation or tie
  sense to force agreement would flip this line to survived.
- `ascending-positions`: the lawful positioner reads the newest binding
  (10) while the reversed positioner visibly reads the stale one (20).
- `broken-erasure-pins`: the uses-dropping erasure loses the ground pin
  edge the lawful erasure carries — the degenerate-translation channel.
- `cross-model-stage` (must-not-compile): a kernel stage where a fabric
  stage belongs is refused by the elaborator; the witness twin crosses
  through the named erasure.

## Corrections to the record found on the way

- The commission briefed fabric at "~200 theorems"; fabric's roster is
  206 public plus one pinned private (architect count, three independent
  verifications; consistent with fabric's gate).
- The kernel notes' own §1 headline (50 theorems / 8 laws / 17 controls)
  is stale against the kernel gate (60 / 12 / 18); the architects also
  report a §4-vs-§9 mismatch on the Unlawful constructor count and a
  stale "seventeen" in the kernel README. Small doc repairs, flagged
  here, not made silently.
- The commission described the abstract hypotheses as "associative +
  idempotent"; the kernel's law takes exactly those two, but the
  abstract-world section prose says "any ACI merge". Both are defensible
  (fabric over-discharges either way) — one prose fix wanted.
- `Cell.merge` does not ride mergeSort; the sort appears only in the
  query and candidate listings. The mergeSort-opacity texture is real
  but was mis-attributed to the merge in the briefing (and in this
  coordinator's early summary).

## KB grill list

- KB-1 (scope): ratify the thirteen-row ledger as the unity claim —
  sound abstraction on named seams, with the refusals above as
  permanent non-claims. Amendments are new rows, not silent edits.
- KB-2 (topology): ratify the first local cross-package require under
  verify/ — third package, read-only paths, upstream gates untouched —
  including the accepted build-directory reuse of the upstream .lake
  trees.
- KB-3 (tie ruling): confirm premise-free-by-construction as the house
  form for greatest-wins bridge statements, with the rostered
  refutation (U13) mandatory wherever a uniqueness premise is replaced
  by a construction.
- KB-4 (fence): the kernel gate's replay fence covers two kernel files;
  any package importing the kernel's laws sits outside it. The bridge
  re-erects the fence for itself — rule whether the kernel gate should
  also assert repo-level coverage (an upstream edit, so it needs its
  own ruling).
- KB-5 (anti-vacuity standard): carrier pin by gate check plus
  membership-form laws plus inhabitation witnesses. Residual: the
  bridge is holder-quantified but Nat-scoped, weaker than fabric's
  polymorphic cell — accept or extend.
- KB-6 (invented holder): `recordOf` fixes holder zero; arbitration is
  holder-blind by law. Confirm this reading, or require the holder be
  threaded.
- KB-7 (citation governance): `citations.txt` now pins the kernel's
  taught-table citations mechanically; define the rename protocol (a
  fabric rename must land with the ledger update in one commit).
- KB-8 (record repairs): the stale kernel-notes counts and README
  wording above — repair upstream docs on this branch or after merge.
- KB-9 (prose): the "any ACI merge" section header vs the two-
  hypothesis law — align one to the other.
- KB-10 (deferred seams): the emit-run square (kernel gains fabric's
  trace-invariance through a run-level equation) was proposed by the
  translation architect and deliberately not built — it walks the edge
  of the replay fence; take it only under a ruling.
- KB-11 (proportionality): three controls and one refusal guard
  nineteen theorems; decide whether the control surface should grow
  with the ledger.
- KB-12 (parity driver): staged mechanical parity between the models —
  specified separately in
  `docs/design/2026-08-18-fabric-kernel-parity-driver.md`; ratify
  stages before any build.

## Fleet record

Five opus-max architects ran in parallel against the worktree at
d9a13b67f (read-only), one lens each, no coordination; all five
delivered memos and structured digests. Convergences taken into the
build: the third-package topology (unanimous), discharge at fabric's
shipped ground cell rather than any numeral (unanimous), the
greatest-read tie divergence (found independently by all five, now U13
plus a control), the citation ledger as a gate check (four of five),
and the C7 transport as the first theorem (three of five; the other
two's inflation-discharge pick landed in the same package). Divergences
resolved by the builder: package name (unity over bridge, 3-2),
premise-free greatest-wins statements over premise-carrying ones (the
translation architect's ruling, backed by fabric's own premise-free
characterization precedent), and upstream gates asserted rather than
re-run inside the bridge gate (keeps failure attribution
one-directional).
