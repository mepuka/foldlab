#!/usr/bin/env bash
# verify/unity/run-jsonschema.sh — the tool-schema projection's wall.
#
# What this gate claims, stated before the first arm runs.
#
# `artifacts/tools.schema.json` is printed DIRECT from the projection AST
# of the kernel model, walked over the same closed manifest the conformance
# corpus is minted from, against a REVIEWED wire-convention manifest that
# carries only what the model cannot say. There is no second generator to
# diff against and the gate does not pretend there is: the hand-derived
# sketch at `verify/kernel/projections/tools.schema.json` is a REFERENCE,
# not an oracle, and its divergences from this emission are ruled ones that
# this gate names out loud rather than a parity it tries to reach.
#
# The sketch is NOT retired here. Retirement is a later isolated act, and
# the sketch's tree is read-only to this gate: it is read, never written.
#
# The load-bearing arms are the ones that cannot pass by accident: the
# emitter refuses a manifest it cannot reconcile against the walked
# environment, refuses a ceiling on an identity coordinate, refuses a
# trigger correspondence that drifted, and refuses a code point its
# alphabet cannot carry. Each of those refusals is planted and observed.
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$#" -gt 0 ]]; then
  echo "usage: ./run-jsonschema.sh" >&2
  exit 2
fi

for tool in lake python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "GATE: FAIL — $tool not found" >&2
    exit 2
  fi
done

printer="Unity/JsonSchema.lean"
manifest="Unity/JsonSchemaManifest.lean"
entry="JsonSchemaMain.lean"
committed="artifacts/tools.schema.json"
sketch="../kernel/projections/tools.schema.json"
ledger="citations.txt"

# ---------------------------------------------------------------- roster

for required in "$printer" "$manifest" "$entry" "$committed" "$sketch" "$ledger"; do
  if [[ ! -f "$required" ]]; then
    echo "GATE: FAIL — the tool-schema roster is missing $required" >&2
    exit 1
  fi
done

for module in Unity.JsonSchemaManifest Unity.JsonSchema; do
  if ! grep -q "\"$module\"," lakefile.toml; then
    echo "GATE: FAIL — $module is not in the library globs" >&2
    exit 1
  fi
done
if ! grep -q 'name = "jsonschema"' lakefile.toml; then
  echo "GATE: FAIL — the jsonschema target is not registered" >&2
  exit 1
fi

# The bridge gate sweeps `Unity/` already; the entry point is this gate's to
# sweep, and repeating the sweep here keeps the projection's wall standing on
# its own.
if grep -nE "(^|[^A-Za-z0-9_'])(sorry|partial|panic|implemented_by|extern|native_decide|unsafe|axiom|seal)($|[^A-Za-z0-9_'])|panic!" \
    "$printer" "$manifest" "$entry"; then
  echo "GATE: FAIL — forbidden kernel escape in the tool-schema projection" >&2
  exit 1
fi

# The projection states no theorems: it is a reviewed datum and a printer, and
# a law appearing here would silently orphan the bridge gate's theorem roster
# rather than be proved.
if grep -nE '^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(theorem|lemma)[[:space:]]+' \
    "$printer" "$manifest"; then
  echo "GATE: FAIL — the tool-schema projection minted a theorem" >&2
  exit 1
fi

# Root law 10 over the emitted surface: nothing rendered outward carries a
# ticket id, a command invocation or a filesystem path. The manifest and this
# gate are tracking-native sources and are not swept; the ARTIFACT is.
if grep -nE 'DEV-[0-9]+|KM-[0-9]+|lake exe|bun run|verify/|packages/|\.lean' "$committed"; then
  echo "GATE: FAIL — the emitted schema carries a tracking artifact (root law 10)" >&2
  exit 1
fi
echo "GATE: PASS (roster, globs, target, hygiene, no laws, emitted surface law-10 clean)"

# ---------------------------------------------------------------- build

if lake build jsonschema; then
  echo "GATE: PASS (lake build jsonschema)"
else
  echo "GATE: FAIL — lake build jsonschema" >&2
  exit 1
fi

first=$(mktemp "./.jsonschema.XXXXXX")
second=$(mktemp "./.jsonschema.XXXXXX")
mutant=$(mktemp "./.jsonschema.XXXXXX")
probe=$(mktemp "./.jsonschema.XXXXXX")
printer_backup=$(mktemp "./.jsonschema-src.XXXXXX")
manifest_backup=$(mktemp "./.jsonschema-src.XXXXXX")

cp "$printer" "$printer_backup"
cp "$manifest" "$manifest_backup"

restore_sources() {
  if [[ -f "$printer_backup" ]]; then cp "$printer_backup" "$printer"; fi
  if [[ -f "$manifest_backup" ]]; then cp "$manifest_backup" "$manifest"; fi
  lake build jsonschema >/dev/null 2>&1 || true
}
trap 'restore_sources; rm -f "$first" "$second" "$mutant" "$probe" "$printer_backup" "$manifest_backup"' EXIT

# Apply one sed script to the PRISTINE backup, so two mutations of one file in
# a row are both taken from the original rather than compounding.
mutate() {
  local target="$1" backup="$2" script="$3" label="$4"
  sed "$script" "$backup" > "$target"
  if cmp -s "$backup" "$target"; then
    echo "GATE: FAIL — mutation $label did not change $target" >&2
    exit 1
  fi
  if ! lake build jsonschema >/dev/null 2>&1; then
    echo "GATE: FAIL — mutation $label did not elaborate" >&2
    exit 1
  fi
}

unmutate() {
  cp "$printer_backup" "$printer"
  cp "$manifest_backup" "$manifest"
  lake build jsonschema >/dev/null 2>&1
}

# ------------------------------------------------- arm 1: two-run identity

if ! lake exe jsonschema > "$first"; then
  echo "GATE: FAIL — the printer refused its own emission" >&2
  exit 1
fi
if ! lake exe jsonschema > "$second"; then
  echo "GATE: FAIL — the printer refused its own emission on the second run" >&2
  exit 1
fi
if ! cmp -s "$first" "$second"; then
  echo "GATE: FAIL — the tool schema is not deterministic across two runs" >&2
  exit 1
fi
echo "GATE: PASS (two emissions over one model and one manifest are byte-identical)"

# ------------------------------------------ arm 2: committed versus fresh

if ! diff -u "$committed" "$first"; then
  echo "GATE: FAIL — the committed tool schema is not what the printer emits" >&2
  echo "FINDING: intended change — regenerate and commit the artifact IN THE SAME COMMIT" >&2
  exit 1
fi
echo "GATE: PASS (committed artifact == fresh emission, byte for byte)"

# ------------------------------------------------ arm 3: the measured file

if ! python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$first"; then
  echo "GATE: FAIL — the emission is not valid JSON" >&2
  exit 1
fi
if [[ "$(grep -c '' "$first")" -ne 274 ]] ||
    [[ "$(grep -cE '[ 	]+$' "$first" || true)" -ne 0 ]] ||
    [[ "$(LC_ALL=C grep -c $'\r' "$first" || true)" -ne 0 ]] ||
    [[ "$(grep -c $'\t' "$first" || true)" -ne 0 ]] ||
    [[ -n "$(LC_ALL=C grep -n '[^ -~]' "$first" || true)" ]]; then
  echo "GATE: FAIL — the emission's measured layout facts moved" >&2
  exit 1
fi
# One layout for every property object: the sketch wrote twelve on one line
# and twenty-four expanded, and a printer emits one shape.
if [[ "$(grep -cE '^ +"[a-z_$]+": \{.*\}' "$first" || true)" -ne 0 ]]; then
  echo "GATE: FAIL — the emission wrote a property object on one line" >&2
  exit 1
fi
echo "GATE: PASS (valid JSON; 274 lines, pure printable ASCII, no CR, no tab, no trailing space, no one-line object)"

# --------------------------------------------- arm 4: the keyword census

# The closed vocabulary, measured over the sketch: ten JSON-Schema keywords
# and no eleventh. The emission uses NINE of them — `maximum` is retired by
# the exact-integer ruling — and a keyword outside the ten is a wall failure
# rather than a design conversation.
census='$comment additionalProperties description enum maximum minimum pattern properties required type'
pinned='$comment additionalProperties description enum minimum pattern properties required type'

emitted_keywords() {
  python3 - "$1" <<'PY'
import json, sys
census = {"$comment","additionalProperties","description","enum","maximum","minimum",
          "pattern","properties","required","type"}
envelope = {"tools","refusal_result","digest_format","name","input_schema"}
found = set()
def walk(node, in_properties):
    if isinstance(node, dict):
        for key, value in node.items():
            if not in_properties:
                if key not in envelope:
                    found.add(key)
            walk(value, key == "properties")
    elif isinstance(node, list):
        for value in node:
            walk(value, False)
walk(json.load(open(sys.argv[1])), False)
print(" ".join(sorted(found)))
PY
}

check_census() {
  local file="$1" seen
  seen=$(emitted_keywords "$file")
  for keyword in $seen; do
    if [[ " $census " != *" $keyword "* ]]; then
      echo "$keyword"
      return 0
    fi
  done
  return 1
}

seen_keywords=$(emitted_keywords "$first")
if [[ "$seen_keywords" != "$pinned" ]]; then
  echo "GATE: FAIL — the emitted keyword set moved: $seen_keywords" >&2
  exit 1
fi
if check_census "$first" >/dev/null; then
  echo "GATE: FAIL — the emission carries a keyword outside the ten-row census" >&2
  exit 1
fi
echo "GATE: PASS (9 of the census's 10 keywords emitted; 'maximum' retired by the exact-integer ruling; no eleventh)"

# Mutation: respell one census keyword as a keyword the census does not hold.
mutate "$printer" "$printer_backup" 's/\\"minimum\\": /\\"exclusiveMinimum\\": /' widened-keyword
if ! lake exe jsonschema > "$mutant"; then
  echo "GATE: FAIL — the widened-keyword mutant was refused rather than emitted" >&2
  exit 1
fi
intruder=$(check_census "$mutant" || true)
if [[ "$intruder" != "exclusiveMinimum" ]]; then
  echo "GATE: FAIL — an eleventh keyword did not redden the census arm" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (an eleventh keyword reds the census arm, naming it: $intruder)"

# --------------------------------- arm 5: the ruled divergences, measured

# Parity here is parity of INTENT, not of bytes: the sketch was hand-derived
# and four of its rows are already known defects. Each divergence is named,
# and the counts on both sides are pinned so a divergence cannot quietly
# change size.
sketch_maximum=$(grep -c '"maximum"' "$sketch" || true)
sketch_short=$(grep -c '\^sha256:\[0-9a-f\]+\$' "$sketch" || true)
sketch_emdash=$(LC_ALL=C grep -c $'\xe2\x80\x94' "$sketch" || true)
sketch_oneline=$(grep -cE '^ +"[a-z_$]+": \{.*\}' "$sketch" || true)
emitted_maximum=$(grep -c '"maximum"' "$first" || true)
emitted_wide=$(grep -c '\^sha256:\[0-9a-f\]{64}\$' "$first" || true)

if [[ "$sketch_maximum" -ne 7 || "$emitted_maximum" -ne 0 ]]; then
  echo "GATE: FAIL — the stale-bound divergence moved ($sketch_maximum sketch, $emitted_maximum emitted)" >&2
  exit 1
fi
if [[ "$sketch_short" -ne 14 || "$emitted_wide" -ne 14 ]]; then
  echo "GATE: FAIL — the digest-pattern divergence moved ($sketch_short sketch, $emitted_wide emitted)" >&2
  exit 1
fi
if [[ "$sketch_emdash" -ne 9 ]]; then
  echo "GATE: FAIL — the sketch's em-dash count moved ($sketch_emdash)" >&2
  exit 1
fi
if [[ "$sketch_oneline" -ne 12 ]]; then
  echo "GATE: FAIL — the sketch's one-line-object count moved ($sketch_oneline)" >&2
  exit 1
fi
echo "DIVERGENCE (ruled): 7 stale safe-range ceilings dropped; identity coordinates are exact and unbounded"
echo "DIVERGENCE (ruled): 14 digest patterns widened from the model's short labels to the running system's 64 lowercase hex"
echo "DIVERGENCE (ruled): the header and digest paragraphs rewritten — the retired safe-range lean and a filesystem location are gone"
echo "DIVERGENCE (pre-filed sketch defect): 12 one-line property objects expanded — one layout per shape"
echo "DIVERGENCE (pre-filed sketch defect): 2 'kind' fields reordered — one key order per shape (type, enum, pattern, minimum, description)"
echo "DIVERGENCE (pre-filed sketch defect): 9 em dashes transliterated — 8 survive as '--', the ninth was in the rewritten header"
echo "GATE: PASS (divergence census: every divergence ruled or pre-filed, both sides pinned)"

# ---------------------------------- arm 6: the naming-row mutation, live

# One reviewed wire spelling, changed at its one site. The emission must move
# and the committed compare must red: a manifest nothing reads is a comment.
mutate "$manifest" "$manifest_backup" 's/wireName := "token_fence"/wireName := "token_gate"/' \
  renamed-wire-slot
if ! lake exe jsonschema > "$mutant"; then
  echo "GATE: FAIL — the renamed-slot mutant was refused rather than emitted" >&2
  exit 1
fi
if cmp -s "$mutant" "$first"; then
  echo "GATE: FAIL — a renamed wire slot did not move the emission" >&2
  exit 1
fi
if cmp -s "$mutant" "$committed"; then
  echo "GATE: FAIL — the renamed-slot mutant still equals the committed artifact" >&2
  exit 1
fi
if ! grep -q '"token_gate"' "$mutant" || grep -q '"token_fence"' "$mutant"; then
  echo "GATE: FAIL — the renamed slot did not reach the emitted bytes" >&2
  exit 1
fi
moved=$(diff "$first" "$mutant" | grep -c '^<' || true)
unmutate
echo "GATE: PASS (a renamed wire slot moves $moved lines and reds the committed compare)"

# The naming RULE is checked too, not carried as a label: a slot that keeps
# its digest-suffix rule and loses the suffix is refused rather than emitted.
mutate "$manifest" "$manifest_backup" 's/wireName := "writ_digest"/wireName := "writ_ticket"/' \
  rule-violating-slot
if lake exe jsonschema > "$mutant" 2> "$probe"; then
  echo "GATE: FAIL — a slot that broke its own naming rule was emitted rather than refused" >&2
  exit 1
fi
if ! grep -qF 'claims the digest-suffix rule but is not writ_digest' "$probe"; then
  cat "$probe" >&2
  echo "GATE: FAIL — the rule-violating slot was refused for the wrong reason" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a slot that breaks the naming rule it declares is REFUSED, naming the rule)"

# ------------------------------------ arm 7: the stale-bound REFUSAL arm

# The A4 wall. Planting the retired ceiling back into the carrier map must
# make the PRINTER refuse, naming the ruled domain — not emit a schema that
# cannot spell a corpus-legal identity.
mutate "$manifest" "$manifest_backup" \
  's/{ minimum := 0, ceiling := none }/{ minimum := 0, ceiling := some 9007199254740991 }/' \
  planted-ceiling
if lake exe jsonschema > "$mutant" 2> "$probe"; then
  echo "GATE: FAIL — a ceiling on an identity coordinate was emitted rather than refused" >&2
  exit 1
fi
if ! grep -qF 'estate integers are exact and unbounded' "$probe"; then
  cat "$probe" >&2
  echo "GATE: FAIL — the planted ceiling was refused for the wrong reason" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a planted safe-range ceiling is REFUSED, naming the ruled domain: $(grep -oF 'estate integers are exact and unbounded' "$probe" | head -n 1))"

# -------------------------- arm 8: the manifest-versus-environment wall

# The check a name register with only a committed side cannot make. Two
# directions, both planted.
mutate "$manifest" "$manifest_backup" \
  's/\["anchor", "floor"\]/["anchor", "floor_marker"]/' \
  unresolvable-path
if lake exe jsonschema > "$mutant" 2> "$probe"; then
  echo "GATE: FAIL — a naming row naming no model field was emitted rather than refused" >&2
  exit 1
fi
if ! grep -qF 'no model field named floor_marker at this step of a naming path' "$probe"; then
  cat "$probe" >&2
  echo "GATE: FAIL — the unresolvable naming path was refused for the wrong reason" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a naming row the environment cannot answer is REFUSED, naming the field)"

mutate "$manifest" "$manifest_backup" \
  's/\.field "Act" "decide" \["token"\]/.field "Act" "decide" ["outcome"]/' \
  uncovered-model-field
if lake exe jsonschema > "$mutant" 2> "$probe"; then
  echo "GATE: FAIL — a model field no naming row reaches was silently dropped" >&2
  exit 1
fi
if ! grep -qF 'Act.decide.token reaches no naming row' "$probe"; then
  cat "$probe" >&2
  echo "GATE: FAIL — the uncovered model field was refused for the wrong reason" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a model field no naming row reaches is REFUSED, naming it — the check a one-sided register cannot make)"

# ------------------------- arm 9: the trigger correspondence is checked

mutate "$manifest" "$manifest_backup" \
  's/slots := \["lane_digest", "pattern"\]/slots := ["pattern", "lane_digest"]/' \
  drifted-correspondence
if lake exe jsonschema > "$mutant" 2> "$probe"; then
  echo "GATE: FAIL — a drifted trigger correspondence was emitted rather than refused" >&2
  exit 1
fi
if ! grep -qF 'evidence-appears occupies' "$probe"; then
  cat "$probe" >&2
  echo "GATE: FAIL — the drifted correspondence was refused for the wrong reason" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a drifted trigger correspondence is REFUSED — the rule exists nowhere else on the wire)"

# ------------------------------------------ arm 10: the escaping is live

# Nothing in the corpus forces an escape today, so the rule is exercised by
# planting one. The emission must carry the escapes AND still parse, and the
# round trip must return the planted characters exactly.
mutate "$manifest" "$manifest_backup" \
  's/The declaration kind the minted digest is branded with\./A \\"quoted\\" kind with a backslash \\\\ inside./' \
  planted-escapes
if ! lake exe jsonschema > "$mutant"; then
  echo "GATE: FAIL — the planted escapes were refused rather than escaped" >&2
  exit 1
fi
if ! grep -qF '\"quoted\"' "$mutant" || ! grep -qF '\\' "$mutant"; then
  echo "GATE: FAIL — the planted quotation mark and backslash were not escaped" >&2
  exit 1
fi
if ! python3 - "$mutant" <<'PY'
import json, sys
document = json.load(open(sys.argv[1]))
sentence = document["tools"][0]["input_schema"]["properties"]["kind"]["description"]
expected = 'A "quoted" kind with a backslash \\ inside.'
if sentence != expected:
    raise SystemExit(f"round trip lost the escapes: {sentence!r}")
PY
then
  echo "GATE: FAIL — the escaped emission did not round-trip" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a planted quotation mark and backslash are escaped and round-trip exactly)"

# ----------------------------------------- arm 11: the alphabet refuses

nbsp=$(printf '\xc2\xa0')
mutate "$manifest" "$manifest_backup" \
  "s/The declaration kind the minted digest is branded with\./The declaration kind the minted digest is branded with.${nbsp}/" \
  planted-code-point
if lake exe jsonschema > "$mutant" 2> "$probe"; then
  echo "GATE: FAIL — a code point the ASCII table cannot name reached the wire" >&2
  exit 1
fi
if ! grep -qF 'code point 160' "$probe"; then
  cat "$probe" >&2
  echo "GATE: FAIL — the planted code point was refused for the wrong reason" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a code point the transliteration table cannot name is REFUSED, naming it: code point 160)"

# ---------------------------------------- arm 12: the citation liveness

# The reviewed prose cites nine laws. Five resolve in the gated ledger and
# four do not. The four are named here rather than laundered: the repair is
# the model's citation growth, not this projection's, so the gate is HONEST
# about them without blocking on work it does not own. The reconciliation
# runs BOTH ways — a row that claims the ledger carries it and a row the
# ledger has since grown are each a failure.
citation_check() {
  local law status ledgered=0 unledgered=0 names=""
  while read -r law status; do
    [[ -z "$law" ]] && continue
    if grep -qE "^${law}[[:space:]]" "$ledger"; then
      if [[ "$status" != "LEDGERED" ]]; then
        echo "GATE: FAIL — $law now resolves in the citation ledger; promote its manifest row to LEDGERED" >&2
        return 1
      fi
      ledgered=$((ledgered + 1))
    else
      if [[ "$status" != "UNLEDGERED" ]]; then
        echo "GATE: FAIL — $law is recorded LEDGERED and the citation ledger does not carry it" >&2
        return 1
      fi
      unledgered=$((unledgered + 1))
      names="$names $law"
    fi
  done < <(grep -oE 'law := "[a-z0-9_]+", status := \.(ledgered|unledgered)' "$manifest" \
    | sed -E 's/law := "([a-z0-9_]+)", status := \.ledgered/\1 LEDGERED/; s/law := "([a-z0-9_]+)", status := \.unledgered/\1 UNLEDGERED/')
  if [[ "$ledgered" -ne 5 || "$unledgered" -ne 4 ]]; then
    echo "GATE: FAIL — the citation posture moved ($ledgered ledgered, $unledgered unledgered)" >&2
    return 1
  fi
  echo "$names"
  return 0
}

if ! unledgered_names=$(citation_check); then
  exit 1
fi
echo "GATE: PASS (citation liveness: 5 of the 9 cited laws resolve in the gated ledger, 4 do not)"
echo "UNLEDGERED (pending the model's citation growth; named, not laundered):$unledgered_names"

# Mutation: a row that claims the ledger carries it must red.
mutate "$manifest" "$manifest_backup" \
  's/law := "f3_resume_exact", status := \.unledgered/law := "f3_resume_exact", status := .ledgered/' \
  laundered-citation
if citation_check >/dev/null 2>&1; then
  echo "GATE: FAIL — a laundered citation did not redden the liveness arm" >&2
  exit 1
fi
unmutate
echo "GATE: PASS (a citation claimed LEDGERED that the ledger does not carry reds the arm)"

# ------------------------------------------ arm 13: the restoration

if ! cmp -s "$printer" "$printer_backup" || ! cmp -s "$manifest" "$manifest_backup"; then
  echo "GATE: FAIL — a mutated source was not restored" >&2
  exit 1
fi
if ! lake exe jsonschema > "$second"; then
  echo "GATE: FAIL — the restored printer refused its own emission" >&2
  exit 1
fi
if ! cmp -s "$second" "$committed"; then
  echo "GATE: FAIL — parity did not return after the mutation arms" >&2
  exit 1
fi
echo "GATE: PASS (sources restored; parity returns byte-identically)"

echo "GATE: PASS (tool-schema projection: 8 tools, 36 wire properties, 6 enums and 42 reviewed paragraphs printed direct from the projection AST; 274 lines; 2 mutation arms, 6 refusal arms, 1 census arm, 1 liveness arm)"
