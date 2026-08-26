/-
Pin seat — intra-kind faithfulness in its HONEST FORM (ruling W3-22, pin 4).

THE GAP THIS CLOSES (U-9). Kind separation is proved: `kind_separation` at the pre-image
level, M7's easy half. What the M1–M19 ledger has never said is the hard half — that
distinct carriers take distinct addresses WITHIN kind S. U-9 reads the same gap in
Unison's tree and quotes S3's prediction of the shape the true statement takes: the
honest theorem is injectivity *except on a characterised set*, and characterising that
set is itself the result. F-34 supplied the characterisation — at least ten spelling
families, one of them unbounded (`.mu d X` for binder-free `X`, one address per
discriminator string, all denoting `X`).

WHY THE STATEMENT IS CLEAN RATHER THAN CARVED-OUT. W3-17 put those families OUTSIDE
`WFS`: `canonicalSpellingB` rejects every one of the ten by clause, and `usesBinderB 0 b`
kills the unbounded family at the root. So on the admissible set the exception set is
empty, and the statement needs no carve-out list — the carve-out is `WFS` itself. That is
the whole design payoff of W3-17 and it has not been stated anywhere until now.

THE THREE ANTI-CLAIMS, which are the honest part.

1. This is CARRIER injectivity, not SOURCE-CONSTRUCT injectivity. It says two admissible
   carriers with one address are the same carrier. It does NOT say two source constructs
   with one address are the same construct, and it cannot: the estate has no formal
   source-side equivalence (the source is TypeScript) and `Conforms` is the wrong
   yardstick for it — rule `source-construct-yardstick`. `canonicalSpellingB`'s own
   header carries the permanent marker that no finite syntactic clause reaches the
   uninhabited generalisation (F-34, W3-17). Nothing here retires that marker.
2. `hInj` is a HYPOTHESIS, never an axiom (M6's discipline). `formal/fips202` states
   plainly that the digest is not injective — false by counting — and that collision
   resistance is assumed, never proved. Every statement quantified over `hInj` is
   therefore conditional, and this one says so in its binder.
3. SCHEMA PLANE ONLY. The entity twin (`preimageE`, `canonV`, `dupFreeV`) is not pinned
   here: its admissible set is `wfvB`, not `WFS`, and W3-22 licensed the schema form.
   The `encValue_inj` half it would need is already proved (`E2/Faithful.lean`).

Route note: `ObligationDirectionB` (M6) is STATED-ONLY in `E2/Obligations.lean` — no seat
has proved it — so this derives directly from `hInj` on `addressS` plus `encSchema_inj`,
exactly as the dispatch anticipated. It does not claim M6.
-/
import E2.Faithful

namespace E2

/-- Intra-kind faithfulness, honest form: on the ADMISSIBLE, ALREADY-CANONICAL carriers,
    and under the named injectivity hypothesis, equal addresses imply equal carriers.

    Read the four carrier hypotheses as the characterisation, not as decoration: `WFS`
    is what excludes F-34's ten spelling families (W3-17's `canonicalSpellingB` and
    `litNarrowB` clauses), and `canonS s = s` is what excludes the field-order family
    that `canonS` alone would have to absorb. Together they name the set on which the
    map from carrier to address is injective — "injective except on the characterised
    set", with the set characterised. -/
def ObligationIntraKindFaithful : Prop :=
  ∀ H : Bytes → Address, (∀ b₁ b₂, H b₁ = H b₂ → b₁ = b₂) →
    ∀ s₁ s₂ : SchemaCore,
      WFS s₁ → canonS s₁ = s₁ →
      WFS s₂ → canonS s₂ = s₂ →
      addressS H s₁ = addressS H s₂ → s₁ = s₂

/-- PROVED. Three steps: `hInj` peels the digest off `addressS`, cons-injectivity peels
    the version and kind bytes off the pre-image, `encSchema_inj` (M4a's corollary,
    proved in `E2/Faithful.lean`) peels the encoding, and canon-fixedness closes.

    WHAT THE PROOF DOES NOT USE, recorded rather than hidden: the two `WFS` hypotheses
    are not consumed. That is the point of the statement, not a defect in it — the
    content of the pin is WHICH SET is quantified over, and `WFS` is what makes that set
    the admissible one. On the full carrier the same argument would go through and would
    say nothing about spelling families, because carrier equality is not construct
    equality (anti-claim 1). Deleting the hypotheses would give a formally stronger
    theorem that answers a different question. -/
theorem intraKindFaithful : ObligationIntraKindFaithful := by
  unfold ObligationIntraKindFaithful
  intro H hinj s₁ s₂ _ hcanon₁ _ hcanon₂ haddr
  unfold addressS at haddr
  have hpre : preimageS s₁ = preimageS s₂ := hinj _ _ haddr
  have henc : encSchema (canonS s₁) = encSchema (canonS s₂) := by
    simpa [preimageS] using hpre
  have hcanon : canonS s₁ = canonS s₂ := encSchema_inj _ _ henc
  rw [← hcanon₁, ← hcanon₂, hcanon]

#print axioms intraKindFaithful

end E2
