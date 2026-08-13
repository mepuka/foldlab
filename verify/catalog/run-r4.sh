#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
"$here/run-wire.sh"
cd "$here/../../proto/go"

go run -tags catalogr4_sabotage ./catalogr4/cmd -mode sabotage
go run ./catalogr4/cmd -mode corrupted
go run ./catalogr4/cmd -mode coverage

go run ./catalogr4/cmd -mode honest
