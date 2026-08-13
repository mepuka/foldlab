#!/usr/bin/env bash
# BREAKER probe runner. Not a ratified artifact; never invoked by run.sh.
# usage: bash probes/run-probe.sh <cfg-basename> <module-path> <workers> [extra tlc args...]
# Run from verify/catalog. Writes verbatim TLC output to probes/_runlogs/.
set -uo pipefail
cd "$(dirname "$0")/.."

CFG="$1"; MODULE="$2"; WORKERS="$3"; shift 3

LOG="probes/_runlogs/${CFG}.txt"
JAR="tools/tla2tools.jar"

{
  echo "### BREAKER probe: $CFG"
  echo "### module: $MODULE"
  echo "### started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "### jar sha256: $(shasum -a 256 "$JAR" | cut -d' ' -f1)"
  echo "### command: mise x java@21 -- java -Xmx12g -XX:+UseParallelGC -DTLA-Library=probes -cp $JAR tlc2.TLC -workers $WORKERS -fp 1 -deadlock $* -config probes/$CFG.cfg $MODULE"
  echo "###"
} > "$LOG"

START=$(date +%s)
mise x java@21 -- java -Xmx12g -XX:+UseParallelGC -DTLA-Library=probes \
  -cp "$JAR" tlc2.TLC -workers "$WORKERS" -fp 1 -deadlock "$@" \
  -metadir "/tmp/breaker-meta-$CFG" \
  -config "probes/$CFG.cfg" "$MODULE" >> "$LOG" 2>&1
RC=$?
END=$(date +%s)

{
  echo "###"
  echo "### exit code: $RC"
  echo "### wall clock: $((END-START))s"
  echo "### finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >> "$LOG"

echo "=== $CFG  exit=$RC  wall=$((END-START))s  log=$LOG"
grep -E "states generated|depth of the complete state|No error has been found|is violated|^Error:" "$LOG" | head -8
