#!/usr/bin/env bash
# EXEMPLAR ONLY — not wired into any gate.
#
# Establishes, by running the Go compiler rather than by assertion, what
# Go's type system does and does not enforce for the schema's brands.
set -uo pipefail
cd "$(dirname "$0")"

echo "--- ACCEPTED arm (must run) ---"
if ! go run ./accepted.go; then
  echo "PROBE: FAIL - the accepted arm did not run"
  exit 1
fi

echo "--- REFUSED arm (must not compile) ---"
if diagnostics=$(go build -o /dev/null ./refused.go 2>&1); then
  echo "PROBE: FAIL - the refused arm compiled; Go's brand separation moved"
  exit 1
fi
while IFS= read -r line; do
  [ -z "$line" ] && continue
  if ! grep -qF "$line" <<< "$diagnostics"; then
    printf '%s\n' "$diagnostics"
    echo "PROBE: FAIL - lost pinned diagnosis: $line"
    exit 1
  fi
done < expected.txt
printf '%s\n' "$diagnostics"
echo "PROBE: PASS - both arms behaved as documented ($(go version))"
