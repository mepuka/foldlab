#!/usr/bin/env bash
# EXEMPLAR ONLY — not wired into any gate.
#
# The negative-control arm for the kmgen validator. Each row mutates the
# sample artifact in exactly one way the freeze forbids and asserts the
# validator REFUSES it. A checker that cannot fail proves nothing.
set -uo pipefail
cd "$(dirname "$0")"

SRC=sample-kernel-conformance.ndjson
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

check() {
  local name="$1" file="$2"
  local out
  if out=$(go run ./kmgen.go "$file" "$TMP/out" 2>&1); then
    echo "CONTROL: FAIL — $name was ACCEPTED (the validator cannot see it)"
    fail=$((fail + 1))
  else
    echo "CONTROL: PASS — $name refused: $(printf '%s' "$out" | grep -m1 REFUSED)"
    pass=$((pass + 1))
  fi
}

# 1. Header count disagrees with the emitted record count.
sed '1s/"kind":12/"kind":11/' "$SRC" > "$TMP/count.ndjson"
check "header-count-mismatch" "$TMP/count.ndjson"

# 2. Key order permuted inside a record (alphabetical, as a sorting
#    serializer would emit).
sed '2s/.*/{"name":"schema","rank":0,"record":"kind"}/' "$SRC" > "$TMP/keyorder.ndjson"
check "key-order-permuted" "$TMP/keyorder.ndjson"

# 3. CRLF line endings.
sed 's/$/\r/' "$SRC" > "$TMP/crlf.ndjson"
check "crlf-line-endings" "$TMP/crlf.ndjson"

# 4. A non-ASCII byte in a taught text (an em dash).
sed '20s/repair/rep\xe2\x80\x94air/' "$SRC" > "$TMP/utf8.ndjson"
check "non-ascii-byte" "$TMP/utf8.ndjson"

# 5. A float where a Nat belongs.
sed '2s/"rank":0/"rank":0.0/' "$SRC" > "$TMP/float.ndjson"
check "float-in-nat-position" "$TMP/float.ndjson"

# 6. An unknown format major. A consumer must refuse, never guess.
sed '1s/"format":1/"format":2/' "$SRC" > "$TMP/format.ndjson"
check "unknown-format-major" "$TMP/format.ndjson"

# 7. Records out of file order (a kind record after the admissions).
{ cat "$SRC"; echo '{"record":"kind","name":"schema","rank":0}'; } > "$TMP/order.ndjson"
check "record-out-of-order" "$TMP/order.ndjson"

# 8. A rank hole (ranks must be dense and ascending from zero).
sed '3s/"rank":1/"rank":2/' "$SRC" > "$TMP/rank.ndjson"
check "rank-not-dense" "$TMP/rank.ndjson"

# 9. An admission naming a reason with no refusal row.
sed 's/"reason":"clock-read"}/"reason":"invented-reason"}/' "$SRC" > "$TMP/reason.ndjson"
check "admission-reason-unknown" "$TMP/reason.ndjson"

# 10. A refusal row that refuses without teaching a repair. (Line 19 is
#     the first refusal record: 1 header + 12 kinds + 5 stages.)
sed '19s/"repair":"[^"]*"/"repair":""/' "$SRC" > "$TMP/parity.ndjson"
check "refusal-without-repair" "$TMP/parity.ndjson"

# 11. A type field referencing a type that was never declared.
sed 's/"type":"StateLabel"/"type":"NotADeclaredType"/' "$SRC" > "$TMP/ref.ndjson"
check "undeclared-type-reference" "$TMP/ref.ndjson"

# The positive arm: the unmutated artifact must still be ACCEPTED, or
# the controls above prove only that the validator rejects everything.
if go run ./kmgen.go "$SRC" "$TMP/out" >/dev/null 2>&1; then
  echo "CONTROL: PASS — lawful artifact accepted"
  pass=$((pass + 1))
else
  echo "CONTROL: FAIL — lawful artifact was refused"
  fail=$((fail + 1))
fi

echo
echo "CONTROLS: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
