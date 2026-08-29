# DOGFOOD — successive agents against the real system

Operator-commissioned 2026-08-29 night (decision 24): the final stage
of the hard build push. Successive dogfood agents — NEVER all at once
— with defined personalities and real tasks, stressing the system for
real use. We do not panic when something breaks; we do not ignore
hard work when it surfaces. Findings are deliverables; fixes route
back through lanes.

## Honest capability baseline (what a dogfooder walks into)

| Question | State |
|---|---|
| Interpret programs? | PARTIAL — `cas_run` takes inline instruction documents (two-instruction MCP test green; Lean interpretation proved end to end); programs BY ADDRESS unspellable until Wave 2 (queue 22/23, host step/cont codec) |
| Layer + build dependencies? | SystemNode → emitted layers landed (12/12 key-set differential); build STEPS ruled (MS-1 boundary) but not built |
| Run MCP? | YES — `cas serve`, five tools, boot manifest gate, protocol tests + end-to-end smoke; stdio only; BS-1 liveness slice in flight |
| Plain language for all operations? | PARTIAL — 7 programs carry computed prose (E3); tool descriptions emitted; obligations/laws ledgers live; verdict notes still hand-written (E2 owed); literature emitter (E5) owed |
| Intelligible + usable? | THE QUESTION — measured by the dogfooders, not asserted |

## Known weak points the waves target

Fresh surfaces (hours old): serve, admission map, SystemNode,
envledger, laws. Structural gaps: no `cas run <address>`, no
`cas_word`/history, code-mode register not yet a verb, HTTP transport
absent, `check:extract-oxc`/source-cache host-local. Liveness: BS-1
in flight (oversized-frame silence, stall detection).

## The waves (released successively, each after the prior reports)

1. **THE NEWCOMER** — zero tribal knowledge, emitted artifacts only.
   Personality: a competent, curious engineer on day one who reads
   docs and says exactly where they got lost. Task: stand up a
   store, put/load/publish/verify content, discover what the estate
   is from REGISTRY/ENVIRONMENT/AGENTS.md alone. Measures: the
   bootstrap zero-tribal-knowledge acceptance, CLI usability, error
   quality.
2. **THE OPERATOR'S APPRENTICE** — runs programs. Personality:
   methodical, wants receipts. Task: drive `cas serve` over real
   MCP frames; put nodes; run multi-instruction documents with
   answer references; compare answers against the committed vector
   words; try the refusal paths on purpose. Measures: program
   interpretation, MCP robustness, refusal quality.
3. **THE COMPOSER** — layers and dependencies. Personality: an
   Effect engineer who thinks in Layer. Task: author a NEW topology
   over real constructors, emit it, build it, verify the key set;
   then try to express something the arms cannot say and report the
   wall honestly. Measures: G6-a in real hands, the growth asks.
4. **THE ADVERSARY** — tries to break it. Personality: cheerful
   hostility. Task: malformed payloads, wrong-kind refs, tag
   collisions, oversized frames, concurrent hammering, kill -9 mid
   run, restart, verify. We EXPECT loud refusals and a clean store;
   silence or corruption is the only failure. Measures: the gates'
   whole-trust claim, BS-1's fixes.
5. **THE READER** — plain language only. Personality: a technical
   writer who refuses to read source. Task: explain the estate's
   operations back from the prose projections alone; enumerate every
   operation whose semantics have no plain-language surface.
   Measures: the literature principle, E-series coverage.

## Rules of engagement

Dogfooders do NOT fix, do NOT write into the repo (scratchpad stores
only), report friction verbatim (their confusion is the data), and
grade every claim they test as WORKS / WORKS-WITH-FRICTION /
BROKEN-LOUD / BROKEN-SILENT — the last category is the only alarm.
Findings route to lanes through the coordinator; the wave report
lands beside this file.
