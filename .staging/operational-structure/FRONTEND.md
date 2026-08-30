I have the estate grounded and the external research in. Writing the report now.

## FRONTEND.md — the front-end lane: semantics, aesthetics, architecture

**Design lane report, 2026-08-29 night. Pre-grade. Read-only survey of `main` + working tree.**
**Commissioned under decision 21 (`docs/SPECS.md:241-250`) and its same-night addendum (`docs/SPECS.md:251-...`, commit `c052222c`): foldkit is ruled the chassis; the direction is server-side estate AST → front-end components.**

---

### 0. Verdict in one paragraph

The substrate closed more of the gap tonight than the record has caught up with. `cas serve` exists (`library/effects/bin/mcp/server.ts`), boot-gated on the emitted manifest. The SQLite composition now provides the **full** seam set including `RootStore` (`library/effects/bin/cli/store.ts:226-242`) — which silently **closes the BLOCKING item** the last front-end lane stopped on (`.staging/paper-notes/11-api-contract.md:329-338`, "`cas_list_roots` does not compile today"). `SqlRootStore.ts` landed and killed it. What remains between the estate and a front end is not architecture: it is **one version number, one absent operation, and four config files nobody has emitted**. The front end is a projection and should be built as one. Everything below is blockers-first, and the last section commissions one slice.

---

### 1. Blockers (front-end specific; settle before any slice)

**FE-B1 — The Effect version split is now the gating fact, and it has an unexpectedly clean resolution.**
`library/effects/package.json:37` pins `@effect/sql-sqlite-bun` at `4.0.0-rc.111`; `experiments/workbench/package.json:29-31` pins `effect@4.0.0-rc.112` because `foldkit@0.154.0` peer-pins it **exactly**. Two `effect` copies in one bundle is two `Context.Service` registries and silent layer-resolution failure — the workbench's own README states this at length and marks its provenance `PENDING`.

What is new tonight: **`@effect/sql-sqlite-wasm` publishes `4.0.0-rc.112` under its `rc` dist-tag** (npm registry, verified 2026-08-29; `latest` is the v3-line `0.53.0` peering `effect ^3.22.0`, which is what a casual look finds). It exports `SqliteClient.layer`, `SqliteClient.layerMemory`, and `OpfsWorker.run`. So rc.112 is simultaneously (a) what foldkit demands and (b) the version at which the estate's *own* store composition gains a browser client. **The C6 reconciliation is not hygiene — it is the single act that unlocks both the chassis and the browser store.** Ruling ask 1.

**FE-B2 — The front end's own gate is uncommitted and invisible to the environment ledger.**
`mise.toml` has an **uncommitted** working-tree diff adding `check:workbench` to the `check` chain (`mise.toml:253-270`; `git blame` reports "Not Committed Yet"). Measured: `mise.toml` declares 39 task blocks, `docs/lab-core/ENVIRONMENT.json` carries 38, and the diff is exactly one — `check:workbench`. The string `workbench` appears **zero times** in the ledger. Committing the mise change without regenerating turns `lake exe envledger --check` (a leg of `check:cas`) red. The front-end lane's first act is that the estate's zero-tribal-knowledge artifact can see the front end.

**FE-B3 — No agent config exists in the repo at all.**
No `.mcp.json`, no `.vscode/mcp.json`, no `.codex/config.toml`, no `opencode.json`. `cas serve` landed tonight and **nothing points any client at it**. This is `BOOTSTRAP.md:91`'s "cheapest missing piece" — and both of its inputs (`cas-tools.json`, `ENVIRONMENT.json`) now exist, so the emitter is no longer blocked on anything.

**FE-B4 — There is no HTTP transport for anything.**
`cas serve` is stdio only and says so in its own docstring (`library/effects/bin/mcp/server.ts:4-12`; verb at `bin/cli/commands.ts:397-406`). A browser cannot speak stdio. Meanwhile `library/effects/src/Server.ts` exports a complete cas-http/0 `Core` + `httpApp` that **no verb serves** — the observation at `.staging/paper-notes/11-api-contract.md:238` is still true for the byte plane even though it is now false for MCP.

**FE-B5 — The word is still absent, and it is the front end's central object.**
`grep` for `cas_word` / `WordSig` / `since_suffix` across `library/cas/Cas` and `library/effects` returns nothing. Every screen the operator's own requirements document specifies is a rendering of the word: "the terminal is the word, with an input line at the bottom" (`.staging/paper-notes/10-workbench-requirements.md:25`); "the CAS is the user's history"; "admission order is the reading order". The store is a *set*; the word is *strictly more information* than the store, so no program of `CasSig` reconstructs it (`11-api-contract.md:29-66`). **Today the front end can render roots and content and cannot render history.**

**FE-B6 — `@foldlab/cas` is `private: true` and its bin is a bun shebang.**
`library/effects/package.json:4,15-17` — `"bin": { "cas": "./bin/cas.ts" }`. There is no `npx`/`bunx` path. "git clone → one command" today means "git clone → install bun and mise → one command", which is the honest bar and should be stated rather than marketed past.

**FE-B7 — The Ts fragment cannot spell a view function.**
`Ts.Decl` has `ConstDecl` and `ProgDecl` only (`library/cas/Cas/Backend/Ts.lean:59-80`), and `ProgDecl` is a **one-parameter** arrow with an `Effect.gen` body. A foldkit view is a two- or three-parameter arrow with an *expression* body. One additive `Decl` arm is needed. This is R6 fragment growth with a real consumer — the discipline's own admitted move — not a new abstraction. Ruling ask 6.

**FE-B8 — `ServePolicy.credentialEnv` has no checker anywhere in the tree.**
The stdio host handles this honestly: a store whose policy gates reads is **refused outright**, with a message explaining that stdio's peer is the process that launched it (`bin/mcp/server.ts:92-109`). The moment there is an HTTP host, that refusal must become either a real credential check or an identical refusal. It must not become silence.

---

### 2. Question 1 — LOCAL-FIRST

#### What EXISTS

The substrate is already local-first; nothing about it is aspirational.

- **The store is immutable content keyed by its own digest.** `KvsBackend.ts:20-24`: "re-insertion of identical bytes IS the identity." Two replicas that admit the same content produce the *same row*.
- **The roots registry is a grow-only set.** `SqlRootStore.ts:34-37`: `INSERT ... ON CONFLICT DO NOTHING` — "the seam's algebra says the roots set only grows and re-publication is the identity."
- **One file is the unit of replication.** `bin/cli/store.ts:216-224`: two tables (`cas_objects`, `cas_roots`) in one SQLite file, opened WAL by default "which is what Litestream requires", asserted by `test/KvsSqlite.test.ts`.
- **The replication *identity* question is already tested.** `scripts/litestream-check.ts` replays every Lean conformance vector into a SQLite CAS, replicates, restores to a *different file*, and re-loads every address through the full read law.
- **Read-only replicas over any static host are free.** `PathReader.ts:1-18` — "a git server's raw endpoint, an object store, a static file host"; "the host is untrusted by construction: the store law above the seam recomputes the digest and re-decodes canonically on every read." Read-only is a **type-level** fact: the module provides `ByteReader` and nothing else.
- **The sync protocol is already written down.** `PROFILE-CAS-HTTP-0.md:108-126` (§6 `/control/missing` — N status bytes positionally aligned, presence answers are *planning data only*, never negatively cached) and `:127-150` (§7 `PUT /roots/{hex}` with the declared closure; children upload before parents; the root publishes last; the **client** ordering gate is the law).

#### The design: sync is root exchange, and local-first is nearly free

State it precisely, because this is the estate's genuine structural advantage over every CRDT-based local-first stack:

> **There is no merge function because there is no pair of distinct values that can share a key.** Content is addressed by the digest of its own bytes. The object table is a join-semilattice; the roots table is a grow-only set; both merge by union. The only mutable state in the entire system is *which addresses are published*, and publishing is monotone.

CRDTs exist to reconcile concurrent mutation of a shared mutable value. The estate has no shared mutable value. What it has is a **substituter**: replica A asks replica B "which of these N keys are you missing" (§6), ships the difference, then publishes the root last (§7). That is the whole sync engine, and both halves are already specified and implemented in the profile.

Two honest caveats, neither of which is a merge problem:

1. **Digest collision is the one same-key-different-bytes case, and it is a *refusal* today** (memory backend fails with `BackendFailure`; cas-http/0 answers `409`). A sync layer that silently last-writer-wins that row **erases a refusal**. In single-primary topology it cannot arise — but that is a property of the topology, not of the store. Carry it as a stated assumption, exactly as `11-api-contract.md:290-297` demands.
2. **The word does not sync, and this was already ruled.** Two replicas admitting concurrently produce two admission orders, and order is semantics. `11-api-contract.md:299-306`: *"The set syncs. The word does not. Admission order is when you learned something; it is honest for it to be per-device."* Keep it.

Litestream v0.5's read-replica VFS (streaming pages from S3 while hydrating) is announced and in progress as of 2026, not shipped as a general read-replica story; libSQL/Turso embedded replicas are the shipping mechanism today. Neither changes anything above the seam — the library "never knows what a database is" (`KvsBackend.ts:5-6`), so swapping the sync backend costs one layer.

#### The browser's store — three tiers, costed

The brief asks: wasm SQLite over OPFS running the same `KvsBackend` composition, or cas-http to a local daemon? The honest answer is that these are not alternatives; they are tiers, and only one of them is v0.

**Tier 0 — no store in the browser. Read projections + speak the tool table to a local `cas`.**
Cost: an HTTP transport (FE-B4). Buys: the emitted JSON artifacts and store reads, with admission staying on one side of one seam.

**Tier 1 — a read-only browser store, and it costs almost nothing.**
`PathReader` needs exactly one supplied capability: `ReadPath = (relativePath: string) => Effect<Option<Uint8Array>, PathReadError>` (`PathReader.ts:36-40`). Over `fetch` that is roughly forty lines. It gives a browser tab a genuine CAS reader — full read law, digest recomputed above the seam, hostile host surfacing as a typed refusal — with **no wasm, no OPFS, no Worker, no admission, and no second authority**. The store root is a directory; publishing a CAS is committing a directory. Any static host, including the vite dev server, is a replica.
Cost: ~40 lines + a build step that copies the store root. **This is the local-first slice that is nearly free, and it is the one to take.**

**Tier 2 — a writing browser store over `@effect/sql-sqlite-wasm` + OPFS.**
Mechanically this is now real, and the cost is one layer: `layerSqliteCasAt` (`bin/cli/store.ts:226-242`) is `Layer.mergeAll(layerStore, layerSqlRootStore())` over `layerKvsBackend` over `KeyValueStore.layerSql({table})` over `SqliteClient.layer({filename})` over `layerAddressSha256Live`. **Every layer in that stack is platform-free except the last two lines**, and the address scheme is already WebCrypto (`store.ts:247`), which browsers have natively. Substituting the wasm `SqliteClient.layer` for the bun one is the entire porting job.

The costs that are *not* the layer:

- rc.112 (FE-B1), plus peers `@effect/wa-sqlite` and `@effect/experimental`.
- SQLite-wasm is synchronous; OPFS access must run in a Worker or SharedWorker (`OpfsWorker.run` exists for this). Concurrency testing in 2026-03 held at 8–10 concurrent workers with disciplined locking and explicit `SQLITE_BUSY` handling.
- **The real cost, which is not technical.** A writing browser store is a **second admission authority**, running the estate's only gate in the least-controlled, least-versioned process in the system. `11-api-contract.md:190-201` refused it on exactly that ground — *"reject on that ground, not on impossibility"* — and the direction law is the reason. Nothing tonight changed that argument.

**Recommendation: rule tier 1 as v0 and gate tier 2 behind its own ruling.** Ruling ask 2.

---

### 3. Question 2 — BROWSER PROJECTIONS, and components as projections

#### What EXISTS to serve

The projections are **files**, and this is the fact that collapses most of the "serving" question:

| Artifact | Path |
|---|---|
| kind-tag registry (machine) | `library/effects/src/cas/generated/grammar/manifest.json` |
| kind-tag registry (TypeScript) | `library/effects/src/cas/generated/grammar/kindTags.ts` |
| kind-tag registry (human) | `library/cas/REGISTRY.md` |
| tool table | `library/cas/mcp/cas-tools.json` (5 tools) |
| theorem/surface ledger | `library/cas/surface/cas-surface.json`, `cas-obligations.json` |
| environment ledger | `docs/lab-core/ENVIRONMENT.json` |
| lift manifest | `library/cas/Cas/Lift/Manifest.lean` → emitted pair |

`kindTags.ts`'s own docstring calls `manifest.json` "its machine one" and `REGISTRY.md` "the same table's human rendering" — one described value, three surfaces, all byte-gated. `PLAIN-LANGUAGE.md:140` already names the front end as the literature projection's **second consumer**, not an alternative to it.

**So tier 0 serving is: the daemon, read-only** — superseding this section's original static-host answer. Decision 32(a) ruled it: tier-0 projections are daemon-served, read-only, at `/projections` and `/projections/{name}`, from the same byte-gated files the gates check, read per request so a regenerate needs no restart. The daemon was already standing for (a) store reads beyond a static directory and (b) writes, so the static copy step was a second serving story for the same bytes, not a cheaper one. The files remain files: a static host is still a legitimate deployment of the same artifacts, and nothing about the artifacts changes — what the ruling settles is which surface the workbench reads first. See [library/effects/SERVING.md](../../library/effects/SERVING.md) for the route table and the repo-checkout scope of the served set.

#### Does cas-http/0 finally stand up?

Partly, and the split should be ruled rather than drifted into:

- **The tool table is the protocol for operations.** R11 is law and decision 18 sharpened it: the tool register **is** a signature; `McpTool` params and results are already `Ast` codes (`Cas/Backend/Mcp.lean:6-18`). One described manifest owns the protocol; transports are handler composition (R10). So the browser gets the **same five tools** the agents get, over Streamable HTTP, gated by the **same** boot check (`bin/mcp/server.ts:138-160`) — that gate is transport-independent and must not be skipped for the HTTP host.
- **cas-http/0 is the byte plane, and it is the right wire for bulk reads and sync.** It already specifies §6 find-missing and §7 publish. It is what `PathReader` consumes. Do not make it compete with the tool table; `11-api-contract.md:230` calls conflating them the mistake.

Verification item, honestly flagged: whether `effect/unstable/ai/McpServer` at the pinned rc offers an HTTP layer beside `McpServer.layerStdio` (`bin/mcp/server.ts:171`) is **unverified**. If it does not, the HTTP host is a small hand-written adapter over the same `casToolkit`, which is still one composition and no new abstraction.

#### What the workbench consumes first

In order, and each is genuinely cheap:

1. `manifest.json` / `kindTags.ts` — the sort vocabulary. Without it every rendering is a magic number.
2. `cas-tools.json` — the operation vocabulary, and the thing that makes W-L1 ("show you the program before it runs") possible.
3. `PathReader`-over-`fetch` reads of a committed store root — real content, no server.
4. `ENVIRONMENT.json` — the "what is this estate, what runs, what is red" page, which is the first genuinely useful screen and needs nothing else.
5. `cas-surface.json` / the owed `cas-literature.json` — the prose plane.

#### Components as projections — the ruled direction, and the honest mechanics

The ruling is that a described kind's canonical code determines its component the way it already determines its wire mirror and its admission row. **This is mechanically sound, and foldkit is unusually well-shaped for it.** Three verified facts decide it:

1. **The view is a data value.** `foldkit/dist/html/index.d.ts`: `export type Html = VNode | null` — snabbdom `VNode`, constructed synchronously by element factories.
2. **The element builder is a *parameter*, not an import.** The workbench's own view is `(model: Model, h: HtmlBuilder<Message>): Document => ({ title, body: h.main([h.Class("page")], [ ... ]) })` (`experiments/workbench/src/main.ts:106-135`). Every element and every attribute is a method call on `h`.
3. **foldkit has a component abstraction with an explicit props record.** `foldkit/dist/html/submodel.d.ts`: `defineView<Model, Message, ViewInputs>((model, viewInputs, h) => ...)` — a view function branded with the Message type it dispatches, with `ViewInputs` in the middle position when present. Also present in `dist/`: `route`, `navigation`, `submodel`, `hydrate`, `render`, `experimental/server/{entry,host,serialize,template}`, `story`, `scene`, `canvas`, `customElement`.

**Consequence: emitting a foldkit view needs ZERO new `Ts.Expr` forms.** `h.li([h.Class("owed-item")], [h.span(...)])` is exactly `call (ident "h.li") [arr [call (ident "h.Class") [str "owed-item"]], arr [...]]` — `ident`, `call`, `arr`, `str` (`Ts.lean:29-43`). This is the identical claim `EmitLayer` already **executes** rather than restates for layer topologies (`EmitLayer.lean:11-16`: "The ratified claim that layer generation needs ZERO new fragment forms is executed here rather than restated"). And because `h` is a parameter, the generated module imports nothing from `foldkit/html` — the first-dotted-segment import rule `EmitLayer.lean:31-36` had to invent does not even arise.

What is owed is `Ts.Decl`'s arrow arm (FE-B7). That is the whole fragment cost.

**The mapping, with confidence stated:**

| Estate code | Component projection | Derivable? |
|---|---|---|
| `Ast.struct fields` | field list; one row per field, label = field name, value = the field's own projection | **yes** |
| `Ast.union members` | tagged switch, one arm view per member — and arm **order is not a design choice**, because order is identity (decision 4) | **yes** |
| `Ast.arr` | list view in admission order | **yes** |
| `Ast.enum` | label (read) / select (edit) | read: yes. edit: a design decision |
| `Ast.ref` / addressed child | a navigation edge: address chip + route to that address | **yes** — this is "the DAG walk IS the route structure" |
| kind tag | which viewer to dispatch to — `kindTags.ts` **is** the dispatch table | **yes** |
| closed refusal family (`Cas.matchError`) | the "I cannot show you this" rendering (W-S2) | **yes** |
| layout, density, emphasis, gesture, what deserves a whole screen | — | **no. Irreducibly authored.** |

**The split, in the estate's own idiom.** This is `BOOTSTRAP.md:51-66`'s AGENTS.md-as-projection rule applied to pixels: *emit the facts, gate the agreement, leave the judgment hand-written*. For UI that reads:

> **Emit the structure. Author the presentation.** The emitter produces a *default viewer per described kind* — complete, correct, and plain. An authored component is a **registered override** against the same kind tag, never a fork. A kind with no override renders through its generated viewer, and that is not a placeholder: it is the truthful rendering of a kind nobody has designed yet, on the same discipline as "the column reads `—`, never `0`" (`10-workbench-requirements.md:210-214`).

**Where foldkit fights the projection discipline — named, not forced:**

1. **`HtmlBuilder<Message>` is Message-typed.** A generated viewer for a described kind does not know the host application's `Message`. Two exits: (a) generate views that dispatch **no** messages — pure read views, generic in Message; (b) generate `defineView<Model, Message, ViewInputs>` per kind where `ViewInputs` carries host-supplied callbacks. (a) is v0 and covers every projection view; (b) is what the component register is for. This constraint decides the first component slice's scope and should be stated in the commission.
2. **`Html = VNode | null` is an opaque runtime object, not a serializable value.** So a component **cannot be store content** the way a schema code is. What is store-resident and addressable is the **descriptor**; what is emitted is the **source**. Say this plainly before anyone designs "components as CAS content" — they mean the descriptor.
3. **The exact peer pin is the framework dictating the estate's version**, which is the rare inversion of the estate's usual posture. It is FE-B1 and it must be ruled, not absorbed.
4. **SSR is behind `experimental/`.** `dist/experimental/server/` and `dist/hydrate.js` are real, and hydration ships a second correctness surface (`serialize.ts`).

#### Server-rendered vs client-hydrated — costed, as asked

**Verdict: client-rendered from gated JSON for v0.** Four reasons: the "server" is a process on the user's own machine, so SSR saves no round trip that matters; foldkit's SSR is `experimental/`; the emitted artifacts are files and a static host is the entire server; hydration adds a serialization surface for no v0 product value. Revisit when there is a remote multi-user deployment — which decision 17 explicitly scopes as piecemeal and later.

#### "Teach others to speak ours" — the component register

Emit `library/cas/surface/components.json` beside `grammar/manifest.json`, from the same described values. Rows: `{ kind, tag, view: {name, module}, props: [{name, code}], edges: [{field, kind}], overridden: bool }`. The precedent is exact and already written down: *one described value → two surfaces, both byte-gated, neither hand-maintained* (`PLAIN-LANGUAGE.md:135`). Third-party front ends read `components.json` the way agents read `cas-tools.json`. This is the honest form of the ruled slogan — **the manifest is the teaching artifact; the emitted foldkit module is one host's materialization of it**, exactly as decision 18 says every host language's typed surface is materialized from the same codes.

---

### 4. Question 3 — BRING YOUR OWN AGENT

#### The setup matrix (web-verified 2026-08-29)

| Agent | Checked-in config | Key | Transports | Add command | Trust gate | cwd |
|---|---|---|---|---|---|---|
| **Claude Code** | `.mcp.json` (repo root) | `mcpServers` | stdio, `http` (alias streamable-http), `sse` (deprecated), `ws` | `claude mcp add --scope project --transport stdio cas -- <cmd>` | per-project prompt; `enableAllProjectMcpServers: true` bypasses; non-interactive loads silently | **no `cwd` key** — use `${CLAUDE_PROJECT_DIR}` in `command`/`args` |
| **OpenAI Codex** | `.codex/config.toml` (root → cwd, closest wins) | `[mcp_servers.cas]` | stdio, Streamable HTTP (`--url`); no SSE | `codex mcp add cas -- <cmd>` | project layers load **only if the project is trusted** | first-class `cwd` key |
| **opencode** | `opencode.json` / `.jsonc` (cwd → nearest git dir) | `mcp` → `type: "local"` \| `"remote"` | stdio (`local`), HTTP (`remote`) | none documented — edit the file | not documented for MCP | `cwd` key; `{env:VAR}` / `{file:path}` substitution |
| **VS Code (Copilot agent mode)** | `.vscode/mcp.json` | `servers` (+ `inputs`, `sandbox`) | `stdio`, `http`, `sse` | *MCP: Add Server* | per-server trust dialog on first start | `cwd` + `${workspaceFolder}` |
| **pi (pi.dev)** | `.pi/settings.json` | `packages`, `extensions`, `skills` — **no MCP key** | **none first-party** | n/a | project trust before `.pi/settings.json` loads | n/a |

Notes that matter:

- **"pi dev" resolves to pi.dev, the Pi Coding Agent** (Earendil Inc., `earendil-works/pi`, MIT) — not Inflection's consumer Pi. It states **"No MCP"** as a design decision and directs users to build CLI tools with READMEs, or an extension. Third-party MCP adapters exist (`pi-mcp-adapter` and others), all unofficial.
- **MCP spec revision is `2026-07-28`** and it was a major rewrite: the protocol is now **stateless** (the `initialize` handshake is gone, replaced by a required `server/discover`), `Mcp-Session-Id` and SSE resumability are removed from Streamable HTTP, the legacy HTTP+SSE transport is formally **Deprecated** under a 12-month removal policy, and **Roots, Sampling, and Logging are newly deprecated** (SEP-2577). The host currently offers `v2025_11_25` and three older revisions (`bin/mcp/server.ts:172-178`); the newest spec revision is **not** among them. That is a real currency gap, not a defect — but the "newest first, unknown revision gets the first" fallback documented at `server.ts:14-16` means a 2026-07-28 client is answered with a 2025-11-25 handshake. Worth a ruling.
- **There is no standard for declaring an in-repo MCP server.** `server.json` is registry *publication* metadata, not client config. Two competing config shapes persist: `mcpServers` (Claude Code and most of the ecosystem) vs `servers` (VS Code), plus Codex's TOML and opencode's `mcp`. **AGENTS.md is the real cross-agent convention** — now stewarded by the Agentic AI Foundation — but it is prose, not machine-readable config.
- **VS Code enforces a hard 128-tool-per-request limit** (mitigated by tool grouping). Five tools is nowhere near it; the code-mode register (decision 16) keeps it that way permanently, which is a quiet architectural win worth naming.

#### The design

**The answer shape the brief predicted is correct, and the estate is unusually well placed to execute it: MCP is the common denominator, and the repo ships its own config — emitted, not typed.**

`BOOTSTRAP.md:91` already ranked the client-side config snippet as "the *cheapest* missing piece, because the manifest knows the tool names and the env ledger knows the command, args, and entrypoint." **Both inputs now exist and are both byte-gated.** So:

**`lake exe emitagents`** emits, from `cas-tools.json` + `ENVIRONMENT.json`, all four config files plus a setup document, byte-gated into `check:cas` on the existing `Gate.main` skeleton, using the `Cas.Values.Markdown` carrier that already exists:

- `.mcp.json` — `mcpServers.cas`, command built from `${CLAUDE_PROJECT_DIR}`;
- `.codex/config.toml` — `[mcp_servers.cas]` with a real `cwd`;
- `opencode.json` — `mcp.cas`, `type: "local"`, `command` array, `cwd`;
- `.vscode/mcp.json` — `servers.cas`, `${workspaceFolder}`;
- `mcp/SETUP.md` — the four snippets, the trust-gate note per client, and **the generated OWED list** `BOOTSTRAP.md:93` specifies.

Four small files that do not conflict. `AGENTS.md` carries the one bootstrap command, which is the only cross-agent convention that actually exists.

**The workdir dividend, which is real and worth naming.** Working directory is the least portable thing across the five clients — Claude Code has no `cwd` key at all. The estate does not need one: `cas` resolves its store by `--store` flag → `CAS_STORE` env → **walk-up discovery of a `.cas` directory** (`bin/cli/store.ts:4-8`). The estate's own store discovery already solves the problem that has no portable config answer. That is not marketing; it is a design decision that happens to pay here.

**pi gets the CLI, not a fake MCP row.** pi's doctrine is "build CLI tools with READMEs (see Skills)". `cas` is a real command whose help carries the everyday register seeded from `VOCABULARY.md` (`bin/cas.ts:22-40`) and which has a `--wizard` walk-through on every verb. The estate's pi integration is a skill/extension pointing at that binary. **Do not claim MCP support pi does not have.** This costs nothing extra because the CLI already exists — which is itself the dividend.

#### The consumer bar, and the gaps against it

Target: *git clone → one command → any of the five agents operates the store with zero tribal knowledge.*

Honest status: **four of five, minus one approval click, minus a toolchain.** Every client except pi has a per-project or per-server trust gate, so "one command" is always "one command plus one approval" — except Claude Code non-interactive, which loads silently. State it; do not engineer around it.

Named gaps:

1. **HTTP transport** (FE-B4) — required for the browser, and for any remote agent.
2. **Auth for remote** (FE-B8) — `credentialEnv` has no checker. Recommendation: the HTTP host **refuses** credentialed stores exactly as stdio does, until a remote deployment exists. Refusing is the estate's idiom; pretending is not.
3. **Distribution** (FE-B6) — `private: true` + bun shebang. "One command" currently presupposes the repo, bun, and mise.
4. **The code-mode register's sandbox tier** (decision 16) — and here the honest answer is that **the question is not containment.** `cas_run`'s document *structurally cannot* spell a load or a literal address; both are pinned by theorems (`RunRef.ofPRef_lit`, `RunInstruction.ofPLine_load`, `Cas/Backend/Mcp.lean:33-38`). The current surface is already the narrowest possible sandbox. The code-mode question is about **expressiveness** — how much program a client may submit — and the containment answer is unchanged either way, because **the gates carry all trust** (R15) and admission is at `put`. There is no second sandbox to build. There is a fragment to grow.
5. **Protocol currency** — the offered revisions predate the 2026-07-28 spec.

---

### 5. Question 4 — THE LANGUAGE'S CAPABILITY DIVIDEND

The marketing-truth inventory. **Only claims a gate or a theorem backs.**

**BACKED — say these.**

1. **"An agent cannot corrupt the store."** Every write goes through admission; the address is derived from the bytes *before* the seam is reached; a backend cannot weaken the store's invariants (`src/cas/Backend.ts`); `Graph.verify` recomputes every address itself rather than trusting the store (`bin/cli/store.ts:283-287`); `PathReader` treats the serving host as untrusted **by construction** and surfaces corruption as a typed refusal, never as served bytes (`PathReader.ts:9-14`). The precise claim: a hostile or buggy agent can be **refused**, and can waste bytes, but cannot make the store answer content that does not hash to its name. Generic tools cannot say this because they have no name derived from the content.

2. **"The tool table is emitted, and the host refuses to start if it drifts."** `cas-tools.json` is generated by `lake exe mcpspec` from `Cas/Backend/Mcp.lean` and byte-gated (`mise.toml:106-109`, `:160`). The host reads the emitted manifest and asserts agreement with its served table **before the transport is constructed** (`bin/mcp/server.ts:138-160`, "a host that would answer `tools/list` with a table the estate did not emit must never reach `initialize`"). This is the strongest single differentiator in the report: every other agent-integration story ships a README and hopes.

3. **"The manifest's params and results are the same codes as everything else."** The node wire shape is **reused** from the conformance-vector format — "one node document across vectors, replay, and MCP; no second spelling" (`Mcp.lean:17-19`). A consumer that learns one document has learned all three.

4. **"The envelope answers 'what will this do' before it runs."** `Cas.Lang.Envelope` is computed from the table alone; `ProgProse` verbalizes it, and it is "a **projection**, not a generation … the byte gate over the generated programs checks it for free" (`ProgProse.lean:6-14`). The limit is stated *in the same file* and must be carried into any claim: puts are numbered as puts, not as lines; an individual reference's operand is not recoverable, so the prose states expected kinds without pairing them (`ProgProse.lean:23-35`). That self-limiting honesty is itself the product.

5. **"Refusals carry their clause."** Every refusal names the store law it broke (`bin/cas.ts:31`), and the refusal family is closed, which is what makes the "I cannot show you this" rendering exhaustive rather than a fallback (W-S2).

6. **"The setup is self-describing."** `ENVIRONMENT.json` carries tasks with `inChain`, the pin split, excluded gates, and the `leanExes` ↔ driving-task ↔ gating-check **join**, with `undriven`/`ungated` arrays. `BOOTSTRAP.md:95`'s acceptance is met for (a)–(d) today. It is **not** met for (e) — "what is not implemented" is written down nowhere — and the ledger is missing `check:workbench` (FE-B2). So the claim is *"nearly true, and measurably so"*, which is stronger than a slogan because the shortfall is itself a field.

**NOT YET BACKED — do not say these.**

7. **"Words are receipts / your history is the store."** True of the model; **false of the running system**. `cas_run`'s reply is the word for *that call* and nothing persists it; there is no `since`. Until FE-B5 closes, the estate cannot hand a user their own history. This is the largest gap between the vision's prose and the shipped substrate.
8. **"Plain-language projections as agent context."** E3 dispatched; E5 blocked on E4 (`PLAIN-LANGUAGE.md:191`). The theorem literature's source *drops the literature* — `documented` is recorded as a boolean and the docstring text never reaches the ledger (`PLAIN-LANGUAGE.md:11`).
9. **"AGENTS.md as gated projection."** Designed (`BOOTSTRAP.md:51-66`), blocked on the accepted-list ruling. Measured today: 9 forward + 8 reverse violations of the spec ledger's own maintenance law.
10. **"Programs are content."** `encodeProg_wf` is proved, but the table-level decoder `Word → Option PProg` and its round trip are owed, and `decodeLine_encodeLine` is ROLLED BACK. A stored program is **write-only** today (`11-api-contract.md:118-124`). "Programs are content" reads as if it already round-trips. It does not.

---

### 6. Aesthetics and the design language

#### The grounding

**Paper** is the inspiration for the UX semantics of human-driven AI authorship (`VISION.md:20-21`). **Linear** is the views pillar: "order comes from the DAG … linear-ness is the VIEWS, UI, and tooling built on top" (`VISION.md:35-38`). Both were deferred behind substrate completeness; the operator is calling time.

#### The design language, in four rules — and three of them are already *derived*, not chosen

**1. Reading the estate should feel like reading a book, and this is mechanical, not a mood.**
The emitted Markdown surfaces — `REGISTRY.md`, the lift manifest doc, the owed `LITERATURE.md` — are **first-class UI content**, not documentation links. The default surface for a described kind is its **prose projection**; the structured view is the second click. That inverts the usual arrangement (data first, docs elsewhere), and it is what "Paper-grade" means concretely here. The estate already ships prose as a byte-gated projection and it already reads well (`PLAIN-LANGUAGE.md:231`).

**2. Hue is reserved for verdicts. One saturated colour in the whole product, spent on `owed`.**
This decision is already made and recorded in the workbench's own stylesheet, with its reasoning (`experiments/workbench/src/styles.css:1-13`): "spending it in a skeleton stylesheet would quietly settle a decision that belongs to whoever designs the verdict surface." Keep it. The estate's only irreducible signal is *refused / owed / held*, and it is the only thing that has earned colour.

**3. Density is derived from `VOCABULARY.md`, not designed.**
Exactly two levels of resolution, and the boundary between them is the everyday/protocol register split. "That document's consumer-gating rule — *a term enters the everyday register only when a verb needs it* — is the collapse rule, applied to pixels instead of help text" (`10-workbench-requirements.md:113-119`). Falsifiable: the row count of a collapsed transcript equals the count of bindings whose sort is in the everyday register. **This is the single strongest "our language gives us the UI" claim available, and it is already written down.** With it come: uniform fixed-height rows with variability in fixed-width gutters (W-D2), exactly three gestures — expand, focus, descend (W-D3), a filter predicate rather than a slider, reconstructible from the URL (W-D4).

**4. Refuse the graph view.** It replaces a proved carrier (a list, whose order is the semantics) with an unproved picture; it cannot satisfy "completed rows never re-render" because a grow-only store reflows a force layout on every put; and what people want from it is slots (c) and (d) of the four-slot detail view, rendered as lists in admission order (`10-workbench-requirements.md:539-556`). Hold the line.

#### The five seats applied to a component

Per S5 (`library/cas/SCHEMA-MATERIALIZATION.md:23-31`), a component is judged from all five at once:

- **USING** — the component speaks the everyday register. No protocol word appears until a verb summons it. This is rule 3 above, and it is testable by grep of UI strings.
- **PROGRAMMING** — the component is a `defineView<Model, Message, ViewInputs>`; **`ViewInputs` is its public API** and is judged as a public name, not as an implementation detail.
- **READING** — the component's source is generated with fixed layout under a `Style` value, "no width-adaptive grouping, ever — stable bytes and stable diffs are the point" (`Ts.lean:8-13`). A component diff therefore tells you a *kind* changed. It can never tell you a hand slipped.
- **PROMPTING** — an LLM authoring UI reads `components.json` and gets the same vocabulary an agent gets from `cas-tools.json`. This is the ruled "teach others to speak ours", made mechanical rather than aspirational.
- **COMPUTING** — the view is a pure function of the model, and foldkit's `Story` and `Scene` run it with **no DOM** (`vitest.config.ts`, and the workbench's two test files). Every component is testable at the same seam the update loop is. A generated component arrives with its testability already established.

#### Small commitments worth making now

One measure for prose (62ch, already declared); monospace confined to addresses and machine fields; the address chip constant-width with **full 64-hex on copy, never the abbreviation** (W-A1); **no motion except in-flight operations** — "determinism of the answer does not license invisibility of the spend" (`10-workbench-requirements.md:265-270`); and where the model computes nothing, render `—`, never `0`.

---

### 7. Ruling asks

1. **rc.112.** Move `library/effects` (and `@effect/sql-sqlite-bun`) to `effect@4.0.0-rc.112` and record it in `sources.lock.json`. Closes C6, unlocks foldkit's exact peer **and** `@effect/sql-sqlite-wasm@4.0.0-rc.112` in one act. *Recommended.* Nothing foldkit-shaped can proceed before this.
2. **Browser store tier.** Rule tier 1 (read-only `PathReader` over `fetch`) as v0; gate tier 2 (sqlite-wasm/OPFS write authority) behind its own ruling, because it is a second admission authority. *Recommended: yes.*
3. **Transport split.** One tool table, two transports (stdio + Streamable HTTP), both behind the same boot-time manifest gate; cas-http/0 stays the byte plane for bulk reads and sync (§6/§7). *Recommended.*
4. **Auth over HTTP.** The HTTP host refuses credentialed stores exactly as stdio does (`server.ts:92-109`) until a remote deployment exists. *Recommended: refuse first.*
5. **`cas_word`.** Commission the one addition — `WordE.since`, `WordSig`, and its three theorems (`since_suffix`, `since_cas_agrees`, `stepWorded_preserves_wf`) — per `11-api-contract.md:454-503`. Without it, every screen the requirements document specifies is unbuildable. *Recommended: yes; it is the front end's true blocker.*
6. **Ts fragment growth.** One additive `Decl` arm: an N-parameter arrow with an expression body. R6's consumer test is met. *Recommended: yes.*
7. **The generated/authored UI split.** Ratify `BOOTSTRAP.md:51-66`'s discipline for components: emit the structure (fields, order, kinds, edges, tag dispatch); author the presentation; a generated viewer is the truthful default and an authored one is a registered override, never a fork.
8. **Emitted agent configs.** All four client configs emitted and byte-gated from `cas-tools.json` + `ENVIRONMENT.json`; pi gets a CLI skill, not a fabricated MCP row.
9. **`check:workbench` + the ledger.** Commit the `mise.toml` wiring and regenerate `ENVIRONMENT.json` in the **same** change, or `check:cas` goes red.
10. **Protocol currency.** Does the host add MCP revision `2026-07-28` (stateless, `server/discover`, no session id), or declare the 2025-11-25 ceiling as a stated pin?
11. **Distribution.** Is "one command" allowed to presuppose the repo + bun + mise (recommended, and honest), or is a published package in scope? The latter makes `private: true` and the bun shebang the work.

---

### 8. The one slice to commission first

**FE-1 — `lake exe emitagents`: the four client configs, the setup document, and the emitted OWED list.**

*Chosen against the component emitter on purpose.* The front end cannot compile against foldkit until rc.112 lands (FE-B1), and the component emitter additionally needs rulings 6 and 7. FE-1 needs **no ruling but 8**, has **both** its inputs already emitted and byte-gated, rides the existing `Gate.main` skeleton and the `Cas.Values.Markdown` carrier, and closes the last unchecked item of `BOOTSTRAP.md §4` — the section the brief correctly identifies as question 4's actual spec.

**Exact scope.** A new `library/cas/tools/EmitAgents.lean` on the `EnvLedger` spine, `repoRoot` discipline unchanged. Inputs: `Cas.Backend.Mcp.tools` (names, params, descriptions) and the env ledger's entrypoint facts. Outputs, all byte-gated into `check:cas`: `.mcp.json`, `.codex/config.toml`, `opencode.json`, `.vscode/mcp.json`, and `mcp/SETUP.md` — the last carrying, per client, the trust-gate sentence, and carrying a **generated OWED list**: no HTTP transport, no credential check, no `cas_word`, no first-party pi path, protocol revisions offered. A `--self-test` with one planted defect per rule.

**Done means:** `git clone` → the documented bootstrap command → Claude Code, Codex, opencode, and VS Code each operate the store; the OWED list *names* what is missing rather than leaving it to be discovered; and a hand edit to any of the five files is a red gate.

**And immediately after it, FE-2 — `EmitView` over the kind-tag registry:** one generated read-only viewer per described kind, dispatched on `kindTags.ts`, rendered in the workbench, with `components.json` emitted as the second surface from the same described value. That is the ruled direction's smallest honest proof. It needs rulings 1, 6, and 7 first — which is exactly why it is second and not first.

---

**A closing note on scope, since the brief asked for adversarial pressure.** Three things in this space will present themselves as the front end and are not: a graph view of the DAG (refused, with reasons, above); server-side rendering (buys nothing when the server is the user's own laptop); and a browser that *writes*. The front end that is actually owed is a reader of files the estate already emits, plus one operation the estate does not yet have. The substrate is the product. The front end is its projection — and the honest measure of the projection is that almost nothing in it should have to be typed by hand.
