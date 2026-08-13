#!/usr/bin/env bash
# verify/catalog/run.sh — the R2 model gate for the catalog + ingress laws.
#
# Runs TLC on the ratified spec (Catalog.tla: two configs, both must be
# clean to closure) and on the four faithless variants (CatalogBroken.tla:
# each MUST be refuted, on the exact invariant its config names — a prover
# that cannot fail proves nothing).  The gate PASSES only on all six
# verdicts together.
#
# Toolchain pin, stated honestly: the recorded runs (README.md, *.cex.txt)
# used TLC 2.19 of 08 August 2024 (rev 5a47802), tla2tools.jar
# sha256 936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88.
# The upstream download URL below is the tlaplus "v1.8.0" release tag,
# which serves a ROLLING asset (verified 2026-08-12: it served TLC
# 2026.08.11.125311, sha256 ab323b79802aedc3203b3f9af37c6aca3ed43f4e02
# 25b36f2aa77b26de46c05f) — so this script pins by RECORDING the version
# and sha of the jar it actually ran, and the cap2 closure is the
# cross-version canary: 119,145 states generated / 18,295 distinct /
# depth 16, reproduced exactly by both jars above.  A jar that does not
# reproduce the canary is a finding, not a nuisance.
#
# Java: any JRE >= 11.  Resolution order: $TLC_JAVA, then
# `mise x java@21 -- java` (provisions Temurin 21 on first use), then
# `java` on PATH.  If none work: install Java 21, e.g.
#   mise use -g java@21          (or)   winget install EclipseAdoptium.Temurin.21.JDK
# Jar: $TLA_TOOLS_JAR, then ./tools/tla2tools.jar, then downloaded from
# the pinned URL into ./tools/ (gitignored).

set -uo pipefail
cd "$(dirname "$0")"

TLA_URL="https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar"
RECORDED_TLC="2.19"   # the version the committed results were produced with

# --- java -------------------------------------------------------------------
if [ -n "${TLC_JAVA:-}" ]; then
  JAVA=("$TLC_JAVA")
elif command -v mise >/dev/null 2>&1 && mise x java@21 -- java -version >/dev/null 2>&1; then
  JAVA=(mise x java@21 -- java)
elif command -v java >/dev/null 2>&1; then
  JAVA=(java)
else
  echo "FAIL: no Java found. Install a JRE >= 11 — e.g. 'mise use -g java@21'" >&2
  echo "      or 'winget install EclipseAdoptium.Temurin.21.JDK' — and re-run." >&2
  exit 2
fi

# --- tla2tools.jar ----------------------------------------------------------
JAR="${TLA_TOOLS_JAR:-}"
if [ -z "$JAR" ] && [ -f tools/tla2tools.jar ]; then
  JAR="tools/tla2tools.jar"
fi
if [ -z "$JAR" ]; then
  echo "Downloading tla2tools.jar from $TLA_URL (~2.3 MB)..."
  mkdir -p tools
  curl -fsSL -o tools/tla2tools.jar "$TLA_URL" || {
    echo "FAIL: download failed. Fetch tla2tools.jar manually and set TLA_TOOLS_JAR." >&2
    exit 2
  }
  JAR="tools/tla2tools.jar"
fi

# sha256 of the jar actually run.  Portable: coreutils `sha256sum` is absent
# on stock macOS, where `shasum -a 256` is the form that exists; Linux images
# often ship the reverse.  Try both, fail loudly if neither is there — a run
# record that cannot state the sha of its jar is not a run record.
sha256_of() { # <file>
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    echo "FAIL: neither sha256sum nor shasum found; cannot pin the jar." >&2
    exit 2
  fi
}

SHA=$(sha256_of "$JAR")
VERSION=$("${JAVA[@]}" -cp "$JAR" tlc2.TLC -h 2>/dev/null | grep -m1 -oE "Version [^ ]+" || true)
echo "TLC jar: $JAR"
echo "  sha256: $SHA"
echo "  $VERSION  (recorded results used TLC $RECORDED_TLC; the cap2 canary below"
echo "   is what makes a different jar comparable)"
echo

OUT=$(mktemp -d "${TMPDIR:-/tmp}/catalog-tlc.XXXXXX")
FAILED=0

# run <cfg-base> <module> — TLC with the heritage flags: single worker,
# fixed fingerprint seed, deadlock checking off (quiescence is legal here:
# converged creates and refusals are observable no-ops).
run_tlc() {
  "${JAVA[@]}" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
    -workers 1 -fp 1 -deadlock -metadir "$OUT/meta-$1" \
    -config "$1.cfg" "$2.tla" >"$OUT/$1.out.txt" 2>&1
}

summary() { # <file>
  grep -E "states generated, .* distinct" "$1" | tail -1
}

assert_cap2_canary() { # <file>
  local file="$1"
  local counts generated distinct depth
  counts=$(grep -Eo '[0-9]+ states generated, [0-9]+ distinct states found' "$file" | tail -1 || true)
  generated=$(printf '%s\n' "$counts" | awk '{print $1}')
  distinct=$(printf '%s\n' "$counts" | awk '{print $4}')
  depth=$(grep -Eo 'The depth of the complete state graph search is [0-9]+' "$file" | tail -1 | awk '{print $10}' || true)
  if [ "$generated" = "119145" ] && [ "$distinct" = "18295" ] && [ "$depth" = "16" ]; then
    echo "   canary exact: generated=$generated distinct=$distinct depth=$depth"
    return 0
  fi
  echo "   GATE FAILURE: cap2 canary drifted: generated=${generated:-missing}" \
    "distinct=${distinct:-missing} depth=${depth:-missing}; want 119145 / 18295 / 16"
  return 1
}

expect_clean() { # <cfg-base>
  echo "== $1.cfg (ratified: must be clean to closure)"
  if run_tlc "$1" Catalog && grep -q "No error has been found" "$OUT/$1.out.txt"; then
    echo "   clean: $(summary "$OUT/$1.out.txt")"
    if [ "$1" = "Catalog.cap2" ] && ! assert_cap2_canary "$OUT/$1.out.txt"; then
      FAILED=1
    fi
  else
    echo "   GATE FAILURE: expected a clean closure; see $OUT/$1.out.txt"
    echo "   (a real counterexample in Catalog.tla is a FINDING about the"
    echo "    ratified laws — capture the trace beside the spec and report it)"
    FAILED=1
  fi
}

expect_violation() { # <cfg-base> <required violation text>
  echo "== $1.cfg (faithless: TLC must report: $2)"
  run_tlc "$1" CatalogBroken
  if grep -q "$2" "$OUT/$1.out.txt"; then
    echo "   refuted as required: $(summary "$OUT/$1.out.txt")"
  else
    echo "   GATE FAILURE: the planted defect was NOT caught; the prover"
    echo "   could not fail, so the clean runs above prove nothing."
    echo "   See $OUT/$1.out.txt"
    FAILED=1
  fi
}

echo "-- ratified model (Catalog.tla); the gate config takes ~11 min --"
expect_clean  Catalog.cap2
expect_clean  Catalog
echo
echo "-- negative controls (CatalogBroken.tla) --"
# Registry citation catalog-model:W4 (source-local ID remains W4 in Catalog.tla).
expect_violation CatalogBroken        "Invariant NoAdmissionOnFaith is violated"
expect_violation CatalogBroken.forge  "Invariant LagIsAbsenceNeverWrongData is violated"
# Registry citation catalog-model:W1 (source-local ID remains W1 in Catalog.tla).
expect_violation CatalogBroken.assert "Invariant Convergence is violated"
expect_violation CatalogBroken.reset  "Action property ResolutionMonotonicity is violated"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "R2 GATE: PASS (2 clean closures, 4 required refutations; caps as configured)"
  echo "Raw TLC output kept in $OUT"
else
  echo "R2 GATE: FAIL — see the outputs above."
  exit 1
fi
