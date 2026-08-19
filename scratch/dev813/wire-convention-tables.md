# DEV-813 prep: the wire-convention tables

**DRAFT — pending the wire-convention-table home ruling.** A3 ruled the printer
placement on 2026-08-19 and left the wire-convention sub-row explicitly
unruled: "to be confirmed at DEV-813's recut; not separately ruled tonight."
These three tables are the first draft of the reviewed manifest that ruling
needs a home for. They are extracted, not authored: the model side is parsed
from `verify/kernel/Kernel/Definitions.lean`, the wire side from
`verify/kernel/projections/tools.schema.json`, and every row is a mechanical
join. Re-derive with `python3 scratch/dev813/extract.py`.

Because JSON-Schema prints DIRECT from `ProjectionAst` (row A3's mechanism
half, confirmed), there is no target AST for these rules to live inside. They
are the printer's input tables, and they need a reviewed home of their own.

## (a) The naming map

**32 rows: 23 over `Act`, 9 over `KTriggerPredicate`.** The map is total in
both directions — every one of the 32 wire properties across the eight tools is
reached by exactly one model row, and no model field is left without a wire
counterpart.

Four rules cover the `Act` rows: 7 identity, 5 `+_digest` suffix, 5 rename, 6
flatten.

### Over `Act` (23 rows)

| generator | model field | model sort | wire field | rule |
| --- | --- | --- | --- | --- |
| `declare` | `kind` | `DeclKind` | `kind` | identity |
| `declare` | `value` | `Value` | `value` | identity |
| `declare` | `writ` | `Digest DeclKind.policy` | `writ_digest` | `+_digest` |
| `resolve` | `kind` | `DeclKind` | `kind` | identity |
| `resolve` | `target` | `Digest kind` | `digest` | **rename**, and not the `+_digest` rule — the only digest field whose wire name drops the model name entirely |
| `emit` | `lane` | `Digest DeclKind.lane` | `lane_digest` | `+_digest` |
| `emit` | `body` | `Value` | `body` | identity |
| `join` | `cell` | `Digest DeclKind.resource` | `cell_digest` | `+_digest` |
| `join` | `contribution` | `Value` | `contribution` | identity |
| `fold` | `declared` | `Digest DeclKind.index` | `reduction_digest` | **rename** (`declared` → `reduction`) then `+_digest` |
| `fold` | `partition` | `LanePartition` | `lane_digest` | **flatten** `LanePartition.lane`, then `+_digest` |
| `fold` | `partition` | `LanePartition` | `shard` | **flatten** `LanePartition.shard` |
| `fold` | `anchor` | `AnchorFact declared partition` | `anchor_floor` | **flatten** `AnchorFact.floor`, prefix `anchor_` |
| `fold` | `anchor` | `AnchorFact declared partition` | `anchor_state` | **flatten** `AnchorFact.state`, prefix `anchor_` |
| `fold` | `anchor` | `AnchorFact declared partition` | `anchor_head` | **flatten** `AnchorFact.head`, prefix `anchor_` |
| `fold` | `query` | `Value` | `query` | identity |
| `decide` | `register` | `Digest DeclKind.program` | `register_digest` | `+_digest` |
| `decide` | `token` | `Token register` | `token_fence` | **rename**; `Token.value` flattened out |
| `decide` | `outcome` | `Value` | `outcome` | identity |
| `trigger` | `predicate` | `KTriggerPredicate` | `production` | **flatten** to a tag slot — see table (c) |
| `trigger` | `declaration` | `Digest DeclKind.program` | `declaration_digest` | `+_digest` |
| `spawn` | `parent` | `Digest DeclKind.policy` | `parent_writ_digest` | **rename** (`parent` → `parent_writ`) then `+_digest` |
| `spawn` | `request` | `Digest DeclKind.policy` | `request_writ_digest` | **rename** (`request` → `request_writ`) then `+_digest` |

### Over `KTriggerPredicate` (9 rows)

| production | model field | model sort | wire field | rule |
| --- | --- | --- | --- | --- |
| `evidenceAppears` | `lane` | `Digest DeclKind.lane` | `lane_digest` | `+_digest`; slot **shared** with `headAdvancedPast` |
| `evidenceAppears` | `pattern` | `Value` | `pattern` | identity |
| `cellReaches` | `cell` | `Digest DeclKind.resource` | `cell_digest` | `+_digest` |
| `cellReaches` | `threshold` | `Value` | `threshold` | identity |
| `holeReaches` | `hole` | `Nat` | `hole` | identity |
| `holeReaches` | `target` | `HoleStage` | `stage` | **rename** (`target` → `stage`) |
| `outcomeLanded` | `register` | `Digest DeclKind.program` | `register_digest` | `+_digest` |
| `headAdvancedPast` | `partition` | `LanePartition` | `lane_digest`, `shard` | **flatten**; both slots shared |
| `headAdvancedPast` | `position` | `Position partition` | `position` | identity; `Position.value` flattened out |

### The rules, stated once

1. **Tool name.** One flat MCP tool per `Act` constructor, named
   `kernel_<constructor>`. Eight tools; no `oneOf`.
2. **`+_digest` suffix.** A field whose sort is `Digest k` gets `_digest`
   appended to its model name. Five rows follow it; `resolve.target` is the one
   exception, spelled `digest` outright.
3. **Rename.** Five `Act` rows and one predicate row carry a wire name the
   model does not: `target`→`digest`, `declared`→`reduction`, `token`→
   `token_fence`, `parent`→`parent_writ`, `request`→`request_writ`, and the
   predicate's `target`→`stage`. Each is a compound-self-descriptive-name
   decision with no model source.
4. **Flatten.** A structure-sorted field becomes one wire slot per member.
   `LanePartition` flattens to `lane_digest` + `shard`; `AnchorFact` flattens to
   three slots each prefixed `anchor_`. The `anchor_` prefix and the absence of
   any `partition_` prefix are unexplained asymmetries in the sketch.
5. **Brand erasure.** Every type index disappears. `Digest k` loses `k`,
   `Token register` loses `register`, `Position partition` loses `partition`,
   `AnchorFact declared partition` loses both. See table (b).

## (b) The carrier map

**14 rows.** Every fragment below is quoted from the sketch verbatim.

| model sort | model shape | wire fragment | note |
| --- | --- | --- | --- |
| `DeclKind` | 12-constructor inductive | `{"type":"string","enum":["schema","program","policy","capability","lane","algebra","index","resource","ontology","schedule","template","language"]}` | enum order equals `DeclKind.rank`; spellings are the constructor names unchanged |
| `Digest kind` | `structure { id : Nat }`, brand in the type index | `{"type":"string","pattern":"^sha256:[0-9a-f]+$"}` | **brand erased.** A wire digest carries no sort. The `cross-sort-identifier` refusal is all that defends what the type system defended in the model. The pattern is also the *model's* shape, not the estate's: the sketch's own `digest_format` `$comment` says "Model uses short identity labels (sha256:NN); the running system carries 64 lowercase hex chars. The pattern below is the model's." A printed artifact serving real clients needs `^sha256:[0-9a-f]{64}$`, which is a wire fact with no model source |
| `Value` | `structure { bytes : Nat }` | `{"type":"string"}` | opaque; no pattern, no length |
| `StateLabel` | `structure { value : Nat }` | `{"type":"string"}` | **sort collapse.** `StateLabel` and `Value` print the same fragment; `anchor_state` is indistinguishable from a `Value` on the wire |
| `Nat` (`Position.value`) | `Nat`, brand `partition` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | **stale under A4** |
| `Nat` (`Token.value`) | `Nat`, brand `register` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | **stale under A4** |
| `Nat` (`LanePartition.shard`) | `Nat`, unbranded | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | **stale under A4** |
| `Nat` (hole name) | `Nat` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | **stale under A4** |
| `HoleStage` | 5-constructor inductive | `{"type":"string","enum":["opened","filled","disputed","decided","sealed"]}` | enum order equals `HoleStage.rank`; `opened` is the model's keyword-forced spelling and survives unchanged to the wire |
| `RefusalReason` | 16-constructor inductive | `{"type":"string","enum":["clock-read",…,"unfilled-hole"]}` | the one carrier whose wire spelling the model itself carries, in `RefusalReason.wire` |
| `Applicability` | 2-constructor inductive | `{"type":"string","enum":["machine-applicable","advisory"]}` | model-carried spelling, `Applicability.wire` |
| `Refusal.law`, `Refusal.repair` | `String` | `{"type":"string"}` | free text in the model too |
| `KTriggerPredicate` | 5-constructor inductive | `{"type":"string","enum":["evidence-appears","cell-reaches","hole-reaches","outcome-landed","head-advanced-past"]}` | kebab-cased constructor names in `rank` order — a spelling the model does **not** carry; there is no `KTriggerPredicate.wire` |
| `Act` | 8-constructor inductive | one flat tool per constructor | not a JSON-Schema shape at all: the sum is flattened into the tool list |

### Enum parity, measured

Six enums appear in the sketch. Four reproduce the model's constructor names
character for character; one is a mechanical kebab-casing of them; one pair of
`kind` enums is identical to `DeclKind`'s constructors.

| enum | rows | verdict |
| --- | ---: | --- |
| `kernel_declare.kind` | 12 | identical to `DeclKind` constructor names, in `rank` order |
| `kernel_resolve.kind` | 12 | identical, same order |
| `kernel_trigger.production` | 5 | kebab-case of `KTriggerPredicate` constructor names, same order |
| `kernel_trigger.stage` | 5 | identical to `HoleStage` constructor names, in `rank` order |
| `refusal_result.reason` | 16 | identical to `RefusalReason.wire` |
| `refusal_result.applicability` | 2 | identical to `Applicability.wire` |

Two of the six are model-carried (`.wire` functions exist). Four are derived by
a rule the model does not state, and the kebab-casing rule is the one that
would silently break if a constructor name ever contained two capitals.

## (c) The trigger-flattening rule

The five-constructor sum becomes one required enum plus **nine optional
slots**. `kernel_trigger` carries eleven properties, of which two are required
(`production`, `declaration_digest`).

| production | model constructor | slots it uses | slots left unset |
| --- | --- | --- | ---: |
| `evidence-appears` | `evidenceAppears` | `lane_digest`, `pattern` | 7 |
| `cell-reaches` | `cellReaches` | `cell_digest`, `threshold` | 7 |
| `hole-reaches` | `holeReaches` | `hole`, `stage` | 7 |
| `outcome-landed` | `outcomeLanded` | `register_digest` | 8 |
| `head-advanced-past` | `headAdvancedPast` | `lane_digest`, `shard`, `position` | 6 |

Slot sharing, measured: `lane_digest` is used by two productions
(`evidence-appears` and `head-advanced-past`); the other eight slots are used
by exactly one each.

### The rule, stated once

1. The five-constructor sum becomes one **required** enum field `production`.
2. Every constructor field becomes an **optional** top-level slot.
3. Slots are **shared** when two productions carry the same sort and meaning.
4. The production-to-slot correspondence lives **only** in the prose of
   `kernel_trigger.production.description`, and is enforced nowhere.

### What the flattening gives up

With `additionalProperties: false`, no `oneOf`, and no `if`/`then`/`else`, an
ill-formed combination validates. `production: "outcome-landed"` carrying a
`threshold` and no `register_digest` is a schema-valid call. The admission door
refuses it; the schema does not. That is the ruled trade — flat tools over
sum types — and it is the reason the correspondence table above must be
reviewed data rather than a comment, because it is the only place the rule
exists.
