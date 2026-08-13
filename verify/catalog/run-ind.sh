#!/usr/bin/env bash
# verify/catalog/run-ind.sh — the R3 induction gate for the catalog + ingress
# laws.
#
# Three proof obligations, one drift tripwire, and three negative controls.
# The gate PASSES only on ALL SEVEN verdicts together, and it FAILS on a flip
# in either direction — including a control that comes back green, because a
# prover that cannot fail proves nothing.
#
# Obligations (must be NoError):
#   1 base            Init    => IndInv
#   2 consecution     IndInv /\ Next => IndInv'
#   4 action safety   IndInv /\ Next => AdmissionStep /\ MonotonicityStep
# Tripwire (must be NoError, and is NOT counted as an obligation):
#   3 IndInit => StateSafety is a propositional tautology — StateSafety's
#     conjuncts are verbatim a subset of IndInv's and IndInit conjoins IndInv.
#     It is live ONLY against a future edit that drops a StateSafety conjunct
#     out of IndInv.  See R3-DECISIONS.md D4.
# Controls (must be Error, each on exactly its own named law):
#   5  consecution without the CAS-freshness clause, checked against the named
#      law it breaks: Convergence.
#   6  action safety under BlindIngress = TRUE, checked against the named law
#      it breaks: AdmissionStep.
#   6b INDEPENDENCE: the same blind-ingress run must still SATISFY
#      MonotonicityStep.  A control that breaks everything proves nothing
#      about which law it dropped (verify/AGENTS.md).
# Insensitivity control (must be NoError, and must AGREE with obligation 2):
#   7  consecution at data = Gen(3).  The data bound is a cutoff licensed by
#      an argument (R3-DECISIONS.md D3); this run corroborates it.  A verdict
#      that MOVES between obligation 2 and this run refutes the argument and
#      is a FINDING.
#
# Every control is run against a SINGLE NAMED invariant, so "which law was
# violated" is fixed by the command line rather than by an Apalache conjunct
# index that renumbers whenever IndInv is edited.
#
# Hypothesis bounds are part of the claim: catalog = Gen(3) (the exact natural
# maximum at NumVals = 3), mirror = Gen(4) and creators = Gen(4) (both above
# their natural maxima), data = Gen(2) (an argued cutoff).  CatalogInd.tla's
# header carries the justification for each.
#
# Toolchain pin, stated honestly: the recorded runs (README.md) used Apalache
# 0.61.0 build 831d473, lib/apalache.jar sha256
# 33611081942d392646af60993c599907f1f41752fce4a62304dbf9e2cdad4346, from
# release artifact apalache-0.61.0.tgz sha256
# 68fb56dd9d053cf21d692fd7ec3fbaaeba1395661ec7434fa2b4c47e6fc432b8.  Upstream
# release assets roll; a recorded sha does not — so this script pins by
# RECORDING the sha of the jar it actually ran and by WARNING when it differs
# from the recorded one.
#
# Java: any JDK >= 11.  Resolution order: $APALACHE_JAVA, then
# `mise x java@21 -- java` (provisions Temurin 21 on first use), then `java`
# on PATH.  Jar: $APALACHE_JAR, then ./tools/apalache-0.61.0/lib/apalache.jar,
# then downloaded from the pinned URL into ./tools/ (gitignored).
#
# Runtime: roughly 1-2 hours; the two length=1 consecution runs dominate.
# Set R3_QUICK=1 to skip obligation 7 (the insensitivity control).

set -uo pipefail
cd "$(dirname "$0")"

APALACHE_VERSION="0.61.0"
APALACHE_BUILD="831d473"
APALACHE_URL="https://github.com/apalache-mc/apalache/releases/download/v${APALACHE_VERSION}/apalache-${APALACHE_VERSION}.tgz"
RECORDED_JAR_SHA="33611081942d392646af60993c599907f1f41752fce4a62304dbf9e2cdad4346"
RECORDED_TGZ_SHA="68fb56dd9d053cf21d692fd7ec3fbaaeba1395661ec7434fa2b4c47e6fc432b8"

# --- portable sha256 --------------------------------------------------------
sha256_of() { # <file>
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1        # macOS
  elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$1" | awk '{print $NF}'
  else
    echo "FAIL: no sha256 tool (sha256sum / shasum / openssl)" >&2
    exit 2
  fi
}

# --- java -------------------------------------------------------------------
if [ -n "${APALACHE_JAVA:-}" ]; then
  JAVA=("$APALACHE_JAVA")
elif command -v mise >/dev/null 2>&1 && mise x java@21 -- java -version >/dev/null 2>&1; then
  JAVA=(mise x java@21 -- java)
elif command -v java >/dev/null 2>&1; then
  JAVA=(java)
else
  echo "FAIL: no Java found. Install a JDK >= 11 — e.g. 'mise use -g java@21'" >&2
  echo "      or 'winget install EclipseAdoptium.Temurin.21.JDK' — and re-run." >&2
  exit 2
fi

# --- apalache.jar -----------------------------------------------------------
JAR="${APALACHE_JAR:-}"
if [ -z "$JAR" ] && [ -f "tools/apalache-${APALACHE_VERSION}/lib/apalache.jar" ]; then
  JAR="tools/apalache-${APALACHE_VERSION}/lib/apalache.jar"
fi
if [ -z "$JAR" ]; then
  echo "Downloading apalache-${APALACHE_VERSION}.tgz from $APALACHE_URL (~183 MB)..."
  mkdir -p tools
  if ! curl -fsSL -o "tools/apalache-${APALACHE_VERSION}.tgz" "$APALACHE_URL"; then
    echo "FAIL: download failed. Fetch the release manually and set APALACHE_JAR." >&2
    exit 2
  fi
  TGZ_SHA=$(sha256_of "tools/apalache-${APALACHE_VERSION}.tgz")
  echo "  artifact sha256: $TGZ_SHA"
  [ "$TGZ_SHA" = "$RECORDED_TGZ_SHA" ] || \
    echo "  WARNING: artifact sha differs from the recorded one ($RECORDED_TGZ_SHA)"
  tar xzf "tools/apalache-${APALACHE_VERSION}.tgz" -C tools || {
    echo "FAIL: could not extract the release tarball." >&2; exit 2; }
  JAR="tools/apalache-${APALACHE_VERSION}/lib/apalache.jar"
fi

JAR_SHA=$(sha256_of "$JAR")
echo "Apalache jar: $JAR"
echo "  sha256: $JAR_SHA"
if [ "$JAR_SHA" = "$RECORDED_JAR_SHA" ]; then
  echo "  matches the sha recorded in README.md for Apalache $APALACHE_VERSION build $APALACHE_BUILD"
else
  echo "  WARNING: differs from the recorded sha $RECORDED_JAR_SHA"
  echo "  (verdicts below are still the gate; a differing jar makes the timings incomparable)"
fi
echo "  java: $("${JAVA[@]}" -version 2>&1 | head -1)"
echo

LOGDIR="_runlogs/gate-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$LOGDIR"
echo "Verbatim output: $LOGDIR"
echo
FAILED=0

# run <label> <cfg> <init> <inv> <length> — verbatim log + wall clock
run_apalache() {
  local label=$1 cfg=$2 init=$3 inv=$4 len=$5
  local log="$LOGDIR/$label.log"
  {
    echo "### label:   $label"
    echo "### started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "### jar:     $JAR  sha256 $JAR_SHA"
    echo "### java:    $("${JAVA[@]}" -version 2>&1 | head -1)"
    echo "### cmd:     java -jar apalache.jar check --config=$cfg --init=$init --inv=$inv --length=$len CatalogInd.tla"
    echo "### -----------------------------------------------------------"
  } > "$log"
  local start end
  start=$(date +%s)
  "${JAVA[@]}" -jar "$JAR" check \
    --config="$cfg" --init="$init" --inv="$inv" --length="$len" \
    CatalogInd.tla >> "$log" 2>&1
  local rc=$?
  end=$(date +%s)
  WALL=$((end - start))
  {
    echo "### -----------------------------------------------------------"
    echo "### exit code: $rc"
    echo "### wall clock: ${WALL}s"
  } >> "$log"
  LOG="$log"
}

# expect_noerror <label> <what> <cfg> <init> <inv> <length>
expect_noerror() {
  local label=$1 what=$2
  shift 2
  echo "== $label — $what"
  echo "   (must be NoError)"
  run_apalache "$label" "$@"
  if grep -q "The outcome is: NoError" "$LOG"; then
    echo "   NoError, as required (${WALL}s) — $LOG"
  else
    echo "   GATE FAILURE: expected NoError. See $LOG"
    echo "   (a real counterexample-to-induction here is a FINDING about the"
    echo "    invariant — commit the trace, record it in CLIMB.md, and lead"
    echo "    with it; do not repair the hypothesis to make the run green)"
    FAILED=1
  fi
  echo
}

# expect_error <label> <what> <named-law> <cfg> <init> <inv> <length>
expect_error() {
  local label=$1 what=$2 law=$3
  shift 3
  echo "== $label — $what"
  echo "   (must be Error, on exactly: $law)"
  run_apalache "$label" "$@"
  if grep -q "The outcome is: Error" "$LOG" && grep -qE "invariant .*violated" "$LOG"; then
    echo "   refuted as required on $law (${WALL}s) — $LOG"
    grep -m1 -E "invariant .*violated" "$LOG" | sed 's/^/     /'
  else
    echo "   GATE FAILURE: the planted gap was NOT caught; the prover could"
    echo "   not fail, so the clean verdicts above prove nothing. See $LOG"
    FAILED=1
  fi
  echo
}

echo "-- proof obligations (hypothesis: catalog=Gen(3), mirror=Gen(4), data=Gen(2), creators=Gen(4)) --"
echo
expect_noerror ob1-base         "obligation 1: base, Init => IndInv" \
  CatalogInd.cfg Init IndInv 0
expect_noerror ob2-consecution  "obligation 2: consecution, IndInv /\\ Next => IndInv'" \
  CatalogInd.cfg IndInit IndInv 1
expect_noerror ob4-actionsafety "obligation 4: action safety, admission + monotonicity" \
  CatalogInd.cfg IndInit SafetySteps 1

echo "-- drift tripwire (NOT an obligation: IndInit => StateSafety is a tautology; R3-DECISIONS.md D4) --"
echo
expect_noerror ob3-tripwire     "tripwire: StateSafety still conjoined by IndInv" \
  CatalogInd.cfg IndInit StateSafety 0

echo "-- negative controls (each must be refuted on exactly its own law) --"
echo
expect_error ob5-ctrl-nofresh "control 5: consecution with the CAS-freshness clause dropped" \
  "Convergence" \
  CatalogInd.cfg IndInitSansFreshness Convergence 1
expect_error ob6-ctrl-blind   "control 6: action safety under BlindIngress = TRUE" \
  "AdmissionStep" \
  CatalogInd.blind.cfg IndInit AdmissionStep 1
expect_noerror ob6b-ctrl-blind-independence \
  "control 6b: INDEPENDENCE — blind ingress must NOT disturb MonotonicityStep" \
  CatalogInd.blind.cfg IndInit MonotonicityStep 1

if [ "${R3_QUICK:-0}" = "1" ]; then
  echo "-- insensitivity control SKIPPED (R3_QUICK=1); the data cutoff argument stands on R3-DECISIONS.md D3 --"
  echo
else
  echo "-- data-cutoff insensitivity control (must agree with obligation 2) --"
  echo
  expect_noerror ob7-datadeep "control 7: consecution at data = Gen(3)" \
    CatalogInd.cfg IndInitDataDeep IndInv 1
fi

if [ "$FAILED" -eq 0 ]; then
  echo "R3 GATE: PASS — 3 obligations NoError, 1 tripwire NoError, 2 controls"
  echo "refuted on their named laws, 1 independence control clean, data-cutoff"
  echo "insensitivity clean.  Bounds as configured: 2 daemons, 3 values, 2"
  echo "creators, DataCap = 0; hypothesis catalog=Gen(3) mirror=Gen(4)"
  echo "data=Gen(2) creators=Gen(4).  Nothing outside those bounds is claimed."
  echo "Verbatim output kept in $LOGDIR"
else
  echo "R3 GATE: FAIL — see the verdicts above."
  exit 1
fi
