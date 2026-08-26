# RULINGS — the entity-store program's ruling record

Status: minted 2026-08-25 by wave-3 docket ruling W3-1 (operator, in-session); registry
row in [PROCEDURE.md](PROCEDURE.md) §7. From this date, every dated ruling, amendment
narrative, and falsification record lands here. Prior rulings remain in their historical
homes (STORE-MODEL §7, KICKOFF §15/§18, STORE-SHELL §8) until migration step 5 moves
them here with stable pointers left behind (ruling W3-6); until that move, those homes
remain citable for their existing entries and this file is the sole home for new ones.

Entry discipline: append-only; an entry is immutable once committed; supersession is a
new entry citing the old. Every entry cites its evidence (F-numbers, reports, receipts)
and names its implementation window where one is owed.

---

## W3 — the wave-3 docket (2026-08-25, operator: "Agree with the recommendations")

Evidence base: the six reader reports, `SYNTHESIS.md`, `DOMAIN-LAYOUT.md` (D1–D6), and
`DOCKET.md` in `.staging/scouts/2026-08-25-wave3-design/`; the wave-2 register and
triage (`audit/`). All twenty-two ruled items were ruled as recommended; Block V
(W3-23…25) was authorized for immediate dispatch.

### Layout (D1–D6)

- **W3-1 — ruling authority.** Option (a): this file is the sole ruling authority from
  today. Registry rows adopted as drafted (see the PROCEDURE §7 amendment landing with
  this entry). CONTEXT.md row adopted; the document itself ratifies later by
  domain-modeling + grilling (W3-6 step 2).
- **W3-2 — the two interfaces.** Model: `Reachable` (legality construction) beside
  `Admissible` (what verification establishes), bridge = M19, stated-unproved. Shell:
  `runVerb` decision module + persistence seam; error ownership three-way (legality /
  observable rejection / verdict-vs-environment).
- **W3-3 — `Admissible` ownership.** `E2/Admission` owns the judgment,
  `admissibleReport`, carrier-level verdicts, and `ObligationM19_transport`;
  `E2/Graph` exposes graph analysis and its theorems only; `wfsB`, `wfvB`,
  `canonicalSpellingB`, `usesBinderB`, `litNarrowB`, `refsAt`, `topoOrder` internal.
- **W3-4 — status generation.** Promise prose/trace/anti-claim: normative text in
  STORE-MODEL §6. Status: stamped from LEDGER.md by one extractor join at
  `mise run gen`. Interim: hand-flagged banner. No second maintained copy of a promise.
- **W3-5 — naming module.** Extraction deferred; W3-14 rules the relation and plane
  first; extraction only on shown independent callers, change pressure, or adapters.
- **W3-6 — migration order.** (1) rule (done, this entry) → (2) ratify CONTEXT.md +
  CONTEXT-MAP + registry → (3) semantic repairs (windows A, B; seats) → (4) ledger
  generator + the W3-4 join → (5) one editorial window reorganizes STORE-MODEL and
  STORE-SHELL on generated statuses and moves history here → (6) retire the
  organization review and the wave-3 staging packet into the audit series.

### Typing plane (family 1)

- **W3-7 — M17 route = (i-a).** `Reachable.putS` premise becomes `WFS (canonS s)`;
  `putE` premises become `Conforms env (canonS s) (canonV v)` and
  `dupFreeV (canonV v)`. B4 is retired (B1–B3 remain as the canon-preservation lemmas
  the amendment consumes). M17′ (resolver coherence) is stated as owed in the same
  amendment. Window B. Evidence: R-D §3.1; F-25.
- **W3-8 — §5's `s` is the resolved schema.** The schema half of W3-7 is therefore an
  F-22-class transcription correction, not a semantic amendment. F-46 minted.
- **W3-9 — the A-3 record reverses.** Value-plane duplicate-freedom becomes `Reachable`
  premises (the `dupFreeV` clause of W3-7 plus the F-26 clause of W3-10). Evidence:
  R-D §6.2's four post-dating items; F-28. The A-3 record's parenthetical ("no host
  counterpart") is refuted by model-internal construction (kernel receipts E5/F2).
- **W3-10 — F-26 ships with A-6.** `dupFreeS (.lit v) := dupFreeV v` lands together
  with A-6's `canonS`-into-`lit` recursion, in window A (equation changes), before
  window B, before the M17 seat. Evidence: R1 `A6_refalsifies_S1`; R-D §8.
- **W3-11 — Q12 posture (a).** M17 carries the anti-claim ("typed reachability up to
  union-mode blindness"; full drafted text in R-D §7.1); STORE-MODEL §6's coupling
  table gains an Anti-claim column. Posture (b) rejected (strict positivity);
  `anyOfOnly` rejected (would REJECT-v1 a construct MAPPING row 26 admits). F-36
  resolved by naming the price, not paying it.

### Boundary (family 2) and canon

- **W3-12 — the family-2 package is adopted whole** (R-C, twelve text changes;
  SH5′ items excepted per W3-21): `wfsB` + `wfsB_iff` minted (home per W3-3);
  boundary PUT and scan call the well-formedness decision; Kahn's decides acyclicity
  and emits the order (an `order` verb plus a per-node cycle violation line); SH5
  narrows to **`Admissible`, never `Reachable`**; `ObligationM19_transport` is the
  named bridge. Implementation seats owed; the spec text lands now with seat-owed
  markers. R-15c rider adopted (store directories are git-transported, never
  git-managed; `.gitattributes * -text` under any store root; written by `init` — seat
  owed).
- **W3-13 — check ordering.** Well-formedness precedes canonicity on **both** PUT and
  scan (aligned on the PUT order). Basis: `ObligationCanonIdempotent` is conditional
  on `dupFreeS`; the byte-compare's verdict is meaningless outside that hypothesis
  (F-40/F-41's mechanism).
- **W3-14 — names.** Minted rule: *no host string relation — order or equality — is
  ever load-bearing for an observable, on any plane.* The model's `String` keys are
  authoritative. Disk form: **option 2** — `names/<lowercase hex of UTF-8 of the
  name>`, with a 64-character name-length cap (MAX_PATH parity) and a names listing
  verb (inspectability). Resolves F-39; seat owed.
- **W3-15 — F-42.** `System.FilePath.symlinkMetadata` admitted to the SHELL-v0
  whitelist for one purpose (entries read only when regular files); typed `StoreFault`
  with renders derived from constructor + path only (never libuv text); the three-way
  exit contract (0 clean / 1 violations / 2 environment) made reachable; **G-S5** gate
  leg forbids `IO.FS.Metadata.accessed`/`modified` in the used-constant set. Seat owed.
- **W3-16 — downgrade posture.** An enacted boundary check may be weakened only by a
  ruled amendment citing an F-number — never inside a seat, never to un-break a
  consumer. (Unison precedent: R-A U-6.)
- **W3-17 — the spelling rule.** Option (b): `canonicalSpellingB` as `WFS` conjuncts —
  the R-B §5.2 clause table, including `usesBinderB` (binder-free `mu` inadmissible;
  kills the unbounded family; G3 untouched). `canonS` stays constructor-preserving
  **permanently**. Union-member dedup is mode-gated (F-50). The rule's completeness
  carries an unchecked-claim marker (no finite syntactic clause reaches the
  uninhabited generalisation). Carrier narrowing reserved for the R-2 window. Window B.
- **W3-18 — F-35.** `litNarrowB` (MAPPING admission rule 1 made decidable) becomes a
  `WFS` conjunct in the same window. Fourth model-accepts/boundary-rejects instance
  closed at the model.
- **W3-19 — the comparison flip.** `insertField`'s tie handling flips so `canonFields`
  is a stable, idempotent sort (R-E P10/P11). Sequenced **after** the boundary
  well-formedness check is live (alone it widens F-40). Retires the F-12 involution
  class at the root; the S1 obligations return to unconditional form.

### Instruments, amortization, pins

- **W3-20 — harness.** The `(place …)` below-the-boundary primitive family is adopted
  (model side gains real stray lists); the assert-today's-defect scripts are committed
  now and flipped at amendment — the flip is the amendment record (PROCEDURE §5
  ratchet).
- **W3-21 — SH5′ deferred to a measurement**, taken after W3-25's fix lands.
  M-INV-1…4 adopted now as the frame it will be ruled under; script
  `28-manifest-lying` is the acceptance test. No §8 row until the measurement exists.
- **W3-22 — pins.** Five statements pinned as proposed: M19 re-based on `Admissible`;
  M10 with address-node vocabulary + `ObligationM10_rank`; M11-commutation up to
  find-extensionality with `reachable_keys_nodup`; `version_byte_separates`; the
  intra-kind faithfulness honest form ("injective except on the characterised set" —
  F-34's families are the characterisation).

### Block V (authorized dispatches, no ruling content)

- **W3-23** — R-15c rider's `.gitattributes` discipline (text in W3-12; `init`
  behavior in the shell seat).
- **W3-24** — F-45 count corrected ("nine" → ten) in both homes.
- **W3-25** — the Θ(n²) `List.drop` in the fips202 absorb fold removed,
  representation-preserving; bridge + KATs must rebuild green (F-47).

---

## CV-1 — the Effect-native monorepo and the conformance ratchet (2026-08-25, operator, in-session)

The production implementation lives in a **separate Effect-native monorepo** whose domain
model is expressed as Effect Schemas. Truth splits by kind and neither side redefines the
other: **semantic truth stays estate-minted** (the theorems, the glossary, this record,
MAPPING — one mint), **production truth lives in the monorepo** (what the running system
does, its CI, its releases).

The cross-repo seam is the **versioned conformance bundle**, exported by the estate and
consumed by the monorepo as a pinned dependency (C6 in reverse — commit SHA + bundle
digest; the estate never reaches into the monorepo; drift is a failing byte-compare):
golden vectors (fixture carriers → pre-image bytes → addresses), the wire-format
specification, the script corpus, and the theorem-contract table extracted from
LEDGER.md.

Progression is **ratchet-like gated iteration**: the cutover decomposes into stations;
a station lands in the monorepo only when its slice of the bundle passes in the
monorepo's own CI; a green station never regresses (the §5 monotonicity invariant,
extended across repos); the conformance suite reports the first red station — each run
names the next step. The generation lane runs one-inventory-two-targets: the committed
inventory generates the Lean carrier here and the TS codec tables there, each checked by
regenerate-and-diff in its own repo.

Terms minted with this ruling (entries in [CONTEXT.md](CONTEXT.md)): **oracle**,
**conformance bundle**, **station**. Evidence lineage: the wave-3 packet (D1–D6), the
in-session design dialogue of 2026-08-25, and the ledger landing (`f32330c`…`6b25d5b`)
that makes the bundle's theorem-contract table extractable rather than hand-written.

## CV-2 — the test-capability ruling: no spawn class; transcripts are the rendezvous (2026-08-25, operator, in-session)

One ruling closes the three items waiting on a harness capability class. **No
process-spawn capability is admitted.** (1) **F-52 resolves as accepted residue**: the
symlink/FIFO hazard legs stay hand-exercised (transcripts in the F-42 seat report),
re-verified at the dual-host exercise; the protection itself is negatively validated.
(2) **The third runner needs no spawn**: under CV-1 the monorepo's runner executes the
bundle's script corpus in its own repo and byte-compares its transcripts against the
committed golden transcripts — the transcripts are the cross-repo rendezvous; C-1's
deepening therefore unifies the two in-process runners only. (3) **F-53's refusal fix**
needs only the already-whitelisted `pathExists`: the harness exits 2 on a non-empty
workdir. Evidence: C-2's landing (`2ae212c`…`250b895`), R-G C-1/C-2, the F-42 seat's
hand-verification transcripts.

## CV-3 — the entity store retires to experimental grade (2026-08-26, operator, in-session)

`formal/entity-store` moves to **`experiments/entity-store-model`** — a declared
grade transformation, not a loss of anything kernel-checked. What changes is the claim
posture: the **machine algebra** (MACHINE-ALGEBRA, staged) becomes the formal lane's
object once grilled, and the entity store is re-scoped as **Machine(K)'s experimental
dogfooding instance** (CV-1's frame made directory-literal). Unchanged: every proof,
gate, axiom report, and LEDGER row — the extraction, the harness, the vectors, and
`mise run check` all follow the new home mechanically; `formal/fips202` stays promoted
(the digest's grade is untouched). Historical documents keep their `formal/entity-store`
references as history; only live surfaces (lakefiles, mise, the extractor, generated
banners) moved. Machine-algebra slices land in `formal/` only after the draft grills
(C4) — the freed lane is not pre-occupied.

## R-1 — the Entity Store context ratified (2026-08-25, operator, in-session)

`CONTEXT.md` ratified as recommended, discharging R-1 and completing W3-6 step 2: the
context is named **Entity Store**, home `docs/entity-store/`; the Lean namespace stays
**`E2`** as the context's code label — no rename, no serialization window spent. The
four wave-3 terms and seven rules minted as drafted, avoid-lists included;
`address-commits-to-encoding` promoted from anatomy prose to a minted rule. CONTEXT-MAP
row and relationships added; the PROCEDURE §7 registry row is live. Window B is
unblocked (its other precondition, window A, merged the same day — A-6 + F-26 at
`b44b9c6`, adjudicated with all ten differential scripts green on the merged tree).
