/-
The objects of the Plait kernel algebra: the sort system, the two-layer
AST (an intrinsic layer where unlawful acts have no constructor, and a
candidate layer where they are spellable and refused at admission), the
program DAG, hole filling, and the abstract world the monotone plane
grows. This package is deliberately independent of `verify/fabric`: it
follows that package's discipline but restates every object at the
kernel seam, and its correspondence to the fabric's concrete carriers
is a set of named instantiation obligations, never an import.
-/

namespace Kernel

/-! ## The sort system

Every identifier is a branded digest sort or a derived coordinate, and
sorts never compare across kinds: a token means nothing outside its
register, a position means nothing outside its partition, a digest of
one declaration kind never unifies with a digest of another. The
comparisons the discipline forbids fail to elaborate — they are the
committed must-not-compile control class, not runtime checks. -/

/-- The closed universe of declaration kinds. One brand per kind: a
    digest is always the digest of a declaration of a known kind. -/
inductive DeclKind where
  | schema
  | program
  | policy
  | capability
  | lane
  | algebra
  | index
  | resource
  | ontology
  | schedule
  | template
  | language
deriving Repr, DecidableEq

/-- The numeric rank of a declaration kind inside the closed universe. -/
def DeclKind.rank : DeclKind -> Nat
  | .schema => 0
  | .program => 1
  | .policy => 2
  | .capability => 3
  | .lane => 4
  | .algebra => 5
  | .index => 6
  | .resource => 7
  | .ontology => 8
  | .schedule => 9
  | .template => 10
  | .language => 11

/-- The decode half of the kind rank: the closed universe is enumerable,
    so every in-range rank names exactly one kind. -/
def rankToKind : Nat -> Option DeclKind
  | 0 => some .schema
  | 1 => some .program
  | 2 => some .policy
  | 3 => some .capability
  | 4 => some .lane
  | 5 => some .algebra
  | 6 => some .index
  | 7 => some .resource
  | 8 => some .ontology
  | 9 => some .schedule
  | 10 => some .template
  | 11 => some .language
  | _ => none

/-- A content address branded by the declaration kind it names. Digests
    are modeled as identity labels; that a real digest is a hash over
    one canonical byte form stays in the trusted base. A digest of one
    kind never compares with a digest of another: the comparison has no
    type, which is the referent-pinning discipline carried by the sort
    system itself. -/
structure Digest (kind : DeclKind) where
  id : Nat
deriving Repr, DecidableEq

/-- A kind-tagged reference: the one lawful way a heterogeneous set of
    digests is carried (pin lists, the writ's pinned universe). The tag
    travels with the identifier, so comparing references compares kinds
    first by construction. -/
abbrev Ref := DeclKind × Nat

/-- The reference of a branded digest. -/
def Digest.ref {kind : DeclKind} (digest : Digest kind) : Ref :=
  (kind, digest.id)

/-- An immutable value at its canonical byte form, modeled as an opaque
    identity label. Canonical-byte identity (one value, one byte form)
    is the certifier's own wall and is not restated here. -/
structure Value where
  bytes : Nat
deriving Repr, DecidableEq

/-- The digest of a fold state: a value identity, never a declaration
    identity. Its own sort keeps it out of every declaration-digest
    position. -/
structure StateLabel where
  value : Nat
deriving Repr, DecidableEq

/-- A human-facing petname. Naming, never identity: no operation in this
    package derives a digest from a petname, because resolution is a
    head-relative read served by a fold, outside the identity plane. -/
structure Petname where
  text : String
deriving Repr, DecidableEq

/-- A fencing token, meaningful only within the register that issued
    it. The register is part of the token's type: a cross-register
    comparison fails to elaborate, so the proven-but-vacuous-bound
    failure (two sides of a comparison denominated in different spaces)
    has no syntax. -/
structure Token (register : Digest DeclKind.program) where
  value : Nat
deriving Repr, DecidableEq

/-- A lane partition: the venue-local shard of an evidence stream. -/
structure LanePartition where
  lane : Digest DeclKind.lane
  shard : Nat
deriving Repr, DecidableEq

/-- A journal position, meaningful only within its partition. As with
    tokens, the space rides the type. -/
structure Position (partition : LanePartition) where
  value : Nat
deriving Repr, DecidableEq

/-- An anchor fact: `(fold digest, partition) -> (floor, state, head)`.
    A fact, not a cache — the resume coordinate every head-relative
    read carries. The fold digest and partition are part of the type:
    an anchor replays nowhere but at its own fold and partition. -/
structure AnchorFact (declared : Digest DeclKind.index)
    (partition : LanePartition) where
  floor : Position partition
  state : StateLabel
  head : Position partition
deriving Repr, DecidableEq

/-! ## The trigger grammar, closed

The five ruled monotone productions and nothing else. Absence,
negation, and deadline have no constructor to carry them; acting on
silence is the deadline seat's fenced authority act, outside this
grammar. -/

/-- The epistemic stages of a hole, in rising rank order. `opened` is
    the protocol stage named open; the language keyword forces the
    spelling. -/
inductive HoleStage where
  | opened
  | filled
  | disputed
  | decided
  | sealed
deriving Repr, DecidableEq

/-- The numeric rank of a hole stage. A hole production observes rank
    only in the reached-at-least direction. -/
def HoleStage.rank : HoleStage -> Nat
  | .opened => 0
  | .filled => 1
  | .disputed => 2
  | .decided => 3
  | .sealed => 4

/-- The decode half of the stage rank. -/
def rankToStage : Nat -> Option HoleStage
  | 0 => some .opened
  | 1 => some .filled
  | 2 => some .disputed
  | 3 => some .decided
  | 4 => some .sealed
  | _ => none

/-- The closed trigger grammar at kernel sorts: exactly the five
    monotone productions. Every production reads its component upward
    (presence, reached-at-least, landed, advanced-past), so stability
    under growth is a property of the grammar's shape. -/
inductive KTriggerPredicate where
  | evidenceAppears (lane : Digest DeclKind.lane) (pattern : Value)
  | cellReaches (cell : Digest DeclKind.resource) (threshold : Value)
  | holeReaches (hole : Nat) (target : HoleStage)
  | outcomeLanded (register : Digest DeclKind.program)
  | headAdvancedPast (partition : LanePartition)
      (position : Position partition)
deriving Repr, DecidableEq

/-! ## The intrinsic layer

A typed inductive of kernel sentences over the eight generators, where
the unlawful acts have no constructor: no constructor takes or returns
a time, `resolve` has no anchor slot, `decide` demands a token whose
type carries its register, `fold` demands an anchor whose type carries
its fold and partition, `join` writes only through a declared merge,
and the trigger production set is the closed grammar above. What this
layer cannot spell, the candidate layer below spells and the door
refuses. -/

/-- One lawful kernel sentence: the eight generators, each constructor
    demanding exactly the sorts its licensing law names.
    `resolve` is anchor-free because a digest names one value forever;
    every head-relative read is `fold` at an anchor — the
    immutable/head-relative split carried by the constructors
    themselves. `decide` is commit-with-token: the token's type pins
    the register, so an unfenced or cross-register commit has no
    derivation. -/
inductive Act where
  | declare (kind : DeclKind) (value : Value)
      (writ : Digest DeclKind.policy)
  | resolve (kind : DeclKind) (target : Digest kind)
  | emit (lane : Digest DeclKind.lane) (body : Value)
  | join (cell : Digest DeclKind.resource) (contribution : Value)
  | fold (declared : Digest DeclKind.index) (partition : LanePartition)
      (anchor : AnchorFact declared partition) (query : Value)
  | decide (register : Digest DeclKind.program) (token : Token register)
      (outcome : Value)
  | trigger (predicate : KTriggerPredicate)
      (declaration : Digest DeclKind.program)
  | spawn (parent : Digest DeclKind.policy)
      (request : Digest DeclKind.policy)

/-! ## Sentence identity

A sentence's identity is its canonical encoding. The encoding is a
fixed-arity numeral framing over the sentence structure, with value
bytes carried as the identities they already are; injectivity of this
framing is the model-level content-addressing statement, and the
byte-level canonicalizer's own injectivity is its wall's obligation,
not restated here. -/

/-- The canonical framing of a trigger predicate: a production tag and
    three field slots, zero-padded to constant arity. -/
def encodePred : KTriggerPredicate -> List Nat
  | .evidenceAppears lane pattern => [0, lane.id, pattern.bytes, 0]
  | .cellReaches cell threshold => [1, cell.id, threshold.bytes, 0]
  | .holeReaches hole target => [2, hole, target.rank, 0]
  | .outcomeLanded register => [3, register.id, 0, 0]
  | .headAdvancedPast partition position =>
      [4, partition.lane.id, partition.shard, position.value]

/-- The decode half of the predicate framing. -/
def decodePred (tag a b c : Nat) : Option KTriggerPredicate :=
  match tag, a, b, c with
  | 0, lane, pattern, _ => some (.evidenceAppears ⟨lane⟩ ⟨pattern⟩)
  | 1, cell, threshold, _ => some (.cellReaches ⟨cell⟩ ⟨threshold⟩)
  | 2, hole, stage, _ =>
      (rankToStage stage).map fun target => .holeReaches hole target
  | 3, register, _, _ => some (.outcomeLanded ⟨register⟩)
  | 4, lane, shard, position =>
      some (.headAdvancedPast ⟨⟨lane⟩, shard⟩ ⟨position⟩)
  | _, _, _, _ => none

/-- The canonical framing of a kernel sentence: a generator tag and the
    sentence's fields, at a fixed arity per generator. -/
def encodeAct : Act -> List Nat
  | .declare kind value writ => [0, kind.rank, value.bytes, writ.id]
  | .resolve kind target => [1, kind.rank, target.id]
  | .emit lane body => [2, lane.id, body.bytes]
  | .join cell contribution => [3, cell.id, contribution.bytes]
  | .fold declared partition anchor query =>
      [4, declared.id, partition.lane.id, partition.shard,
        anchor.floor.value, anchor.state.value, anchor.head.value,
        query.bytes]
  | .decide register token outcome =>
      [5, register.id, token.value, outcome.bytes]
  | .trigger predicate declaration =>
      6 :: encodePred predicate ++ [declaration.id]
  | .spawn parent request => [7, parent.id, request.id]

/-- The decode half of the sentence framing: every encoded sentence
    decodes back to itself, which is what makes the encoding a name. -/
def decodeAct : List Nat -> Option Act
  | [0, kind, value, writ] =>
      (rankToKind kind).map fun k => .declare k ⟨value⟩ ⟨writ⟩
  | [1, kind, target] =>
      (rankToKind kind).map fun k => .resolve k ⟨target⟩
  | [2, lane, body] => some (.emit ⟨lane⟩ ⟨body⟩)
  | [3, cell, contribution] => some (.join ⟨cell⟩ ⟨contribution⟩)
  | [4, declared, lane, shard, floor, state, head, query] =>
      some (.fold ⟨declared⟩ ⟨⟨lane⟩, shard⟩
        ⟨⟨floor⟩, ⟨state⟩, ⟨head⟩⟩ ⟨query⟩)
  | [5, register, token, outcome] =>
      some (.decide ⟨register⟩ ⟨token⟩ ⟨outcome⟩)
  | 6 :: tag :: a :: b :: c :: [declaration] =>
      (decodePred tag a b c).map fun predicate =>
        .trigger predicate ⟨declaration⟩
  | [7, parent, request] => some (.spawn ⟨parent⟩ ⟨request⟩)
  | _ => none

/-! ## The candidate layer

The raw grammar an agent can spell, including every unlawful shape the
closure list names. Admission is the one door: each candidate either
translates into an intrinsic sentence or refuses structurally, carrying
the law it defends and a taught repair. A grammar that cannot refuse
proves nothing, so the refusals are half the grammar. -/

/-- A raw argument atom. The lawful atoms are digest references and
    literals; holes are lawful in program declarations and refused in a
    single sentence; every other atom is an unlawful shape kept
    spellable so the door's refusal of it is demonstrable. -/
inductive RawArg where
  | digestRef (kind : DeclKind) (id : Nat)
  | literal (value : Nat)
  | hole (name : Nat)
  | clockNow
  | randomSeed
  | secretBytes (bytes : Nat)
  | mintedId (token : Nat)
  | functionValue (code : Nat)
deriving Repr, DecidableEq

/-- A candidate anchor: the raw spelling of a resume coordinate, its
    fold carried as data rather than as a type index — which is exactly
    what lets a cross-fold anchor be spelled and refused. -/
structure CandidateAnchor where
  foldId : Nat
  lane : Nat
  shard : Nat
  floor : Nat
  state : Nat
  head : Nat
deriving Repr, DecidableEq

/-- A raw token claim: the register the claimant believes the token
    belongs to, carried as data so a cross-register claim is spellable
    and refused. -/
structure TokenClaim where
  register : Nat
  value : Nat
deriving Repr, DecidableEq

/-- A candidate merge strategy. The lawful strategy names a declared
    merge algebra; last-writer-wins is spellable here and refused at
    the door, because no such carrier exists in the fabric. -/
inductive MergeStrategy where
  | declaredAlgebra (algebra : Nat)
  | lastWriterWins
deriving Repr, DecidableEq

/-- The candidate trigger grammar: the five lawful productions plus the
    shapes the closed grammar deliberately cannot carry — absence,
    negation, deadline, and the not-present-anywhere claim a local
    replica can never ground. -/
inductive CandidatePredicate where
  | evidenceAppears (lane : Nat) (pattern : Nat)
  | cellReaches (cell : Nat) (threshold : Nat)
  | holeReaches (hole : Nat) (stage : Nat)
  | outcomeLanded (register : Nat)
  | headAdvancedPast (lane : Nat) (shard : Nat) (position : Nat)
  | onAbsence (subject : Nat)
  | negation (inner : CandidatePredicate)
  | deadline (tick : Nat)
  | absentEverywhere (cell : Nat)
deriving Repr, DecidableEq

/-- The raw candidate grammar. Every generator is spellable, and so is
    every unlawful shape: an anchored resolve, a trusted read, an
    unfenced or cross-register decide, a last-writer-wins join, an
    unanchored latest read, and an in-place mutation of the past. -/
inductive CandidateAct where
  | declare (kind : DeclKind) (payload : List RawArg) (writ : Nat)
  | resolveDigest (kind : DeclKind) (target : Nat) (anchor : Option Nat)
  | trustBytes (kind : DeclKind) (target : Nat) (asserted : Nat)
  | emit (lane : Nat) (body : List RawArg)
  | join (cell : Nat) (contribution : List RawArg)
      (strategy : MergeStrategy)
  | readLatest (subject : Nat)
  | fold (declared : Nat) (anchor : Option CandidateAnchor)
      (query : List RawArg)
  | decide (register : Nat) (token : Option TokenClaim)
      (outcome : List RawArg)
  | trigger (predicate : CandidatePredicate) (declaration : Nat)
  | spawn (parent : Nat) (request : Nat)
  | updateInPlace (target : Nat) (payload : List RawArg)
deriving Repr, DecidableEq

/-! ## Refusals

Structural refusals carry the law they defend and a legal next move.
The fourteen closure-row reasons are the unrepresentability inventory;
the two door-completeness reasons (an anchored resolve, an unfilled
hole) defend the signature discipline and render totality. -/

/-- The closed refusal reasons of the kernel door. -/
inductive RefusalReason where
  | clockRead
  | absenceTrigger
  | unfencedDecide
  | lastWriterWins
  | unverifiedRead
  | crossSortIdentifier
  | mintedIdentifier
  | ambientQueryInput
  | forwardReference
  | secretCarrier
  | absenceClaim
  | pastMutation
  | offWritReferent
  | closureIntrospection
  | anchoredResolve
  | unfilledHole
deriving Repr, DecidableEq

/-- The wire spelling of a refusal reason. -/
def RefusalReason.wire : RefusalReason -> String
  | .clockRead => "clock-read"
  | .absenceTrigger => "absence-trigger"
  | .unfencedDecide => "unfenced-decide"
  | .lastWriterWins => "last-writer-wins"
  | .unverifiedRead => "unverified-read"
  | .crossSortIdentifier => "cross-sort-identifier"
  | .mintedIdentifier => "minted-identifier"
  | .ambientQueryInput => "ambient-query-input"
  | .forwardReference => "forward-reference"
  | .secretCarrier => "secret-carrier"
  | .absenceClaim => "absence-claim"
  | .pastMutation => "past-mutation"
  | .offWritReferent => "off-writ-referent"
  | .closureIntrospection => "closure-introspection"
  | .anchoredResolve => "anchored-resolve"
  | .unfilledHole => "unfilled-hole"

/-- A structural refusal: the reason, the law it defends, and the
    taught repair. Refusal parity as data: the door never refuses
    without teaching the legal next move. -/
structure Refusal where
  reason : RefusalReason
  law : String
  repair : String
deriving Repr, DecidableEq

/-- The taught-refusal table: one total row per reason. Totality of
    this function is the parity discipline — a reason without its law
    and repair cannot exist. -/
def taught : RefusalReason -> Refusal
  | .clockRead =>
      { reason := .clockRead
        law := "the fold carrier has no clock parameter (f11_query_deterministic)"
        repair := "emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value" }
  | .absenceTrigger =>
      { reason := .absenceTrigger
        law := "the trigger grammar is closed at five monotone productions (f10_stability)"
        repair := "route acting-on-silence through the deadline seat: a fenced decide fed by tick facts" }
  | .unfencedDecide =>
      { reason := .unfencedDecide
        law := "only a fenced token commits (at_most_one_landed_commit)"
        repair := "hold the register's token and commit with it; grant and renew are runtime liveness, not grammar" }
  | .lastWriterWins =>
      { reason := .lastWriterWins
        law := "cells merge by join under a declared ACI algebra (f1_cell_merge_aci)"
        repair := "declare the merge algebra; idempotent join leaves nothing for arrival order to choose" }
  | .unverifiedRead =>
      { reason := .unverifiedRead
        law := "a decode re-derives the digest of what it fetched (verify-on-read)"
        repair := "resolve and let the door re-derive; absence is retryable, a mismatch is structural" }
  | .crossSortIdentifier =>
      { reason := .crossSortIdentifier
        law := "tokens are per-register and positions are per-partition; sorts never compare across spaces"
        repair := "compare a token only within its register and a position only within its partition" }
  | .mintedIdentifier =>
      { reason := .mintedIdentifier
        law := "every identifier is a digest of a declaration or a derivation from one"
        repair := "declare the value and use its digest; nothing mints a name" }
  | .ambientQueryInput =>
      { reason := .ambientQueryInput
        law := "a derived read is a function of support and query alone (f11_topk_of_support)"
        repair := "read state through a fold at an anchor, and put any seed inside the declared query value" }
  | .forwardReference =>
      { reason := .forwardReference
        law := "pins name already-admitted digests (c7_pin_well_founded)"
        repair := "declare the referent first; the reference graph is a DAG by admission order" }
  | .secretCarrier =>
      { reason := .secretCarrier
        law := "the wire grammar admits no secret position"
        repair := "carry credentials in the environmental band as redacted configuration, outside meaning" }
  | .absenceClaim =>
      { reason := .absenceClaim
        law := "a local view is a lattice lower bound (cell_absorb_inflationary)"
        repair := "claim at-least from a replica, never not-present-anywhere" }
  | .pastMutation =>
      { reason := .pastMutation
        law := "journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)"
        repair := "declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon" }
  | .offWritReferent =>
      { reason := .offWritReferent
        law := "a declaration's identifiers lie inside the universe its writ pins"
        repair := "spawn under a writ that pins the referent, or request the referent into the pinned universe" }
  | .closureIntrospection =>
      { reason := .closureIntrospection
        law := "a program's identity is its declaration, never its closure bytes"
        repair := "reference computation by digest: declare the fold and pin its digest" }
  | .anchoredResolve =>
      { reason := .anchoredResolve
        law := "a digest names one value forever, so no anchor can change a resolve"
        repair := "drop the anchor; read head-relative state through a fold at an anchor" }
  | .unfilledHole =>
      { reason := .unfilledHole
        law := "only closed programs execute; a hole is a declared parameter, not a wildcard"
        repair := "fill every declared hole; disjoint fills commute, so fill order is free" }

/-- How a taught repair may be applied. A repair is machine-applicable
    exactly when the lawful rewrite is a function of the refused
    candidate alone — an agent may apply it mechanically, with no new
    information; it is advisory when the repair needs something the
    candidate does not carry (a token to hold, a value to declare, an
    authority to request). The Rust diagnostic discipline, adopted by
    the operator's ruling. -/
inductive Applicability where
  | machineApplicable
  | advisory
deriving Repr, DecidableEq

/-- The applicability marking of each reason's taught repair. Four
    repairs are functions of the refused candidate alone: drop the
    anchor (anchored resolve), resolve instead of trusting bytes
    (unverified read), rewrite the in-place update as a successor
    declaration pinning its predecessor (past mutation), and drop the
    unlawful strategy so the declared algebra governs (last-writer-
    wins). Every other repair needs information the candidate does
    not carry, so it is advisory. -/
def RefusalReason.applicability : RefusalReason -> Applicability
  | .anchoredResolve => .machineApplicable
  | .unverifiedRead => .machineApplicable
  | .pastMutation => .machineApplicable
  | .lastWriterWins => .machineApplicable
  | .clockRead => .advisory
  | .absenceTrigger => .advisory
  | .unfencedDecide => .advisory
  | .crossSortIdentifier => .advisory
  | .mintedIdentifier => .advisory
  | .ambientQueryInput => .advisory
  | .forwardReference => .advisory
  | .secretCarrier => .advisory
  | .absenceClaim => .advisory
  | .offWritReferent => .advisory
  | .closureIntrospection => .advisory
  | .unfilledHole => .advisory

/-- The wire spelling of an applicability marking. -/
def Applicability.wire : Applicability -> String
  | .machineApplicable => "machine-applicable"
  | .advisory => "advisory"

/-! ## The door -/

/-- The admission context: the already-admitted catalog and the
    universe of referents the acting writ pins. -/
structure Door where
  catalog : List Ref
  pinned : List Ref
deriving Repr

/-- Door growth is membership inclusion in both changing contexts:
    the already-admitted catalog and the acting writ's pinned universe.
    List order and duplicate entries carry no meaning at this seam. -/
structure Door.Le (smaller larger : Door) : Prop where
  catalog : forall ref, ref ∈ smaller.catalog -> ref ∈ larger.catalog
  pinned : forall ref, ref ∈ smaller.pinned -> ref ∈ larger.pinned

/-- The admission verdict: an intrinsic sentence, or a taught
    structural refusal. -/
inductive AdmitResult where
  | admitted (act : Act)
  | refused (refusal : Refusal)

/-- Reference membership as an executable check, recursing on the list
    so ground admissions reduce definitionally. -/
def refMember (kind : DeclKind) (id : Nat) : List Ref -> Bool
  | [] => false
  | (k, i) :: rest =>
      (decide (k = kind) && decide (i = id)) || refMember kind id rest

/-- The refusal a single raw atom earns, if any. Digest references must
    name already-admitted declarations; the unlawful atoms each carry
    their closure row. -/
def argRefusal (door : Door) : RawArg -> Option RefusalReason
  | .digestRef kind id =>
      if refMember kind id door.catalog then none
      else some .forwardReference
  | .literal _ => none
  | .hole _ => some .unfilledHole
  | .clockNow => some .clockRead
  | .randomSeed => some .ambientQueryInput
  | .secretBytes _ => some .secretCarrier
  | .mintedId _ => some .mintedIdentifier
  | .functionValue _ => some .closureIntrospection

/-- Sweep an argument list left to right for the first refusal. -/
def argSweep (door : Door) : List RawArg -> Option RefusalReason
  | [] => none
  | arg :: rest =>
      match argRefusal door arg with
      | some reason => some reason
      | none => argSweep door rest

/-- Whether every digest reference in the payload lies inside the
    pinned universe. Checked after the sweep, so it sees only admitted
    references. -/
def insideUniverse (door : Door) : List RawArg -> Bool
  | [] => true
  | .digestRef kind id :: rest =>
      refMember kind id door.pinned && insideUniverse door rest
  | _ :: rest => insideUniverse door rest

/-- The refusal a candidate predicate earns, if any: the unlawful
    productions carry their rows; negation is refused outright, whatever
    it wraps, because no monotone reading of a negation exists. -/
def predicateRefusal : CandidatePredicate -> Option RefusalReason
  | .onAbsence _ => some .absenceTrigger
  | .negation _ => some .absenceTrigger
  | .deadline _ => some .absenceTrigger
  | .absentEverywhere _ => some .absenceClaim
  | .evidenceAppears _ _ => none
  | .cellReaches _ _ => none
  | .holeReaches _ stage =>
      match rankToStage stage with
      | some _ => none
      | none => some .absenceTrigger
  | .outcomeLanded _ => none
  | .headAdvancedPast _ _ _ => none

/-- Translate a lawful candidate predicate into the closed grammar.
    Returns none exactly where `predicateRefusal` fires. -/
def translatePredicate : CandidatePredicate -> Option KTriggerPredicate
  | .evidenceAppears lane pattern =>
      some (.evidenceAppears ⟨lane⟩ ⟨pattern⟩)
  | .cellReaches cell threshold =>
      some (.cellReaches ⟨cell⟩ ⟨threshold⟩)
  | .holeReaches hole stage =>
      (rankToStage stage).map fun target => .holeReaches hole target
  | .outcomeLanded register => some (.outcomeLanded ⟨register⟩)
  | .headAdvancedPast lane shard position =>
      some (.headAdvancedPast ⟨⟨lane⟩, shard⟩ ⟨position⟩)
  | .onAbsence _ => none
  | .negation _ => none
  | .deadline _ => none
  | .absentEverywhere _ => none

/-- The model canonicalizer for a raw payload: a positional fold into
    one byte identity. A stand-in for the canonical byte form; its
    injectivity is the byte-level canonicalizer's own obligation,
    walled where that machinery lives, never claimed here. -/
def canonicalBytes (args : List RawArg) : Nat :=
  args.foldl
    (fun acc arg =>
      acc * 1000003 +
        match arg with
        | .digestRef kind id => 1 + kind.rank * 4096 + id
        | .literal value => 2 + value * 16
        | .hole name => 3 + name * 16
        | .clockNow => 4
        | .randomSeed => 5
        | .secretBytes bytes => 6 + bytes * 16
        | .mintedId token => 7 + token * 16
        | .functionValue code => 8 + code * 16)
    7

/-- The one admission door. Each candidate either translates into an
    intrinsic sentence or refuses with a taught structural refusal;
    the check order within a candidate is fixed (signature shape, then
    reference sweep, then universe), so the door is deterministic. -/
def admit (door : Door) : CandidateAct -> AdmitResult
  | .declare kind payload writ =>
      match argSweep door payload with
      | some reason => .refused (taught reason)
      | none =>
          if insideUniverse door payload then
            if refMember DeclKind.policy writ door.catalog then
              .admitted (.declare kind ⟨canonicalBytes payload⟩ ⟨writ⟩)
            else .refused (taught .forwardReference)
          else .refused (taught .offWritReferent)
  | .resolveDigest kind target anchor =>
      match anchor with
      | some _ => .refused (taught .anchoredResolve)
      | none =>
          if refMember kind target door.catalog then
            .admitted (.resolve kind ⟨target⟩)
          else .refused (taught .forwardReference)
  | .trustBytes _ _ _ => .refused (taught .unverifiedRead)
  | .emit lane body =>
      match argSweep door body with
      | some reason => .refused (taught reason)
      | none =>
          if refMember DeclKind.lane lane door.catalog then
            .admitted (.emit ⟨lane⟩ ⟨canonicalBytes body⟩)
          else .refused (taught .forwardReference)
  | .join cell contribution strategy =>
      match strategy with
      | .lastWriterWins => .refused (taught .lastWriterWins)
      | .declaredAlgebra algebra =>
          match argSweep door contribution with
          | some reason => .refused (taught reason)
          | none =>
              if refMember DeclKind.resource cell door.catalog then
                if refMember DeclKind.algebra algebra door.catalog then
                  .admitted
                    (.join ⟨cell⟩ ⟨canonicalBytes contribution⟩)
                else .refused (taught .forwardReference)
              else .refused (taught .forwardReference)
  | .readLatest _ => .refused (taught .ambientQueryInput)
  | .fold declared anchor query =>
      match anchor with
      | none => .refused (taught .ambientQueryInput)
      | some anchor =>
          if anchor.foldId = declared then
            match argSweep door query with
            | some reason => .refused (taught reason)
            | none =>
                if refMember DeclKind.index declared door.catalog then
                  .admitted (.fold ⟨declared⟩ ⟨⟨anchor.lane⟩, anchor.shard⟩
                    ⟨⟨anchor.floor⟩, ⟨anchor.state⟩, ⟨anchor.head⟩⟩
                    ⟨canonicalBytes query⟩)
                else .refused (taught .forwardReference)
          else .refused (taught .crossSortIdentifier)
  | .decide register token outcome =>
      match token with
      | none => .refused (taught .unfencedDecide)
      | some claim =>
          if claim.register = register then
            match argSweep door outcome with
            | some reason => .refused (taught reason)
            | none =>
                if refMember DeclKind.program register door.catalog then
                  .admitted (.decide ⟨register⟩ ⟨claim.value⟩
                    ⟨canonicalBytes outcome⟩)
                else .refused (taught .forwardReference)
          else .refused (taught .crossSortIdentifier)
  | .trigger predicate declaration =>
      match predicateRefusal predicate with
      | some reason => .refused (taught reason)
      | none =>
          match translatePredicate predicate with
          | some translated =>
              if refMember DeclKind.program declaration door.catalog then
                .admitted (.trigger translated ⟨declaration⟩)
              else .refused (taught .forwardReference)
          | none => .refused (taught .absenceTrigger)
  | .spawn parent request =>
      if refMember DeclKind.policy parent door.catalog then
        if refMember DeclKind.policy request door.catalog then
          .admitted (.spawn ⟨parent⟩ ⟨request⟩)
        else .refused (taught .forwardReference)
      else .refused (taught .forwardReference)
  | .updateInPlace _ _ => .refused (taught .pastMutation)

/-! ## The unlawful shapes

The closure list as a predicate over candidates: one constructor per
spellable unlawful shape. The admission-closure law quantifies over
this predicate — whatever spells one of these shapes has no admitted
translation — and the planted ground programs below instantiate one
row each. -/

/-- The payload positions of a candidate act: the argument lists the
    door sweeps. -/
def actArgs : CandidateAct -> List RawArg
  | .declare _ payload _ => payload
  | .emit _ body => body
  | .join _ contribution _ => contribution
  | .fold _ _ query => query
  | .decide _ _ outcome => outcome
  | .updateInPlace _ payload => payload
  | _ => []

/-- An atom-level fault whose presence is a function of candidate bytes
    alone. Digest references and literals can become lawful as the door
    grows; every other raw atom requires rewriting the candidate. -/
def RawArg.Intrinsic : RawArg -> Prop
  | .digestRef _ _ => False
  | .literal _ => False
  | _ => True

/-- Candidate-intrinsic faults, independent of every door. Payload
    atoms cover the six raw-argument rows; the remaining constructors
    cover the candidate shapes whose signature or production is itself
    unlawful. A candidate may also carry a door-relative fault before
    one of these, so this predicate does not select a refusal reason. -/
inductive IntrinsicFault : CandidateAct -> Prop where
  | payload (candidate : CandidateAct) (arg : RawArg) :
      arg ∈ actArgs candidate -> arg.Intrinsic -> IntrinsicFault candidate
  | anchored (kind : DeclKind) (target anchor : Nat) :
      IntrinsicFault (.resolveDigest kind target (some anchor))
  | trusting (kind : DeclKind) (target asserted : Nat) :
      IntrinsicFault (.trustBytes kind target asserted)
  | lastWriter (cell : Nat) (contribution : List RawArg) :
      IntrinsicFault (.join cell contribution .lastWriterWins)
  | latest (subject : Nat) : IntrinsicFault (.readLatest subject)
  | anchorless (declared : Nat) (query : List RawArg) :
      IntrinsicFault (.fold declared none query)
  | crossAnchor (declared : Nat) (anchor : CandidateAnchor)
      (query : List RawArg) :
      anchor.foldId ≠ declared ->
      IntrinsicFault (.fold declared (some anchor) query)
  | unfenced (register : Nat) (outcome : List RawArg) :
      IntrinsicFault (.decide register none outcome)
  | crossToken (register : Nat) (claim : TokenClaim)
      (outcome : List RawArg) :
      claim.register ≠ register ->
      IntrinsicFault (.decide register (some claim) outcome)
  | refusedPredicate (predicate : CandidatePredicate)
      (declaration : Nat) (reason : RefusalReason) :
      predicateRefusal predicate = some reason ->
      IntrinsicFault (.trigger predicate declaration)
  | mutation (target : Nat) (payload : List RawArg) :
      IntrinsicFault (.updateInPlace target payload)

/-- The digest references carried by a raw argument list. -/
def argRefs : List RawArg -> List Ref
  | [] => []
  | .digestRef kind id :: rest => (kind, id) :: argRefs rest
  | _ :: rest => argRefs rest

/-- The finite catalog support a candidate needs after all intrinsic
    faults are absent. Adding this support can repair every
    forward-reference refusal without rewriting the candidate. -/
def requiredCatalog : CandidateAct -> List Ref
  | .declare _ payload writ =>
      (DeclKind.policy, writ) :: argRefs payload
  | .resolveDigest kind target _ => [(kind, target)]
  | .trustBytes kind target _ => [(kind, target)]
  | .emit lane body => (DeclKind.lane, lane) :: argRefs body
  | .join cell contribution strategy =>
      (DeclKind.resource, cell) ::
        (match strategy with
        | .declaredAlgebra algebra =>
            (DeclKind.algebra, algebra) :: argRefs contribution
        | .lastWriterWins => argRefs contribution)
  | .readLatest _ => []
  | .fold declared _ query =>
      (DeclKind.index, declared) :: argRefs query
  | .decide register _ outcome =>
      (DeclKind.program, register) :: argRefs outcome
  | .trigger _ declaration => [(DeclKind.program, declaration)]
  | .spawn parent request =>
      [(DeclKind.policy, parent), (DeclKind.policy, request)]
  | .updateInPlace _ payload => argRefs payload

/-- Only declarations inspect the acting writ's pinned universe. -/
def requiredPinned : CandidateAct -> List Ref
  | .declare _ payload _ => argRefs payload
  | _ => []

/-- The canonical finite repair door: preserve the old door and add
    precisely the candidate's catalog and pinned-universe support. -/
def repairingDoor (door : Door) (candidate : CandidateAct) : Door where
  catalog := requiredCatalog candidate ++ door.catalog
  pinned := requiredPinned candidate ++ door.pinned

/-- The two refusal reasons whose truth is relative to a door rather
    than fixed by candidate bytes. -/
def RefusalReason.DoorRelative : RefusalReason -> Prop
  | .forwardReference => True
  | .offWritReferent => True
  | _ => False

/-- A currently surfaced door-relative refusal. This classifies the
    returned reason only; a candidate may still carry a later intrinsic
    fault, which is why repairability names that absence separately. -/
def DoorRelativeRefusal (door : Door) (candidate : CandidateAct) : Prop :=
  exists refusal, admit door candidate = .refused refusal /\
    refusal.reason.DoorRelative

/-- The unlawful candidate shapes, one constructor per closure row's
    spellable form (plus the two signature-discipline shapes: an
    anchored resolve and an unfilled hole). -/
inductive Unlawful (door : Door) : CandidateAct -> Prop where
  | clockAtom (act : CandidateAct) :
      RawArg.clockNow ∈ actArgs act -> Unlawful door act
  | seedAtom (act : CandidateAct) :
      RawArg.randomSeed ∈ actArgs act -> Unlawful door act
  | secretAtom (act : CandidateAct) (bytes : Nat) :
      RawArg.secretBytes bytes ∈ actArgs act -> Unlawful door act
  | mintedAtom (act : CandidateAct) (token : Nat) :
      RawArg.mintedId token ∈ actArgs act -> Unlawful door act
  | functionAtom (act : CandidateAct) (code : Nat) :
      RawArg.functionValue code ∈ actArgs act -> Unlawful door act
  | holeAtom (act : CandidateAct) (name : Nat) :
      RawArg.hole name ∈ actArgs act -> Unlawful door act
  | danglingRef (act : CandidateAct) (kind : DeclKind) (id : Nat) :
      RawArg.digestRef kind id ∈ actArgs act ->
      (kind, id) ∉ door.catalog -> Unlawful door act
  | offWrit (kind : DeclKind) (payload : List RawArg) (writ : Nat) :
      argSweep door payload = none ->
      insideUniverse door payload = false ->
      Unlawful door (.declare kind payload writ)
  | anchored (kind : DeclKind) (target : Nat) (anchor : Nat) :
      Unlawful door (.resolveDigest kind target (some anchor))
  | trusting (kind : DeclKind) (target asserted : Nat) :
      Unlawful door (.trustBytes kind target asserted)
  | lastWriter (cell : Nat) (contribution : List RawArg) :
      Unlawful door (.join cell contribution .lastWriterWins)
  | latest (subject : Nat) :
      Unlawful door (.readLatest subject)
  | anchorless (declared : Nat) (query : List RawArg) :
      Unlawful door (.fold declared none query)
  | crossAnchor (declared : Nat) (anchor : CandidateAnchor)
      (query : List RawArg) :
      anchor.foldId ≠ declared ->
      Unlawful door (.fold declared (some anchor) query)
  | unfenced (register : Nat) (outcome : List RawArg) :
      Unlawful door (.decide register none outcome)
  | crossToken (register : Nat) (claim : TokenClaim)
      (outcome : List RawArg) :
      claim.register ≠ register ->
      Unlawful door (.decide register (some claim) outcome)
  | absenceProduction (predicate : CandidatePredicate)
      (declaration : Nat) (reason : RefusalReason) :
      predicateRefusal predicate = some reason ->
      Unlawful door (.trigger predicate declaration)
  | mutation (target : Nat) (payload : List RawArg) :
      Unlawful door (.updateInPlace target payload)

/-! ## Planted ground programs

One committed unlawful program per closure row, each refused at the
door with its named law — the negative-control discipline at API
scale — plus the lawful twin the door must admit, refuting the
door-that-refuses-everything. -/

namespace Planted

/-- The ground admission context: a small admitted catalog and a
    pinned universe that deliberately omits one admitted schema, so
    the off-writ row has a referent that resolves and still refuses. -/
def door : Door where
  catalog :=
    [ (DeclKind.schema, 8)
    , (DeclKind.schema, 9)
    , (DeclKind.program, 3)
    , (DeclKind.policy, 4)
    , (DeclKind.policy, 5)
    , (DeclKind.lane, 1)
    , (DeclKind.index, 2)
    , (DeclKind.resource, 6)
    , (DeclKind.algebra, 7)
    ]
  pinned :=
    [ (DeclKind.schema, 8)
    , (DeclKind.program, 3)
    , (DeclKind.policy, 4)
    , (DeclKind.lane, 1)
    ]

/-- The well-sorted candidate anchor the planted fold rows share. -/
def groundAnchor : CandidateAnchor :=
  { foldId := 2, lane := 1, shard := 0, floor := 4, state := 11, head := 6 }

/-- Row: a wall clock spelled into a fold's query. -/
def clockFold : CandidateAct :=
  .fold 2 (some groundAnchor) [.clockNow]

/-- Row: acting on silence spelled as an absence trigger. -/
def absenceTrigger : CandidateAct :=
  .trigger (.onAbsence 6) 3

/-- Row: a register commit spelled without a token. -/
def unfencedDecide : CandidateAct :=
  .decide 3 none [.literal 42]

/-- Row: a last-writer-wins merge spelled at a cell. -/
def lastWriterJoin : CandidateAct :=
  .join 6 [.literal 42] .lastWriterWins

/-- Row: a read that trusts asserted bytes without re-derivation. -/
def trustingRead : CandidateAct :=
  .trustBytes .schema 8 999

/-- Row: a token claimed at one register, spent at another. -/
def crossRegisterDecide : CandidateAct :=
  .decide 3 (some { register := 99, value := 7 }) [.literal 42]

/-- Row: a minted identifier presented as a referent. -/
def mintedDeclare : CandidateAct :=
  .declare .schema [.mintedId 12345] 4

/-- Row: an unanchored latest read — the ambient input with no
    carrier parameter to hide in. -/
def latestRead : CandidateAct :=
  .readLatest 6

/-- Row: a declaration referencing a digest never admitted — the
    spelling every cycle reduces to at its first admission. -/
def forwardDeclare : CandidateAct :=
  .declare .schema [.digestRef .schema 77] 4

/-- Row: a secret spelled into an evidence body. -/
def secretEmit : CandidateAct :=
  .emit 1 [.secretBytes 31337]

/-- Row: a not-present-anywhere claim grounded on a local replica. -/
def absenceClaimTrigger : CandidateAct :=
  .trigger (.absentEverywhere 6) 3

/-- Row: an in-place mutation of an admitted value. -/
def pastMutation : CandidateAct :=
  .updateInPlace 8 [.literal 43]

/-- Row: a referent that resolves in the catalog but lies outside the
    writ's pinned universe. -/
def offWritDeclare : CandidateAct :=
  .declare .schema [.digestRef .schema 9] 4

/-- Row: a function value carried as data — closure bytes offered
    where a declared digest belongs. -/
def functionDeclare : CandidateAct :=
  .declare .schema [.functionValue 555] 4

/-- Signature discipline: an anchor spelled onto a resolve. -/
def anchoredResolve : CandidateAct :=
  .resolveDigest .schema 8 (some 4)

/-- Render totality: an unfilled hole in a single sentence. -/
def holeyEmit : CandidateAct :=
  .emit 1 [.hole 0]

/-- The lawful twin: a declaration whose references are admitted and
    pinned. Its admission refutes the door-that-refuses-everything. -/
def lawfulDeclare : CandidateAct :=
  .declare .schema [.digestRef .schema 8, .literal 5] 4

/-- The intrinsic sentence the lawful twin admits to. -/
def lawfulDeclareAct : Act :=
  .declare .schema ⟨canonicalBytes [.digestRef .schema 8, .literal 5]⟩ ⟨4⟩

end Planted

/-! ## Program declarations and the pin order

A program is a DAG of named generator applications; its nodes
reference already-admitted nodes, so the graph is well-founded by
admission order — the same shape as catalog admission, at node
scale. -/

/-- The generator a program node applies. -/
inductive GenTag where
  | declare
  | resolve
  | emit
  | join
  | fold
  | decide
  | trigger
  | spawn
deriving Repr, DecidableEq

/-- One node of a program declaration: a program-scoped name, the
    generator it applies, its raw arguments (holes permitted here —
    the program's typed parameters), and the names of the prior nodes
    it consumes. -/
structure ProgramNode where
  name : Nat
  generator : GenTag
  args : List RawArg
  uses : List Nat
deriving Repr, DecidableEq

/-- The inductive admission order over program nodes (newest first):
    every use names an already-admitted node, and a name admits at
    most once. The freshness half is the in-model reading of content
    addressing at node scale. -/
inductive ProgramAdmission : List ProgramNode -> Prop where
  | empty : ProgramAdmission []
  | admit (nodes : List ProgramNode) (node : ProgramNode)
      (admission : ProgramAdmission nodes)
      (usesAdmitted : forall use, use ∈ node.uses ->
        exists prior, prior ∈ nodes /\ prior.name = use)
      (fresh : forall prior, prior ∈ nodes ->
        prior.name ≠ node.name) :
      ProgramAdmission (node :: nodes)

/-- The pin relation inside a program: `parent` is consumed by
    `child`. -/
def NodePins (nodes : List ProgramNode)
    (parent child : ProgramNode) : Prop :=
  child ∈ nodes /\ parent ∈ nodes /\ parent.name ∈ child.uses

/-- The admission rank of a node name: its distance from the oldest
    admission. Later admissions rank strictly higher. -/
def nodeRank : List ProgramNode -> Nat -> Nat
  | [], _ => 0
  | node :: nodes, name =>
      if node.name == name then nodes.length
      else nodeRank nodes name

/-! ## Holes and filling

A program value may carry typed holes; filling is simultaneous
substitution. Disjoint fills commute and fills compose under
valuation union — the typed-hole algebra lifted to program
declarations. -/

/-- A hole valuation: values for some of the holes, by name. -/
def Valuation := Nat -> Option Nat

/-- The empty valuation. -/
def Valuation.empty : Valuation := fun _ => none

/-- Left-biased union of valuations. -/
def Valuation.union (left right : Valuation) : Valuation :=
  fun hole =>
    match left hole with
    | some value => some value
    | none => right hole

/-- Two valuations with no hole in common. -/
def Valuation.Disjoint (left right : Valuation) : Prop :=
  forall hole, left hole = none \/ right hole = none

/-- Fill one argument: a covered hole becomes its value, everything
    else is untouched. -/
def fillArg (valuation : Valuation) : RawArg -> RawArg
  | .hole name =>
      match valuation name with
      | some value => .literal value
      | none => .hole name
  | arg => arg

/-- Fill one node's arguments. -/
def fillNode (valuation : Valuation) (node : ProgramNode) : ProgramNode :=
  { node with args := node.args.map (fillArg valuation) }

/-- Fill a whole program: simultaneous substitution across every
    node. -/
def fillProgram (valuation : Valuation)
    (nodes : List ProgramNode) : List ProgramNode :=
  nodes.map (fillNode valuation)

/-! ## Requirements and provision — the Effect dependency correspondence

The pin fact (effect@4.0.0-rc.108, read in place): a service key is a
string (Context.ts:64-68); the environment is a base map plus an
ordered overlay chain of provisions, looked up newest-first and
flattened by folding oldest-to-newest with overwrite
(Context.ts:478-546); merge keeps the later side's binding
(Context.ts:1123-1181); layer construction is memoized by object
reference (Layer.ts:432). The model carries that dependency algebra
at kernel sorts: requirements are a program's unfilled holes (the R
channel read at data level), provision events are a newest-first
chain folded into a valuation, and providing is filling. What the
kernel upgrades: keys are digests, not strings, and memo identity is
content, not reference. -/

/-- Bind one provision over a valuation: the new binding shadows. -/
def Valuation.override (valuation : Valuation) (hole value : Nat) :
    Valuation :=
  fun name => if name == hole then some value else valuation name

/-- The environment a provision chain builds. Events are newest first
    (the house ledger orientation, and the overlay chain's); each
    event shadows everything older beneath it. -/
def provisionFold : List (Nat × Nat) -> Valuation
  | [] => Valuation.empty
  | event :: rest => (provisionFold rest).override event.1 event.2

/-- The newest event at a hole: the overlay chain's first match. -/
def firstProvision (events : List (Nat × Nat)) (hole : Nat) :
    Option Nat :=
  (events.find? (fun event => hole == event.1)).map (fun event => event.2)

/-- The holes one argument still requires. -/
def argRequires : RawArg -> List Nat
  | .hole name => [name]
  | _ => []

/-- The requirement set of a program: every hole its nodes still
    carry. A closed program requires nothing — the R = never
    correspondence. -/
def requiresOf (nodes : List ProgramNode) : List Nat :=
  nodes.flatMap (fun node => node.args.flatMap argRequires)

/-- A provision chain with its order made explicit data: each event
    becomes a positioned fact (position, hole, value), newest events
    at the greatest positions. Positioned, the facts are a set — union
    ACI, arrival-order-free — and the environment is a derived read,
    the directory's greatest-token shape at the valuation carrier. -/
def positionedOf : List (Nat × Nat) -> List (Nat × Nat × Nat)
  | [] => []
  | event :: rest => (rest.length + 1, event.1, event.2) :: positionedOf rest

/-- The greatest-position binding at a hole: replacement only on a
    strictly greater position, so no tie is decided here — with
    journal-assigned positions no tie exists to decide. -/
def greatestAt (facts : List (Nat × Nat × Nat)) (hole : Nat) :
    Option (Nat × Nat) :=
  facts.foldr
    (fun fact best =>
      if hole == fact.2.1 then
        match best with
        | none => some (fact.1, fact.2.2)
        | some prior =>
            if prior.1 < fact.1 then some (fact.1, fact.2.2)
            else some prior
      else best)
    none

namespace Provision

/-- Two arrival orders of one disjoint provision pair. -/
def disjointOrderOne : List (Nat × Nat) := [(1, 10), (2, 20)]

/-- The same disjoint pair, other order. -/
def disjointOrderTwo : List (Nat × Nat) := [(2, 20), (1, 10)]

/-- Two arrival orders of an overlapping pair: both events bind
    hole 1, so order decides — outside the disjointness premise the
    environment is schedule-dependent. -/
def overlapOrderOne : List (Nat × Nat) := [(1, 10), (1, 99)]

/-- The overlapping pair, other order. -/
def overlapOrderTwo : List (Nat × Nat) := [(1, 99), (1, 10)]

end Provision

/-! ## The abstract world

Semantics against abstract carriers: any ACI merge for the monotone
plane, list membership for the catalog and the landed set, the head
as a position count. The named instantiation obligations tie these
hypotheses to the fabric's concrete constructs (cell merge for the
evidence carrier, the register model for landing) without importing
them — the correspondence is cited at the seam, never restated. -/

/-- The derived order of a join operation: `a` is at or below `b` when
    joining adds nothing. -/
def supLe {alpha : Type} (sup : alpha -> alpha -> alpha)
    (left right : alpha) : Prop :=
  sup left right = right

/-- The abstract world a kernel sentence acts on: one evidence carrier
    standing for the whole monotone plane, the admitted catalog, the
    landed-outcome set, and the journal head. Writs are per-connection
    facts, not world state, so spawn moves nothing here. -/
structure World (Evidence : Type) where
  evidence : Evidence
  catalog : List Ref
  landed : List Nat
  head : Nat

/-- Componentwise world growth: evidence in the derived join order,
    catalog and landed by membership, the head by position. -/
structure World.Le {Evidence : Type}
    (merge : Evidence -> Evidence -> Evidence)
    (before after : World Evidence) : Prop where
  evidence : supLe merge before.evidence after.evidence
  catalog : forall entry, entry ∈ before.catalog -> entry ∈ after.catalog
  landed : forall register, register ∈ before.landed ->
    register ∈ after.landed
  head : before.head <= after.head

/-- Interpret one intrinsic sentence against the abstract world. The
    identity generators read; the monotone generators join and append;
    `decide` lands at most one outcome per register — the dedup is the
    register invariant package cited at the seam, not re-proven here.
    Nothing shrinks: the kernel has no constructor whose meaning
    forgets. -/
def interp {Evidence : Type} (merge : Evidence -> Evidence -> Evidence)
    (contribution : Value -> Evidence) :
    Act -> World Evidence -> World Evidence
  | .declare kind value _, world =>
      { world with catalog := (kind, value.bytes) :: world.catalog }
  | .resolve _ _, world => world
  | .emit _ body, world =>
      { world with
          evidence := merge world.evidence (contribution body)
          head := world.head + 1 }
  | .join _ body, world =>
      { world with evidence := merge world.evidence (contribution body) }
  | .fold _ _ _ _, world => world
  | .decide register _ _, world =>
      if register.id ∈ world.landed then world
      else { world with landed := register.id :: world.landed }
  | .trigger _ _, world => world
  | .spawn _ _, world => world

/-! ## The composed execution shape

The replay obligation's statement vocabulary: an execution record
assigns an outcome to every node of an admitted program, reached
through an assembly hop, a resumption hop, and a landing hop. The
composition law over this shape is stated in the laws file and
deliberately left unproven there. -/

/-- A record replays a program against a journal when outcomes exist
    exactly at the program's nodes, and every node's outcome is
    reached by its three hops. -/
def ComposedExecution
    (assemble : List ProgramNode -> List Value -> Nat -> Value -> Prop)
    (resume : List Value -> Nat -> Value -> Prop)
    (land : Nat -> Value -> Value -> Value -> Prop)
    (nodes : List ProgramNode) (journal : List Value)
    (outcomes : Nat -> Option Value) : Prop :=
  (forall name, (exists value, outcomes name = some value) ->
    exists node, node ∈ nodes /\ node.name = name) /\
  forall node, node ∈ nodes ->
    exists context state outcome,
      assemble nodes journal node.name context /\
      resume journal node.name state /\
      land node.name context state outcome /\
      outcomes node.name = some outcome

end Kernel
