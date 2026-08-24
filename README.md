# Foldlab

Experiments and open-source tooling for formally verified software.

Foldlab is a laboratory. The Effect TypeScript ecosystem and Lean 4 are its
current substrate; its aim is open tooling for a practice where
machine-checked verification is cheap enough to be ordinary.

## Thesis

The lab's founding bet: LLMs plus automated verification are collapsing the
cost of verifiable, content-addressed software artifacts. Advantage accrues to
whoever coalesces the linkages — canonical forms, projections, contracts, and
the tooling between them — that let more advanced abstractions be built and
trusted. Foldlab builds at that altitude. Its wager: marrying Lean (as
referee) with an Effect implementation in TypeScript (as substrate) works.

## Programme

The lab organizes its subject as a six-layer *descriptive tower*, from the
JavaScript engine at the bottom, through the Effect value and Schema, up to
interaction protocols and ontologies. Each layer treats the layer below it as
an object it can describe. The full table and the vocabulary behind it are in
the [charter](CHARTER.md).

The central principle (P3 in the charter) is verification-achievability:
author one small, declarative global description; derive the local artifacts
from it by projection; prove the projection correct once — and everything
derived inherits that verification.

Development is ground-up and cooperative: first a formal description of the
Effect core, then Schema as the smallest contract object, then the climb to
many-party asynchronous interaction.

Everything the lab produces is built toward *artifact grade*: a
classification, a canonical identity, and declared transformations. The grade
is earned, not assumed — the [agent specification](AGENTS.md) carries the
rules.

## References

- Li-yao Xia, *Executable Denotational Semantics with Interaction Trees*, PhD
  dissertation, University of Pennsylvania, 2022.
- Kohei Honda, Nobuko Yoshida, Marco Carbone, *Multiparty Asynchronous Session
  Types*, Journal of the ACM 63(1), 2016.
- [Unison](https://www.unison-lang.org/) — inspiration: content-addressed
  definitions, code as data, effects as abilities; open, simple, rigorous
  roots betting on the same principles.
- Federico Carrone, [Concrete: Proving Systems Code in
  Lean](https://federicocarrone.com/series/concrete/proving-systems-code-in-lean/)
  — under study: a systems language whose Core IR is Lean inductive types,
  with proofs fingerprinted to code versions.

## Layout

- [CHARTER.md](CHARTER.md) — thesis, philosophy, programme, roadmap.
- [AGENTS.md](AGENTS.md) — agent specification: conduct, procedures, routing.
- [docs/](docs/) — bounded-context glossaries, claim gates, invariants.
- [.reference/](.reference/) — evidence: source lock, catalog, study clones.
- [formal/](formal/) — formal verification artifacts (Lean, claim-gated).
- [experiments/](experiments/) — experimental artifacts.
- `.staging/` — pre-grade material, kept out of version control.

Toolchains and tasks run through [mise](https://mise.jdx.dev/): `mise run
check` regenerates derived files, asserts a clean tree, and runs every test
and gate defined so far — locally and in CI alike.

## License

Code is licensed under Apache-2.0 ([LICENSE](LICENSE)); documents under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Status

Descriptive phase. No formal claims selected yet; the claim vocabulary lives
in
[CLAIM-GATES.md](docs/effect-typescript-semantics/CLAIM-GATES.md).
