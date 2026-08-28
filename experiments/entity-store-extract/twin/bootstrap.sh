#!/usr/bin/env bash
# Materialize the twin's pinned build inputs (idempotent, digest-checked).
#
# The lean4-tree-sitter study/build clone lives under .staging/ (gitignored
# estate-wide); this script clones it at the pinned revision, runs its
# vendoring script for the C seam (tree-sitter core v0.24.7 +
# tree-sitter-typescript 75b3874e per its ffi/language_definitions.json), and
# refuses to proceed unless every vendored C-seam source matches the digest
# recorded in .reference/provenance/receipts/lean4-tree-sitter-stage1-standup.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLONES="$ROOT/.staging/treesitter/clones"
PIN=3a57f55e1401484251cfe80e26583d9ed94c82c8

mkdir -p "$CLONES"
if [ ! -d "$CLONES/lean4-tree-sitter/.git" ]; then
  git clone https://github.com/predictable-machines/lean4-tree-sitter "$CLONES/lean4-tree-sitter"
fi
cd "$CLONES/lean4-tree-sitter"
if [ "$(git rev-parse HEAD)" != "$PIN" ]; then
  git fetch -q origin "$PIN" || git fetch -q origin
  git checkout -q "$PIN"
fi
[ "$(git rev-parse HEAD)" = "$PIN" ] || { echo "bootstrap: clone is not at pin $PIN" >&2; exit 1; }

if [ ! -f ffi/tree-sitter/lib/src/lib.c ] || [ ! -f ffi/parsers/typescript/src/parser.c ]; then
  (cd ffi && bash vendor_grammars.sh)
fi

verify() {
  echo "$1  $2" | shasum -a 256 -c - >/dev/null 2>&1 \
    || { echo "bootstrap: digest mismatch for $2 (receipt lean4-tree-sitter-stage1-standup)" >&2; exit 1; }
}
verify 73e83dc2052f10f251c1519cb316fc3d13a079fe0c5e2e99a0f98dbf73a532e0 ffi/tree-sitter/lib/src/lib.c
verify 74fe453edd70f4eae9af0a1050cbd7943d8971d59165b6aaebbaa0a0b716d1aa ffi/parsers/typescript/src/parser.c
verify 9125013b42cb888379d9be909f1d73dfb75a37626c2cdbf4122718a2b431a6d3 ffi/parsers/typescript/src/scanner.c
verify cd21b3505af40263a7facd9bec41902c0dd5646e4702498b8e55e6df40027a6c ffi/shim.c

echo "twin bootstrap: pin $PIN verified, C seam vendored and digest-checked"
