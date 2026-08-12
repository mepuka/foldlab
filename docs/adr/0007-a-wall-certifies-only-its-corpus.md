# A wall certifies only its corpus — pinned transforms owe a domain statement and a divergence probe

A green wall proves two implementations agree over the frozen corpus and
nothing more; behavior outside the corpus is unrefereed, and that is where
port drift lives (found live 2026-08-12: TS and Go `MapValueUpper` had
diverged on non-ASCII input since the transform wall was built — NUL
padding, `ß`→`SS` vs `ß`→`ß` — while every wall stayed green; see
docs/research/2026-08-12-go-perf-verification.md). Therefore every
wall-pinned transform must (1) state its DOMAIN — the input space over
which its behavior is defined and cross-language identical — and (2) ship
a divergence probe: a property/law test on both sides exercising inputs
beyond the fixture, especially where language runtimes are known to
disagree (Unicode case mapping, locale behavior, float formatting,
map/sort order). Where the honest domain is narrower than "all bytes,"
narrow the transform (e.g. ASCII-only case mapping) rather than letting
the undefined region ride. The rejected alternative — trusting fixture
green as equivalence — is exactly the assigned-correlation mistake this
lab exists to end, applied to ourselves.
