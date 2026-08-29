# BOOTSTRAP SEMANTICS — pre-grade design

Repo `main`, 2026-08-29. Every proposal below is a `Gate.main` emitter over files that already exist, or a fixture. Nothing new is minted.

---

## 0. Blockers (settle these before any slice)

**B1 — There is no authority for the Lean pin, and it has already drifted.** `mise.toml:1-3` pins `bun 1.4.0` and `node 22.23.2` and nothing else. Lean pins live in eight separate `lean-toolchain` files; elan itself is pinned nowhere. Measured: `experiments/entity-store-extract/twin/extract-lean/lean-toolchain` = `v4.32.0`, every other tracked project = `v4.33.1`. `INGESTION-HARNESS.md:32` already names this ("the only v4.32.0 Lake project in a graded tree") and **nothing gates it**. An env ledger is the first artifact that would make this a field rather than a sentence in a scout report.

**B2 — "User sets up MCP" has no host.** `mcp/cas-tools.json` (6,465 bytes, 5 tools) is emitted and byte-gated (`mise.toml:89,128`), and has **zero code consumers** — every reference in the tree is a spec `.md` or the skill table. `library/effects/src/Server.ts:1-12` is cas-http/0, a different protocol. The CLI's subcommands are `init, status, put, publish, ls, show, verify` (`bin/cas.ts:40`) — no `serve`, no `mcp`. Worse: `init` writes a `ServePolicy` (port 8080, batch/size caps) into **every** store's `config.json` (`bin/cli/store.ts:22-28, 52-57`) that no verb ever reads. Config that nothing consumes teaches an agent a false affordance. The day-1 MCP flow is blocked on a host, not on documents.

**B3 — "Self-building" is false on a fresh clone and the estate already knows.** `INGESTION-HARNESS.md:21` — "On a fresh clone nothing in this harness runs"; `:118` — `.staging/e2/src-cache` is gitignored with no bootstrap script; `:62` — the lift-harness gate cannot run on a fresh checkout. CI (`.github/workflows/check.yml`) runs `mise run check` only, which excludes `check:extract-twin` (`mise.toml:224`). A green badge is currently compatible with two lanes being unrunnable anywhere but this host.

**B4 — No inventory relation is checked in either direction.** Measured: `library/cas/lakefile.toml` declares 11 `[[lean_exe]]`; `mise.toml` drives all 11; `.agents/skills/backend-materialize/SKILL.md:15-22` lists **6**. Invisible to the skill whose job is routing agents to emitters: `verdicts`, `emitgate`, `emitlift`, `emitgrammar`, `materialize`. This is `LANGUAGE-POLICE.md:154`'s M6 failure mode, reproduced in the skill estate.

**B5 — The spec ledger's own maintenance law is violated 17 ways today.** `SPECS.md:12-14` requires every spec to carry a pointer in its domain's AGENTS.md. Measured against `AGENTS.md`, `library/cas/AGENTS.md`, `library/effects/AGENTS.md`, `experiments/AGENTS.md`:
- **9 rows unreferenced:** `operational-structure/DESIGN.md`, `schema-materialization/{ADMISSION-MAP, DERIVING-DESIGN, JIT-SUBSTRATE-SURVEY, TOOLS-DX-REVIEW, SALVAGE-DOSSIER}.md`, `treesitter/MATERIALIZER-LANE.md`, `verbal-register/REGISTER.md`, `research-backlog/ml-embeddings-tooling.md`.
- **8 reverse violations** against `SPECS.md:7` ("every `.md` the estate builds from is categorized here"): `CHARTER.md`, `CONTEXT-MAP.md`, `CLAIM-GATES.md`, `KINDS.md`, `DEVELOPMENT-INVARIANTS.md`, `MACHINE-ALGEBRA.md`, `IMPLEMENTATION-PLAN.md`, `differential-testing-spec.md` are cited as authority by an AGENTS.md and rowed nowhere.
- Scale: 270 tracked `.md`, 20 rowed.

Green control: all 16 orientation-table links in root `AGENTS.md` resolve today. The gate can go green; the content relation is what is red.

**B6 — Chassis/path mismatch, one ruling, both lanes.** `Gate.emitOne`/`checkOne` take a bare `System.FilePath` (`Gate.lean:127-143`) and every cas task sets `dir = {{config_root}}/library/cas`, so fixture paths resolve inside `library/cas`. Every artifact this lane wants to gate — `mise.toml`, the AGENTS.md files, `SPECS.md`, `package.json`, the eight `lean-toolchain` files — lives outside it. Police designs A/B/C never hit this (they write to `library/cas/surface/`); the bootstrap lane hits it on slice 1. Recommend: keep `dir = library/cas`, give the tool a `repoRoot := ".." / ".."` constant. One line, no Gate change.

**B7 — A faithful ledger is a green ledger.** Existing emitters fail only on byte drift. A ledger that accurately records "9 violations" is byte-stable and green while the estate rots. Fix without new machinery: put an `accepted` allowlist in the Lean value (the Concrete idiom, `LANGUAGE-POLICE.md:84`) and make `violations \ accepted` part of the fixture content, committed empty. Any new violation is then a byte diff and fails through the existing mechanism; shrinking `accepted` is the ratchet.

---

## 1. The environment ledger

**Data source.** Files on disk, all tracked. No environment walk — therefore **no `supportInterpreter`, no `importModules`**, runtime <1s rather than Surface's ~11s. This is the cheapest tool in the police family by an order of magnitude.

**Content of `ENVIRONMENT.json`:** mise `[tools]` rows; every `lean-toolchain` path→pin plus `distinctPins`; every mise task with its `dir`, its `run` list, and `inChain` computed from `check`'s own run list; `excludedGates`; the 11 `lean_exe`s joined to their driving task and gating `--check` line, with `undriven`/`ungated` arrays; `.reference/provenance/sources.lock.json` ids and revisions. Host-local vs portable is a **declared column with a reason**, never inferred.

**What it surfaces on day 1, as data rather than tribal knowledge:**
- the `v4.32.0` / `v4.33.1` split (B1);
- five tasks defined but outside the chain — `check:extract-twin`, `check:effects:archive`, `gen:effects:archive`, `gen:effects:research`, `brief:effects:archive`;
- **a live gen/check asymmetry**: `check:effects:research` is in the chain (`mise.toml:201`) but `gen:effects:research` is **not** in the `gen` list (`mise.toml:5-22`). If those snapshots drift, `check` goes red and `mise run gen` does not fix it. That is exactly the tribal knowledge the directive is aimed at, and it is invisible today.

**Connecting to B3.** The `portable | host-local` column is the antidote to "nothing runs on a fresh clone": it turns a scout sentence into a counted field in a committed artifact, and every future regression appears as a diff.

**Doctor is a separate mode and must not be a fixture.** `--check` gates the *declaration*. A `--doctor` mode confronts *reality* (is elan present, does each pin have an installed toolchain, does `bun --version` match, does each host-local input exist) — host-varying, so it prints and exits nonzero, and never writes bytes. Two modes over one Lean value; byte identity stays intact.

**Cost.** ~180 lines. The real cost driver is that **Lean core has no TOML parser** — `mise.toml` and `lakefile.toml` need a hand-rolled line grammar. Mitigation: a deliberately narrow grammar restricted to the shapes those files actually use, which **refuses loudly** on an unmatched line rather than defaulting past it.

**Enumeration by declaration, not by walk.** The file list is a committed Lean constant. A new Lake project that forgets its row is then a red gate rather than a silent pass.

---

## 2. AGENTS.md as projection

**Derivable (projection).** The orientation table's link column and link resolution; the spec rows (`SPECS.md`'s Domain column is the authority); the Tooling section's pin sentences against `mise.toml` `[tools]` and the eight `lean-toolchain` files; the Tasks paragraph (`AGENTS.md:105-108`), which is literally `mise.toml`'s task graph in prose; the skill-routing table's workflow names against `.agents/skills/lean/workflows/` (6 directories).

**Irreducibly authored.** C1–C7 (`AGENTS.md:32-55`), Procedures, the disclosure rule, the two-minute rule (`library/cas/AGENTS.md:18-33`), every lane rule. Operator's voice.

**Do not generate AGENTS.md.** Adopt the both-directions LAWS discipline (`LANGUAGE-POLICE.md:104`): emit the *facts*, gate the *agreement*, leave the prose hand-written and its claims true. Three checks, each failing both ways:

1. spec↔AGENTS coverage — 9 forward + 8 reverse red today (B5);
2. link resolution — 16/16 green today (the control that proves the gate can pass);
3. tooling claims — versions named in prose match `mise.toml`; every Lake project has a `lean-toolchain`.

**Artifact:** `ORIENTATION.json`, rows of `{spec, category, domain, agentsFiles[], resolves}`, plus `violations \ accepted` per B7.

**Cost.** ~150 lines on top of the env ledger (shared file-reading spine). **Blocked** on the accepted-list ruling (ask 2).

---

## 3. Skill derivation

**Projections.** `backend-materialize`'s emitter table is 100% derivable and 5/11 stale (B4) — and the source column already exists: every `[[lean_exe]]` block in `lakefile.toml:32-131` carries a prose comment naming what it regenerates and that `--check` is the gate. The `estate` skill's Handles links (all resolve — gate them). The `lean` skill's workflow routing table against its own directory.

**Authored.** The judgment: the two-minute rule, "layout is the emitter's explicit choice" (`SKILL.md:47`), "a hand edit is a defect". **Skills teach; tables route. Generate the tables, never the teaching.**

**Mechanism.** Markdown has no include, so do not gate a hand-written table — **delete it**. The emitter table becomes its own emitted fixture that `SKILL.md` links to.

**Duplication fear, resolved:** `.claude/skills` is a tracked symlink to `.agents/skills` (all five `SKILL.md` byte-identical; `git ls-files` returns one entry). One emission serves both harnesses.

**Cost.** ~40 lines on the env-ledger spine. **Blocked** on the ruling to delete rather than gate (ask 3).

---

## 4. MCP setup story

Missing today, ranked:

1. **A host** (B2) — without one, nothing else in this section is reachable.
2. **A `serve` verb** consuming the `ServePolicy` `init` already writes.
3. **Config validation as a verb.** `readConfig` refuses typed correctly (`bin/cli/store.ts`), but only when a verb opens a store. There is no `cas doctor`.
4. **Logging.** No structured logs, no log-level flag, nowhere an agent reads what happened.
5. **The client-side config snippet.** Nothing emits the `.mcp.json` a host pastes — and that is the *cheapest* missing piece, because the manifest knows the tool names and the env ledger knows the command, args, and entrypoint.

**Design: emit no further MCP documents until a host exists.** The one artifact that pays beforehand is a setup fixture (`mcp/SETUP.md` + `mcp/cas-mcp.example.json`) emitted from `Cas.Backend.Mcp.tools` plus the env ledger's entrypoint facts — including a **generated OWED list** of what is not implemented, so the gap is recorded rather than remembered.

**Acceptance criterion for "zero tribal knowledge":** an agent reading only `{ENVIRONMENT.json, ORIENTATION.json, cas-tools.json, SPECS.md}` can name every task and its host, every pin, every gate and whether it is in the chain, every tool and its params, and **what is not implemented**. Today (a)–(d) require reading five files by hand and (e) is written down nowhere.

---

## 5. Self-building fixtures — real vs slogan

**Real.** The gen/check discipline already *is* a self-building fixture system for the semantic plane: 11 emitters, one driver, byte identity, `git diff --exit-code` as the drift gate (`mise.toml:192-204`). Extending it to the configuration plane is a straight-line extension — config files are described values on disk exactly as schema payloads are.

**Slogan.** "Lean owns ALL the tooling" is not achievable as stated, and claiming it would be the exact defect this lane exists to catch. Three hard limits:

1. **Lean cannot own mise.** mise installs elan and bun, so it necessarily precedes any Lean exe. The ledger describes mise; it cannot replace it.
2. **No Lean tool can diagnose a broken Lean toolchain.** A tool in `library/cas` requires `lake build` to succeed before it runs — precisely the condition that fails when the doctor is needed. **The doctor for the Lean plane must not be Lean** (a mise task or a bun script).
3. **Owning `mise.toml` means hand-rolling a TOML grammar in Lean** — re-implementing a config format the direction law says to ingest.

**Honest formulation, and the most important line in this report: Lean owns the descriptions; mise owns the execution; the doctor for the Lean plane is not Lean.** Write that down before anyone builds a bootstrap that cannot run when the bootstrap is what is broken.

---

## 6. Sequencing vs the police lane

**Parallel, not stacked.** Nothing in this design touches design E's walker. The env ledger and the orientation gate read *files*, not the environment — no `Surface.collect`, no ~11s import, no conflict with promoting `collect`/`Row` into the Gate lib (`LANGUAGE-POLICE.md:256-262`). The bootstrap lane can start today alongside the dispatched walker/obligations work.

**Rides existing dispatch:** the env ledger (no ruling). **Blocked on rulings:** the orientation gate (accepted list), the skill table (delete-vs-gate), the MCP setup artifact (host). **Shared with the police lane:** B6's path discipline — settle once, for both.

---

## Ruling asks

1. **B6 path discipline** — repo-root fixtures via a `repoRoot` constant with `dir = library/cas` unchanged (recommended), or a repo-root mise task. Binds both lanes.
2. **B7 accepted list** — of B5's 9 forward + 8 reverse violations, which are fixed before the gate lands and which enter `accepted` as a shrinking ratchet? The gate cannot be committed green without this answer.
3. **Skill tables** — delete `backend-materialize`'s hand table in favour of an emitted fixture (recommended), or gate the hand table in place.
4. **`SPECS.md:7`'s scope** — "every `.md` the estate builds from" against 270 tracked `.md` and 20 rows: is the ledger's domain *authority documents* (in which case the 8 reverse violations are real defects), or *specs narrowly*? The gate cannot be written until the predicate is decided.
5. **The v4.32.0 pin** — is `extract-lean` a declared exception (which the ledger records with a reason) or drift to be closed? Ledger honesty requires one or the other.
6. **The five excluded gates** — declared exceptions with reasons, or debt with owners? Same requirement.
7. **`gen:effects:research`** — add to the `gen` list (closing the asymmetry), or record the manual-fix requirement as a declared exception.
8. **Doctor host** — accept that the Lean-plane doctor is a mise task or bun script, not a Lean exe (§5 limit 2).
9. **MCP host** — is a `serve`/MCP host in scope now? If not, rule that `ServePolicy` stops being written by `init` until a consumer exists, rather than shipping config nothing reads.

---

## The one tool to build first

**`lake exe envledger` — slice EL1.**

Not the orientation gate, despite its higher value: it cannot be committed green before ask 2, and building it twice is the failure mode. The env ledger needs **no ruling** — it transcribes files that exist, gates by byte identity, and catches a live drift on day 1.

**Exact scope:**

- New `library/cas/tools/EnvLedger.lean`; `[[lean_exe]] name = "envledger"`, `srcDir = "tools"`, `root = "EnvLedger"`, **no `supportInterpreter`**; driven by `Gate.main "lake exe envledger"`.
- `repoRoot : System.FilePath := ".." / ".."` (B6).
- Reads, each with a narrow grammar that **refuses** on an unmatched line: the eight `lean-toolchain` files (one line each); `mise.toml` (`[tools]`, task name, `dir`, `run` lines); `library/cas/lakefile.toml` (`[[lean_exe]]` names). File list is a committed Lean constant, not a directory walk.
- One fixture, `docs/lab-core/ENVIRONMENT.json`, sorted, carrying: `tools`; `leanToolchains` + `distinctPins`; `tasks` with `{name, dir, commands[], inChain}`; `excludedGates`; `leanExes` joined to driving task and gating check line, with `undriven`/`ungated` arrays — both empty on day 1, the green control proving the join works.
- Wiring: lakefile block; `gen:env-ledger` in the `gen` list; `lake exe envledger --check` in `check:cas`; one row in the emitter table (or its replacement, once ask 3 lands).
- `--self-test`, one planted defect per rule (`LANGUAGE-POLICE.md:104`): an unparseable `lean-toolchain` line (must refuse, not default); a task whose `dir` the grammar misses; a `lean_exe` with no driving task (must land in `undriven`).

**Not in EL1:** the doctor mode (host-varying, no fixture — EL2); `package.json`/lockfile transcription (EL3); any AGENTS.md or SPECS.md reading (that is §2's tool); anything MCP.

**Cost:** ~180 lines Lean + ~15 wiring + ~70 self-test. Runtime <1s, no import.

**Done means:** `mise run check:cas` green, clean tree after `mise run gen`, `--self-test` firing every control, and the `v4.32.0`/`v4.33.1` split, the five excluded gates, and the `gen:effects:research` asymmetry readable as data by an agent that has read nothing else.

**Caveat:** if ask 1 goes the other way, the fixture lands at `library/cas/surface/environment.json` and the tool is unchanged but for one constant.
