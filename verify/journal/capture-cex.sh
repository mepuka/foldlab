#!/usr/bin/env bash
# Regenerates every committed counterexample trace beside its config.
# The traces are evidence, not decoration: each is the verbatim TLC output
# for a run the gate REQUIRES to fail.  Re-run this after any change to
# the spec or a control config, and commit what it produces.
set -uo pipefail
cd "$(dirname "$0")"

JAR="${TLA_TOOLS_JAR:-../catalog/tools/tla2tools.jar}"
if command -v mise >/dev/null 2>&1; then JAVA=(mise x java@21 -- java); else JAVA=(java); fi
OUT=$(mktemp -d "${TMPDIR:-/tmp}/journal-cex.XXXXXX")

capture() { # <cfg-base> <module>
  "${JAVA[@]}" -DTLA-Library=../catalog -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
    -workers 1 -fp 1 -deadlock -metadir "$OUT/meta-$1" \
    -config "$1.cfg" "$2.tla" >"$1.cex.txt" 2>&1
  echo "wrote $1.cex.txt"
}

capture JournalBroken.blind             JournalBroken
capture JournalBroken.durability        JournalBroken
capture JournalBroken.resync            JournalBroken
capture JournalBroken.read              JournalBroken
capture JournalBroken.stalecas          JournalBroken
capture JournalCatalogBroken            JournalCatalogBroken
capture Journal.witness-conflict        Journal
capture Journal.witness-duplicate       Journal
capture Journal.residual-tail-forgery   Journal
capture Journal.residual-laundered-read Journal
capture Journal.residual-erasure        Journal
rm -f ./*_TTrace_*.tla ./*_TTrace_*.bin
