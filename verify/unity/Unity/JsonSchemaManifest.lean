/-
The reviewed wire-convention manifest for the MCP tool-schema projection.

## What this file is

A REVIEWED DATUM, on the pattern of the runtime refusal roster: a small table
a person ratifies, read by a generator, never computed. It carries the four
things the tool schema needs and the kernel model cannot say —

  * the NAMING MAP: which wire property each model field is spelled as, and
    under which of five rules;
  * the CARRIER MAP: which JSON fragment each model sort travels as;
  * the TRIGGER CORRESPONDENCE: which flattened slots each production of the
    closed trigger grammar occupies;
  * the PROSE: eight tool paragraphs, thirty-four field paragraphs and three
    envelope paragraphs, together with the law-citation set they name.

Everything else the emitted schema says is DERIVED from the projection AST by
`Unity.JsonSchema`: the tool set and its order, every property and its order,
which properties are required, every enum's members and their order, and every
carrier lookup. This file states no shape it could have read, and the printer
refuses a row it cannot reconcile against the walked environment.

## The ruling that homes it

The operator ruled on 2026-08-19 that the wire-convention table lives in a
reviewed manifest beside the printer, with the MODEL named as its eventual
destination: once the kernel carries constructor-level and field-level
docstrings, the prose below is read out of the environment and these rows
shrink to the naming and carrier decisions that remain genuinely conventional.
Until then the table is here, under review, rather than inside an emitter
where nobody would find it. The prose rows are the reviewed datum in the
strongest sense — the model carries no source for a single one of them.

## The register discipline this file is held to

Root law 10 applies to the emitted artifact as an official surface: nothing
rendered outward carries a ticket id, a command invocation, a filesystem path
or a dev parenthetical. A rendered surface that must say where it came from
says a digest, and the emitted header says two — the projection AST it read
and the canonical form of this manifest. Forty-three of the forty-five
paragraphs below were carried across from the hand-derived sketch verbatim and
were scanned for tracking artifacts; none was present and none was removed.
The two exceptions are the file header and the digest paragraph, written fresh
because the sketch's header pinned a retired numeric domain and named a
filesystem location, and its digest paragraph pinned the model's own short
identity labels as a wire spelling. Both replacements are stated at the rows
themselves.

## The alphabet

Prose rows are carried here as reviewed, em dash included, and the printer
folds them through the interchange's ASCII table. A code point the table does
not name reddens the emission rather than reaching the wire.
-/
import Projections.Ast

namespace Unity.JsonSchemaManifest

/-- How a wire property's name is reached from the model field it carries.
    Five rules cover every row, and a sixth would be a convention nobody
    agreed to. -/
inductive NamingRule where
  /-- The wire name is the model field's name. -/
  | identity
  /-- The model field's name with `_digest` appended. -/
  | digestSuffix
  /-- A compound self-descriptive name the model does not carry. -/
  | rename
  /-- One wire slot per member of a structure-sorted field. -/
  | flatten
  /-- A wire slot with no model field, sourced from a model declaration the
      door computes rather than carries. -/
  | derived
deriving Repr, BEq

/-- The rule's spelling, for the manifest's own rendered form. -/
def NamingRule.wire : NamingRule -> String
  | .identity => "identity"
  | .digestSuffix => "digest-suffix"
  | .rename => "rename"
  | .flatten => "flatten"
  | .derived => "derived"

/--
The numeric domain of an identity coordinate on the wire.

`ceiling` exists so that a ceiling is REFUSED rather than absent. DEV-807
ruled estate integers exact and unbounded, and the conformance corpus carries
a gated witness above the retired double-safe range; a schema that re-narrows
the domain cannot spell a corpus-legal identity. The only lawful value here is
`none`, and `Unity.JsonSchema` reddens on anything else, naming the ruled
domain. A reviewer who writes a ceiling back gets a refusal, not a wire.
-/
structure IntegerDomain where
  minimum : Nat
  ceiling : Option Nat
deriving Repr, BEq

/-- The JSON fragment a model sort travels as. The closed set: the emitted
    vocabulary has no `number`, no `boolean`, no `array` and no `null`. -/
inductive Carrier where
  /-- `{"type": "string"}` — opaque, no pattern and no length. -/
  | opaqueString
  /-- `{"type": "string", "pattern": ...}` — the digest spelling. -/
  | digestString
  /-- `{"type": "integer", "minimum": ...}` — exact, unbounded above. -/
  | exactInteger (domain : IntegerDomain)
  /-- `{"type": "string", "enum": [...]}` — members read off the named
      declaration's constructors, in declaration order. -/
  | enumeration (declaration : String)
deriving Repr, BEq

/-- Where a wire property's value comes from in the model. -/
inductive Source where
  /-- A field of a named constructor, reached by a dotted path through the
      structure-sorted fields on the way. -/
  | field (declaration constructorName : String) (path : List String)
  /-- The constructors of a named declaration, with no field carrying it: the
      door computes this value from the refusal reason rather than reading it
      off a record. -/
  | enumerationOf (declaration : String)
deriving Repr, BEq

/-- One wire property. -/
structure PropertyRow where
  tool : String
  wireName : String
  source : Source
  rule : NamingRule
  optional : Bool
  description : Option String
deriving Repr, BEq

/-- One tool: the `Act` constructor it projects, its wire name, and its
    reviewed paragraph. -/
structure ToolRow where
  constructorName : String
  wireName : String
  description : String
deriving Repr, BEq

/-- One production of the closed trigger grammar and the flattened slots it
    occupies. The printer reconciles this against the naming map: a slot list
    that drifts from the rows is a refusal, not a stale comment. -/
structure TriggerRow where
  production : String
  constructorName : String
  slots : List String
deriving Repr, BEq

/-- Whether a cited law resolves in the gated citation ledger. -/
inductive CitationStatus where
  /-- Present in the ledger. -/
  | ledgered
  /-- Cited by reviewed prose and absent from the ledger. Listed rather than
      laundered: the gate names these and stays green, because the repair is
      the model's citation growth and not this projection's to make. -/
  | unledgered
deriving Repr, BEq

def CitationStatus.wire : CitationStatus -> String
  | .ledgered => "LEDGERED"
  | .unledgered => "UNLEDGERED"

/-- One law the reviewed prose cites, and the tools that cite it. -/
structure CitationRow where
  law : String
  status : CitationStatus
  citedBy : List String
deriving Repr, BEq

/-! ## The tool-name rule -/

/-- One flat tool per `Act` constructor, named by this prefix and the
    constructor's own name. Eight tools; no `oneOf`. -/
def toolPrefix : String := "kernel_"

/-! ## The envelope prose

Three paragraphs with no model source. The header and the digest paragraph are
written here rather than carried across from the sketch: the sketch's header
pinned the retired I-JSON safe range and named a filesystem location, and its
digest paragraph pinned the model's own short identity labels as the wire
spelling. Both are corrected below, and both corrections are ruled rather than
chosen — DEV-807 for the domain, the running system's own digest width for the
pattern.
-/

/-- The file header. Carries no path, no invocation and no ticket: the
    provenance it states is two digests, appended by the printer. -/
def headerComment : String :=
  "The kernel language projected as MCP tool input schemas, generated from " ++
  "the kernel model's projection AST and the reviewed wire-convention " ++
  "manifest. Shapes follow the ruled wire leans: eight flat tools, no oneOf, " ++
  "compound self-descriptive field names (a field is named for the value it " ++
  "carries), digests as prefixed opaque strings with pattern, integers only " ++
  "and EXACT (an identity coordinate is an arbitrary-precision non-negative " ++
  "integer with no ceiling; a client that parses one as a double loses " ++
  "values the canonical grammar requires; no floats exist in that grammar). " ++
  "Constraints beyond type/enum may not be sampler-enforced by every " ++
  "provider; the admission door enforces them all, and a violation returns " ++
  "the taught refusal (see refusal_result)."

/-- The digest paragraph. -/
def digestComment : String :=
  "Every digest on the wire is the running system's spelling: the literal " ++
  "prefix sha256: followed by exactly 64 lowercase hexadecimal characters. " ++
  "The model's own identity labels are short ordinals and are a modelling " ++
  "convenience, never a wire spelling."

/-- The digest pattern the whole projection uses. -/
def digestPattern : String := "^sha256:[0-9a-f]{64}$"

/-- The refusal-shape paragraph, carried across verbatim. -/
def refusalComment : String :=
  "Every tool returns either its admitted result or this refusal shape. Refusal parity: the door never refuses without the law it defends and the taught repair; applicability marks whether the repair is a mechanical rewrite of the refused call (machine-applicable) or needs information the call does not carry (advisory)."

/-! ## The tool table

Eight rows, one per `Act` constructor, in no particular order: the printer
emits them in the model's declaration order, so a reordering here cannot move
the artifact. The paragraphs are the reviewed datum.
-/

/-- The eight tools and their reviewed paragraphs. -/
def tools : List ToolRow :=
  [ { constructorName := "declare", wireName := "kernel_declare"
    , description := "Mint an immutable value through the certifier (license: c7_pin_well_founded — references resolve only to already-admitted digests). The value's canonical bytes become its digest, its name forever. There is no update: revision is a successor declaration pinning its predecessor." }
  , { constructorName := "resolve", wireName := "kernel_resolve"
    , description := "Digest to value, verify-on-read (license: content addressing — the decode re-derives the digest of what it fetched and refuses on mismatch). No anchor parameter exists: a digest names one value forever, so nothing an anchor could change. Head-relative reads are kernel_fold." }
  , { constructorName := "emit", wireName := "kernel_emit"
    , description := "Attributed evidence onto a lane (license: f2_trace_invariant — duplication and reordering of deliveries cannot move the folded state). Not a send: no point-to-point primitive exists; lanes mean, subjects route." }
  , { constructorName := "join", wireName := "kernel_join"
    , description := "Merge a contribution into a lattice cell (license: f1_cell_merge_aci and the join-semilattice package — associative, commutative, idempotent, so arrival order and duplication cannot matter). No ordering parameter and no conflict strategy exist; idempotent join leaves nothing to choose (refusal: last-writer-wins, machine-applicable repair)." }
  , { constructorName := "fold", wireName := "kernel_fold"
    , description := "Read reduced state at a checkpoint (license: f3_resume_exact for resumption; f11_query_deterministic — the answer is a function of support and query alone). Every head-relative read is this tool: search, views, rosters, audits. The anchor names the position the answer is true at; it is never wrong later, only earlier." }
  , { constructorName := "decide", wireName := "kernel_decide"
    , description := "The fenced one-winner commit (license: at_most_one_landed_commit over monotone tokens — at most one outcome lands per register). The one priced act. At most one landed outcome is not at most one external side effect." }
  , { constructorName := "trigger", wireName := "kernel_trigger"
    , description := "Deposit a standing monotone reaction (license: f10_stability — a predicate that holds at a state holds at every grown state; an enabled firing never un-fires). Five productions exist; absence, negation, and deadline are unspellable (refusal: absence-trigger)." }
  , { constructorName := "spawn", wireName := "kernel_spawn"
    , description := "Derive a narrower writ (license: f9_policy_meet_semilattice and f9_tree_attenuation — the child is the meet of parent and request, and every descendant stays under the root grant). An escalating request is clamped, not refused." } ]

/-! ## The naming map

Thirty-six rows over thirty-six distinct wire properties: thirty-three across
the eight tools (thirty-two distinct properties -- `kernel_trigger`'s
`lane_digest` is reached by two productions and carries two rows) and four on
the refusal shape.

Every row is reconciled against the walked environment in both directions. A
row whose path does not resolve reddens; a model field of a projected
constructor that no row names reddens. That is the check a manifest with no
environment side cannot make, and it is the one the projection toolkit's own
name register learned to make the hard way.
-/

/-- The naming map. -/
def properties : List PropertyRow :=
  [ { tool := "kernel_declare"
    , wireName := "kind"
    , source := .field "Act" "declare" ["kind"]
    , rule := .identity
    , optional := false
    , description := some "The declaration kind the minted digest is branded with." }
  , { tool := "kernel_declare"
    , wireName := "value"
    , source := .field "Act" "declare" ["value"]
    , rule := .identity
    , optional := false
    , description := some "The value's canonical bytes. One canonical form exists; excess or non-canonical bytes refuse." }
  , { tool := "kernel_declare"
    , wireName := "writ_digest"
    , source := .field "Act" "declare" ["writ"]
    , rule := .digestSuffix
    , optional := false
    , description := some "Digest of the policy value this declaration acts under. Every referent inside value must lie in this writ's pinned universe (refusal: off-writ-referent)." }
  , { tool := "kernel_resolve"
    , wireName := "kind"
    , source := .field "Act" "resolve" ["kind"]
    , rule := .identity
    , optional := false
    , description := some "The declaration kind the digest is branded with; a kind/brand mismatch refuses (cross-sort-identifier)." }
  , { tool := "kernel_resolve"
    , wireName := "digest"
    , source := .field "Act" "resolve" ["target"]
    , rule := .rename
    , optional := false
    , description := some "The content address to resolve. Absence is retryable; a digest mismatch is structural." }
  , { tool := "kernel_emit"
    , wireName := "lane_digest"
    , source := .field "Act" "emit" ["lane"]
    , rule := .digestSuffix
    , optional := false
    , description := some "Digest of the declared evidence lane the envelope lands on." }
  , { tool := "kernel_emit"
    , wireName := "body"
    , source := .field "Act" "emit" ["body"]
    , rule := .identity
    , optional := false
    , description := some "The evidence body, canonical bytes. The envelope's message id is its digest, so redelivery is harmless." }
  , { tool := "kernel_join"
    , wireName := "cell_digest"
    , source := .field "Act" "join" ["cell"]
    , rule := .digestSuffix
    , optional := false
    , description := some "Digest of the declared cell resource whose ACI algebra governs the merge." }
  , { tool := "kernel_join"
    , wireName := "contribution"
    , source := .field "Act" "join" ["contribution"]
    , rule := .identity
    , optional := false
    , description := some "The contribution value, canonical bytes." }
  , { tool := "kernel_fold"
    , wireName := "reduction_digest"
    , source := .field "Act" "fold" ["declared"]
    , rule := .rename
    , optional := false
    , description := some "Digest of the declared reduction (kind: index) being read." }
  , { tool := "kernel_fold"
    , wireName := "lane_digest"
    , source := .field "Act" "fold" ["partition", "lane"]
    , rule := .flatten
    , optional := false
    , description := some "The lane whose partition the anchor coordinates name." }
  , { tool := "kernel_fold"
    , wireName := "shard"
    , source := .field "Act" "fold" ["partition", "shard"]
    , rule := .flatten
    , optional := false
    , description := some "The partition within the lane. Positions mean nothing across partitions." }
  , { tool := "kernel_fold"
    , wireName := "anchor_floor"
    , source := .field "Act" "fold" ["anchor", "floor"]
    , rule := .flatten
    , optional := false
    , description := some "The checkpoint floor position, within this partition only." }
  , { tool := "kernel_fold"
    , wireName := "anchor_state"
    , source := .field "Act" "fold" ["anchor", "state"]
    , rule := .flatten
    , optional := false
    , description := some "The state label at the floor, as the anchor fact recorded it." }
  , { tool := "kernel_fold"
    , wireName := "anchor_head"
    , source := .field "Act" "fold" ["anchor", "head"]
    , rule := .flatten
    , optional := false
    , description := some "The journal head the anchor observed, within this partition only." }
  , { tool := "kernel_fold"
    , wireName := "query"
    , source := .field "Act" "fold" ["query"]
    , rule := .identity
    , optional := false
    , description := some "The question, as declared data. A view passes a constant; any seed lives inside this value (refusal: ambient-query-input)." }
  , { tool := "kernel_decide"
    , wireName := "register_digest"
    , source := .field "Act" "decide" ["register"]
    , rule := .digestSuffix
    , optional := false
    , description := some "The work declaration digest that keys the register. No anonymous decision exists." }
  , { tool := "kernel_decide"
    , wireName := "token_fence"
    , source := .field "Act" "decide" ["token"]
    , rule := .rename
    , optional := false
    , description := some "The fencing token, meaningful at this register only. Committing without it, or across registers, refuses (unfenced-decide, cross-sort-identifier)." }
  , { tool := "kernel_decide"
    , wireName := "outcome"
    , source := .field "Act" "decide" ["outcome"]
    , rule := .identity
    , optional := false
    , description := some "The outcome value; the door decodes it against the capability's declared output schema." }
  , { tool := "kernel_trigger"
    , wireName := "production"
    , source := .field "Act" "trigger" ["predicate"]
    , rule := .flatten
    , optional := false
    , description := some "Which of the five monotone productions. Each uses its own slots below: evidence-appears uses lane_digest+pattern; cell-reaches uses cell_digest+threshold; hole-reaches uses hole+stage; outcome-landed uses register_digest; head-advanced-past uses lane_digest+shard+position." }
  , { tool := "kernel_trigger"
    , wireName := "declaration_digest"
    , source := .field "Act" "trigger" ["declaration"]
    , rule := .digestSuffix
    , optional := false
    , description := some "The declaration a firing hints at. Its landed claim dedups at the register." }
  , { tool := "kernel_spawn"
    , wireName := "parent_writ_digest"
    , source := .field "Act" "spawn" ["parent"]
    , rule := .rename
    , optional := false
    , description := some "The authority being attenuated." }
  , { tool := "kernel_spawn"
    , wireName := "request_writ_digest"
    , source := .field "Act" "spawn" ["request"]
    , rule := .rename
    , optional := false
    , description := some "The requested authority; the child is parent meet request." }
  , { tool := "kernel_trigger"
    , wireName := "lane_digest"
    , source := .field "KTriggerPredicate" "evidenceAppears" ["lane"]
    , rule := .digestSuffix
    , optional := true
    , description := some "evidence-appears, head-advanced-past." }
  , { tool := "kernel_trigger"
    , wireName := "pattern"
    , source := .field "KTriggerPredicate" "evidenceAppears" ["pattern"]
    , rule := .identity
    , optional := true
    , description := some "evidence-appears: the observation pattern to await." }
  , { tool := "kernel_trigger"
    , wireName := "cell_digest"
    , source := .field "KTriggerPredicate" "cellReaches" ["cell"]
    , rule := .digestSuffix
    , optional := true
    , description := some "cell-reaches." }
  , { tool := "kernel_trigger"
    , wireName := "threshold"
    , source := .field "KTriggerPredicate" "cellReaches" ["threshold"]
    , rule := .identity
    , optional := true
    , description := some "cell-reaches: the lattice threshold to reach at least." }
  , { tool := "kernel_trigger"
    , wireName := "hole"
    , source := .field "KTriggerPredicate" "holeReaches" ["hole"]
    , rule := .identity
    , optional := true
    , description := some "hole-reaches." }
  , { tool := "kernel_trigger"
    , wireName := "stage"
    , source := .field "KTriggerPredicate" "holeReaches" ["target"]
    , rule := .rename
    , optional := true
    , description := some "hole-reaches: the stage to reach at least." }
  , { tool := "kernel_trigger"
    , wireName := "register_digest"
    , source := .field "KTriggerPredicate" "outcomeLanded" ["register"]
    , rule := .digestSuffix
    , optional := true
    , description := some "outcome-landed." }
  , { tool := "kernel_trigger"
    , wireName := "lane_digest"
    , source := .field "KTriggerPredicate" "headAdvancedPast" ["partition", "lane"]
    , rule := .flatten
    , optional := true
    , description := some "evidence-appears, head-advanced-past." }
  , { tool := "kernel_trigger"
    , wireName := "shard"
    , source := .field "KTriggerPredicate" "headAdvancedPast" ["partition", "shard"]
    , rule := .flatten
    , optional := true
    , description := some "head-advanced-past." }
  , { tool := "kernel_trigger"
    , wireName := "position"
    , source := .field "KTriggerPredicate" "headAdvancedPast" ["position"]
    , rule := .identity
    , optional := true
    , description := some "head-advanced-past: fire once the head passes this position (within this partition only)." }
  , { tool := "refusal_result"
    , wireName := "reason"
    , source := .field "Refusal" "mk" ["reason"]
    , rule := .identity
    , optional := false
    , description := none }
  , { tool := "refusal_result"
    , wireName := "law"
    , source := .field "Refusal" "mk" ["law"]
    , rule := .identity
    , optional := false
    , description := some "The law this refusal defends, by its real name." }
  , { tool := "refusal_result"
    , wireName := "repair"
    , source := .field "Refusal" "mk" ["repair"]
    , rule := .identity
    , optional := false
    , description := some "The legal next move, taught as data." }
  , { tool := "refusal_result"
    , wireName := "applicability"
    , source := .enumerationOf "Applicability"
    , rule := .derived
    , optional := false
    , description := none } ]

/-! ## The carrier map

Twelve rows, keyed by the erased head of the model sort. `LanePartition` and
`AnchorFact` have no row: every field of those sorts is flattened, so the
carrier is looked up on the member's sort and never on theirs.

Brand erasure happens here and is the projection's largest loss. `Digest k`
loses `k`, `Token register` loses `register`, `Position partition` loses
`partition`. What the type system refused to elaborate in the model, the wire
can spell; the `cross-sort-identifier` refusal is the whole of what defends it
on the far side.

`StateLabel` and `Value` print the same fragment, so `anchor_state` is
indistinguishable from a value on the wire. That is a measured sort collapse,
recorded here rather than discovered by a client.
-/

/-- The carrier map. -/
def carriers : List (String × Carrier) :=
  [ ("Digest", .digestString)
  , ("Value", .opaqueString)
  , ("StateLabel", .opaqueString)
  , ("String", .opaqueString)
  , ("Nat", .exactInteger { minimum := 0, ceiling := none })
  , ("Position", .exactInteger { minimum := 0, ceiling := none })
  , ("Token", .exactInteger { minimum := 0, ceiling := none })
  , ("DeclKind", .enumeration "DeclKind")
  , ("HoleStage", .enumeration "HoleStage")
  , ("KTriggerPredicate", .enumeration "KTriggerPredicate")
  , ("RefusalReason", .enumeration "RefusalReason")
  , ("Applicability", .enumeration "Applicability") ]

/-! ## The trigger correspondence

The five-constructor sum becomes one required enum and nine optional slots.
With `additionalProperties: false`, no `oneOf` and no `if`/`then`/`else`, an
ill-formed combination VALIDATES: a `outcome-landed` firing carrying a
`threshold` and no `register_digest` is a schema-legal call that the admission
door refuses. That is the ruled trade -- flat tools over sum types -- and it
is why this correspondence is reviewed data with a wall on it rather than a
sentence in a description that nothing checks.
-/

/-- Which slots each production occupies. -/
def triggers : List TriggerRow :=
  [ { production := "evidence-appears", constructorName := "evidenceAppears"
    , slots := ["lane_digest", "pattern"] }
  , { production := "cell-reaches", constructorName := "cellReaches"
    , slots := ["cell_digest", "threshold"] }
  , { production := "hole-reaches", constructorName := "holeReaches"
    , slots := ["hole", "stage"] }
  , { production := "outcome-landed", constructorName := "outcomeLanded"
    , slots := ["register_digest"] }
  , { production := "head-advanced-past", constructorName := "headAdvancedPast"
    , slots := ["lane_digest", "shard", "position"] } ]

/-! ## The citation set

Nine laws are cited by the eight tool paragraphs. Five resolve in the gated
citation ledger and four do not. The four are listed UNLEDGERED rather than
dropped or silently emitted: dropping them would edit reviewed prose to suit a
wall, and emitting them unmarked would launder a citation the estate cannot
check. The gate reads the ledger and reconciles both ways, so an UNLEDGERED
row that later resolves reddens and gets promoted, and a LEDGERED row that
falls out of the ledger reddens too.
-/

/-- The laws the reviewed prose cites, and whether the ledger carries them. -/
def citations : List CitationRow :=
  [ { law := "c7_pin_well_founded", status := .ledgered
    , citedBy := ["kernel_declare"] }
  , { law := "f2_trace_invariant", status := .unledgered
    , citedBy := ["kernel_emit"] }
  , { law := "f1_cell_merge_aci", status := .ledgered
    , citedBy := ["kernel_join"] }
  , { law := "f3_resume_exact", status := .unledgered
    , citedBy := ["kernel_fold"] }
  , { law := "f11_query_deterministic", status := .ledgered
    , citedBy := ["kernel_fold"] }
  , { law := "at_most_one_landed_commit", status := .ledgered
    , citedBy := ["kernel_decide"] }
  , { law := "f10_stability", status := .ledgered
    , citedBy := ["kernel_trigger"] }
  , { law := "f9_policy_meet_semilattice", status := .unledgered
    , citedBy := ["kernel_spawn"] }
  , { law := "f9_tree_attenuation", status := .unledgered
    , citedBy := ["kernel_spawn"] } ]

end Unity.JsonSchemaManifest
