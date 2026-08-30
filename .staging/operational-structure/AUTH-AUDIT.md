# AUTH-AUDIT — the refuse-first posture, audited against the code

Status: pre-grade audit, 2026-08-29. Decision 31(c). Audited against
`merge/daemon-spine` at `0aeeefd7` in a scratch worktree; the estate
tree was not modified.

The ratified posture under audit, from
[docs/lab-core/SERVING.md](../../docs/lab-core/SERVING.md) (operational
law, decision 26 seat 1):

- loopback-default binds; `--host 0.0.0.0` is an explicit act
- `anonymousReads: false` REFUSES at boot, on both hosts
- credentialed HTTP is a named non-goal until a TLS-proxied slice
- no plaintext credential handling

**Grades.** BROKEN-SILENT — the posture is defeated and nothing says
so. DRIFT — code and the document disagree. DECLARED-LIMIT — a gap the
estate already names out loud. CLEAN — the code keeps the ruling.

**Findings carried in, not re-derived** (tonight's daemon correctness
review): **S1** case-sensitive Host/Origin allowlists, being fixed on
`merge/daemon-spine`; **S6** MCP session map unbounded-but-documented;
**S4** boot-failure rendering. This audit covers the rest, and adds one
note to S1 for the lane that owns it (§A9).

**Method.** Reading, plus four live probes against a real `cas daemon`
on an ephemeral store. Every finding graded BROKEN-SILENT below was
reproduced, not inferred; the transcripts are quoted inline.

---

## A. The daemon

### A1. Every path to a non-loopback bind — CLEAN

Required (SERVING.md, security posture): "Bind loopback by default.
`--host 0.0.0.0` is an explicit act, and belongs behind the proxy."

The bind address has exactly one source. `bin/cli/daemon.ts:126-131`
declares `--host` with `Flag.withDefault("127.0.0.1")` and **no**
`withFallbackConfig`, so no environment variable reaches it. The only
env var in the whole CLI is `CAS_STORE` (`bin/cli/daemon.ts:68`,
`bin/cli/commands.ts:96`), which names the store, not the address.
`StoreConfig` (`bin/cli/store.ts:83-87`) carries `backend`, `serve`,
and `backup` — there is no host field, so `config.json` cannot widen
the bind either. The value threads unmodified to
`BunHttpServer.layer({ hostname: options.host })`
(`bin/mcp/http.ts:908`).

**Verdict: CLEAN.** Widening the bind requires `--host` on the command
line. Nothing else can do it.

Worth recording as unearned hardening: even under `--host 0.0.0.0`,
the Host allowlist is built from loopback plus `hostName(bindHost)`
plus `--allow-host` (`bin/mcp/http.ts:532-536`), so a browser arriving
by LAN address sends `Host: 192.168.x.y` and is refused 403 at
`bin/mcp/http.ts:465`. A non-browser client that sends
`Host: 127.0.0.1` passes. The exposure under `0.0.0.0` is therefore
real but narrower than the flag suggests — a declared limit, correctly
declared.

### A2. Boot-refusal ordering — CLEAN

`layerDaemon` (`bin/mcp/http.ts:866-870`) runs `gateOnManifest` and
then `applyDaemonPolicy` inside the effect that `Layer.unwrap`
evaluates *before* constructing `HttpRouter.serve` and
`BunHttpServer.layer`. A refused policy therefore fails before
anything binds a port. Confirmed in probe A below: the refusal fired
with no listener created.

### A3. `anonymousReads: false` defeated by an unreadable config — BROKEN-SILENT

Required (SERVING.md, `ServePolicy` table): `anonymousReads: false`
→ "REFUSES at boot" on both hosts. This is the load-bearing sentence
of the entire refuse-first posture.

The refusal itself is correct. `applyDaemonPolicy`
(`bin/mcp/http.ts:305-312`) raises
`daemon/CredentialedPolicyUndaemonable` when
`policy.anonymousReads` is false, and the stdio host has the twin
refusal at `bin/mcp/server.ts:191-193`.

The defect is upstream, in how the policy is obtained.
`bin/cli/store.ts:261-265`:

```ts
const raw = yield* fs.readFileString(location.configPath).pipe(
  Effect.asSome,
  Effect.orElseSucceed(() => Option.none<string>()),
)
if (Option.isNone(raw)) return Option.none()
```

`Effect.orElseSucceed` collapses the *entire* error channel of
`readFileString` — `EACCES`, `EISDIR`, `EIO`, `ELOOP`, `ENOTDIR` — into
the same `Option.none()` that means "the file is not there". That
`None` flows through `bin/cli/daemon.ts:105-107` into
`policyOrDefault` (`bin/mcp/server.ts:308-310`), which answers
`defaultServePolicy` — and `bin/cli/store.ts:103-109` sets
`anonymousReads: true`.

So a store whose `config.json` says `anonymousReads: false` is served
**open** whenever that file cannot be read, rather than refused.

This contradicts the function's own docstring at
`bin/cli/store.ts:240-243`: "A present-but-invalid config is a typed
refusal, never a silent default."

**Reproduced.** One store, one `config.json` carrying
`anonymousReads: false`, three conditions:

```
A  config readable            configFound=true   anonymousReads=false
   → REFUSED AT BOOT: daemon/CredentialedPolicyUndaemonable
B  same file, chmod 000       configFound=false  anonymousReads=true
   → DAEMON BINDS AND SERVES OPEN on port 8080
C  config replaced by a dir   configFound=false  anonymousReads=true
   → DAEMON BINDS AND SERVES OPEN on port 8080
D  malformed JSON             → REFUSED AT BOOT: cli/ConfigUnreadable
```

Case D matters: the *parse* path refuses correctly and typed. The
swallow is specific to the **read**, which is why the docstring's
claim reads as true to anyone testing it with a broken JSON file.

**Silent in three places at once.** There is no warning log. The
`store opened` line (`bin/cli/daemon.ts:102-104`) reports only the
store path and origin, never whether a config was found. The
`serve policy applied` line (`bin/mcp/http.ts:326-337`) then prints
the *default* policy as though it were the store's own. And the
diagnostic verb misreports too: `bin/cli/commands.ts:831-834` carries
the comment "`readConfig` has already refused the invocation if it
does not [read]" — false — and `bin/cli/commands.ts:835` prints
`config  none` for a config that exists and is merely unreadable.

**Both hosts.** `cas serve` takes the identical path at
`bin/cli/commands.ts:737-744`.

**Verdict: BROKEN-SILENT.** The one ruling this audit exists to check
is defeated by a filesystem condition, with no adversary, no flag, and
no output.

### A4. `--allow-host` silently grants browser-origin trust — BROKEN-SILENT

Required (SERVING.md, security posture): "Origin allowlist, empty by
default. Any request carrying an `Origin` outside `--allow-origin`
answers 403 on every plane." Restated in the CLI help at
`bin/cli/daemon.ts:180`: "browser requests are refused unless their
origin is named with `--allow-origin`". `--allow-host` is documented
purely as a Host-header control for the front proxy
(`bin/cli/daemon.ts:152-154`; SERVING.md's proxy section).

The front door's same-origin shortcut (`bin/mcp/http.ts:475-479`)
passes any request whose Origin's host half equals the *already
Host-validated* Host header, with no allowlist entry:

```ts
const sameOrigin = origin !== undefined
  && host !== undefined
  && originHost(origin) === host
if (origin !== undefined && !sameOrigin && !allowedOrigins.has(origin)) {
  return { _tag: "RefusedOrigin", origin }
}
```

Because `--allow-host` widens the Host set
(`bin/mcp/http.ts:532-536`), it transitively widens **origin** trust.
The two flags are not independent, and nothing says so.

**Reproduced.** `cas daemon --port 18099 --allow-host evil.test`, with
no `--allow-origin` whatsoever. The startup banner reported:

```
address=http://127.0.0.1:18099  origins="none (every browser Origin refused)"  extraHosts=evil.test
```

Against that daemon:

```
T1  Host: attacker.test  Origin: http://attacker.test  GET /projections   → 403
T2  Host: evil.test      Origin: http://evil.test      GET /projections   → 200
T3  T2 response headers: Access-Control-Allow-Origin: http://evil.test
                         Access-Control-Expose-Headers: mcp-session-id, ...
W1  Host: evil.test      Origin: http://evil.test      PUT /cas/{addr}    → 201
W2  bytes on disk: livestore/objects/bf/254c7a…c336e3a4fc71
W3  Host: attacker.test  Origin: http://attacker.test  PUT /cas/{addr}    → 403
```

A browser origin the operator never allowed obtained a real CORS grant
and **wrote bytes into the store**, while the daemon's own banner
reported that every browser Origin was being refused.

Three aggravating details:

- **The banner is actively false.** `bin/mcp/http.ts:822-824` renders
  the `--allow-origin` list, not the effective origin admission. The
  operator's only view of the posture misreports it.
- **Scheme-blind.** `originHost` (`bin/mcp/http.ts:449-452`) strips
  the scheme, so `http://X` and `https://X` are one origin to the
  door. Behind the TLS proxy SERVING.md prescribes, a cleartext page
  at the proxy's own name inherits full trust — which is precisely the
  position an on-path attacker can manufacture.
- **The tool plane is protected; the byte plane is not.** `/mcp` is
  additionally guarded by the adapter's static origin list
  (`bin/mcp/http.ts:878-888`), which does *not* receive the
  `--allow-host` names — defence in depth holds there. The cas-http/0
  plane, which carries `PUT /cas/{hex}` and `PUT /roots/{hex}`
  (`src/server/Protocol.ts:246-268`), has no second check. The write
  verbs sit on the unguarded plane.

**Verdict: BROKEN-SILENT.**

### A5. CORS reflection details — CLEAN, with one DRIFT

- **Credentials flag: absent.** No `access-control-allow-credentials`
  is emitted anywhere — not in `corsHeaders`
  (`bin/mcp/http.ts:509-513`), not in `preflightResponse`
  (`bin/mcp/http.ts:492-504`). Browsers therefore will not attach
  cookies or `Authorization` to cross-origin calls. Correct, and the
  right default for a host that serves no credentialed flow. CLEAN.
- **No blanket reflection.** `access-control-allow-origin` echoes the
  request origin only after set membership or the same-origin test,
  never unconditionally. CLEAN — subject entirely to A4.
- **`null` origin: refused.** `originHost("null")` returns `"null"`
  (documented at `bin/mcp/http.ts:445-448`), which can never equal a
  Host header and is matched only by an explicit `--allow-origin null`.
  Sandboxed iframes and `file://` pages are refused by default. CLEAN.
- **DRIFT (minor):** the preflight reflects
  `access-control-request-headers` verbatim
  (`bin/mcp/http.ts:499-500`) but `vary` names only `origin`
  (`bin/mcp/http.ts:502`). A shared cache can serve one origin's
  allow-headers to another. Add `access-control-request-headers` to
  `vary`.
- Noted, not faulted: the preflight advertises
  `GET, PUT, POST, OPTIONS` (`bin/mcp/http.ts:498`) — the write verbs
  — to every admitted origin. That is honest about what the plane
  serves; see §D for whether it should.

### A6. `/metrics` content exposure — DECLARED-LIMIT

Route registered at `bin/mcp/http.ts:186, 891`, unauthenticated on the
same port. Scraped live: the exposition carries only aggregate series
(`cas_daemon_request`, `cas_daemon_inflight`, `cas_daemon_rss_bytes`,
`cas_host_calls`, `cas_replica_age_ms`) with `plane`, `tool`, and
`outcome` labels. **No content addresses, no store contents, no
filesystem paths, no store identity.** The information disclosed is
operational shape — request rates, latencies, memory.

SERVING.md's route table declares `/metrics` as host surface. The
whole control is the loopback bind. **DECLARED-LIMIT** — with the
standing caveat that it inherits every widening in A1 and A4.

### A7. `/projections` vs the tier-0 ruling — CLEAN, one exposure note

Required: SERVING.md's route table — "the emitted, byte-gated JSON
artifacts, served read-only — tier 0 of the front end". FRONTEND.md:78
and :116 rule tier 0 as a static read surface.

`bin/mcp/http.ts:628-659` registers **only** `router.add("GET", …)`,
one route per statically-named file from `projectionSources`
(`bin/mcp/http.ts:606-615`), plus a GET index. There is no path
parameter anywhere, so **path traversal is structurally impossible** —
the route table is a fixed enumeration, not a file server. Absent
files answer 404 (`bin/mcp/http.ts:637`). No POST/PUT/PATCH/DELETE
route exists on `/projections`.

**Verdict: CLEAN.** The code keeps the ruling exactly.

One content note for the record: `environment.json`
(`bin/mcp/http.ts:614`) serves `docs/lab-core/ENVIRONMENT.json` — 37 KB
describing the estate's full build topology: task graph, Lean
executable roots, and the verbatim `lake env sh -c …` gate commands.
Verified free of credentials, usernames, and host filesystem paths. It
is a declared tier-0 projection and is not a defect; it is named here
because it is the repo's internal build graph, and it is the one
projection worth re-ruling before the daemon is ever exposed beyond
loopback (see R4).

Also noted: `Effect.orElseSucceed(() => 404)` at `bin/mcp/http.ts:637`
flattens permission and I/O errors into "absent" — the same idiom as
A3. Benign here (a projection is public), but it is the same habit,
and A3 is where it costs.

### A8. Any flag combination that serves a credentialed store — CLEAN

There is no `--anonymous`, no `--insecure`, no `--no-auth`, and no
flag or environment variable that overrides `anonymousReads`. The
policy is read from `config.json` and from nowhere else. The only way
to serve a store whose policy gates reads is to edit that file — or to
make it unreadable, which is A3. **The flag surface is clean; the
filesystem is the hole.**

### A9. One note for the S1 lane

S1 (case-sensitive Host/Origin allowlists) is being fixed on this
branch and is not re-derived here. One observation for whoever lands
it: as written, case-sensitivity is **fail-closed** at both checks — an
uppercase `Host` misses `allowedHosts` (`bin/mcp/http.ts:465`) and an
uppercase `Origin` misses `allowedOrigins` (`bin/mcp/http.ts:478`), so
both refuse. It is an availability defect, not a bypass.

But the same-origin shortcut at `bin/mcp/http.ts:477` compares two raw
header strings. **Lowercasing only the allowlist lookups, and not both
sides of that comparison, converts a fail-closed defect into a
fail-open one.** Worth stating on that ticket.

---

## B. The stdio host

What stdio assumes, stated by the code itself
(`bin/mcp/server.ts:60-65`):

> `anonymousReads` / `credentialEnv` — NOT APPLICABLE, and this is the
> one that REFUSES rather than warns. Over stdio the peer is the
> process that launched this one; there is no wire to present a
> credential on and nothing to check it against.

The trust assumed is process ancestry: whoever spawned the host is the
peer, and the launcher owns the lifecycle. The refusal is implemented
at `bin/mcp/server.ts:135-149` and `:191-193`.

Does any doc claim more? No. SERVING.md's host table says "local
agents; the launcher owns the lifecycle; per-client process
containment" — corroborated by the composition, which binds nothing
(`port` explicitly ruled not-applicable at `bin/mcp/server.ts:54-55`).
`maxBatchKeys` is refused as not-applicable rather than silently
honored (`bin/mcp/server.ts:56-59`). The register is honest
throughout; the host claims exactly the trust it has.

**Verdict: CLEAN on its own terms — but it inherits A3.**
`bin/cli/commands.ts:737-744` obtains its policy through the same
swallowing `readConfig`, so an unreadable config serves a gated store
open over stdio too. The consequence is milder (the peer is a child
process, not a network) but the gate is defeated identically.

---

## C. Secrets

### C1. `turso_tok.md` — never committed; rotation owed and urgent

Confirmed four ways, including a scan of **every blob in the shared
object store** (23,466 objects) across every ref:

| Check | Result |
|---|---|
| Tracked? | **No** — `git ls-files --error-unmatch` finds nothing |
| Gitignored? | **Yes** — `.gitignore:33`, rule `/turso_tok.md` |
| Ever committed, any ref, any era? | **No** — zero matches for the endpoint host, the domain, or the payload UUIDs |

The credential itself, characterized without printing it: one
Ed25519-signed JWT (`alg: EdDSA`), payload claim `a: "rw"` —
**read-write** authority on the database — issued
2026-08-29T09:48:37Z, alongside a `libsql://` endpoint URL that
carries no embedded credential. **There is no `exp` claim and no
`nbf`.** The token does not expire; it is valid until manually revoked
or the signing key is rotated. The file is mode `-rw-r--r--`,
world-readable plaintext, in a directory that agents, editors, and
backup tools all traverse.

`.gitignore:30-32` already states the correct assessment in the
repository's own voice — ignoring is containment, not security.

**Rotation is owed, and the missing `exp` is what makes it urgent
rather than routine:** a non-expiring read-write database credential
has no natural end. Rotate it, and hold the replacement outside the
repository (keychain or `~/.config`). This is the operator's action —
not one an agent should take.

**Verdict: CLEAN as a repository finding; the live credential is a
standing operator obligation.**

### C2. Tracked tree and full history — CLEAN

Every credential pattern swept across 1,231 tracked files and, for
history, across every ref including the discarded pre-reinit era
(`backup/pre-reinit-main`, 955 commits, confirmed not an ancestor of
`main`). Negative results, explicitly:

| Pattern | Tracked | History |
|---|---|---|
| `eyJ…` JWT | 0 | 0 real (7 pickaxe hits, all the Lean identifier `keyJson` or base64 inside binary media) |
| `://user:pass@` | 0 | 0 |
| `AKIA`, `ghp_`, `github_pat_`, `xox?-`, `AIza`, `sk-`/`sk-ant-` | 0 | 0 |
| `-----BEGIN … PRIVATE KEY` | 0 | 0 |
| `.env`, `.pem`, `.key`, `id_rsa`, `.p12`, `.npmrc`, `.netrc` ever added | — | **0 on any ref** |

`mise.toml`, `annex/coq/mise.toml`, the experiment `mise.toml` files,
`docs/lab-core/ENVIRONMENT.json`, and
`.github/workflows/check.yml` are all clean. No `.env*` file is
tracked anywhere in the repository.

The only credential-shaped strings in the tree are a placeholder
(`archive/remote-plane/test/server/CasServer.test.ts:222`,
`Bearer open-sesame`) and a test peer that records `Authorization`
headers with no literals
(`archive/remote-plane/test/remote/harness/CredentialPeer.ts`).

**Verdict: CLEAN. No secret has ever been committed to this
repository, in either history era.**

### C3. `.gitignore` credential coverage — DRIFT

One credential rule exists, `.gitignore:33`, anchored and
exact-filename. Probed with `git check-ignore -v`, these would all be
committed by a `git add -A`:

- `.env`, `.env.local`, `env.local` — **no dotenv rule at root**
- `turso_tok.txt`, `docs/turso_tok.md`, `turso_tok.md.bak` — the
  anchor and extension make the one rule brittle
- `secrets.json`, `credentials.json`, `id_rsa`, `key.pem`, `.npmrc`,
  `.netrc`

The sharpest edge: `.gitignore:4-12` deliberately **allowlists** `.md`
under `.staging/` to depth 3, so `.staging/creds.md` and
`.staging/notes/turso_tok.md` are tracked, not ignored. Given how
freely this estate drops session notes into `.staging/`, that is the
most probable future leak path — and the reason C2's clean result
should not be read as a standing guarantee.

### C4. `backup.target` logged unredacted — DRIFT, conditional

`bin/mcp/http.ts:772-777` annotates the raw `backup.target` string
into the daemon's stable log stream — and does so specifically in the
**remote-scheme branch**, which is the only branch where the URL can
carry embedded credentials (the local branch is a filesystem path by
construction, `bin/mcp/http.ts:690-692`). The same value is echoed by
`cas status` at `bin/cli/commands.ts:258-259` and `:301-303`.

The schema permits it: `backup.target` is a free-form
`Schema.String` (`bin/cli/store.ts:86`). Litestream's own idiom keeps
credentials in environment variables with a bare `s3://bucket/path`
URL, so this is a possible rather than typical shape — but SERVING.md
declares the log stream stable and hoovered, so an embedded secret
would be ingested. Log the scheme only; the message's entire purpose
is to say "this is remote, scrape litestream's endpoint instead".

### C5. An existing audit miscounts the token — DRIFT

`.staging/operational-structure/PAPERWORK-AND-PROJECTION-AUDIT.md:125`
records "two JWT-shaped tokens". There is **one**. The file contains
two occurrences of `eyJ` because both the header and the payload
segment of the same JWT base64url-encode a leading `{"`. Worth
correcting so remediation does not hunt for a second credential that
does not exist.

---

## D. The browser tier

Required: FRONTEND.md:81 rules tier 1 read-only; :92 gives the ground
— "A writing browser store is a **second admission authority**, running
the estate's only gate in the least-controlled, least-versioned
process in the system"; :330 names a browser that writes as explicitly
out of scope.

**What exists.** `experiments/workbench/` is the only browser artifact
in the repository — verified by sweeping the whole tree for `*.html`,
`*.tsx`, `*.jsx`, `*.svelte`, `*.vue` and for any directory named
`workbench|frontend|web|ui|app|viewer|explorer|dashboard`. Five source
modules, roughly 330 lines. Swept for `fetch(`, `XMLHttpRequest`,
`axios`, `WebSocket`, `EventSource`, `sendBeacon`, `POST`/`PUT`/
`PATCH`/`DELETE`, `<form`, `onSubmit`, `localStorage`,
`sessionStorage`, `indexedDB`, `/mcp`, `/control`, `/roots`,
`/projections`, `publish`, `upload`, `cas_`: **one hit, and it is
prose** (`experiments/workbench/README.md:23`).

The app renders one button whose only seam is `layerUnwired`, hardwired
to refuse (`experiments/workbench/src/store/seam.ts:44-50`).
`vite.config.ts` configures no proxy and says so. Its README states
the invariant at :133-136 — no module in `src/` names a URL, a socket,
a database, or a credential — and the code corroborates it exactly.

**Verdict: CLEAN today — but clean by absence of code, not by
enforcement.** Which is the finding:

**D-gap — the read-only tier has no mechanism — DRIFT.** The daemon
serves the toolkit unfiltered: `bin/mcp/http.ts:369` passes
`McpServer.toolkit(casToolkit)` — "the SAME `casToolkit` the stdio host
serves" (`bin/mcp/http.ts:24`). Of the six tools in
`bin/mcp/tools.ts:302-309`, **four are writes** and declare it
themselves via `Tool.Readonly: false` — `cas_put`, `cas_run`,
`cas_run_ref`, `cas_publish_root`. There is no per-transport and no
per-origin tool filtering anywhere in `bin/mcp/http.ts`.

So `--allow-origin` is not a read grant; it is a **full read-write
grant**, on a plane the ruling calls read-only. Compounded by A4,
`--allow-host` is one too, and §A4's probe W1 exercised exactly that
path to a 201. If tier 1's read-only status is to be load-bearing
rather than aspirational, it needs a mechanism — see R1.

**Stale by one:** FRONTEND.md:109 and :122 describe the tool table as
five tools; the emitted manifest carries six.

---

## E. Litestream

`library/effects/scripts/litestream-check.ts` — the only
litestream-named file tracked in the repository.

- **Replica credentials: none reside in the script.** It reads three
  positional argv values (`:159`) and has **no `process.env` access at
  all**. The litestream binary is deliberately kept outside it
  (`:20-24`): the shell drives `replicate`/`restore`, so credentials,
  where they exist, are the operator's shell environment.
- **Does it print them: no.** Every output path traced. `:124-126` and
  `:154-156` log counts and the local database path. `:105-107` dies
  with a vector name and two content addresses. `:149-151` dies with
  two integers. `:172` echoes the `mode` argv. The widest path,
  `:174-178`, dumps the whole error object — which can carry the local
  SQLite path from `SqliteClient.layer({ filename })` (`:64`), but
  **no replica URL is ever in scope in that process**, because the
  script is never given one.
- **Does it write them: no.** One write, `:123`, a manifest of content
  addresses and roots (`:86-89`).
- **Config files: none exist.** No `litestream.yml` or equivalent,
  tracked or untracked, anywhere in the repository.

**Verdict: CLEAN on every axis asked.** The credential-shaped sink is
next door, in the daemon — see C4.

---

## F. CI

`.github/workflows/check.yml` is the only workflow file; there is no
`dependabot.yml`, no composite action, no reusable workflow.

- **Triggers — CLEAN.** `:77-81` is `push` on `main`, `pull_request`,
  `workflow_dispatch`. **No `pull_request_target`, no `workflow_run`,
  no `issue_comment`.** Both checkouts (`:100`, `:120`) are bare
  `actions/checkout@v4` with no `ref:`, so PR runs use the
  GitHub-provided merge ref under the unprivileged fork token. The
  classic pwn-the-repo pattern is absent.
- **Secrets — CLEAN.** No `secrets.*` reference anywhere in the file.
  No `GITHUB_TOKEN` reference. Nothing for contributor code to reach.
- **Token scopes — DRIFT.** There is **no `permissions:` block**,
  neither top-level nor per-job. `GITHUB_TOKEN` therefore falls back
  to the repository default, which for older repositories is
  read-write across all scopes. Nothing uses the token beyond
  checkout today, so the blast radius is currently small — but see the
  next point for why it should not stay implicit.
- **PR code does execute on the runner — informational.** `:167-173`
  runs `bun install --frozen-lockfile` in three trees before
  `mise run check:ci`, and `library/effects/package.json:52` declares
  `"prepare": "bun scripts/patch-toolchain.ts"`. A package's own
  lifecycle script always runs; dependency lifecycle scripts stay
  blocked by Bun's default (no `trustedDependencies` key exists). So a
  pull request can execute code on the runner. Contained today by the
  unprivileged token, the absence of secrets, and GitHub-hosted
  runners (`:97`, `:117`). **This is what makes the missing
  `permissions:` block matter**, and what would turn a future
  `pull_request_target` into a repository compromise.
- **Action pinning — DRIFT.** All four actions float on mutable major
  tags, none SHA-pinned: `actions/checkout@v4` (`:100`, `:120`),
  `jdx/mise-action@v2` (`:101`, `:137`), `actions/cache@v4` (`:105`,
  `:146`, `:151`, `:157`), `leanprover/lean-action@v1` (`:124`). The
  asymmetry is worth naming: the workflow pins `MISE_VERSION` exactly
  (`:88`) and argues at length (`:55-60`) that bun, node, and Lean are
  all exactly pinned — while the actions that *install* those
  toolchains are not pinned at all. `:58-59` notes `lean-action v1` is
  an admitted tool per TOOLS.md; admitting a tool does not pin its
  bytes.
- **Env leakage — CLEAN.** The only `env:` is `MISE_VERSION` (`:87-88`).
  No `set -x`. No `upload-artifact` step exists. No
  `${{ github.event.* }}` value is interpolated into any `run:` block —
  the only expressions are `env.MISE_VERSION`, `runner.os`/`hashFiles`
  cache keys, and `github.event_name` comparisons, none
  attacker-controlled. No script-injection sink.
- **AGENTS.md's CI claim — DRIFT.** `AGENTS.md:107` states "CI runs
  `check` and nothing else." CI runs `mise run check:ci` (`:173`),
  which `mise.toml:590` explicitly distinguishes — "CI runs
  `mise run check:ci`, never `mise run check`" — and the task lists
  genuinely differ (`mise.toml:591-610` vs `:612-625`). There is also
  a second job (`:96-110`) and the install prelude. Both halves of the
  sentence are wrong, and `check.yml:1-8` argues the distinction is
  load-bearing.

---

## G. Doc honesty (C5)

Swept SERVING.md, `bin/mcp/http.ts`, `bin/mcp/server.ts`,
`bin/cli/daemon.ts`, and PROFILE-CAS-HTTP-0.md for *secure, securely,
safe, safely, authenticated, authorized, hardened, protected,
trusted*. **Three hits in total**, all about crash-safety or
arithmetic: `bin/mcp/server.ts:164` ("obviously safe" of a byte
calculation), SERVING.md:60 ("WAL makes cross-process sharing safe"),
SERVING.md:221 ("crash-safe by construction", carrying its audit
verdict).

**Verdict: CLEAN, and genuinely notable.** There is no unearned
security vocabulary anywhere on the serving surface. Nothing is called
secure. Nothing claims authentication it does not perform. The
refuse-first posture is described in mechanical terms throughout, and
the named non-goals are named repeatedly and precisely
(`bin/cli/daemon.ts:10-22`, `bin/mcp/http.ts:57-63`, SERVING.md's OWED
section).

The documentation defects found by this audit are all the *opposite*
kind — precise, checkable claims the code does not keep:

| Claim | Where | Reality |
|---|---|---|
| "never a silent default" | `bin/cli/store.ts:240-243` | A3 — an unreadable config silently defaults to open |
| "`readConfig` has already refused the invocation if it does not [read]" | `bin/cli/commands.ts:831-834` | A3 — it has not |
| "browser requests are refused unless their origin is named with `--allow-origin`" | `bin/cli/daemon.ts:180`, SERVING.md | A4 — `--allow-host` admits origins too |
| banner `origins="none (every browser Origin refused)"` | `bin/mcp/http.ts:822-824` | A4 — false under `--allow-host`; proven |
| "flags > env > config file > defaults" | `bin/cli/store.ts:81-82` | No env var overrides any policy field |
| "CI runs `check` and nothing else" | `AGENTS.md:107` | §F — `check:ci`, plus a second job and a prelude |
| "the same five tools" | FRONTEND.md:109, :122 | Six |
| "two JWT-shaped tokens" | PAPERWORK-AND-PROJECTION-AUDIT.md:125 | One |

---

## Ranked defects

### Fix-sized — code or prose, no new ruling required

| # | Defect | Site | Grade |
|---|---|---|---|
| 1 | Config **read** failure collapses to "absent", defeating `anonymousReads: false` on both hosts | `bin/cli/store.ts:261-265` | BROKEN-SILENT |
| 2 | `--allow-host` transitively grants browser-origin trust, including write access to the byte plane; the banner denies it | `bin/mcp/http.ts:475-479`, `:822-824` | BROKEN-SILENT |
| 3 | No `permissions:` block — `GITHUB_TOKEN` inherits the repo default | `.github/workflows/check.yml` | DRIFT |
| 4 | Four actions on mutable tags, none SHA-pinned | `check.yml:100,101,105,120,124,137,146,151,157` | DRIFT |
| 5 | `backup.target` logged unredacted in the one branch where it can carry credentials | `bin/mcp/http.ts:774`; `commands.ts:259,302` | DRIFT |
| 6 | `.gitignore` has no root dotenv rule; `.staging/**.md` is allowlisted to depth 3 | `.gitignore:4-12,33` | DRIFT |
| 7 | Preflight reflects `access-control-request-headers` without varying on it | `bin/mcp/http.ts:499-502` | DRIFT |
| 8 | Eight documentation claims the code does not keep | §G table | DRIFT |
| 9 | Live non-expiring read-write Turso token in a world-readable working-tree file | `turso_tok.md` (untracked) | operator obligation |

Defect 1 is roughly five lines: distinguish `ENOENT` from every other
read error — absent stays `None`, unreadable becomes a typed
`ConfigUnreadable`. That single change closes the hole on both hosts
and makes `bin/cli/store.ts:240-243` true as written.

Defect 2 wants the same-origin test to compare against the daemon's
*own bound origin* (scheme included) rather than the request's Host
header, so that `--allow-host` widens Host acceptance only; and the
banner should report effective origin admission rather than echoing
the flag.

### Ruling-sized — needs an operator decision

| # | Question |
|---|---|
| R1 | Is the browser tier's read-only status to be **enforced**? Today `--allow-origin` is a full read-write grant and tier 1's ruling has no mechanism. Either a read-only toolkit projection for browser-origin sessions plus a byte-plane write gate, or an explicit ruling that admitting an origin means admitting writes. |
| R2 | Does `--allow-host` mean "accept this Host" or "trust this origin"? Today it means both, undocumented. Pick one and say it in SERVING.md. |
| R3 | What should the daemon do when it cannot **read** a store's config? Refusing is the refuse-first-consistent answer, but "unreadable config" is a new refusal clause and belongs in the `ServePolicy` ruling beside `CredentialedPolicyUndaemonable`. |
| R4 | Does `environment.json` — the estate's full build graph, including verbatim gate commands — belong on the tier-0 projection list once the daemon is ever non-loopback? |

Already OWED in SERVING.md and unchanged by this audit: credentialed
reads over HTTP; MCP revision 2026-07-28; litestream's TOOLS.md row;
upstream session expiry (S6).

---

## The single highest-risk finding

**A store the operator has gated is served wide open, silently,
whenever its `config.json` cannot be read.**

`Effect.orElseSucceed` at `bin/cli/store.ts:261-265` treats "I could
not read this file" as "this file is not there", and a store with no
config is served under a default whose `anonymousReads` is `true`. A
`chmod`, a bad restore, a permissions change during a backup, an
ownership mismatch after a container remount — any of these turns the
estate's one ratified authorization gate off. Nothing logs it. The
`serve policy applied` line prints the default as though it were the
store's own, and `cas doctor` reports `config none`. Both hosts are
affected. The code's own docstring says this cannot happen.

It is ranked first because it needs **no adversary at all** — only an
accident — and because it defeats precisely the ruling this audit was
convened to check. Reproduced end to end (probes A–D, §A3).

The larger blast radius belongs to the runner-up, and the operator may
reasonably re-rank them: under `--allow-host` — the configuration
SERVING.md *prescribes* for proxy deployments — an unlisted browser
origin obtained a CORS grant and wrote bytes into the store (201
Created, bytes on disk, §A4 probe W1) while the daemon's banner
reported that every browser Origin was being refused. That one needs
an attacker who can present a page at the allowed name; A3 needs
nobody.
