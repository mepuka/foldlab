// EXEMPLAR ONLY — not wired into any build, gate, or package.
//
// Writes `sample-kernel-conformance.ndjson`: a full, self-consistent
// schema-v1 artifact used as the INPUT to the Go generator exemplar
// (`kmgen.go`). This is NOT the real artifact. The real artifact is
// `packages/plait/fixtures/kernel-conformance.ndjson` and is emitted by
// the Lean model (`verify/unity emit`), never hand-authored — the
// standing house ruling is that model-runtime vectors are produced by
// executing the model.
//
// Every field value here is transcribed from `verify/kernel` sources
// (Kernel/Definitions.lean) or from a committed control trace, so the
// sample exercises the real grammar rather than an invented one. The
// one place it must invent is the choice of encoding vectors for the
// seven generators the kernel's controls do not already pin.
//
// Run: bun run make-sample.ts

// ---------------------------------------------------------------------
// A JSON writer that preserves key order (the freeze pins key order per
// record type, and it is NOT alphabetical, so a sorting serializer
// cannot be used).
// ---------------------------------------------------------------------

type J = string | number | J[] | Pair[];
type Pair = [string, J];

function esc(s: string): string {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c > 0x7f) throw new Error(`non-ASCII in string: ${JSON.stringify(s)}`);
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (c < 0x20) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}

function render(v: J): string {
  if (typeof v === "string") return esc(v);
  if (typeof v === "number") {
    if (!Number.isInteger(v) || v < 0) throw new Error(`not a nat: ${v}`);
    return String(v);
  }
  // An empty list is `[]`, never `{}`. The schema has no empty-object
  // position, so the pair-list branch requires at least one pair.
  if (Array.isArray(v) && v.length > 0 &&
      v.every((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === "string")) {
    return "{" + (v as Pair[]).map(([k, x]) => esc(k) + ":" + render(x)).join(",") + "}";
  }
  return "[" + (v as J[]).map(render).join(",") + "]";
}

// ---------------------------------------------------------------------
// Kind and stage tables (Kernel.DeclKind.rank / Kernel.HoleStage.rank).
// ---------------------------------------------------------------------

const KINDS = [
  "schema", "program", "policy", "capability", "lane", "algebra",
  "index", "resource", "ontology", "schedule", "template", "language",
];

const STAGES = ["opened", "filled", "disputed", "decided", "sealed"];

// ---------------------------------------------------------------------
// The taught table (Kernel.taught), in RefusalReason declaration order,
// with the applicability marks from RefusalReason.applicability.
// ---------------------------------------------------------------------

const REFUSALS: [string, string, string, "machine-applicable" | "advisory"][] = [
  ["clock-read",
    "the fold carrier has no clock parameter (f11_query_deterministic)",
    "emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value",
    "advisory"],
  ["absence-trigger",
    "the trigger grammar is closed at five monotone productions (f10_stability)",
    "route acting-on-silence through the deadline seat: a fenced decide fed by tick facts",
    "advisory"],
  ["unfenced-decide",
    "only a fenced token commits (at_most_one_landed_commit)",
    "hold the register's token and commit with it; grant and renew are runtime liveness, not grammar",
    "advisory"],
  ["last-writer-wins",
    "cells merge by join under a declared ACI algebra (f1_cell_merge_aci)",
    "declare the merge algebra; idempotent join leaves nothing for arrival order to choose",
    "machine-applicable"],
  ["unverified-read",
    "a decode re-derives the digest of what it fetched (verify-on-read)",
    "resolve and let the door re-derive; absence is retryable, a mismatch is structural",
    "machine-applicable"],
  ["cross-sort-identifier",
    "tokens are per-register and positions are per-partition; sorts never compare across spaces",
    "compare a token only within its register and a position only within its partition",
    "advisory"],
  ["minted-identifier",
    "every identifier is a digest of a declaration or a derivation from one",
    "declare the value and use its digest; nothing mints a name",
    "advisory"],
  ["ambient-query-input",
    "a derived read is a function of support and query alone (f11_topk_of_support)",
    "read state through a fold at an anchor, and put any seed inside the declared query value",
    "advisory"],
  ["forward-reference",
    "pins name already-admitted digests (c7_pin_well_founded)",
    "declare the referent first; the reference graph is a DAG by admission order",
    "advisory"],
  ["secret-carrier",
    "the wire grammar admits no secret position",
    "carry credentials in the environmental band as redacted configuration, outside meaning",
    "advisory"],
  ["absence-claim",
    "a local view is a lattice lower bound (cell_absorb_inflationary)",
    "claim at-least from a replica, never not-present-anywhere",
    "advisory"],
  ["past-mutation",
    "journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)",
    "declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon",
    "machine-applicable"],
  ["off-writ-referent",
    "a declaration's identifiers lie inside the universe its writ pins",
    "spawn under a writ that pins the referent, or request the referent into the pinned universe",
    "advisory"],
  ["closure-introspection",
    "a program's identity is its declaration, never its closure bytes",
    "reference computation by digest: declare the fold and pin its digest",
    "advisory"],
  ["anchored-resolve",
    "a digest names one value forever, so no anchor can change a resolve",
    "drop the anchor; read head-relative state through a fold at an anchor",
    "machine-applicable"],
  ["unfilled-hole",
    "only closed programs execute; a hole is a declared parameter, not a wildcard",
    "fill every declared hole; disjoint fills commute, so fill order is free",
    "advisory"],
];

// ---------------------------------------------------------------------
// The mini-AST: the closed 22-type list, in Kernel/Definitions.lean
// declaration order. `Ref` (an abbrev for DeclKind x Nat) is not in the
// list and appears only as a leaf type reference.
// ---------------------------------------------------------------------

type Field = [string, string];
type Ctor = [string, Field[]];
type Param = [string, "brand" | "type"];
type Ty = { name: string; form: "inductive" | "structure"; params: Param[]; ctors: Ctor[] };

const nullary = (names: string[]): Ctor[] => names.map((n) => [n, []] as Ctor);
const mk = (fields: Field[]): Ctor[] => [["mk", fields]];

const TYPES: Ty[] = [
  { name: "DeclKind", form: "inductive", params: [], ctors: nullary(KINDS) },
  { name: "Digest", form: "structure", params: [["kind", "brand"]], ctors: mk([["id", "Nat"]]) },
  { name: "Value", form: "structure", params: [], ctors: mk([["bytes", "Nat"]]) },
  { name: "StateLabel", form: "structure", params: [], ctors: mk([["value", "Nat"]]) },
  { name: "Petname", form: "structure", params: [], ctors: mk([["text", "String"]]) },
  { name: "Token", form: "structure", params: [["register", "brand"]], ctors: mk([["value", "Nat"]]) },
  { name: "LanePartition", form: "structure", params: [], ctors: mk([["lane", "Digest(lane)"], ["shard", "Nat"]]) },
  { name: "Position", form: "structure", params: [["partition", "brand"]], ctors: mk([["value", "Nat"]]) },
  {
    name: "AnchorFact", form: "structure",
    params: [["declared", "brand"], ["partition", "brand"]],
    ctors: mk([["floor", "Position(partition)"], ["state", "StateLabel"], ["head", "Position(partition)"]]),
  },
  { name: "HoleStage", form: "inductive", params: [], ctors: nullary(STAGES) },
  {
    name: "KTriggerPredicate", form: "inductive", params: [], ctors: [
      ["evidenceAppears", [["lane", "Digest(lane)"], ["pattern", "Value"]]],
      ["cellReaches", [["cell", "Digest(resource)"], ["threshold", "Value"]]],
      ["holeReaches", [["hole", "Nat"], ["target", "HoleStage"]]],
      ["outcomeLanded", [["register", "Digest(program)"]]],
      ["headAdvancedPast", [["partition", "LanePartition"], ["position", "Position(partition)"]]],
    ],
  },
  {
    name: "Act", form: "inductive", params: [], ctors: [
      ["declare", [["kind", "DeclKind"], ["value", "Value"], ["writ", "Digest(policy)"]]],
      ["resolve", [["kind", "DeclKind"], ["target", "Digest(kind)"]]],
      ["emit", [["lane", "Digest(lane)"], ["body", "Value"]]],
      ["join", [["cell", "Digest(resource)"], ["contribution", "Value"]]],
      ["fold", [["declared", "Digest(index)"], ["partition", "LanePartition"],
        ["anchor", "AnchorFact(declared,partition)"], ["query", "Value"]]],
      ["decide", [["register", "Digest(program)"], ["token", "Token(register)"], ["outcome", "Value"]]],
      ["trigger", [["predicate", "KTriggerPredicate"], ["declaration", "Digest(program)"]]],
      ["spawn", [["parent", "Digest(policy)"], ["request", "Digest(policy)"]]],
    ],
  },
  {
    name: "RawArg", form: "inductive", params: [], ctors: [
      ["digestRef", [["kind", "DeclKind"], ["id", "Nat"]]],
      ["literal", [["value", "Nat"]]],
      ["hole", [["name", "Nat"]]],
      ["clockNow", []],
      ["randomSeed", []],
      ["secretBytes", [["bytes", "Nat"]]],
      ["mintedId", [["token", "Nat"]]],
      ["functionValue", [["code", "Nat"]]],
    ],
  },
  {
    name: "CandidateAnchor", form: "structure", params: [],
    ctors: mk([["foldId", "Nat"], ["lane", "Nat"], ["shard", "Nat"],
      ["floor", "Nat"], ["state", "Nat"], ["head", "Nat"]]),
  },
  { name: "TokenClaim", form: "structure", params: [], ctors: mk([["register", "Nat"], ["value", "Nat"]]) },
  {
    name: "MergeStrategy", form: "inductive", params: [], ctors: [
      ["declaredAlgebra", [["algebra", "Nat"]]],
      ["lastWriterWins", []],
    ],
  },
  {
    name: "CandidatePredicate", form: "inductive", params: [], ctors: [
      ["evidenceAppears", [["lane", "Nat"], ["pattern", "Nat"]]],
      ["cellReaches", [["cell", "Nat"], ["threshold", "Nat"]]],
      ["holeReaches", [["hole", "Nat"], ["stage", "Nat"]]],
      ["outcomeLanded", [["register", "Nat"]]],
      ["headAdvancedPast", [["lane", "Nat"], ["shard", "Nat"], ["position", "Nat"]]],
      ["onAbsence", [["subject", "Nat"]]],
      ["negation", [["inner", "CandidatePredicate"]]],
      ["deadline", [["tick", "Nat"]]],
      ["absentEverywhere", [["cell", "Nat"]]],
    ],
  },
  {
    name: "CandidateAct", form: "inductive", params: [], ctors: [
      ["declare", [["kind", "DeclKind"], ["payload", "List(RawArg)"], ["writ", "Nat"]]],
      ["resolveDigest", [["kind", "DeclKind"], ["target", "Nat"], ["anchor", "Option(Nat)"]]],
      ["trustBytes", [["kind", "DeclKind"], ["target", "Nat"], ["asserted", "Nat"]]],
      ["emit", [["lane", "Nat"], ["body", "List(RawArg)"]]],
      ["join", [["cell", "Nat"], ["contribution", "List(RawArg)"], ["strategy", "MergeStrategy"]]],
      ["readLatest", [["subject", "Nat"]]],
      ["fold", [["declared", "Nat"], ["anchor", "Option(CandidateAnchor)"], ["query", "List(RawArg)"]]],
      ["decide", [["register", "Nat"], ["token", "Option(TokenClaim)"], ["outcome", "List(RawArg)"]]],
      ["trigger", [["predicate", "CandidatePredicate"], ["declaration", "Nat"]]],
      ["spawn", [["parent", "Nat"], ["request", "Nat"]]],
      ["updateInPlace", [["target", "Nat"], ["payload", "List(RawArg)"]]],
    ],
  },
  {
    name: "RefusalReason", form: "inductive", params: [], ctors: nullary([
      "clockRead", "absenceTrigger", "unfencedDecide", "lastWriterWins",
      "unverifiedRead", "crossSortIdentifier", "mintedIdentifier",
      "ambientQueryInput", "forwardReference", "secretCarrier",
      "absenceClaim", "pastMutation", "offWritReferent",
      "closureIntrospection", "anchoredResolve", "unfilledHole",
    ]),
  },
  {
    name: "Refusal", form: "structure", params: [],
    ctors: mk([["reason", "RefusalReason"], ["law", "String"], ["repair", "String"]]),
  },
  { name: "Applicability", form: "inductive", params: [], ctors: nullary(["machineApplicable", "advisory"]) },
  { name: "Door", form: "structure", params: [], ctors: mk([["catalog", "List(Ref)"], ["pinned", "List(Ref)"]]) },
];

// ---------------------------------------------------------------------
// Encoding vectors: one per generator. The `lawfulDeclareAct` vector is
// transcribed from the kernel gate's committed control trace
// (verify/kernel/negative-controls/door-admits-lawful.cex.txt), so at
// least one vector in this sample is real model output.
// ---------------------------------------------------------------------

const ENCODINGS: [string, number[]][] = [
  ["lawfulDeclareAct", [0, 0, 7000051000172, 4]],
  ["resolveSchemaEight", [1, 0, 8]],
  ["emitLaneOne", [2, 1, 42]],
  ["joinResourceSix", [3, 6, 42]],
  ["foldAtGroundAnchor", [4, 2, 1, 0, 4, 11, 6, 42]],
  ["decideFencedRegisterThree", [5, 3, 7, 42]],
  ["triggerHoleReachesFilled", [6, 2, 0, 1, 0, 3]],
  ["spawnPolicyFourFive", [7, 4, 5]],
];

// A port of Kernel.decodeAct, arity-only: enough to discharge the
// round-trip obligation the freeze places on the emitter. The real
// emitter runs the real decodeAct; this stands in for the sample.
function decodeArity(act: number[]): boolean {
  const n = act.length;
  switch (act[0]) {
    case 0: return n === 4 && act[1] < 12;
    case 1: return n === 3 && act[1] < 12;
    case 2: return n === 3;
    case 3: return n === 3;
    case 4: return n === 8;
    case 5: return n === 4;
    case 6: {
      if (n !== 6) return false;
      const tag = act[1];
      if (tag === 2) return act[3] < 5; // rankToStage must succeed
      return tag <= 4;
    }
    case 7: return n === 3;
    default: return false;
  }
}

for (const [name, act] of ENCODINGS) {
  if (!decodeArity(act)) throw new Error(`round-trip failed for vector ${name}`);
}

// ---------------------------------------------------------------------
// The 17 admission rows: the 16 planted unlawful candidates in the
// kernel gate's check_control order, then the lawful twin.
// ---------------------------------------------------------------------

const ADMISSIONS: [string, string][] = [
  ["clockFold", "clock-read"],
  ["absenceTrigger", "absence-trigger"],
  ["unfencedDecide", "unfenced-decide"],
  ["lastWriterJoin", "last-writer-wins"],
  ["trustingRead", "unverified-read"],
  ["crossRegisterDecide", "cross-sort-identifier"],
  ["mintedDeclare", "minted-identifier"],
  ["latestRead", "ambient-query-input"],
  ["forwardDeclare", "forward-reference"],
  ["secretEmit", "secret-carrier"],
  ["absenceClaimTrigger", "absence-claim"],
  ["pastMutation", "past-mutation"],
  ["offWritDeclare", "off-writ-referent"],
  ["functionDeclare", "closure-introspection"],
  ["anchoredResolve", "anchored-resolve"],
  ["holeyEmit", "unfilled-hole"],
];

// The control order and the RefusalReason declaration order coincide.
// Assert it here rather than trusting the eye.
for (let i = 0; i < 16; i++) {
  if (ADMISSIONS[i][1] !== REFUSALS[i][0]) {
    throw new Error(`row ${i}: admission reason ${ADMISSIONS[i][1]} != refusal reason ${REFUSALS[i][0]}`);
  }
}

// ---------------------------------------------------------------------
// Emit.
// ---------------------------------------------------------------------

const lines: string[] = [];

lines.push(render([
  ["record", "header"],
  ["format", 1],
  ["generator", "verify/unity emit"],
  ["source", "verify/kernel"],
  ["counts", [
    ["kind", KINDS.length],
    ["stage", STAGES.length],
    ["refusal", REFUSALS.length],
    ["type", TYPES.length],
    ["encoding", ENCODINGS.length],
    ["admission", ADMISSIONS.length + 1],
  ] as Pair[]],
] as Pair[]));

KINDS.forEach((name, rank) =>
  lines.push(render([["record", "kind"], ["name", name], ["rank", rank]] as Pair[])));

STAGES.forEach((name, rank) =>
  lines.push(render([["record", "stage"], ["name", name], ["rank", rank]] as Pair[])));

for (const [reason, law, repair, applicability] of REFUSALS) {
  lines.push(render([
    ["record", "refusal"], ["reason", reason], ["law", law],
    ["repair", repair], ["applicability", applicability],
  ] as Pair[]));
}

for (const ty of TYPES) {
  lines.push(render([
    ["record", "type"],
    ["name", ty.name],
    ["form", ty.form],
    ["params", ty.params.map(([n, role]) => [["name", n], ["role", role]] as Pair[])],
    ["constructors", ty.ctors.map(([n, fields]) => [
      ["name", n],
      ["fields", fields.map(([fn, ft]) => [["name", fn], ["type", ft]] as Pair[])],
    ] as Pair[])],
  ] as Pair[]));
}

for (const [name, act] of ENCODINGS) {
  lines.push(render([["record", "encoding"], ["name", name], ["act", act]] as Pair[]));
}

for (const [name, reason] of ADMISSIONS) {
  lines.push(render([
    ["record", "admission"], ["name", name], ["verdict", "refused"], ["reason", reason],
  ] as Pair[]));
}

lines.push(render([
  ["record", "admission"], ["name", "lawfulDeclare"], ["verdict", "admitted"],
  ["encoded", ENCODINGS[0][1]],
] as Pair[]));

const out = lines.join("\n") + "\n";
await Bun.write("sample-kernel-conformance.ndjson", out);
console.log(`wrote sample-kernel-conformance.ndjson: ${lines.length} lines, ${out.length} bytes`);
console.log(`counts: kind=${KINDS.length} stage=${STAGES.length} refusal=${REFUSALS.length} ` +
  `type=${TYPES.length} encoding=${ENCODINGS.length} admission=${ADMISSIONS.length + 1}`);
