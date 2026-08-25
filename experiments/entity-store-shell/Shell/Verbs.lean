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

/-- Names are the model's `String` keys (§4, W3-14). The IO whitelist confines the shell to
    file IO UNDER THE STORE ROOT, so the alphabet is restricted at the input boundary: a
    name that could traverse or escape a directory is rejected, not sanitized.

    LENGTH, 64 (W3-14). A name is stored at `names/<hex of its UTF-8 bytes>`, so a 64-
    character name is a 128-character filename — exactly the objects plane's width, which
    is the whole point of the number. Hex doubles the plane, and doubling the previous
    128-character bound would have made `names/` the store's worst case against Windows'
    legacy `MAX_PATH` 260 (F-37, R-C §5.4(b)). The cap restores parity rather than
    inventing a policy.

    CASE IS NOT NARROWED, deliberately. `Widget` and `widget` are two names, and under
    W3-14 they are two bindings on BOTH planes — that is the ruled feature, not a hazard to
    be legislated away by shrinking the alphabet (option 1, rejected: it kept the filename
    as the key and closed none of `trailing.` / `con` / `NUL`). Hex encoding closes all
    four hazards at the disk form instead, which is why this alphabet could now be WIDENED
    without the disk plane noticing. -/
def validName (n : String) : Bool :=
  let cs := n.toList
  !cs.isEmpty && cs.length ≤ 64
    && cs.all (fun c =>
         ('a' ≤ c && c ≤ 'z') || ('A' ≤ c && c ≤ 'Z') || ('0' ≤ c && c ≤ '9')
           || c = '-' || c = '_' || c = '.')
    && (cs.head? != some '.')

/-- The name a `names/` directory entry binds, or `none` if the entry is a stray. Four
    clauses, and the existing stray vocabulary carries every failure:

    * the filename is lowercase hex (`bytesOfHex`; `hexVal` refuses uppercase by design);
    * those bytes are valid UTF-8;
    * the decoded string is a `validName` — an entry that could not have come from
      `name-set` is never silently given a binding;
    * the filename is the spelling `hexOfName` would have produced. The objects plane has
      always had this clause implicitly (`hexOfAddr` is the only spelling `hexVal` accepts);
      stating it here keeps `hexVal`'s own reason — "accepting both would give one address
      two spellings" — true of a name as well.

    It lives beside `validName` rather than beside the disk reader for the reason
    `addrOfFileBytes` does (W3-20): the model side must classify a placed entry EXACTLY as
    the disk reader classifies it, so there is ONE function and no transcription to drift
    into a differential divergence. -/
def nameOfFileName (fn : String) : Option String := do
  let n ← nameOfHex fn
  if validName n && hexOfName n == fn then some n else none

/-! ## Planes and below-the-boundary placement (W3-20)

`corrupt` can only flip bytes in an object that is already present, so no script could
produce a stray, a cycle, a directory, or a malformed name file as a DIFFERENTIAL
observable — three of the family-2 package's pieces were untestable at rung 1 for want of
one primitive (R-C §2.7). The `(place …)` family is that primitive: it writes a directory
entry directly, and the model records exactly what the disk reader would classify the
entry as, so the two sides' scan reports agree by construction rather than by luck. -/

/-- The three planes of the on-disk layout (§4). -/
inductive Plane
  | objects
  | names
  | obligations
deriving DecidableEq

def Plane.dirName : Plane → String
  | .objects => "objects"
  | .names => "names"
  | .obligations => "obligations"

/-- What a `place` puts at a directory entry. `file` is the only shape v0 can create:
    Lean 4.33.1 offers no symlink-creation and no FIFO primitive, and the only route to
    either is a process spawn, which is OUTSIDE the SHELL-v0 §3 whitelist and therefore a
    ruling rather than a seat (reported as BLOCKED under W3-20). `dir` is reachable
    through the already-whitelisted `IO.FS.createDirAll`. -/
inductive PlaceKind
  | file (bytes : Bytes)
  | dir
deriving DecidableEq

def PlaceKind.render : PlaceKind → String
  | .file bs => s!"file bytes={bs.length}"
  | .dir => "dir"

/-- A placed entry's filename, restricted at the input boundary for the same reason
    `validName` restricts a name: SH3 confines the shell to file IO UNDER THE STORE ROOT,
    so a name that could traverse or escape a directory is refused, never sanitized. Wider
    than `validName` in exactly one respect — a leading dot is admitted, because
    `.tmp-<hex>` is a stray the scan is supposed to be able to see. -/
def validPlacedName (n : String) : Bool :=
  let cs := n.toList
  !cs.isEmpty && cs.length ≤ 128
    && cs.all (fun c =>
         ('a' ≤ c && c ≤ 'z') || ('A' ≤ c && c ≤ 'Z') || ('0' ≤ c && c ≤ '9')
           || c = '-' || c = '_' || c = '.')
    && n != "." && n != ".."

/-- What a directory entry contributes to a `StoreView`. -/
inductive PlacedEntry
  | object (a : Address) (b : Bytes)
  | name (n : String) (a : Address)
  | obligation (a : Address)
  | strayObject (rel : String)
  | strayName (rel : String)
  | notRegular (rel : String)

/-- The model's mirror of `StoreRoot.readView`'s classification, entry by entry. This is
    the one function that has to agree with the disk reader, and it is written as a
    TRANSCRIPTION of it, clause for clause — including the two places where the reader's
    order of tests decides the answer:

    * on the objects and obligations planes the filename is tested for address-hex FIRST,
      so a directory whose name is not valid hex is a STRAY, not a non-regular entry;
    * on the obligations plane a badly named entry joins `strayObjectFiles`, not
      `strayNameFiles` — the reader's own choice, mirrored rather than tidied. -/
def placedEntry (plane : Plane) (name : String) (kind : PlaceKind) : PlacedEntry :=
  let rel := plane.dirName ++ "/" ++ name
  match plane with
  | .objects =>
      match addrOfHex name with
      | none => .strayObject rel
      | some a => match kind with
        | .file bs => .object a bs
        | .dir => .notRegular rel
  | .obligations =>
      match addrOfHex name with
      | none => .strayObject rel
      | some a => match kind with
        | .file _ => .obligation a
        | .dir => .notRegular rel
  | .names =>
      -- The filename is tested FIRST here too, and under W3-14 that test is now the hex
      -- decode: an entry whose filename is not the hex of an admissible name is a STRAY
      -- whatever shape it is, exactly as on the objects plane. The DECODED string, never
      -- the filename, is the key that reaches the view.
      match nameOfFileName name with
      | none => .strayName rel
      | some n => match kind with
        | .dir => .notRegular rel
        | .file bs =>
          match addrOfFileBytes bs with
          | some a => .name n a
          | none => .strayName rel

/-- Fold one placed entry into a view. A directory holds one entry per name, so each
    contribution REPLACES any earlier one at the same key rather than accumulating —
    the disk's `writeBinFile` overwrites, and the model must too. -/
def StoreView.withPlaced (v : StoreView) : PlacedEntry → StoreView
  | .object a b => { v with objects := (a, b) :: v.objects.filter (fun p => p.fst != a) }
  | .name n a => { v with names := (n, a) :: v.names.filter (fun p => p.fst != n) }
  | .obligation a => { v with obligations := a :: v.obligations.filter (fun x => x != a) }
  | .strayObject r =>
      { v with strayObjectFiles := r :: v.strayObjectFiles.filter (fun x => x != r) }
  | .strayName r =>
      { v with strayNameFiles := r :: v.strayNameFiles.filter (fun x => x != r) }
  | .notRegular r =>
      { v with notRegularFiles := r :: v.notRegularFiles.filter (fun x => x != r) }

/-- A write the verb has authorized. The two runners interpret these; nothing else
    writes. -/
inductive Effect
  | putObject (a : Address) (b : Bytes) (kind : Kind)
  | setName (n : String) (a : Address)
  | corrupt (a : Address) (idx : Nat) (mask : UInt8)
  /-- HARNESS PRIMITIVE (W3-20): create a directory entry below the boundary. -/
  | place (plane : Plane) (name : String) (kind : PlaceKind)

inductive Verb
  | check
  /-- The emitted topological order, sinks first (W3-12): M19's witness, computed rather
      than asserted, and observable rather than merely computed. One `addr <hex>` line per
      object. Additive — `check`'s transcript is untouched. -/
  | order
  /-- The names plane, listed (W3-14). Hex filenames cost `ls names/` its readability —
      the one property the straw named as a reason for the whole directory-of-files
      design — so the ruling buys it back here: one line per binding, the name DECODED,
      in the view's canonical order. Additive; no other transcript changes. -/
  | names
  | putSchema (b : Bytes)
  | putEntity (sAddr : Address) (b : Bytes)
  | get (a : Address)
  | resolve (a : Address)
  | refs (a : Address)
  | nameSet (n : String) (a : Address)
  | nameGet (n : String)
  /-- HARNESS PRIMITIVE, not a CLI verb: flip bits in a stored object, below the PUT
      boundary. One of the two writers in the shell that bypass admission — it exists so
      that a corrupted store is a differential observable rather than a disk-only
      anecdote. -/
  | corrupt (a : Address) (idx : Nat) (mask : UInt8)
  /-- HARNESS PRIMITIVE, not a CLI verb (W3-20): create a directory entry below the
      boundary, so that a stray, a malformed name file, or a non-regular entry is a
      differential observable. -/
  | place (plane : Plane) (name : String) (kind : PlaceKind)

/-- Flip bits in a byte string — the `corrupt` primitive's payload, below the boundary.
    Shared by both runners so that a corruption is the same corruption on either side. -/
def flipByte (bs : Bytes) (idx : Nat) (mask : UInt8) : Bytes :=
  match bs[idx]? with
  | none => bs
  | some b => bs.set idx (b ^^^ mask)

/-- Decide a verb against an opened store. Returns the observable and the authorized
    writes. Total; the store is never mutated here. -/
def runVerb (view₀ : StoreView) (v : Verb) : Outcome × List Effect :=
  let view := view₀.normalize
  let rep := checkReport view
  let σ := view.toMap
  let blocked : Outcome × List Effect :=
    (⟨1, rep.render ++ ["aborted store-verification-failed"]⟩, [])
  -- Verification-on-open: nothing but `check` and the below-the-boundary harness
  -- primitives (`corrupt`, `place`) runs against a store that fails the scan.
  let gated : (Outcome × List Effect) → Outcome × List Effect :=
    fun x => if rep.ok then x else blocked
  match v with
  | .check => (⟨if rep.ok then 0 else 1, rep.render⟩, [])
  | .order =>
      gated <|
        match topoOrder σ with
        | some o => (Outcome.ok (o.map (fun a => s!"addr {hexOfAddr a}")), [])
        -- Unreachable behind `gated`: a cyclic store fails `check` (one `violation cycle`
        -- line per unemitted node), so the gate has already aborted. Total deliberately,
        -- and answering with the verdict the gate would give rather than minting a second
        -- observable for a state that cannot be reached.
        | none => blocked
  | .names =>
      -- `view` is `view₀.normalize`, so the order is the view's canonical one — a Lean
      -- `String` comparison over the model's own keys, computed identically on both
      -- runners. No HOST string relation is consulted (CONTEXT `host-relation-neutrality`):
      -- the disk's directory order was discarded by `normalize` before this line runs.
      gated <| (Outcome.ok (view.names.map
        (fun p => s!"name {renderStr p.fst} addr {hexOfAddr p.snd}")), [])
  | .place plane name kind =>
      -- Below the boundary, like `corrupt`: UNGATED, because its whole purpose is to put
      -- a store into a state the scan will condemn.
      if !validPlacedName name then (Outcome.rejected (.badName name), [])
      else
        (Outcome.ok [s!"ok placed {plane.dirName}/{name} {kind.render}"],
          [.place plane name kind])
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
