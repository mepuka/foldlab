

===== [2026-08-24T14:29:58] ASSISTANT =====
That's the AWS-led Rust standard library verification effort — fetching both pages to extract what's adoptable.

===== [2026-08-24T14:30:30] ASSISTANT =====
Actual gold is right — and the deepest piece isn't the rules, it's the **approved-tools list read as a taxonomy**. The five tools are five different *kinds* of formal verification, live and governed: Kani (bounded model checking), Flux (refinement types), VeriFast (separation logic), KMIR (symbolic execution), ESBMC (model checking via GOTO). That page is a running instance of the verification-kinds taxonomy we have queued as roadmap item 1 — organized by tool, each with CI status monitoring. Primary input, banked.

Three things worth adopting into the estate, proposed as **D10** on the sheet:

1. **Approved-tools ledger.** Their core governance move: *a tool must be admitted before its claims count.* For us: any tool whose output flows into a gated artifact — a verifier, lean4-tree-sitter, liteparse, and pointedly **an LLM harness** — first gets an entry: name, verification kind, trust statement, CI presence. This gives the "LLM-harnessed verification" stance its missing governance: LLMs are admitted tools with an explicitly *empty* trust contribution (the gates carry it), stated in writing rather than assumed. It also composes with I-002's "named seam with a separate trust statement" — same doctrine, now with a registry.
2. **Challenge form for work items.** Their unit of work is a challenge with success criteria declared *before* work starts, and solutions must be automated and pass CI to even be reviewed — which is our `mise run check` doctrine arriving independently at the same place. Adopt the form when roadmap items become work: each gets pre-registered success criteria.
3. **Evidence entry** for the site itself (pending pin), feeding both the taxonomy and, later, R2's tool-selection decisions.

The committee/two-approval structure I'd *not* adopt now — you're a lab of one operator plus agents, and grilling already is the review instrument; the shape is there if contributors ever arrive.

So: **decision sheet now D1–D10**, with D10 = approved-tools ledger + challenge form + evidence entry as above. Everything else stands as played back. Confirm and I execute the whole pass — mise config, bun upgrade, tasks, renames, migrations with the two term fixes, gitignores, licenses, CI workflow, AGENTS/CHARTER updates, ledgers — then launch the outsider legibility pass.

===== [2026-08-24T14:31:49] USER =====
yeah i think thats smart.. i just gave the codex another task to basically look for the equivalent of the "verify rust std lib" for all the major ecosystems so we'll get that at somepoint

for ledger and CI.. lets just start light and minimal and we can add as work gets defined

===== [2026-08-24T14:32:27] ASSISTANT =====
Confirmed — executing the full sheet, light-and-minimal on ledger and CI, and codex's ecosystem sweep will slot into the taxonomy when it lands. Reading the four `.reference` organizational files first so the migration doesn't break internal links.

===== [2026-08-24T14:33:34] ASSISTANT =====
Moves are clean (git tracked them as renames). Now the coordinated link-and-term updates per the corpus's own maintenance contract.

===== [2026-08-24T14:37:36] ASSISTANT =====
The full sheet is executed. Everything that landed:

**Tooling** — [mise.toml](mise.toml) pinning bun 1.4.0 (installed and verified) and node 22.23.2 as the claim-target engine, with the reserved `gen` and `check` tasks; [check.yml](.github/workflows/check.yml) as the single CI job; root [.gitignore](.gitignore) enforcing the `.staging/` rule; [LICENSE](LICENSE) with canonical Apache-2.0 text and the CC BY 4.0 split noted in the README.

**Layout** — `projects/` is now `experiments/` (with a grade-stating README); the three bounded contexts, CLAIM-GATES, and DEVELOPMENT-INVARIANTS migrated from `.reference/` into `docs/` as proper git renames, with every inbound link updated across the manifest system (manifest.json still parses) and `.reference/` reduced to pure evidence: the source lock, catalog, clones, dumps.

**Vocabulary** — the two provenance term fixes applied (*Evidence Locator*, *Resolved Evidence*, with "pin" sanctioned as the informal name for a Source Lock entry); **P4 — Human semantic layer** minted into the charter and *human semantic projection* into lab-core, wired into the artifact procedure as a transformation of record; the [approved-tools ledger](docs/lab-core/TOOLS.md) started light with five admitted tools — including LLM harnesses with their explicitly empty trust contribution — and two pending admissions.

**AGENTS.md** — orientation table, tooling SOPs, and the tool-admission procedure all reflect D1–D10.

The **outsider legibility pass** is running now — an Opus agent reading the estate cold, auditing jargon, coherence, contradictions, and physically verifying every relative link. Findings when it reports.

One thing needs your word, since the tree holds the entire day's work uncommitted: a commit would also make `mise run check` meaningful locally (it currently fails on the dirty tree, by design). I'd do it as one commit — charter, agent spec, vocabulary, migration, tooling — before applying legibility findings, so the audit's fixes land as their own change. Say commit and it's done.

===== [2026-08-24T14:38:19] USER =====
just stage

===== [2026-08-24T14:38:41] ASSISTANT =====
Staged — all 28 entries, with the migrations preserved as clean renames and nothing left untracked (the LF/CRLF warnings are just Windows line-ending normalization noise). The commit stays yours to call.

The legibility audit is still running; when it reports I'll bring you the findings, we fix what's real, and then the estate is ready for the research pass — taxonomy first, per the roadmap.

===== [2026-08-24T14:43:34] USER =====
<task-notification>
<task-id>a7eec1303ac54cb99</task-id>
<tool-use-id>toolu_016Qr3RQ44ViocpoP1avriBX</tool-use-id>
<output-file>C:\Users\kokok\AppData\Local\Temp\claude\C--Users-kokok-Dev-foldlab\6e7a5516-811a-4a5b-b0a5-fc08ebd5fddd\tasks\a7eec1303ac54cb99.output</output-file>
<status>completed</status>
<summary>Agent "Outsider legibility audit" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result># Foldlab outsider legibility audit — findings (most severe first)

Read set: README.md, CHARTER.md, AGENTS.md, CONTEXT-MAP.md, docs/** (all 12 files), .reference/README.md, .reference/ORGANIZATION.md, .reference/MANIFEST.md. Also inspected (for verification only, not audited): .reference/manifest.json, .reference/provenance/sources.lock.json, .reference/CONTEXT-MAP.md, .reference/catalog/*, mise.toml, .github/workflows/check.yml, .staging/README.md, experiments/README.md, formal/.

---

## S1 — BROKEN LINKS (3 confirmed on disk)

Method: enumerated every `[label](target)` in all tracked `.md` outside `.git`/`clones`/`.agents`/`.claude`, resolved each non-HTTP target against the filesystem.

| # | File:line | Link | Resolves to | Status |
|---|---|---|---|---|
| L1 | `docs/effect-typescript-semantics/README.md:20` | `[Reference catalog](../catalog/REFERENCES.md)` | `docs/catalog/REFERENCES.md` | **does not exist**; real file is `.reference/catalog/REFERENCES.md` |
| L2 | `docs/effect-typescript-semantics/README.md:21` | `[Effect module surface](../catalog/EFFECT-SURFACE.md)` | `docs/catalog/EFFECT-SURFACE.md` | **does not exist**; real file is `.reference/catalog/EFFECT-SURFACE.md` |
| L3 | `docs/schema-json/README.md:11` | `[source lock](../provenance/sources.lock.json)` | `docs/provenance/sources.lock.json` | **does not exist**; real file is `.reference/provenance/sources.lock.json` |

All other relative links resolve (verified individually). Note L3 is the same trap that `docs/provenance/README.md:54` gets right (`../../.reference/provenance/sources.lock.json`) — the bare token `provenance/sources.lock.json` is used with three different implied bases across the corpus (`.reference/ORGANIZATION.md:34`, `.reference/MANIFEST.md:39`, `docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md:20`), which is what produced the break.

Contract violated: `docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md:14` ("local Markdown links resolve"), `.reference/MANIFEST.md:56` ("every local Markdown link resolves"), `manifest.json` invariant "All local Markdown links resolve."

---

## S2 — DANGLING AUTHORITY: the "artifact-kind ledger" does not exist

- `AGENTS.md:59-62`: "A term is usable once its definition entry exists in the owning CONTEXT.md: name, **artifact kind** (from the artifact-kind ledger) … Artifact kinds are first-class: the ledger is itself a versioned lab artifact."
- `AGENTS.md:80-82`: "A built thing earns it by carrying an **artifact kind** (from the ledger)…"
- `docs/lab-core/CONTEXT.md:42-44`: "**Artifact kind**: The classifier an artifact carries in the artifact-kind ledger."

No such file exists anywhere in the repo (`grep -rn ledger` returns only `docs/lab-core/TOOLS.md` = *approved-tools* ledger, and `.reference/catalog/REFERENCES.md` = *reference* ledger). Every gate for minting a definition and for earning artifact grade routes through an artifact that has not been written, and the glossary defines the term by pointing at it. An outsider following the procedure literally cannot mint anything. Also: three distinct things are called "ledger" in one corpus.

---

## S3 — CONTRADICTION: "everything is an artifact" vs "artifact is a grade, not a birthright"

- `README.md:32-34`: "Everything the lab produces is a typed artifact with an identity and declared transformations — the functional discipline applies to the lab's own outputs."
- `AGENTS.md:79-80`: "'Artifact' is a **grade, not a birthright** … A built thing earns it."
- `docs/lab-core/CONTEXT.md:20-23`: "**Staged material**: A built thing whose grade and publish-readiness are undecided; **not yet an artifact**."

The README's summary sentence asserts exactly what the specification forbids. Compounding wobble inside the glossary itself: `CONTEXT.md:9-10` defines Artifact as a thing that "has earned its grade", while `CONTEXT.md:14-16` defines Grade as ranging over *staged material, experimental artifact, formal verification artifact* — so staged material has a grade yet is not an artifact. The definitions of Artifact and Grade are mutually circular and produce a contradiction on the staged case.

---

## S4 — CONTRADICTION: does a domain contract exist or not?

- `.reference/README.md:18`: "The corpus has source identity **and a proposed domain contract** only."
- `README.md:70-72`: "Descriptive phase. No formal claims selected yet."
- `docs/effect-typescript-semantics/CLAIM-GATES.md:43`: "**No project claim or accepted semantic scope is selected** by this reference organization."
- `docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md:39-41`: "Phase 2 — record a domain decision. **This phase belongs to future domain work.**"
- `docs/schema-json/README.md:13`: "accepted constructor subset: not selected".

Four documents say no domain decision exists; the corpus index says a proposed one does. As an outsider I could not determine which is true, and it is the single most load-bearing status fact in the repo.

Related, same class: `CHARTER.md:169-170` — "'Artifact' is provisionally adopted as the term of art; **its definition entry is owed** at domain modeling" — but `docs/lab-core/CONTEXT.md:9-12` already carries a complete definition entry for Artifact (name, gloss, avoid-list). The Charter's outstanding-debt note is stale relative to the glossary.

---

## S5 — CONTRADICTION: P1–P3 vs P1–P4

`AGENTS.md:11` — Orientation table: "CHARTER.md | Thesis, philosophy, descriptive tower, **principles P1–P3**, references, roadmap".
`CHARTER.md:66-81` defines **four** principles, P1 through P4, and P4 ("Human semantic layer") is separately load-bearing in `AGENTS.md:87-89` itself ("the **human semantic projection** (P4: …)"). AGENTS.md cites P4 in its body while its own authority table says the Charter only goes to P3.

---

## S6 — OVERSTATED: `mise run check` "runs the gates"

- `README.md:59-61`: "`mise run check` regenerates derived files, asserts a clean tree, **and runs the gates** — locally and in CI alike."
- `AGENTS.md:111-113`: "`mise run check` runs gen, asserts a clean tree, **then tests and gates**. CI runs `check` and nothing else."

Actual `mise.toml`: `gen` is `echo 'gen: no derived files declared yet'`; `check` is `mise run gen` + `git diff --exit-code`. There are no tests, no gates, no test runner wired, and `formal/` is an empty directory. Two documents describe an enforcement mechanism that does not exist. This is the most consequential overstatement in the corpus because every other document defers its rigor to "the gates carry the trust" (`AGENTS.md:99-101`, `docs/lab-core/TOOLS.md:14`).

Adjacent unmet gate: `IMPLEMENTATION-PLAN.md:22-24` Phase 0 completion gate = "the manifest validation checks pass" — no manifest validation task exists in `mise.toml` or CI.

---

## S7 — CONTRADICTION: `.reference/` is "evidence only" but holds the organization contract

- `AGENTS.md:17`: "`.reference/` | **Evidence only**: source lock and receipts, catalog, study clones (gitignored, shallow), PDFs and info dumps".
- `README.md:55`: ".reference/ — evidence: source lock, catalog, study clones."
- But `.reference/` also contains `ORGANIZATION.md` (the module/seam/placement contract), `MANIFEST.md` (the inventory contract), `manifest.json`, and a redirect `CONTEXT-MAP.md` — none of which are evidence. `.reference/ORGANIZATION.md:3` calls the tree "three deep modules plus one shared catalog", i.e. an architectural spec, not evidence.
- No "receipts", "PDFs", or "info dumps" directories exist under `.reference/` (only `catalog/`, `provenance/`, `clones/`).

Further, `manifest.json` declares module `"path": "effect-typescript-semantics"` and `"path": "schema-json"` under root `.reference` — **neither directory exists** (`.reference/effect-typescript-semantics` and `.reference/schema-json` are absent), while `manifest.json:83` asserts the invariant "Every listed path exists relative to .reference". Only `provenance` and `catalog` are real.

---

## S8 — Lab Core context is invisible to the inventory that claims to be canonical

`CONTEXT-MAP.md:5,12` names **four** contexts, with Lab Core as the one "→ all contexts" supplier. But:
- `.reference/ORGANIZATION.md:9-13` lists **three** modules; Lab Core absent.
- `manifest.json` `modules[]` lists **three**; Lab Core absent.
- `.reference/MANIFEST.md:7-26` inventory has **no row** for `docs/lab-core/CONTEXT.md` or `docs/lab-core/TOOLS.md`, though `MANIFEST.md:3` calls `manifest.json` "the canonical inventory" and `MANIFEST.md:54-55` requires "every manifest path exists / one context owns each canonical term".

So the context that owns *artifact*, *grade*, *evidence* — the vocabulary every other document consumes — is not in the corpus inventory. `.reference/CONTEXT-MAP.md` (the redirect stub) is likewise unlisted.

---

## S9 — Canonical vocabulary violated by the documents that define it

**S9a — banned synonym used in a governing plan.** `docs/provenance/CONTEXT.md:23-25` defines "**Resolved Evidence**" with "_Avoid_: **Resolved Artifact**, download, checkout". `docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md:30` says: "a resolver interface that returns a verified **Resolved Artifact** or typed failure." Reinforced wrong by `docs/lab-core/CONTEXT.md:59-62` ("**Evidence**: … never an artifact"). Same doc, `IMPLEMENTATION-PLAN.md:37`, mixes "Resolved Artifact" back into a completion gate.

**S9b — "library-owned" vs "project-owned" used interchangeably for the same concept.** "project-owned" is the term with an invariant behind it (`docs/DEVELOPMENT-INVARIANTS.md:61`, I-004 "Project-owned semantic types"). But "library-owned" appears for the identical idea at `docs/effect-typescript-semantics/README.md:8`, `docs/effect-typescript-semantics/CONTEXT.md:3,12`, `docs/schema-json/CONTEXT.md:16,24`, `docs/provenance/README.md:8` (heading "Library-owned types"), `.reference/ORGANIZATION.md:26`. Neither CONTEXT.md mints "library-owned", and no avoid-list mentions it. An outsider cannot tell whether these are two concepts or one.

**S9c — "artifact" and "verified" used in the exact senses the glossary bans, in the two front-door documents.** `docs/lab-core/CONTEXT.md:12` "_Avoid_: build artifact, work product, output"; `CONTEXT.md:40` "_Avoid_: verified (bare)". Yet `README.md:7-9` / `CHARTER.md:10-12`: "collapsing the cost of **verifiable, content-addressed software artifacts**" — generic sense, bare claim word, no judgment linked, in the opening thesis sentence of both documents. `AGENTS.md:40-42` (L5) requires every use of "verified" to link to its exact judgment; `README.md:11` "intends to **prove** that marrying Lean … **works**" links to nothing and states no theorem.

**S9d — provenance glossary and provenance interface use different names for the same eight types.** `docs/provenance/CONTEXT.md` mints *Repository Identity, Commit Identity, Evidence Locator, Resolved Evidence, Content Digest*; `docs/provenance/README.md:12-21` presents the same table as *GitHubRepository, GitCommitId, EvidenceLocator, ResolvedEvidence, ContentDigest*. The correspondence is never stated. `CONTEXT.md:20` also bans "Artifact Locator" while README:20 titles its column "Locator". Two of the ten pairs also disagree in coverage (CONTEXT has *Revision Selector*, *Pending Source*; README has *GitHashAlgorithm*, *GitObjectId*, *GitTreeId*, *GitBlobId*).

---

## S10 — Jargon used before or without definition

House terms with **no definition anywhere in the corpus**:

| Term | First/representative use | Note |
|---|---|---|
| **estate** | `CHARTER.md:28` "The estate's organizing philosophy is denotational"; also `CHARTER.md:80,166`, `AGENTS.md:33` | Never defined. Reads as a synonym for "the lab" / "the repo" / "the governed set of artifacts" — three incompatible readings all fit. |
| **operator** | `AGENTS.md:26` "In **operator**-guided sessions"; `AGENTS.md:30`, `CHARTER.md:43` | The single most important role in the conduct rules; never introduced. |
| **grilling / grill / grilling pass** | `AGENTS.md:38-39` "enter `docs/` or `formal/` only after a **grilling pass**"; `AGENTS.md:132`; `CHARTER.md:3,163,180` | A ratification procedure that gates all definitions, with no procedural definition. `CHARTER.md:180` "grill project tooling first" uses it as a verb on a different object. |
| **artifact-kind ledger** | `AGENTS.md:60` | See S2 — no referent. |
| **grade lattice** | `AGENTS.md:82-84` "The directory tree is the **grade lattice**"; `CHARTER.md:165` | "Grade" is defined; "lattice" is not, and three directories with a promotion order is not obviously a lattice. |
| **central bus of canonical abstractions** | `CHARTER.md:152-155` | Bolded as if a defined term; defined only by another metaphor ("the shared spine"). |
| **Candidate GitHub-facing color** | `CHARTER.md:167` | Completely opaque. I could not construct any reading. |
| **agent bootstrap** | `.reference/README.md:20`, `.reference/MANIFEST.md:63`, `manifest.json:91`, `docs/effect-typescript-semantics/README.md:23` | Four documents promise not to modify a thing that is never identified. Reads as leftover migration-PR language. |
| **deep modules** | `.reference/ORGANIZATION.md:3` "three **deep modules** plus one shared catalog" | Ousterhout term of art, unglossed. `IMPLEMENTATION-PLAN.md:119` ("interface is smaller than the complexity it hides") is the definition, but it is 100 lines away in a different file and never linked. |
| **ADRs** | `AGENTS.md:13` "docs/ | … glossaries, **ADRs**" | Unexpanded acronym, and no ADR exists in `docs/`. `README.md:54` describes the same directory as "glossaries, claim gates, invariants" — a third inventory. |
| **seam** | `docs/DEVELOPMENT-INVARIANTS.md:17,44`; `.reference/ORGANIZATION.md:17-29` | Used ~12 times as a technical primitive; defined only ostensively by four examples. `I-002:44` "behind a named seam" precedes any example. |
| **carrier** | `docs/DEVELOPMENT-INVARIANTS.md:12`; `CHARTER.md:55,105`; `docs/schema-json/CONTEXT.md:16` | Central to every claim shape; not in any glossary. `CHARTER.md:105` "the local carrier (L1)" and `docs/lab-core/CONTEXT.md` (no entry) leave it to be inferred. |
| **judgment** | `AGENTS.md:41`, `I-003:48-59`, throughout | Same — assumed from type theory, never glossed. |
| **Lysxia** | `CHARTER.md:141` "**Lysxia** study clones" | Author's handle, unexplained; the same person is cited as "Li-yao Xia" at `CHARTER.md:120`. |
| **tsgo** | `docs/effect-typescript-semantics/README.md:9` "a pinned TypeScript or **Effect tsgo** configuration" | Unexplained proper noun. |
| **reified AST** / **reify** | `README.md:19-20`, `CHARTER.md:49,55` | Load-bearing verb for the whole tower; unglossed. |
| **projection**, **lift**, **endpoint projection**, **global types**, **topology**, **many-roled** | `README.md:19-30`, `CHARTER.md:56,86-93` | Session-type vocabulary presented as known. The Honda et al. citation appears 90 lines after first use in CHARTER, and after the README uses all of it. |
| **admission / admitted** | `AGENTS.md:96` ("Admitting a tool") vs `docs/schema-json/CONTEXT.md:44` ("Supported Constructor … admitted by") vs `docs/schema-json/SOURCE-SURFACE.md:16` ("source admission") | Two unrelated senses (tool approval, AST acceptance) share one word; neither cross-references the other. |
| **descriptive tower** | `README.md:16` | Named in README before any definition; the table that defines it lives in `CHARTER.md:47-59`. README does not link there. |
| **verification-achievability** | `README.md:22` | Coined mid-sentence; defined properly only at `CHARTER.md:71-75` (P3). |

Violated rule: `AGENTS.md:46-47` L7 — "Formal, consistent, outsider-legible language on every surface; **jargon glossed on first use**." The corpus does not satisfy its own L7.

---

## S11 — Passages I could not follow / had to re-read

1. **`README.md:16-21`** — the descriptive tower as one 58-word sentence with six unglossed nested clauses ("host execution, effectful computation (the Effect value), description in the small (Schema as codec, refinement, effectful operator, and reified AST), interaction (sessions, global types, topology), meta-interaction (protocols of protocols), and ontology (canonicalization and growth of vocabularies)"). I had to read CHARTER's L0–L5 table to parse it, and even then "description in the small" and "protocols of protocols" remain undefined.

2. **`CHARTER.md:86-93`** (Projection / Lift bullets) — "obligation is the endpoint-projection theorem shape — projections jointly realize the global scenario" is telegraphic to the point of ungrammatical. "Theorem shape" is undefined; "jointly realize" is undefined; "the global scenario" has no antecedent. The Lift bullet's "projecting a lifted artifact returns it up to the layer's equivalence" requires knowing what "the layer's equivalence" is — never stated.

3. **`CHARTER.md:152-155`** (Roadmap preamble) — three metaphors stacked ("reify the lab's themes", "central bus", "shared spine", "plug into") with no concrete referent. I still cannot say what a reader is supposed to do or expect as a result of this sentence.

4. **`CHARTER.md:156-178`** (roadmap numbering) — items 1 and 2 are unlabeled, items 3 and 4 are labeled **R1** and **R2**. The mismatch between list position and R-number made me re-read three times to confirm R1 ≠ item 1. `CHARTER.md:180` then says "grill project tooling first, then research passes, then lay out the projects" — a *fourth* ordering that does not map onto 1–4.

5. **`CHARTER.md:102-114`** ("Discipline ladder", H1/H2/H3) vs **`CHARTER.md:47-59`** (L0–L5) vs **`CLAIM-GATES.md:29-37`** (G0–G6) vs **`DEVELOPMENT-INVARIANTS.md`** (I-001–I-005) vs **`AGENTS.md:24-47`** (L1–L7). **Five** distinct alphanumeric ladders, and `L` is overloaded: `L0–L5` are tower layers in CHARTER, `L1–L7` are conduct rules in AGENTS. `AGENTS.md:25` "L1 — Propose before act" and `CHARTER.md:53` "L1 | Effectful computation" collide directly, and `docs/lab-core/TOOLS.md:12` writes "Claim-target JavaScript engine (L0)" meaning the CHARTER sense while sitting in a file whose sibling uses the AGENTS sense. This is the single worst navigational hazard in the corpus.

6. **`docs/effect-typescript-semantics/CLAIM-GATES.md:6-12`** — a section headed "## Project thesis" inside a document whose own status line (`:3`) says "reference gate vocabulary, **not a selected project scope**", and whose closing section (`:43`) says "No project claim or accepted semantic scope is selected". A thesis that is explicitly not the project's scope, in a file that is not the project's thesis document (`CHARTER.md:8` has "## Thesis"), reading nothing like it.

7. **`docs/provenance/README.md:50`** — "For a repository using SHA-1 objects, 'full SHA verification' therefore commits this project to the full 40-hex commit, tree, and blob identities plus a 64-hex SHA-256 byte digest." The phrase "full SHA verification" appears in scare quotes as though quoting an earlier definition; it is never used earlier in the document or anywhere in the corpus.

8. **`AGENTS.md:86-89`** — "Documents are values of their kind; edits are transformations; projection, lift, and the human semantic projection … are the transformations of record. Nothing is loose prose." Three different senses of "transformation" (grade promotion, document edit, P4 projection) in four lines, and "transformations of record" is undefined.

9. **`docs/lab-core/CONTEXT.md:47-51`** ("**Kind**: Reserved for the literature's meaning… Never used for ledger classification") sits five lines below "**Artifact kind**: … _Avoid_: kind (bare, for this sense)". Two adjacent entries whose only distinction is a space and a modifier. `docs/schema-json/CONTEXT.md` then uses "node tag" / "constructor" for a third classification axis without cross-referencing either.

10. **`.reference/ORGANIZATION.md:42`** — "Do not introduce a seam until two adapters are justified." Reads as a rule, but `ORGANIZATION.md:17-29` has already introduced four named seams, none of which has two adapters. Self-contradicting within one page.

---

## S12 — Overstated relative to stated draft/pre-claim status

| # | Passage | Why overstated |
|---|---|---|
| O1 | `README.md:59-61` + `AGENTS.md:111-113` — "runs the gates" / "then tests and gates" | No gates or tests exist; see S6. |
| O2 | `.reference/README.md:18` — "and a proposed domain contract" | Four other docs say no domain decision exists; see S4. |
| O3 | `README.md:11-12` — "**intends to prove** that marrying Lean (as referee) with an Effect implementation in TypeScript (as substrate) **works**" | "Works" is not a proposition; nothing is provable about it. `CHARTER.md:21` states the same as "**The wager**", which is the honest framing — the README hardens a wager into a proof intent, against `AGENTS.md:40` (L5). |
| O4 | `README.md:7-9` / `CHARTER.md:10-12` — "LLMs plus automated verification **are collapsing** the cost…" and "**advantage accrues to** whoever coalesces the linkages" | Present-tense industry claims with no citation, pin, or pending mark, in a corpus whose `AGENTS.md:44-45` (L6) says "No assertion about an external artifact without a resolved pin or an explicit pending mark." |
| O5 | `.reference/ORGANIZATION.md:3` — "The reference tree **is designed as three deep modules** plus one shared catalog" | Two of the three module directories do not exist under `.reference/` (see S7); the module documents live in `docs/`. The architecture is described in the indicative for a layout that isn't there. |
| O6 | `docs/provenance/README.md:3` — "Status: reference provenance **contract**" | `.reference/MANIFEST.md:14` grades the same file **draft**. A draft is not a contract. Similar drift: `MANIFEST.md:20` grades IMPLEMENTATION-PLAN a "sketch" while the file itself (`:1-6`) presents seven numbered phases with completion gates. |
| O7 | `.reference/ORGANIZATION.md:3` — "Each module has a small documented interface and **owns the complexity behind one clean seam**" | Two of three modules currently consist of three prose files and no code; there is no complexity to own yet. |
| O8 | `docs/effect-typescript-semantics/README.md:3` — "This reference pack **prepares carefully bounded formal semantics**" | Nothing formal has been prepared; the pack contains a glossary, a gate table, and a phase list. Contrast the same file `:12` which correctly disclaims. |
| O9 | `CHARTER.md:167` — "Candidate GitHub-facing color" for the repo self-model, listed as roadmap item 2 "(first build…)" | Presents an unbuilt Lean self-model as near-term marketing surface while `formal/` is empty. |
| O10 | `.reference/MANIFEST.md:62` — checklist item "implementation status is **not overstated**" | The checklist is not satisfied by its own corpus (O1–O9). Worth flagging because it is the corpus's own control. |

---

## S13 — Other coherence defects (lower severity)

- **`AGENTS.md:126-134` skill-routing table is incomplete against the installed skill.** `.agents/skills/lean/workflows/` contains six stages including `lean-project-bootstrap`; the routing table lists five and omits bootstrap, so an agent with "no Lake package yet" has no row. The skill's own `SKILL.md:8` says "Seven stages" (counting Pass A/B separately) — a third count.
- **Status-header formats are inconsistent across seven documents**: "Status: draft, 2026-08-24" (CHARTER, AGENTS), "Status: … / Snapshot: 2026-08-24" (CLAIM-GATES, provenance/README, catalog/REFERENCES), "Status: … / Prepared: 2026-08-24" (IMPLEMENTATION-PLAN), "Status: source inventory notes" with no date (SOURCE-SURFACE), and **no status block at all** on README.md, CONTEXT-MAP.md, all four CONTEXT.md files, TOOLS.md, DEVELOPMENT-INVARIANTS.md, ORGANIZATION.md, MANIFEST.md. An outsider cannot tell which documents are drafts.
- **`.reference/MANIFEST.md:14-23` link labels contradict their targets.** E.g. `| provenance-interface | [provenance/README.md](../docs/provenance/README.md) |` — the visible Path column says `provenance/README.md`, which does not exist; the href says `../docs/provenance/README.md`. Eight of seventeen rows have this label/target mismatch (all the `../docs/` ones). This is precisely the confusion that caused S1/L3.
- **`README.md:50-57` "Layout" omits `.staging/`**, which `AGENTS.md:20` and `docs/lab-core/CONTEXT.md:20` treat as the first rung of the grade lattice.
- **`CHARTER.md:141-145` files the Lysxia clones under "Inspirations"** while `AGENTS.md:17` and `README.md:55` file them under evidence. `.reference/clones/` is gitignored and empty on disk, so all three descriptions are of an absent thing.
- **`docs/DEVELOPMENT-INVARIANTS.md:48,59`** uses typographic curly quotes (`“Sound”`, `“sound,”`) while `AGENTS.md:40-41` quotes the same words with straight quotes (`"sound," "verified,"`). Cosmetic, but it is the one place a grep-based check on claim words would silently miss half the corpus.
- **`docs/schema-json/SOURCE-SURFACE.md:29-37`** pins ten line-range landmarks ("SchemaAST.ts lines 689–3180") against a source file that is only identified by commit — line numbers are not covered by any digest in `sources.lock.json`, so these are unverifiable-by-construction against the corpus's own provenance discipline (`AGENTS.md:44`, L6). They are also the only place in the corpus where evidence is cited by a mutable-feeling coordinate.

---

## S14 — The three sentences that most need rewriting for a newcomer

1. **`CHARTER.md:152-155`** — "Reference projects composed under `.reference/` reify the lab's themes and tie into the **central bus of canonical abstractions** the verification wave is producing — the shared spine of canonical forms, proofs, and linkages that downstream projects plug into."
 *Reason:* four undefined metaphors ("reify", "central bus", "verification wave", "shared spine") define each other in a closed loop, so the sentence conveys no checkable content and opens the roadmap — the section a newcomer reads to learn what actually happens next.

2. **`README.md:16-21`** — "The lab organizes its subject as a descriptive tower, each layer reifying the one below as a first-class object: host execution, effectful computation (the Effect value), description in the small (Schema as codec, refinement, effectful operator, and reified AST), interaction (sessions, global types, topology), meta-interaction (protocols of protocols), and ontology (canonicalization and growth of vocabularies)."
 *Reason:* one 58-word sentence introducing six layers and nine unglossed terms, in the second section of the repo's front door, with no link to the CHARTER table that actually defines them.

3. **`README.md:32-34`** — "Everything the lab produces is a typed artifact with an identity and declared transformations — the functional discipline applies to the lab's own outputs, not just its subject matter."
 *Reason:* it flatly contradicts the governing rule that artifact is an earned grade (`AGENTS.md:79`, `docs/lab-core/CONTEXT.md:20-23`), and it uses "outputs" — a word the same glossary lists on the avoid-list for this exact concept — so a newcomer's first exposure to the corpus's most important term teaches the wrong definition.

*Runners-up:* `CHARTER.md:88-90` (the Projection bullet — "obligation is the endpoint-projection theorem shape" is unparseable without session-type background); `CHARTER.md:165-167` ("Candidate GitHub-facing color" — no available reading); `AGENTS.md:86-89` (three senses of "transformation" in four lines).

---

## Summary counts

- Broken relative links verified on disk: **3**
- Direct document-vs-document contradictions: **7** (S3, S4, S5, S7 ×2, S8, S13 clones)
- Documented mechanisms that do not exist: **3** (artifact-kind ledger, gates/tests in `mise run check`, manifest validation check)
- Manifest/inventory paths asserted but absent: **2** (`.reference/effect-typescript-semantics`, `.reference/schema-json`)
- Undefined house terms in load-bearing positions: **~20** (S10)
- Overstatement instances against the corpus's own draft status: **10** (S12)
- Corpus's own stated invariants currently unsatisfied: `AGENTS.md` L5, L6, L7; `IMPLEMENTATION-PLAN` Phase 0 (all five deliverables + gate); `MANIFEST.md` review checklist items 2, 3, 9; `manifest.json` invariants 1 and 8.</result>
<usage><subagent_tokens>94077</subagent_tokens><tool_uses>32</tool_uses><duration_ms>379862</duration_ms></usage>
</task-notification>

===== [2026-08-24T14:44:33] ASSISTANT =====
The outsider audit is back, and it did its job — 32 tool calls, every link physically checked, and it caught real rot, including things I introduced today. The headline: **the corpus currently violates its own L5, L6, and L7 rules, plus two of its manifest invariants.** Distilled triage:

**Genuinely broken (mechanical):** 3 broken relative links (the `../catalog/` and `../provenance/sources.lock.json` links inside migrated docs); `manifest.json` still lists two module directories that no longer exist under `.reference/`; 8 MANIFEST.md rows whose visible path label contradicts their link target; AGENTS.md's table says "principles P1–P3" while the charter now has P4; a stale charter note saying artifact's "definition entry is owed" when lab-core already carries it; the banned term "Resolved Artifact" still used twice in IMPLEMENTATION-PLAN; the lean skill routing table has no row for project bootstrap; README's layout omits `.staging/`.

**Contradictions needing one fix each (recommendations attached):**
- README says "everything the lab produces is a typed artifact" — flatly contradicting your artifact-is-a-grade ruling, in the front door. Rewrite to the earned-grade framing. Related circularity in lab-core: *staged material* "has a grade" per one entry, "is not yet an artifact" per another — fix by making grades = {experimental, formal verification} and staged = pre-grade.
- `.reference/README.md` claims "a proposed domain contract" exists; four other documents say no domain decision is selected. Align to the latter — it's the true state.
- README and AGENTS say `mise run check` "runs the gates" — but no gates exist yet; `gen` is a stub. Reword honestly: gates attach as they're defined.
- **The worst navigational hazard:** `L0–L5` are tower layers in the charter while `L1–L7` are conduct laws in AGENTS — a direct symbol collision. Rename the conduct laws **C1–C7**.
- Lab Core — the context that owns the vocabulary everything else consumes — is missing from the manifest inventory entirely. Add it.
- README hardens the wager into "intends to prove … works"; restore the honest wager framing.
- The roadmap numbers items 1–4 but labels items 3 and 4 "R1" and "R2" — renumber so labels match positions.

**The dangling authority (most structural finding):** AGENTS.md gates every definition on "the artifact-kind ledger" — *which doesn't exist*. Fix: create a starter `docs/lab-core/KINDS.md` with the list you saw earlier (charter, glossary, adr, taxonomy, model, theorem, module, schema, codec, tool), closing the loop until the repo self-model pressure-tests it. Also: three different things are currently called "ledger" — the artifact-kind ledger keeps the name, TOOLS.md becomes the "tool register."

**Jargon debt (~20 undefined house terms):** *estate*, *operator*, and *grilling* are load-bearing in the conduct rules and defined nowhere — those three get minted in lab-core. The session-type vocabulary in README gets a link to the charter's tower table instead of twenty glosses. And the two sentences the auditor rightly could not parse at all — the "central bus" roadmap preamble and "candidate GitHub-facing color" — get rewritten in plain language. This is P4 practiced on ourselves, which is fitting for its first outing.

Deferred (real but not today's): the CLAIM-GATES "Project thesis" section sitting oddly in a no-scope document, status-header standardization across all files, and the SOURCE-SURFACE line-number citations that no digest covers.

Say go and I apply the whole fix pass to the staged tree in one sweep; you can then diff staged-vs-worktree to see exactly what the audit changed before anything commits.

===== [2026-08-24T14:47:40] USER =====
yeah go ahead and also determine the agents md disciplien and progressive disclosure mechanims to a boost ethroughput

===== [2026-08-24T14:49:02] ASSISTANT =====
Applying the full pass. AGENTS.md gets rebuilt around an explicit disclosure discipline — the file itself stays lean and always-loaded, everything else opens only when a task touches its authority.

===== [2026-08-24T14:49:41] ASSISTANT =====
Now the lab-core fixes (grade circularity, three new mints), the tool-register rename, and the mechanical link/term repairs.

===== [2026-08-24T14:50:15] ASSISTANT =====
Now the charter and README rewrites — the prose the auditor couldn't parse.

===== [2026-08-24T14:51:25] ASSISTANT =====
The status line landed; the link checker had an escaping typo — rerunning it cleanly.

===== [2026-08-24T14:52:42] ASSISTANT =====
Fix pass complete and staged. The shape of what changed:

**Structural repairs** — the artifact-kind ledger now exists ([KINDS.md](docs/lab-core/KINDS.md), ten starter kinds that will become the self-model's inductive constructors); the conduct laws are renamed **C1–C7**, killing the collision with tower layers L0–L5; TOOLS.md is the "tool register" so only one thing in the estate is called a ledger; Lab Core is registered in the manifest inventory; the grade circularity is resolved (grades are experimental and formal-verification; staged material is pre-grade, not an artifact).

**Honesty repairs** — README's "everything is a typed artifact" now states the earned-grade truth; "intends to prove it works" is back to wager framing; the thesis opens as "the lab's founding bet"; `check`'s description matches what it actually runs; `.reference/README` no longer claims a domain contract exists.

**Legibility repairs** — *estate*, *operator*, and *grilling* are minted in lab-core; the central-bus roadmap preamble and "GitHub-facing color" are rewritten in plain language; the projection/lift bullets now parse without session-type background; the README tower is one readable sentence linking to the charter's table; roadmap items are plainly numbered 1–4. All three broken links fixed, and a script now confirms **zero broken relative links corpus-wide**.

**AGENTS.md discipline** — rebuilt as an always-loaded router: a leading disclosure rule ("read this file whole; open a referenced document only when the task touches its authority; never preload the corpus"), an orientation table with an explicit *open-when* column per resource, and procedures compressed to pointer-out form. Throughput comes from routing, not reading — the same progressive-disclosure structure the lean skill uses.

On the research landing — good timing, since roadmap item 1 (the taxonomy) is exactly what it grounds. Where did codex drop it? Point me at the files or paste the output, and the intake path is already built: findings get classified into `.reference/catalog/`, any cited repos or documents get pins or explicit pending marks in the source lock, and the verify-rust-std-equivalents sweep becomes the taxonomy's evidence base alongside the five approved-tool verification kinds we already banked.

===== [2026-08-24T14:52:43] USER =====
<command-message>mattpocock-skills:writing-great-skills</command-message>
<command-name>/mattpocock-skills:writing-great-skills</command-name>
<command-args>essnetially we probably want an explicit skill for our estate a double constraint on agent havior.. give that to a subagent to do</command-args>

===== [2026-08-24T14:52:43] USER =====
Base directory for this skill: C:\Users\kokok\.claude\plugins\cache\mattpocock\mattpocock-skills\1.2.0\skills\productivity\writing-great-skills

A skill exists to wrangle determinism out of a stochastic system. **Predictability** — the agent taking the same _process_ every run, not producing the same output — is the root virtue; every lever below serves it.

**Bold terms** are defined in [`GLOSSARY.md`](GLOSSARY.md); look them up there for the full meaning.

## Invocation

Two choices, trading different costs:

- A **model-invoked** skill keeps a **description**, so the agent can fire it autonomously _and_ other skills can reach it (you can still type its name too). It contributes to **context load** — the description sits in the window every turn. Mechanics: omit `disable-model-invocation`, and write a model-facing description with rich trigger phrasing ("Use when the user wants…, mentions…").
- A **user-invoked** skill strips the description from the agent's reach: only you, typing its name, can invoke it — and no other skill can. Zero context load, but it spends **cognitive load**: _you_ are the index that must remember it exists. Mechanics: set `disable-model-invocation: true`; the `description` becomes human-facing — a one-line summary, trigger lists stripped.

Pick model-invocation only when the agent must reach the skill on its own, or another skill must. If it only ever fires by hand, make it user-invoked and pay no context load.

When user-invoked skills multiply past what you can remember, that piled-up cognitive load is cured by a **router skill**: one user-invoked skill that names the others and when to reach for each.

## Writing the description

A model-invoked **description** does two jobs — state what the skill is, and list the **branches** that should trigger it. Every word increases **context load**, so a description earns even harder pruning than the body:

- **Front-load the skill's leading word** — the description is where it does its invocation work.
- **One trigger per branch.** Synonyms that rename a single branch are **duplication** — "build features using TDD … asks for test-first development" is one branch written twice. Collapse them; keep only genuinely distinct branches.
- **Cut identity that's already in the body.** Keep the description to triggers, plus any "when another skill needs…" reach clause.

## Information hierarchy

A skill is built from two content types — **steps** and **reference** — that mix freely: a skill can be all steps, all reference, or both. The core decision is which to use and where each sits on the **information hierarchy**, a ladder ranked by how immediately the agent needs the material:

1. **In-skill step** — an ordered action in `SKILL.md`, the primary tier: what the agent does, in order. Each step ends on a **completion criterion**, the condition that tells the agent the work is done. Make it _checkable_ (can the agent tell done from not-done?) and, where it matters, _exhaustive_ ("every modified model accounted for", not "produce a change list") — a vague criterion invites **premature completion**.
2. **In-skill reference** — a definition, rule, or fact in `SKILL.md`, consulted on demand. Often a legitimately flat peer-set (every rule of a review on one rung) — a fine arrangement, not a smell. _This skill is all reference._
3. **External reference** — reference pushed out of `SKILL.md` into a separate file, reached by a **context pointer**, loaded only when the pointer fires. (Spans _disclosed_ reference — a sibling file like `GLOSSARY.md`, still part of the skill — through fully **external reference** that lives outside the skill system and any skill can point at.)

A demanding completion criterion drives thorough **legwork** — the digging the agent does within the work — whether the skill has steps or not, since "every rule applied" binds flat reference just as "every step done" binds a sequence.

Push too little down and the top bloats; push too much and you hide material the agent actually needs. That tension is the whole decision.

**Progressive disclosure** is the move down the ladder — out of `SKILL.md` into a linked file — so the top stays legible. Mechanics: a linked `.md` file in the skill folder, named for what it holds (this skill discloses its full definitions to `GLOSSARY.md`). Some skills are used in more than one way, and each distinct way is a **branch** — different runs taking different paths through the skill. Branching is the cleanest disclosure test: inline what every branch needs, and push behind a pointer what only some branches reach. A **context pointer**'s _wording_, not its target, decides when and how reliably the agent reaches the material.

Where the ladder decides _how far down_ a piece sits, **co-location** decides _what sits beside it_ once there: keep a concept's definition, rules, and caveats under one heading rather than scattered, so reading one part brings its neighbours with it.

## When to split

**Granularity** is how finely you divide skills, and each cut spends one of the two loads, so split only when the cut earns it. Two cuts:

- **By invocation** — split off a **model-invoked** skill when you have a distinct **leading word** that should trigger it on its own, or another skill must reach it. You pay **context load** for the new always-loaded **description**, so that independent reach has to be worth it.
- **By sequence** — split a run of **steps** when the steps still ahead (a step's **post-completion steps**) tempt the agent to rush the one in front of it (**premature completion**). Keeping them out of view encourages the agent to do more **legwork** on the current task.

## Pruning

Keep each meaning in a **single source of truth**: one authoritative place, so changing the behaviour is a one-place edit.

Check every line for **relevance**: does it still bear on what the skill does?

Then hunt **no-ops** sentence by sentence, not just line by line: run the no-op test on each sentence in isolation, and when one fails, delete the whole sentence rather than trim words from it. Be aggressive — most prose that fails should go, not be rewritten.

## Leading words

A **leading word** is a compact concept already living in the model's pretraining that the agent thinks with while running the skill (e.g. _lesson_, _fog of war_, _tracer bullets_). Repeated throughout the text (though not necessarily - a strong leading word might only be needed once), it accumulates a distributed definition and anchors a whole region of behaviour in the fewest tokens, by recruiting priors the model already holds.

It serves predictability twice. In the body it anchors _execution_: the agent reaches for the same behaviour every time the word appears. In the description it anchors _invocation_: when the same word lives in your prompts, docs, and code, the agent links that shared language to the skill and fires it more reliably.

Hunt for opportunities to refactor skills to use leading words. A triad spelled out at three sites (**duplication**), a description spending a sentence to gesture at one idea — each is a passage begging to **collapse** into a single token. Examples include:

- "fast, deterministic, low-overhead" -> _tight_ — one quality restated across a phase — into a single pretrained word (a _tight_ loop).
- "a loop you believe in" -> _red_ — converts a fuzzy gate into a binary observable state (the loop goes _red_ on the bug, or it doesn't).

You win twice over: fewer tokens, _and_ a sharper hook for the agent to hang its thinking on. Assume every skill is carrying restatements that leading words retire — go find them.

## Failure modes

Use these to diagnose issues the user may be having with the skill.

- **Premature completion** — ending a step before it's genuinely done, attention slipping to _being done_. Defence, in order: sharpen the completion criterion first (cheap, local); only if it is irreducibly fuzzy _and_ you observe the rush, hide the post-completion steps by splitting (the sequence cut).
- **Duplication** — the same meaning in more than one place. Costs maintenance and tokens, and inflates a meaning's prominence on the ladder past its real rank.
- **Sediment** — stale layers that settle because adding feels safe and removing feels risky. The default fate of any skill without a pruning discipline.
- **Sprawl** — a skill simply too long, even when every line is live and unique. Hurts readability and maintainability and wastes tokens. The cure is the ladder: disclose **reference** behind pointers, and split by **branch** or sequence so each path carries only what it needs.
- **No-op** — a line the model already obeys by default, so you pay load to say nothing. The test: does it change behaviour versus the default? A weak leading word (_be thorough_ when the agent is already thorough-ish) is a no-op; the fix is a stronger word (_relentless_), not a different technique.
- **Negation** — steering by prohibition backfires: _don't think of an elephant_ names the elephant and makes it more available, not less. Prompt the **positive** — state the target behaviour so the banned one is never spoken; keep a prohibition only as a hard guardrail you can't phrase positively, and even then pair it with what to do instead.


ARGUMENTS: essnetially we probably want an explicit skill for our estate a double constraint on agent havior.. give that to a subagent to do

===== [2026-08-24T14:53:11] ASSISTANT =====
Right call — the estate skill is the active half of a double constraint: AGENTS.md is passive (it constrains only when read), while a model-invoked skill *fires* on triggers, so the discipline reaches agents even when they didn't orient properly. Checking the project's skill layout, then briefing the subagent.

===== [2026-08-24T15:01:04] ASSISTANT =====
Force push landed and is verified: `main` on `mepuka/foldlab` moved from `caa69f9` (the old project) to `2b48107`, and local HEAD and `origin/main` now agree exactly. The new estate is the public face of the repo.

One thing the fetch revealed that needs your call: only `main` was replaced. The remote still carries the old estate's **entire branch fleet** — roughly 120 `agent/*` and `coordinator/*` branches plus eight `archive/*` tags from the pre-reboot project, all now visible on a public repo whose front page is the new lab. Options:

1. **Leave them.** Harmless functionally; the old history stays reachable. Cost: a public branch list full of old-estate noise under the new charter.
2. **Delete the branches, keep the `archive/*` tags.** The branch fleet disappears; the tagged snapshots preserve the old project's marked states. My recommendation if you want the repo clean — but branch deletion on the remote is permanent, so I'll only do it on your explicit word. (Your local checkpoint clones of the old estate exist independently, per the pause checkpoint, so history wouldn't be solely in git's hands either way.)
3. **Delete everything old**, tags included — the fullest clean slate, and the most destructive.

Meanwhile the estate-skill subagent is still writing; I'll report when it lands.

===== [2026-08-24T15:05:41] USER =====
I want to change the repo heading.. its not just on typescript.. we are exploring, looking to build tooling in the new formal verification space for open source. something like: 

Experiments and open source tools for for the formally verified future

use /technical-writing-voice to get rid of cringe LLM wording

===== [2026-08-24T15:06:01] ASSISTANT =====
The estate skill just registered, so the subagent delivered — I'll verify its content after this. Loading the writing voice skill for the heading work.

===== [2026-08-24T15:06:01] USER =====
Base directory for this skill: C:\Users\kokok\.claude\skills\technical-writing-voice

# Technical Writing Voice

Rules for the substance of writing: how a sentence carries its point, how a paragraph teaches, how a heading is worded. The voice: a senior engineer explaining something to a competent colleague who hasn't met it yet — lead with the point, give the mechanism, name the tradeoff, stop.

## Scope

- This governs the words: how a sentence carries its point, how a paragraph teaches, how a heading is worded.
- Length follows context: terse for chat and plans, fuller for teaching docs. The rules below hold at any length.
- Audience default: a working developer new to the specific topic. Assume general fluency; explain the topic.
- Register follows context: chat addresses the reader directly — second person is fine. Reference, explanation, and artifacts use the system voice (no reader address); tutorials and how-tos may address the reader for the steps they take. The rules hold across all.

## Out of scope

This skill governs voice, not structure. It does not cover:

- Document structure — which sections a piece has, their order, and information architecture.
- Formatting and layout — Markdown conventions, tables, code-block style, line length. Inline emphasis is the exception: leaning on a word with bold or italics is a voice choice, governed above.
- Document-type templates — what a README, ADR, runbook, or commit body must contain.
- Length — how long the piece should be.

A passage can follow every rule here and still sit in the wrong structure for its document type. Pair this skill with whatever structure or formatting guide the project uses. When a request turns on those concerns, say so and ask for the relevant guide rather than improvising structure here.

## Words and terms

- Define a term before using it in an argument. A short definition on the same line is enough.
- Use the precise technical term; define it inline if the reader may not know it. Never dissolve jargon into a vague generic phrase to seem accessible.
- Use the real metric word, not a metaphor. "Write latency," not "cost." "Throughput," not "speed," when throughput is meant.
- When two words are equally precise, take the more concrete one. "Points to the slot," not "addresses the slot."
- No italics for emphasis — reserve them for their typographic job (album, book, or case titles). Use bold only in chat, as a standalone line that acts as a section heading — never inside a sentence, bullet, or table cell. In docs and plans, use Markdown headings instead.

## Sentences

- Lead with the point — claim, definition, or problem solved — stated directly. When a definition carries both, lead with the outcome (what it's for) before the mechanism. Qualify in the next sentence, not inside the first.
- No suspense in exposition: never withhold the point to build interest (narrated scene, punchy reveal, teaser heading). Deliver it first.
- Chain a fact to its consequence with "so" or "because." State the mechanism.
- Stay calm. No punchy reveals, no dramatic em-dash drumrolls, no "every time" beats.
- Name the specific consequence — throughput ceiling, connection limit, write latency. Don't let one factor stand in for overall performance.
- Give a decisive verdict when the engineering supports it. Bound the exception empirically ("avoid it only when writes show measurable latency").
- Restate a slippery idea once, more simply, with "in other words."
- No second person in docs or artifacts; write about the system. Chat may address the reader directly, and step-by-step procedures address the reader for the action they take ("run `git bisect good`"). Chumminess stays out either way.
- Cut throat-clearing: "it should be noted that," "in order to," "it is worth mentioning."

## Paragraphs

- Carry an analogy through the mechanism, in an integrated clause. Don't announce the analogy or grade how well it fits.
- For parallel items, frame the category first, then enumerate.
- Show the failure beside the working version when the edge matters. One line on why.
- A code comment explains the decision, not the code.
- Decode canonical wording the reader will meet next: quote the official phrase, then say what it means.

## Headings

- No parenthetical. "What changed in the CSS (the copy)" → "What changed in the CSS copy."
- No second person in a doc or artifact heading; a chat heading may address the reader.
- Word it as the reader's question or a concrete declarative. FAQ-style is good. No catchy phrasing.
- The opening under a heading delivers real information, not a teaser.

## Anti-patterns

Remove these. Most are AI tells.

| Tell | Example | Fix |
|------|---------|-----|
| "This, not that" contrast | "It is not a copy, and not a setting…" | Negation test: delete the "not / not just / rather than / instead of" half; if the point survives, cut it. Keep only to correct a wrong model, on its own line. |
| Self-justifying meta | "the analogy holds where it matters" | Delete. Don't grade or defend the writing. |
| Punchy reveal | "is slow — handshake, auth, setup, every time" | State the overhead plainly. |
| Mystery-novel opening | "A bug turns up that wasn't there last release…" | State the problem directly in the definition. Same withholding as the punchy reveal, slowed to a scene. |
| Metaphor for a metric | "costs," "expensive," "hurts" | Name the real effect. |
| Inline bold or italics | **bolded** keyword mid-sentence; italics for stress | Bold only as a chat section-heading line; italics only for titles. In docs, a Markdown heading. |
| Second person in a doc; chumminess anywhere | "what it costs you"; "you'll see it stay fast" in a doc | Write about the system in docs and artifacts. Chat and procedure steps may address the reader; chumminess never. |
| Cute or vague heading | "When things go wrong" | Concrete question or noun phrase. |

A mechanism comparison that is the actual reason (random vs. sequential reads, hash vs. range) is not the contrast tell. Keep those.

## Examples

Positive examples. Match these.

Definition, then mechanism, then accurate consequence:

> A connection pool keeps a set of database connections open and ready to reuse. Opening a fresh connection for each request adds performance overhead — the network round trips and CPU cost of a TCP handshake, authentication, and session setup. This can significantly limit throughput and risks hitting connection limits on either the client or the database side. A pool lets clients scale to hundreds or thousands of requests per second across a handful of persistent connections.

A tradeoff as a decisive verdict:

> As a rule of thumb, always add the index. Indexes are effectively required for read-heavy tables beyond a few thousand rows, and should be avoided only when writes show a measurable latency impact.

A jargon term defined inline:

> An index helps most when the column has high cardinality — many distinct values relative to the row count. A `user_id` column where almost every value is unique has high cardinality, so a lookup narrows to a single row. A `status` column holding only `active` or `inactive` has low cardinality: a query for `active` still matches half the table, and the optimizer will usually ignore the index and scan instead, since reading those rows sequentially is faster than the scattered random reads the index would require.

An analogy carried through the mechanism:

> A hash index turns the search value into a fixed-size number and uses it to jump straight to the row's location, the way a coat check turns a coat into a numbered ticket and the number leads straight to the right hook. The lookup takes the same time whether the table holds a thousand rows or a billion, because the number points to the slot directly rather than narrowing a range.

An FAQ heading — frame the category, then list:

> #### Why does a query ignore an index that exists?
>
> An index will be skipped when a query can't use it, or when the optimizer chooses — potentially incorrectly — not to use it. Some common gotchas:
>
> - A function wrapped around the column (`WHERE lower(email) = …`) forces a scan, because the index stores the raw column values, so a transformed value has nothing to match.
> - A leading wildcard (`LIKE '%foo'`) gives the index no fixed prefix to seek on.
> - On a low-cardinality column, the optimizer may calculate that a scan is faster and skip the index on purpose.

## Before / after

Edit toward the right column.

| Before | After |
|--------|-------|
| "Opening a connection is slow — a handshake, auth, and setup, every time." | "Opening a fresh connection adds overhead: the round trips and CPU cost of a handshake, authentication, and session setup." |
| "A topic is not a table — instead of a row you overwrite, think of an append-only list." | "A topic is an append-only log of events, read in order." |
| "There are several valid approaches, depending on your use case." | "Three approaches work. Use the composite index; the others read more rows." |
| "Adding indexes is a recommended best practice for performance." | "Add the index. It speeds up reads and adds write latency only on write-heavy columns." |
| "A bug turns up that wasn't there last release, lost in the hundreds of commits since." | "`git bisect` finds the commit that introduced a bug of unknown origin." |


===== [2026-08-24T15:07:37] ASSISTANT =====
Staged: the skill and the README heading. Where things stand:

- **Heading** — README now opens with "Experiments and open-source tooling for formally verified software" plus a two-line laboratory framing; the GitHub description field is still the old one, blocked on token scope — either edit it on the repo page or run the following and I'll retry:

```bash
gh auth refresh -h github.com -s repo
```

- **Estate skill** — live and staged. One conduct note from its own C4: it's machinery that entered the estate un-grilled — commissioned by you, so no rollback, but worth a two-minute read before it gets committed as law.
- **Open decisions** — the old branch fleet on the public remote (leave / delete branches keeping `archive/*` tags / delete all), and where codex dropped the research so intake can start grounding the taxonomy.

===== [2026-08-24T15:10:13] USER =====
delete the branches

===== [2026-08-24T15:10:25] ASSISTANT =====
Deleting all old branches from the remote, keeping `main` and the `archive/*` tags.

===== [2026-08-24T15:10:57] ASSISTANT =====
The ref-pattern matched almost nothing locally — the remote still holds 123 heads. Taking the list straight from the remote instead.

===== [2026-08-24T15:17:36] ASSISTANT =====
Clean sweep, fully reconciled:

- **122 old branches deleted** from the remote; only `main` remains as a head, with the 90 `archive/*` tag refs kept as the old project's preserved snapshots.
- The staged work (estate skill + README heading) was committed and pushed from your side as `ffc58d6` — local and remote `main` now match exactly, working tree clean. The public repo now shows only the new estate: charter, agent spec, contexts, tooling, and the skill.

Still open from before: the GitHub **description field** (token lacks admin scope — edit it on the repo page or `gh auth refresh -h github.com -s repo` and I'll set it), and **where the codex research landed** so intake can start grounding the verification-kinds taxonomy, which is now the top roadmap item.

===== [2026-08-24T15:38:07] USER =====
Ok cool. Alright so now moving on to the first real experiment. Can we implement any core elements of the the unison lang (like the UCM ) in concrete by proving it not only semantically but deterministically identicall output... is that even feasible or desireabale in any sense? what would it mean to borrow the behavior characteristics, grammatical qualities, and verification chain in concrete to start building our own verified language interop tooling? 

First spike: I want you to do a quick pass.. then send a team of opus 5 max boys to explore. meanwhile lets get set up in concrete: https://github.com/lambdaclass/concrete/tree/main

decide if we want to tag an upstream of concrete or a fork? probably just upstream it?

===== [2026-08-24T15:39:17] ASSISTANT =====
Quick pass first, then the fleet.

## The quick pass

**Is it feasible?** Yes, if we scope "core elements of UCM" to what UCM actually *is* underneath: a canonicalization function plus a hash plus an append-only store. Unison's essence isn't the CLI — it's that a definition's identity is the hash of its canonicalized AST (alpha-invariant: variable names erased, so renaming can't change identity; mutual recursion handled by hashing strongly-connected components together), with human names kept as metadata in a separate index. That core is small enough to implement in a young language and rich enough to be worth proving things about.

**"Deterministically identical output" splits into two different claims** — and our gate ladder already separates them:

- *Determinism of ours* — same input term, same hash, always: a G1/G2 theorem about our own implementation (canonicalize is a total function; alpha-equivalent terms get equal canonical forms; distinct canonical forms get distinct serializations, with hash collision as a named trusted assumption). Provable, and Concrete's whole pitch — Core IR as Lean inductives — is exactly the machinery for it.
- *Identical to Unison's* — byte-for-byte agreement with what UCM computes: that is a **G4 conformance observation** against a pinned Unison build. Not provable without formalizing their Haskell; establishable as reproducible differential evidence, which our vocabulary already says is "sampled evidence, never a proof." Framing it this way from day one keeps the claim honest and the experiment publishable.

**Is it desirable?** Strongly — this is arguably the *right* first experiment, because the content-addressed canonical form is the central bus's first primitive. The thesis bets on canonical forms and linkages; a verified canonicalize-and-hash core over ASTs is that bet made concrete. And it generalizes into exactly the "verified language interop tooling" you're pointing at: tree-sitter parses any language's source into a structured tree, our layer canonicalizes and hashes it, and artifacts across languages acquire intrinsic identities — SWHID-adjacent, but with a verification chain behind the identity function. Borrowing shape: Unison contributes the *semantic decisions* (alpha-invariant hashing, names-as-metadata, cycle handling — credited), Concrete contributes the *verification chain* (Lean-defined Core IR, proof fingerprints).

**The honest caveat:** Concrete is young and the blog describes intent as much as implementation. The spike's first question is brutally practical — what does the repo actually build and express *today*? That's the fleet's job.

**Upstream vs fork: upstream.** We're consumers and students, not patch-carriers; a fork would only rot. Clone against upstream, record the commit as a pending pin, and fork later only if we need to carry patches. Setting up now.

===== [2026-08-24T15:40:54] ASSISTANT =====
Fleet is out. While they dig, the record:

===== [2026-08-24T15:41:19] ASSISTANT =====
Setup and spike are in motion:

- **Concrete cloned** at `.reference/clones/concrete`, upstream (no fork — we're students, not patch-carriers; we fork the day we carry a patch), commit `28a25a4` recorded as a pending pin.
- **Three Opus explorers running**, each writing to `.staging/e1/` (pre-grade, gitignored — exactly what staging exists for):
  1. *Concrete capability inventory* — what the language actually builds and expresses today, including a real `lake build` attempt and an assessment of whether an AST + canonicalizer + serializer + hash is expressible in current Concrete.
  2. *Unison hashing internals* — the exact algorithm behind UCM's hashes from the reference source: alpha-invariance, cycle handling, the byte pipeline into the hash, and what byte-identical conformance would actually require.
  3. *E1 experiment spec draft* — three scoping options smallest-first, the full claim structure in our gate vocabulary, a precise treatment of what "deterministically identical" can mean, and the interop generalization.

When all three land, the synthesis move is yours to grill: pick a scoping option, ratify the spec out of staging, and E1 becomes the first Lake project under `formal/` — which would also make it the first artifact to earn a grade the hard way. I'll report as each explorer finishes.

===== [2026-08-24T15:50:53] USER =====
Yeah I want to learn about what the core abstractions are from haskell and how they're utilized in unison.. its sort of breaking my brain because unison code just produces strings that are hashes... so what would it even mean to fork a language that is all forks more or less?? So it would start as our own initial content addressed database... could 

so its an implementation of this: https://arxiv.org/abs/1306.6032

has that been implemented in lean already? 

how much of lean already does that? what would functional equivalence of a typechecker mean really ?

===== [2026-08-24T15:51:58] ASSISTANT =====
Fetching the paper to anchor this before I answer — I want to be sure what 1306.6032 actually is.

===== [2026-08-24T15:53:43] ASSISTANT =====
Working directory drifted — rerunning from the repo root.

===== [2026-08-24T15:54:29] ASSISTANT =====
Both papers are in the ledger with digests, PDFs staged under `.reference/papers/`. Now the answers, because these questions have precise ones.

## The core abstractions Unison takes from Haskell

The single load-bearing abstraction is the **ABT — abstract binding tree**. Unison doesn't define its term type directly; it defines a base functor describing term shapes (application, lambda body, literals…) and wraps it in a generic ABT layer that owns *all* binding structure — variables, abstraction, scoping — uniformly. That separation is what makes everything else fall out: alpha-invariance becomes a structural property of the ABT layer (bound names are positional underneath, so renaming literally cannot change the tree), and hashing is written *once* against ABTs rather than per-construct. On top of that sit two small types doing enormous work: `Reference` — either a builtin or `Derived Hash` — so every non-builtin mention of a definition inside another definition is by hash, never by name; and the codebase itself, which is just a map from hash to definition plus a *separate* namespace structure mapping names to references. The typechecker is then the Dunfield–Krishnaswami algorithm running over ABT terms, extended with abilities in the Frank style.

## The mental model for "code just produces strings"

The unbraining move: the hash isn't something code *produces* — it's what a definition **is**. A Unison codebase is an immutable graph database: definitions are nodes keyed by their content hash, and the hashes inside a definition are edges to its dependencies. Names live in a separate, mutable layer of metadata pointing into that graph. Source text is neither stored nor primary — it's a *view*, re-rendered by the pretty-printer from the graph using whatever names you currently prefer. Once you hold that model, your fork question answers itself: **in a content-addressed world, forking is the zero-cost default state.** Two "forks" are just two name-mappings over an overlapping set of definitions; everything with equal content is automatically the same node, shared, with no merge machinery needed. You don't fork code — you diverge namespaces. So our own initial content-addressed database isn't a fork *of* Unison at all: it's a new store that, if our hashing conforms (the E1 G4 lane), shares identity with Unison's ecosystem for free wherever content agrees.

## The lineage, precisely

Unison is three inheritances braided together, and it pays to keep them separate: the **identity layer** (ABTs + content hashing) is Unison's own engineering, not from either paper; the **type layer** is Dunfield–Krishnaswami 2013 — you were right, that's the documented basis of the typechecker; the **effect layer** is Frank (your second link) — abilities are its effect-handler calculus adapted. E1 as scoped targets the identity layer; the papers you just brought in become load-bearing the moment we touch the type layer.

## Has DK been done in Lean, and how much of Lean "already does that"

DK has been *mechanized* — the landmark is Zhao, Oliveira & Schrijvers (ICFP 2019), which formalized the algorithmic system and its metatheory in the Abella prover, with Coq-tradition work following. **In Lean 4, to my knowledge, there is no established mechanization of DK — that's an open slot**, and note what it would be: a Lean formalization of the typechecker of a language whose runtime we're studying, in the prover we've married. That's not a side quest; it's the wager in miniature. Verify prior art during the research pass before we claim novelty, but I know of nothing standard.

On Lean itself: it has the **ingredients but not the architecture**. Lean's kernel `Expr` uses de Bruijn indices — alpha-invariance by construction, exactly the canonical-form property Unison engineers via ABTs — and hash-consing with cached hashes for sharing. But identity in Lean is the hierarchical `Name`: the environment maps names to declarations, and content hashes serve build caching and invalidation, never semantic identity. Lean canonicalizes and hashes; it doesn't *address* by hash. Worth knowing: **lean4lean** (Carneiro) is Lean's kernel typechecker formalized in Lean — the standing precedent for typechecker-in-Lean work.

## What functional equivalence of a typechecker really means

The naive reading — for every program, both implementations accept or reject identically, with equal outputs — is underspecified the moment you poke it: equal *which* outputs (inferred types up to alpha? up to definitional equality? error messages?), over *which* programs (surface syntax or post-elaboration?), and what about unification order, fuel limits, and other benign nondeterminism.

The DK paper itself demonstrates the right answer, and it's the P3 move exactly. DK gives a small **declarative system** — the specification of which typings are derivable — and an algorithmic system proven **sound and complete** against it. So: two typechecker implementations are functionally equivalent when *each* is proven sound and complete against the *same declarative specification*. They never get compared to each other at all — the spec is the meeting point, equivalence on acceptance falls out as a corollary, and outputs agree up to whatever equivalence the declarative system induces. Implementation-versus-implementation byte agreement remains available as a separate, weaker, G4 differential claim. Same split as E1's hashes: theorems against the small declarative object, observations against the pinned peer — one architecture, appearing at every layer. That recurrence is the strongest evidence yet that the charter's shape is right.

===== [2026-08-24T15:55:40] USER =====
<task-notification>
<task-id>a3ba324c77dc4ddc7</task-id>
<tool-use-id>toolu_01SkzfRC9X8aUxGjEDDhS9vi</tool-use-id>
<output-file>C:\Users\kokok\AppData\Local\Temp\claude\C--Users-kokok-Dev-foldlab\6e7a5516-811a-4a5b-b0a5-fc08ebd5fddd\tasks\a3ba324c77dc4ddc7.output</output-file>
<status>completed</status>
<summary>Agent "E1 experiment spec draft" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>Draft written. Report path: `C:\Users\kokok\Dev\foldlab\.staging\e1\experiment-spec-draft.md` (806 lines, staged material, pre-grade, no gate stamped).

**The three scoping options**

**O1 — Own term language, own scheme.** Project-owned untyped-lambda-calculus-sized term type, de Bruijn canonicalization, injective serialization, digest as an abstract parameter, append-only store plus separate name layer; proves the full G1 spine (T1–T13) with no foreign contract, so G2 is unavailable by construction.
Effort E-M; teaches whether the theorem *statements* are right — above all that "determinism of canonicalization" is near-vacuous in a total-function model and representation-independence plus quotient-respect is the real content; its weakness is that the G4 lane degenerates to a Lean↔TypeScript differential.

**O2 — Subset of Unison's term AST, targeting hash conformance.** Same spine over a faithful subset of Unison's term representation and its versioned hashing scheme, plus a reproducible differential harness driving a pinned Unison binary and recording seed, corpus digest, binary digest, and hashing-scheme version; adds G2 traceability and G4 as the actual payload.
Effort E-L (cost dominated by the conformance apparatus, not the theorems); teaches the real price of conformance to an implementation-defined foreign algorithm and forces the estate's G2/G4 machinery — receipts, sampled-evidence discipline, pin-drift detection — into existence for the first time.

**O3 — Language-agnostic layer over tree-sitter ASTs.** Generic node family (kind, fields, children, leaf bytes) with a per-language normalization profile declaring trivia, unordered fields, and binders; theorems parameterized over the profile, with tree-sitter as a named C FFI trusted seam and the claim boundary drawn at the AST.
Effort E-L to E-XL; teaches whether the interop thesis survives contact, and surfaces the ruling that once a parser is trusted, "identity of the artifact" becomes "identity of what this parser said it was" — cheap to learn with one grammar, expensive after six.

**Findings worth relaying beyond the three options**

- **R1 (hard constraint):** Concrete's `ProvableV1` excludes recursion, heap-owning values, allocation, and strings — all four needed by a tree canonicalizer. The canonicalization half of the UCM core **cannot be a proof-eligible Concrete function today**; it can be written in Concrete (the clone ships a 1300-line Lisp and a 1183-line Lox interpreter) but only as `enforced`/`tested_by_oracle`, never `proved_by_lean`. The realistic split is Lean for canonicalization theorems, Concrete as a candidate host for the *digest primitive* (SHA-256 forced `u32` wrapping arithmetic, `bitand`, `shr`, `shl` into `ProvableV1`).
- **R2 (needs verifying before reliance):** at clone revision `28a25a4e2`, `examples/hmac_sha256/README.md` states "11 verified, 0 failed" while the checked-in `snapshot/proof-status.txt` reports all eleven links `unbound`, and `src/main.con` has 11 `#[proof_by]` and 0 `#[proof_fingerprint]`. Possibly a deliberate fail-closed demonstration — but not believable without running the artifact.
- **Interop hook with a customer:** Concrete's body fingerprint is a text-compared S-expression canonical form that *embeds binder names* (`(var x)`), so a parameter rename invalidates a still-valid attached proof. Its roadmap R-0004 is described as owning a versioned `ProofSubjectDigest` — that is exactly E1's missing digest-plus-scheme-version step, and alpha-soundness is the fix.
- **Trust structuring:** the core parameterizes on `H`, so the soundness direction (`t₁ ≈ t₂ → same identity`) needs *no* cryptographic assumption; collision resistance enters only as a *hypothesis* of the converse theorem, never as an `axiom`, keeping the axiom report clean. `native_decide` is pre-registered as banned.
- **Vocabulary collision (R6):** Source Provenance owns "Content Digest" (bytes-as-stored); E1's object is deliberately not that and needs a distinct term — flagged before it spreads.
- Six open questions each carry the decision they block; the largest is Q1 (recursive binding groups — optional for O1, mandatory for O2, and the thing a prototype silently omits).</result>
<usage><subagent_tokens>133884</subagent_tokens><tool_uses>31</tool_uses><duration_ms>896181</duration_ms></usage>
</task-notification>

===== [2026-08-24T15:56:05] ASSISTANT =====
First explorer is back — the **E1 spec draft** landed at `.staging/e1/experiment-spec-draft.md` (806 lines, correctly marked pre-grade). The three scoping options, compressed:

- **O1 — own term language, own scheme.** Lambda-calculus-sized, de Bruijn canonicalization, digest as abstract parameter; proves the full theorem spine with no foreign contract. Cheapest; teaches whether the theorem *statements* are right — notably that "determinism" is near-vacuous for a total function, and the real content is alpha-quotient respect.
- **O2 — subset of Unison's actual term AST, targeting hash conformance.** Same spine plus the reproducible differential harness against a pinned Unison binary. Cost lives in the conformance apparatus, not the theorems — and it forces our G2/G4 machinery (receipts, sampled-evidence discipline, pin drift) into existence for the first time.
- **O3 — language-agnostic layer over tree-sitter ASTs.** The interop thesis directly, with per-language normalization profiles and the parser as a named FFI trusted seam. Most expensive; its lesson is that "identity of the artifact" becomes "identity of what this parser said it was."

Four findings worth your attention before the grill:

1. **Hard constraint on the architecture:** Concrete's proof-eligible fragment (`ProvableV1`) currently excludes recursion, heap values, allocation, and strings — all four things a tree canonicalizer needs. So canonicalization *cannot* be a proved Concrete function today; the realistic split is **Lean proves the canonicalization theorems, Concrete candidates only for the digest primitive** (SHA-256's wrapping-arithmetic loop fits the provable fragment).
2. **Integrity flag in the clone:** one Concrete example's README claims "11 verified, 0 failed" while its checked-in proof-status file reports all eleven proof links unbound. Possibly a deliberate fail-closed demo — the capability agent's build run should settle it.
3. **A genuine interop hook:** Concrete's proof fingerprints embed binder *names*, so renaming a parameter invalidates a still-valid proof — and their own roadmap wants a versioned proof-subject digest. That is exactly E1's alpha-invariant identity layer. Our first experiment may have its first outside customer before it exists.
4. The estate discipline caught a **vocabulary collision** unprompted: provenance owns "Content Digest" (bytes-as-stored), and E1's object is deliberately not that — a distinct term is needed before usage spreads. The double constraint is earning its keep.

Also clean trust structuring: collision resistance enters only as a hypothesis of the converse theorem, never as an axiom, so the axiom report stays clean; `native_decide` pre-registered as banned.

Two explorers still out — Concrete capability inventory (whose build run adjudicates finding 2) and Unison hashing internals (which decides whether O2's conformance target is even pinnable). Synthesis and the grill once all three are in.

===== [2026-08-24T16:00:53] USER =====
Hmm so could create functional proof existence that we can implement their hashing system... because we dont need lean to run concrete.. we need it to use the design and language analysis features of concrete no?

===== [2026-08-24T16:01:38] ASSISTANT =====
Yes — and that reframe dissolves the R1 constraint almost entirely. You've put your finger on the role split the spec should adopt as a ruling. Three roles, three artifacts:

**Lean holds the existence proof — by construction.** In a constructive prover, "proof that we can implement their hashing system" isn't a separate existence theorem: you *write the function*. Define canonicalize-serialize-hash in Lean against the modeled spec, and its definition is the realizability proof; the theorems (alpha-quotient respect, injectivity on canonical forms, digest-scheme versioning) attach to it as G1 claims. And because Lean definitions execute, that model is simultaneously the **reference implementation** — it runs, generates test vectors, and prints hashes. That's Xia's executable denotational semantics doing its job, and it satisfies the estate's generated-vectors rule for free: conformance fixtures come from executing the model, never hand-typed.

**Concrete's value is analyzability, not proof-eligibility — exactly as you say.** We never needed `ProvableV1` to cover the canonicalizer, because the theorems don't live in Concrete. What Concrete contributes is that an implementation written in it is *radically auditable*: no closures, no hidden captures, statically enumerable program, capability headers, explicit failure modes — and, decisively, its Core IR is Lean inductive types. That last fact keeps a door open no other host language offers: a future **G3 claim** — "this Concrete implementation's Core IR term refines the Lean reference function" — is a statement between two Lean objects. Hard work, but *stateable* natively, with no extraction gap and no foreign-semantics formalization. Against a Haskell or Rust host, that claim costs a research program; against Concrete it costs a proof.

**The Unison binary stays the conformance peer.** "We implemented *their* hashing system" is discharged at two strengths, matching the split we already fixed: observationally now — the differential harness runs the Lean reference and the pinned Unison binary over generated corpora (G4, sampled evidence) — and formally later, only if Unison's algorithm itself ever gets modeled.

So the working architecture for E1: **Lean = spec + theorems + executable reference; Concrete = the systems-grade implementation host chosen for analyzability, conformance-tested against the Lean reference; Unison = the pinned external peer.** Nothing in that chain needs Lean at runtime, and nothing needs Concrete's proof gate — Concrete is there for its design and analysis surface, with its Core-IR-in-Lean property held as the upgrade path from tested to proved.

One consequence worth savoring: this makes the Lean reference implementation the *center* artifact — the thing both the Concrete build and the Unison binary get measured against. That's P3's shape again: one small verified object, everything else conformance-tested toward it.

This goes into the spec as a proposed ruling when you grill it — the two remaining explorers (Concrete build reality, Unison's exact byte pipeline) will tell us whether the reference implementation's job is easy or merely tractable.