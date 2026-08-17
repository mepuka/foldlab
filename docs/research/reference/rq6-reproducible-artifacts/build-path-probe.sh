#!/usr/bin/env bash
# build-path-probe.sh — own-authored, no third-party code.
#
# Purpose (foldlab RQ-6): demonstrate, mechanically, the single most common
# reason a "two clean checkouts produce the same bytes" gate fails — the
# build path leaking into the artifact — using a wasm-producing toolchain
# that is already in this estate (Go, GOOS=wasip1).
#
# The Reproducible Builds project names this source of nondeterminism at
# https://reproducible-builds.org/docs/build-path/ . This script is the
# local, executable version of that claim: it builds the same source from
# two directories whose names differ in length and compares digests, with
# and without the toolchain's path-trimming flag.
#
# Usage:  bash build-path-probe.sh [workdir]
# Exit:   0 if the expected pattern held (same dir identical, different dir
#         differs without -trimpath, identical with -trimpath), 1 otherwise.

set -u
WORK="${1:-./_build-path-probe}"
A="$WORK/checkout-a"
B="$WORK/checkout-b-with-a-much-longer-directory-name"

rm -rf "$WORK"; mkdir -p "$A" "$B"
cat > "$A/main.go" <<'GO'
package main

import "fmt"

func main() { fmt.Println("hello from a probe artifact") }
GO
cp "$A/main.go" "$B/main.go"
for d in "$A" "$B"; do (cd "$d" && go mod init probe >/dev/null 2>&1); done

export GOOS=wasip1 GOARCH=wasm CGO_ENABLED=0
digest() { sha256sum "$1" | cut -d' ' -f1; }

go version
(cd "$A" && go build -o out1.wasm . && go build -o out2.wasm . && go build -trimpath -o trim.wasm .)
(cd "$B" && go build -o out1.wasm . && go build -trimpath -o trim.wasm .)

a1=$(digest "$A/out1.wasm"); a2=$(digest "$A/out2.wasm")
b1=$(digest "$B/out1.wasm")
at=$(digest "$A/trim.wasm"); bt=$(digest "$B/trim.wasm")

echo
echo "1. same directory, built twice          : $a1"
echo "                                        : $a2"
echo "2. different directory, no -trimpath    : $b1"
echo "3. different directory, with -trimpath  : $at"
echo "                                        : $bt"
echo

rc=0
[ "$a1" = "$a2" ] || { echo "UNEXPECTED: same-directory rebuild differed"; rc=1; }
[ "$a1" != "$b1" ] || echo "NOTE: build path did not leak on this toolchain/version"
[ "$at" = "$bt" ] || { echo "UNEXPECTED: -trimpath did not make the paths irrelevant"; rc=1; }
echo "sizes: untrimmed A=$(wc -c < "$A/out1.wasm") B=$(wc -c < "$B/out1.wasm") trimmed=$(wc -c < "$A/trim.wasm")"
exit $rc
