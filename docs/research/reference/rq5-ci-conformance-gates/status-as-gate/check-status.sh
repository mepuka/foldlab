#!/usr/bin/env bash
# Own-authored minimal reproduction of the pattern D-e obligation 5 asks
# for: ONE command that re-derives every claim a status document makes,
# at HEAD, and exits nonzero when the document and the code disagree.
#
# This is a shape demonstration over a two-line toy "kernel", not a
# foldlab gate. The point is the control flow, which has three parts:
#
#   1. claims are machine-readable markers inside the prose, so the prose
#      and the claim cannot drift from each other;
#   2. every claim is RE-DERIVED from the sources, never read back from a
#      generated file that the same command wrote;
#   3. the checker ships its own refutation (`--self-test`), so a checker
#      that has stopped checking is itself a failure.
#
# Usage:
#   ./check-status.sh              re-verify STATUS.md against kernel/
#   ./check-status.sh --self-test  prove the checker can go red
set -uo pipefail
cd "$(dirname "$0")"

status_file="STATUS.md"
kernel_dir="kernel"

# ---- derivations: each claim id maps to a command that recomputes it ----
derive() {
  case "$1" in
    exports)
      grep -rh '^export ' "$kernel_dir" | wc -l | tr -d '[:space:]'
      ;;
    kernel-digest)
      # Sort by path so the digest does not depend on readdir order.
      find "$kernel_dir" -type f | LC_ALL=C sort |
        xargs sha256sum | sha256sum | cut -d' ' -f1
      ;;
    *)
      return 2
      ;;
  esac
}

# ---- the check ----------------------------------------------------------
run_check() {
  local failures=0 seen=0
  while IFS= read -r line; do
    id=$(sed -E 's/.*gate:claim id=([A-Za-z0-9-]+).*/\1/' <<<"$line")
    claimed=$(sed -E 's/.*value=([^ ]+).*/\1/' <<<"$line")
    seen=$((seen + 1))
    if ! actual=$(derive "$id"); then
      echo "FAIL: $status_file claims '$id', which this checker cannot derive."
      echo "      A claim with no derivation is a claim with no gate."
      failures=$((failures + 1))
      continue
    fi
    if [[ "$actual" == "$claimed" ]]; then
      echo "ok:   $id = $actual"
    else
      echo "FAIL: $id — $status_file says '$claimed', the sources say '$actual'"
      failures=$((failures + 1))
    fi
  done < <(grep -o 'gate:claim id=[A-Za-z0-9-]* value=[^ ]*' "$status_file")

  # Anti-vacuity: a status file whose markers were deleted must not pass.
  if [[ "$seen" -eq 0 ]]; then
    echo "FAIL: $status_file carries no gate:claim markers at all."
    return 1
  fi
  if [[ "$failures" -ne 0 ]]; then
    echo "STATUS GATE: FAIL ($failures of $seen claims false at HEAD)"
    return 1
  fi
  echo "STATUS GATE: PASS ($seen claims re-derived at HEAD)"
  return 0
}

# ---- the checker's own refutation --------------------------------------
run_self_test() {
  local tmp
  tmp=$(mktemp -d) || return 2
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" RETURN
  cp -r . "$tmp/case"
  (
    cd "$tmp/case"
    echo "export smuggled" >> kernel/step.txt
    if ./check-status.sh > self-test.log 2>&1; then
      echo "SELF-TEST FAILED: the checker passed a kernel with an extra export."
      cat self-test.log
      exit 1
    fi
    grep -q '^FAIL: exports' self-test.log || {
      echo "SELF-TEST FAILED: the checker went red for the wrong reason."
      cat self-test.log
      exit 1
    }
    grep -q '^FAIL: kernel-digest' self-test.log || {
      echo "SELF-TEST FAILED: the digest claim did not notice the edit."
      cat self-test.log
      exit 1
    }
    echo "self-test ok: planting one extra export refutes exactly the two"
    echo "claims that cover it, and the checker exits nonzero."
  )
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
else
  run_check
fi
