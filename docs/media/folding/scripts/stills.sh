#!/usr/bin/env bash
# The three frames per clip that carry the point, rendered at full quality.
#
#   bash docs/media/folding/scripts/stills.sh
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here/.."
mkdir -p stills

CHROME="${CHROME:-C:/Program Files/Google/Chrome/Application/chrome.exe}"

shot() { # comp, frame, name
  npx remotion still src/index.ts "$1" "stills/$3.png" \
    --frame "$2" --overwrite --browser-executable="$CHROME"
}

shot two-folds 108 two-folds_01_third-event
shot two-folds 153 two-folds_02_forgiven
shot two-folds 320 two-folds_03_line

shot cut-anywhere 160 cut-anywhere_01_first-cut
shot cut-anywhere 242 cut-anywhere_02_second-cut
shot cut-anywhere 300 cut-anywhere_03_line

shot refusal-is-a-value 74 refusal_01_typed-value
shot refusal-is-a-value 118 refusal_02_message
shot refusal-is-a-value 180 refusal_03_line
