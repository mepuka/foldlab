# Parser-construct experiments: composer admission + declaration corpus

Status: R-a RULED ADMITTED by operator 2026-08-28 ("it enters now and should be
used now… ive made my pin") — TOOLS.md row landed same day. R-b superseded in
part: operator ordered the reusable project label set first
([project-labels.json](project-labels.json)); the census lane consumes it.
Ordered by operator 2026-08-28: "TOOL ADDITION: https://github.com/winkjs/composer —
we will use this to perform controlled statistically valid experiments in which we
can develop statistical breakdown of the parsing constructs for different types of
parsers in an empirical effort" and "im suspecting we should just capture some
amount of typescript declarations".

## 1. What composer actually is (verified 2026-08-28)

`winkjs/composer` ("winkComposer", MIT, GRAYPE Systems 2024–26) is a
**streaming-data pipeline framework** — small single-purpose nodes chained into
real-time message pipelines (README: "turns streaming data into real-time
insights and decisions"; winkJS positions it as the streaming-intelligence
sibling of winkNLP). It is **not** an experiment-design or statistics library:
it contributes the harness (stream corpus samples through instrument nodes,
accumulate tallies at ~10⁵–10⁶ msg/s), while statistical validity must come
from OUR sampling design — strata, sample sizes, preregistered hypotheses,
refusal-taxonomy counting rules. The trust statement below says so explicitly
so the admission cannot be read as importing statistical authority.

Pin (resolved via `git ls-remote`, 2026-08-28):
- repo `https://github.com/winkjs/composer`
- HEAD/main: `b338e0c9448cafe6cfcc40a656072a15df8c8a86`
- latest tag `0.5.1` = `a371fd8ba33770f04af0decd0c704f210e82b6df` (adopt the tag, not HEAD)
- npm `wink-composer` exists but publishes only `0.0.1` — **install from the
  pinned git tag, not npm**, or the runtime and the pin diverge.

## 2. Proposed TOOLS.md row

| Tool | Role | Trust statement |
| --- | --- | --- |
| winkComposer (`winkjs/composer` @ tag `0.5.1` = `a371fd8b`, MIT; installed from the pinned git source, never the stale npm `0.0.1`) | Experiment harness for the parser-construct census (`experiments/parser-census/`): streams corpus declaration samples through instrument nodes (tree-sitter twin, TS compiler API, recognition-manifest recognizer) and accumulates per-construct / per-refusal tallies | Plumbing only: it moves messages and sums counters, and contributes NO statistical claim — validity lives in the committed sampling design and the deterministic counting rules, and every tally must be reproducible by a batch (non-streaming) replay of the same corpus slice, which is the gate. Evidence preparation at G4 sampled-evidence ceiling; nothing it emits enters a formal claim. Version drift is a re-admission event. |

## 3. The declaration corpus ("capture some amount of typescript declarations")

Adopt the operator's suspicion as the sampling frame: the unit of observation
is a **TypeScript declaration** (top-level or exported member: const/function/
class/interface/type-alias/enum/module-decl), not a file. Files smear strata;
declarations are what both instruments already enumerate (Stage-1 inventory
rows), what the DSL proposal's spine rules fire on, and what R8 must ingest.

Capture lane (mechanical, one agent, Opus 5 ceiling — suggest sonnet):
1. **Strata** — (a) pinned Effect library sources (clean register), (b) estate
   TS (`library/effects/src`, generated backends), (c) wild leg: the monorepo
   samples already cited in `.staging/libfree/dsl-proposal.md` §4b, (d) `.d.ts`
   declaration files from the pinned node_modules (pure-declaration syntax).
2. **Capture** — walk each stratum with BOTH instruments; emit one JSONL row
   per declaration: byte range, instrument, tree-sitter node-type multiset,
   ERROR/MISSING intersection flag, spine-rule hits (posture A), B-pack hits
   (B-plumb/B-args/B-class), refusal class if refused. Deterministic order,
   byte-gated like every other generated fixture.
3. **Size** — start ~2–5k declarations/stratum (Effect library alone clears
   this); report per-construct frequencies with binomial CIs; the
   refusal-taxonomy histogram (proposal §7: applicative-gap/selective/monadic
   roll-up) is computed per stratum — this IS the "how linearizable is
   Effect-in-the-wild" measurement, now with error bars.
4. **Composer's place** — wrap step 2's emitters as composer nodes only after
   the batch path exists; the batch replay stays the gate (trust statement).

## 4. What this buys the open grill decisions

Per-stratum construct frequencies turn D1 (`<in E>` pin upgrade), D8 (B-pack
layering), and D7 (Ct on unbuildable corpora) from taste questions into
measured ones: e.g. how often variance annotations actually occur outside the
Effect schema surface; what fraction of wild declarations any B-pack touches.

## Rulings requested
- R-a: admit composer per §2 row (or hold as "pending admission" like liteparse
  until first gated use).
- R-b: approve the declaration corpus as `experiments/parser-census/` with the
  four strata and JSONL row shape of §3.
