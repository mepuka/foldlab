#!/usr/bin/env bash
# verify/moves/run.sh — the gate for the move-calculus model: every Lean
# theorem checks (no sorry, core only). Lean 4.33.0 via elan, matching
# the lean-toolchain pin.
set -uo pipefail
cd "$(dirname "$0")"
if ! command -v lake >/dev/null 2>&1; then
  echo "FAIL: lake not found. Install elan (e.g. 'scoop install elan')." >&2
  exit 2
fi

# ---- Kernel-bound source hygiene. `Moves.lean` and every Lean source under
# `Moves/` are the proof-bearing model surface; the runtime-only Oracle library
# and Main.lean executable adapter are deliberately outside this roster. A
# future Moves/Wire.lean joins the sweep without changing this gate.
kernel_sources=(Moves.lean)
while IFS= read -r source; do
  kernel_sources+=("$source")
done < <(find Moves -type f -name '*.lean' -print | LC_ALL=C sort)

kernel_extern_allowlist="kernel-extern-allowlist.txt"

lean_code_only() {
  # Keep line count stable while removing nested block comments and line
  # comments. String text stays visible deliberately: interpolated strings can
  # contain compiled expressions, so treating their contents as inert would
  # open an evasion channel.
  awk '
    BEGIN { block_depth = 0; in_string = 0; escaped = 0 }
    {
      line = $0
      out = ""
      i = 1
      while (i <= length(line)) {
        c = substr(line, i, 1)
        n = substr(line, i + 1, 1)

        if (block_depth > 0) {
          if (c == "/" && n == "-") {
            block_depth++
            out = out "  "
            i += 2
          } else if (c == "-" && n == "/") {
            block_depth--
            out = out "  "
            i += 2
          } else {
            out = out " "
            i++
          }
          continue
        }

        if (in_string) {
          out = out c
          if (escaped) {
            escaped = 0
          } else if (c == "\\") {
            escaped = 1
          } else if (c == "\"") {
            in_string = 0
          }
          i++
          continue
        }

        if (c == "-" && n == "-") {
          while (i <= length(line)) {
            out = out " "
            i++
          }
        } else if (c == "/" && n == "-") {
          block_depth++
          out = out "  "
          i += 2
        } else if (c == "\"") {
          in_string = 1
          out = out c
          i++
        } else {
          out = out c
          i++
        }
      }
      print out
    }
  ' "$1"
}

first_source_hit() {
  local pattern="$1"
  shift
  local source hit
  for source in "$@"; do
    hit=$(lean_code_only "$source" | grep -nE "$pattern" | head -n 1 || true)
    if [[ -n "$hit" ]]; then
      printf '%s:%s\n' "$source" "$hit"
      return 0
    fi
  done
}

hit_location() {
  local hit="$1"
  local source="${hit%%:*}"
  local remainder="${hit#*:}"
  local line="${remainder%%:*}"
  printf '%s:%s' "$source" "$line"
}

check_kernel_hygiene() {
  local allowlist="$1"
  shift
  local -a sources=("$@")
  local location digest reason extra key hit source remainder line source_line
  local -A allowed_extern=()

  if [[ ! -f "$allowlist" ]]; then
    echo "GATE: FAIL — kernel extern allowlist is missing: $allowlist" >&2
    return 2
  fi
  if [[ "${#sources[@]}" -eq 0 ]]; then
    echo "GATE: FAIL — kernel hygiene source roster is empty" >&2
    return 2
  fi

  while IFS=$'\t' read -r location digest reason extra; do
    [[ -z "$location" || "$location" == \#* ]] && continue
    if [[ -n "${extra:-}" ||
          ! "$location" =~ ^(Moves\.lean|Moves/[^:]+\.lean):[1-9][0-9]*$ ||
          ! "$digest" =~ ^[0-9a-f]{64}$ ||
          "$reason" != "operator-ratified: "* ]]; then
      echo "GATE: FAIL — malformed kernel extern allowlist entry: $location" >&2
      return 2
    fi
    key="$location:$digest"
    if [[ -n "${allowed_extern[$key]:-}" ]]; then
      echo "GATE: FAIL — duplicate kernel extern allowlist entry: $location" >&2
      return 2
    fi
    allowed_extern["$key"]=1
  done < "$allowlist"

  hit=$(first_source_hit "(^|[^A-Za-z0-9_'])(implemented_by)($|[^A-Za-z0-9_'])" "${sources[@]}")
  if [[ -n "$hit" ]]; then
    echo "GATE: FAIL — forbidden @[implemented_by] at $(hit_location "$hit")" >&2
    return 1
  fi

  while IFS= read -r hit; do
    [[ -z "$hit" ]] && continue
    source="${hit%%:*}"
    remainder="${hit#*:}"
    line="${remainder%%:*}"
    location="$source:$line"
    source_line=$(sed -n "${line}p" "$source")
    digest=$(printf '%s' "$source_line" | sha256sum | cut -d ' ' -f 1)
    key="$location:$digest"
    if [[ -z "${allowed_extern[$key]:-}" ]]; then
      echo "GATE: FAIL — unallowlisted @[extern] at $location" >&2
      return 1
    fi
  done < <(
    for source in "${sources[@]}"; do
      while IFS= read -r hit; do
        [[ -n "$hit" ]] && printf '%s:%s\n' "$source" "$hit"
      done < <(lean_code_only "$source" | grep -nE "(^|[^A-Za-z0-9_'])(extern)($|[^A-Za-z0-9_'])" || true)
    done
  )

  hit=$(first_source_hit 'panic!' "${sources[@]}")
  if [[ -n "$hit" ]]; then
    echo "GATE: FAIL — forbidden panic! at $(hit_location "$hit")" >&2
    return 1
  fi

  hit=$(first_source_hit "(^|[^A-Za-z0-9_'])(partial)($|[^A-Za-z0-9_'])" "${sources[@]}")
  if [[ -n "$hit" ]]; then
    echo "GATE: FAIL — forbidden partial at $(hit_location "$hit")" >&2
    return 1
  fi

  hit=$(first_source_hit "(^|[^A-Za-z0-9_'])(sorry)($|[^A-Za-z0-9_'])" "${sources[@]}")
  if [[ -n "$hit" ]]; then
    echo "GATE: FAIL — forbidden sorry at $(hit_location "$hit")" >&2
    return 1
  fi
}

if check_kernel_hygiene "$kernel_extern_allowlist" "${kernel_sources[@]}"; then
  echo "GATE: PASS (kernel annotations: implemented_by absent, extern allowlist clean)"
  echo "GATE: PASS (kernel sources: panic!, partial, and sorry absent)"
else
  exit $?
fi

check_hygiene_control() {
  local source="$1"
  local trace="$2"
  local label="$3"
  local output status expected

  output=$(check_kernel_hygiene "$kernel_extern_allowlist" "$source" 2>&1)
  status=$?
  if [[ "$status" -eq 0 ]]; then
    echo "GATE: FAIL — $label negative control was not refuted" >&2
    exit 1
  fi
  if [[ "$status" -ne 1 ]]; then
    printf '%s\n' "$output" >&2
    echo "GATE: FAIL — $label negative control failed in gate machinery, not its planted violation" >&2
    exit 1
  fi
  expected=$(cat "$trace")
  if [[ "$output" != "$expected" ]]; then
    diff -u "$trace" <(printf '%s\n' "$output") >&2 || true
    echo "GATE: FAIL — $label negative control was not refuted on its named check" >&2
    exit 1
  fi
  echo "GATE: PASS ($label negative control refuted on its named check)"
}

check_hygiene_control \
  "negative-controls/implemented-by.lean" \
  "negative-controls/implemented-by.cex.txt" \
  "implemented_by"
check_hygiene_control \
  "negative-controls/panic.lean" \
  "negative-controls/panic.cex.txt" \
  "panic!"

# ---- Frozen-spec pin: Spec.lean changes require a Rev re-pin ----
expected_spec_sha256="36c3203e3e6edbcc15f7561ab91d1e2d0b03cf40bf6e23a8f9c58e47be2b5b43"
actual_spec_sha256=$(sha256sum Moves/Spec.lean | cut -d ' ' -f 1)
if [[ "$actual_spec_sha256" != "$expected_spec_sha256" ]]; then
  echo "GATE: FAIL — Spec.lean is frozen; changes require a Rev re-pin" >&2
  exit 1
fi

# ---- Word-boundary greps: `exact sorry`, mid-line `admit`, and
# `private axiom` all match. The bare words may not appear anywhere in
# the sources, comments included, so evasion by phrasing is impossible.
if grep -rnE "(^|[^A-Za-z0-9_'])(sorry|admit)($|[^A-Za-z0-9_'])" Moves Moves.lean Oracle Main.lean 2>/dev/null; then
  echo "GATE: FAIL — lean sources mention sorry/admit" >&2
  exit 1
fi
if grep -rnE "(^|[^A-Za-z0-9_'])axiom($|[^A-Za-z0-9_'])" Moves Moves.lean Oracle Main.lean 2>/dev/null; then
  echo "GATE: FAIL — lean sources mention an axiom declaration" >&2
  exit 1
fi

if lake build; then
  echo "GATE: build passed"
else
  echo "GATE: FAIL"; exit 1
fi

# ---- Axiom footprint over the rostered results. A compiled evaluator can
# add theorem axioms without declaring `axiom` in source, so the source
# grep alone is insufficient. Keep this roster aligned with README.md.
roster=(
  fill_comm fill_conflict_refused stepK_agrees stepK_refused
  repairK_agrees repairK_refused conflict_surfaces step_preserves_wf
  runRepairK_preserves_wf no_loss clash_repair_confluence
  fence_deterministic min_fence_deterministic plurality_fence_deterministic
  decided_stable single_seat_stable no_fair_resolute_fence
  clobber_diverges lww_converges lww_loses filled_unstable
  fence_manipulable runRepairK_perm runRepairK_fill_pair
  spec_no_loss_strong spec_meaning_confluent spec_evidence_confluent
  spec_fence_schedule_free spec_refusal_iff spec_alignment
  spec_repairK_iff_admitted spec_runRepairK_preserves_wf
  spec_decided_stable_total spec_mutant_legacy_killed_by_L1
  spec_mutant_legacy_killed_by_L2 spec_mutant_refuseAll_killed
  spec_witness_three_fill spec_witness_confirm_recorded spec_discharged
)

axiom_check=$(mktemp "./.axiom-check.XXXXXX.lean") || {
  echo "GATE: FAIL — could not create axiom-footprint check" >&2
  exit 1
}
trap 'rm -f "$axiom_check"' EXIT
{
  echo "import Moves"
  for name in "${roster[@]}"; do
    echo "#print axioms Moves.$name"
  done
} > "$axiom_check"

if ! axiom_output=$(lake env lean "$axiom_check" 2>&1); then
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — axiom-footprint check did not elaborate" >&2
  exit 1
fi

report_count=$(printf '%s\n' "$axiom_output" | grep -c "^'Moves\.")
if [[ "$report_count" -ne "${#roster[@]}" ]]; then
  printf '%s\n' "$axiom_output" >&2
  echo "GATE: FAIL — expected ${#roster[@]} axiom reports, got $report_count" >&2
  exit 1
fi

unexpected_axioms=$(
  printf '%s\n' "$axiom_output" |
    tr '\n' ' ' |
    grep -oE '\[[^]]*\]' |
    tr ',' '\n' |
    sed -E 's/^\[?[[:space:]]*//; s/[[:space:]]*\]?$//' |
    grep -Ev '^(propext|Classical\.choice|Quot\.sound)$' || true
)
if [[ -n "$unexpected_axioms" ]]; then
  printf '%s\n' "$axiom_output" >&2
  printf 'GATE: FAIL — unexpected theorem axioms:\n%s\n' "$unexpected_axioms" >&2
  exit 1
fi

# ---- Orphan rule: every public theorem in the sources is rostered above
# or listed with a reason in gate-exclusions.txt. A theorem the gate has
# never heard of is a hole, not a freebie.
declare -A covered
for name in "${roster[@]}"; do covered["$name"]=1; done
while IFS= read -r line; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  covered["${line%% *}"]=1
done < gate-exclusions.txt

orphans=""
while IFS= read -r name; do
  if [[ -z "${covered[$name]:-}" ]]; then
    orphans+="$name"$'\n'
  fi
done < <(grep -rhoE "^theorem [A-Za-z0-9_']+" Moves Moves.lean | awk '{print $2}' | sort -u)
if [[ -n "$orphans" ]]; then
  printf 'GATE: FAIL — public theorems neither rostered nor excluded:\n%s' "$orphans" >&2
  exit 1
fi

# ---- Conformance corpus regeneration: the committed fixture must equal a
# fresh emission byte-for-byte. The provenance of every vector is the
# generation command; a fixture that a regeneration cannot reproduce is a
# hand-authored model verdict and is refused.
fixture="../../packages/moves/fixtures/moves-conformance.ndjson"
regen_tmp=$(mktemp "./.corpus-regen.XXXXXX.ndjson") || {
  echo "GATE: FAIL — could not create corpus regeneration scratch" >&2
  exit 1
}
trap 'rm -f "$axiom_check" "$regen_tmp"' EXIT
if ! lake exe oracle emit 2000 > "$regen_tmp"; then
  echo "GATE: FAIL — corpus emitter did not run" >&2
  exit 1
fi
if ! cmp -s "$regen_tmp" "$fixture"; then
  echo "GATE: FAIL — committed corpus is not a fresh regeneration;" \
    "regenerate with: lake exe oracle emit 2000 > $fixture" >&2
  exit 1
fi

echo "GATE: PASS (move-calculus proofs, kernel hygiene, axiom footprint, spec pin, orphan rule, corpus regeneration)"
