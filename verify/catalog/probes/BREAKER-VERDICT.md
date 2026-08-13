# BREAKER verdict — the catalog model gate

Adversarial red-team pass over the R2/R3/R4 catalog + ingress claims,
2026-08-13. Toolchain provisioned exactly as `run.sh` does (Temurin
21.0.2 via `mise`, `tla2tools.jar` sha256 `ab323b79…46c05f`, TLC
`2026.08.11.125311`); Apalache side audited against PROVER's recorded
jar sha `33611081…d4346`. Every claim below has verbatim TLC/Apalache
output under `_runlogs/`; every artefact is a probe under this directory,
and **no ratified spec, config, or evidence file was edited.**

## The refutation surface attacked

1. **Vacuity** — do all action disjuncts fire, and is any invariant
   clause vacuously true at the gate bounds?
2. **Bounds** — does anything break one dimension past the gate
   (daemons, creators, data cap, values)?
3. **Refinement** — can a `WireSpec` behaviour escape the
   `AtomicRefinement` bridge, or is the bridge check itself hollow?
4. **Induction** — is there a state satisfying `IndInv` whose one-step
   successor violates a claimed invariant (a counterexample-to-induction)?
5. **Audit** — do the other teams' recorded runs reproduce, and are
   their configs free of silent weakening?

## What came back clean, and at what bounds

| Attack | Result | Bound / depth |
|---|---|---|
| cap2 cross-version canary | reproduced **exactly**, 119,145 / 18,295 / depth 16 | ratified cap2, to closure |
| Vacuity of cap2 invariants | no clause quantifies over an empty set; `CreateFinish` stale-CAS conflict fires 14,736× | ratified cap2, to closure |
| Third concurrent CAS racer | clean, 1,267,549 / 161,231 / depth 17 | cap2 + 1 creator, **to closure** |
| CTI — mirror-past-origin family | excluded by `IndInv` (= ¬`LagIsAbsenceNeverWrongData`) | 1,093,248 typed states |
| CTI — creator-`exp`-overrun family | excluded by `IndInv` (= ¬`TypeOK` exp bound) | 113,400 typed states |
| Consecution + action safety, independent TLC replication | clean, **no CTI** | 39,897 `IndInv` states, 1 step, 2 creators |
| One dimension past the **gate** | clean **prefixes** (no closure in budget): +daemon d11, +creator d11, +datacap d15, +values d14 | depth-bounded only |
| PROVER audit | `@type`-only diff (0 non-comment lines), canary + jar shas + one obligation all reproduce | — |
| HARDENER audit | only `run.sh` differs (portable sha256 helper); no bound lowered, no invariant dropped, no control unwired | — |

The bounded results are recorded honestly as *clean at these bounds, at
this depth, at this wall-clock* — never as proof. The gate certifies
only its bounds; so does everything above.

## What did not come back clean

**Two findings, one observation** — all proof-mechanics, none a
violation of a ratified law at the ratified bounds.

- **`FINDING-BRIDGE-001`** — half of `AtomicRefinement` is asserted, not
  checked. `[][CreateAtomicRefinesSplit]_vars` cannot constrain
  `CreateAtomic`'s resolving branch, because that branch **is**
  `UNCHANGED vars` and the subscript discharges it. A knowingly-false
  obligation on that branch survives the whole closure (W1), with a
  positive control (W2) and reachability witness (W3) proving the probe
  has teeth. The same mechanism exempts `Publish`'s refusal branch from
  both action properties. Diagnosis: wrong shape, not a TLC defect —
  TLA+ formulas must be stuttering-insensitive. A tested state-invariant
  reformulation (`X1` clean, `X2` catching the defect class at depth 2;
  `X3`/`X4`/`X5` for the refusal case) is included. The R4 Go oracle
  does **not** share the blind spot — it compares absolute states in
  lockstep (verified by reading `driver.go`, not by running it).

- **`FINDING-BOUNDS-001`** — the constant domains are built from a
  literal `1..4`, so any config value above 4 silently truncates to 4,
  while `CatalogNaturallyBounded` is stated against the constant
  `NumVals` rather than `Cardinality(Vals)` — so raising a bound past 4
  both fails to widen the model and loosens the one invariant meant to
  catch it. Byte-identical closures at 4 vs 9 values, and at 4 vs 9
  daemons, prove it. Remedy: `Cardinality(Vals)` (semantic) +
  `ASSUME NumX \in 1..4` (guard). Passed to HARDENER as their rationale.

- **`OBSERVATION-STRONGER-ADMISSION`** — the model already satisfies a
  law strictly stronger than `NoAdmissionOnFaith` (every admitted frame
  stays resolvable *at its own daemon*). Not a hole: `MirrorReset` is
  gated off in every ratified config. Raised as an ownership question —
  whether it should be ratified, given real replicas may resync-on-gap —
  with the note that it is an unusually cheap conformance target
  (a single-daemon state predicate, no interposition seam).

## Residual risk, one honest sentence

Within the ratified bounds the safety laws survived every attack I
mounted — exhaustive vacuity and CTI checks, independent-tool
corroboration of the induction step, and clean probes one dimension out
— so the residual risk is not in what the model proves but in what the
gate *checks it with*: one half of the refinement bridge and the
ingress-refusal law are asserted rather than machine-checked
(`FINDING-BRIDGE-001`), and the bound constants can silently under-run a
future larger claim (`FINDING-BOUNDS-001`) — both fixable, neither a
live violation today.
