#!/bin/sh
# Prep probe: are the sketch's four must-not-compile controls load-bearing?
#
# The sketch claims it "type-checks ONLY IF each line below fails to". That is
# two claims, and both are testable with the pinned compiler:
#
#   1. as committed, the file is green;
#   2. with every @ts-expect-error neutralised, each control reports its own
#      error — so no control is riding on another's suppression, and none is
#      silently satisfied.
#
# Run from the repository root:  sh scratch/dev-codegen-prep/probe-controls.sh
set -e
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

sketch="$root/verify/kernel/projections/kernel.ts"

cat > "$work/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "target": "es2022",
    "module": "preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "skipLibCheck": true
  },
  "files": ["./subject.ts"]
}
JSON

echo "== 1. the sketch as committed"
cp "$sketch" "$work/subject.ts"
if tsgo -p "$work/tsconfig.json"; then
  echo "   GREEN — the four controls all fail to compile, as claimed"
else
  echo "   RED — the sketch does not type-check standalone"
  exit 1
fi

echo
echo "== 2. the same file with every control neutralised"
# Count only the directive lines. The header prose mentions the directive
# by name, and a count that included it would overstate the inventory.
echo "   declared controls: $(grep -c '^// @ts-expect-error' "$sketch")"
sed 's|// @ts-expect-error|// (control neutralised)|' "$sketch" > "$work/subject.ts"
errors=$(tsgo -p "$work/tsconfig.json" 2>&1 | grep -c 'error TS' || true)
echo "   errors reported:   $errors"
tsgo -p "$work/tsconfig.json" 2>&1 | grep 'error TS' | sed 's|^.*subject.ts|   subject.ts|'
