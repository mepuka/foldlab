#!/usr/bin/env bash
# verify/replay/run.sh — the gate for replay soundness (ground-truth
# increment 3): Lean theorems + the bounded register-protocol check.
#
# Verdicts required, all together, or the gate FAILS:
#   1. lake build             — determinacy, schedule-irrelevance, replay
#                               soundness, and the faithless divergence
#                               counterexample all check (no sorry)
#   2. Replay.cfg             — clean (TypeOK, SpecEval) under steals/races
#   3. Replay.faithless.cfg   — REFUTED on exactly SpecEval
#
# Toolchain pin, by recording: TLC 2026.08.11.125311 (rev 0894c34),
# tla2tools.jar sha256
# ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f,
# OpenJDK Temurin 21.0.2, Lean 4.33.0 via elan. See verify/catalog/run.sh
# for the rolling-asset caveat.

set -uo pipefail
cd "$(dirname "$0")"

TLA_URL="https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar"
FAIL=0

if command -v lake >/dev/null 2>&1; then
  echo "== lean: lake build =="
  if grep -rnE '(:=|by|<;>|;|\|)[[:space:]]*(sorry|admit)\b|^[[:space:]]*(sorry|admit)[[:space:]]*$|^[[:space:]]*axiom[[:space:]]' lean/Replay lean/*.lean 2>/dev/null; then
    echo "FAIL  lean sources contain a sorry/admit tactic or axiom decl (a warning, not a build error — grep-guarded here)"; FAIL=1
  elif (cd lean && lake build); then
    echo "PASS  lean proofs (determinacy, replay soundness, faithless control)"
  else
    echo "FAIL  lean proofs did not check"; FAIL=1
  fi
else
  echo "FAIL: lake not found. Install elan (e.g. 'scoop install elan')." >&2
  FAIL=1
fi

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

JAR="${TLA_TOOLS_JAR:-}"
if [ -z "$JAR" ] && [ -f ../catalog/tools/tla2tools.jar ]; then JAR=../catalog/tools/tla2tools.jar; fi
if [ -z "$JAR" ] && [ -f tools/tla2tools.jar ]; then JAR=tools/tla2tools.jar; fi
if [ -z "$JAR" ]; then
  mkdir -p tools
  curl -fsSL -o tools/tla2tools.jar "$TLA_URL" || { echo "FAIL: could not fetch tla2tools.jar" >&2; exit 2; }
  JAR=tools/tla2tools.jar
fi

mkdir -p _runlogs

"${JAVA[@]}" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
  -config Replay.cfg Replay.tla >_runlogs/clean.log 2>&1
if grep -q "Model checking completed. No error has been found." _runlogs/clean.log; then
  echo "PASS  clean: ready-guarded protocol commits only denotation values"
else
  echo "FAIL  clean spec not clean (_runlogs/clean.log)"; FAIL=1
fi

"${JAVA[@]}" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
  -config Replay.faithless.cfg Replay.tla >_runlogs/faithless.log 2>&1
if grep -q "Invariant SpecEval is violated." _runlogs/faithless.log; then
  echo "PASS  control refuted: unguarded commits violate SpecEval"
else
  echo "FAIL  faithless control NOT refuted on SpecEval"; FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then echo "GATE: FAIL"; exit 1; fi
echo "GATE: PASS (3/3 verdicts)"
