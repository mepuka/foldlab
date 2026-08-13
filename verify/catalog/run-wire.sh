#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")"

JAR="${TLA_TOOLS_JAR:-tools/tla2tools.jar}"
if [[ ! -f "$JAR" ]]; then
  mkdir -p "$(dirname "$JAR")"
  curl -fsSL -o "$JAR" \
    "https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar" || exit 2
fi

if command -v mise >/dev/null 2>&1; then
  JAVA=(mise x java@21 -- java)
else
  JAVA=(java)
fi

OUT=$(mktemp -d "${TMPDIR:-/tmp}/catalog-wire-tlc.XXXXXX")

run_tlc() {
  "${JAVA[@]}" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
    -workers 1 -fp 1 -deadlock -metadir "$OUT/meta-$1" \
    -config "$1.cfg" "$2.tla" >"$OUT/$1.out.txt" 2>&1
}

echo "-- split-model refactor canary --"
if ! run_tlc Catalog.cap2 Catalog ||
   ! grep -q "119145 states generated, 18295 distinct states found" "$OUT/Catalog.cap2.out.txt"; then
  cat "$OUT/Catalog.cap2.out.txt"
  echo "FAIL: split-model canary moved; see $OUT" >&2
  exit 1
fi
cat "$OUT/Catalog.cap2.out.txt"

echo "-- honest CreateAtomic refinement --"
if ! run_tlc CatalogWire CatalogWire ||
   ! grep -q "Model checking completed. No error has been found." "$OUT/CatalogWire.out.txt"; then
  cat "$OUT/CatalogWire.out.txt"
  echo "FAIL: CreateAtomic refinement did not close cleanly; see $OUT" >&2
  exit 1
fi
cat "$OUT/CatalogWire.out.txt"

echo "-- faithless CreateAtomic refinement --"
if run_tlc CatalogWireBroken CatalogWireBroken; then
  cat "$OUT/CatalogWireBroken.out.txt"
  echo "FAIL: faithless CreateAtomic bridge came back green; see $OUT" >&2
  exit 1
fi
if ! grep -q "Action property AtomicRefinement is violated" "$OUT/CatalogWireBroken.out.txt"; then
  cat "$OUT/CatalogWireBroken.out.txt"
  echo "FAIL: faithless CreateAtomic bridge was not refuted; see $OUT" >&2
  exit 1
fi
cat "$OUT/CatalogWireBroken.out.txt"

echo "CREATEATOMIC BRIDGE: PASS (split canary stable, honest bridge clean, faithless bridge refuted)"
echo "Raw TLC output kept in $OUT"
