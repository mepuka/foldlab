# Coq/OCaml annex

Status: toolchain annex, established 2026-08-24 on the macOS host.

[CHARTER.md](../../CHARTER.md) and [AGENTS.md](../../AGENTS.md) describe this
as a *lazy* annex — stood up only when Coq code must build. It is stood up
now for one reason: the bisimulation proof technique behind the canonical
hashing work has its most developed executable form in Coq, in the paco and
InteractionTrees developments. This annex exists to read and run that prior
art on the host where it builds cleanly.

## Boundary

Nothing built here is an estate artifact.

A Rocq development in this annex is **evidence and technique**, in the sense
[REFERENCES.md](../../.reference/catalog/REFERENCES.md) already uses for
Programming Language Foundations: a pattern to learn from, never a theorem
the estate may cite. The estate's formal target is Lean; a Rocq proof does
not transfer to a Lean claim, and no claim gate (G0–G6) may be stamped on
the strength of anything in this directory. When a technique read here is
wanted in the estate, it is restated and reproved in Lean, and the Rocq
original is cited as prior art.

## Isolation

The annex does not use, and cannot disturb, the operator's personal opam
installation. Two mechanisms enforce that:

- **Directory-scoped configuration.** [`mise.toml`](mise.toml) is loaded only
  for work inside `annex/coq/`. A host that never enters this directory
  installs none of it, which is why the shared root `mise.toml` stays
  platform-neutral and the Windows host is unaffected by this tree.
- **A private opam root.** `OPAMROOT` points at `.opamroot/` inside the
  annex, so estate packages never enter `~/.opam` and the switches other
  projects depend on cannot silently change what the estate builds against.
  `scripts/init.sh` refuses to run if `OPAMROOT` resolves outside the annex.

`mise run verify` prints the resolved toolchain and asserts the isolation
holds.

## Materialising it

```sh
cd annex/coq
mise install      # the pinned opam binary
mise run init     # the switch, from switch.export
mise run verify   # resolved versions, and the isolation assertion
```

`mise run init` replays [`switch.export`](switch.export) exactly when it is
present. Without a lock it solves from [`roots.txt`](roots.txt) and writes
the lock — which is how the committed lock was first produced, and the only
supported way to change it. To move the toolchain deliberately: edit
`roots.txt`, delete `switch.export`, re-run `init`, and commit the new lock
with the reason in the commit message.

## What the repository carries

Tracked: `mise.toml`, `roots.txt`, `switch.export`, `scripts/`, this file —
the declaration that rebuilds the toolchain, and nothing that is a build
product.

Untracked by [`.gitignore`](.gitignore): `.opamroot/` and `_opam/`. These are
per-host build output measured in gigabytes and are never repository content.

## Platform note

The written platform rule in [AGENTS.md](../../AGENTS.md) names WSL2 Ubuntu
as the annex host, because the primary host is Windows-native. This annex is
on macOS instead: the same lazy annex, a different host, chosen because the
OCaml and Rocq toolchains build natively there without the WSL2 layer. The
rule has been amended to say so. Nothing about the annex's boundary changes
with its host.
