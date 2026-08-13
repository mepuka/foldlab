#!/usr/bin/env bash
# Pulls verification frames out of the ENCODED mp4s, so what gets inspected is
# what a viewer sees rather than what the bundler drew. Times are seconds.
#
#   bash docs/media/folding/scripts/extract.sh
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here/.."
mkdir -p stills/check

pull() { # clip, label, seconds
  ffmpeg -v error -ss "$3" -i "out/$1.mp4" -frames:v 1 -y "stills/check/$1_$2.png"
}

for t in 0.5 1.5 3.0 4.8 6.2 8.6 11.0; do
  pull two-folds "${t}s" "$t"
done
for t in 0.5 2.5 3.6 5.2 6.6 8.2 10.3; do
  pull cut-anywhere "${t}s" "$t"
done
for t in 0.4 1.2 2.0 3.2 4.6 6.4; do
  pull refusal-is-a-value "${t}s" "$t"
done

ls stills/check
