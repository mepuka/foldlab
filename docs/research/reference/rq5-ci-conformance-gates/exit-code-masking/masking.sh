#!/usr/bin/env bash
# Own-authored reproduction: how a gate's nonzero exit disappears on the
# way to CI. Evidence, not a gate — it always exits 0.
#
# The shape under test is the one every `run.sh | tee log` step has:
# a gate that fails, piped into something that succeeds.

echo "== (1) bash, no pipefail: the gate's failure is lost"
bash -c 'set -e; false | tee /dev/null; echo "  observed exit=$?"'

echo
echo "== (2) bash, set -o pipefail: the failure survives"
bash -c 'set -eo pipefail; false | tee /dev/null; echo "  UNREACHABLE"'
echo "  outer saw exit=$?"

echo
echo "== (3) command substitution swallows -e as well"
bash -c 'set -euo pipefail; out=$(false | tee /dev/null) || echo "  caught"; echo "  continued"'
