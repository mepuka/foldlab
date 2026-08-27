import Effects.Conformance.Obligations
import Effects.Conformance.Registry

/-!
# The ledger generator (phase 1)

Merges the obligation inventory with the instance registry and renders the
committed conformance ledger through the typed emitter. TypeScript-suite and
mutation columns join the merge when those results exist; adding them is a
declared change to the ledger bytes, never a silent one.

An instantiated row is proved-with-kit by construction — instances cannot
elaborate otherwise — so the status column needs no separate proof or kit
state. A registry entry whose family disagrees with the inventory's declared
family renders as an explicit mismatch line so the gate's byte-compare
surfaces it.

Carrier obligations are the second evidence kind: discharged by model
construction, with no kit-bearing instance. They flip through the declared
discharge list below, never through the registry, so "instantiated" keeps
meaning proved-with-kit and the two evidence kinds stay visually distinct
on the ledger.
-/

namespace Effects.Conformance

/-- Carrier obligations the operator has ratified as discharged by model
construction, with the discharging theorem. Reviewed at ratification like
every instance; the transition check holds `discharged` green — it never
regresses. -/
def carrierDischarges : List (String × String) :=
  [("RPL-001", "step_iff_reduce")]

def statusOf (rows : List LedgerEntry) (o : Obligation) : String :=
  match rows.find? (·.id == o.id) with
  | some e =>
    match o.disposition with
    | .schema f _ =>
      if e.family == f then s!"instantiated ({e.family})"
      else s!"FAMILY MISMATCH: registry says {e.family}, inventory says {f}"
    | _ => s!"instantiated ({e.family})"
  | none =>
    match o.disposition with
    | .schema f m => s!"pending — {f} instance at {m}"
    | .carrier m =>
      match carrierDischarges.find? (·.1 == o.id) with
      | some (_, thm) => s!"discharged — carrier construction ({thm})"
      | none => s!"pending — by carrier construction at {m}"
    | .tsSide m => s!"pending — TypeScript evidence at {m}"
    | .bridge m => s!"pending — differential evidence at {m}"
    | .review => "standing review rule"
    | .deferred t => s!"deferred to {t}"

def fullLedgerBlocks (inv : List Obligation) (rows : List LedgerEntry) :
    List Markdown.Block :=
  let title := Markdown.Block.h1 "Conformance ledger"
  let notice := Markdown.Block.p [.text
    "Generated from the obligation inventory and the instance registry; do not edit by hand. Regenerate with mise run gen:effects."]
  let table := Markdown.Block.table {
    headers := ⟨#["ID", "Status"], rfl⟩
    rows := inv.map fun o => ⟨#[⟨[.text o.id]⟩, ⟨[.text (statusOf rows o)]⟩], rfl⟩
  }
  let sections := inv.flatMap fun o =>
    [Markdown.Block.h2 o.id, .p [.text o.statement]]
      ++ (match rows.find? (·.id == o.id) with
          | some e => [Markdown.Block.p [.bold "Sentence:", .text (" " ++ e.sentence)]]
          | none => [])
  title :: notice :: table :: sections

/-- The committed ledger document. -/
def fullLedger : String :=
  Markdown.render (fullLedgerBlocks inventory registry)

#guard fullLedger.take 20 == "# Conformance ledger"

end Effects.Conformance
