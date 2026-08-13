#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
cd "$here/../../proto/go"

go run -tags catalogr4_sabotage ./catalogr4/cmd -mode sabotage
go run ./catalogr4/cmd -mode corrupted
go run ./catalogr4/cmd -mode coverage

# Honest divergence is deliberately red: the command exits 1 and prints the
# minimized schedule. Do not turn that finding into a passing count.
go run ./catalogr4/cmd -mode honest
