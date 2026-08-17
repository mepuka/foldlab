#!/usr/bin/env bash
# RQ-7 reference reproduction. Own-authored; not a foldlab gate.
#
# Emits a session certificate, verifies it, then runs five tampering
# controls. Every control must exit nonzero and name the obligation it
# broke; the honest run must exit zero.
#
# Requires bun (or node). No network, no packages.

set -u
cd "$(dirname "$0")"

if command -v bun >/dev/null 2>&1; then JS=bun; else JS=node; fi
echo "runtime: $JS $($JS --version 2>&1 | head -1)"

hr() { printf '\n===== %s =====\n' "$1"; }
expect() { # expect <wanted-exit> <label> <cmd...>
  local want="$1" label="$2"; shift 2
  "$@"; local rc=$?
  if [ "$rc" -eq "$want" ]; then printf '[%s] exit=%d  as expected\n' "$label" "$rc"
  else printf '[%s] exit=%d  UNEXPECTED (wanted %d)\n' "$label" "$rc" "$want"; fi
}

hr "emit"
$JS emit.mjs

hr "0. honest certificate — expect exit 0"
expect 0 honest $JS check.mjs

hr "1. journal entry edited — expect refusal"
# The op strings inside the journal are escaped JSON, so a naive
# sed 's/"ada"/"eve"/' matches nothing and produces an identical file —
# a control that cannot fail. Edit the parsed structure instead, and
# assert the bytes actually changed before running the check.
$JS -e '
const fs=require("fs");const j=JSON.parse(fs.readFileSync("journal.json","utf8"));
const before=JSON.stringify(j);
j.entries[0].op=j.entries[0].op.replace("\"ada\"","\"eve\"");
if(JSON.stringify(j)===before){console.error("tamper was a no-op");process.exit(2);}
fs.writeFileSync("journal-edited.json",JSON.stringify(j,null,2)+"\n");'
expect 1 edited-entry $JS check.mjs certificate.json journal-edited.json

hr "2. journal truncated (last entry dropped) — expect refusal"
$JS -e '
const fs=require("fs");const j=JSON.parse(fs.readFileSync("journal.json","utf8"));
j.entries.pop();fs.writeFileSync("journal-short.json",JSON.stringify(j,null,2)+"\n");'
expect 1 truncated $JS check.mjs certificate.json journal-short.json

hr "3. certificate asserts a different verdict — expect refusal"
sed 's/"finalStateDigest": "./&f/' certificate.json > certificate-forged.json
expect 1 forged-verdict $JS check.mjs certificate-forged.json journal.json

hr "4. certificate claims a different kernel — expect refusal"
sed 's/"kernelDigest": "./&f/' certificate.json > certificate-otherkernel.json
expect 1 wrong-kernel $JS check.mjs certificate-otherkernel.json journal.json

hr "5. the kernel artifact itself is modified — expect refusal"
cp kernel.mjs kernel.mjs.bak
sed 's/return { state: stateBytes, receipt: refusal("conflict") };/return { state: stateBytes, receipt: { ok: true, effect: "filled" } };/' kernel.mjs.bak > kernel.mjs
expect 1 swapped-kernel $JS check.mjs
mv kernel.mjs.bak kernel.mjs

hr "6. control — after restoring the kernel, the honest run is green again"
expect 0 restored $JS check.mjs

hr "cleanup"
rm -f journal.json certificate.json journal-edited.json journal-short.json \
      certificate-forged.json certificate-otherkernel.json
echo "generated files removed; committed tree is source only"
