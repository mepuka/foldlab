# Spike memo — columnar layout algebra as a UI projection, with security as a first-class dimension

2026-08-18 · spike seat · deliverables: `columnar.html` (self-contained, opens from disk) + this memo.
Status: exploratory, ungated, nothing committed. All cryptography on the page is **simulated**
(FNV-1a toy hashes, rendered seal states, no key material anywhere); what is exercised is the
algebra — which view operations commute with which security choices — not any cipher.

Data is real where it can be: the 16-row taught-refusal table and the nine example sentences are
carried verbatim from `foldlab-kernel-model/verify/kernel/projections/kernel.ts`; the 20-row
positioned-provision log is synthetic and labeled so. This page is hand-derived — exactly the
drift class the estate refuses — and says so in its footer; §"served equals derived" below is the
repair.

## What the columnar algebra bought, concretely

- **One engine, three views, zero per-view rendering code.** Because every UI operation is a
  combinator (transpose, filter, sort, group-by, run-length spans, per-column stats), the whole
  page is one generic pipeline — `filter → sort(+identity tie-break) → group → stats → rle` —
  plus three *column declaration lists*. The declarations are data. That is the projection claim
  in miniature: the view layer has almost no code that is "about" any particular view.
- **Provenance fell out for free.** Every card renders a live derivation line
  (`group(h) · sort(position ↑, admission tie-break) · filter(v~"grant") @ anchor → n rows`) and a
  view digest = hash(anchor + derivation + per-column source digests). "Views are citable facts,
  not live dashboards" became a literal UI feature: cite the chip and the view is reproducible.
  The anchor header ("at anchor (floor 18, head 20) — never wrong later, only earlier") is the
  fold contract worn on the surface.
- **The anchor distinction did real work.** The refusal table needed *no* anchor — it is a
  `resolve` of an immutable declaration, and the page renders that as "anchor-free by law"
  (the `anchored-resolve` refusal is the fence). The roster and the log are `fold`s and carry
  coordinates. A UI that renders both honestly teaches the resolve/fold split without prose.
- **Per-group, per-column statistics are Parquet row-group statistics wearing rung badges.**
  Group the refusal table by applicability and each group carries `count ⊕` (commutative monoid —
  needs exactly-once delivery) and `distinct ∨` (semilattice — immune to duplication and
  reorder). The badge is the delivery contract, displayed. Aggregates appear *only* at their
  lawful rung; nothing else is offered.
- **RLE spans are earned by sorting, and they teach.** Sort the 16 refusals by applicability and
  the column collapses to two spans (advisory ×12, machine-applicable ×4). Seal metadata
  (scheme, key_ref) is family-constant, so it collapses to a single ×20 cell — visual proof that
  security is a property of the column family, not of the row (Parquet stores it once in the
  footer for the same reason).

## What the security algebra bought, concretely

- **Deterministic (convergent) sealing is the naming-preserving map, and the page makes that
  visual.** Ciphertext = function(value, scope secret), so: 20 rows seal to 9 blob names, equal
  values share a digest (linked `≡×3 → 1 blob` chips), and clicking *re-seal* is a no-op.
  Flip to random IVs and all four properties break on screen: 20 blobs for 9 values, every chip
  `unshared`, re-seal churns every digest (including each *column's* source digest — naming
  fractures at the column level too), and the lying-placement row loses its repair path.
- **The honest caveat is stated where the benefit is shown.** Convergence leaks equality within
  its scope (confirmation attacks); the dedup chip's own tooltip says so, bounded by the scope
  secret, with Tahoe-LAFS cited as the prior art. Benefit and cost are one fact — see
  observation 2.
- **Two-level verify-on-read renders as two honest states.** Key held: decrypt, re-derive the
  declared plaintext digest → "✓ plaintext verified." Key not held: re-derive the declared
  ciphertext digest → "◆ ciphertext verified only." Both are green-path states; the UI never
  pretends the second is the first.
- **Redacted ≠ absent ≠ empty — three states, three renderings.** A redaction chip is access
  withheld over *verified* ciphertext (the narrow writ sees `▮▮ ct:57c2…`, never a blank).
  "✗ absent" is a fetch that failed verify-on-read (row p13, whose placement lies). An empty cell
  would be no provision at all. Absence of access is visible; absence of data is different; the
  UI launders neither into the other.
- **Keys stay outside meaning.** Key *references* (`key:family-values@v3`,
  `keyref:vault/ops-api@v9`) are ordinary column data; key *material* appears nowhere — and the
  credential-band hole yields a reference even when fully decrypted (`secret-carrier` is the
  refusal that fences the alternative).
- **Per-column-family keys, shown not narrated.** Three families, three key references:
  fam-values (held by the operator writ), fam-attrib (held by neither demo writ — providers
  render as countable, unnamed equality classes), fam-storage (sealable, left unsealed). The writ
  toggle flips which columns decrypt; nothing else on the page changes — security is orthogonal
  to the view algebra, which is the point.

## What neither bought (honest)

- **No confidentiality was tested.** The crypto is simulated; the equality-leak severity under a
  real convergent scheme, real block sizes, and a real adversary is **untested** here.
- **"Never wrong later" needs a "there is a later" signal.** An anchored view is honest but can
  be *early*; the spike has no freshness affordance (the natural one is a `head-advanced-past`
  trigger re-running the fold — not built).
- **The algebra does not pick the layout.** Column order, wrapping, which family is
  default-visible, chip density — taste, not law. The combinators constrain *semantics*, and the
  page still needed ordinary design judgment everywhere else.
- **No write path.** Authoring stays linear (KM-13/KM-18 posture); every control here is a READ
  projection. Nothing in the spike says how an edit flows back, and it deliberately doesn't try.
- **No scale claim.** 20 rows prove semantics, not performance; the RLE here is presentational,
  not a storage-format claim.
- **The writ toggle simulates key possession only** — no meet computation, no attenuation chain;
  writ semantics are impersonated by a boolean.

## The three sharpest design observations

1. **AEAD dot-binding and convergent dedup are in direct tension, and the resolution is the
   estate's own two-plane split.** If the dot coordinate (lane, shard, position) enters the
   ciphertext as AEAD associated data, the sealed artifact varies per dot — fracturing dedup
   exactly like a random IV. (For GCM the ciphertext body would still match and only the tag
   differs; for SIV modes the whole ciphertext differs; either way the stored artifact no longer
   dedups byte-identical. Untested against real implementations; holds by construction for any
   AEAD whose output depends on AD.) So the blob must stay dot-free (convergent, shareable), and
   the dot-binding must ride the *reference*: a MAC over (lane, shard, position,
   ciphertext_digest) carried in the journal row. Content integrity rides the digest; placement
   integrity rides the reference; the two planes stay separately verifiable. Parquet's
   per-module AAD works only because Parquet never dedups across files — the moment
   cross-reference dedup matters, AAD has to move out of the blob. This fell out of *building*
   the demo, not out of the reading list.

2. **Structure-preserving redaction: the audit walk runs without any key — because of the
   equality leak.** Under the narrow writ, group-by over the sealed value column keys on
   ciphertext digests, and with convergent sealing that yields the *same partition* as plaintext
   grouping (9 groups either way; flip to random IVs and it shatters into 20 singletons). The
   indexed product commutes with the seal. Counts, dedup classes, the greatest-position read,
   and both integrity badges are all computable from public structure. The capability
   ("auditable while sealed") and the caveat ("equality is visible") are the same fact wearing
   two hats — any ruling that weakens one weakens the other.

3. **The derived column and the lawful aggregate coincide.** Group the provision log by hole and
   read the position column's `∨ max` badge per group: 19, 16, 15, 18, 20, 17 — exactly the six
   `greatest_read` winners. The environment-as-directory read (`greatestAt`, the KM-15 positioned
   reading) *is* a semilattice aggregate, so the "derived column" is not a special feature: it is
   a per-group statistic pinned back onto rows. This suggests derived columns in general should
   be declared as (algebra, rung) pairs and inherit their delivery contract — same machinery,
   no new concept.

## Open questions — grill-ready

- **SK-1 — Is attribution sealable?** Sealing the provider column makes contributions countable
  but unnamed (equality classes). Does any estate law require attribution to be plaintext for
  audit seats, or is ciphertext-class attribution sufficient for every audit the estate actually
  runs?
- **SK-2 — Where does the dot-binding MAC live in the grammar?** Observation 1 puts it in the
  journal row (reference layer), not the blob. Is that a new envelope field (a language-level
  change to a ratified canonical form) or a lane convention (a declared schema for evidence
  bodies)? Who holds the MAC key — is it per-lane, and is verifying it part of verify-on-read?
- **SK-3 — What is the scope of the convergence secret?** Per-estate maximizes dedup and the
  equality-leak surface; per-column-family aligns with key families; per-writ kills cross-seat
  dedup. Each choice trades storage sharing against confirmation-attack surface. Needs a ruling,
  with Tahoe-LAFS's convergence-secret history as the reference reading.
- **SK-4 — Who enforces the rung badge's delivery contract at view-build time?** `count ⊕`
  requires exactly-once. Over an at-least-once lane, does the view *refuse* to offer the count
  column, offer it with a degraded badge, or is the badge purely documentary? (The spike renders
  badges; nothing enforces them.)
- **SK-5 — Should the view digest be admissible?** view = hash(anchor + derivation + column
  digests) is currently derivable-only. Making it a declarable value would let views be resolved,
  pinned, and cited across seats — but mints a new declaration habit. Is a cited view a
  declaration or a convention?
- **SK-6 — Is revealing ciphertext digests the default redaction posture?** Redaction chips show
  `ct:…`, which under convergent sealing reveals equality classes to every viewer. Alternative:
  per-viewer blinding of displayed digests — which breaks cross-view citation. Default, or
  per-family choice?

## Served equals derived — what a real implementation generates this layer from

The spike's engine is already generic; the only hand-written parts are the three *column
declaration lists* (keys, labels, families, rungs, seal families, derived-column formulas) and
the law-strip prose. Those are exactly the parts that must be emitted, not written:

- **Column set and types** ← the declared reduction's output schema (the fold's declared shape).
- **Aggregate offerings and rung badges** ← the algebra catalog (KM-17's rung ladder): a column
  offers an aggregate iff a cataloged algebra at the required rung is declared for it. The badge
  is read off the brand, never asserted by the UI.
- **Derived columns** ← declared (algebra, rung) pairs (observation 3): `greatest_read` is the
  greatest-position algebra applied per group, nothing bespoke.
- **Seal families, key references, held/not-held** ← the column-family key table plus the
  viewer's writ; the redaction rendering is forced by what the writ fails to cover, never chosen
  by the page.
- **Anchor header** ← the fold call's own anchor argument; the view digest ← (anchor, derivation,
  column digests) mechanically.
- **Captions and the law strip** ← the same rule data that generates the prose projection
  (the KM-18 second register): each combinator and each refusal carries its plain-word and
  algebraic sentence in the language declaration, and the UI quotes them. Refusals teach in the
  UI too.

Then this page = `generic_engine(emit(reduction_decl, schema_decl, algebra_decls, writ),
fold_result)`, and the gate byte-compares emitted view configs against committed ones — the
fabric-emitter precedent, closing the KM-13 wall for the visual register. Until that emitter
exists, this page is a reference sketch that generation owes, and divergence from the model is a
defect in the page.
