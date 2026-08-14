#!/usr/bin/env bash
# verify/pipeline/run.sh — the gate for the create-pipeline model:
# the snapshot law, the shipped head-read refuted, the orphan-fact
# residual recorded.
#
# Verdicts required, all together, or the gate FAILS:
#   1. Pipeline.cfg                 clean (TypeOK SeqHeadCoherent RepliedImpliesBridged)
#   2. Pipeline.shipped.cfg         REFUTED on exactly SeqHeadCoherent
#   3. Pipeline.orphan.cfg          REFUTED on exactly NoOrphanFact (the §5.3 finding)
#   4. Pipeline.shipped-bridged.cfg clean (defect is head provenance only)
#
# Toolchain pin, by recording: committed traces and the README run record
# were produced with TLC 2026.08.11.125311 (rev 0894c34), tla2tools.jar
# sha256 ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f,
# OpenJDK Temurin 21.0.2. See verify/catalog/run.sh for the rolling-asset
# caveat on the upstream URL.

set -uo pipefail
cd "$(dirname "$0")"

TLA_URL="https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar"
FAIL=0

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

tlc() {
  "${JAVA[@]}" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
    -config "Pipeline$1.cfg" Pipeline.tla >"_runlogs/$2.log" 2>&1
}

tlc "" clean
if grep -q "Model checking completed. No error has been found." _runlogs/clean.log; then
  echo "PASS  clean: snapshot rule satisfies the snapshot law (crashes enabled)"
else
  echo "FAIL  clean spec not clean (_runlogs/clean.log)"; FAIL=1
fi

tlc ".shipped" shipped
if grep -q "Invariant SeqHeadCoherent is violated." _runlogs/shipped.log; then
  echo "PASS  control refuted: shipped head-read violates SeqHeadCoherent"
else
  echo "FAIL  shipped control NOT refuted on SeqHeadCoherent"; FAIL=1
fi

tlc ".orphan" orphan
if grep -q "Invariant NoOrphanFact is violated." _runlogs/orphan.log; then
  echo "PASS  finding recorded: crash between fact and bridge orphans the fact"
else
  echo "FAIL  orphan control NOT refuted on NoOrphanFact"; FAIL=1
fi

tlc ".shipped-bridged" shipped-bridged
if grep -q "Model checking completed. No error has been found." _runlogs/shipped-bridged.log; then
  echo "PASS  independence: shipped defect is head provenance only"
else
  echo "FAIL  RepliedImpliesBridged violated under shipped rule — new finding!"; FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then echo "GATE: FAIL"; exit 1; fi
echo "GATE: PASS (4/4 verdicts)"
