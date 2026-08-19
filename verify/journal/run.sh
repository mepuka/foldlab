#!/usr/bin/env bash
# verify/journal/run.sh — the R2 model gate for the hash-chained journal.
#
# Runs TLC on the ratified spec (Journal.tla: three configs — the CAS race,
# the storage adversary, and the crash budget — all of which must be clean to
# closure), on three bound guards that must each be rejected by their own
# ASSUME, on the five faithless variants (JournalBroken.tla: each MUST be
# refuted on the exact law its config names), and on the REFINEMENT into the
# catalog model (JournalCatalog.tla, clean, plus two faithless bridges).  The
# gate PASSES only on all fourteen verdicts together — a prover that cannot
# fail proves nothing.
#
# The refinement modules read Catalog.tla out of ../catalog, so TLC is given
# that directory on its module path; nothing is copied, and the catalog's
# transition table is still stated exactly once.
#
# Toolchain pin, stated honestly: the recorded runs (README.md, *.cex.txt)
# used TLC 2026.08.11.125311 (rev 0894c34), tla2tools.jar sha256
# ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f.  The
# upstream download URL below is the tlaplus "v1.8.0" release tag, which
# serves a ROLLING asset — so this script pins by RECORDING the version and
# sha of the jar it actually ran, and the race-config closure is the
# cross-version canary: 2,845 states generated / 1,077 distinct / depth 10.
# A jar that does not reproduce the canary is a finding, not a nuisance.
#
# Java: any JRE >= 11.  Resolution order: $TLC_JAVA, then
# `mise x java@21 -- java` (provisions Temurin 21 on first use), then `java`
# on PATH.  Jar: $TLA_TOOLS_JAR, then ./tools/tla2tools.jar, then
# ../catalog/tools/tla2tools.jar, then downloaded from the pinned URL into
# ./tools/ (gitignored).

set -uo pipefail
cd "$(dirname "$0")"

TLA_URL="https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar"
RECORDED_TLC="2026.08.11.125311"   # the version the committed results used

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
if [ -z "$JAR" ] && [ -f ../catalog/tools/tla2tools.jar ]; then
  JAR="../catalog/tools/tla2tools.jar"
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

# The JVM classpath separator is ';' on Windows JVMs (including the native
# JVM a Git Bash / MSYS shell invokes) and ':' elsewhere.  Getting this wrong
# turns the refinement runs into "module Catalog not found", which reads like
# a skip rather than a failure.
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) CPSEP=';' ;;
  *)                    CPSEP=':' ;;
esac
CP="$JAR${CPSEP}../catalog"

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
echo "  $VERSION  (recorded results used TLC $RECORDED_TLC; the race canary"
echo "   below is what makes a different jar comparable)"
echo

OUT=$(mktemp -d "${TMPDIR:-/tmp}/journal-tlc.XXXXXX")
FAILED=0

# run <cfg-base> <module> — TLC with the heritage flags: single worker, fixed
# fingerprint seed, deadlock checking off (quiescence is legal here: a full
# journal with idle appenders is a legal terminal state, not a bug).
run_tlc() {
  "${JAVA[@]}" -XX:+UseParallelGC -cp "$CP" tlc2.TLC \
    -workers 1 -fp 1 -deadlock -metadir "$OUT/meta-$1" \
    -config "$1.cfg" "$2.tla" >"$OUT/$1.out.txt" 2>&1
  rm -f Journal_TTrace_*.tla JournalCatalog_TTrace_*.tla \
        JournalBroken_TTrace_*.tla JournalCatalogBroken_TTrace_*.tla 2>/dev/null
}

summary() { # <file>
  grep -E "states generated, .* distinct" "$1" | tail -1
}

assert_race_canary() { # <file>
  local file="$1" counts generated distinct depth
  counts=$(grep -Eo '[0-9]+ states generated, [0-9]+ distinct states found' "$file" | tail -1 || true)
  generated=$(printf '%s\n' "$counts" | awk '{print $1}')
  distinct=$(printf '%s\n' "$counts" | awk '{print $4}')
  depth=$(grep -Eo 'The depth of the complete state graph search is [0-9]+' "$file" | tail -1 | awk '{print $10}' || true)
  if [ "$generated" = "2845" ] && [ "$distinct" = "1077" ] && [ "$depth" = "10" ]; then
    echo "   canary exact: generated=$generated distinct=$distinct depth=$depth"
    return 0
  fi
  echo "   GATE FAILURE: race canary drifted: generated=${generated:-missing}" \
    "distinct=${distinct:-missing} depth=${depth:-missing}; want 2845 / 1077 / 10"
  return 1
}

expect_clean() { # <cfg-base> <module>
  echo "== $1.cfg (ratified: must be clean to closure)"
  if run_tlc "$1" "$2" && grep -q "No error has been found" "$OUT/$1.out.txt"; then
    echo "   clean: $(summary "$OUT/$1.out.txt")"
    if [ "$1" = "Journal" ] && ! assert_race_canary "$OUT/$1.out.txt"; then
      FAILED=1
    fi
  else
    echo "   GATE FAILURE: expected a clean closure; see $OUT/$1.out.txt"
    echo "   (a real counterexample in a ratified spec is a FINDING about the"
    echo "    laws — capture the trace beside the spec and report it)"
    FAILED=1
  fi
}

expect_violation() { # <cfg-base> <module> <required violation text>
  echo "== $1.cfg (faithless: TLC must report: $3)"
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

echo "-- ratified model (Journal.tla): the race, the adversary, the crash --"
expect_clean Journal         Journal
expect_clean Journal.tamper  Journal
expect_clean Journal.crash   Journal
echo
echo "-- bound guards (each capped dimension must reject independently) --"
expect_assumption_rejection Journal.overrun-writers  NumWriters
expect_assumption_rejection Journal.overrun-payloads NumPayloads
expect_assumption_rejection Journal.overrun-cap      Cap
echo
echo "-- negative controls (JournalBroken.tla) --"
expect_violation JournalBroken.cas     JournalBroken \
  "Action property WritersNeverForkTheChain is violated"
expect_violation JournalBroken.outcome JournalBroken \
  "Action property AppendIsExactlyOnceOrConflict is violated"
expect_violation JournalBroken.read    JournalBroken \
  "Invariant ReadIsTamperEvident is violated"
expect_violation JournalBroken.adopt   JournalBroken \
  "Action property OnlyVerifiedHeadsAreAdopted is violated"
expect_violation JournalBroken.restart JournalBroken \
  "Action property RecoveryIsPureStorage is violated"
echo
echo "-- the refinement into the catalog model (JournalCatalog.tla) --"
expect_clean JournalCatalog JournalCatalog
# The split-CAS conformance obligation received from R4-FINDING-001: drop the
# expected-position guard and the catalog's stale-CAS conflict stops being
# implemented, which is the whole content of the obligation.
expect_violation JournalCatalogBroken.cas      JournalCatalogBroken \
  "Action property CatalogRefinement is violated"
expect_violation JournalCatalogBroken.converge JournalCatalogBroken \
  "Invariant CatalogConvergence is violated"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "R2 GATE: PASS (4 clean closures, 3 bound rejections, 7 required refutations; caps as configured)"
  echo "Raw TLC output kept in $OUT"
else
  echo "R2 GATE: FAIL — see the outputs above."
  exit 1
fi
