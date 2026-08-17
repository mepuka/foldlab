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

# ---- Kernel-bound source hygiene. The roster is every Lean source in this
# package: `Moves.lean` and `Moves/**` are the proof-bearing model surface, and
# `Main.lean` plus `Oracle/**` are the corpus generator whose output stands in
# for the model in `packages/moves/fixtures/moves-conformance.ndjson`. A
# generator that defaults a value silently forges a model verdict, so it is held
# to the same hygiene as the model. A future Moves/Wire.lean joins the sweep
# without changing this gate. Where the generator legitimately needs a construct
# the model forbids, it is approved per site by line digest — never by a roster
# carve-out.
for required in Moves.lean Main.lean Moves Oracle; do
  if [[ ! -e "$required" ]]; then
    echo "GATE: FAIL — kernel hygiene roster is missing $required" >&2
    exit 2
  fi
done
kernel_sources=(Moves.lean Main.lean)
while IFS= read -r source; do
  kernel_sources+=("$source")
done < <(find Moves Oracle -type f -name '*.lean' -print | LC_ALL=C sort)

kernel_extern_allowlist="kernel-extern-allowlist.txt"
kernel_partial_allowlist="kernel-partial-allowlist.txt"

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

# The bang-accessor family. Lean's naming convention reserves a trailing `!` on
# a term-level identifier for a partial function that PANICS on invalid input —
# it prints one stderr line and returns the type's `Inhabited` default, exit 0.
# That is the same channel `panic!` opens, spelled without the token, so the
# gate refuses the convention rather than a list of names: any bang-suffixed
# identifier reached by dot-notation or namespace qualification, plus the
# unqualified core accessors an `open` could bring into scope. Curated from the
# Lean 4.33.0 core scan (`def`/`abbrev` names ending in `!` under Init/ and
# Std/); the curation rule and its stated bound are in DECISIONS.md. Syntax-level
# bangs are untouched by construction: `s!`, `m!`, `f!` and the tactic variants
# are never dot-prefixed and are not core accessor names.
bang_accessor_pattern="(\.[A-Za-z_][A-Za-z0-9_']*!($|[^=]))"
bang_accessor_pattern+="|((^|[^A-Za-z0-9_'.])"
bang_accessor_pattern+="(back|get|getLast|head|max|min|next|peek|prev|set|tail|toInt|toNat)"
bang_accessor_pattern+="!($|[^=]))"

load_allowlist() {
  # Validate one per-site allowlist and print its `path:line:digest` keys. A row
  # nobody can parse is not an approval: malformed, duplicated, or missing files
  # fail with status 2 (gate machinery), never 1 (a planted violation).
  local allowlist="$1"
  local label="$2"
  local location digest reason extra key approved=$'\n'

  if [[ ! -f "$allowlist" ]]; then
    echo "GATE: FAIL — kernel $label allowlist is missing: $allowlist" >&2
    return 2
  fi
  while IFS=$'\t' read -r location digest reason extra; do
    [[ -z "$location" || "$location" == \#* ]] && continue
    if [[ -n "${extra:-}" ||
          ! "$location" =~ ^(Moves\.lean|Main\.lean|(Moves|Oracle)/[^:]+\.lean):[1-9][0-9]*$ ||
          ! "$digest" =~ ^[0-9a-f]{64}$ ||
          "$reason" != "operator-ratified: "* ]]; then
      echo "GATE: FAIL — malformed kernel $label allowlist entry: $location" >&2
      return 2
    fi
    key="$location:$digest"
    if [[ "$approved" == *$'\n'"$key"$'\n'* ]]; then
      echo "GATE: FAIL — duplicate kernel $label allowlist entry: $location" >&2
      return 2
    fi
    approved+="$key"$'\n'
    printf '%s\n' "$key"
  done < "$allowlist"
}

check_forbidden_token() {
  # A token class with no approval path: any code-visible occurrence refuses.
  local pattern="$1"
  local label="$2"
  shift 2
  local hit
  hit=$(first_source_hit "$pattern" "$@")
  if [[ -n "$hit" ]]; then
    echo "GATE: FAIL — forbidden $label at $(hit_location "$hit")" >&2
    return 1
  fi
}

check_allowlisted_token() {
  # A token class approved per site. The approval binds to the SHA-256 of the
  # exact source line, so moving or editing the construct re-enters review; a
  # file- or line-only permission could silently authorize a changed one.
  local pattern="$1"
  local label="$2"
  local approved="$3"
  shift 3
  local hit source remainder line location digest source_line

  while IFS= read -r hit; do
    [[ -z "$hit" ]] && continue
    source="${hit%%:*}"
    remainder="${hit#*:}"
    line="${remainder%%:*}"
    location="$source:$line"
    source_line=$(sed -n "${line}p" "$source")
    digest=$(printf '%s' "$source_line" | sha256sum | cut -d ' ' -f 1)
    if [[ "$approved" != *$'\n'"$location:$digest"$'\n'* ]]; then
      echo "GATE: FAIL — unallowlisted $label at $location" >&2
      return 1
    fi
  done < <(
    for source in "$@"; do
      while IFS= read -r hit; do
        [[ -n "$hit" ]] && printf '%s:%s\n' "$source" "$hit"
      done < <(lean_code_only "$source" | grep -nE "$pattern" || true)
    done
  )
}

check_kernel_hygiene() {
  local extern_allowlist="$1"
  local partial_allowlist="$2"
  shift 2
  local -a sources=("$@")
  local keys approved_extern approved_partial

  if [[ "${#sources[@]}" -eq 0 ]]; then
    echo "GATE: FAIL — kernel hygiene source roster is empty" >&2
    return 2
  fi

  keys=$(load_allowlist "$extern_allowlist" "extern") || return 2
  approved_extern=$'\n'"$keys"$'\n'
  keys=$(load_allowlist "$partial_allowlist" "partial") || return 2
  approved_partial=$'\n'"$keys"$'\n'

  # Nine checks. Each ships a negative control refuted on exactly its own
  # diagnostic; the controls are registered below, and the orphan rule there
  # refuses a control that is committed but never run.
  check_forbidden_token \
    "(^|[^A-Za-z0-9_'])(implemented_by)($|[^A-Za-z0-9_'])" \
    "@[implemented_by]" "${sources[@]}" || return $?
  check_allowlisted_token \
    "(^|[^A-Za-z0-9_'])(extern)($|[^A-Za-z0-9_'])" \
    "@[extern]" "$approved_extern" "${sources[@]}" || return $?
  check_forbidden_token 'panic!' "panic!" "${sources[@]}" || return $?
  check_forbidden_token \
    "(^|[^A-Za-z0-9_'])panic($|[^A-Za-z0-9_'!])" \
    "panic" "${sources[@]}" || return $?
  check_forbidden_token \
    "$bang_accessor_pattern" \
    "bang accessor" "${sources[@]}" || return $?
  check_forbidden_token \
    "(^|[^A-Za-z0-9_'])(unsafe)($|[^A-Za-z0-9_'])" \
    "unsafe" "${sources[@]}" || return $?
  check_forbidden_token \
    "(^|[^A-Za-z0-9_'])(native_decide)($|[^A-Za-z0-9_'])" \
    "native_decide" "${sources[@]}" || return $?
  check_allowlisted_token \
    "(^|[^A-Za-z0-9_'])(partial)($|[^A-Za-z0-9_'])" \
    "partial" "$approved_partial" "${sources[@]}" || return $?
  check_forbidden_token \
    "(^|[^A-Za-z0-9_'])(sorry)($|[^A-Za-z0-9_'])" \
    "sorry" "${sources[@]}" || return $?
}

if check_kernel_hygiene \
  "$kernel_extern_allowlist" "$kernel_partial_allowlist" "${kernel_sources[@]}"; then
  echo "GATE: PASS (kernel annotations: implemented_by absent, extern and partial allowlists clean)"
  echo "GATE: PASS (kernel sources: panic!, panic, bang accessors, unsafe, native_decide, and sorry absent)"
else
  exit $?
fi

declare -a exercised_controls=()

check_hygiene_control() {
  local source="$1"
  local trace="$2"
  local label="$3"
  local output status expected

  output=$(check_kernel_hygiene \
    "$kernel_extern_allowlist" "$kernel_partial_allowlist" "$source" 2>&1)
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
  exercised_controls+=("$source")
  echo "GATE: PASS ($label negative control refuted on its named check)"
}

# One control per shipped check, each planting exactly its own violation: a
# control that also trips an earlier check would prove nothing about the later
# one. `negative-controls/` is not a lake_lib root, so none of these compile.
check_hygiene_control \
  "negative-controls/implemented-by.lean" \
  "negative-controls/implemented-by.cex.txt" \
  "implemented_by"
check_hygiene_control \
  "negative-controls/extern.lean" \
  "negative-controls/extern.cex.txt" \
  "extern"
check_hygiene_control \
  "negative-controls/panic.lean" \
  "negative-controls/panic.cex.txt" \
  "panic!"
check_hygiene_control \
  "negative-controls/panic-bare.lean" \
  "negative-controls/panic-bare.cex.txt" \
  "panic"
check_hygiene_control \
  "negative-controls/bang-accessor.lean" \
  "negative-controls/bang-accessor.cex.txt" \
  "bang accessor"
check_hygiene_control \
  "negative-controls/unsafe.lean" \
  "negative-controls/unsafe.cex.txt" \
  "unsafe"
check_hygiene_control \
  "negative-controls/native-decide.lean" \
  "negative-controls/native-decide.cex.txt" \
  "native_decide"
check_hygiene_control \
  "negative-controls/partial.lean" \
  "negative-controls/partial.cex.txt" \
  "partial"
check_hygiene_control \
  "negative-controls/sorry.lean" \
  "negative-controls/sorry.cex.txt" \
  "sorry"

# Control orphan rule: a control committed but never run is a control that
# cannot fail, which is the defect the controls exist to refuse.
while IFS= read -r control; do
  control_exercised=0
  for exercised in "${exercised_controls[@]}"; do
    if [[ "$exercised" == "$control" ]]; then
      control_exercised=1
      break
    fi
  done
  if [[ "$control_exercised" -eq 0 ]]; then
    echo "GATE: FAIL — committed negative control never exercised: $control" >&2
    exit 1
  fi
done < <(find negative-controls -type f -name '*.lean' -print | LC_ALL=C sort)

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
