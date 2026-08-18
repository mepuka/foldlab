# scratch/evals

In-house evaluations: the measurements a survey or a design owed and left as a
working convention until someone ran them.

An eval here answers one preregistered question. It carries its contract before
its data (`PREREGISTRATION.md`), its findings regenerated from committed raw
records (`RESULTS.md`), and its own `DECISIONS.md`. Rates are quoted at the
measured tier with the sample size, the model versions, and the
provider settings that produced them.

Each eval is its own install island — not a workspace member, its own
`bun.lock`, installed where it lives. Its gate rows run inside `bun run gates`
from the repository root.

- `q1-schema-confusion/` — does compound digest naming (`lane_digest`), bare
  naming (`lane`), or a nested `{type,value}` reference change how reliably
  models populate the kernel tool schemas? Start at its `README.md`.

**Law 9 boundary.** `scratch/` holds briefs and spikes. An eval that starts
emitting artifacts the estate serves has stopped being an eval and owes
graduation into its package home, with the full check-gate battery that comes
with it.
