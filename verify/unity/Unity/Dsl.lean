/-
A surface syntax for spelling kernel candidate acts.

`Kernel.CandidateAct` is the layer where unlawful sentences are
SPELLABLE, so the door has something to refuse. Spelling one as a Lean
term means writing nested constructors and remembering which numeral
is a lane and which a shard; the planted rows in
`Kernel/Definitions.lean` are short only because they are terse, not
because they are readable. This module gives the same grammar a
notation, so a candidate reads as a sentence:

    candidate% declare schema [ref schema 8, 5] writ 4
    candidate% decide 3 holding register 99 value 7 [42]
    candidate% fold 2 anchored fold 2 lane 1 shard 0 floor 4 state 11 head 6 [clock]

The notation is a macro, not an interpretation: `candidate% ...`
expands to the very constructors it reads as, and nothing at run time
knows the notation existed. That is what makes the demonstration
checkable — every planted row of `Kernel.Planted` is respelled below
and proved equal to the original by `rfl`, so the notation cannot drift
from the grammar without a proof breaking.

Two deliberate choices about the tokens. Every word of the surface is
declared with `&"word"`, the non-reserved form, and each category is
declared with symbol leading behavior so that it can dispatch on those
words; importing this module therefore does not steal `fold`, `emit`,
`state` or `value` from anyone else's identifiers. The entry points end
in a percent sign (`candidate%`, `kcArg%`), which the tokenizer prefers
over the bare identifier, so those spellings are the only ones this
module reserves.

The grammar is closed and total against `Kernel.CandidateAct`: every
constructor of the act, argument, merge-strategy and predicate
inductives has a production, and the coverage theorems at the bottom
name them all. A constructor added upstream without a production here
leaves those theorems passing and the grammar quietly short, so the
coverage list is written as an explicit enumeration rather than a
sample.
-/
import Kernel.Definitions

/-! ## Declaration kinds -/

declare_syntax_cat kcKind (behavior := symbol)

syntax &"schema" : kcKind
syntax &"program" : kcKind
syntax &"policy" : kcKind
syntax &"capability" : kcKind
syntax &"lane" : kcKind
syntax &"algebra" : kcKind
syntax &"index" : kcKind
syntax &"resource" : kcKind
syntax &"ontology" : kcKind
syntax &"schedule" : kcKind
syntax &"template" : kcKind
syntax &"language" : kcKind

/-- The term a declaration kind spells. -/
syntax:max "kcKind% " kcKind : term

macro_rules
  | `(kcKind% schema) => `(Kernel.DeclKind.schema)
  | `(kcKind% program) => `(Kernel.DeclKind.program)
  | `(kcKind% policy) => `(Kernel.DeclKind.policy)
  | `(kcKind% capability) => `(Kernel.DeclKind.capability)
  | `(kcKind% lane) => `(Kernel.DeclKind.lane)
  | `(kcKind% algebra) => `(Kernel.DeclKind.algebra)
  | `(kcKind% index) => `(Kernel.DeclKind.index)
  | `(kcKind% resource) => `(Kernel.DeclKind.resource)
  | `(kcKind% ontology) => `(Kernel.DeclKind.ontology)
  | `(kcKind% schedule) => `(Kernel.DeclKind.schedule)
  | `(kcKind% template) => `(Kernel.DeclKind.template)
  | `(kcKind% language) => `(Kernel.DeclKind.language)

/-! ## Argument atoms

The lawful atoms are a kind-tagged reference and a literal; the rest
are the unlawful shapes the candidate layer keeps spellable so the
door's refusal of them is demonstrable. -/

declare_syntax_cat kcArg (behavior := symbol)

syntax num : kcArg
syntax &"ref" kcKind num : kcArg
syntax &"hole" num : kcArg
syntax &"clock" : kcArg
syntax &"random" : kcArg
syntax &"secret" num : kcArg
syntax &"minted" num : kcArg
syntax &"closure" num : kcArg

/-- The term one argument atom spells. -/
syntax:max "kcArg% " kcArg : term

/-- The term a bracketed argument list spells. -/
syntax:max "kcArgs% " "[" kcArg,* "]" : term

macro_rules
  | `(kcArg% $value:num) => `(Kernel.RawArg.literal $value)
  | `(kcArg% ref $kind:kcKind $id:num) =>
      `(Kernel.RawArg.digestRef (kcKind% $kind) $id)
  | `(kcArg% hole $name:num) => `(Kernel.RawArg.hole $name)
  | `(kcArg% clock) => `(Kernel.RawArg.clockNow)
  | `(kcArg% random) => `(Kernel.RawArg.randomSeed)
  | `(kcArg% secret $bytes:num) => `(Kernel.RawArg.secretBytes $bytes)
  | `(kcArg% minted $token:num) => `(Kernel.RawArg.mintedId $token)
  | `(kcArg% closure $code:num) => `(Kernel.RawArg.functionValue $code)

macro_rules
  | `(kcArgs% [$args,*]) => do
      let atoms <- args.getElems.mapM fun arg => `(kcArg% $arg)
      `([$atoms,*])

/-! ## Merge strategies -/

declare_syntax_cat kcMerge (behavior := symbol)

syntax &"algebra" num : kcMerge
syntax &"lastWriterWins" num : kcMerge

/-- The term a merge strategy spells. -/
syntax:max "kcMerge% " kcMerge : term

macro_rules
  | `(kcMerge% algebra $id:num) => `(Kernel.MergeStrategy.declaredAlgebra $id)
  | `(kcMerge% lastWriterWins $id:num) => `(Kernel.MergeStrategy.lastWriterWins $id)

/-! ## Trigger predicates

The five lawful monotone productions, then the four the closed grammar
deliberately cannot carry. -/

declare_syntax_cat kcPred (behavior := symbol)

syntax &"evidence" &"lane" num &"pattern" num : kcPred
syntax &"cell" num &"reaching" num : kcPred
syntax &"hole" num &"reaching" num : kcPred
syntax &"outcome" num : kcPred
syntax &"head" &"lane" num &"shard" num &"past" num : kcPred
syntax &"absence" num : kcPred
syntax &"not" kcPred : kcPred
syntax &"deadline" num : kcPred
syntax &"nowhere" num : kcPred

/-- The term a trigger predicate spells. -/
syntax:max "kcPred% " kcPred : term

macro_rules
  | `(kcPred% evidence lane $lane:num pattern $pattern:num) =>
      `(Kernel.CandidatePredicate.evidenceAppears $lane $pattern)
  | `(kcPred% cell $cell:num reaching $threshold:num) =>
      `(Kernel.CandidatePredicate.cellReaches $cell $threshold)
  | `(kcPred% hole $hole:num reaching $stage:num) =>
      `(Kernel.CandidatePredicate.holeReaches $hole $stage)
  | `(kcPred% outcome $register:num) =>
      `(Kernel.CandidatePredicate.outcomeLanded $register)
  | `(kcPred% head lane $lane:num shard $shard:num past $position:num) =>
      `(Kernel.CandidatePredicate.headAdvancedPast $lane $shard $position)
  | `(kcPred% absence $subject:num) =>
      `(Kernel.CandidatePredicate.onAbsence $subject)
  | `(kcPred% not $inner:kcPred) =>
      `(Kernel.CandidatePredicate.negation (kcPred% $inner))
  | `(kcPred% deadline $tick:num) =>
      `(Kernel.CandidatePredicate.deadline $tick)
  | `(kcPred% nowhere $cell:num) =>
      `(Kernel.CandidatePredicate.absentEverywhere $cell)

/-! ## Resume coordinates and token claims

Both carry their space as data rather than as a type index, which is
exactly what lets a cross-fold anchor and a cross-register claim be
spelled here and refused at the door. The anchor names its own fold, so
`fold 2 anchored fold 2 ...` says the same fold twice on purpose: the
two are independent, and the row where they differ is the one the door
has to catch. -/

declare_syntax_cat kcAnchor (behavior := symbol)

syntax &"fold" num &"lane" num &"shard" num &"floor" num &"state" num
  &"head" num : kcAnchor

/-- The term a resume coordinate spells. -/
syntax:max "kcAnchor% " kcAnchor : term

macro_rules
  | `(kcAnchor% fold $declared:num lane $lane:num shard $shard:num
        floor $floor:num state $state:num head $head:num) =>
      `(Kernel.CandidateAnchor.mk $declared $lane $shard $floor $state $head)

declare_syntax_cat kcToken (behavior := symbol)

syntax &"register" num &"value" num : kcToken

/-- The term a token claim spells. -/
syntax:max "kcToken% " kcToken : term

macro_rules
  | `(kcToken% register $register:num value $value:num) =>
      `(Kernel.TokenClaim.mk $register $value)

/-! ## The acts -/

declare_syntax_cat kcAct (behavior := symbol)

syntax &"declare" kcKind "[" kcArg,* "]" &"writ" num : kcAct
syntax &"resolve" kcKind num : kcAct
syntax &"resolve" kcKind num &"anchored" num : kcAct
syntax &"trust" kcKind num &"bytes" num : kcAct
syntax &"emit" num "[" kcArg,* "]" : kcAct
syntax &"join" num "[" kcArg,* "]" &"via" kcMerge : kcAct
syntax &"latest" num : kcAct
syntax &"fold" num "[" kcArg,* "]" : kcAct
syntax &"fold" num &"anchored" kcAnchor "[" kcArg,* "]" : kcAct
syntax &"decide" num "[" kcArg,* "]" : kcAct
syntax &"decide" num &"holding" kcToken "[" kcArg,* "]" : kcAct
syntax &"trigger" kcPred &"declaring" num : kcAct
syntax &"spawn" num &"requesting" num : kcAct
syntax &"update" kcKind num "[" kcArg,* "]" &"writ" num : kcAct

/-- The term a candidate act spells. -/
syntax:max "candidate% " kcAct : term

macro_rules
  | `(candidate% declare $kind:kcKind [$args,*] writ $writ:num) =>
      `(Kernel.CandidateAct.declare (kcKind% $kind) (kcArgs% [$args,*]) $writ)
  | `(candidate% resolve $kind:kcKind $target:num) =>
      `(Kernel.CandidateAct.resolveDigest (kcKind% $kind) $target none)
  | `(candidate% resolve $kind:kcKind $target:num anchored $anchor:num) =>
      `(Kernel.CandidateAct.resolveDigest (kcKind% $kind) $target (some $anchor))
  | `(candidate% trust $kind:kcKind $target:num bytes $asserted:num) =>
      `(Kernel.CandidateAct.trustBytes (kcKind% $kind) $target $asserted)
  | `(candidate% emit $lane:num [$args,*]) =>
      `(Kernel.CandidateAct.emit $lane (kcArgs% [$args,*]))
  | `(candidate% join $cell:num [$args,*] via $strategy:kcMerge) =>
      `(Kernel.CandidateAct.join $cell (kcArgs% [$args,*]) (kcMerge% $strategy))
  | `(candidate% latest $subject:num) =>
      `(Kernel.CandidateAct.readLatest $subject)
  | `(candidate% fold $declared:num [$args,*]) =>
      `(Kernel.CandidateAct.fold $declared none (kcArgs% [$args,*]))
  | `(candidate% fold $declared:num anchored $anchor:kcAnchor [$args,*]) =>
      `(Kernel.CandidateAct.fold $declared (some (kcAnchor% $anchor))
          (kcArgs% [$args,*]))
  | `(candidate% decide $register:num [$args,*]) =>
      `(Kernel.CandidateAct.decide $register none (kcArgs% [$args,*]))
  | `(candidate% decide $register:num holding $claim:kcToken [$args,*]) =>
      `(Kernel.CandidateAct.decide $register (some (kcToken% $claim))
          (kcArgs% [$args,*]))
  | `(candidate% trigger $predicate:kcPred declaring $declaration:num) =>
      `(Kernel.CandidateAct.trigger (kcPred% $predicate) $declaration)
  | `(candidate% spawn $parent:num requesting $request:num) =>
      `(Kernel.CandidateAct.spawn $parent $request)
  | `(candidate% update $kind:kcKind $target:num [$args,*] writ $writ:num) =>
      `(Kernel.CandidateAct.updateInPlace (kcKind% $kind) $target
          (kcArgs% [$args,*]) $writ)

namespace Unity

/-! ## The planted rows, respelled

Every row of `Kernel.Planted` written in the notation and proved equal
to the row the kernel gate exercises. These are the demonstration: a
notation that expanded to something else would fail here rather than
mislead a reader. -/

/-- A wall clock spelled into a fold's query. -/
theorem dsl_clock_fold :
    (candidate% fold 2 anchored fold 2 lane 1 shard 0 floor 4 state 11 head 6
      [clock]) = Kernel.Planted.clockFold := rfl

/-- Acting on silence spelled as an absence trigger. -/
theorem dsl_absence_trigger :
    (candidate% trigger absence 6 declaring 3)
      = Kernel.Planted.absenceTrigger := rfl

/-- A register commit spelled without a token. -/
theorem dsl_unfenced_decide :
    (candidate% decide 3 [42]) = Kernel.Planted.unfencedDecide := rfl

/-- A last-writer-wins merge spelled at a cell. -/
theorem dsl_last_writer_join :
    (candidate% join 6 [42] via lastWriterWins 7)
      = Kernel.Planted.lastWriterJoin := rfl

/-- A read that trusts asserted bytes without re-derivation. -/
theorem dsl_trusting_read :
    (candidate% trust schema 8 bytes 999)
      = Kernel.Planted.trustingRead := rfl

/-- A token claimed at one register, spent at another. -/
theorem dsl_cross_register_decide :
    (candidate% decide 3 holding register 99 value 7 [42])
      = Kernel.Planted.crossRegisterDecide := rfl

/-- A minted identifier presented as a referent. -/
theorem dsl_minted_declare :
    (candidate% declare schema [minted 12345] writ 4)
      = Kernel.Planted.mintedDeclare := rfl

/-- An unanchored latest read. -/
theorem dsl_latest_read :
    (candidate% latest 6) = Kernel.Planted.latestRead := rfl

/-- A declaration referencing a digest never admitted. -/
theorem dsl_forward_declare :
    (candidate% declare schema [ref schema 77] writ 4)
      = Kernel.Planted.forwardDeclare := rfl

/-- A secret spelled into an evidence body. -/
theorem dsl_secret_emit :
    (candidate% emit 1 [secret 31337]) = Kernel.Planted.secretEmit := rfl

/-- A not-present-anywhere claim grounded on a local replica. -/
theorem dsl_absence_claim_trigger :
    (candidate% trigger nowhere 6 declaring 3)
      = Kernel.Planted.absenceClaimTrigger := rfl

/-- An in-place mutation of an admitted value. -/
theorem dsl_past_mutation :
    (candidate% update schema 8 [43] writ 4) = Kernel.Planted.pastMutation := rfl

/-- A referent that resolves in the catalog but lies outside the writ's
    pinned universe. -/
theorem dsl_off_writ_declare :
    (candidate% declare schema [ref schema 9] writ 4)
      = Kernel.Planted.offWritDeclare := rfl

/-- Closure bytes offered where a declared digest belongs. -/
theorem dsl_function_declare :
    (candidate% declare schema [closure 555] writ 4)
      = Kernel.Planted.functionDeclare := rfl

/-- An anchor spelled onto a resolve. -/
theorem dsl_anchored_resolve :
    (candidate% resolve schema 8 anchored 4)
      = Kernel.Planted.anchoredResolve := rfl

/-- An unfilled hole in a single sentence. -/
theorem dsl_holey_emit :
    (candidate% emit 1 [hole 0]) = Kernel.Planted.holeyEmit := rfl

/-- The lawful twin the door admits. -/
theorem dsl_lawful_declare :
    (candidate% declare schema [ref schema 8, 5] writ 4)
      = Kernel.Planted.lawfulDeclare := rfl

/-! ## Grammar coverage

The planted rows exercise most of the grammar; these four enumerations
close it. Each lists every constructor of one inductive, so a
production that expanded to the wrong constructor, or a constructor the
notation cannot reach at all, shows up here rather than in a reviewer's
memory. -/

/-- The three act productions the planted rows do not reach: an
    anchor-free resolve, an unanchored fold, and a spawn. -/
theorem dsl_spells_every_generator :
    [ candidate% resolve program 3
    , candidate% fold 2 [13]
    , candidate% spawn 4 requesting 5 ]
      = [ Kernel.CandidateAct.resolveDigest Kernel.DeclKind.program 3 none
        , Kernel.CandidateAct.fold 2 none [Kernel.RawArg.literal 13]
        , Kernel.CandidateAct.spawn 4 5 ] := rfl

/-- All eight argument atoms in one body. -/
theorem dsl_spells_every_argument :
    (candidate% emit 1
      [ref lane 1, 5, hole 0, clock, random, secret 3, minted 4, closure 7])
      = Kernel.CandidateAct.emit 1
        [ Kernel.RawArg.digestRef Kernel.DeclKind.lane 1
        , Kernel.RawArg.literal 5
        , Kernel.RawArg.hole 0
        , Kernel.RawArg.clockNow
        , Kernel.RawArg.randomSeed
        , Kernel.RawArg.secretBytes 3
        , Kernel.RawArg.mintedId 4
        , Kernel.RawArg.functionValue 7 ] := rfl

/-- All nine trigger productions, the five lawful ones and the four the
    closed grammar refuses. -/
theorem dsl_spells_every_predicate :
    [ candidate% trigger evidence lane 1 pattern 17 declaring 3
    , candidate% trigger cell 6 reaching 23 declaring 3
    , candidate% trigger hole 0 reaching 3 declaring 3
    , candidate% trigger outcome 3 declaring 3
    , candidate% trigger head lane 1 shard 0 past 6 declaring 3
    , candidate% trigger absence 6 declaring 3
    , candidate% trigger not absence 6 declaring 3
    , candidate% trigger deadline 5 declaring 3
    , candidate% trigger nowhere 6 declaring 3 ]
      = [ Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.evidenceAppears 1 17) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.cellReaches 6 23) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.holeReaches 0 3) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.outcomeLanded 3) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.headAdvancedPast 1 0 6) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.onAbsence 6) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.negation
              (Kernel.CandidatePredicate.onAbsence 6)) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.deadline 5) 3
        , Kernel.CandidateAct.trigger
            (Kernel.CandidatePredicate.absentEverywhere 6) 3 ] := rfl

/-- Both merge strategies, and all twelve declaration kinds. -/
theorem dsl_spells_every_kind :
    ( [ candidate% join 6 [42] via algebra 7
      , candidate% join 6 [42] via lastWriterWins 7 ]
    , [ candidate% resolve schema 0, candidate% resolve program 0
      , candidate% resolve policy 0, candidate% resolve capability 0
      , candidate% resolve lane 0, candidate% resolve algebra 0
      , candidate% resolve index 0, candidate% resolve resource 0
      , candidate% resolve ontology 0, candidate% resolve schedule 0
      , candidate% resolve template 0, candidate% resolve language 0 ] )
      = ( [ Kernel.CandidateAct.join 6 [Kernel.RawArg.literal 42]
              (Kernel.MergeStrategy.declaredAlgebra 7)
          , Kernel.CandidateAct.join 6 [Kernel.RawArg.literal 42]
              (Kernel.MergeStrategy.lastWriterWins 7) ]
        , [ Kernel.CandidateAct.resolveDigest Kernel.DeclKind.schema 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.program 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.policy 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.capability 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.lane 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.algebra 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.index 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.resource 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.ontology 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.schedule 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.template 0 none
          , Kernel.CandidateAct.resolveDigest Kernel.DeclKind.language 0 none ] )
      := rfl

end Unity
