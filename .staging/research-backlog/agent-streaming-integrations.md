# First-class agent-streaming integrations — the landscape, pi as prior art, and the estate's translation

Status: operator-directed backlog research, 2026-08-29
([SPECS.md](../../docs/SPECS.md) decision 31(a): "FIRST-CLASS AGENT-STREAMING
INTEGRATIONS commissioned — the protocols landscape studied and a design
sketched on the daemon/host's actual surfaces; pi dev and its extension system
studied as tier-one harness prior art"). Not dispatched. Pre-grade: nothing here
is ratified, nothing here mints an abstraction, and every recommendation is
written as an ask the operator rules on (§6).

**Pinned implementation companion.** [Multica daemon streaming — recovered
RFC, failure semantics, and Foldlab lessons](MULTICA-DAEMON-STREAMING.md)
tests this landscape against one exact production harness revision: daemon
control WebSockets, local agent streams, liveness, buffering, disconnect,
transcript durability, and the resulting Foldlab ruling packet.

**Register.** This is conception mode (C3). External claims carry a URL and the
date they were read (C6); anything I could not resolve to a primary source is
marked **PENDING** in place. Estate claims carry `file:line` or a branch-
qualified path. No claim here is stamped above G0.

**The ground it stands on.** The serving plane's operational law
([`docs/lab-core/SERVING.md`](../../docs/lab-core/SERVING.md) on
`merge/daemon-spine`, decision 26 seat 1); the wire profile
([`library/effects/PROFILE-CAS-HTTP-0.md`](../../library/effects/PROFILE-CAS-HTTP-0.md));
the BYOA matrix and the pi ruling
([FRONTEND.md §4](../operational-structure/FRONTEND.md), lines 186-232); the
word's own contract
([`.staging/paper-notes/11-api-contract.md`](../paper-notes/11-api-contract.md),
lines 29-66 and 454-503) and the workbench requirements
([`10-workbench-requirements.md`](../paper-notes/10-workbench-requirements.md));
and decisions **2** (no new abstractions — the standing constraint every
recommendation here is audited against, §3.5), 4 (order is identity), 16
(code-mode register), 17 (services architecture), 18 (the register IS a
signature), 20 (the telemetry and logging hoovers), 26 seats 1 and 3, 31, and
32 (the daemon's three releases).

**Contents.** §1 pi as prior art — identification, architecture, the extension
system, sessions, skills and packages, the three machine surfaces, **the binary
session protocol nobody wrote up (§1.7)**, telemetry, reception. §2 the protocol
landscape — MCP and what is next at spec level, who actually consumes MCP, ACP,
AG-UI, the vendor SDKs, A2A, and the comparison table (§2.7). §3 the estate
design sketch — the daemon's real surfaces, *the word streamed live* assessed,
what "first-class integration" decomposes into, the extension posture, and a
decision-2 audit. §4 the ranked borrow list. §5 refusals. §6 ruling asks.
§7 two record observations.

**Provenance of this pass.** §1 was written by an earlier, interrupted pass and
is inherited. It was checked rather than trusted: its pi quotations verify, but
its citation paths did not resolve (there is no top-level `docs/` in the
repository) and its package table was missing the three packages this
commission is actually about. Both are corrected in place, with the correction
stated rather than silently applied — §1.0 and §1.1. §2 through §7 are new.

**One honesty note that governs the whole document.** `cas daemon` is **not on
`main`**. `main` carries `bin/mcp/server.ts` (stdio) and the transport-free
`src/server/{Core,HttpApp,Protocol}.ts` that no verb serves; the daemon verb,
the `/mcp` HTTP bind, `/metrics`, and `/projections` live on
`merge/daemon-spine`, two commits ahead (`git rev-list --count
main..merge/daemon-spine` = 2, verified 2026-08-29). Everything in §3 that
speaks of "the daemon" speaks of that branch.

---

## 1. pi dev — what it actually is, and what is genuinely good in it

### 1.0 Identification and provenance

"pi dev" is **pi**, the terminal coding agent and agent toolkit by Mario
Zechner (`badlogic`), published by Earendil Inc. under MIT. It is *not*
Inflection's consumer Pi. Repository facts, read from the GitHub API on
2026-08-29 (`https://api.github.com/repos/badlogic/pi-mono`, which resolves to
the renamed repository):

| Fact | Value |
|---|---|
| Canonical name | `earendil-works/pi` (the `badlogic/pi-mono` path still resolves) |
| Description | "AI agent toolkit: unified LLM API, agent loop, TUI, coding agent CLI" |
| License | MIT |
| Created / last push | 2025-08-09 / 2026-08-29 |
| Stars / forks / open issues | 99,128 / 12,295 / 138 (read-time values; they moved within the day — 99,089 / 12,287 / 137 earlier on 2026-08-29) |
| Default branch | `main` |

Armin Ronacher (Flask; Earendil co-founder) wrote the best short account of the
design in "Pi: The Minimal Agent Within OpenClaw", 2026-01-31
(https://lucumr.pocoo.org/2026/1/31/pi/, accessed 2026-08-29): "It has the
shortest system prompt of any agent that I'm aware of and it only has four
tools: Read, Write, Edit, Bash." Treat blog-tier star counts and package names
in the wider write-ups as stale; the API and the repo docs are the sources used
below.

Docs read for this section, all raw from `main` on 2026-08-29. **The path
prefix matters and an earlier pass of this note got it wrong:** there is no
top-level `docs/` in the repository (verified against the recursive tree API,
`https://api.github.com/repos/earendil-works/pi/git/trees/main?recursive=1`,
2026-08-29 — `raw.githubusercontent.com/.../main/docs/json.md` returns 404).
The coding agent's manual lives under `packages/coding-agent/docs/`:
`index.md`, `extensions.md`, `sdk.md`, `rpc.md`, `json.md`,
`session-format.md`, `sessions.md`, `skills.md`, `packages.md`,
`security.md`. Package-level docs read: `packages/coding-agent/README.md`,
`packages/telemetry/README.md`, `packages/protocol/README.md`,
`packages/server/README.md`, `packages/client/README.md`,
`packages/agent/README.md`, `packages/tui/README.md`, `packages/ai/README.md`.
Prefix throughout:
`https://raw.githubusercontent.com/earendil-works/pi/main/<path>`
(the `badlogic/pi-mono` owner path 301-redirects at the API and resolves at
raw only for paths that still exist).

### 1.1 The architecture, in the shape the estate cares about

**TEN npm workspace packages**, not five. An earlier pass of this note read the
coding agent's own manual and inferred the workspace from it; the workspace
itself, enumerated from the tree API
(`https://api.github.com/repos/earendil-works/pi/git/trees/main?recursive=1`,
accessed 2026-08-29), is:

| Package | What it owns |
|---|---|
| `@earendil-works/pi-ai` | unified multi-provider LLM API, auth resolution, cost tracking, cross-provider handoff |
| `@earendil-works/pi-agent-core` (`packages/agent`) | the agent runtime: "Stateful agent with tool execution and event streaming" |
| `@earendil-works/pi-coding-agent` | the interactive CLI, extensions, skills, sessions |
| `@earendil-works/pi-tui` | terminal UI library with **differential rendering** |
| `@earendil-works/pi-telemetry` | vendor-neutral telemetry **contract**, with schemas and an adapter conformance suite |
| **`@earendil-works/pi-protocol`** | **a versioned binary wire protocol: CBOR + length-prefix framing** (§1.7) |
| **`@earendil-works/pi-server`** | **`PiServer`, a session server over pluggable transport listeners** (§1.7) |
| **`@earendil-works/pi-client`** | **a transport-neutral remote-session client with leases** (§1.7) |
| `packages/session-backends` | session storage backends split out of the core (e.g. `pi-session-backend-sqlite-node`), so the runtime pulls no native SQLite by default |
| `packages/evals` | evaluation harness |

The layering is the point: the agent loop does not know about the terminal, the
terminal does not know about the provider, the telemetry contract knows about
none of them, and — the fact that matters most for decision 31(a) — **the wire
protocol knows about none of them either**. A harness that wants only the loop
takes `pi-agent-core`; a harness that wants only the wire takes `pi-protocol`.

**Why the correction matters, not just that it happened.** The three packages an
earlier pass missed are precisely the subject of this commission. Reading the
coding agent's manual and stopping there yields the conclusion "pi's machine
surfaces are NDJSON over stdio" (§1.6) — true, and incomplete. pi *also* has a
second, binary, versioned, transport-neutral protocol with a conformance
harness, and it is the closest external object to `cas-http/0` that this survey
found anywhere, in any of the protocols of §2.

### 1.2 The renunciation table — the design document is a list of what is absent

From `packages/coding-agent/README.md` (accessed 2026-08-29), pi publishes what
it does **not** have alongside the alternative for each:

| Absent feature | pi's stated alternative |
|---|---|
| MCP integration | build CLI tools with READMEs, or write an extension |
| Sub-agents | spawn instances via tmux, or build with extensions |
| Plan mode | write to files, or build with extensions |
| Built-in todos | `TODO.md`, or a custom implementation |
| Permission popups | run containerized, or implement confirmation flows |
| Background bash | tmux, for full observability |

Stated rationale: "Pi is aggressively extensible so it doesn't have to dictate
your workflow" (same README). The MCP row is the one the estate's BYOA matrix
already rules against
([FRONTEND.md:220](../operational-structure/FRONTEND.md)) — **pi gets the CLI,
not a fake MCP row** — and the primary source confirms that ruling was correct.
The token-cost argument attributed to Zechner (a Playwright MCP server costing
~13.7k tokens of system prompt merely by being connected) appears only in
secondary write-ups; **PENDING** as to an exact primary citation, but the
direction is corroborated by the README's own "build CLI tools with READMEs"
row and by the progressive-disclosure design of skills (§1.5).

**The estate reading.** A published renunciation table with an alternative in
every row is the same instrument as the estate's refusal families: the surface
tells you what it will not do *and* names the clause. This is a documentation
form worth stealing outright (§4, borrow 5).

### 1.3 The extension system — the real study

Discovery is by trusted location, not by registry
(`packages/coding-agent/docs/extensions.md`, accessed 2026-08-29):

| Location | Scope |
|---|---|
| `~/.pi/agent/extensions/*.ts` | global |
| `~/.pi/agent/extensions/*/index.ts` | global, multi-file |
| `.pi/extensions/*.ts` | project-local |
| `.pi/extensions/*/index.ts` | project-local, multi-file |

Plus `extensions` and `packages` fields in `settings.json`. **Project-local
extensions load only after project trust is established** — the trust gate
precedes code execution, which is the same posture as the four MCP clients in
the BYOA matrix.

An extension is a TypeScript module with a default-exported factory taking one
argument:

```typescript
export default function (pi: ExtensionAPI) { /* sync or async */ }
```

Loaded through `jiti`, so TypeScript runs uncompiled. Multi-file extensions get
a directory and an `index.ts`; npm dependencies go in a sibling `package.json`
under `dependencies`.

**The `ExtensionAPI` surface**, grouped (all names verbatim from
`packages/coding-agent/docs/extensions.md`, accessed 2026-08-29):

- *Registration:* `pi.registerTool(definition)`, `pi.registerCommand(name,
  options)` (slash commands; collisions get numeric suffixes `/review:1`,
  `/review:2`), `pi.registerShortcut(shortcut, options)`, `pi.registerFlag(name,
  options)` / `pi.getFlag(name)`, `pi.registerProvider(name, config)` /
  `pi.unregisterProvider(name)`, `pi.registerMessageRenderer`,
  `pi.registerEntryRenderer`, `pi.registerMarkdownTransformer`.
- *Session writing:* `pi.sendMessage`, `pi.sendUserMessage` (delivery mode
  `steer` | `followUp` | `nextTurn`), `pi.appendEntry(customType, data?)`
  (persisted, **not** LLM-visible), `pi.setLabel(entryId, label)`,
  `pi.setSessionName` / `pi.getSessionName`.
- *Model and tool control:* `pi.setModel`, `pi.getThinkingLevel` /
  `pi.setThinkingLevel`, `pi.getActiveTools` / `pi.getAllTools` /
  `pi.setActiveTools(names)`, `pi.exec`, `pi.events` (an inter-extension bus).

A registered tool is a record, not a class: `name`, `label`, `description`,
`promptSnippet`, `promptGuidelines`, `parameters` (a **Typebox** schema),
`prepareArguments(args)` (an argument-migration shim), `execute(toolCallId,
params, signal, onUpdate, ctx)`, and two optional renderers `renderCall` /
`renderResult` plus `renderShell: "self"`. Built-in tools (`read`, `bash`,
`powershell`, `edit`, `write`, `grep`, `find`, `ls`) are overridable by
registering the same name, with **per-slot renderer inheritance** and an exact
result-shape obligation.

**The hook set is the deepest part of the design.** `pi.on(event, handler)`
receives `(event, ctx)` and the *return value is the control channel*. Named
events, verbatim:

- lifecycle: `project_trust` (returns `{ trusted: "yes"|"no"|"undecided",
  remember? }`), `resources_discover` (returns `{ skillPaths?, promptPaths?,
  themePaths? }`), `session_start`, `session_info_changed`,
  `session_before_switch` (`{ cancel: true }`), `session_before_fork`,
  `session_shutdown`;
- compaction: `session_before_compact` (may supply the summary),
  `session_compact`, `session_compact_failed`;
- tree: `session_before_tree`, `session_tree`;
- agent: `before_agent_start` (returns `{ message?, systemPrompt? }`),
  `agent_start`, `agent_end`, `agent_settled`, `turn_start`, `turn_end`,
  `message_start`, `message_update`, `message_end` (may *replace* the finalized
  message), `context` (may rewrite the message list before each LLM call);
- tools: `tool_call` (**may block**: `{ block: true, reason?, terminate? }`, and
  `event.input` is mutable), `tool_execution_start` / `_update` / `_end`,
  `tool_result` (returns a partial patch `{ content?, details?, isError?,
  usage? }`, chained across handlers);
- provider: `before_provider_headers` (mutate `event.headers` in place),
  `before_provider_request` (inspect or replace `event.payload`),
  `after_provider_response`, `model_select`, `thinking_level_select`;
- input: `input` (returns `{ action: "continue"|"transform"|"handled", text?,
  images? }`), `user_bash`;
- UI: `ui_prompt_start` / `ui_prompt_end`.

Command handlers additionally get `ExtensionCommandContext`: `ctx.waitForIdle()`,
`ctx.newSession()`, `ctx.fork(entryId, { position: "before"|"at" })`,
`ctx.navigateTree(targetId)`, `ctx.switchSession(path)`, `ctx.reload()`,
`ctx.compact()`, `ctx.getSystemPrompt()` / `ctx.getSystemPromptOptions()`, a
`ctx.ui` with `select` / `confirm` / `input` / `editor` / `custom` and
fire-and-forget `notify` / `setStatus` / `setWidget` / `setTitle`, and the
run-mode discriminant **`ctx.mode: "tui" | "rpc" | "json" | "print"`**.

**What is genuinely good here, named as mechanisms:**

1. **The hook return type is the permission system.** pi has no permission
   popups; it has `tool_call` returning `{ block: true, reason }`. Policy is a
   *value returned by a handler*, not a subsystem. That is exactly the estate's
   "refusal is a value" posture applied to a harness.
2. **One discriminant for every run mode.** `ctx.mode` and `ctx.hasUI` mean an
   extension written once behaves correctly headless. The estate's equivalent
   question — "the same handler, on stdio and on HTTP" — is already answered the
   same way (SERVING: "the same five tools the stdio host serves, same
   handlers, same manifest gate"), and pi shows the pattern extends to the
   *extension* layer, not just the transport layer.
3. **Trust precedes load, and is itself a hook.** `project_trust` fires with
   only user-global and CLI extensions participating; project-local code cannot
   vote on whether project-local code is trusted. That ordering is the whole
   security design, in one sentence.
4. **Schema-first tool declaration with a migration shim.** `parameters` is a
   Typebox schema and `prepareArguments` is the *declared* place where an old
   call shape is repaired without changing the published definition. The estate
   emits schema codes for exactly this surface (`cas-tools.json` carries
   `params`/`result` as `Cas.Schema.Ast` codes) and has **no** analogue of
   `prepareArguments`. Worth noting as a gap, not yet as a want.
5. **`appendEntry` — persisted, non-LLM-visible session state.** Extensions get
   durable storage *inside the session record* that the model never reads. This
   is the harness form of "the word is strictly more information than the
   store".

### 1.4 Sessions: a tree in one JSONL file

From `packages/coding-agent/docs/session-format.md` and `.../sessions.md` (accessed 2026-08-29):
sessions live at
`~/.pi/agent/sessions/--<path-with-slashes-as-hyphens>--/<timestamp>_<uuid>.jsonl`.
Line one is a `SessionHeader`:

```json
{"type":"session","version":3,"id":"uuid","timestamp":"...","cwd":"/path"}
```

Every later entry extends `SessionEntryBase` with `type`, `id` (8 hex chars),
`parentId` (null at the root), `timestamp` — so **the session is a tree, in one
append-only file, with in-place branching**. Entry types include
`SessionMessageEntry`, `ModelChangeEntry`, `ThinkingLevelChangeEntry`,
`BranchSummaryEntry`, `LabelEntry`, `SessionInfoEntry`, `CompactionEntry`
(carrying `retainedTail` or `firstKeptEntryId`), `CustomEntry` (extension state,
excluded from LLM context) and `CustomMessageEntry` (extension content, included).
The header's `version` field is a real migration spine: v1 linear → v2
`id`/`parentId` tree → v3 unified `custom` naming, with older files
auto-migrated on load.

`/fork <path|id>` writes a new file; `/clone` duplicates the active branch;
`/tree` navigates alternatives **within** the file; abandoned branches may be
summarized rather than replayed.

**The estate reading.** This is the closest external object to `cas_word`: an
append-only, parent-linked, versioned record of everything that happened, where
history is a first-class navigable structure rather than a scrollback buffer.
pi persists it as a JSONL tree; the estate's version is a *word* whose
denotation lives in Lean and whose reading is an operation of a signature
(`.staging/paper-notes/11-api-contract.md:454-503`). The estate's is stronger
and unbuilt; pi's is weaker and shipping. The lesson to take is not the format —
it is that **the branch structure, the labels, and the compaction record are all
entries in the same log**, so there is exactly one thing to serve.

### 1.5 Skills and packages — discovery without a registry

Skills (`packages/coding-agent/docs/skills.md`, accessed 2026-08-29) are directories with a `SKILL.md`
carrying YAML frontmatter: required `name` (≤64 chars, `[a-z0-9-]`) and
`description` (≤1024 chars, "what the skill does and when to use it"); optional
`license`, `compatibility`, `metadata`, `allowed-tools`,
`disable-model-invocation`. Discovery scans `~/.pi/agent/skills/`,
`~/.agents/skills/`, `.pi/skills/`, `.agents/skills/`, package `skills/`
directories, and `--skill <path>`. **Progressive disclosure is the mechanism:**
"At startup, pi scans skill locations and extracts names and descriptions";
those summaries go into the system prompt as XML, and the full `SKILL.md` is
loaded by the model *using the ordinary `read` tool* when a task matches. There
is no skill-loading API — the agent reads a file.

Packages (`packages/coding-agent/docs/packages.md`, accessed 2026-08-29) are the distribution unit:
`npm:@scope/pkg@1.2.3`, `git:github.com/user/repo@v1`, or a local path, listed
in `settings.json` under `packages`, installed to `~/.pi/agent/npm|git/` or
`.pi/npm|git/`. The manifest is a `pi` key in an ordinary `package.json`:

```json
{ "pi": { "extensions": ["./extensions"], "skills": ["./skills"],
          "prompts": ["./prompts"], "themes": ["./themes"] } }
```

with convention-based auto-discovery when the key is absent, and a `pi-package`
npm keyword for gallery discoverability. Commands: `pi install`, `pi install -e`
(temporary trial), `pi remove`, `pi update --extensions`. The trust statement is
blunt and printed in the docs: "Pi packages run with full system access.
Extensions execute arbitrary code, and skills can instruct the model to perform
any action including running executables."

**The estate reading.** pi's package system is *npm plus a manifest key plus a
convention*. It invents no registry, no signing, no capability model — and says
so. The estate cannot copy the trust posture (our gates carry all trust, and an
extension executing arbitrary code in the host is precisely what the gates do
not cover), but it can copy the **shape**: a manifest row inside an artifact
that already exists, plus convention-based discovery, plus an explicit printed
trust statement. See §3.4.

### 1.6 The three machine surfaces: `--mode json`, `--mode rpc`, and the SDK

This is the part of pi most directly relevant to decision 31(a).

**`pi --mode json "prompt"`** (`packages/coding-agent/docs/json.md`, accessed 2026-08-29) emits
**NDJSON**, one complete object per line, beginning with a versioned session
header and then the agent event stream:

```json
{"type":"session","version":3,"id":"uuid","timestamp":"...","cwd":"/path"}
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"assistant","content":[],...}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{...}}
{"type":"turn_end","message":{...},"toolResults":[]}
{"type":"agent_end","messages":[...]}
```

The documented discipline that matters: "`message_update` records are
delta-only. They omit both the cumulative `message` field and
`assistantMessageEvent.partial`" — the stream is a **delta stream with a
declared reconstruction rule** (`contentIndex` + `delta`), not a sequence of
growing snapshots. `usage` is cumulative.

**`pi --mode rpc`** (`packages/coding-agent/docs/rpc.md`, accessed 2026-08-29) is the same event
stream plus an inbound command channel, over stdin/stdout, and the framing rule
is stated normatively: "RPC mode uses strict JSONL semantics with LF (`\n`) as
the only record delimiter" — split on `\n` only, strip an optional trailing
`\r`, and **do not use a generic line reader** (Node's `readline` treats Unicode
separators as newlines and would violate the protocol). Commands are tagged
objects: `prompt`, `steer`, `follow_up`, `abort`, `clear_queue`, `new_session`,
`get_state`, `get_messages`, `set_model`, `cycle_model`, `get_available_models`,
`set_thinking_level`, `compact`, `set_auto_compaction`, `set_auto_retry`,
`bash`, `abort_bash`, `get_session_stats`, `export_html`, `switch_session`,
`fork`, `clone`, `get_entries`, `get_tree`, `get_last_assistant_text`,
`set_session_name`, `get_commands`. Every command is acknowledged:

```json
{"type":"response","command":"prompt","success":true,"id":"optional-correlation-id","data":{}}
```

and asynchronous events (`agent_start`, `message_update`, `message_end`,
`tool_execution_start|update|end`, `bash_execution_update`, `queue_update`,
`compaction_start|end`, `auto_retry_start|end`, `agent_settled`) interleave on
the same channel. Human-in-the-loop is a **sub-protocol on the same pipe**:
extensions raise `extension_ui_request` (`method` ∈ `select`, `confirm`,
`input`, `editor`, plus fire-and-forget `notify`, `setStatus`, `setWidget`,
`setTitle`, `set_editor_text`) with an `id` and a `timeout`, and the host
answers `extension_ui_response` with the same `id`. The docs state no explicit
protocol-version field; clients are told to key off response success —
**this is a real weakness and the estate should not copy it** (§5).

**The SDK** (`packages/coding-agent/docs/sdk.md`, accessed 2026-08-29) is `createAgentSession({ model,
thinkingLevel, modelRuntime, tools, customTools, resourceLoader, sessionManager
})` returning an `AgentSession`; consumers attach handlers with
`session.subscribe()` and receive the *same event vocabulary* as the JSON and
RPC modes. `runPrintMode()` and `InteractiveMode` are two wrappers over one
`createAgentSessionRuntime()`. `DefaultResourceLoader` performs the discovery
described in §1.3/§1.5 and is replaceable wholesale — the SDK's seam for
"discover nothing, I will supply the resources" is a constructor argument, not a
flag.

**The single most important structural fact about pi for us:** *one event
vocabulary, four renderings.* TUI, `--mode print`, `--mode json`, `--mode rpc`,
and the SDK's `subscribe()` are all views over the same `AgentEvent` type, and
`ctx.mode` is how an extension knows which one it is in. There is no second
spelling of "a message started". The estate has the identical discipline one
level down — "one node document across vectors, replay, and MCP; no second
spelling" (`Cas/Backend/Mcp.lean:17-19`, cited at
[FRONTEND.md:250](../operational-structure/FRONTEND.md)) — and has *not* yet
extended it to its event/history surface, because that surface does not exist
(FE-B5).

*Five renderings, in fact.* §1.7 adds a sixth consumer of that same session
vocabulary over a **binary** wire, which is where this section's conclusion
actually lands: pi's discipline is not "one event vocabulary, four renderings"
but *one vocabulary, every rendering, including one that is not JSON at all.*

### 1.7 The wire nobody wrote up: `pi-protocol`, `pi-server`, `pi-client`

**This is the section the commission was actually asking for, and it is not in
the coding agent's manual at all.** It is three package READMEs.

#### `@earendil-works/pi-protocol` — a versioned binary session protocol

All quotes verbatim from
`https://raw.githubusercontent.com/earendil-works/pi/main/packages/protocol/README.md`
(accessed 2026-08-29):

- **Framing.** "Protocol version `1` uses binary messages with this wire layout:
  1. A four-byte unsigned big-endian payload length. 2. One definite-length CBOR
  item containing the message." And: "Every transport carries the same complete
  bytes: `[uint32-be CBOR length][CBOR payload]`. Transports may split or
  coalesce those bytes arbitrarily."
- **Handshake.** "The first client message is always `hello`, containing
  `PROTOCOL_VERSION`. Subsequent messages use correlated request/response
  envelopes and server event envelopes."
- **The authority rule — the single most important sentence in the study.**
  "Session and server snapshots are authoritative. Progress events are transient
  UI hints and **must not be reduced into authoritative state**."
- **Auth precedes protocol.** "Transports complete authentication before
  protocol bytes are exchanged." And: "All transports are untrusted. Configure
  matching frame limits and enforce access controls appropriate for the
  transport before exposing a connection to the protocol."
- **A closed codec with an enumerated rejection list.** "`encodeCbor()` and
  `decodeCbor()` implement the protocol's strict RFC 8949 subset." The subset is
  `null`, booleans, finite numbers (integers in the JS safe range, non-integers
  as float64), UTF-8 strings, byte strings, definite-length arrays, and
  definite-length maps with unique string keys. Rejected: "Top-level undefined,
  undefined array entries, sparse arrays, non-finite or unsafe numbers, tags,
  indefinite-length items, malformed UTF-8, trailing data, excessive nesting,
  and oversized values." "All schemas reject unknown object properties."
- **Budgets bound before buffering.** "Default limits are 16 MiB per CBOR
  payload/frame, 1,000,000 array elements or map entries, and 64 nested item
  levels… A frame decoder validates the declared length before buffering payload
  bytes."
- **Errors do not carry the payload.** "Schema violations, malformed CBOR, and
  invalid framing throw `ProtocolValidationError`. Validation errors do not
  retain rejected payloads."
- **Truncation is detectable.** `decoder.end()` is documented as "Call when the
  byte stream closes to detect truncation."
- **And the honest ceiling, printed:** "The protocol is experimental and has no
  compatibility guarantees."

#### `@earendil-works/pi-server` — transport listeners, and a conformance kit

From `packages/server/README.md` (accessed 2026-08-29). The header is a
renunciation of its own: "Experimental. This package is under active development
and may change or be removed without notice."

- `PiServer` "composes transport listeners through the `PiServerListener`
  interface. **Each listener must complete any transport-specific authentication
  and authorization before passing a connection to `PiServer`.**" A WebSocket
  listener validates at the HTTP upgrade; the Unix listener relies on socket
  filesystem permissions.
- The Unix transport is a *submodule*, "keeping the common case concise without
  coupling the primary server to Unix sockets."
- "This package does not provide a standalone CLI or coding-agent service.
  Applications supply the `PiServerService` implementation." Four methods:
  `listSessions`, `listModels`, `createSession`, `openSession`.
- **Durable metadata vs acquired runtime state is a typed distinction.**
  `SessionMetadata` is "the normalized durable metadata available without
  acquiring a session runtime. Only `id` and `createdAt` are required… Runtime
  state such as phase, model, thinking level, attachment, and locking appears
  only in an acquired `SessionSnapshot`." And services "may omit" the optional
  fields — `PiServer` "refreshes available metadata from live snapshots without
  requiring stored sessions to fabricate phase, model, thinking-level,
  attachment, or lock values."
- **A conformance kit for third-party transports.**
  `@earendil-works/pi-server/testing` exports `createTestServer()`,
  `TestServerService`, `ProtocolTestClient`, and "the transport-neutral
  `WireChannel` contract", for "deterministic protocol conformance tests."

#### `@earendil-works/pi-client` — leases, and no optimism

From `packages/client/README.md` (accessed 2026-08-29):

- "Transport-neutral client for remote pi sessions. `PiClient` exchanges
  length-prefixed CBOR messages through a small `ByteTransport` interface. The
  package has no Node-specific imports."
- "`PiClient` **does not reconnect automatically.** Call `reconnect()` after
  disconnection. One connection can attach several sessions. Requests are
  correlated by ID."
- The authority rule again, client-side: "Server snapshots and successful
  response snapshots are authoritative, while **progress events do not mutate
  snapshot state optimistically**."
- **Concurrency is a typed lease, not a convention.** `acquireSession()` returns
  a `SessionLease`; "leases cannot be constructed directly." `{ mode:
  "exclusive" }` for a lifecycle/mutation coordinator, `{ mode: "shared" }` for
  intentional sharing; exclusive acquisition fails with
  `PiSessionOwnershipError` while any lease exists, shared fails while an
  exclusive lease exists. Release semantics are spelled out to the failure case:
  a failed explicit `detach()` "becomes active again for retry"; a failed
  cleanup `dispose()` "reports the protocol error but relinquishes local
  ownership", and the client "reconciles the failed protocol cleanup before the
  next acquisition." Leases implement `AsyncDisposable`.
- Two distinct disconnection errors — `PiDisconnectedError` (transport down) vs
  `PiSessionDetachedError` (connected, but this lease is releasing/released/
  invalidated).
- "Treat peers as untrusted." `maxFrameLength` is configured on both ends and
  the doc says to match them.

#### The estate reading — this is `cas-http/0` with a different payload

Set the two profiles side by side and the correspondence is close enough to be
useful and, in two places, close enough to be a warning.

| Concern | `pi-protocol` v1 | `cas-http/0` |
|---|---|---|
| framing | `[uint32-be length][CBOR]`, fragmentation-tolerant incremental decoder | `4-byte big-endian count N` + `N×32` address bytes for key lists (§4); `content-length` + a running byte counter for bodies (§3) |
| codec discipline | strict RFC 8949 subset, enumerated rejections, unknown properties rejected | "closed binary framing. The framing is the codec; the profile carries no JSON" (§1); "decode fail-closed; a successful decode's input is exactly the canonical encoding of its result" (§4) |
| budget before admission | "validates the declared length before buffering payload bytes" | "The declared `content-length` and a running byte counter bind the decoded budget **before any admission**" (§3) |
| frame cap | 16 MiB default, configurable, matched on both ends | 16 MiB `maxRequestBodySize` on the daemon; the same number as stdio's frame cap, "one clamp discipline" (SERVING) |
| untrusted peer | "All transports are untrusted"; auth completes before protocol bytes | "the serving host [is] untrusted **by construction**" (`PathReader.ts:9-14`); credential per authority, never followed across a redirect (§9) |
| secrets in errors | "Validation errors do not retain rejected payloads" | "structurally absent from errors, reports, decision transcripts, and logs — redaction is by construction, never by filtering" (§9) |
| advisory vs authoritative | "Progress events are transient UI hints and **must not be reduced into authoritative state**" | "Presence answers are **planning data only**: they steer upload scheduling, **admit nothing**, and are never negatively cached" (§6); §13's planned "advisory event plane that never constitutes admission" |
| versioning | `PROTOCOL_VERSION` in `hello`; "experimental and has no compatibility guarantees" | "Endpoints are added to `/0` only additively; any change to the meaning of an existing exchange mints `cas-http/1`" (§0) |
| conformance | `pi-server/testing`: `createTestServer`, `ProtocolTestClient`, `WireChannel` | Lean conformance vectors as "the semantic authority behind every clause"; `ServingDoc.test.ts` re-deriving the operational doc's facts |

Two conclusions fall out of the table, and both are load-bearing for §3.

1. **The estate independently arrived at pi's authority rule, and pi states it
   better.** `cas-http/0` §6 says presence answers admit nothing; §13 plans "an
   advisory event plane that never constitutes admission". pi says the same
   thing as one imperative sentence about *events*: *progress events must not be
   reduced into authoritative state*. That sentence, ported, is the whole safety
   argument for a live word feed (§3.2) — and it is one the estate can make
   *structurally* rather than by instruction, because its authoritative read
   re-digests (`Graph.verify`, `PathReader.ts:9-14`) and an advisory event
   carries no bytes to admit.
2. **The estate's versioning law is the stronger half, and should not be traded
   away for pi's ergonomics.** pi's protocol is one number in a `hello` and a
   printed disclaimer. `cas-http/0` binds the meaning of every exchange to a
   revision and mints `/1` for a semantic change. When §4 recommends borrowing
   pi's shapes, it borrows the *framing and codec discipline*, never the
   versioning posture — the estate's is better and already ratified.

**One gap the table exposes.** pi ships a *conformance kit for third-party
transports* (`WireChannel`, `ProtocolTestClient`). The estate ships conformance
vectors for its *semantics* and `ServingDoc.test.ts` for its *documentation*,
but nothing a third party could run against a `cas-http/0` implementation it
wrote itself. That is a real, named absence — borrow 3 in §4.

### 1.8 `pi-telemetry` — a declared, versioned vocabulary with a conformance suite

`packages/telemetry/README.md` (accessed 2026-08-29) describes a **vendor-neutral
telemetry contract** with these properties:

- The core abstraction is `TelemetryContext`, which "starts a span around a
  callback" and passes a `TelemetrySpan` to it. Adapters must invoke the
  callback synchronously and exactly once, preserve return and rejection
  semantics, keep native spans open until promises settle, treat normal
  completion as success and exceptions as errors unless overridden, and keep
  recording methods "synchronous, passive, and non-throwing."
- There is "no exporter, global current-span state, or dependency on a telemetry
  backend."
- Vocabulary is **declared, closed, and versioned**: `defineTelemetrySchema()` +
  `createTypedSpanStarter()`, spans declaring *start attributes* (known at span
  open, required or optional) and *end attributes* ("completion enrichment …
  may be set at any point while the callback is active, and … may be omitted
  when unavailable"), plus named events with their own attributes. Attribute
  types are `string`/`number`/`boolean` and array forms, with `values` (closed
  sets) and metadata flags `sensitive`, `cardinality`. Each schema carries an
  explicit `version`; a starter composes independently versioned schemas;
  duplicate span names across composed schemas are "rejected at compile time";
  schemas "are not merged, inspected, or retained at runtime."
- **There is a conformance suite for adapters**:
  `@earendil-works/pi-telemetry/testing` exports
  `createTelemetryAdapterConformance()` — "runner-independent conformance
  cases" over a fixture supplying a fresh context and normalized
  `RecordedTelemetrySpan` snapshots, validating synchronous admission, result
  identity, status handling, attribute merging, event ordering,
  post-settlement inertness, and concurrent parentage. Reference
  implementations: `NOOP_TELEMETRY_CONTEXT` and `InMemoryTelemetryContext`.

**Why this is the top borrow.** The estate already runs this pattern on its
*wire* (conformance vectors, the manifest boot gate, `ServingDoc.test.ts`
re-deriving SERVING's factual vocabulary from exported values), and it already
has a telemetry vocabulary that is currently *prose in a table*
(`cas.host.inflight`, `cas.host.calls`, `cas.host.refused`, `cas.store.sql_wait`,
`cas.daemon.request`, `cas.daemon.inflight`, `cas.daemon.rss_bytes`,
`cas.replica.age_ms` — SERVING, "Telemetry"). pi shows the vocabulary itself
being a **declared, versioned, compile-time-checked artifact with an adapter
conformance suite**. That is one step from what the estate does with
`cas-tools.json`, and it is the exact instrument decision 20's telemetry hoover
needs to ingest logs "without guessing."

### 1.9 What the community praises, and what it actually means

Recurring themes in the write-ups (secondary sources; treat as sentiment, not
fact): the four-tool minimalism, the sub-1000-token system prompt, transparency
over every model interaction, and the SDK being the real product. Ronacher's
framing is the sharpest: rather than downloading an extension, "You ask the
agent to extend itself" (https://lucumr.pocoo.org/2026/1/31/pi/, accessed
2026-08-29) — extensions are TypeScript files in a directory that the agent
itself can write, which is why `jiti` (no build step) and hot `ctx.reload()`
matter. **This is the mechanism behind the vibe**: the extension system is
cheap for the *model* to use, not only for the human.

The estate's translation is not "let the agent write plugins for our host." It
is the thing decision 18 already ruled: the tool register is a signature,
programs over that signature are store content, and *the agent extends the
system by submitting a program that the gates admit* — extension without
arbitrary code execution. pi buys malleability with trust; the estate buys it
with admission. Same benefit, different currency, and ours is the one that
survives being pointed at a hostile author.


---

## 2. The protocol landscape

**All external claims in this section carry a URL and were read 2026-08-29.**
Anything not resolved to a primary source is marked **PENDING** in place.
Pins are inline rather than filed in `.reference/provenance/` — that directory
holds repository and paper locks, not web docs, and this note is pre-grade
(C6's "explicit pending mark" branch, not its "resolved pin" branch). Filing
pins is a promotion cost, listed in §6.

### 2.0 The finding that organizes the whole section

**Every protocol below standardizes an agent's conversation. The estate is not
an agent.** It is a content-addressed store with a tool register — a *callee*,
not a *speaker*. Sorted by what each one connects:

- **agent ↔ tool/context** — MCP. The estate is the tool. **This is the estate's
  seat, and it already sits in it.**
- **editor ↔ agent** — ACP. The estate would have to become a coding agent.
- **agent ↔ user** — AG-UI, Vercel's UI Message Stream. The estate would have to
  fabricate an agent run to have events to emit.
- **agent ↔ agent** — A2A. Same problem as ACP.
- **vendor SDK ↔ vendor endpoint** — OpenAI Agents SDK, Claude Agent SDK. Not
  protocols third parties serve at all (§2.5).

So the landscape's answer to "which of these should the estate serve?" is
**exactly one, and it is already served**. The rest of §2 is the evidence for
that, plus the two things that finding does *not* excuse: the estate is a full
revision behind on the one protocol it does serve (§2.1), and the ecosystem it
can reach through that one protocol is much larger than the BYOA matrix's five
clients suggests (§2.2).

### 2.1 MCP — the one the estate serves

**Status: ratified revision `2026-07-28`** — "The current protocol version is
2026-07-28" (https://modelcontextprotocol.io/specification/versioning, accessed
2026-08-29). Revision history: `2024-11-05`, `2025-03-26`, `2025-06-18`,
`2025-11-25`, `2026-07-28`. The **draft changelog is empty** — "Changes since
the most recent release will accumulate here" is its entire content
(https://modelcontextprotocol.io/specification/draft/changelog, accessed
2026-08-29) — so there is no named next revision and no target date.

**What `2026-07-28` removed** (https://modelcontextprotocol.io/specification/2026-07-28/changelog
and .../basic/transports/streamable-http, both accessed 2026-08-29). SERVING.md's
account of this is **confirmed correct in every particular**, and the changelog
adds detail SERVING does not carry:

| Removed / changed | Normative text |
|---|---|
| protocol sessions | "Remove protocol-level sessions and the `Mcp-Session-Id` header… Servers that need cross-call state use explicit, server-minted handles passed as ordinary tool arguments (SEP-2567)." |
| SSE resumability | "Resumable SSE streams via `Last-Event-ID` are not supported." A broken stream "loses the in-flight request; clients MUST re-issue it as a new request with a new request ID (SEP-2575)." |
| the `initialize` handshake | "Make MCP stateless: remove the `initialize`/`notifications/initialized` handshake. Every request now carries its protocol version and client capabilities in `_meta`…" — replaced by a mandatory `server/discover` RPC |
| the GET endpoint and `resources/subscribe` | both replaced by `subscriptions/listen` |
| server-initiated requests on the response stream | "The server MUST NOT send independent JSON-RPC requests on this stream… This is a change from Streamable HTTP in protocol versions `2025-03-26` through `2025-11-25`" |

And what it **added** that bears on this note: required `MCP-Protocol-Version`,
`Mcp-Method`, and `Mcp-Name` headers on every POST, so intermediaries can route
without parsing bodies ("These headers are REQUIRED for compliance"), with a new
`-32020 HeaderMismatch` error when the header disagrees with `_meta`;
transport-level cancellation ("Closing the SSE response stream MUST be treated
by the server as cancellation of that request"); and `resultType` /
`CacheableResult` (`ttlMs`, `cacheScope`) on results (SEP-2549).

A **feature-lifecycle registry** now exists alongside revisions (SEP-2596): a
twelve-month minimum deprecation window, published at
https://modelcontextprotocol.io/specification/2026-07-28/deprecated (accessed
2026-08-29). Deprecated in `2026-07-28`: **Roots, Sampling, Logging**, and
Dynamic Client Registration, none removable before 2027-07-28. Nothing has been
Removed yet. *This is itself a borrow candidate — see §4.*

**Server push, as of the ratified revision.** `subscriptions/listen` "opens a
long-lived notification stream from the server to the client… It replaces the
former `resources/subscribe` RPC and the HTTP GET endpoint"
(https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions,
accessed 2026-08-29). Filter keys are `toolsListChanged`, `promptsListChanged`,
`resourcesListChanged`, and `resourceSubscriptions` (an array of URIs); "The
server MUST NOT send notification types the client has not explicitly
requested"; the first message MUST be
`notifications/subscriptions/acknowledged`. Crucially for §3.2: on stdio "the
client MUST re-send `subscriptions/listen` to re-establish its subscriptions —
the server holds no subscription state across reconnections." **There is no
cursor.** A reconnecting subscriber cannot ask for what it missed.

**What is next at spec level.** The authority is the roadmap page, "Last
updated: 2026-08-22" (https://modelcontextprotocol.io/development/roadmap,
accessed 2026-08-29) — not the March blog roadmap
(https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/, published
2026-03-09), which it supersedes. Five priorities, each with named Core
Maintainers. The three that touch this note:

1. **Agentic Messaging Primitives** — "The risk is three answers to 'the server
   isn't done yet' that don't share a lifecycle, a cancellation model, or an
   error surface. We want them to compose." Includes the Triggers & Events WG's
   "Channels and subscriptions for push delivery, **including webhooks**", and
   "continued work on Tasks (SEP-2663) toward eventual inclusion of the
   extension in the core protocol." The Triggers and Events WG charter states
   the mission as "a standardized callback mechanism—webhooks or similar—that
   lets servers push notifications when new data is available, **with defined
   ordering guarantees that hold across all transports**"
   (https://modelcontextprotocol.io/community/working-groups/triggers-events,
   accessed 2026-08-29).
2. **HTTP-Native Transport Unification and Hardening** — "**HTTP over stdio**:
   Streamable HTTP as the single binding, spoken over stdin/stdout for local
   servers. We believe we can use **HTTP/2 over stdio** to get multiplexed HTTP
   transport while retaining the security and lifecycle guarantees of a
   subprocess." Plus caching work extending `ttlMs`/`cacheScope` to **ETags**,
   "versioning the results of primitives, in particular tool calls."
3. **Improved Primitives** — redesigning the `tools/call` result shape, and
   **progressive discovery**: "Clients learn a server's tools and resources as
   they need them instead of ingesting the full catalog up front."

Open transport-adjacent SEPs (enumerated via the GitHub API, accessed
2026-08-29): SEP-2694 Resumable Task Event Streams; SEP-2998 Partial Tool
Results (Streaming Tool Call Output); SEP-2848 Asynchronous Approval for Tool
Calls; SEP-2495 Event-Driven Tool Invocation. **SEP-2598 "Pluggable Transports"
is labelled `deferred`** — the only new-transport-framework proposal, and it is
not moving.

**Three of these run toward things the estate already has**, which is worth
saying plainly because it is the strongest strategic fact in §2:

| MCP is working toward | The estate already has |
|---|---|
| ordering guarantees on pushed notifications | admission order **is** semantics (`Cas/IR/Word.lean`); the word is a total order by construction |
| ETags / versioning the results of primitives | the content address **is** the ETag — derived from the bytes, verified on every read |
| progressive discovery of a server's catalog | six tools, permanently, because the code-mode register is the interface (decision 16); plus `/projections/*` as fetchable self-description |

**Maturity.** Now a Linux Foundation project — "Model Context Protocol has been
established as Model Context Protocol a Series of LF Projects, LLC"
(https://modelcontextprotocol.io/community/governance, accessed 2026-08-29);
Apache-2.0 code and spec, CC-BY-4.0 docs; two Lead Maintainers (David Soria
Parra, Den Delimarsky) and six Core Maintainers forming a Steering Group, with
membership "for individuals, not companies… no seats reserved for specific
companies." Tier-1 SDKs: TypeScript, Python, C#, Go, Rust
(https://modelcontextprotocol.io/docs/2026-07-28/sdk, accessed 2026-08-29).
The registry at https://registry.modelcontextprotocol.io/ is live and healthy
but "currently **in preview**. Breaking changes or data resets may occur"
(https://modelcontextprotocol.io/registry/about, accessed 2026-08-29); it is
explicitly "**not** intended to be directly consumed by host applications" and
"not designed for self-hosting." Registry server count: **PENDING** — no count
endpoint exists.

And the maturity signal that matters most to this estate: **SEP-2484 makes a
merged conformance scenario a gate on finalization**, with a `sep-NNNN.yaml`
traceability file "mapping each MUST/MUST NOT and SHOULD/SHOULD NOT in the SEP's
Specification section to either a check ID or a documented exclusion"
(https://modelcontextprotocol.io/community/sep-guidelines, accessed
2026-08-29). SDK implementations are explicitly *not* required; the conformance
scenario is. A standards body has independently arrived at the estate's own
byte-gate discipline.

**Honest reading for the estate.** The daemon serves Streamable HTTP at `/mcp`
and offers `2025-11-25` at newest (`bin/mcp/server.ts` `offeredProtocols`).
That is one full revision behind a *breaking* rewrite, and SERVING.md carries it
in OWED with the right diagnosis: "Offering it means a new adapter at a new
pin — an upstream event." Two mitigations are real. First, "the stateless
direction is GOOD for this daemon" (SERVING) — the estate holds no session state
worth keeping, so the rewrite removes work rather than adding it. Second, and
**PENDING as the most consequential unresolved question in this note**: no
primary source names *any* client that implements `2026-07-28`. Every vendor
doc read (§2.2) still describes transports in session-era terms. The installed
client base has probably not moved either.

### 2.2 Who actually consumes MCP — and the reach the BYOA matrix undercounts

**The official client matrix no longer exists.**
`https://modelcontextprotocol.io/clients` 308-redirects to the getting-started
intro (accessed 2026-08-29); do not cite it. The only remaining matrix covers
*extensions*, not transports
(https://modelcontextprotocol.io/extensions/client-matrix, accessed 2026-08-29,
and printed on the page: "This list is maintained by the community").

Transport support, each from the vendor's own documentation, all accessed
2026-08-29:

| Client | stdio | SSE (deprecated) | Streamable HTTP | Source |
|---|---|---|---|---|
| Claude Code | yes | yes, deprecated | **yes, recommended** | https://code.claude.com/docs/en/mcp |
| Claude Desktop / claude.ai | yes | — | yes (Custom Connectors) | https://modelcontextprotocol.io/docs/2026-07-28/develop/connect-remote-servers |
| VS Code (Copilot) | yes | yes | yes | https://code.visualstudio.com/docs/agents/reference/mcp-configuration |
| Cursor | yes | yes | yes | https://cursor.com/docs/context/mcp |
| ChatGPT / OpenAI Responses API | **no** | yes | yes | https://developers.openai.com/api/docs/guides/tools-connectors-mcp |
| Windsurf / Devin Desktop | yes | yes | yes | https://docs.devin.ai/desktop/cascade/mcp |
| Zed | yes | PENDING | remote via `url`; flavor unstated | https://zed.dev/docs/ai/mcp |

Two notes the BYOA matrix should absorb. **Claude Code carries a fourth,
non-spec transport** — `{"type":"ws","url":"wss://…"}` via `claude mcp
add-json`, documented as suiting "remote MCP servers that push events to Claude
unprompted." It is a Claude Code extension; the specification defines only stdio
and Streamable HTTP. And **OpenAI is remote-only** — "The Responses API works
with remote MCP servers that support either the Streamable HTTP or the HTTP/SSE
transport protocols"; stdio is not an option, so the daemon, not `cas serve`, is
the only surface that reaches ChatGPT at all.

**The undercount.** ACP (§2.3) passes MCP servers through to the agent, and its
registry lists roughly forty agents and several dozen editors. So the estate's
`/mcp` endpoint is reachable from Zed, JetBrains, Neovim, Emacs, Obsidian, Qt
Creator, Jupyter and the rest of ACP's client list **without the estate
implementing anything at all** — the editor hands its configured MCP servers to
whichever ACP agent is running, and that agent dials `cas`. This is the single
most useful practical finding in §2 and it costs nothing: *the correct
integration with ACP is to serve MCP well.*

### 2.3 ACP — Agent Client Protocol

**Repository moved:** `zed-industries/agent-client-protocol` 301-redirects to
**`agentclientprotocol/agent-client-protocol`** (GitHub API, accessed
2026-08-29). Cite the new path.

**What it standardizes.** "The Agent Client Protocol (ACP) standardizes
communication between code editors/IDEs and coding agents and is suitable for
both local and remote scenarios"
(https://agentclientprotocol.com/get-started/introduction.md, accessed
2026-08-29). JSON-RPC 2.0; **the editor is the client and the agent is the
server**. Local agents run as editor sub-processes over stdio; "Full support for
remote agents is a work in progress." Framing on the stable transport:
"Messages are delimited by newlines (`\n`), and MUST NOT contain embedded
newlines" (https://agentclientprotocol.com/protocol/v1/transports.md, accessed
2026-08-29) — Streamable HTTP is a draft proposal; WebSocket is not a v1
transport.

**Method surface, verbatim from `schema/v1/meta.json`** (`"version": 1`,
accessed 2026-08-29): thirteen agent methods (`initialize`, `authenticate`,
`session/new`, `session/load`, `session/set_mode`, `session/set_config_option`,
`session/prompt`, `session/cancel`, `session/list`, `session/delete`,
`session/resume`, `session/close`, `logout`) and eleven client methods
(`session/request_permission`, `session/update`, `fs/write_text_file`,
`fs/read_text_file`, `terminal/create`, `terminal/output`, `terminal/release`,
`terminal/wait_for_exit`, `terminal/kill`, `elicitation/create`,
`elicitation/complete`). Filesystem and terminal are **delegated to the editor**,
capability-gated.

**The streaming model** is the `session/update` notification, whose `update`
field is a discriminated union on `sessionUpdate` with eleven v1 variants:
`user_message_chunk`, `agent_message_chunk`, `agent_thought_chunk`, `tool_call`,
`tool_call_update`, `plan`, `available_commands_update`, `current_mode_update`,
`config_option_update`, `session_info_update`, `usage_update` (read from
`schema/v1/schema.json`, accessed 2026-08-29).

**Versioning is the best of any protocol surveyed.** An integer
`protocolVersion` negotiated at `initialize`, "only incremented when breaking
changes are introduced"; if the client cannot speak the agent's version it
"SHOULD close the connection and inform the user"
(https://agentclientprotocol.com/protocol/v1/initialization.md, accessed
2026-08-29). Current stable is `1`. **v2 exists in draft** —
`schema/v2/meta.json` carries `"version": 2`; the announcement is dated
2026-07-20 and states v1-only peers will remain common and implementers should
support both. v2 drops turn-centric sessions, unifies message patching by stable
ID, replaces `oldText`/`newText` diffs with structured operations, reserves
`_`-prefixed enum variants for forward compatibility, and moves `fs/*` and
`terminal/*` out of the client method set. **Draft — do not treat v2 as stable
surface.**

**Consumers.** Clients: Zed, JetBrains AI Assistant, Neovim (several plugins),
Emacs, VS Code (several extensions), Visual Studio, Obsidian, Qt Creator,
Pulsar, Unity, plus CLI/TUI clients, notebook integrations and chat bridges.
Agents (~40 listed): Gemini CLI, Claude Agent and Codex CLI via Zed's adapters,
GitHub Copilot (public preview), Cursor, Cline, Goose, OpenCode, OpenHands,
JetBrains Junie, Qwen Code, Kimi CLI, Mistral Vibe, Factory Droid, Docker's
cagent, and others
(https://agentclientprotocol.com/get-started/clients.md and `.../agents.md`,
accessed 2026-08-29). There is a stabilized **ACP Registry** at
`https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json`.

**Maturity.** Apache-2.0, no CLA. **Jointly governed by Zed and JetBrains**,
with stated intent to move to an independent foundation — not yet in one
(https://agentclientprotocol.com/community/governance.md, accessed 2026-08-29).
Published JSON schemas as release assets (`meta.json`, `schema.json`, plus
`.unstable` variants), latest `schema-v1.21.0` published 2026-08-20; official
SDKs in Kotlin, Java, Python, Rust, TypeScript; npm
`@agentclientprotocol/sdk@1.4.0`. Repo 4,106 stars, created 2025-06-23. A public
RFD process with ~20 stabilization announcements.

**Does serving it buy consumers? No — and the estate gets the ecosystem anyway.**
ACP's server role is *the coding agent*: the thing that holds a session, emits
message chunks and thoughts, requests permission, and asks the editor to read
files and run terminals. The estate has none of those and should acquire none of
them. But ACP explicitly forwards the editor's configured MCP servers to the
agent — "it passes configuration for these to the agent. This allows the agent
to connect directly to the MCP server"
(https://agentclientprotocol.com/get-started/architecture.md, accessed
2026-08-29), and `session/new` takes a working directory plus a list of MCP
servers, with stdio MCP support **mandatory** for all agents
(https://agentclientprotocol.com/protocol/v1/session-setup.md, accessed
2026-08-29). So the estate's reach into ACP's forty agents and several dozen
editors is already purchased by `cas serve`. **Refused in §5, with the reach
kept.**

**What to borrow anyway:** the integer `protocolVersion` with an explicit
close-the-connection rule; the published-schema-as-release-asset practice; and
v2's `_`-prefixed reserved enum variants for forward compatibility — the last is
a spelling the estate's closed unions (order is identity, decision 4) would have
to think hard about, and is listed as a question, not a want.

### 2.4 AG-UI — Agent User Interaction Protocol

**What it standardizes.** "An open, lightweight, event-based protocol that
standardizes how AI agents connect to user-facing applications" — "the
general-purpose, bi-directional connection between a user-facing application and
any agentic backend" (https://docs.ag-ui.com/introduction.md, accessed
2026-08-29). Origin: "AG-UI was born from CopilotKit's initial partnership with
LangChain and CrewAI."

**The event vocabulary** is a 29-member `EventType` enum
(https://docs.ag-ui.com/sdk/js/core/events.md, accessed 2026-08-29):
`RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`, `STEP_STARTED`, `STEP_FINISHED`,
`TEXT_MESSAGE_START|CONTENT|END`, `TOOL_CALL_START|ARGS|END|RESULT`,
`STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGES_SNAPSHOT`, `ACTIVITY_SNAPSHOT`,
`ACTIVITY_DELTA`, the six-member `REASONING_*` family,
`SUBAGENT_STARTED|FINISHED|ERROR`, `RAW`, `CUSTOM`. Five `THINKING_*` events are
documented as **deprecated**, superseded by `REASONING_*`
(https://docs.ag-ui.com/concepts/events.md, accessed 2026-08-29).
`TEXT_MESSAGE_CHUNK` / `TOOL_CALL_CHUNK` appear as concepts on that page but
were not in the retrieved enum listing — **PENDING** as to enum membership.

**`STATE_DELTA` is JSON Patch (RFC 6902)** — "The `STATE_DELTA` event delivers
incremental updates to the state using JSON Patch format (RFC 6902)"
(https://docs.ag-ui.com/concepts/state.md, accessed 2026-08-29). This is the
snapshot-plus-patch-chain design §3.2 compares the word against.

**Transport is deliberately unfixed.** "AG-UI doesn't mandate how events are
delivered, supporting various transport mechanisms"
(https://docs.ag-ui.com/concepts/architecture.md, accessed 2026-08-29) — SSE,
WebSockets, webhooks, and a binary form. Concretely, `HttpAgent` POSTs
`application/json` with `Accept: text/event-stream`; the `EventEncoder`
content-negotiates on `Accept`, emitting protobuf under
`application/vnd.ag-ui.event+proto` (a big-endian uint32 length prefix plus
protobuf bytes) or otherwise SSE framed as `data: ${JSON.stringify(event)}\n\n`
(sources read from the TypeScript SDK, accessed 2026-08-29).

**Consumers.** Named integrations: LangChain, CrewAI, Microsoft Agent Framework,
Google ADK, AWS Strands Agents, AWS Bedrock AgentCore, Mastra, Pydantic AI,
Agno, LlamaIndex, AG2 (supported); AWS Bedrock Agents in progress; Claude Agent
SDK and Claude Managed Agents SDK listed as community-supported; OpenAI Agent
SDK and Cloudflare Agents in progress. Official SDKs in JS/TS, Python, .NET,
with community SDKs in seven more languages. The named front end is CopilotKit
(React).

**Maturity.** MIT. Repo 15,622 stars, created 2025-05-07. Releases tagged
`release/YYYY-MM-DD`, roughly weekly. **No spec-level version number exists** —
**PENDING**; only package versions (`@ag-ui/core` 0.0.59, PyPI `ag-ui-protocol`
0.1.21, both 2026-08-27). **No governance document exists** in the repo or docs
— **PENDING**; a secondary source asserts CopilotKit stewardship and no
foundation donation, and is not corroborated by any primary page.

**Its own framing of the landscape**, quoted exactly from
https://docs.ag-ui.com/agentic-protocols.md (accessed 2026-08-29):

> * **MCP** (Model Context Protocol) Connects agents to tools and to context — but those tools are themselves becoming agentic.
> * **A2A** (Agent to Agent) Connects agents to other agents.
> * **AG-UI (Agent–User Interaction)** Connects agents to users (through user-facing applications).

**Does serving it buy consumers? No.** Every AG-UI event presumes a *run* with a
*conversation*: `RUN_STARTED`, message chunks, reasoning, sub-agents. The daemon
has no run and no conversation; it has admissions. Emitting AG-UI would mean
inventing a fake agent turn around a `cas_put`, which is the estate's exact
prohibited move — a surface that pretends to a semantics it does not have.
Refused in §5. The `STATE_SNAPSHOT` + RFC-6902-`STATE_DELTA` pattern is worth
knowing precisely because §3.2 shows the word beats it: a patch chain
desynchronizes on a dropped patch and recovers only by re-snapshotting, where
`since(n)` recovers exactly and for free.

### 2.5 The vendor SDKs — and why two of the three are not protocols

**Vercel AI SDK — UI Message Stream. A real protocol.**
(https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol, accessed 2026-08-29.) Two
protocols: a plain **Text Stream** and the **Data Stream / UI Message Stream**.
The wire form: "The data stream protocol uses Server-Sent Events (SSE) format
for improved standardization, keep-alive through ping, reconnect capabilities,
and better cache handling", one JSON object per `data:` line, terminated by
`data: [DONE]`. Part types include `start`, `start-step`, `finish-step`,
`reset-step`, `finish`, `abort`, `text-start|delta|end`,
`reasoning-start|delta|end`, `source-url`, `source-document`, `file`, `custom`,
`data-*`, `error`, `tool-input-start|delta|available`,
`tool-approval-request|response`, `tool-output-available`, `tool-output-denied`.
Version marker: "you need to set the `x-vercel-ai-ui-message-stream` header to
`v1`" — the only one. **It explicitly invites third-party servers**: "You can
use this information to develop custom backends and frontends for your use case,
e.g., to provide compatible API endpoints that are implemented in a different
language such as Python."

It is the only vendor surface here with independent implementers: **Pydantic
AI** ("Pydantic AI natively supports the Vercel AI Data Stream Protocol",
https://pydantic.dev/docs/ai/integrations/ui/vercel-ai/, accessed 2026-08-29),
**grafana/ai-sdk** (Go, Apache-2.0) and **coder/aisdk-go** (Go, MIT). Maturity:
`ai@7.0.84`, Apache-2.0 (npm registry, accessed 2026-08-29) — **two majors past
the AI SDK 5 the brief assumed**, with dist-tags for the v5 and v6 lines still
published. **The docs carry no stability guarantee**: the phrase is "the
following stream parts are *currently* supported". And Pydantic AI's
`sdk_version=5|6` switch is third-party proof that the vocabulary drifts across
majors while the header stays `v1` — a versioning weakness the estate should
notice and not copy (§5).

**OpenAI Agents SDK — a library, not a protocol.**
`Runner.run_streamed()` yields `RawResponsesStreamEvent` (a pass-through of
Responses API events like `response.output_text.delta`), `RunItemStreamEvent`,
and `AgentUpdatedStreamEvent` (https://openai.github.io/openai-agents-python/streaming/,
accessed 2026-08-29). These are in-process objects; there is no wire format at
the SDK level. The real protocols live one layer down and belong to the
platform: the Responses API's SSE event vocabulary
(https://developers.openai.com/api/docs/guides/streaming-responses) and the
Realtime API's WebRTC / WebSocket / SIP connection methods
(https://developers.openai.com/api/docs/guides/realtime), both accessed
2026-08-29. Those are *vendor endpoint contracts* — implemented by clients, not
re-served by third parties. **Third-party implementers found: none.**

**Claude Agent SDK — a library with a de-facto subprocess protocol.**
"A library that runs the agent loop in your own process, in Python or
TypeScript", and "To drive the same agent loop from another language, run the
CLI as a subprocess with the `-p` flag and `--output-format json`"
(https://code.claude.com/docs/en/agent-sdk/overview, accessed 2026-08-29). The
CLI contract is real and documented down to envelope fields —
`--output-format stream-json` ("newline-delimited JSON for real-time
streaming"), `--input-format stream-json`, `--include-partial-messages`, and
`system/init`, `system/api_retry`, `assistant`/`user` with `parent_tool_use_id`,
`stream_event`, and a terminal `result`
(https://code.claude.com/docs/en/cli-reference and `.../headless`, accessed
2026-08-29). Partial messages are explicitly raw, not accumulated: "Both contain
raw Claude API events, not accumulated text. You need to extract and accumulate
text deltas yourself." **There is no protocol version number**; instead
`SDKSystemMessage.capabilities` is an **open feature set** — "The `capabilities`
array names the protocol behaviors this CLI implements, so you can feature-detect
instead of comparing `claude_code_version` strings. It is an open set: ignore
values you don't recognize" (documented values today: `interrupt_receipt_v1`,
`interrupt_cancel_queued_v1`). No HTTP server mode: hosted use routes to
Managed Agents, "a separate product", and Remote Control makes "outbound HTTPS
requests only and never opens inbound ports." **Third-party implementers found:
none.** The underlying Anthropic Messages API streaming *is* properly versioned
by policy — "new event types may be added, and your code should handle unknown
event types gracefully"
(https://platform.claude.com/docs/en/build-with-claude/streaming, accessed
2026-08-29).

### 2.6 A2A, and pi's own wire, for completeness

**A2A (Agent2Agent)** is active and at the Linux Foundation — "originally
developed by Google and donated to the Linux Foundation", maintained by a
Technical Steering Committee with representatives from AWS, Cisco, Google, IBM
Research, Microsoft, Salesforce, SAP and ServiceNow, Apache-2.0
(https://a2a-protocol.org/latest/, accessed 2026-08-29). Latest release v1.0.1,
published 2026-05-28 (GitHub API on `a2aproject/A2A`, accessed 2026-08-29); the
Linux Foundation's 2026-04-09 press release reports 150+ supporting
organizations and integration into Azure AI Foundry and Amazon Bedrock
AgentCore Runtime. Agent-to-agent; the estate is not an agent. Refused in §5.

**`pi-protocol` v1** is covered in §1.7. It is not a public standard — "The
protocol is experimental and has no compatibility guarantees" — and nothing
consumes it outside pi. It is in this note as *prior art on framing and codec
discipline*, not as a protocol to serve.

### 2.7 The landscape table

Ratings are this note's judgment, not a source's.

| Protocol | Standardizes | Framing / transport | Version marker | Real third-party consumers | Maturity | Serving it buys the estate consumers? |
|---|---|---|---|---|---|---|
| **MCP Streamable HTTP** | agent ↔ tool/context | JSON-RPC over HTTP POST (+ request-scoped SSE); stdio NDJSON | dated revisions; `2026-07-28` current; feature-lifecycle registry | Claude Code/Desktop, VS Code, Cursor, ChatGPT, Windsurf/Devin, Zed, and every ACP agent | **high** — Linux Foundation, 5 Tier-1 SDKs, conformance gate on SEPs, preview registry | **YES — and already served.** One revision behind |
| **ACP** | editor ↔ coding agent | JSON-RPC over stdio (newline-delimited, no embedded newlines); HTTP draft | integer `protocolVersion`; stable `1`, draft `2` | ~40 agents, several dozen editors | **high** — Apache-2.0, Zed+JetBrains governance, 5 SDKs, published schemas, registry | **No** — the estate would have to be an agent. Reach obtained free via MCP pass-through |
| **AG-UI** | agent ↔ user | transport-agnostic: SSE, WS, webhooks, protobuf-over-uint32-length | **none at spec level (PENDING)**; packages at 0.0.x | many agent frameworks; CopilotKit React front end | **medium** — MIT, active, but no spec version and **no governance doc (PENDING)** | **No** — presumes a run and a conversation the daemon does not have |
| **Vercel UI Message Stream** | agent ↔ chat UI | SSE, JSON per `data:` line, `[DONE]` terminator | `x-vercel-ai-ui-message-stream: v1` (single value; vocabulary drifts across majors) | **yes**: Pydantic AI, grafana/ai-sdk, coder/aisdk-go | **medium-high** as software (`ai@7.0.84`, Apache-2.0); **low** as a spec — no stability statement | **No** — it is a chat-message stream; the estate has no chat |
| **OpenAI Agents SDK** | nothing — library API | in-process objects; Responses API SSE / Realtime WebRTC-WS-SIP one layer down | n/a at SDK level | none | 0.x libraries; the platform APIs beneath are mature | **No** — there is nothing to serve |
| **Claude Agent SDK** | subprocess drive of the CLI | NDJSON `stream-json` over stdio, plus `control_request`/`control_response` | **no version**; open-set `capabilities` feature flags | none | library-mature; **not published as a spec** | **No** — it drives an agent; the estate is a tool the agent calls |
| **A2A** | agent ↔ agent | (not surveyed in depth) | v1.0.1 | 150+ organizations claimed | **high** — Linux Foundation, multi-vendor TSC | **No** — the estate is not an agent |
| **`pi-protocol` v1** | client ↔ pi session server | `[uint32-be len][CBOR]` over any ordered byte transport | `PROTOCOL_VERSION` in `hello`; "no compatibility guarantees" | none outside pi | **experimental, by its own statement** | **No** — but it is the best prior art here (§1.7, §4) |
---

## 3. The estate design sketch — on the surfaces that actually exist

Nothing in this section mints an abstraction (decision 2). Every element names
an artifact that is already built, already emitted, already ratified, or already
commissioned by a numbered decision. Where something is genuinely absent, it is
listed in §6 as an ask, not proposed here as a design.

### 3.1 What the daemon actually is today, surface by surface

The honest inventory, from `merge/daemon-spine` (SERVING.md, and
`library/effects/bin/mcp/http.ts`), because a design sketch that misdescribes
its own substrate is worthless:

| Surface | Direction | Framing | Push? |
|---|---|---|---|
| `/cas/{hex}`, `/roots/{hex}`, `/control/…` | request → response | `application/octet-stream`, closed binary framing | **no** |
| `/mcp` | request → response | JSON-RPC over Streamable HTTP, **POST only** | **no** |
| `/metrics` | scrape | Prometheus exposition | no (pull) |
| `/projections`, `/projections/{name}` | request → response | the emitted, byte-gated JSON artifacts, read-only | **no** |
| stderr | one-way out-of-band | logfmt, `message=request` / `message=heartbeat` / per-tool | **yes, but not to a client** |
| `cas serve` | request → response | MCP over stdio, NDJSON | **no** |

**There is no push anywhere on the estate today.** The heartbeat is the only
periodic emission and it goes to stderr, where the operator's supervisor reads
it, not a client. `McpServer.layerHttp` at the pin "implements no legacy
HTTP+SSE, no GET SSE stream, no `Last-Event-ID` resumption, no session expiry"
(SERVING, "The protocol ceiling"), and the toolkit declares **tools only** —
`Toolkit.make` over `casToolkit` (`bin/mcp/tools.ts:302`), with no `resources`
and no `prompts` capability. So MCP's own subscription mechanism is not merely
unimplemented; it is outside the declared surface, on either spelling
(`resources/subscribe` in the pre-2026-07-28 era, `subscriptions/listen` after —
§2).

**Two facts from the wire profile matter more than any of that**, because they
mean the estate's streaming story already has a declared home and a declared
discipline, ahead of any protocol choice:

1. `PROFILE-CAS-HTTP-0.md:261-264` — the planned planes include "**an advisory
   event plane that never constitutes admission**".
2. `PROFILE-CAS-HTTP-0.md:219-220` — "streaming responses will carry an
   **idle-progress deadline** defined with the proof plane, not this one."

The profile anticipated events, named their trust level, and deferred their
deadline discipline to a named later slice. This sketch fills in §13's first
clause and nothing else.

### 3.2 The word streamed live — assessment

**The claim under assessment:** server-push of receipts since a mark is the
estate's native streaming story, with `cas_word`'s `since` as the feed
(`11-api-contract.md:454-503`; FE-B5; decision 26 seat 3).

**Verdict: correct, and stronger than it looks — but the push half buys latency,
not capability, and must be sequenced second.** Four arguments, then the cost.

**(a) The word is already an event stream; nothing needs to be invented to make
it one.** `11-api-contract.md:29-66` establishes that the store persists a *set*
and the language's semantics is a *word* — "bindings in admission order", and
`Cas/IR/Word.lean`'s own sentence, "the order IS semantics". The decisive
witness is in the corpus: the `shared-chunk` vector is 5 bindings over 4 nodes
with 1 dedup, so `load` can never recover the fifth binding, "because the fifth
binding is not content — it is history. The word is *strictly more information
than the store*." An append-only totally-ordered sequence of typed records with
a monotone index is the definition of an event log. The estate does not need a
streaming abstraction; it needs the operation that reads the log it already has.

**(b) `since` is a better cursor than every resumption mechanism in §2, and this
is the sketch's central technical claim.** Compare:

| Mechanism | What the cursor is | What resumption costs |
|---|---|---|
| SSE `Last-Event-ID` (MCP 2025-03-26…2025-11-25) | an opaque server-minted id over a **replay buffer** | the server must retain undelivered events; a buffer eviction is unrecoverable — and MCP **removed the whole mechanism** in 2026-07-28 (§2) |
| MCP `subscriptions/listen` (2026-07-28) | a subscription id valid for one stream | "the server holds no subscription state across reconnections"; on reconnect the client re-subscribes and **misses whatever happened in between** |
| AG-UI `STATE_DELTA` | a JSON-Patch chain from a `STATE_SNAPSHOT` | a dropped patch desynchronizes; recovery is a fresh snapshot |
| Vercel UI Message Stream | none — `start`…`finish`, one response | a broken stream is a lost response; re-issue the request |
| pi `--mode json` / RPC | none — the process is the session | reconnect means a new process; history is re-read from the JSONL file |
| **`cas_word(since: n)`** | **a word index into a persisted total order** | **nothing.** `since(n)` is total and recomputed from the store's own state; there is no buffer to evict, no subscription to lose, and no snapshot to re-take |

The reason is structural rather than clever: every other mechanism streams a
*derived* view whose authority lives in the producer's memory, so resumption is
the producer's problem. `since` streams the authoritative object itself. A
client that reconnects at index 12 gets exactly what it missed, forever, from
any process, because the word is durable and its order is semantics. The
contract already spells the rest: `since(0)` is the whole history, `since(len)`
is what is new, an empty `bindings` is "nothing happened", and "browse, history,
and change feed are one operation because the word is append-only"
(`11-api-contract.md:454-503`).

**(c) The advisory/authoritative split is already ratified, and pi states the
same rule for events.** `cas-http/0` §6 rules presence answers "planning data
only… admit nothing"; §13 plans an "advisory event plane that never constitutes
admission". `pi-protocol` says the event half in one imperative sentence:
"Progress events are transient UI hints and must not be reduced into
authoritative state" (§1.7). Ported, that is the entire safety argument for a
push feed: **a pushed word notification carries no admission**, and a consumer
that acts on it re-reads through `cas_word`/`cas_load`, where the read law
re-digests (`Graph.verify`; `PathReader.ts:9-14`). The estate can make that
argument *structurally* where pi makes it by instruction, because the estate's
authoritative read verifies and its advisory event need carry no bytes at all —
in the limit, one integer.

**(d) It is the same discipline pi already proved in the small.** pi's
`message_update` records are "delta-only. They omit both the cumulative
`message` field and `assistantMessageEvent.partial` to keep stream size linear"
(`packages/coding-agent/docs/json.md:87-89`, accessed 2026-08-29), with
`contentIndex` + `delta` as the declared reconstruction rule. `cas_word` is the
same shape one level up: `bindings` are the deltas, append is the reconstruction
rule, `next` is the cursor the client never computes itself, and — the estate's
own dividend — `bindings` reuses the existing `bindingSchema` already generated
into `ConformanceVectorSchema.ts`, so **the tool is new and not one document
shape is** (`11-api-contract.md:454-503`).

**The cost, stated plainly: push buys latency, not capability.** Everything a
subscriber can learn from a pushed word notification, it can learn by calling
`cas_word(since: next)` on a timer. The difference is the interval and the
wasted round trips, not the information. That has three consequences the sketch
takes as binding:

1. **`cas_word` is the whole critical path; push is an optimization behind it.**
   Commissioning a transport before the operation exists would produce a feed
   with nothing to feed. Decision 26 seat 3 already has the operation. The
   sequencing is therefore forced, not chosen.
2. **The first "streaming" release should be polling, and should say so.** A
   front end that calls `cas_word(since: next)` on an interval is a live view by
   the workbench document's own standard — "the post-mortem is simply the live
   view after the frontier stops moving"
   (`.staging/paper-notes/10-workbench-requirements.md:228`). It ships the
   moment seat 3 lands, on transports that already exist, with no protocol work.
3. **The honest claim about the estate's streaming story is a claim about the
   cursor, not about the pipe.** Anyone can serve SSE. Almost nobody can offer
   exact, unbounded, buffer-free resumption — because almost nobody's event
   stream is their authoritative state.

**Where a genuine push belongs when it is ruled.** `cas-http/0` §13's advisory
event plane, as an *additive* endpoint on the daemon's existing port, whose body
is the profile's own binary framing (a word index, at minimum), whose deadline
is §10's deferred idle-progress deadline, and which admits nothing. **Not** on
`/mcp`: adding it there means declaring a `resources` capability the estate has
never had, minting a resource URI space it has never had, and — at the current
protocol ceiling — depending on `resources/subscribe`, a mechanism the ratified
2026-07-28 revision replaced (§2). Refused in §5 for that reason.

### 3.3 What "first-class agent-streaming integration" means once the above is true

Decision 31(a) asks for integrations, not only a feed. On the surfaces that
exist, the integration story decomposes into three things, each already owned:

1. **Machine-readable self-description that a client can fetch at runtime.**
   Already served: `/projections/cas-tools.json` is the tool signature,
   `/projections/cas-surface.json`, `cas-obligations.json`, `schema-index.json`,
   `schema-verdicts.json`, `environment.json` (SERVING). Every §2 protocol
   solves discovery with a bespoke handshake; the estate solves it with static,
   byte-gated files over an ordinary GET. That is not a gap — it is the estate's
   answer, and it is better than a handshake because it is *gated*.
2. **Setup a client can execute without tribal knowledge.** FE-1
   (`lake exe emitagents`) already specifies emitting `.mcp.json`,
   `.codex/config.toml`, `opencode.json`, `.vscode/mcp.json`, and `mcp/SETUP.md`
   with a **generated OWED list** (FRONTEND §8). Streaming adds exactly one row
   to that OWED list — "no push feed; poll `cas_word`" — and one HTTP-transport
   config variant for the daemon.
3. **A feed the client can follow.** §3.2.

No fourth thing is needed, and inventing one would be decision 2's exact
failure mode.

### 3.4 The extension posture — "a described kind + a manifest row, not a plugin API"

**The claim: a foldlab extension is a described kind plus a manifest row, not a
plugin API. This is right, and the argument is not aesthetic — it is that the
estate structurally cannot offer pi's kind of extension without giving up the
one thing it sells.**

**The argument, in four steps.**

*Step 1 — what pi's extension system actually costs.* pi's own docs print the
price: "Pi packages run with full system access. Extensions execute arbitrary
code, and skills can instruct the model to perform any action including running
executables" (`packages/coding-agent/docs/packages.md`, accessed 2026-08-29).
The mitigation is ordering — `project_trust` fires with only user-global and CLI
extensions participating, so project-local code cannot vote on whether
project-local code is trusted (§1.3). That ordering is elegant and it is still a
*trust* mechanism: the guarantee is "a human said yes", and it is exactly as
strong as that human's attention.

*Step 2 — why the estate cannot pay it.* The estate's entire differentiator is
that **the gates carry all trust** (R15) and admission is at `put`. FRONTEND's
own backed-claim list leads with "an agent cannot corrupt the store… a hostile
or buggy agent can be **refused**, and can waste bytes, but cannot make the
store answer content that does not hash to its name"
(`.staging/operational-structure/FRONTEND.md`, §5 claim 1). A third-party
TypeScript module executing inside the host process is precisely the thing that
claim does not cover: it runs *beside* the gates, not through them. Shipping a
plugin API would not weaken the theorem — it would move the product outside the
theorem's scope while the marketing stayed the same. That is the one failure the
estate's whole method exists to prevent.

*Step 3 — the estate already has two extension mechanisms, and both are content.*
This is the part that makes the posture a design rather than a refusal.

| pi's unit | The estate's existing analogue | Where it already lives |
|---|---|---|
| an extension registering a **tool** | a **program over the tool signature** — "the tool register IS a signature… code-mode plans become store-resident programs over that signature" (decision 18); "the fragment tower is the capability ladder" (decision 16) | `Cas/Backend/Mcp.lean` → `cas-tools.json`; `cas_run` / `cas_run_ref` |
| an extension registering a **renderer** | a **described kind + its emitted default viewer**, with an authored component as a *registered override against the same kind tag, never a fork* | `grammar/manifest.json`, `kindTags.ts` ("**is** the dispatch table"), the proposed `components.json` (FRONTEND §3) |
| an extension registering a **new data shape** | a **described kind** admitted through the schema doors | `SchemaAdmission.ts`, `schema-index.json`, `schema-verdicts.json` |
| a **pi package** (`package.json` + a `pi` key + convention discovery) | a **root whose declared closure is the extension**, published through §7 and discovered through `/projections` | `cas-http/0` §7; SERVING `/projections` |
| **trust** (a human clicks yes) | **admission** (the doors decide, and a refusal names its clause) | R15; `bin/cas.ts:31` |

Read the right-hand column as a whole and the posture states itself: the estate
already has registration (a manifest row), a surface (the signature), packaging
(a root and its closure), and discovery (`/projections`). Every one of them is
byte-gated and content-addressed. **What it does not have, and should not build,
is a place to put someone else's code.**

*Step 4 — what this buys that pi cannot.* A pi extension is a file path; its
identity is where it sits on disk and what the loader did with it. A foldlab
extension, on this posture, is content: it has an address derived from its own
bytes, a declared closure, an emitted manifest row, and a byte gate over that
row. Two installations that admitted the same extension hold the *same row*, by
`KvsBackend.ts:20-24`'s "re-insertion of identical bytes IS the identity". You
can ask what an extension will do before running it — `Cas.Lang.Envelope` is
computed from the table alone and `ProgProse` verbalizes it as a *projection*
(FRONTEND §5 claim 4). pi's answer to "what will this extension do" is "read the
TypeScript."

**Ronacher's line, translated.** "You ask the agent to extend itself"
(https://lucumr.pocoo.org/2026/1/31/pi/, accessed 2026-08-29) is the real
mechanism behind pi's reputation, and the estate's version is already ruled: the
agent extends the system by **submitting a program the gates admit** (decision
16, decision 18). pi buys malleability with trust; the estate buys it with
admission. Same benefit, different currency — and the estate's is the one that
survives a hostile author.

**The three honest costs of this posture, named rather than argued away.**

1. **There is no hook seat.** pi's deepest mechanism is that a handler's *return
   value* is the control channel — `tool_call` returning `{ block: true, reason
   }` is the entire permission system (§1.3). The estate's refusal families are
   the same instrument with the same shape (a value, not a subsystem, carrying
   its clause), but they are authored in Lean and closed by construction. A
   third party cannot add a refusal. That is a real expressiveness loss and it
   is the price of the closed family that makes the "I cannot show you this"
   rendering exhaustive (W-S2). **Ruling ask 6.4.**
2. **`prepareArguments` has no analogue.** pi declares the place where an old
   call shape is repaired without changing the published definition (§1.3). The
   estate emits `params`/`result` as `Cas.Schema.Ast` codes and has no migration
   shim; a manifest change is a `manifestVersion` event. Noted in §1.3 as a gap;
   still a gap; not obviously a want.
3. **Nothing here ships an extension *author* experience.** pi's story works
   because `jiti` means no build step and `ctx.reload()` means no restart. The
   estate's equivalent loop is `mise run gen` + a byte gate, which is correct and
   is not fast. Naming it is honest; solving it is not this note's business.

### 3.5 Decision-2 audit of everything above

| §3 element | Existing artifact it names | New abstraction? |
|---|---|---|
| the feed | `cas_word` / `WordE.since` / `WordSig` — decision 26 seat 3, `11-api-contract.md:454-503` | no — commissioned |
| the record shape | `bindingSchema` in `ConformanceVectorSchema.ts` | no — reused |
| the advisory rule | `cas-http/0` §6, §13 | no — ratified/planned |
| the push endpoint's home | `cas-http/0` §13 advisory event plane | no — planned, additive |
| the push endpoint's deadline | `cas-http/0` §10's deferred idle-progress deadline | no — deferred by name |
| self-description | `/projections/*` (SERVING; decision 32a) | no — released |
| client setup | FE-1 `lake exe emitagents` (FRONTEND §8) | no — specified |
| extension = kind + row | `grammar/manifest.json`, `kindTags.ts`, `SchemaAdmission.ts`, `components.json` (proposed) | no |
| extension = program | decisions 16 and 18; `cas_run` / `cas_run_ref` | no |
| extension distribution | `cas-http/0` §7 publish + declared closure | no |


---

## 4. The borrow list, ranked, with estate translations

Ranked by (value to the estate) × (cheapness), which in every case here means
*how much of the thing the estate already has*. Nothing below mints an
abstraction; each borrow is a discipline or a document form applied to an
artifact that exists.

### Borrow 1 — the telemetry vocabulary as a declared, versioned artifact with an adapter conformance suite

**Source:** `packages/telemetry/README.md` (§1.8) — `defineTelemetrySchema()` +
`createTypedSpanStarter()`, spans declaring start attributes and end attributes,
attribute metadata flags `sensitive` and `cardinality`, an explicit `version`
per schema, duplicate span names across composed schemas "rejected at compile
time", schemas "not merged, inspected, or retained at runtime", and
`createTelemetryAdapterConformance()` as runner-independent conformance cases
over `RecordedTelemetrySpan` snapshots.

**Estate translation.** SERVING's "Telemetry" table is today *prose*:
`cas.host.inflight`, `cas.host.calls`, `cas.host.refused`, `cas.store.sql_wait`,
`cas.daemon.request`, `cas.daemon.inflight`, `cas.daemon.rss_bytes`,
`cas.replica.age_ms`. Its metric ids are covered by SERVING's drift law and
`ServingDoc.test.ts`, which is already halfway to pi's position; the missing
half is that the *vocabulary itself* — attributes, their closed value sets,
their sensitivity, a version — is not an artifact anything emits. The same is
true of the logfmt field set (`seq`, `plane`, `method`, `path`, `status`, `ms`,
`refused`, `elapsedMs`, `lateMs`), which SERVING already declares STABLE and
warns that "renaming one is a versioning event."

**Why it ranks first.** Decision 20's hoover is specified to ingest those logs
"without guessing", and telemetry-hoover.md's own framing says "the hoover's job
is to make these one queryable plane, not to add instrumentation." A declared,
versioned telemetry vocabulary emitted from a described value — exactly the way
`cas-tools.json` is emitted from `Cas/Backend/Mcp.lean` — is the artifact that
makes "without guessing" true rather than aspirational. **Ruling ask 6.6.**

### Borrow 2 — the advisory/authoritative sentence, verbatim in shape

**Source:** `pi-protocol` — "Session and server snapshots are authoritative.
Progress events are transient UI hints and **must not be reduced into
authoritative state**." Restated client-side in `pi-client` as "progress events
do not mutate snapshot state optimistically."

**Estate translation.** This is the missing clause for `cas-http/0` §13's
"advisory event plane that never constitutes admission" — the profile names the
plane and its trust level but has no sentence a client can be *held to*. The
estate's version is stronger than pi's because it can be structural rather than
instructional: an advisory word notification need carry no bytes, and the
authoritative read re-digests (`Graph.verify`; `PathReader.ts:9-14`). Adopt the
shape when §13's first clause is written; §6 asks where.

**Cost: one paragraph in the profile, when the event plane is ruled.** Zero code.

### Borrow 3 — a conformance kit a third party can run against its own implementation

**Source, two independent instances.** `@earendil-works/pi-server/testing`
exports `createTestServer()`, `ProtocolTestClient`, and the transport-neutral
`WireChannel` contract for "deterministic protocol conformance tests" (§1.7).
And MCP's SEP-2484 makes a merged conformance scenario a **gate on
finalization**, with a `sep-NNNN.yaml` traceability file "mapping each MUST/MUST
NOT and SHOULD/SHOULD NOT in the SEP's Specification section to either a check
ID or a documented exclusion" — while explicitly *not* requiring SDK
implementations (§2.1).

**Estate translation.** `cas-http/0` is a document with roughly forty normative
clauses and no way for a third party to check an implementation against them.
The estate ships conformance vectors for its *semantics* (the Lean vectors that
are "the semantic authority behind every clause") and `ServingDoc.test.ts` for
its *documentation*, and nothing for its *wire*. The traceability form is the
one to steal: a table mapping each profile clause to the check that enforces it,
with "documented exclusion" as an admitted answer — which is precisely the
estate's own idiom of naming the shortfall as a field rather than hiding it
(FRONTEND §5 claim 6). This is also the artifact that would make "teach others
to speak ours" true at the wire, as `components.json` is meant to make it true
at the view.

**Cost: real.** A test kit plus a clause-to-check table. **Ruling ask 6.5.**

### Borrow 4 — the feature-lifecycle register, separate from the version number

**Source:** MCP's SEP-2596 — Active / Deprecated / Removed feature states with a
**minimum twelve-month deprecation window** (ninety days under an expedited
exception), published as a dated table naming, per feature, the revision it was
deprecated in and the earliest revision that may remove it
(https://modelcontextprotocol.io/specification/2026-07-28/deprecated, accessed
2026-08-29).

**Estate translation.** `cas-http/0` has an additive-only law and a
mint-`/1`-on-semantic-change law (§0), which covers *addition* and *change* but
has no vocabulary for *retirement*. Real cases already exist and are handled ad
hoc in prose: `maxBlobBytes` "renames to `maxNodeBytes` at `/1`" (§5); recipe
`0` (inline-leaf) is a "model substrate; no client implements it" (§12);
content-encoding is identity-only "at `/0`" (§1). A deprecation register beside
the profile — feature, deprecated-at revision, earliest-removal revision,
migration — costs one table and turns three scattered sentences into a
commitment. **Ruling ask 6.7.**

### Borrow 5 — the renunciation table, as a generated artifact

**Source:** pi's README publishes what it does **not** have with the alternative
for every row: MCP integration → build CLI tools with READMEs or write an
extension; sub-agents → tmux; plan mode → write to files; built-in todos →
`TODO.md`; permission popups → run containerized; background bash → tmux (§1.2).
Stated rationale: "Pi is aggressively extensible so it doesn't have to dictate
your workflow." `pi-server`'s README opens with its own: "Experimental… may
change or be removed without notice."

**Estate translation, and the reason this one is nearly free.** FE-1 already
specifies that `mcp/SETUP.md` carries "a **generated OWED list**" (FRONTEND §8;
`BOOTSTRAP.md:93`). Give that list pi's two-column shape — *what is absent* and
*what to do instead* — and the estate's honesty machinery becomes a consumer
document rather than an internal ledger:

| Absent | Do this instead |
|---|---|
| no push feed | poll `cas_word(since: next)`; the cursor is exact, so polling loses nothing but latency (§3.2) |
| no credentialed reads over HTTP | the daemon refuses a credential-gated store at boot (`daemon/CredentialedPolicyUndaemonable`); run it loopback behind your own proxy |
| MCP revision `2026-07-28` not offered | the host offers `2025-11-25` newest; a newer client is answered at the ceiling |
| no published package | clone the repo; `bun` and `mise` are presupposed (FE-B6, and `private: true` still stands on `main`) |
| no first-party pi integration | pi has no MCP; use the `cas` CLI from a pi skill (FRONTEND §4) |

The estate already computes every row. The borrow is the *form*, not the
content. **Cost: a column.**

### Borrow 6 — delta-only records with a declared reconstruction rule

**Source:** pi's `--mode json` — "`message_update` records are delta-only. They
omit both the cumulative `message` field and `assistantMessageEvent.partial` to
keep stream size linear", with `contentIndex` + `delta` as the reconstruction
rule and `usage` explicitly cumulative
(`packages/coding-agent/docs/json.md:87-89`, accessed 2026-08-29).

**Estate translation.** `cas_word`'s specified reply is already this shape —
`bindings` are the deltas, append is the rule, `next` is the cursor "returned so
the client never computes its own cursor", and `bindings` reuses the existing
`bindingSchema` so "the tool is new; not one document shape is"
(`11-api-contract.md:454-503`). The borrow is the *documented discipline*:
state, in the tool's doc line, that records are delta-only and name the
reconstruction rule. pi shows what happens when you do not — its own docs need a
paragraph explaining that `partial` is stripped.

**Cost: a doc line on a tool that is already commissioned.**

### Borrow 7 — the published schema as a release asset, and the integer version with a close rule

**Source:** ACP publishes `meta.json`, `schema.json` and their `.unstable`
variants as **release assets**, at a canonical
`.../releases/latest/download/schema.json` URL, and negotiates an integer
`protocolVersion` at `initialize` with an explicit failure rule: a client that
cannot speak the agent's version "SHOULD close the connection and inform the
user about it" (§2.3).

**Estate translation.** The estate emits `cas-tools.json` and serves it at
`/projections/cas-tools.json` (SERVING), which is the harder half already done —
a *live* self-description rather than a downloadable one. What is missing is the
stable, versioned, fetchable-without-a-daemon URL that an implementer reads
before writing any code. The `cas-http/0` profile's own capability document is
eight bytes and says nothing about the profile revision. **Cost: distribution
posture, which is already FE-B6's open question — do not re-open it here.**

### Borrow 8 — feature detection as an open set, over a fixed offered list

**Source:** Claude Agent SDK's `SDKSystemMessage.capabilities` — "names the
protocol behaviors this CLI implements, so you can feature-detect instead of
comparing version strings. It is an open set: ignore values you don't
recognize" (§2.5). Contrast pi's RPC mode, which states **no** protocol-version
field at all and tells clients to key off response success — "a real weakness and
the estate should not copy it" (§1.6).

**Estate translation, offered as a question rather than a want.** The host
answers with a fixed `offeredProtocols` list, newest first, and a client naming
an unknown revision "gets the first" (`bin/mcp/server.ts:124-133`). That is a
defensible design and it is about to be tested: `2026-07-28` replaces
`initialize` with `server/discover`, at which point the estate is *composing* an
answer rather than picking from a list, and the open-set shape becomes
available. Whether the estate ever wants open-set capability strings — against
its standing preference for closed families where order is identity (decision 4)
— is genuinely unsettled. **Ruling ask 6.8.**

### Borrows considered and placed lower, with the reason

- **`ctx.mode` / `ctx.hasUI` as one discriminant across run modes** (§1.3). The
  estate already holds the transport-independent half — "the same five tools the
  stdio host serves, same handlers, same manifest gate" (SERVING), and the gate
  is "transport-independent law" (`bin/mcp/http.ts`). There is no extension layer
  to extend it to (§3.4), so the borrow has no seat. Keep the sentence, not the
  mechanism.
- **Progressive disclosure of skills** — names and descriptions in the prompt,
  the full file read "using the ordinary `read` tool", no loading API (§1.5). The
  estate's analogue is `/projections/*` plus the plain-language lane, and MCP's
  roadmap is walking toward the same idea ("progressive discovery"). Nothing to
  do today; a good argument for `/projections` when the front end is designed.
- **`prepareArguments`** — the declared argument-migration shim (§1.3). Noted as
  a gap twice in this note; still not obviously a want, because the estate's
  answer to a changed call shape is a `manifestVersion` event, which is
  *stricter* and may simply be correct.
- **The session-as-tree-in-one-file format** (§1.4). The estate's word is the
  stronger object and is commissioned; copying pi's JSONL layout would be
  minting a second history.

---

## 5. Refusals — what the estate should not serve, and why

The estate's own idiom: a refusal names its clause.

1. **ACP.** Refused because the estate is not a coding agent. ACP's server role
   holds a session, streams `agent_message_chunk` and `agent_thought_chunk`,
   requests permission, and delegates filesystem and terminal work back to the
   editor (§2.3). Implementing it means building an agent, which is decision 2's
   exact prohibition and is not the product (decision 1). **And the reach is
   already bought:** all ACP agents MUST support stdio MCP servers and the editor
   forwards its configured servers to the agent, so `cas serve` reaches ACP's
   forty agents and several dozen editors today (§2.2). Serving MCP well *is*
   the ACP integration.
2. **AG-UI.** Refused because every event presumes a run and a conversation.
   `RUN_STARTED` / `TEXT_MESSAGE_*` / `REASONING_*` / `SUBAGENT_*` describe an
   agent turn; the daemon has admissions. Emitting them would mean fabricating a
   turn around a `cas_put` — a surface pretending to a semantics it does not
   have, which is the single failure this estate's method exists to prevent.
   Aggravating: **no spec version and no governance document** (§2.4, both
   PENDING), so there is nothing stable to conform to even if the shape fit.
3. **Vercel's UI Message Stream.** Refused because it is a chat-message stream
   and the estate has no chat. It is the best-engineered of the three UI-facing
   protocols and the only one with real third-party servers, so the refusal is
   about fit, not quality. Also declined as a *versioning* model: a single
   `v1` header while the part vocabulary demonstrably drifts across majors
   (Pydantic AI's `sdk_version=5|6` switch is the proof) is weaker than
   `cas-http/0`'s mint-`/1`-on-semantic-change law, and the docs carry no
   stability statement at all — "currently supported" (§2.5).
4. **A2A.** Refused on the same clause as ACP: the estate is not an agent
   (§2.6).
5. **The OpenAI and Anthropic agent-SDK transports.** Refused because **there is
   nothing to serve.** The OpenAI Agents SDK defines no wire format; its events
   are in-process objects wrapping the Responses API's SSE vocabulary, which is
   a vendor endpoint contract (§2.5). The Claude Agent SDK's `stream-json` is a
   real, documented subprocess format, but it is the format for *driving an
   agent*, and the estate is a tool an agent calls. Neither has a third-party
   implementer. Serving either would be dressing as a vendor.
6. **MCP `subscriptions/listen` on `/mcp`, at this pin.** Refused for now, on
   three grounds. The estate's toolkit declares **tools only** (`Toolkit.make`
   over `casToolkit`), so subscriptions would require declaring a `resources`
   capability and minting a resource URI space the estate has never had. The
   pinned adapter implements no GET SSE stream and no resumption at all
   (SERVING). And the ratified mechanism **holds no state across reconnections**
   and offers no cursor (§2.1) — strictly worse than `cas_word(since: n)` for the
   one thing the estate wants to stream. Revisit when the `2026-07-28` adapter
   lands, and revisit as *transport*, never as the authority.
7. **A plugin API — a place to load third-party code into the host.** Refused
   under R15 and decision 2. The full argument is §3.4; the clause is that the
   gates carry all trust and code running beside the gates is outside the
   theorem that the whole product rests on.
8. **A bespoke websocket or GraphQL surface for the word.** Refused under
   decision 2 and the profile's own law. If a push feed is ruled, its home is
   `cas-http/0` §13's advisory event plane on the daemon's existing port, in the
   profile's existing binary framing, under the profile's existing versioning
   law. A second wire language would mean a second thing to gate, a second thing
   to document, and a second spelling of "something was admitted" — the exact
   condition `Mcp.lean:17-19`'s "no second spelling" rules out one level down.
9. **pi's RPC framing, as a model.** The RPC mode is well-specified at the byte
   level — "strict JSONL semantics with LF (`\n`) as the only record delimiter",
   with the warning that Node's `readline` "is not protocol-compliant… because
   it also splits on `U+2028` and `U+2029`, which are valid inside JSON strings"
   (`packages/coding-agent/docs/rpc.md:30,37`, accessed 2026-08-29). That
   *specificity* is admirable and is borrowed in spirit. What is refused is the
   surrounding posture: no protocol-version field, clients told to key off
   response success, and — on the binary protocol — "experimental and has no
   compatibility guarantees" (§1.7). The estate's versioning law is the better
   half of that trade and is not up for exchange.

---

## 6. Open ruling asks

Streaming- and integration-specific. FRONTEND §7's eleven asks are **not**
repeated here; where one is adjacent it is cross-referenced.

**6.1 — Sequencing: pull first, push behind its own ruling.**
Ratify that `cas_word(since)` lands as an ordinary tool (decision 26 seat 3,
`11-api-contract.md:454-503`) and that the first shipped "live" surface is a
client polling it, with server push treated as a later, additive, separately
ruled optimization. *Recommended: yes.* The argument is §3.2's: push buys
latency, not capability, and the cursor — not the pipe — is what makes the
estate's story better than every protocol in §2.

**6.2 — Where a push feed lives, when it is ruled.**
`cas-http/0` §13's advisory event plane, additive on the daemon's existing port,
in the profile's binary framing, under §10's deferred idle-progress deadline —
**not** `/mcp`. *Recommended: the profile.* §5.6 carries the reasons. This ask
is about committing the *home* now, so the eventual slice is not a design
question.

**6.3 — The advisory clause.**
Adopt borrow 2's sentence into `cas-http/0` §13 when its first clause is
written: pushed events are advisory, admit nothing, and are never reduced into
authoritative state; the authoritative read is `cas_word` / `cas_load`, which
re-digests. *Recommended: yes.* Costs one paragraph.

**6.4 — Does a third party ever get to add a refusal?**
The sharpest expressiveness question this study raises. pi's permission system
*is* a handler return value — `tool_call` → `{ block: true, reason }` — which is
the estate's "refusal is a value" posture with a third-party seat attached
(§1.3). The estate's refusal families are closed by construction, which is what
makes the "I cannot show you this" rendering exhaustive rather than a fallback
(W-S2), and closing them is the reason the front end can be total.
*Recommended: no — keep the families closed, and say so in the renunciation
table (borrow 5) rather than leaving it implicit.* But it should be ruled
out loud, because "extensible" will be asked for and the answer needs a clause.

**6.5 — A conformance kit for `cas-http/0`.**
Commission or decline borrow 3: a clause-to-check traceability table over the
profile plus a runnable kit a third-party implementer can point at its own
server. Two independent ecosystems (pi, MCP) treat this as the maturity marker,
and MCP now makes it a *gate*. *Recommended: commission, sized and sequenced
after the daemon's release wave* — it is real work and it is the artifact that
turns "the wire profile" into "a wire other people can implement."

**6.6 — The telemetry vocabulary as an emitted artifact.**
Borrow 1. Decision 20's hoover is specified to ingest the log stream "without
guessing"; today the vocabulary is prose in SERVING with a drift test over its
ids. Rule whether the metric and log vocabularies become an emitted, versioned,
byte-gated artifact on the `cas-tools.json` pattern. *Recommended: yes, as a
dependency of decision 20 rather than a lane of its own.*

**6.7 — A deprecation register on the profile.**
Borrow 4. `cas-http/0` can add and can mint `/1`; it has no vocabulary for
retiring a feature, and three cases are already handled ad hoc in prose
(`maxBlobBytes`→`maxNodeBytes`, recipe `0`, identity-only content-encoding).
*Recommended: yes; one table, adjacent to the profile.* Note this interacts with
decision 32(c)'s additive §14 co-tenancy clause, which is **not yet in the file
on `main`** — the profile currently ends at §13 (verified 2026-08-29).

**6.8 — Fixed offered list, or open-set capabilities?**
Borrow 8. The host answers with `offeredProtocols`, newest-first, unknown-gets-
first. MCP `2026-07-28` replaces `initialize` with `server/discover`, at which
point the host composes its answer rather than picking from a list, and the
open-set shape (Claude Agent SDK's `capabilities`, "ignore values you don't
recognize") becomes available. It sits against the estate's standing preference
for closed families where order is identity (decision 4). *No recommendation —
genuinely unsettled, and it should be decided with the adapter, not before it.*

**6.9 — Protocol currency, with one new piece of evidence.**
FRONTEND ask 10 already asks whether the host adds `2026-07-28` or declares the
`2025-11-25` ceiling a stated pin. This note adds evidence rather than a new
ask: the revision is confirmed ratified and confirmed a breaking rewrite (§2.1),
**and no primary source names a single client that implements it** — every
vendor doc still describes transports in session-era terms (§2.2, marked
PENDING). *Recommendation to FRONTEND ask 10: declare the ceiling, keep the
OWED row, and re-check client adoption before spending an adapter.*

**6.10 — Does the estate ever ship an ACP agent adapter?**
*Recommended: no*, per §5.1 — and the reason should be written into the BYOA
matrix rather than left as an omission, because "why don't you support ACP" is
the obvious question and the answer is good: ACP's forty agents already reach
`cas` through MCP pass-through, at zero cost, because stdio MCP support is
mandatory for ACP agents (§2.2, §2.3).

**6.11 — Provenance filing before promotion.**
Every external claim in this note carries an inline URL and read date (C6's
explicit-mark branch). `.reference/provenance/` today holds repository and paper
locks — `sources.lock.json`, `papers.lock.json`, `fips202.lock.json` — and has
no home for web-document pins. If this note is ever promoted out of `.staging/`,
either a web-pin lock exists or the promotion is refused. *Ask: rule whether web
docs get a lock file, or whether notes of this kind stay pre-grade permanently.*

---

## 7. Two observations the record should absorb

Neither is an ask; both are facts this study turned up in the estate itself.

1. **SERVING.md says "the same five tools the stdio host serves." There are
   six.** `cas-tools.json` carries `cas_put`, `cas_load`, `cas_run`,
   `cas_run_ref`, `cas_publish_root`, `cas_list_roots` — identical on `main` and
   on `merge/daemon-spine`, and identical between `library/cas/mcp/` and
   `library/effects/mcp/` (verified 2026-08-29). SERVING's drift law enumerates
   the vocabularies `ServingDoc.test.ts` re-derives — "routes, policy fields,
   offered protocol revisions, metric ids, projection names, log fields" — and
   the tool *count* is not among them, so this is a stale sentence rather than a
   red gate. It is the kind of sentence the drift law exists to kill.
2. **Decision 32's (b) and (c) have not landed.** SERVING.md is at
   `docs/lab-core/SERVING.md` on `merge/daemon-spine`, not promoted to
   Category 1 beside its siblings in `library/effects/`; and
   `PROFILE-CAS-HTTP-0.md` on `main` ends at §13 with no additive §14 co-tenancy
   clause (both verified 2026-08-29). §3 of this note cites both files at their
   current locations; if 32(b) lands, every SERVING path here moves.
