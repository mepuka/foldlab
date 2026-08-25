#!/usr/bin/env bash
# Materialise the annex toolchain in the annex's own opam root.
#
# With a lock present this replays it exactly. Without one it solves from the
# declared roots and writes the lock, which is how the lock is first produced.
# Either way nothing is written outside $OPAMROOT.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
switch="${OPAMSWITCH:-estate}"
lock="$here/switch.export"

: "${OPAMROOT:?OPAMROOT must be set — run through mise from inside annex/coq}"
case "$OPAMROOT" in
  "$here"/*) ;;
  *) echo "refusing to run: OPAMROOT ($OPAMROOT) is outside the annex" >&2; exit 1 ;;
esac

if [ ! -d "$OPAMROOT" ]; then
  opam init --bare --no-setup --yes --root "$OPAMROOT"
  opam repository add rocq-released https://coq.inria.fr/opam/released \
    --all-switches --set-default --yes
fi

if opam switch list --short 2>/dev/null | grep -qx "$switch"; then
  echo "switch '$switch' already exists; nothing to do"
  exit 0
fi

if [ -f "$lock" ]; then
  echo "importing pinned switch from $(basename "$lock")"
  opam switch create "$switch" --empty --yes
  opam switch import "$lock" --switch "$switch" --yes
else
  echo "no lock found; solving from roots.txt"
  compiler="$(grep -v '^[[:space:]]*#' "$here/roots.txt" | grep -m1 'ocaml-base-compiler')"
  packages="$(grep -v '^[[:space:]]*#' "$here/roots.txt" | grep -v 'ocaml-base-compiler' | grep -v '^[[:space:]]*$')"
  opam switch create "$switch" "$compiler" --yes
  # shellcheck disable=SC2086
  opam install --switch "$switch" --yes $packages
  opam switch export --freeze --full --switch "$switch" "$lock"
  echo "wrote $lock"
fi
