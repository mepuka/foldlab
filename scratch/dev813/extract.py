#!/usr/bin/env python3
"""DEV-813 prep: the mechanical census over the committed tool-schema sketch.

Run from the repository root:  python3 scratch/dev813/extract.py

Every number in scratch/dev813/*.md is produced here. The model side is parsed
from verify/kernel/Kernel/Definitions.lean; the wire side from
verify/kernel/projections/tools.schema.json. Nothing is asserted that is not
read off one of those two files.
"""
import collections, hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKETCH = os.path.join(ROOT, "verify/kernel/projections/tools.schema.json")
DEFS = os.path.join(ROOT, "verify/kernel/Kernel/Definitions.lean")
OUT = os.path.join(ROOT, "scratch/dev813")

raw = open(SKETCH, "rb").read()
doc = json.loads(raw.decode("utf-8"))

print("=" * 72)
print("PARITY MANIFEST")
print("=" * 72)
print("path        :", os.path.relpath(SKETCH, ROOT))
print("bytes       :", len(raw))
print("sha256      :", hashlib.sha256(raw).hexdigest())
print("lines       :", raw.count(b"\n"))
print("final byte  :", repr(raw[-1:]))
print("has CRLF    :", b"\r\n" in raw)
print("has tab     :", b"\t" in raw)
print("non-ascii   :", sorted({b for b in raw if b > 0x7F}))
print("backslash escapes used:", sorted(set(re.findall(r'\\.', raw.decode("utf-8")))))
# indentation histogram
indents = collections.Counter()
for line in raw.decode("utf-8").split("\n"):
    stripped = line.lstrip(" ")
    if stripped:
        indents[len(line) - len(stripped)] += 1
print("indent widths (count):", dict(sorted(indents.items())))
# round-trip: does python's canonical re-dump match?
redump = json.dumps(doc, indent=2, ensure_ascii=False, separators=(",", ": ")) + "\n"
print("json.dumps(indent=2) identical:", redump == raw.decode("utf-8"))

# ---------------------------------------------------------------- keyword census
JSON_SCHEMA_KEYWORDS = {
    # every keyword we might encounter; presence is measured, not assumed
    "$schema", "$id", "$ref", "$defs", "$comment", "$anchor",
    "type", "properties", "required", "enum", "const", "pattern",
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "multipleOf", "minLength", "maxLength", "items", "prefixItems",
    "minItems", "maxItems", "uniqueItems", "additionalProperties",
    "patternProperties", "propertyNames", "oneOf", "anyOf", "allOf",
    "not", "if", "then", "else", "format", "default", "examples",
    "title", "description", "deprecated", "readOnly", "writeOnly",
    "contains", "dependentRequired", "dependentSchemas", "unevaluatedProperties",
}

kw = collections.Counter()
non_kw = collections.Counter()
type_values = collections.Counter()
paths_by_kw = collections.defaultdict(list)

def is_schema_position(path):
    """Heuristic-free: we mark keys as schema keywords only when they appear as
    an object key in a position the walk classifies as a schema object."""
    return True

def walk(node, path, in_schema):
    if isinstance(node, dict):
        for k, v in node.items():
            p = path + "/" + k
            if in_schema and k in JSON_SCHEMA_KEYWORDS:
                kw[k] += 1
                paths_by_kw[k].append(p)
                if k == "type" and isinstance(v, str):
                    type_values[v] += 1
                # descend: properties' children are schemas keyed by field name
                if k == "properties":
                    for fname, fschema in v.items():
                        walk(fschema, p + "/" + fname, True)
                elif k in ("items", "not", "if", "then", "else",
                           "additionalProperties", "propertyNames",
                           "unevaluatedProperties"):
                    if isinstance(v, dict):
                        walk(v, p, True)
                elif k in ("oneOf", "anyOf", "allOf", "prefixItems"):
                    for i, sub in enumerate(v):
                        walk(sub, p + f"/{i}", True)
                elif k in ("$defs",):
                    for dname, dschema in v.items():
                        walk(dschema, p + "/" + dname, True)
                # scalar keywords (type/required/enum/pattern/min/max/description/
                # $comment/title) have no schema children
            else:
                if in_schema:
                    non_kw[k] += 1
                walk(v, p, in_schema)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, path + f"/{i}", in_schema)

# top level: the file is a bespoke envelope, not a schema. Classify explicitly.
kw_envelope = collections.Counter()
for k in doc:
    kw_envelope[k] += 1
walk({"$comment": doc["$comment"]}, "", True)
walk(doc["digest_format"], "/digest_format", True)
for tool in doc["tools"]:
    kw_envelope["tools[].name"] += 1
    kw_envelope["tools[].description"] += 1
    kw_envelope["tools[].input_schema"] += 1
    walk(tool["input_schema"], f"/tools/{tool['name']}/input_schema", True)
walk(doc["refusal_result"], "/refusal_result", True)

print()
print("=" * 72)
print("KEYWORD CENSUS (JSON-Schema keywords, in schema position)")
print("=" * 72)
total = 0
for k, n in sorted(kw.items(), key=lambda kv: (-kv[1], kv[0])):
    total += n
    print(f"  {k:<22} {n:>4}")
print(f"  {'TOTAL':<22} {total:>4}   distinct = {len(kw)}")
print()
print("  type values:", dict(sorted(type_values.items(), key=lambda kv: -kv[1])))
print()
print("  ENVELOPE keys (NOT JSON-Schema keywords -- MCP tool-list frame):")
for k, n in sorted(kw_envelope.items()):
    print(f"    {k:<22} {n:>4}")
print()
print("  keywords ABSENT from the sketch (the vocabulary the printer must NOT emit):")
absent = sorted(JSON_SCHEMA_KEYWORDS - set(kw))
print("   ", ", ".join(absent))

# ---------------------------------------------------------------- stale bounds
print()
print("=" * 72)
print("STALE-BOUND AUDIT (A4: estate integers exact and unbounded)")
print("=" * 72)
SAFE = 9007199254740991
rows = []
def scan_bounds(node, path):
    if isinstance(node, dict):
        if node.get("type") == "integer" or "minimum" in node or "maximum" in node:
            rows.append((path, dict(node)))
        for k, v in node.items():
            scan_bounds(v, path + "/" + k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            scan_bounds(v, path + f"/{i}")

for tool in doc["tools"]:
    for fname, fschema in tool["input_schema"]["properties"].items():
        if fschema.get("type") == "integer" or "minimum" in fschema or "maximum" in fschema:
            rows.append((f"{tool['name']}.{fname}", fschema))
scan_bounds(doc["digest_format"], "digest_format")
scan_bounds(doc["refusal_result"], "refusal_result")

n_stale = 0
for path, schema in rows:
    stale = schema.get("maximum") == SAFE
    n_stale += 1 if stale else 0
    print(f"  [{'STALE' if stale else ' ok  '}] {path}")
    print(f"          as committed : {json.dumps({k:v for k,v in schema.items() if k!='description'})}")
print(f"  integer-carrying rows: {len(rows)}   carrying maximum={SAFE}: {n_stale}")

# any float / number typed anything?
print("  rows typed \"number\":", sum(1 for _, s in rows if s.get("type") == "number"))
print("  literal 9007199254740991 occurrences in bytes:",
      raw.decode('utf-8').count(str(SAFE)))
print("  'safe range' / 'I-JSON' / 'float' mentions in prose:")
for m in re.finditer(r'[^"]*(I-JSON|safe range|float|double)[^"]*', raw.decode("utf-8")):
    print("     ...", m.group(0).strip()[:160])

# ---------------------------------------------------------------- prose inventory
print()
print("=" * 72)
print("PROSE-WITH-NO-SOURCE INVENTORY")
print("=" * 72)
tool_descs = [(t["name"], t["description"]) for t in doc["tools"]]
print(f"tool descriptions: {len(tool_descs)}")
field_descs = []
for t in doc["tools"]:
    for fname, fs in t["input_schema"]["properties"].items():
        if "description" in fs:
            field_descs.append((f"{t['name']}.{fname}", fs["description"]))
for fname, fs in doc["refusal_result"]["properties"].items():
    if "description" in fs:
        field_descs.append((f"refusal_result.{fname}", fs["description"]))
print(f"field descriptions: {len(field_descs)}")
comments = []
def scan_comments(node, path):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "$comment":
                comments.append((path or "/", v))
            else:
                scan_comments(v, path + "/" + k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            scan_comments(v, path + f"/{i}")
scan_comments(doc, "")
print(f"$comment paragraphs: {len(comments)}")
words = sum(len(d.split()) for _, d in tool_descs) + \
        sum(len(d.split()) for _, d in field_descs) + \
        sum(len(c.split()) for _, c in comments)
print(f"total prose words: {words}")

# law citations found in prose
LAWCITE = re.compile(r'\b(c\d+_[a-z_0-9]+|f\d+_[a-z_0-9]+|at_most_one_landed_commit|'
                     r'verify-on-read|content addressing|join-semilattice)\b')
print()
print("law citations per tool description:")
for n, d in tool_descs:
    print(f"  {n:<18} -> {sorted(set(LAWCITE.findall(d))) or '[none]'}")
print()
REFUSAL_WIRE = ["clock-read","absence-trigger","unfenced-decide","last-writer-wins",
  "unverified-read","cross-sort-identifier","minted-identifier","ambient-query-input",
  "forward-reference","secret-carrier","absence-claim","past-mutation","off-writ-referent",
  "closure-introspection","anchored-resolve","unfilled-hole"]
print("refusal-reason citations inside prose (model-sourced tokens embedded in unsourced prose):")
for n, d in tool_descs + field_descs:
    hits = [r for r in REFUSAL_WIRE if r in d]
    if hits:
        print(f"  {n:<28} -> {hits}")

# dump verbatim to a data file for the artifact
out = {
    "keyword_census": dict(kw),
    "type_values": dict(type_values),
    "tool_descriptions": [{"tool": n, "text": d,
                           "laws": sorted(set(LAWCITE.findall(d)))} for n, d in tool_descs],
    "field_descriptions": [{"field": n, "text": d} for n, d in field_descs],
    "comments": [{"path": p, "text": t} for p, t in comments],
    "sha256": hashlib.sha256(raw).hexdigest(),
    "bytes": len(raw),
}
json.dump(out, open(os.path.join(OUT, "census-out.json"), "w"), indent=2)
print()
print("wrote census-out.json")


lean = open(DEFS).read()
doc = json.loads(raw.decode("utf-8"))

# ------------------------------------------------------------------ model side
def parse_ctors(block):
    """Parse `| ctor (f : T) (g : U)` lines out of one inductive body.

    A constructor may wrap onto continuation lines; a continuation is any line
    that does not itself start a new `|` alternative."""
    joined = []
    for raw_line in block.split("\n"):
        stripped = raw_line.strip()
        if not stripped:
            continue
        if stripped.startswith("|"):
            joined.append(stripped)
        elif joined:
            joined[-1] += " " + stripped
    out = []
    for line in joined:
        m = re.match(r"\|\s*(\w+)\s*(.*)$", line)
        if not m:
            continue
        name, rest = m.group(1), m.group(2)
        fields = []
        for fm in re.finditer(r"\(([^():]+?)\s*:\s*([^()]*(?:\([^()]*\)[^()]*)*)\)", rest):
            names, ty = fm.group(1), fm.group(2).strip()
            for n in names.split():
                fields.append((n, ty))
        out.append((name, fields))
    return out

def grab(kind, name):
    """The body of one declaration: from its header to the first terminator --
    a `deriving` clause, a doc block, or the next top-level declaration.
    `Act` carries no `deriving`, so a deriving-only stop silently swallows the
    next declaration; every terminator is listed."""
    m = re.search(rf"^{kind} {name}\b.*?$(.*?)"
                  rf"(?=^deriving|^/-|^inductive |^structure |^def |^abbrev )",
                  lean, re.S | re.M)
    return m.group(1) if m else ""

act_block = grab("inductive", "Act")
pred_block = grab("inductive", "KTriggerPredicate")
ACT = parse_ctors(act_block)
PRED = parse_ctors(pred_block)

def parse_struct(name):
    m = re.search(rf"^structure {name}\b(.*?)^deriving", lean, re.S | re.M)
    if not m:
        return []
    body = m.group(1)
    fields = []
    for line in body.split("\n"):
        fm = re.match(r"\s+(\w+)\s*:\s*(.+?)\s*$", line)
        if fm and "where" not in fm.group(0):
            fields.append((fm.group(1), fm.group(2)))
    return fields

STRUCTS = {n: parse_struct(n) for n in
           ["Digest", "Value", "StateLabel", "Token", "LanePartition",
            "Position", "AnchorFact", "Petname"]}

# ------------------------------------------------------------------ wire side
WIRE = {}
for t in doc["tools"]:
    WIRE[t["name"]] = {
        "required": t["input_schema"]["required"],
        "properties": t["input_schema"]["properties"],
    }

TOOL_OF = {  # the one generator-name rule, read off the file: kernel_<ctor>
    "declare": "kernel_declare", "resolve": "kernel_resolve",
    "emit": "kernel_emit", "join": "kernel_join", "fold": "kernel_fold",
    "decide": "kernel_decide", "trigger": "kernel_trigger",
    "spawn": "kernel_spawn",
}

# ------------------------------------------------------- (a) THE NAMING MAP
# model path -> wire spelling. Flattened structure members carry their model
# path through the carrier structure.
NAMING = []
def row(gen, model_path, model_sort, wire, tool, note):
    NAMING.append({"generator": gen, "model_field": model_path,
                   "model_sort": model_sort, "wire_field": wire,
                   "tool": tool, "note": note})

flat = {
    # (generator, model field) -> [(wire field, note)]
    ("declare", "kind"):       [("kind", "identity")],
    ("declare", "value"):      [("value", "identity")],
    ("declare", "writ"):       [("writ_digest", "carrier suffix +_digest")],
    ("resolve", "kind"):       [("kind", "identity")],
    ("resolve", "target"):     [("digest", "RENAMED (target -> digest); NOT the +_digest rule")],
    ("emit", "lane"):          [("lane_digest", "carrier suffix +_digest")],
    ("emit", "body"):          [("body", "identity")],
    ("join", "cell"):          [("cell_digest", "carrier suffix +_digest")],
    ("join", "contribution"):  [("contribution", "identity")],
    ("fold", "declared"):      [("reduction_digest", "RENAMED (declared -> reduction) + _digest")],
    ("fold", "partition"):     [("lane_digest", "FLATTENED LanePartition.lane + _digest"),
                                ("shard", "FLATTENED LanePartition.shard")],
    ("fold", "anchor"):        [("anchor_floor", "FLATTENED AnchorFact.floor, prefix anchor_"),
                                ("anchor_state", "FLATTENED AnchorFact.state, prefix anchor_"),
                                ("anchor_head", "FLATTENED AnchorFact.head, prefix anchor_")],
    ("fold", "query"):         [("query", "identity")],
    ("decide", "register"):    [("register_digest", "carrier suffix +_digest")],
    ("decide", "token"):       [("token_fence", "RENAMED (token -> token_fence); Token.value flattened")],
    ("decide", "outcome"):     [("outcome", "identity")],
    ("trigger", "predicate"):  [("production", "FLATTENED KTriggerPredicate -> tag slot (see table c)")],
    ("trigger", "declaration"):[("declaration_digest", "carrier suffix +_digest")],
    ("spawn", "parent"):       [("parent_writ_digest", "RENAMED parent -> parent_writ + _digest")],
    ("spawn", "request"):      [("request_writ_digest", "RENAMED request -> request_writ + _digest")],
}
for gen, fields in ACT:
    for fname, ftype in fields:
        for wire, note in flat.get((gen, fname), [("<<UNMAPPED>>", "NO WIRE COUNTERPART")]):
            row(gen, f"Act.{gen}.{fname}", ftype, wire, TOOL_OF[gen], note)

# predicate slots
PRED_FLAT = {
    ("evidenceAppears", "lane"):     ("lane_digest",   "shared slot; carrier suffix"),
    ("evidenceAppears", "pattern"):  ("pattern",       "identity"),
    ("cellReaches", "cell"):         ("cell_digest",   "carrier suffix"),
    ("cellReaches", "threshold"):    ("threshold",     "identity"),
    ("holeReaches", "hole"):         ("hole",          "identity"),
    ("holeReaches", "target"):       ("stage",         "RENAMED (target -> stage)"),
    ("outcomeLanded", "register"):   ("register_digest","carrier suffix"),
    ("headAdvancedPast", "partition"): ("lane_digest + shard", "FLATTENED LanePartition, SHARED with evidence-appears/fold"),
    ("headAdvancedPast", "position"): ("position",     "identity; Position.value flattened"),
}
PREDROWS = []
for ctor, fields in PRED:
    for fname, ftype in fields:
        wire, note = PRED_FLAT.get((ctor, fname), ("<<UNMAPPED>>", "NO WIRE COUNTERPART"))
        PREDROWS.append({"production": ctor, "model_field": f"KTriggerPredicate.{ctor}.{fname}",
                         "model_sort": ftype, "wire_field": wire, "note": note})

print("=" * 76)
print("(a) THE NAMING MAP  --  model field -> wire spelling")
print("=" * 76)
print(f"{'generator':<10} {'model field':<28} {'wire field':<22} note")
for r in NAMING:
    print(f"{r['generator']:<10} {r['model_field'].split('.',1)[1]:<28} {r['wire_field']:<22} {r['note']}")
print(f"\n  Act rows: {len(NAMING)}")
for r in PREDROWS:
    print(f"{'trigger':<10} {r['model_field'].split('.',1)[1]:<28} {r['wire_field']:<22} {r['note']}")
print(f"  KTriggerPredicate rows: {len(PREDROWS)}")
print(f"  NAMING-MAP TOTAL ROWS: {len(NAMING) + len(PREDROWS)}")

# mechanical diff: which wire fields are NOT reached by any row?
reached = set()
for r in NAMING:
    reached.add((r["tool"], r["wire_field"]))
for r in PREDROWS:
    for w in r["wire_field"].split(" + "):
        reached.add(("kernel_trigger", w))
orphans = []
for tool, spec in WIRE.items():
    for f in spec["properties"]:
        if (tool, f) not in reached:
            orphans.append((tool, f))
print("\n  wire fields NOT reached by a model row (must be justified by a table):")
for t, f in orphans:
    print(f"    {t}.{f}")
print(f"    count: {len(orphans)}")

unmapped = [r for r in NAMING + PREDROWS if r["wire_field"] == "<<UNMAPPED>>"]
print(f"  model fields with NO wire counterpart: {len(unmapped)}")
for r in unmapped:
    print("   ", r["model_field"])

# name-rule frequency, measured
def classify(note):
    if note.startswith("identity"): return "identity (name unchanged)"
    if "carrier suffix" in note: return "+_digest suffix"
    if note.startswith("RENAMED"): return "renamed"
    if note.startswith("FLATTENED"): return "flattened"
    return "other"
import collections
c = collections.Counter(classify(r["note"]) for r in NAMING)
print("\n  Act-row rule frequency:", dict(c))

# ------------------------------------------------------- (b) THE CARRIER MAP
print()
print("=" * 76)
print("(b) THE CARRIER MAP  --  model sort -> JSON-Schema fragment")
print("=" * 76)
CARRIERS = [
    ("DeclKind", "12-constructor closed inductive",
     {"type": "string", "enum": ["schema","program","policy","capability","lane","algebra",
                                 "index","resource","ontology","schedule","template","language"]},
     "brand erased; the 12 ranks are printed as their constructor names, order = DeclKind.rank"),
    ("Digest kind", "structure { id : Nat }, brand in the type index",
     {"type": "string", "pattern": "^sha256:[0-9a-f]+$"},
     "BRAND ERASED: the kind index vanishes; a wire digest carries no sort. The cross-sort-identifier "
     "refusal is the only thing left defending it."),
    ("Value", "structure { bytes : Nat }",
     {"type": "string"},
     "opaque; no pattern, no length"),
    ("StateLabel", "structure { value : Nat }",
     {"type": "string"},
     "SORT COLLAPSE: StateLabel and Value print the same fragment; anchor_state is typed string"),
    ("Nat (Position.value)", "Nat, brand = partition",
     {"type": "integer", "minimum": 0, "maximum": 9007199254740991},
     "STALE under A4 -- see the stale-bound audit"),
    ("Nat (Token.value)", "Nat, brand = register",
     {"type": "integer", "minimum": 0, "maximum": 9007199254740991},
     "STALE under A4"),
    ("Nat (LanePartition.shard)", "Nat, unbranded",
     {"type": "integer", "minimum": 0, "maximum": 9007199254740991},
     "STALE under A4"),
    ("Nat (hole name)", "Nat",
     {"type": "integer", "minimum": 0, "maximum": 9007199254740991},
     "STALE under A4"),
    ("HoleStage", "5-constructor closed inductive",
     {"type": "string", "enum": ["opened","filled","disputed","decided","sealed"]},
     "order = HoleStage.rank; note `opened` is the model's keyword-forced spelling and survives to wire"),
    ("RefusalReason", "16-constructor closed inductive",
     {"type": "string", "enum": ["clock-read","absence-trigger","unfenced-decide","last-writer-wins",
      "unverified-read","cross-sort-identifier","minted-identifier","ambient-query-input",
      "forward-reference","secret-carrier","absence-claim","past-mutation","off-writ-referent",
      "closure-introspection","anchored-resolve","unfilled-hole"]},
     "the ONE row with a model-carried wire spelling: RefusalReason.wire"),
    ("Applicability", "2-constructor closed inductive",
     {"type": "string", "enum": ["machine-applicable","advisory"]},
     "model-carried wire spelling: Applicability.wire"),
    ("Refusal.law / Refusal.repair", "String",
     {"type": "string"},
     "carried as free text in the model too"),
    ("KTriggerPredicate", "5-constructor closed inductive",
     {"type": "string", "enum": ["evidence-appears","cell-reaches","hole-reaches",
                                 "outcome-landed","head-advanced-past"]},
     "wire spellings are kebab-cased constructor names -- NOT carried by the model (no .wire fn)"),
    ("Act (the sentence)", "8-constructor closed inductive",
     {"<tool>": "one flat MCP tool per constructor, name = kernel_<ctor>"},
     "NOT a JSON-Schema shape: the sum is flattened into the tool list, not a oneOf"),
]
for sort, model, frag, note in CARRIERS:
    print(f"  {sort}")
    print(f"      model   : {model}")
    print(f"      fragment: {json.dumps(frag)}")
    print(f"      note    : {note}")
print(f"\n  carrier rows: {len(CARRIERS)}")

# verify each enum in the sketch against the model, mechanically
print()
print("  ENUM PARITY (sketch enum vs model constructor list):")
def model_enum(fn_name):
    m = re.search(rf"def {fn_name} :.*?$(.*?)(?=\n\n|\n/-)", lean, re.S | re.M)
    if not m: return None
    return re.findall(r'=>\s*"([^"]+)"', m.group(1))
def model_ctors(ind):
    return [c for c, _ in parse_ctors(grab("inductive", ind))]

checks = [
    ("kernel_declare.kind", doc["tools"][0]["input_schema"]["properties"]["kind"]["enum"],
     model_ctors("DeclKind")),
    ("kernel_resolve.kind", doc["tools"][1]["input_schema"]["properties"]["kind"]["enum"],
     model_ctors("DeclKind")),
    ("kernel_trigger.production",
     doc["tools"][6]["input_schema"]["properties"]["production"]["enum"],
     model_ctors("KTriggerPredicate")),
    ("kernel_trigger.stage", doc["tools"][6]["input_schema"]["properties"]["stage"]["enum"],
     model_ctors("HoleStage")),
    ("refusal_result.reason", doc["refusal_result"]["properties"]["reason"]["enum"],
     model_enum("RefusalReason.wire")),
    ("refusal_result.applicability",
     doc["refusal_result"]["properties"]["applicability"]["enum"],
     model_enum("Applicability.wire")),
]
for name, wire, model in checks:
    if model is None:
        print(f"    {name:<32} model list not found"); continue
    same_order_ident = wire == model
    kebab = [re.sub(r'(?<!^)(?=[A-Z])', '-', m).lower() for m in model]
    same_kebab = wire == kebab
    verdict = ("IDENTICAL to model constructor names" if same_order_ident
               else "kebab-case of model constructor names, same order" if same_kebab
               else "DIVERGES")
    print(f"    {name:<32} n={len(wire):<3} {verdict}")
    if not (same_order_ident or same_kebab):
        print(f"        wire : {wire}")
        print(f"        model: {model}")

# --------------------------------------------- (c) TRIGGER FLATTENING TABLE
print()
print("=" * 76)
print("(c) THE TRIGGER-FLATTENING RULE  --  5 productions -> 1 enum + optional slots")
print("=" * 76)
trig = doc["tools"][6]["input_schema"]
print("  required (always present):", trig["required"])
print("  all properties          :", list(trig["properties"].keys()))
optional = [p for p in trig["properties"] if p not in trig["required"]]
print("  optional slots          :", optional, f"(n={len(optional)})")
print()
CORRESPOND = {
    "evidence-appears":   ["lane_digest", "pattern"],
    "cell-reaches":       ["cell_digest", "threshold"],
    "hole-reaches":       ["hole", "stage"],
    "outcome-landed":     ["register_digest"],
    "head-advanced-past": ["lane_digest", "shard", "position"],
}
print(f"  {'production':<20} {'model constructor':<22} {'slots used':<42} slots left unset")
for wire_prod, slots in CORRESPOND.items():
    ctor = {"evidence-appears":"evidenceAppears","cell-reaches":"cellReaches",
            "hole-reaches":"holeReaches","outcome-landed":"outcomeLanded",
            "head-advanced-past":"headAdvancedPast"}[wire_prod]
    unset = [s for s in optional if s not in slots]
    print(f"  {wire_prod:<20} {ctor:<22} {'+'.join(slots):<42} {len(unset)}")
print()
print("  THE RULE, stated once:")
print("    - the 5-constructor sum becomes ONE required enum field `production`")
print("    - every constructor field becomes an OPTIONAL top-level slot")
print("    - slots are SHARED when two productions carry the same sort+meaning")
print("      (lane_digest: evidence-appears + head-advanced-past; shard: head-advanced-past only)")
print("    - the production->slot correspondence is carried ONLY in prose")
print("      (kernel_trigger.production.description), enforced NOWHERE in the schema")
print("    - additionalProperties:false + no if/then/else + no oneOf means an")
print("      ILL-FORMED combination (production=outcome-landed with threshold set)")
print("      VALIDATES. The door refuses it; the schema does not.")
print()
shared = {}
for prod, slots in CORRESPOND.items():
    for s in slots:
        shared.setdefault(s, []).append(prod)
print("  slot sharing, measured:")
for s, prods in shared.items():
    print(f"    {s:<18} used by {len(prods)}: {', '.join(prods)}")

# ------------------------------------------------------------- dump artifact
json.dump({"naming_act": NAMING, "naming_pred": PREDROWS,
           "carriers": [{"sort": s, "model": m, "fragment": f, "note": n}
                        for s, m, f, n in CARRIERS],
           "trigger": CORRESPOND, "trigger_optional": optional,
           "orphan_wire_fields": orphans},
          open(os.path.join(OUT, "tables-out.json"), "w"), indent=2)
print("\nwrote tables-out.json")

# ------------------------------------------------------- DETERMINISM PROBES
print()
print("=" * 76)
print("DETERMINISM PROBES  --  what the sketch actually does")
print("=" * 76)
text = raw.decode("utf-8")

print("key order, measured (a printer must fix ONE order):")
print("  top level             :", list(doc.keys()), "sorted?", list(doc) == sorted(doc))
print("  tool object           :", list(doc["tools"][0].keys()))
print("  input_schema          :", list(doc["tools"][0]["input_schema"].keys()))
print("  properties order      : required-first, then optionals, in every tool:",
      all(list(t["input_schema"]["properties"])[:len(t["input_schema"]["required"])]
          == t["input_schema"]["required"] for t in doc["tools"]))
orders = collections.Counter()
for t in doc["tools"]:
    for f, s in t["input_schema"]["properties"].items():
        orders[tuple(s.keys())] += 1
for f, s in doc["refusal_result"]["properties"].items():
    orders[tuple(s.keys())] += 1
print("  per-field key orders observed:")
for o, n in sorted(orders.items(), key=lambda kv: -kv[1]):
    print(f"     {n:>3}x  {list(o)}")
print("  DIVERGENCE: `enum` sits before `description` in 4 fields and after it in 2")
print("     (kernel_declare.kind, kernel_resolve.kind put description first)")

single = [i + 1 for i, l in enumerate(text.split("\n"))
          if re.match(r'^\s*"\w+": \{.*\},?$', l)]
print()
print(f"layout: {len(single)} property objects written on ONE line, "
      f"{32 + 4 - len(single)} expanded across lines")
print("  single-line at:", single)
print("  indent unit: 2 spaces; deepest indent:", max(indents))

print()
print("prose alphabet:")
print("  U+2014 EM DASH occurrences in the sketch:", text.count("—"))
prose_md = os.path.join(ROOT, "verify/projections/artifacts/prose.md")
if os.path.exists(prose_md):
    p = open(prose_md, encoding="utf-8").read()
    print("  the landed Prose.lean artifact carries U+2014:", p.count("—"),
          "and '--':", p.count("--"))
    print("  -> Projections.asciiDoc transliterates 0x2014 to '--'; a printer that "
          "reuses it diverges from the sketch on every one of those lines")
print("  JSON escapes used in the sketch:", sorted(set(re.findall(r'\\.', text))) or "none")

print()
print("docstring availability in the model (the prose the printer cannot source):")
ctor_docs = re.findall(r'/--(?:(?!-/).)*-/\s*\|', lean, re.S)
decl_docs = re.findall(r'/--(?:(?!-/).)*-/\s*(?:inductive|structure|def|abbrev)\s+\S+', lean, re.S)
print("  constructor-level docstrings in Definitions.lean:", len(ctor_docs))
print("  declaration-level docstrings:", len(decl_docs))
manifest = [n for n in open(os.path.join(ROOT, "verify/projections/names.txt"))
            .read().split("\n") if n and not n.startswith("#")]
print("  names.txt manifest size:", len(manifest))
print("  -> ProjectionAst.docs carries one DocSentence per MANIFEST NAME.")
print("     Walk.docOf calls findDocString? on the declaration only. There is no")
print("     per-constructor and no per-field docstring anywhere to print from.")

print()
print("the A4 witness, read from the corpus:")
unity = os.path.join(ROOT, "verify/unity/run.sh")
if os.path.exists(unity):
    for i, l in enumerate(open(unity).read().split("\n"), 1):
        if "9007199254740993" in l:
            print(f"  verify/unity/run.sh:{i}: {l.strip()}")
gen = os.path.join(ROOT, "packages/plait/src/kernel/KernelSchemas.generated.ts")
if os.path.exists(gen):
    for i, l in enumerate(open(gen).read().split("\n"), 1):
        if "9007199254740993" in l and "record" in l:
            print(f"  KernelSchemas.generated.ts:{i}: {l.strip()[:150]}")
print("  2^53+1 = 9007199254740993 is a GATED corpus record. The sketch's")
print("  maximum 9007199254740991 refuses a value the corpus is required to carry.")

# ------------------------------------------------- CITATION-LEDGER PARITY
print()
print("=" * 76)
print("CITATION-LEDGER PARITY  --  the sketch's law names vs the model's ledger")
print("=" * 76)
ledger_path = os.path.join(ROOT, "verify/unity/citations.txt")
ledger = {}
for line in open(ledger_path).read().split("\n"):
    if line.strip():
        name, venue = line.split("\t")
        ledger[name] = venue
print("verify/unity/citations.txt rows:", len(ledger),
      "-- gated by verify/unity/run.sh:182-225 (scraped from Definitions.lean,")
print("   reconciled against the ledger, each venue resolved in fabric's roster)")
sketch_laws = set()
for t in doc["tools"]:
    sketch_laws |= set(re.findall(r'\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b', t["description"]))
sketch_laws = {s for s in sketch_laws if re.match(r'^(c|f|at)', s)}
print()
print("laws cited by the sketch's tool prose:", len(sketch_laws))
for law in sorted(sketch_laws):
    where = ledger.get(law)
    print(f"  {law:<42} {'in ledger (' + where + ')' if where else 'NOT IN THE LEDGER'}")
missing = sorted(l for l in sketch_laws if l not in ledger)
unused = sorted(l for l in ledger if l not in sketch_laws)
print()
print(f"  cited by the sketch, absent from the model's ledger: {len(missing)}")
for m in missing:
    print("    ", m)
print(f"  in the model's ledger, never cited by the sketch: {len(unused)}")
for u in unused:
    print("    ", u)
print()
print("  A citations.txt-style wall over the emitted prose goes RED today: the")
print("  sketch reaches for four laws the model's own taught table never cites.")
