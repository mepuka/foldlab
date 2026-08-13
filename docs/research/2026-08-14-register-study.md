# Register study: how abstract-tool documentation actually teaches
2026-08-13 — operator-directed study of how Nix/Terraform/Git/SQLite/Rust/Dhall/Automerge/Kafka teach their hardest concepts, commissioned after three failed visual rounds (animation, data posters, metaphor posters).

## Primary sources fetched (all quotes below are from these)

| # | Source | URL |
|---|---|---|
| 1 | nix.dev — Ad-hoc shell environments (tutorial) | `nix.dev/tutorials/first-steps/ad-hoc-shell-environments.html` |
| 2 | nix.dev — Nix language basics | `nix.dev/tutorials/nix-language.html` |
| 3 | nix.dev — tutorials index / site structure | `nix.dev/tutorials/index.html` |
| 4 | nix.dev — Diátaxis contributing page | `nix.dev/contributing/documentation/diataxis.html` |
| 5 | Nix manual — store object | `nix.dev/manual/nix/2.28/store/store-object` |
| 6 | Nix manual — content-address | `nix.dev/manual/nix/2.28/store/store-object/content-address` |
| 7 | Nix Pills 6 — Our first derivation | `nixos.org/guides/nix-pills/06-our-first-derivation.html` |
| 8 | Terraform — Purpose of State | `developer.hashicorp.com/terraform/language/state/purpose` |
| 9 | Terraform — Build infrastructure (tutorial) | `.../terraform/tutorials/aws-get-started/aws-build` |
| 10 | Terraform — Resource drift tutorial | `.../terraform/tutorials/state/resource-drift` |
| 11 | Pro Git — Git Internals: Git Objects | `git-scm.com/book/en/v2/Git-Internals-Git-Objects` |
| 12 | Git from the Bottom Up | `jwiegley.github.io/git-from-the-bottom-up/` |
| 13 | SQLite — Atomic Commit In SQLite | `sqlite.org/atomiccommit.html` |
| 14 | SQLite — How SQLite Is Tested | `sqlite.org/testing.html` |
| 15 | The Rust Book — What Is Ownership? | `doc.rust-lang.org/book/ch04-01-what-is-ownership.html` |
| 16 | Dhall — Safety guarantees | via `dhall-lang` docs source |
| 17 | Automerge — docs (reference/documents, hello) | `automerge.org/docs/...` |
| 18 | Kafka — Introduction | `kafka.apache.org/intro` |
| 19 | Diátaxis — Explanation | `diataxis.fr/explanation/` |

Two sources refused (HTTP 403/404): Kreps's "The Log" on LinkedIn Engineering, and
docs.dhall-lang.org's rendered page. I recovered Dhall from its docs source and
substituted Kafka's own intro for the log lineage. Kreps is cited nowhere below
because I could not read it — I do not quote what I could not fetch.

**foldlab files read:** `README.md`, `CONTEXT.md`, `VERIFICATION.md`,
`docs/OPERATIONS.md`, `docs/map/map.md`, `proto/SPEC.md`,
`proto/wire/CONTRACT.md`, `proto/ts/test/smoke.test.ts`, `proto/ts/src/`,
`proto/go/cmd/`, `package.json`.

---

## PART 0 — foldlab's current register inventory

Before recommending, here is what exists, classified by register:

| File | Register today | First contact? |
|---|---|---|
| `README.md` | **Explanation, compressed to abstract** — theory-first, no command until line 103 | Yes (by default) |
| `CONTEXT.md` | **Glossary/reference** — 40+ terms, definitional, `_Avoid_` anti-synonyms | No |
| `VERIFICATION.md` | **Claims ledger** — a genuinely rare and good register | No |
| `proto/SPEC.md` | **Normative spec** (coordinator-owned) | No |
| `proto/wire/CONTRACT.md` | **Wire reference** — subjects, shapes, refusal table | No |
| `docs/adr/`, `docs/map/` | **Decision record / project state** | No |
| `docs/OPERATIONS.md` | **How-to** (repo operations) | No |
| `proto/ts/test/smoke.test.ts` | **Accidentally the best tutorial in the repo** | No — buried |

**The structural finding:** foldlab has five registers and *none of them is a
tutorial*. There is no document in which a reader does something and sees output.
First contact is `README.md`, which is pure explanation at maximum abstraction —
sorts, catamorphisms, Apalache invariants, 15,378 schedules — before the reader
has typed one command. Every corpus below inverts that ordering. **The three
failed visual rounds were attempts to make first contact *prettier* when the
problem is that first contact is the wrong register entirely.**

Second structural finding: **foldlab has no human-facing executable surface.**
`proto/go/cmd/` contains `protod` (a daemon) and `wirefix` (a fixture generator).
`package.json` scripts are `test`, `typecheck`, `bench`. Every corpus's
first-ten-minutes is a command a human types and an output a human reads. foldlab
currently cannot offer one. This is the single largest blocker to adopting any of
the patterns below, and it is a *build* item, not a *writing* item.

---

## PART 1 — CORPUS STUDIES

---

### 1. NIX / NIXOS — three registers for one system

**(a) REGISTER MAP.** Nix runs the cleanest register separation of any corpus
studied, and says so explicitly. nix.dev's contributing page states: *"We aim to
build our documentation according to the Diátaxis framework for technical
documentation, which divides documentation into four categories."* It then draws
the distinction most projects get wrong, as a voice test: guides are *"step 1: do
this, step 2: do that, etc"* in a working context; tutorials are *"take my hand as
I show you how to do this"* in a learning context. Reference should *"Focus on
'what's there', simply listing which functions, classes, etc. exist."*

The site sections are **Tutorials / Guides / Reference / Concepts / Contributing**
(source 3). But the crucial fact is that this is only *two* of the three
registers. The third is off-site and unofficial: **Nix Pills**, hosted at
nixos.org/guides, which is neither tutorial nor reference nor explanation in the
Diátaxis sense — it is a *serial archaeology*.

So one system carries three registers with three different contracts:

- **nix.dev tutorials** — first contact, task-shaped, concept-deferring.
- **Nix reference manual** — definitional, zero examples.
- **Nix Pills** — mechanism-first, deliberately failing, addressed to someone who
  wants to know *how it actually works*.

First contact is carried by the tutorial, unambiguously.

**(b) THE FIRST TEN MINUTES.** The ad-hoc shell tutorial's opening move is
remarkable: it makes the reader run a command that **fails**.

```
$ cowsay no can do
The program 'cowsay' is currently not installed.
```

Then: `nix-shell -p cowsay lolcat`, whose output includes *"these 3 derivations
will be built: /nix/store/zx1j8gchgwzfjn7sr4r8yxb7a0afkjdg-builder.pl.drv"*.

Note the sequencing precisely: **the reader sees a store path and the word
"derivation" in real output before either has been defined.** They are not
explained; they scroll past as evidence that something real happened. The abstract
concept *reproducibility* is not named until the final section, *"Towards
reproducibility"*, roughly 75% through.

The language tutorial repeats the move at a smaller scale — `1 + 2` evaluates to
`3`, and `{ a = 1; }` is shown before the reader is told it is called an
*attribute set*. The definitional sentence lands after: *"A piece of Nix language
code is a Nix expression. Evaluating a Nix expression produces a Nix value."*

**(c) THE TANGIBLE-EXAMPLE PATTERN.** The best example in the Nix corpus is Nix
Pills' treatment of the derivation, and its device is **deliberate breakage**:
*"Let's try to fake the name of the system"* — the reader constructs an invalid
`system` attribute and reads the resulting error. Pills also refuses to pretend
the lesson succeeded: *"Yes, this post is about 'our first derivation', but I
never said it was a working one."*

Why it works: it builds on something every developer already has — **the
experience of reading an error message and inferring the rule that produced it.**
A derivation is invisible; a rejection of a malformed derivation is not. The
reader learns the shape of the concept from the shape of its refusal.

Pills also uses explicit deferral as a load-bearing device: *"Don't worry about
the nixpkgs stuff for now, just know that we added a series of variables to the
current scope."* This is permission to not-understand, granted in writing, which
keeps a reader moving through a page that would otherwise stall them.

**(d) AUDIENCE CALIBRATION.** Prerequisites are stated as a bulleted contract at
the top of tutorials — *"Familiarity with software development... A Nix
installation to run the examples"* — and the scope is fenced in the first
sentence: *"This is an introduction to reading the Nix language, for the purpose
of following other tutorials and examples."* That is a *narrowing* statement: it
tells you what this document will NOT do (teach you to write Nix), which is how it
earns the right to be short. Reference lives behind a Glossary link. Different
arrival knowledge is handled by *separate documents with stated contracts*, not by
hedging inside one document.

**(e) THE ANTI-PATTERN foldlab MUST AVOID.** The Nix reference manual's store
chapters. Source 5 defines a store object as *"A store object consists of a file
system object as data"* and *"a set of store paths as references to store
objects"* — graph-theoretic, closure properties, requisites/referrers — with **no
examples and no commands.** Source 6, the content-addressing page, is worse for
foldlab's purposes: it explains the sentinel-substitution trick for
self-references (hash fixed points being *"computationally infeasible"*) and
**shows not a single actual store path or hash value.** A page defining
content-addressing that never displays a content address.

This is *exactly* foldlab's README failure mode: the most concrete thing in the
system (a 64-hex-character digest that anyone can recompute) explained in prose
that never shows one. foldlab's README says identity *"is a SHA-256 digest over
those bytes"* and never prints a digest.

---

### 2. TERRAFORM — the reference standard for explaining an invisible abstraction

**(a) REGISTER MAP.** Terraform splits into `/language/` (reference +
explanation, versioned with the product), `/cli/` (reference), and `/tutorials/`
(a separately-branded learning track on developer.hashicorp.com). Notably,
**"Purpose of Terraform State" lives in the *language reference* tree, not in a
tutorials or blog tree.** It is an explanation document filed under reference — a
deliberate Diátaxis break, and a correct one: the reader arrives there from the
`state` reference pages with a *why* question, which is precisely Diátaxis's own
trigger for explanation (*"it's useful to have a real or imagined why question to
serve as a prompt"*, source 19).

First contact is carried by the tutorial track. But **first contact with the
hardest concept (state) is carried by the explanation page**, and readers arrive
at it from confusion, not from onboarding.

**(b) THE FIRST TEN MINUTES.** The AWS build tutorial (source 9) states
prerequisites as a hard list — *"The Terraform CLI (1.2.0+) installed. The AWS CLI
installed. An AWS account..."* — then runs: `mkdir`, write two `.tf` files,
`terraform fmt`, `terraform init`, `terraform validate`, `terraform apply`.

Two teaching moves worth stealing:

1. **The tutorial narrates the side effects the reader cannot see.** After init:
   *"Terraform downloaded the `aws` provider and installed it in a hidden
   `.terraform` subdirectory of your current working directory."* It tells you
   what changed on disk, in a hidden directory, that you would otherwise never
   notice.
2. **The plan output is presented with its legend.** *"Resource actions are
   indicated with the following symbols: + create"*, all computed attributes
   marked `(known after apply)`, and closing with *"Plan: 1 to add, 0 to change, 0
   to destroy."* The tool's own output is the pedagogy; the prose annotates it
   rather than replacing it.

The word "state" gets a passing mention here. Its full explanation is deferred to
a document the reader reaches later, after `terraform.tfstate` has already
appeared in their directory.

**(c) THE TANGIBLE-EXAMPLE PATTERN — the best single artifact in this whole
study.**

"Purpose of Terraform State" works by **naming the design the reader is already
silently proposing, and killing it with a failure report.** Section 1, on mapping
to the real world, immediately confronts the obvious objection — why not just tag
cloud resources?:

> *"Early prototypes of Terraform actually had no state files and used this
> method. However, we quickly ran into problems."*

Then the reasons: not all resources support tags, not all providers support tags.
Section 2 does it again for dependency ordering, naming the alternative —
*"Terraform could take another approach to dependency order by using an underlying
hierarchy of order between resource types"* — and then detonating it:

> *"The complexity for this approach quickly explodes, however: in addition to
> Terraform having to understand the ordering semantics of every resource for
> every provider, Terraform must also understand the ordering across providers."*

**Why it works:** it builds on something the reader definitely already has —
**their own skepticism.** A reader encountering `terraform.tfstate` for the first
time is not neutral; they are annoyed. They have a theory that this file is
unnecessary bookkeeping. The document does not argue that state is elegant. It
says: *we tried your idea, here is where it broke.* The concept becomes concrete
because the reader's own rejected alternative becomes the tangible object.

Terraform is also the only corpus that teaches an invisible concept by having the
reader **manufacture its violation.** The drift tutorial (source 10) instructs the
reader to go behind Terraform's back with the AWS CLI — `aws ec2
create-security-group`, attach it manually — and then run `terraform plan
-refresh-only` to see:

> *"Terraform detected the following changes made outside of Terraform since the
> last 'terraform apply'"*

with the literal diff `~ vpc_security_group_ids = [ + "sg-0226...", - "sg-0b31..."
]`. Drift is invisible until you make some, then it is a two-line diff.

**(d) AUDIENCE CALIBRATION.** Terraform assumes a working practitioner throughout
— no beginner track — but calibrates via **arrival path**: reference pages for
people who know what they want, tutorials for sequenced learning, and explanation
pages positioned at the exact point where a practitioner's confusion peaks. The
state-purpose page also gives multiple *reasons* for state (mapping, metadata,
performance, syncing), letting readers with different concerns each find theirs.

**(e) ANTI-PATTERN.** The tutorial track requires an AWS account and real cloud
spend. First contact is gated behind provisioning credentials at a third party.
The lesson for foldlab: **do not gate first contact behind setup.** If the reader
must stand up a NATS server, build a Go daemon, and install bun before seeing a
digest, most will not.

---

### 3. GIT — the corpus that content-addressing was taught with

**(a) REGISTER MAP.** Three registers, of which only one is official:

- **`git help <cmd>` / man pages** — pure reference, options-and-flags,
  notoriously opaque for concepts.
- **Pro Git (official book, on git-scm.com)** — the explanation register that the
  man pages lack. Its object model lives in ch. 10, *Git Internals* — the very
  last chapter.
- **"Git from the Bottom Up" (Wiegley, third-party)** — an inversion: the
  internals chapter promoted to chapter one.

First contact officially is Pro Git ch. 1–3 (workflow). The object model is
deliberately deferred to the end. Wiegley's document exists precisely because that
deferral fails some readers, and states its motivation as revealing *"a bit of the
simplicity underlying it — however dizzying its array of options may seem from the
outside."*

**(b) THE FIRST TEN MINUTES — and the one place a corpus names the concept
first.**

Pro Git's Git Objects chapter opens:

> *"Git is a content-addressable filesystem. Great. What does that mean? It means
> that at the core of Git is a simple key-value data store."*

The term is named **before** the first command — and this is the exception that
proves the rule, because look at the *shape* of the naming. The jargon is stated,
then immediately hung with the reader's own reaction (*"Great. What does that
mean?"*), then translated into something the reader unquestionably already knows
(*a key-value store*), all in three sentences. It is not "named before the reader
has touched it"; it is **named and immediately cashed out**, and then touched
within four lines.

The sequence:

```
$ git init test
Initialized empty Git repository in /tmp/test/.git/
$ cd test
$ find .git/objects -type f          # (empty)

$ echo 'test content' | git hash-object -w --stdin
d670460b4b4aece5915caf5c68d12f560a9fe3e4

$ find .git/objects -type f
.git/objects/d6/70460b4b4aece5915caf5c68d12f560a9fe3e4

$ git cat-file -p d670460b4b4aece5915caf5c68d12f560a9fe3e4
test content
```

Four commands. The whole of content-addressed storage.

**(c) THE TANGIBLE-EXAMPLE PATTERN.** This is the strongest example in the entire
study for foldlab, so it deserves dissection.

The reader already understands **files in directories**. `find .git/objects -type
f` returns nothing. Then one command returns a 40-character string. Then the
*same* `find` returns a file whose path *is* that string, split after two
characters. Then the string retrieves the content back.

Three things the reader already knows are doing all the work:

1. A directory listing before and after — the classic empty/not-empty proof that a
   side effect occurred.
2. The path on disk **literally being** the hash — the identity claim is not
   asserted in prose, it is visible as a filename.
3. Round-trip retrieval by the key — proof that the address is sufficient.

No diagram. No metaphor. No animation. The abstraction was made concrete by `find`
and `cat`. And note that the tangible object is **the digest itself, printed**.
Pro Git shows `d670460b4b4aece5915caf5c68d12f560a9fe3e4` on the page. The Nix
manual, teaching the same concept, shows none. This is the difference between the
best and worst pages in the study.

**(d) AUDIENCE CALIBRATION.** Pro Git handles arrival knowledge by **ordering**:
workflow chapters first, internals last, with the internals chapter explicitly
optional-but-illuminating. Wiegley handles the opposite audience — people for whom
the workflow never made sense without the model — by front-loading definitions
(repository, index, working tree, commit, branch, tag, HEAD) before any command.
Both tracks exist because *one ordering does not serve both audiences*, and
neither book tries to serve both.

**(e) ANTI-PATTERN.** "Git from the Bottom Up" front-loads a vocabulary block. Its
introduction defines eight terms and a lifecycle diagram before the reader runs
anything; the analysis of it found *"The introduction concludes without
prescribing immediate actions."* It is the *better* document for a certain reader
and still the weaker opening. **foldlab's CONTEXT.md is this anti-pattern at 3× the
dose** — forty-plus terms, each with an `_Avoid_` list, before any reader has seen
a digest. CONTEXT.md is excellent *as a glossary consulted during work*; it is not
first contact and must never be positioned as such.

---

### 4. SQLITE — hard systems content in a plain register

**(a) REGISTER MAP.** SQLite has no tutorials at all — a deliberate choice. Its
registers are: **reference** (SQL syntax, C API, file format), **explanation
essays** (atomic commit, WAL, how it is tested, when to use), and
**quirks/gotchas** pages. The essays are the distinctive register: long-form,
numbered, illustrated, and written to be read start-to-finish.

**(b) THE FIRST TEN MINUTES.** Not applicable in the usual sense — and that is the
finding. SQLite's answer to first contact is that you *already* have first
contact: SQLite is embedded in the thing you are using. The atomic-commit essay
therefore opens not with a task but with a **fence around its own scope**:

> *"An important feature of transactional databases like SQLite is 'atomic
> commit'. Atomic commit means that either all database changes within a single
> transaction occur or none of them occur."*

immediately followed by:

> *"The information in this article applies only when SQLite is operating in
> 'rollback mode', or in other words when SQLite is not using a write-ahead log."*

Sentence one defines the guarantee in plain words. Sentence two states the
conditions under which the article is true. That two-sentence opening is a
template.

**(c) THE TANGIBLE-EXAMPLE PATTERN.** The **hypothetical failure walkthrough with
a coordinate reference**. The essay first lays out commit as twelve numbered
stages (3.1 through 3.12), each with a figure showing bytes moving across user
space / OS cache / disk with consistent color coding. Then section 4 does this:

> *"Suppose the power loss occurred during step 3.10 above, while the database
> changes were being written to disk. After power is restored, the situation might
> be something like what is shown to the right. We were trying to change three
> pages of the database file but only one page was successfully written."*

Why it works: **the numbered stages become addressable coordinates.** Once "3.10"
is a named place, the essay can drop the reader at any point in the mechanism and
ask "now what?" The reader already understands *interruption* — power loss is not
a technical concept. The essay borrows that intuition and applies it at a precise,
previously-established location.

Note what the figures are: pictures of **pages and file bytes**, not metaphors.
The one corpus in this study that leans hardest on diagrams uses them as literal
depictions of the data layout, and only *after* a mechanical walkthrough has
established what the boxes are.

The `testing.html` essay contributes a second pattern foldlab already half-owns:
the **claims ledger with named limits.** *"The reliability and robustness of
SQLite is achieved in part by thorough and careful testing."* Specific numbers:
*"590 times as much test code and test scripts"*, *"100% branch test coverage
under TH3 in its default configuration as measured by gcov"*, *"6754 assert()
statements"*. And then the self-indictment:

> *"Note that running SQLite with gcov is not a test of SQLite — it is a test of
> the test suite... The gcov run merely verifies that the test suite provides 100%
> branch test coverage."*

That sentence buys the credibility of every other number on the page. Likewise the
atomic-commit essay disclaims what it does not cover: *"SQLite assumes that the
detection and/or correction of bit errors caused by cosmic rays, thermal noise...
is the responsibility of the underlying hardware and operating system"*, and
admits live problems: *"We have received reports of implementations of both
Windows network filesystems and NFS in which locking was subtly broken."*

**(d) AUDIENCE CALIBRATION.** SQLite assumes a competent systems programmer,
uniformly, and calibrates by **document choice** — a user who wants to *use*
SQLite never opens `atomiccommit.html`. The essays state their own audience in the
first paragraph and let readers self-select out.

**(e) ANTI-PATTERN.** These essays are *long* — atomic commit runs to nine
top-level sections with ~30 subsections and no summary box, no TL;DR, no "what you
need to remember." A reader who wants the shape of the guarantee without the full
mechanism has nowhere to stop. foldlab's `VERIFICATION.md` is already trending
this way: dense claim paragraphs with bounds and gaps interleaved, and no
per-claim one-line summary a reader can skim.

---

### 5. THE RUST BOOK — teaching a genuinely alien concept

**(a) REGISTER MAP.** The Book (tutorial-shaped explanation), the Reference
(spec), Rust by Example (how-to-shaped), and the Nomicon (advanced explanation).
Ownership's first contact is the Book, ch. 4 — after three chapters of ordinary
programming.

**(b) THE FIRST TEN MINUTES.** The Book breaks the pattern the other corpora
follow, and does it consciously. It **names the difficulty explicitly**:
*"Ownership is a new concept for many programmers, it does take some time to get
used to."* Then it **states the formal rules up front, before the examples**:

> *"First, let's take a look at the ownership rules. Keep these rules in mind as we
> work through the examples that illustrate them:*
> - *Each value in Rust has an owner.*
> - *There can only be one owner at a time.*
> - *When the owner goes out of scope, the value will be dropped."*

Three sentences, no jargon, memorizable. Then the sequence: stack vs. heap → scope
→ `String` → allocation → move → `Copy` → functions.

The rules-first ordering only works because of two supports: the difficulty is
pre-announced (so a confused reader knows confusion is expected, not a failure),
and the rules are stated in *words the reader already owns*. "Owner", "scope",
"dropped" — no term in the rule list requires a definition.

**(c) THE TANGIBLE-EXAMPLE PATTERN.** The restaurant analogy chain, used for
allocation:

> *"Think of being seated at a restaurant. When you enter, you state the number of
> people in your group, and the host finds an empty table that fits everyone and
> leads you there."*

and extended: *"consider a server at a restaurant taking orders from many tables.
It's most efficient to get all the orders at one table before moving on to the
next table."* Plus the stack: *"Think of a stack of plates."*

Why it works — and the caveat foldlab needs: these analogies are for the
**prerequisite** (heap allocation, cache locality), never for the **target
concept**. There is no analogy for ownership itself. Ownership is taught with the
rules and with `String` code that fails to compile. The Book uses metaphor to
build the ground the alien concept stands on, then teaches the alien concept
literally. **Metaphor for the substrate; mechanism for the thing being taught.**
Given foldlab's failed metaphor-poster round, this distinction is the single most
important calibration in the study.

**(d) AUDIENCE CALIBRATION.** The Book assumes general programming experience and
no systems background — hence the stack/heap primer inside ch. 4 rather than as a
prerequisite. Readers arriving with C experience can skip it; the section is
separable. Calibration is by **excisable prerequisite blocks**, not by branching
tracks.

**(e) ANTI-PATTERN.** *"The good news is that the more experienced you become with
Rust and the rules of the ownership system, the easier you'll find it to naturally
develop code that is safe and efficient. Keep at it!"* — encouragement in place of
resolution. Reassuring the reader that it will click later is a substitute for
making it click now, and it is the one place the chapter reads as pastoral rather
than instructional.

---

### 6. DHALL — a guarantees page, which is the register foldlab most needs

**(a) REGISTER MAP.** Dhall splits `/tutorials/`, `/howtos/`, `/discussions/`,
`/references/` — Diátaxis by the book. "Safety guarantees" sits in
**discussions** (= explanation). This is the closest existing analogue to what
foldlab's `VERIFICATION.md` and the refusal contract are trying to be.

**(b) FIRST TEN MINUTES.** Not this page's job — but the page's structure is its
own answer. It is organized **by threat**, not by feature: Effects, Code
Injection, XSS, Same Origin Policy, Server-Side Request Forgery, Types,
Turing-Completeness, Handling Program Failure. The reader arrives with a fear and
finds their fear as a heading.

**(c) THE TANGIBLE-EXAMPLE PATTERN.** Each guarantee is stated as a **flat,
falsifiable, absolute sentence**:

> *"Dhall's type system guarantees that if a Dhall configuration file type checks
> then program evaluation/normalization will never fail."*

> *"An import frozen in this way can never successfully return a different
> expression."*

> *"You can always type-check an expression in a finite amount of time."*

Note the form: *if X then never Y*. No hedging, no "helps prevent", no "designed
to". A guarantee written this way is checkable — a single counterexample destroys
it, and the author has accepted that.

And every guarantee is immediately followed by its **limit**:

> *"a 'finite amount of time' can still be very long."*

> *"Leaking the presence of an HTTP request at least once is unavoidable if you do
> not control the web service hosting the URL."*

> *"expressions imported from a web service can only transitively import
> expressions from other web services and they cannot import expressions from your
> local files or your environment variables."*

Why it works: the reader's real question is never "is this safe?" — it is "what
exactly are you promising, and where does the promise stop?" A guarantee with a
stated boundary is *more* believable than one without, because the boundary proves
someone thought about where it fails.

**(d) AUDIENCE CALIBRATION.** By threat model. A reader who does not care about
SSRF skips that section with no loss. Sections are independent, which is what
makes a threat-indexed page work.

**(e) ANTI-PATTERN.** The page is prose-only — it states guarantees without
demonstrating any. There is no transcript showing an import failing its integrity
check, no shell session where a frozen import refuses. For foldlab, whose entire
pitch is *recomputable rather than reputational*, a guarantees page without an
executable demonstration would be self-refuting.

---

### 7. AUTOMERGE + KAFKA — two short peers on naming discipline

**Automerge (a,b,c).** Nav is **Docs → Tutorial → Guides → Cookbook →
Reference**, plus Community/Blog/API. The tutorial is a **todo list** — the most
boring possible domain, chosen so that all novelty budget goes to the merge
behavior rather than to the app.

But Automerge splits its naming: on the landing page CRDT is named up front as
background — *"Automerge is a Conflict-Free Replicated Data Type (CRDT), which
allows concurrent changes on different devices to be merged automatically"* —
while in the reference pages, theory is attached to *specific observable
behaviors* only where needed:

> *"The underlying data structure is an RGA sequence, which means that concurrent
> insertions and deletions can be merged in a manner which attempts to preserve
> user intent."*

> *"Counters are a simple CRDT which just merges by adding all concurrent
> operations."*

> *"Text is an implementation of the peritext CRDT."*

Why the second form works: "RGA sequence" and "peritext" appear as **the name of a
behavior the reader has just seen**, not as a prerequisite. The theory term is a
*label the reader can look up later*, dropped after the behavior is established.
That is the correct home for foldlab's "catamorphism".

Also worth noting: *"Automerge is a pure data structure library that does not care
about what kind of network you use."* A negative-scope sentence — what it is not
responsible for — placed in the opening paragraphs.

**Kafka (c).** One sentence, and it is why Kafka's intro works:

> *"Very simplified, a topic is similar to a folder in a filesystem, and the events
> are the files in that folder."*

Note the hedge that makes it honest — *"Very simplified"* — and the anchor:
filesystem folders. Compare with the partition definition, which drops the analogy
and goes definitional: *"Topics are partitioned, meaning a topic is spread over a
number of 'buckets' located on different Kafka brokers."* Analogy for the
outermost concept only; mechanism for everything under it. Same discipline as the
Rust Book.

**(e) Anti-pattern from both.** Automerge names CRDT in Design Principles before
any code runs, and the term does real damage there: a reader who does not know
what a CRDT is learns nothing from the expansion "Conflict-Free Replicated Data
Type", which is four more unknown words. It is a term that only means something
*after* you have seen two documents merge. foldlab's README does this repeatedly:
"codata", "catamorphism", "quotient of event traffic by a correlation key",
"inductive invariant" — all named before any behavior has been witnessed.

---

## PART 2 — CROSS-CORPUS FINDINGS

Nine patterns held across the corpus, and they contradict the three failed visual
rounds directly.

**F1 — Not one corpus teaches its hardest concept with a diagram first.** Git:
`find` and `cat-file`. Nix: real store paths in real build output. Terraform: a
plan diff. Rust: rules plus failing code. SQLite: numbered stages *then* figures —
and the figures are literal pictures of disk pages, never metaphors. The only
decorative-metaphor use anywhere is the Rust Book's restaurant, and it is applied
to the *prerequisite* (heap allocation), never to ownership. **Evidence says: the
operator's "too abstract, not particularly helpful" verdict on three visual rounds
was correct, and no fourth visual round fixes it.** The register that carries an
abstract concept is a *transcript*, not an image.

**F2 — The tangible object is almost always a real artifact printed at full
fidelity.** `d670460b4b4aece5915caf5c68d12f560a9fe3e4`.
`/nix/store/zx1j8gchgwzfjn7sr4r8yxb7a0afkjdg-builder.pl.drv`.
`sg-0226a51361bf1497a`. Nobody abbreviates. The full ugly hash *is* the pedagogy —
it is what makes the claim checkable rather than illustrative.

**F3 — Name after touch, except when you cash out immediately.** Nix: attribute
set named after `{ a = 1; }`; reproducibility named at 75%. Automerge: RGA
attached to observed merge behavior. Pro Git names "content-addressable" first but
pays for it in the same breath (*"Great. What does that mean?"* → key-value
store). The Rust Book names rules first but pre-announces the difficulty and uses
only words the reader owns. **The rule is not "never name first" — it is "never
leave a term unpaid."**

**F4 — Deliberate breakage is the highest-yield teaching device for invisible
guarantees.** Nix Pills fakes a system name. Terraform has you create drift with
the AWS CLI. Nix's shell tutorial opens with `cowsay` not installed. SQLite walks
a power loss at step 3.10. **A guarantee is invisible when it holds; it is vivid
when you make it fire.**

**F5 — Kill the reader's alternative design by name.** Only Terraform does this,
and it produces the best explanation page in the study. *"Early prototypes of
Terraform actually had no state files and used this method. However, we quickly
ran into problems."*

**F6 — Every guarantee carries its limit, in the same breath.** Dhall's *"can
still be very long"*. SQLite's gcov self-indictment and NFS-locking admission.
foldlab already does this well in `VERIFICATION.md` ("Gap, being closed:") — this
is an existing strength, not a gap.

**F7 — Scope fences in the first two sentences.** SQLite: *"applies only when
SQLite is operating in 'rollback mode'"*. nix.dev: *"for the purpose of following
other tutorials and examples"*. Automerge: *"does not care about what kind of
network you use"*.

**F8 — Audience calibration by document, not by hedging.** Nobody writes one
document for three audiences. Nix ships tutorials, manual, and Pills. Git ships
Pro Git and the man pages, with a third-party inversion filling the gap. Every
attempt to serve all arrivals in one document degrades all of them.

**F9 — Prose annotates real tool output; it does not replace it.** Terraform
reproduces the plan block and then explains the `+` symbol. Pro Git reproduces the
shell session. **The tool's own output is the primary text.** This one is enormous
for foldlab, because foldlab's refusals were *designed* to teach — `law`, `path`,
`got`, `expected`, `example`, `next` — and the docs currently paraphrase that
design instead of printing it.

---

## PART 3 — PROPOSED REGISTER ARCHITECTURE FOR FOLDLAB

Six registers. Build order given; **first contact moves off README.**

**R-0. `README.md` — the doorway (rewrite, don't extend).**
Currently first contact and currently the problem. It should shrink to: one
plain-language sentence of what foldlab is; **one printed transcript** — four
commands, real digests, ending in a refusal that teaches; a scope fence naming
what foldlab is not responsible for (Automerge/SQLite pattern); and a register
index. Everything currently in "The theory in brief" moves to R-4. Model: Pro
Git's opening move — name it, cash it out, touch it within four lines.

**R-1. `docs/tutorial/` — THE MISSING REGISTER. Build first.**
A `take-my-hand` sequence in nix.dev's sense. This is the register foldlab has
zero of, and it carries first contact. **It has a hard prerequisite: an executable
surface a human can run in under two minutes.** Today `proto/go/cmd/` holds only
`protod` and `wirefix`; there is no `foldlab` command. Either build a thin CLI over
`proto/ts/src/client.ts` and `session.ts`, or — cheaper and honest — make the
first tutorial a *narrated transcript of `proto/ts/test/smoke.test.ts`*, which
already contains the perfect ten minutes: describe → typo → refusal → self-repair
→ publish → unknown-identity refusal → verified read → convergence →
asserted-digest lie. That test file is the best teaching document in the
repository and nothing links to it as such.

**R-2. `docs/guides/` — how-to.** Assumes background; goal-shaped. "Verify a
journal head yourself." "Regenerate and re-wall a fixture." "Run the JCS
differential fuzzer for an hour." Largely a home for material now scattered across
README's tail and `AGENTS.md`.

**R-3. `proto/wire/CONTRACT.md` + `CONTEXT.md` — reference. Already good; leave
alone.** `CONTRACT.md` is a genuinely strong reference document. `CONTEXT.md` is a
strong glossary — the only change is positional: it must stop being reachable as a
first-contact link from README's "Where to look."

**R-4. `docs/explanation/` — the *why* essays.** One essay per *why* question, in
Diátaxis's sense. Highest-value first: **"Why the chain head exists"** — written on
the Terraform state-purpose template, naming and killing the alternatives a
skeptical reader is already proposing (why not a version number? why not a
timestamp? why not just trust the daemon?). Then "Why refusals are data, not
exceptions." Then "Why identity commits shapes and not semantics."

**R-5. `VERIFICATION.md` — the claims ledger. Keep; add skimmability.** This
register is rare and correct — SQLite's `testing.html` is its only real peer, and
foldlab's version is arguably better because it states rungs and gaps per claim.
Only change: a one-line claim summary at the head of each block so a reader can
skim the ledger, plus a Dhall-style *if X then never Y* restatement of each claim.

**R-6. `docs/pills/` — optional, later.** foldlab's Nix Pills: mechanism
archaeology for the reader who wants to know how identity is actually computed,
taught by breaking things. Only build this after R-1 exists.

**Build order: R-1 (with its executable prerequisite) → R-0 rewrite → R-4's first
essay → R-2 → R-5 polish → R-6.**

---

## PART 4 — TOP 10 TRANSFERABLE PATTERNS, RANKED BY FIT

Ranked by fit to the five core concepts. Every foldlab example below uses only
things that exist in the repo today.

---

**1. THE `find .git/objects` MOVE — prove content-addressing with a before/after
listing and a full-fidelity digest.**
*Source: Pro Git (11). Fits: verify-on-read, cut-anywhere.*
**foldlab version:** Read the empty catalog journal (`journal.read` on `catalog` →
`entries: []`), submit `{"k":"string"}` via `type.create`, read the catalog again
and show the one entry whose `digest` field is `9f2c...` printed in full 64 hex —
then have the reader recompute the same value locally with
`structureDigest({k:"string"})` from `proto/ts/src/jcs.ts` and see the strings
match character-for-character. Two reads and one create; the identity claim is a
visible equality between two printed strings, not a sentence about SHA-256.

**2. REFUSAL-AS-CURRICULUM — teach the law by triggering it and printing the
refusal verbatim.**
*Source: Nix Pills' faked system (7); Terraform's manufactured drift (10). Fits:
refusals that teach — foldlab's strongest asset and its least documented one.*
**foldlab version:** Print the real exchange from `smoke.test.ts:44–59`: the reader
submits `{"k":"strng"}` and receives
`{"ok":false,"refusal":{"kind":"invalid-structure","law":"...flb.type.v0...","path":["structure","k"],"got":"strng","expected":[...,"string",...],"example":{"k":"string"},"next":[...],"local":false}}`,
then resubmits `refusal.example` unmodified and it is accepted with
`created:true`. The prose says one thing only: *no documentation was consulted
between those two commands.* That transcript is a stronger claim for W7 than any
prose about self-repair, and it already passes as a test.

**3. NAME AND KILL THE READER'S ALTERNATIVE DESIGN.**
*Source: Terraform state-purpose (8), the best explanation artifact in the study.
Fits: two folds — the concept a reader is most likely to think is redundant.*
**foldlab version:** `docs/explanation/why-two-folds.md` opens with the objection
the reader already has — *if I have the fold state, why keep a chain head?* — and
answers with a printed pair: two journals whose `journal.read` replies show
identical fold state and different `head` values, then the sentence `CONTEXT.md`
already owns: *"the chain remembers what the fold forgives."* The alternative
design (state alone) is named, exhibited, and shown losing information.

**4. GUARANTEE STATED AS *IF X THEN NEVER Y*, WITH ITS LIMIT IN THE NEXT
SENTENCE.**
*Source: Dhall (16), SQLite testing (14). Fits: fencing register, verify-on-read.*
**foldlab version:** `docs/explanation/guarantees.md`, threat-indexed like Dhall.
E.g. *"If a frame is admitted to a journal, then its type digest was committed to
the catalog before admission (W4)."* Immediately: *"Not guaranteed: that the
payload conforms to that structure — admission checks identity resolution only,
and the admit reply's `note` says so."* That limit is already in `proto/SPEC.md`
and in the admit reply's own `note` field; surfacing it as a stated boundary makes
the guarantee stronger, per F6.

**5. NARRATE THE INVISIBLE SIDE EFFECT.**
*Source: Terraform's `.terraform` hidden-directory note (9). Fits:
verify-on-read/tamper evidence.*
**foldlab version:** After the tutorial's first `journal.read`, a callout: *"The
client did not take the daemon's word for that head. `verified.head` in the reply
was recomputed locally by folding SHA-256 over the canonical bytes of
`{"payload":...,"prev":...,"seq":...}` from all-zero genesis, and it matched the
`head` the daemon claimed."* Verify-on-read is invisible precisely because it
always passes — so the doc must point at it. `smoke.test.ts:115` already asserts
exactly this equality.

**6. THE NUMBERED-STAGES WALKTHROUGH THAT BECOMES ADDRESSABLE COORDINATES, THEN
INTERRUPT IT.**
*Source: SQLite atomic commit's "Suppose the power loss occurred during step 3.10"
(13). Fits: the fencing register — the concept with the least tangible surface in
foldlab.*
**foldlab version:** Number the register's commit path as stages, then drop the
reader in: *"Suppose the owner holding the claim at stage 4 stalls, its lease
expires, and a second owner claims at a higher fence. What happens to the first
owner's commit when it returns at stage 6?"* Answer with the actual counterexample
trace from the sabotaged variant that drops the fence check — `verify/catalog/`
already ships four such traces, one per dropped law. **The sabotaged variants are
the corpus's "deliberate breakage" device, already built and already frozen; they
are currently cited as proof artifacts and never used as teaching artifacts.**

**7. METAPHOR FOR THE SUBSTRATE, MECHANISM FOR THE TARGET.**
*Source: the Rust Book's restaurant-for-heap-but-not-for-ownership (15); Kafka's
folder-for-topic-but-not-for-partition (18). Fits: all five — this is the
calibration rule that explains the failed metaphor-poster round.*
**foldlab version:** A filesystem analogy is legitimate for the *catalog* (Kafka's
hedge included: "very simplified, the catalog is a journal of type facts,
append-only, and every entry's key is computed from its content"). It is not
legitimate for *the two folds*, *fencing*, or *structural digest* — those get
transcripts. The prior metaphor-poster round applied metaphor to the target
concepts, which is the inversion of what every corpus does.

**8. OPEN BY MAKING THE READER'S FIRST COMMAND FAIL.**
*Source: nix.dev's `cowsay no can do` (1). Fits: refusals that teach;
cut-anywhere.*
**foldlab version:** The tutorial's first command publishes a frame claiming a
digest that was never created — `{"type":"eeee…ee","payload":1}` — and receives
`{"kind":"unknown-identity", "next":[{"subject":"flb.req.type.create",…}]}`. The
reader has not been told what a digest is yet. They have been told, by the system,
what to do next, and the `next` hint carries them into `type.create`. W4 ("create
before publish") is learned as a *consequence experienced*, not a law read. This
is `smoke.test.ts:94–98`, reordered to the front.

**9. THE CONCIERGE AS A GUIDED-DISCOVERY SURFACE.**
*Source: Nix's staged complexity and explicit deferral, *"Don't worry about the
nixpkgs stuff for now"* (7); Terraform's annotated plan legend (9). Fits:
cut-anywhere, refusals that teach.*
**foldlab version:** `type.fill` is already a teaching machine and is documented
only as a wire verb. Enter it with
`{"partial":{"k":"hole"},"path":[],"subtree":{"k":"hole"}}` and the reply's
`frontier` lists every hole with its `legal` kinds and a directly-acceptable
`example` for each. The tutorial should walk one type into existence hole by hole,
showing the frontier shrink to `[]` — at which point `type.create` accepts
(contract law C3). The reader never needs the grammar in advance; **the grammar is
delivered one legal move at a time by the system itself.** This is the closest
thing foldlab has to `terraform plan`'s annotated output, and nothing in the docs
points at it.

**10. THE CLAIMS LEDGER WITH A SELF-INDICTMENT.**
*Source: SQLite testing (14) — *"running SQLite with gcov is not a test of SQLite
— it is a test of the test suite"*. Fits: verify-on-read/tamper evidence; the whole
verification posture.*
**foldlab version:** `VERIFICATION.md` already does the hard half — rungs, bounds,
"Gap, being closed:" — but the numbers (15,378 schedules; 12,707,989 distinct
states) currently read as impressive rather than bounded. Add SQLite's move next
to each: *"15,378 schedules is the bridge from the model to the binary, not the
proof; the proof is the Apalache inductive invariant, and the schedule count would
be equally large against a broken implementation if the harness were insensitive —
which is why 828/828 deliberately corrupted schedules were detected and that
number is reported beside it."* That sentence exists in fragments in the file
already; making it explicit is what buys the other numbers.

---

## Three things to stop doing (evidence-backed)

1. **Stop building visual first-contact.** Nine primary corpora, zero
   diagram-first teachings of a hard concept. Three failed rounds is the corpus
   telling you the same thing the operator did.
2. **Stop letting `README.md` carry first contact in explanation register.** Its
   first 58 lines name sorts, catamorphisms, codata, inductive invariants, and two
   state-space counts before a single command appears (line 103). Every corpus
   that teaches successfully inverts this.
3. **Stop under-using assets you already built.** `smoke.test.ts` is a better
   tutorial than anything in `docs/`. The four sabotaged-variant counterexample
   traces in `verify/catalog/` are the deliberate-breakage device that Nix Pills
   and Terraform's drift tutorial had to construct from scratch. The `type.fill`
   frontier is a guided-discovery surface with no equivalent in any corpus
   studied. All three are currently filed as *evidence* and none is filed as
   *teaching* — and that reclassification, not new artwork, is the shortest path
   to docs that land.
