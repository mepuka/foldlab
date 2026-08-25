#!/usr/bin/env bash
# Report the resolved toolchain, and prove the annex is not using — or
# touching — the operator's personal opam root.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${OPAMROOT:?OPAMROOT must be set — run through mise from inside annex/coq}"

printf 'opam         %s\n' "$(opam --version)"
printf 'OPAMROOT     %s\n' "$OPAMROOT"
case "$OPAMROOT" in
  "$here"/*) printf 'isolation    ok (root is inside the annex)\n' ;;
  *) printf 'isolation    FAILED (root is outside the annex)\n'; exit 1 ;;
esac

printf 'switch       %s\n' "${OPAMSWITCH:-<unset>}"
for p in ocaml dune rocq-core rocq-stdlib coq coq-core coq-paco coq-ext-lib coq-itree; do
  v="$(opam show "$p" -f installed-version 2>/dev/null | tr -d ' \n')"
  [ -n "$v" ] && [ "$v" != "--" ] && printf '  %-12s %s\n' "$p" "$v"
done
