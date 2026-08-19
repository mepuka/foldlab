#!/usr/bin/env bash
# verify/journal/run.sh — the R2 model gate for the hash-chained journal.
#
# Runs TLC on the ratified spec (Journal.tla: three configs, all clean to
# closure), on the refinement into the catalog model (JournalCatalog.tla,
# clean to closure), on the six faithless variants (each MUST be refuted,
# on the exact law its config names — a prover that cannot fail proves
# nothing), on two anti-vacuity witnesses and three residuals (each MUST be
# violated: the violation IS the evidence), and on three bound guards (each
# MUST be rejected by its own ASSUME).  The gate PASSES only on all
# seventeen verdicts together.
#
# The refinement reads verify/catalog/Catalog.tla in place, through
# -DTLA-Library.  The catalog transition table is stated once and is not
# copied here; a divergence between the two directories is impossible
# rather than merely discouraged.
#
# Toolchain pin, stated honestly: the recorded runs (README.md, *.cex.txt)
# used TLC 2026.08.11.125311, tla2tools.jar sha256
# ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f.  The
# upstream download URL below is the tlaplus "v1.8.0" release tag, which
# serves a ROLLING asset — so this script pins by RECORDING the version and
# sha of the jar it actually ran, and the cap2 closure is the
# cross-version canary: 429 states generated / 142 distinct / depth 8,
# reproduced exactly.  A jar that does not reproduce the canary is a
# finding, not a nuisance.
#
# Java: any JRE >= 11.  Resolution order: $TLC_JAVA, then
# `mise x java@21 -- java`, then `java` on PATH.
# Jar: $TLA_TOOLS_JAR, then ../catalog/tools/tla2tools.jar, then ./tools/,
# then downloaded from the pinned URL into ./tools/ (gitignored).

set -uo pipefail
cd "$(dirname "$0")"

TLA_URL="https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar"
RECORDED_TLC="2026.08.11.125311"

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
if [ -z "$JAR" ] && [ -f ../catalog/tools/tla2tools.jar ]; then
  JAR="../catalog/tools/tla2tools.jar"
fi
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
# on stock macOS, where `shasum -a 256` is the form that exists.  A run
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

OUT=$(mktemp -d "${TMPDIR:-/tmp}/journal-tlc.XXXXXX")
FAILED=0

# run <cfg-base> <module> — TLC with the heritage flags: single worker,
# fixed fingerprint seed, deadlock checking off (quiescence is legal here:
# a writer that never finishes is a lawful behaviour, and liveness is not
# modelled).  The catalog directory is on the module path so the
# refinement reads the abstract spec rather than a copy of it.
run_tlc() {
  "${JAVA[@]}" -DTLA-Library=../catalog -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
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
  if [ "$generated" = "429" ] && [ "$distinct" = "142" ] && [ "$depth" = "8" ]; then
    echo "   canary exact: generated=$generated distinct=$distinct depth=$depth"
    return 0
  fi
  echo "   GATE FAILURE: cap2 canary drifted: generated=${generated:-missing}" \
    "distinct=${distinct:-missing} depth=${depth:-missing}; want 429 / 142 / 8"
  return 1
}

expect_clean() { # <cfg-base> <module>
  echo "== $1.cfg (ratified: must be clean to closure)"
  if run_tlc "$1" "$2" && grep -q "No error has been found" "$OUT/$1.out.txt"; then
    echo "   clean: $(summary "$OUT/$1.out.txt")"
    if [ "$1" = "Journal.cap2" ] && ! assert_cap2_canary "$OUT/$1.out.txt"; then
      FAILED=1
    fi
  else
    echo "   GATE FAILURE: expected a clean closure; see $OUT/$1.out.txt"
    echo "   (a real counterexample in Journal.tla is a FINDING about the"
    echo "    ratified laws — capture the trace beside the spec and report it)"
    FAILED=1
  fi
}

expect_violation() { # <cfg-base> <module> <required violation text>
  echo "== $1.cfg (must be refuted: $3)"
  run_tlc "$1" "$2"
  if grep -q "$3" "$OUT/$1.out.txt"; then
    echo "   refuted as required: $(summary "$OUT/$1.out.txt")"
  else
    echo "   GATE FAILURE: the planted defect was NOT caught; the prover"
    echo "   could not fail, so the clean runs above prove nothing."
    echo "   See $OUT/$1.out.txt"
    FAILED=1
  fi
}

expect_assumption_rejection() { # <cfg-base> <dimension guarded by this config>
  echo "== $1.cfg (out of range: TLC must reject the $2 guard)"
  run_tlc "$1" Journal
  if grep -Eq "Error: Assumption .* is false\." "$OUT/$1.out.txt" &&
     ! grep -q "states generated" "$OUT/$1.out.txt"; then
    echo "   rejected as required"
  else
    echo "   GATE FAILURE: the out-of-range config was not rejected by its"
    echo "   own guard; the model may have silently truncated that domain."
    echo "   See $OUT/$1.out.txt"
    FAILED=1
  fi
}

echo "-- ratified model (Journal.tla) --"
expect_clean Journal.cap2   Journal
expect_clean Journal        Journal
expect_clean Journal.tamper Journal
echo
echo "-- the refinement into the catalog model (JournalCatalog.tla) --"
expect_clean JournalCatalog JournalCatalog
echo
echo "-- bound guards (each capped dimension must reject independently) --"
expect_assumption_rejection Journal.overrun-writers  NumWriters
expect_assumption_rejection Journal.overrun-payloads NumPayloads
expect_assumption_rejection Journal.overrun-cap      Cap
echo
echo "-- negative controls (JournalBroken.tla, JournalCatalogBroken.tla) --"
expect_violation JournalBroken.blind      JournalBroken \
  "Invariant ChainIntegrity is violated"
expect_violation JournalBroken.durability JournalBroken \
  "Action property AppendOnly is violated"
expect_violation JournalBroken.resync     JournalBroken \
  "Action property AdoptionIsVerified is violated"
expect_violation JournalBroken.read       JournalBroken \
  "Invariant AnchoredReadIsGenuine is violated"
expect_violation JournalBroken.stalecas   JournalBroken \
  "Invariant NoDuplicatePayload is violated"
expect_violation JournalCatalogBroken     JournalCatalogBroken \
  "of module Catalog is violated"
echo
echo "-- anti-vacuity witnesses (a law about an unreachable branch is a law"
echo "   about nothing; each violation IS the evidence) --"
expect_violation Journal.witness-conflict  Journal \
  "Invariant NoStaleCasConflict is violated"
expect_violation Journal.witness-duplicate Journal \
  "Invariant NoUncertainRetryDuplicate is violated"
echo
echo "-- residuals (stated NON-claims, checked rather than assumed) --"
expect_violation Journal.residual-tail-forgery   Journal \
  "Invariant ChainIntegrity is violated"
expect_violation Journal.residual-laundered-read Journal \
  "Invariant CleanGenesisReadIsGenuineBelowTheTail is violated"
expect_violation Journal.residual-erasure        Journal \
  "Invariant NothingWrittenIsMissing is violated"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "R2 GATE: PASS (4 clean closures, 3 bound rejections, 6 required refutations,"
  echo "               2 witnesses, 3 residuals; caps as configured)"
  echo "Raw TLC output kept in $OUT"
else
  echo "R2 GATE: FAIL — see the outputs above."
  exit 1
fi
