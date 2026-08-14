#!/usr/bin/env bash
# verify/implication/run.sh — the gate for the implication-refusal
# formalization: Lean proofs (collapse lemma + projection walls) and the
# TLC model gate (clean spec + three controls).
#
# Verdicts required, all together, or the gate FAILS:
#   1. lake build                          — every Lean theorem checks
#   2. Implication.cfg                     — clean (TypeOK WCoherence WScope WDecision)
#   3. Implication.shipped-coherence.cfg   — REFUTED on exactly WCoherence
#   4. Implication.shipped-scope.cfg       — REFUTED on exactly WScope
#   5. Implication.shipped-decision.cfg    — clean (the defect is report-only)
#
# Toolchain pin, by recording: the committed traces (*.cex.txt) and the
# README run record were produced with TLC 2026.08.11.125311 (rev 0894c34),
# tla2tools.jar sha256
#   ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f
# on Temurin/OpenJDK 21.0.2, and Lean 4.33.0 via elan. The upstream
# v1.8.0 release URL serves a ROLLING asset (see verify/catalog/run.sh);
# a jar that changes these verdicts is a finding, not a nuisance.
#
# Java resolution: $TLC_JAVA, then `mise x java@21 -- java`, then PATH.
# Jar resolution: $TLA_TOOLS_JAR, ../catalog/tools/tla2tools.jar,
# ./tools/tla2tools.jar, else downloaded into ./tools/ (gitignored).

set -uo pipefail
cd "$(dirname "$0")"

TLA_URL="https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar"
FAIL=0

# --- lean -------------------------------------------------------------------
if command -v lake >/dev/null 2>&1; then
  echo "== lean: lake build =="
  if grep -rnE '(:=|by|<;>|;|\|)[[:space:]]*(sorry|admit)\b|^[[:space:]]*(sorry|admit)[[:space:]]*$|^[[:space:]]*axiom[[:space:]]' lean/Implication lean/*.lean 2>/dev/null; then
    echo "FAIL  lean sources contain a sorry/admit tactic or axiom decl (a warning, not a build error — grep-guarded here)"; FAIL=1
  elif (cd lean && lake build); then
    echo "PASS  lean proofs"
  else
    echo "FAIL  lean proofs did not check"; FAIL=1
  fi
else
  echo "FAIL: lake not found. Install elan (e.g. 'scoop install elan') and re-run." >&2
  FAIL=1
fi

# --- java -------------------------------------------------------------------
if [ -n "${TLC_JAVA:-}" ]; then
  JAVA=("$TLC_JAVA")
elif command -v mise >/dev/null 2>&1 && mise x java@21 -- java -version >/dev/null 2>&1; then
  JAVA=(mise x java@21 -- java)
elif command -v java >/dev/null 2>&1; then
  JAVA=(java)
else
  echo "FAIL: no Java found. 'mise use -g java@21' or install a JRE >= 11." >&2
  exit 2
fi

# --- tla2tools.jar ----------------------------------------------------------
JAR="${TLA_TOOLS_JAR:-}"
if [ -z "$JAR" ] && [ -f ../catalog/tools/tla2tools.jar ]; then JAR=../catalog/tools/tla2tools.jar; fi
if [ -z "$JAR" ] && [ -f tools/tla2tools.jar ]; then JAR=tools/tla2tools.jar; fi
if [ -z "$JAR" ]; then
  mkdir -p tools
  echo "fetching tla2tools.jar (rolling asset; verdicts are pinned by recording)"
  curl -fsSL -o tools/tla2tools.jar "$TLA_URL" || { echo "FAIL: could not fetch tla2tools.jar" >&2; exit 2; }
  JAR=tools/tla2tools.jar
fi

mkdir -p _runlogs

tlc() { # cfg-name
  "${JAVA[@]}" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
    -config "Implication.$1.cfg" Implication.tla >"_runlogs/$1.log" 2>&1
}

# --- clean ------------------------------------------------------------------
"${JAVA[@]}" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
  -config Implication.cfg Implication.tla >"_runlogs/clean.log" 2>&1
if grep -q "Model checking completed. No error has been found." _runlogs/clean.log; then
  echo "PASS  clean: repaired rule satisfies TypeOK WCoherence WScope WDecision"
else
  echo "FAIL  clean spec did not come back clean (_runlogs/clean.log)"; FAIL=1
fi

# --- controls: must be refuted on exactly their named invariant -------------
tlc shipped-coherence
if grep -q "Invariant WCoherence is violated." _runlogs/shipped-coherence.log; then
  echo "PASS  control refuted: shipped rule violates WCoherence"
else
  echo "FAIL  shipped-coherence control was NOT refuted on WCoherence"; FAIL=1
fi

tlc shipped-scope
if grep -q "Invariant WScope is violated." _runlogs/shipped-scope.log; then
  echo "PASS  control refuted: shipped rule violates WScope"
else
  echo "FAIL  shipped-scope control was NOT refuted on WScope"; FAIL=1
fi

# --- independence control: must PASS ----------------------------------------
tlc shipped-decision
if grep -q "Model checking completed. No error has been found." _runlogs/shipped-decision.log; then
  echo "PASS  independence: shipped defect is report-only (WDecision holds)"
else
  echo "FAIL  WDecision violated under shipped rule — defect is NOT report-only; finding!"; FAIL=1
fi

# ----------------------------------------------------------------------------
if [ "$FAIL" -ne 0 ]; then
  echo "GATE: FAIL"; exit 1
fi
echo "GATE: PASS (5/5 verdicts)"
