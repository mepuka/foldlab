/-
The verbs, decided once (STORE-SHELL §5).

This module holds the ENTIRE decision content of the shell: given a store view and a
verb, what is the observable and what must be written. It is pure. The in-process model
(`Shell/Model.lean`) and the disk store (`Shell/Store.lean`) differ only in how they
materialize a `StoreView` and how they interpret an `Effect` — so the differential
harness compares plumbing against semantics, never semantics against semantics.

Verification-on-open (§4/SH5) is enforced here, not at the call sites: every verb but
`check` refuses to run on a store that fails the scan, and says so with the same report
`check` would print.
-/
import E2
import Shell.Boundary

namespace Shell

open E2

/-- What a verb produces: an exit code and the exact lines it writes to stdout. -/
structure Outcome where
  code : Nat
  lines : List String

def Outcome.ok (lines : List String) : Outcome := ⟨0, lines⟩
def Outcome.rejected (r : Rejection) : Outcome := ⟨1, [s!"rejected {r.render}"]⟩

/-- A write the verb has authorized. The two runners interpret these; nothing else
    writes. -/
inductive Effect
  | putObject (a : Address) (b : Bytes) (kind : Kind)
  | setName (n : String) (a : Address)
  | corrupt (a : Address) (idx : Nat) (mask : UInt8)

inductive Verb
  | check
  | putSchema (b : Bytes)
  | putEntity (sAddr : Address) (b : Bytes)
  | get (a : Address)
  | resolve (a : Address)
  | refs (a : Address)
  | nameSet (n : String) (a : Address)
  | nameGet (n : String)
  /-- HARNESS PRIMITIVE, not a CLI verb: flip bits in a stored object, below the PUT
      boundary. The only writer in the shell that bypasses admission — it exists so that
      a corrupted store is a differential observable rather than a disk-only anecdote. -/
  | corrupt (a : Address) (idx : Nat) (mask : UInt8)

/-- Flip bits in a byte string — the `corrupt` primitive's payload, below the boundary.
    Shared by both runners so that a corruption is the same corruption on either side. -/
def flipByte (bs : Bytes) (idx : Nat) (mask : UInt8) : Bytes :=
  match bs[idx]? with
  | none => bs
  | some b => bs.set idx (b ^^^ mask)

/-- Names are filenames under `names/` (§4). The IO whitelist confines the shell to file
    IO UNDER THE STORE ROOT, so the name alphabet is restricted at the input boundary:
    a name that could traverse or escape a directory is rejected, not sanitized. -/
def validName (n : String) : Bool :=
  let cs := n.toList
  !cs.isEmpty && cs.length ≤ 128
    && cs.all (fun c =>
         ('a' ≤ c && c ≤ 'z') || ('A' ≤ c && c ≤ 'Z') || ('0' ≤ c && c ≤ '9')
           || c = '-' || c = '_' || c = '.')
    && (cs.head? != some '.')

/-- Decide a verb against an opened store. Returns the observable and the authorized
    writes. Total; the store is never mutated here. -/
def runVerb (view₀ : StoreView) (v : Verb) : Outcome × List Effect :=
  let view := view₀.normalize
  let rep := checkReport view
  let σ := view.toMap
  let blocked : Outcome × List Effect :=
    (⟨1, rep.render ++ ["aborted store-verification-failed"]⟩, [])
  -- Verification-on-open: nothing but `check` and the below-the-boundary harness
  -- primitive runs against a store that fails the scan.
  let gated : (Outcome × List Effect) → Outcome × List Effect :=
    fun x => if rep.ok then x else blocked
  match v with
  | .check => (⟨if rep.ok then 0 else 1, rep.render⟩, [])
  | .corrupt a idx mask =>
      match σ.find a with
      | none => (Outcome.rejected (.notFound a), [])
      | some b =>
          if idx < b.length then
            (Outcome.ok [s!"ok corrupted {hexOfAddr a} index={idx} mask={hexOfBytes [mask]}"],
              [.corrupt a idx mask])
          else (⟨1, [s!"rejected corrupt-index-out-of-range index={idx} length={b.length}"]⟩, [])
  | .putSchema b =>
      gated <|
        match admit σ .schema none b with
        | .error r => (Outcome.rejected r, [])
        | .ok adm =>
            (Outcome.ok [s!"ok {hexOfAddr adm.addr}"], [.putObject adm.addr adm.bytes .schema])
  | .putEntity sAddr b =>
      gated <|
        match admit σ .entity (some sAddr) b with
        | .error r => (Outcome.rejected r, [])
        | .ok adm =>
            (Outcome.ok [s!"ok {hexOfAddr adm.addr}"], [.putObject adm.addr adm.bytes .entity])
  | .get a =>
      gated <|
        match getChecked H σ a with
        | some b => (Outcome.ok [s!"ok {hexOfBytes b}"], [])
        | none => (Outcome.rejected (.notFound a), [])
  | .resolve a =>
      gated <|
        match resolveSchema H σ a with
        | some s => (Outcome.ok [s!"ok schema {renderSchema s}"], [])
        | none =>
          match resolveEntity H σ a with
          | some (sAddr, v) =>
              (Outcome.ok [s!"ok entity {hexOfAddr sAddr} {renderValue v}"], [])
          | none => (Outcome.rejected (.notFound a), [])
  | .refs a =>
      gated <|
        match getChecked H σ a with
        | none => (Outcome.rejected (.notFound a), [])
        | some b =>
          match refsOfPreimage b with
          | none => (Outcome.rejected .notPreimage, [])
          | some rs => (Outcome.ok (s!"ok refs={rs.length}" :: rs.map (fun r => s!"ref {hexOfAddr r}")), [])
  | .nameSet n a =>
      gated <|
        if !validName n then (Outcome.rejected (.badName n), [])
        else (Outcome.ok [s!"ok {renderStr n} {hexOfAddr a}"], [.setName n a])
  | .nameGet n =>
      gated <|
        if !validName n then (Outcome.rejected (.badName n), [])
        else
          match List.lookup n view.names with
          | some a => (Outcome.ok [s!"ok {hexOfAddr a}"], [])
          | none => (Outcome.rejected (.nameUnbound n), [])

/-! ## Assembling pre-image bytes from carriers

The CLI and the harness both feed `runVerb` raw pre-image BYTES — that is the §5 boundary
and the v1 wire shape alike. A carrier fixture becomes bytes through the core's own
assembly, which canonicalizes on the way (`preimageS` applies `canonS`; `preimageE`
applies `canonV`, per Q11). Two carriers that differ only by field order therefore
produce the SAME bytes and the SAME address — M12/M12E, made executable. -/

def schemaBytes (s : SchemaCore) : Bytes := preimageS s

def entityBytes (sAddr : Address) (v : Value) : Bytes := preimageE sAddr v

/-- Deliberately NON-canonical assembly: the core's framing with canonicalization
    skipped. A fixture uses this to prove that boundary check 2 rejects rather than
    repairs. It is not reachable from any CLI verb. -/
def schemaBytesRaw (s : SchemaCore) : Bytes :=
  versionByte :: kindSchema :: encSchema s

def entityBytesRaw (sAddr : Address) (v : Value) : Bytes :=
  versionByte :: kindEntity :: (encAddress sAddr ++ encValue v)

end Shell
