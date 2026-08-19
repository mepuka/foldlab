#!/usr/bin/env bash
# Reproduce every measurement in scratch/dev-goast/artifacts/.
#
#   scratch/dev-goast/measure.sh            # from the repository root
#
# Nothing here writes into go/ or packages/. The regeneration and mutation
# arms run against a scratch copy of the corpus under a temporary root, so a
# mutated corpus can never reach the committed tree.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$ROOT/scratch/dev-goast"
ART="$HERE/artifacts"
GO="mise x go@1.26.5 --"
CORPUS="packages/plait/fixtures/kernel-conformance.ndjson"
TARGET="go/kmconform/tables_generated.go"
BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT

mkdir -p "$ART" "$BASE/packages/plait/fixtures" "$BASE/go/kmconform"

# ---- 1. the census, the string table and the layout facts ----------------
( cd "$HERE/goastdump" \
  && GOASTDUMP_GOVERSION="$($GO go version)" $GO go run . -out "$ART" "$ROOT/$TARGET" )

# ---- 2. gofmt conformance of the whole module ---------------------------
{
  echo "# Regeneration, determinism and mutation arms"
  echo
  echo "Reproduce with \`scratch/dev-goast/measure.sh\`. Toolchain: \`$($GO go version)\`."
  echo
  echo '## gofmt over the whole Go module'
  echo
  echo '```'
  echo '$ cd go && gofmt -l .'
  ( cd "$ROOT/go" && $GO gofmt -l . ) || true
  echo '(nothing printed => every file in go/, generated and hand-written, is a gofmt fixed point)'
  echo '```'
  echo
} > "$ART/mutation-arms.md"

# ---- 3. two-run determinism and committed-vs-fresh ----------------------
cp "$ROOT/$CORPUS" "$BASE/packages/plait/fixtures/"
cp "$ROOT/$TARGET" "$BASE/go/kmconform/"
( cd "$ROOT/go" && $GO go run ./cmd/kmgen -root "$BASE/go" >/dev/null )
S1=$(shasum -a 256 "$BASE/go/kmconform/tables_generated.go" | cut -d' ' -f1)
( cd "$ROOT/go" && $GO go run ./cmd/kmgen -root "$BASE/go" >/dev/null )
S2=$(shasum -a 256 "$BASE/go/kmconform/tables_generated.go" | cut -d' ' -f1)
S0=$(shasum -a 256 "$ROOT/$TARGET" | cut -d' ' -f1)
{
  echo '## Two-run byte-identity and committed-versus-fresh'
  echo
  echo '```'
  echo "committed  $S0"
  echo "fresh run1 $S1"
  echo "fresh run2 $S2"
  if [ "$S0" = "$S1" ] && [ "$S1" = "$S2" ]; then
    echo "=> byte-identical on all three"
  else
    echo "=> DIVERGENCE — this is a finding, not a file to overwrite"
  fi
  echo '```'
  echo
  echo '## Mutation arms — one corpus field, measured in moved lines of Go'
  echo
} >> "$ART/mutation-arms.md"

run_mut () {
  local label="$1" pyexpr="$2"
  cp "$ROOT/$CORPUS" "$BASE/packages/plait/fixtures/"
  python3 - "$BASE/packages/plait/fixtures/kernel-conformance.ndjson" "$pyexpr" <<'PY'
import sys
path, expr = sys.argv[1], sys.argv[2]
s = open(path, 'rb').read()
before = s
s = eval(expr, {"s": s, "__builtins__": {}})
if s == before:
    raise SystemExit("the control mutation changed nothing")
open(path, 'wb').write(s)
PY
  cp "$ROOT/$TARGET" "$BASE/go/kmconform/"
  {
    echo "### $label"
    echo
    echo '```'
    if ( cd "$ROOT/go" && $GO go run ./cmd/kmgen -root "$BASE/go" ) >/dev/null 2>"$BASE/err.txt"; then
      n=$(diff -U0 "$ROOT/$TARGET" "$BASE/go/kmconform/tables_generated.go" | grep -c '^[+-][^+-]' || true)
      echo "the emission moved on $n lines:"
      diff -U0 "$ROOT/$TARGET" "$BASE/go/kmconform/tables_generated.go" | grep '^[+-][^+-]' | head -14 || true
    else
      echo "the generator REFUSED:"
      head -2 "$BASE/err.txt"
    fi
    echo '```'
    echo
  } >> "$ART/mutation-arms.md"
}

run_mut "One character inside one docstring" \
  's.replace(b"The closed universe of declaration kinds.", b"The closed universe of declaration KINDS.", 1)'
run_mut "One kind name widened by a character (schema -> schemas) — the elastic column repads" \
  's.replace(b"{\"name\":\"schema\",\"rank\":0,\"record\":\"kind\"}", b"{\"name\":\"schemas\",\"rank\":0,\"record\":\"kind\"}", 1)'
run_mut "One kind renamed with a cross-reference left dangling (lane -> vein)" \
  's.replace(b"{\"name\":\"lane\",\"rank\":4,\"record\":\"kind\"}", b"{\"name\":\"vein\",\"rank\":4,\"record\":\"kind\"}", 1)'

# ---- 4. corpus reach ----------------------------------------------------
{
  echo '## Corpus reach into the emission'
  echo
  echo '```'
  python3 - "$ROOT" <<'PY'
import json, re, sys
root = sys.argv[1]
corpus = [json.loads(l) for l in open(root + '/packages/plait/fixtures/kernel-conformance.ndjson')]
scalars = set()
def walk(v):
    if isinstance(v, str):
        if len(v) >= 4: scalars.add(v)
    elif isinstance(v, dict):
        for x in v.values(): walk(x)
    elif isinstance(v, list):
        for x in v: walk(x)
for rec in corpus: walk(rec)
def exported(w):
    return ''.join(p[:1].upper() + p[1:] for p in re.split(r'[-_ ]', w) if p)
idents = {exported(s) for s in scalars if re.fullmatch(r'[a-z0-9\-_]+', s)}
lines = open(root + '/go/kmconform/tables_generated.go').read().split('\n')
scalar_lines = ident_lines = 0
for line in lines:
    if any(v in line for v in scalars):
        scalar_lines += 1
    elif any(v in line for v in idents if len(v) >= 5):
        ident_lines += 1
total = len(lines)
reached = scalar_lines + ident_lines
print(f"generated-file lines                                     {total}")
print(f"lines carrying a verbatim corpus scalar (len>=4)          {scalar_lines}")
print(f"further lines carrying a kmgen-minted identifier          {ident_lines}")
print(f"corpus-reached lines                                      {reached} ({100*reached/total:.1f}%)")
print(f"generator template text alone                             {total-reached} ({100*(total-reached)/total:.1f}%)")
print(f"distinct corpus scalars {len(scalars)}; distinct minted identifiers {len(idents)}")
PY
  echo '```'
} >> "$ART/mutation-arms.md"

# ---- 5. the parity manifest --------------------------------------------
( cd "$ROOT" && python3 - > "$ART/parity-manifest.json" <<'PY'
import hashlib, json, os, subprocess
rows = [
 {"path": "go/kmconform/tables_generated.go",
  "role": "the generated Go artifact — the byte-parity target",
  "regenerate": "cd go && go run ./cmd/kmgen",
  "check": "cd go && go run ./cmd/kmgen -check",
  "gate": "cd go && go test -count=1 ./cmd/kmgen  (TestGeneratedTablesAreAFreshEmission, TestTheEmissionIsGofmtCanonical, TestTheGeneratorIsDeterministic, TestTheGeneratorRefusesAMalformedCorpus)",
  "ci": ".github/workflows/gates.yml — 'go — go test ./...' (working-directory: go, -count=1)"},
 {"path": "packages/plait/fixtures/kernel-conformance.ndjson",
  "role": "the corpus — the single source both languages read",
  "regenerate": "verify/unity: lake exe emit",
  "check": "kmconform.CheckBothWays (the both-ways law)",
  "gate": "cd go && go test -count=1 ./kmconform", "ci": "same"},
 {"path": "go/cmd/kmgen/main.go",
  "role": "the generator — a strings.Builder emitter, then one go/format.Source pass",
  "regenerate": "hand-written", "check": "cd go && gofmt -l .",
  "gate": "cd go && go vet ./...", "ci": "same"},
 {"path": "go/kmconform/kmconform.go",
  "role": "declares ConformanceCorpusPath, the corpus the generator reads",
  "regenerate": "hand-written", "check": "-", "gate": "-", "ci": "-"},
 {"path": "packages/plait/src/kernel/KernelSchemas.generated.ts",
  "role": "the TypeScript twin (DEV-812's parity target), for scale",
  "regenerate": "packages/plait/scripts/kernel-schemas.ts",
  "check": "-", "gate": "bun run gates", "ci": ".github/workflows/gates.yml"},
 {"path": "packages/plait/src/kernel/KernelTables.generated.ts",
  "role": "the TypeScript twin, for scale",
  "regenerate": "packages/plait/scripts/kernel-schemas.ts",
  "check": "-", "gate": "bun run gates", "ci": "same"},
 {"path": "packages/plait/src/kernel/KernelBuilder.generated.ts",
  "role": "the TypeScript twin, for scale",
  "regenerate": "packages/plait/scripts/kernel-corpus.ts",
  "check": "-", "gate": "bun run gates", "ci": "same"},
]
for r in rows:
    blob = open(r["path"], "rb").read()
    r["bytes"], r["lines"] = len(blob), blob.count(b"\n")
    r["sha256"] = hashlib.sha256(blob).hexdigest()
print(json.dumps({
    "measuredAt": "2026-08-18",
    "commit": subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip(),
    "toolchain": "go1.26.5 darwin/arm64 (mise x go@1.26.5)",
    "note": "sha256 over the committed bytes. The two-run, committed-versus-fresh and mutation arms are in mutation-arms.md.",
    "files": rows}, indent=2))
PY
)

echo "wrote $ART/census.md, $ART/census.json, $ART/mutation-arms.md, $ART/parity-manifest.json"
