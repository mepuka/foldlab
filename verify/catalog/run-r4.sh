#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
"$here/run-wire.sh"
cd "$here/../../proto/go"

go run -tags catalogr4_sabotage ./catalogr4/cmd -mode sabotage

for tag in \
  catalogr4_reply_created \
  catalogr4_reply_converged \
  catalogr4_reply_admitted \
  catalogr4_reply_refused
do
  echo "== reply mutant: $tag (must be caught)"
  go run -tags "$tag" ./catalogr4/cmd -mode reply-mutant
done

go run ./catalogr4/cmd -mode corrupted

echo "== coverage assertion (131/3,079/1,077 + 3/3 + 5/5)"
go test ./catalogr4 -run '^TestCorpusIsDeterministicAndCoversEveryRatifiedBranch$' -count=1

go run ./catalogr4/cmd -mode coverage

go run ./catalogr4/cmd -mode honest
