# Issue 59 — decisions

## ISSUE-59-D1 — strictness belongs to the explicit WASM gate

- **Decided:** ordinary `bun test` keeps the repository's documented optional
  skip when `dist/` is absent. The public `bun run test:wasm` command selects
  strict mode and refuses missing artifacts before any wall assertion can be
  filtered out.
- **Alternatives:** make every root test run require a cross-compiled artifact;
  keep the skip and rely only on the workflow's preceding build step.
- **Why:** the root contract names the WASM wall as optional, while an explicit
  wall invocation is a claim and therefore cannot report green without running.
  One command shared by local use and CI also prevents their wall batteries from
  drifting.
- **Load-bearing:** no. This is gate mechanics; it does not change the wall's
  algebra, corpus, known #27 divergence, or any frozen bytes.
