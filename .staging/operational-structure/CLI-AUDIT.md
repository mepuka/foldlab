# CLI AUDIT — cas v0.1.0 vs the night's landings

2026-08-29. Pre-dogfood currency audit.

Audit complete. The subagent's inventory closes the last gaps.

## CLI audit — `cas` v0.1.0, against tonight's landings

### 1. Verb matrix

| Verb | State | Reason |
|---|---|---|
| `init status put publish ls show verify serve` | **exist** | `bin/cas.ts:40` |
| `cas doctor` | **OWED — highest leverage** | Consumer already exists three times over: `VOCABULARY.md:60` cites `cas doctor` *as ratified law* for the word "vector"; `BOOTSTRAP.md:89` names its absence ("`readConfig` refuses typed correctly, but only when a verb opens a store"); and the four ledgers that landed tonight — `library/cas/surface/cas-obligations.json`, `surface/cas-laws.json`, `docs/lab-core/ENVIRONMENT.json`, `conformance/admission-map.json` — are agent-readable JSON with **zero runtime readers**, reachable only through `mise`/`lake` gates. They do not each want a verb; they want *one*. |
| `--json` on every verb | **OWED, already on the queue** | `SCHEMA-MATERIALIZATION.md:553-555` item 30: "the `--json` second register is owed on every verb (CLI grill round 2 ruling 2): only `show` has one". Confirmed live — `ls/status/verify --json` all return `Unrecognized flag`. |
| `cas annotate` / `cas name` | **RULING owed, verb correctly absent** | `src/cas/Annotations.ts` is a full runtime API (`onSchema:201 onSystem:208 onProgram:215 text:233 annotationOn:244`) with test-only consumers. Paperwork audit ruling ask 5 is exactly "rule the name seat — or explicitly nothing." Consumer-gating says no verb, and no VOCABULARY row, until that ruling lands. Correct as it stands. |
| `cas emit-layers` (SystemNode) | **correctly absent from the CLI; seam is MCP's** | Written down as one manifest row at `bin/mcp/tools.ts:190-201`. The emitter targets `library/effects/test/generated/EmittedLayers.ts` and covers only the authored DAG (`tools/EmitLayers.lean:201-220`). Nothing to expose yet. |
| admission map as its own verb | **correctly absent** | Static JSON, no query API outside Lean. Belongs under `doctor`, not beside `put`. |
| `entry` / `context` verbs | **correctly absent** | `VOCABULARY.md:61-62` gating working exactly as designed. |
| run-by-address / put-program | **seam, in flight** | Not audited per instruction. One note below. |

**Note the CLI is behind its own MCP host.** `cas_run` ships today (`handlers.ts:187-215`) for self-contained straight-line put programs. There is no `cas run` in any form — `PAPERWORK-AND-PROJECTION-AUDIT.md:105` (O5) already records this. The apprentice (wave 2) reaches programs only through MCP frames, never the shell.

### 2. Freshness defects

- **F1 — `render.ts:8-11` is stale.** It claims "Kind names are owed to the Lean-emitted registry … until that surface exists, tags render as bare hex." The surface exists: `src/cas/generated/grammar/kindTags.ts` carries `KindTagRows` (11 named rows) and is already consumed by `src/cas/Annotations.ts:36` and `src/internal/kindTags.ts:18`. `tagLabel` (`render.ts:46`) still prints `0x01`. So help promises "kind: value, file, blob, schema" while every rendered node says a hex byte. Retired-T7-class drift.
- **F2 — the help vocabulary block has drifted from its seed.** `cas.ts:25-34` carries 7 words; `VOCABULARY.md:34-47`'s everyday register has 12. Missing: value, blob, file, schema, history. The file calls itself "the seed that content derives from — never a second, drifting copy" (`VOCABULARY.md:21-22`); it is now a second, drifting copy.
- **F3 — VOCABULARY.md forward-references a verb that does not exist** (`:60`, `cas doctor`). Ratified law citing an absent surface.
- **F4 — one VOCABULARY row genuinely owed: "in flight."** `cas status` now prints `maxInFlight` (`commands.ts:149`), which puts the term in the everyday register with no row behind it. The other new words (obligation, law, topology, heartbeat) correctly stay out — no verb summons them yet.
- **F5 — `serve --help` is one line and says nothing BS-1 landed.** No mention of the boot manifest gate, the `maxNodeBytes` clamp, the 2s heartbeat, or — most seriously — that a store with `anonymousReads:false` is **refused at boot** (`server.ts:125-141`). A dogfooder hits a hard startup failure with no forewarning on the surface that was supposed to warn them.

**Fresh and correct:** `status` knows `maxInFlight` (`commands.ts:149`); `init` writes it (`store.ts:103-109`, `:522`); the decoding default (`store.ts:73-75`) means a pre-BS-1 store still reports what it is served under. That half is clean.

### 3. Error-quality transcript

| # | Invocation | Result | Grade |
|---|---|---|---|
| E1-E3 | `status` / `ls` / `show` with no store | names the search order and the fix verbatim | **A** — the model the others should copy (`store.ts:113-126`) |
| E5 | `show deadbeef` | `not an address: "deadbeef" — an address is 64 lowercase hex characters` | **A** |
| E7/E8 | `publish` / `show` an absent address | `nothing in the store at 0000…` | **A** |
| E9 | `verify`, no roots | `no roots published`, exit 0 | **A** |
| **E4** | `status --store /does/not/exist` | prints a complete, confident status for a store that is not there — exit 0 | **F** |
| **E11** | `put --store /does/not/exist <real file>` | **exit 0, returns an address, silently creates the store** | **F** |
| **E13** | `publish --store <that ghost>` | **succeeds, creates `roots/`** — the phantom is now a fully-formed store | **F** |
| E15 | `CAS_STORE=/bogus cas status` | same phantom, via the env path | **F** |
| E16 | malformed `config.json` | `Expected a valid JSON string` — no clause, no path, no guidance | **D** |
| E17 | `{"backend":"postgres"}` | `Expected "file" \| "sqlite"` / `at ["backend"]` — raw schema register, config path never named | **D** |
| E6/E10 | `put <missing file>` | 20 lines of help, then `Invalid value for argument <file>: … Expected: Path does not exist` | **D** — runner's register, buries the one useful line |
| E18 | `--kind-tag 999` | same help dump + `Schema validation failed: Expected a value between 0 and 255` | **D** |
| E19 | `--kind-tag 200` | **admitted, exit 0**, `kind 0xc8` | **C** — deliberate (`commands.ts:286-288`), but now that `KindTagRows` exists, a tag with no registry row could be said out loud |

**The headline.** E11/E13 is BROKEN-SILENT — decision 24's only alarm category. Root cause is two correct things composing into a wrong one: `locateStore` resolves an explicit `--store` path **without ever checking `isStoreRoot`** (`bin/cli/store.ts:240-242`), and the file backend makes its own layout on write (`src/cas/FileBackend.ts:178`, `:214`). The result contradicts the module's own stated law at `bin/cli/store.ts:6-8` — "Nothing here creates a store: `init` is the only creator … never an implicit mkdir" — and `init`'s own help, "the only verb that ever creates one" (`commands.ts:138`). A typo'd `--store` forks a phantom store that `status` then reports as real. No test covers it: `test/Cli.test.ts` (315 lines, 8 cases) never exercises an explicit non-store path.

### 4. Ruling asks

1. **Rule `cas doctor` in or out.** If out, `VOCABULARY.md:60` must stop citing it. If in, it is the consumer that turns four emitted ledgers from gate-only artifacts into an agent-readable surface, and it is where config validation belongs.
2. **Rule whether `--store` at a non-store refuses.** Recommendation: refuse, reusing `NoStoreFound`'s guidance. The alternative — a `--create` flag — reopens "init is the only creator," which is ratified.
3. **Rule kind names into the human register** now that `kindTags.ts` is generated and byte-gated. `render.ts:8-11`'s fallback condition has expired.
4. **Rule whether `put` warns on a tag with no registry row** (E19). Interacts with paperwork audit D6, the working-tag register — `0x54` and `0x58` are in live use with no row anywhere.
5. **Confirm queue item 30's scope** — `--json` on all eight verbs, or the four an agent actually drives (`status`, `ls`, `verify`, `put`).

### 5. Three fixes before dogfood wave 1

1. **Close the phantom store.** `locateStore` (`bin/cli/store.ts:233-256`) must run `isStoreRoot` on the explicit branch and refuse with the `NoStoreFound` guidance that already reads at grade A. Add the two `Cli.test.ts` cases that would have caught it. This is the newcomer's first hazard and the only defect here in the alarm category.
2. **Move argument-validation refusals into the everyday register.** E6/E10/E18 are the three most likely first mistakes and all three answer with a help dump plus runner-register text. The `userFacing` fold (`commands.ts:63-73`) already does this correctly for everything downstream of parsing; parsing itself never reaches it. Fold `readConfig`'s two refusals (E16/E17) in at the same time — both should name the config path.
3. **`--json` on `status`, `ls`, and `verify`.** Already owed by queue item 30, and the Gate tools set the precedent (`mise.toml:189`). Every wave after the newcomer drives this CLI from an agent; today only `show` answers machine-readably. Waves 2 and 4 (the apprentice, the adversary) cannot check a refusal or a verdict without parsing prose.

Cheap adjacent wins, if the lane has room: regenerate the `cas.ts:25-34` vocabulary block from `VOCABULARY.md`'s 12 rows (F2), add the "in flight" row (F4), and give `serve --help` three lines on the boot gate, the clamp, and the credential refusal (F5).
