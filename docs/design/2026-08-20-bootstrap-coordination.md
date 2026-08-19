# The bootstrap coordination story — where the fence lives when nothing is up yet

Date: 2026-08-20. Status: **DESIGN, PRE-GRILL.** Written by a
fable-xhigh seat in a worktree at main's tip (`7373b5199`), for DEV-900
(epic DEV-879, stage 2). **RECORD ONLY:** it changes no code, no gate,
no fixture, no vocabulary, and no ticket; its only write is this file.
It rules nothing; the operator rules, and the ruling gates any build.

**The question, in one sentence.** The estate's substrate lifecycle
command cannot start the first server on a host without a second,
already-running server to hold its fence — and this record prices the
three ways out the ticket names, recommends one, and states what each
does to the one theorem that governs all of them.

**What this record is.** (1) The problem verified first-hand: the
shipped `up` verb, the fence it takes, the model theorem behind the
fence, and the bootstrap's honest statement of the requirement. (2) The
three options, sharpened against the tree and priced —
recommendation first. (3) A one-item grill sheet. (4) Findings the
verification surfaced, recorded and not repaired.

**What this record is not.** Not a build: no lockfile, no flag, no
daemon change, no test is written here. It mints no vocabulary — the
one piece of machinery it recommends is marked CANDIDATE and priced
with its admission cost. It models no vendor internals beyond what the
pinned source states, and it claims no liveness anywhere.

**Law 10 and this file.** Law 10 forbids tracking artifacts —
repo-local ids, ticket keys, paths, commands — on any surface rendered
*outward*. A design record is tracking-land, not an official document,
so path, gate, theorem, and ticket citations are lawful here and used
throughout, matching every sibling record in this directory. Nothing in
this file is a projection source; a sentence promoted to a rendered
surface loses its citations on the way.

**The honesty convention** (the sibling records'). Every load-bearing
section opens with a **Ground** block: what exists in a source this
seat opened and read this session, cited to the exact file. Everything
outside a Ground block is reading, derivation, or proposal, marked as
such. Tiers: **ratified** · **proven** (a Lean theorem behind a gate,
cited by name) · **shipped** (code on main, read in place) ·
**pinned-vendor-read** (the pinned module's own bytes, read in place) ·
**proposed** (this record's design) · **carried** (a dispatch or
sibling claim, cited, not re-verified). Nothing here is measured; every
cost is an ordering claim. §7 says what I could not verify.

---

## 0. Orientation for a reader from outside

This estate runs a coordination substrate (an embedded NATS server with
JetStream) for fleets of AI agents. Every value is named by the SHA-256
of its one canonical byte form; every state change lands as an
append-only fact a later reader can audit; and exclusive choices are
taken at fenced registers whose safety is machine-checked in Lean. The
house terms this record uses:

- **Store directory** — the directory a substrate's durable state
  lives in; the substrate's durable identity. Two servers writing one
  store directory corrupt it.
- **Incarnation** — one server run over one store directory,
  successor-chained: each run names the run it succeeds.
- **Round** — one chain position over one store directory (the store
  plus the incarnation being succeeded), the unit one start competes
  for. The round key is a digest.
- **The register / the fence** — a compare-and-swap commitment
  register (five actions: grant, renew, commit, expire-steal, observe)
  holding at most one landed outcome per key, under fencing tokens.
  "Winning the round" at this register is what licenses starting a
  server.
- **Lanes** — append-only journals; the incarnation lane and the
  session lane carry the lifecycle facts (established, disposition,
  retired, lame-duck, session ended).
- **The coordination substrate** — the NATS server the register and
  the lanes live on. Today it is a *second* server, distinct from the
  substrate being started, and its address is a required argument.
- **Crash is not a fact** — the estate's standing posture: process
  death is never inferred from silence and never forged into a
  retirement fact; a dead incarnation reads as established-and-quiet,
  forever, until an attributed act says otherwise.

---

## 1. Result first

**1.1 The recommendation.** Option (a), sharpened: a
**filesystem-backed fence beside the store directory** — a
kernel-released advisory lock (the flock/LockFileEx family, never an
existence file), taken before any server is constructed and **held for
the life of the serving process**, with the register act performed as a
handoff once the store's own server is serving. This makes
`substrate up --store DIR` lawful with no `--coordination` argument:
the first server on a host fences its boot at the one place both
contenders provably share — the filesystem carrying the contested
directory — and then hosts its own register and lanes. The shared
coordination substrate of option (c) **survives** as the taught
topology for multi-store sites, cross-host records, and any store on a
network mount; it stops being a precondition for the first store. The
lockfile is CANDIDATE machinery with its admission cost stated (§4.1.6).
Option (b) is refused: a per-process coordination listener is a fence
at which contenders never meet (§4.2).

**1.2 Why the recommendation is not merely a convenience.** The
verification behind this record found that the shipped fence is
narrower than its own header prose reads (finding F-1, §6): it excludes
two *racing* starts from one round, and it admits a *sequential* second
`up` — while the first still serves — as the lawful winner of the next
round, with no runtime act retiring the dispossessed incumbent. The
pinned vendor ships no store-directory lock of its own (§2 Ground). So
today, one repeated command reaches the exact corruption the fence's
header names. A held kernel lock closes both the racing and the
sequential shape for every contender that can reach the directory at
all — which, on a local filesystem, is every contender that could
corrupt it. The recommendation therefore *extends* the fence on the
axis the estate-of-safety through-line hunts, rather than merely
shaving a flag.

**1.3 The invariant, previewed.** Whatever carries round zero must
preserve the S7 model's at-most-one-landed-current-per-store:
`AtMostOneCurrent`, the safety half of `RegisterInv`, proved as
`register_base` / `register_consecution` / `register_safety`
(discharging `Laws.RRegisterBase` / `RRegisterConsecution` /
`RRegisterSafety`). §3 states precisely what that theorem does and does
not govern, and §4 states each option's proof obligation or
trusted-base cost against it by name.

**1.4 The usability axis, weighed as first-class.** The parent epic's
ratification-bound usability definition opens with "one command up"
(DEV-879, read this session), and the dispatch carries the operator's
words: most people will not have the patience to poke and prod. Under
the shipped posture, first contact costs three acts, the first of which
(standing up the coordination substrate) is performed *outside* the
estate's own verbs and disciplines entirely. Under the recommendation
it costs the bootstrap declaration plus one `up`, with no standing
prerequisite and no address to know. Option (c) concedes the goal
honestly; option (b) buys the same command count as (a) at the price of
a fence that fences nothing.

---

## 2. Ground — the problem verified

Every row was opened and read in this environment this session; the
branch is at main's tip and every cited source is main-landed.

| Authority | What it carries here | Tier |
| --- | --- | --- |
| `go/cmd/substrate/{main,up,down,status}.go` (landed `0db59a522`, "The daemon turns on: one command up, one down, one status") | the three verbs; the required `--coordination` URL; the doc-law for why; the order fence → construct → start → probe → land → serve → teardown | shipped |
| `go/daemon/incarnation.go` | round key as digest; the register chain walk (`OpenRound`) and its spent-round reasoning; crash-is-not-a-fact (no crash cause row; `Standing` has no "live") | shipped |
| `go/register/register.go` | the five-action register over a JetStream KV bucket, file-backed R=1, history 64; revision-CAS; the backing-stream incarnation pin; expire-steal present but uncalled by any lifecycle verb (tests and `go/cmd/registerwall/` only) | shipped |
| `verify/substrate/Substrate/{Definitions,Laws,Proofs}.lean` | `Register`, `AtMostOneCurrent`, `RegisterInv`, `stepRegister`, the mutants; the three register theorems; stated abstractions A7 (bindings as a list) and A8 (revision assignment is the substrate's) | proven (gate `verify/substrate/run.sh`) |
| `VERIFICATION.md`, the CL-5 row and Standing assumptions | the claim, its two executed negative controls, and its bounds — "the model says nothing about two hosts racing over one store directory"; crash is absence; the four probed JetStream assumptions (atomic create-if-absent, revision CAS, linearizable reads, terminal immutability) with their executable gate | shipped ledger |
| `go/cmd/incarnationwall/main.go` | what the runtime wall executes: N racing starts per round, one out of process, rounds succeeding one another; losers must not bind or write; the pin refutation | shipped |
| `packages/plait/src/surface/init.ts` (landed `f6eca6e0c`) | the bootstrap: declarations only, never a server start; the honest repair — "the address of the coordination substrate its incarnation fence and its lanes live on — that fence cannot live on the substrate it is deciding whether to start" | shipped |
| `go/go.mod`; `github.com/nats-io/nats-server/v2@v2.14.4` and `nats.go@v1.53.1`, read in the module cache | the pins; JetStream with no store directory defaults to a temp directory with the vendor's own warning ("Temporary storage directory used, data could be lost on system reboot", `server/jetstream.go:224-227`); **no flock/LockFileEx anywhere under `server/`** — the vendor ships no store-directory lock at this pin; multiple embedded `*server.Server` per process is the vendor's own test topology (`server/routes_test.go`, `server/leafnode_test.go`) | pinned-vendor-read |
| `docs/design/2026-08-19-estate-daemon-spec.md` §7 | slice S7 names `verify/substrate/` — "the S7 model"; the spec's slice plan places the fence (S5) without ruling where the register lives; the word "coordination" does not occur in the spec (grep, this session) | ratified spec, read in place |
| DEV-900 (the ticket), DEV-879 (parent epic, with the usability definition "one command up") | scope; the goal; the three options as sketched | board, read this session |

**The shipped shape, in one paragraph.** `substrate up` requires
`--coordination URL` and `--store DIR`. It declares the server-options
value and digests it; connects to the coordination substrate and opens
the register and the two lanes there (`openCoordination` refuses an
empty URL: "the register and the lanes live there"); walks the
register's chain to the first undecided round (`OpenRound` — the
register and never the lane, because a decide that landed and then
died before establishing has *spent* its round, and only the register
shows that); wins the round by grant-then-commit
(`DecideIncarnation` — "nothing below runs for a loser"); only then
constructs and starts the embedded server; probes readiness by the
vendor's own gates; lands the observations and the established fact on
the incarnation lane; announces its own connection as client zero; and
serves until a disposition fact on the lane retires it. `down` folds
the lane, lands a disposition, and watches for the retirement. `status`
reads the lane and probes nothing. The reason the fence is remote is
stated as law in the command's own header: *"The fence decides whether
a server may exist over a store directory, so it cannot live on the
server whose existence it is deciding; the record outlives the
incarnation it is about, so it cannot live inside it either."* The
bootstrap's refusal teaches the same requirement at first contact, and
`plait init` itself never starts anything — "a declaration set names
one and never starts it."

**What the requirement costs, verified.** Nothing in the tree starts
the coordination substrate. `up` cannot be pointed at itself (it
connects before it constructs). So the fence-carrying server is stood
up outside the estate's verbs — un-declared (no options value),
un-fenced (no incarnation round over *its* store directory), and
un-recorded (no lifecycle facts about it). The discipline's root is
currently exempt from the discipline.

---

## 3. The invariant that rules all three options

**Ground.** `verify/substrate/Substrate/Definitions.lean` defines the
register's observable state (revision, chain newest-first, and
landed-current bindings carried as a **list**, so two bindings for one
store is expressible — stated abstraction A7: a function-shaped model
would make the claim true by construction and therefore empty);
`AtMostOneCurrent register := forall store, (currentsAt register
store).length ≤ 1`; and `RegisterInv := ChainAdmission ∧
AtMostOneCurrent`. The lawful step (`stepRegister`) admits a landing
only under a fence naming the current revision, a fresh name, and the
predecessor discipline, and the landing **replaces** the store's
current binding in the same act; a retirement drops the binding and
leaves the chain. `Laws.lean` states, and `Proofs.lean` proves,
`register_base` (`RRegisterBase`: the initial register satisfies the
invariant), `register_consecution` (`RRegisterConsecution`: every
lawful act carries it forward), and `register_safety`
(`RRegisterSafety`: the invariant yields at-most-one-landed-current per
store and a lawful, acyclic chain). Two executed mutants
(`stepCyclic`, `stepUnfenced`) and a must-not-compile token-sort
refusal stand behind the gate. The ledger's stated bounds: model-level,
no refinement map to the runtime register; a revision is a counter and
real revision assignment is the substrate's, probed at the assumptions
gate (A8); crash is absence; **"the model says nothing about two hosts
racing over one store directory beyond what one register's revisions
express."**

**What the theorem governs — read precisely.** The theorem is about
the acts *one register* admits. It is carrier-agnostic in exactly A8's
sense: any carrier that executes `stepRegister`'s guard atomically over
a stable revision order inherits the proof. What the theorem does
**not** and cannot govern:

1. **The meeting.** Contenders are fenced only if they present at the
   *same* register. Which register a store is fenced at is a topology
   fact outside the model — and, today, outside every wall (finding
   F-2: two `up`s naming different coordination URLs over one store
   directory each win round zero at their own register and both
   start).
2. **The incumbent's process.** `AtMostOneCurrent` is a claim about
   the *binding*. A landing dispossesses the incumbent in the record —
   `withoutStore` then append, one act — and the model is satisfied.
   Nothing in the model or the runtime turns that dispossession into
   the incumbent's retirement (finding F-1): the serving loop watches
   the lane for *disposition* facts only, so a sequential second `up`
   lawfully wins the next round and a second server starts over a
   store the first still serves. The record stays lawful while the
   filesystem diverges.

So the ruling this ticket asks for is not "which carrier preserves the
theorem" — all three candidate carriers can — but "**where do
contenders provably meet, and what retires an incumbent**". Each
option is priced against the theorem *and* against those two gaps.

---

## 4. The three options, priced

### 4.1 Option (a), recommended — the filesystem fence beside the store

**The sharpened shape (proposed).** One advisory lock, kernel-released
on process death, living **inside the store directory it fences** —
the one coordinate every process able to corrupt the store must, by
definition, reach. `up` acquires it before anything else and **holds it
until teardown**. With `--coordination` given, everything after the
lock is the shipped path unchanged. With `--coordination` absent, the
started substrate hosts its own register and lanes: once readiness
passes, the winner opens the register against itself and lands the
round it booted under — round zero on a fresh store; the first
undecided round of the recovered chain on a restart — then lands the
established fact and serves. The round key needs no invention: it is
already the digest the shipped path computes (`RoundKey(store,
predecessor)`), and the chain read after recovery is the shipped
`OpenRound` against the store's own recovered bucket.

**Why a held lock and not a boot-window lock.** The ticket's sketch
says "round zero only". First-hand reading forces two generalizations,
both stated rather than slipped in. *First*, succession: a self-hosted
store's register is dark exactly when succession is needed (its server
is down), so every boot of a self-hosted store — not only the first —
must fence at the filesystem and read the chain after recovery. "Round
zero only" is really "every boot whose register cannot be read before
start", of which round zero is the always-instance. *Second*,
incumbency: held for the life of the process, the lock is what the
shipped fence turns out not to be (F-1) — an exclusion between a
serving incumbent and a sequential contender, for both the racing and
the sequential shape, enforced by the kernel rather than by an operator
remembering not to run `up` twice. Released only at teardown or by
process death, it adds no liveness reading: the kernel reaping a
process is the kernel's own act, not an inference from silence.

**Why the lock must be the kernel-released kind, never an existence
file.** An `O_CREATE|O_EXCL` marker file that survives its creator's
death is indistinguishable from a live holder without a staleness
guess — and a staleness guess is precisely the crash-forgery the
estate refuses everywhere (the retirement roster has no crash row by
construction). The flock/LockFileEx family is sayable in estate terms
because release-on-death is an attributed kernel act; an existence file
is unsayable. This is forced by standing law, not chosen here.

**Does the fence-in-the-store violate the shipped doc-law?** The law
reads: the fence "cannot live on the *server* it decides about". A
lock in the store directory does not live on the server — it is read
and taken through the filesystem, which is already running before any
server exists and which the estate already trusts with the store's own
bytes. The circularity the law names (reading the fence would require
the thing being fenced) does not arise. The law's second half — "the
record outlives the incarnation, so it cannot live inside it" — *is*
re-scoped by self-hosting, and honestly: see the availability cost
below.

**Crash during handoff — what each window reads as** (the dispatch's
required enumeration; crash-is-not-a-fact binds throughout):

1. **After lock, before the server starts.** Nothing landed anywhere.
   The kernel releases the lock at death; the next `up` retries
   identically. The record reads *absence* — no round spent, no
   incarnation, quiet lanes — which is the honest reading and forges
   nothing.
2. **After start, before the round lands** (the new window this
   option mints). Same reading: absence. The store's JetStream files
   may carry a partial boot; the vendor's own recovery handles its own
   files (already in the trusted base — the estate's standing
   JetStream assumptions). Clients that connected in the window
   connected to a run the record never established; the shipped path
   already has this window between listener-bind and the established
   fact, so this is a *widened* existing window, not a new class. One
   improvement falls out rather than being designed: a
   granted-but-uncommitted round found in the recovered register
   (today's wedge, repairable only by an operator's expire-steal,
   since no lifecycle verb calls it) is encountered *while holding the
   lock*, and the kernel's grant of the lock witnesses the previous
   holder's release — so the steal becomes lawful and mechanical
   without any timeout, for holders that were boots of this same
   store.
3. **After the round lands, before the established fact.** The
   shipped spent-round shape, verbatim: the register shows an outcome,
   the lane shows nothing, and `OpenRound` walks past it to the next
   round. Already designed for; unchanged.

**Does the at-most-one theorem survive the handoff seam?** Split it as
the invariant splits. The **chain half** (`ChainAdmission` —
predecessor discipline, freshness, acyclicity) survives untouched: the
landing acts still go through the register's own guard
(`landAdmitted`), so `register_consecution` applies to every act
exactly as proved, whichever process executes it. The
**at-most-one half** changes carrier for the boot: between lock-acquire
and round-landing there is no register to ask, so exclusion during
that window is the lock's, not the theorem's. The proof obligation,
named: either (i) a **handoff lemma** in `verify/substrate/` — a lock
predicate as a premise ("at most one process holds the lock per store;
every land act executes under it"), from which the existing consecution
argument re-derives `AtMostOneCurrent` across the seam — with the lock
premise carried as an explicit trusted-base axiom in the style the
model already uses for hash collision-freedom (stated abstraction A3's
idiom); or (ii) no new Lean at all, and one new row in
VERIFICATION.md's standing assumptions — "atomic advisory lock with
kernel release-on-death, per platform" — probed by an executable test
beside the four JetStream rows already probed there
(`TestAtomicCreateIfAbsent` is the same species one substrate over),
plus a wall arm racing two real processes at one lock. Either way the
honest sentence is: **for the boot window, at-most-one is trusted and
probed, not proved** — exactly as revision assignment already is
under A8.

**The network-filesystem bound, stated as the trusted base it is.** On
a local filesystem, the lock's exclusivity is a kernel property of the
same machine whose filesystem the store's bytes already trust. On a
network mount (NFS, SMB), advisory-lock exclusivity becomes a claim
about the mount protocol's lock machinery — lease- and grace-shaped,
timeout-recovered — which re-admits through the back door exactly the
silence-reading the estate refuses, and which the estate has neither
probed nor any means to referee. The bound is therefore drawn, not
waved at: **a store directory on a network mount is outside the
lockfile fence's stated base**; such a store keeps the shared
coordination substrate posture of option (c), and the taught repair
says so. Two honesty notes beside the bound. First, this is not a
regression: the shipped model's own ledger bound already says nothing
about two hosts over one store directory, and the shipped fence meets
cross-host contenders only under an unwalled URL convention (F-2) —
the lock narrows no guarantee that exists. Second, on the local
filesystem the lock is *stronger* than the shipped fence at the store
coordinate itself: it cannot be evaded by disagreeing about where the
fence lives (F-2) or by respelling the path (F-3), because it lives at
the physical directory.

**What self-hosting costs — the availability regression, stated
against the recommendation.** Under the shipped posture the record
lives on an always-on second server, so `status` answers about a store
whose server is down — which is exactly when one asks. Under
self-hosting the record lives in the store's own JetStream files:
*durable* across crashes (surviving fsync windows under the declared
sync rows — which, note, the record's carrier today does not even
have: the operator-run coordination server's durability posture is
whatever nobody declared), but *readable only while some incarnation
serves*. `status` and `down` against a dark self-hosted store have
nothing to dial; "readable a week later by a party that ran none of
them" weakens to "readable a week later once anything serves the store
again". A crash also takes the record's carrier down *with* the
incarnation it is about — the coupling the shipped doc-law exists to
refuse — honored under self-hosting in durability only, not in
availability. The ruling, if it adopts (a), consciously re-scopes that
law for self-hosted stores; this record does not soften it. Sites that
want always-answerable records keep a shared coordination substrate
and pass `--coordination`; nothing in (a) removes that posture.

**CANDIDATE machinery and its admission cost**, priced as the bounds
require:

- One advisory-lock seam in the Go module, per platform (POSIX flock;
  Windows via handle share-mode or LockFileEx). Feasible within the
  stdlib-only rule via the syscall package, but a per-platform seam is
  real surface and is priced as such.
- One new standing-assumptions row with an executable probe (the
  fifth row beside the four JetStream properties), and one wall arm:
  two real processes at one lock, winner serves, loser refuses with a
  taught refusal — the incarnationwall's witness discipline ("no loser
  writes the store") transferred to the new carrier.
- The handoff lemma in `verify/substrate/` (or the explicit
  trusted-base row, whichever the operator prices in).
- Prose that must move with it, or the tree starts lying: the
  `go/cmd/substrate/main.go` header law (re-scoped as above), the
  usage line (`--coordination` becomes optional), and the `init.ts`
  repair text (from "you need the coordination substrate's address" to
  the honest split: local store, one command; network mount or
  cross-host record, the shared substrate).
- No new vocabulary: the round key, the chain, the facts, and the
  refusal shape are all the shipped ones; the lock is carriage that
  never appears in a rendered surface (Law 10 composes cleanly — a
  lockfile is an ambient coordinate and never travels onto a lane).

**Verdict: RECOMMENDED.** One command up, achieved for the local
store; the fence extended to the sequential shape the shipped fence
misses; the regress bottomed uniformly (a coordination substrate, where
a site wants one, is itself just a store directory whose first round
the same lock fences — the root exemption of §2 closes); the theorem's
chain half untouched and the boot half honestly moved to a probed
trusted base the estate already half-stands on.

### 4.2 Option (b) — the embedded coordination mode, priced and refused

The sketch: the daemon boots a coordination-only listener first, fences
on it, then starts the store-owning server.

**The meeting-point failure, which is dispositive.** A fence works
because contenders meet at it. A coordination listener embedded in the
`up` process is reachable *after that process decides to boot it* —
so two contending `up`s each boot their own listener and each win
round zero at their own register: `AtMostOneCurrent` holds vacuously at
each register while the world holds two serving servers. The theorem is
preserved and the fence decides nothing. The only repairs re-derive the
other options: share the embedded listener's store directory at a
well-known path so both contenders boot over *it* — which is two
servers over one store directory, the original corruption moved one
level down and still unfenced (it would need a lock: option (a)); or
share one always-on listener per host — which is option (c).

**The two-listener lifecycle, priced anyway** (the dispatch asks). Two
`server.Server` values in one process is a construction the pinned
vendor's own test suite exercises routinely (read in place;
"supported topology" in any stronger documented sense is not claimed —
§7). But: a store-less coordination listener **does not exist at the
pin** — the register is a JetStream KV bucket, the bucket's shape gate
demands file-backed storage, and JetStream with no declared store
directory defaults to a temp directory with the vendor's own data-loss
warning. So the coordination listener owns a second store directory —
ephemeral, and the chain and the lanes sever on every reboot (the
register's incarnation pin makes stale tokens refuse, so correctness
survives; the *audit* dies, which is the record's whole purpose) — or
durable, and the process now owns two stores, two ports (an in-process
only listener would strand `down` and `status`, which dial from other
processes), two teardowns whose order matters (the retirement fact
lands after the store server stops, so the coordination listener must
outlive it — and a crash kills both at once, the record dying *with*
the incarnation it records, the exact coupling the doc-law refuses,
now by construction). And the regress is explicit: the coordination
listener has a store directory, a lifecycle, and no fence — the
fence-carrier has no fence, per process rather than per site.

**Verdict: REFUSED.** It buys option (a)'s command count while fencing
nothing between contenders, adds a second store and listener to every
daemon, and couples the record's death to the incarnation's. No grill
option carries it forward.

### 4.3 Option (c) — the posture stands, priced

One shared coordination substrate per host or site, taught by the
quickstart; `up` keeps requiring `--coordination`.

**What it costs, honestly.** Zero new machinery — and one standing
exemption at the root: the coordination substrate itself remains
outside every discipline it carries. It is started by hand outside the
estate's verbs, runs under no declared options value, is fenced by no
round over its own store directory, and lands no lifecycle facts about
itself; its durability posture is undeclared. The "one command up"
goal weakens to two-commands-one-of-them-once-per-host — and the
once-per-host command is precisely the undisciplined one. First
contact costs the full poke-and-prod the operator's stated priority
weighs against: learn what a coordination substrate is, stand one up,
then start the thing you wanted. Findings F-1 (sequential double-up)
and F-2 (fence-meeting by URL convention) remain open in full: the
posture leaves the corruption reachable by one repeated command and
the fence evadable by one mistyped address.

**What it is right about, kept.** The always-on record: `status`
answers about dark stores, and the record's carrier does not die with
the incarnations it records. Cross-host and network-mount stores have
no honest filesystem fence (§4.1's bound), so the shared substrate is
the only posture that reaches them. And it is the shipped,
gate-covered path.

**Verdict: SURVIVES AS THE SITE TOPOLOGY, refused as the only
posture.** Under the recommendation, `--coordination` remains fully
supported and taught for exactly the cases it is right about — and a
site's coordination substrate becomes bootstrappable by the estate's
own verb, closing the root exemption.

---

## 5. The grill sheet

One decision; the ticket's ruling gates any build. House style:
recommended option first, alternatives priced, reversal stated. All
tiers are ordering claims, never measurements.

### BC-1 — Where does the first round's fence live?

**Recommended: the filesystem fence of §4.1** — a kernel-released
advisory lock inside the store directory, held for the life of the
serving process; self-hosted register and lanes when `--coordination`
is absent; the shared coordination substrate surviving as the taught
posture for network mounts, cross-host records, and sites that want
always-answerable status. Price: the CANDIDATE admission cost of
§4.1.6 (per-platform lock seam; a fifth probed assumptions row plus a
two-process wall arm; the handoff lemma or its explicit trusted-base
row; three prose surfaces re-scoped). What it buys: one command up on
a local store; the sequential double-serve (F-1) closed by the kernel
for every local contender; the fence-evasion holes (F-2, F-3) closed
at the store coordinate; the root exemption of §2 closed; crash
windows that all read as honest absence.

**Alternative (priced): option (c) alone — the posture stands.** Zero
machinery now; the costs of §4.3 forever: the goal conceded, the root
exempt, F-1 and F-2 open, first contact three acts. Choose this if the
operator prices the lock's per-platform seam or its trusted-base row
above the harness's first-contact cost — and accept that the fence's
header prose must then be narrowed to what the fence does (round
exclusion, not incumbency exclusion), or F-1 repaired by other
machinery.

**Alternative (priced): option (b) — embedded coordination.** Refused
at §4.2: contenders never meet; a second store and listener per
daemon; the record coupled to the death it records. Not carried
forward.

**Reversal.** The lock is carriage at one boot seam: un-wiring it
restores the shipped path byte-for-byte (the flag simply becomes
required again), and no vocabulary, fact shape, or lane changes either
way — which is what makes recommending machinery here cheap to be
wrong about. The self-hosted-record posture reverses per store by
pointing the next `up` at a shared substrate; the chain in the store's
own bucket stays readable history.

---

## 6. Findings

Recorded with what breaks and what would unlock each; none repaired
here, none softened.

**F-1 — The fence fences the round, not the incumbency.** Verified in
`go/cmd/substrate/up.go` + `go/daemon/incarnation.go`: `up` never
reads the incarnation lane's standings; `OpenRound` walks to the first
undecided round; a second `up` while the first serves therefore wins
the *next* round lawfully and starts a second server over the same
store directory. The model licenses the landing (a land replaces the
incumbent's binding — dispossession in the record), but no runtime act
retires the dispossessed process: the serving loop reacts to
disposition facts only. The pinned vendor ships no store-directory
lock of its own (grep over `server/` at v2.14.4: no flock, no
LockFileEx), so nothing downstream catches it. The record stays lawful
— `AtMostOneCurrent` is a binding claim — while two processes write
one directory. The incarnationwall exercises racing starts per round
and cannot see this shape (a sequential contender is a *winner*). The
fence header's plain reading ("two servers over one store directory
corrupt the store... so the act is fenced") is wider than the
mechanism. Unlock: BC-1's recommended option closes it locally by the
held lock; under option (c) it needs either an `up`-time standings
read (refuse-while-unretired-incumbent — but that reads absence as an
answer, which the estate refuses) or an incumbency carrier of its own.
Reported, deliberately untouched.

**F-2 — Contenders meet at the register by convention only.** Nothing
binds a store directory to one coordination substrate: two `up`s with
different `--coordination` URLs over one store each win round zero at
their own register and both start. The theorem cannot see this — it
governs one register's acts — and no wall exercises it. Unlock: under
BC-1's recommendation the local case closes at the directory itself; a
declared store-to-fence binding (the store remembers where its fence
lives) would close the cross-host case and is a separate, ungrilled
candidate deliberately not designed here.

**F-3 — The store's identity is the path's spelling.** `StoreDigest`
digests the directory string as handed: `up --store ./data` and `up
--store` with the absolute spelling are two stores to the fence — two
chains, two rounds, one physical directory. The TS bootstrap resolves
to absolute before declaring (`init.ts`); the Go verb does not — the
two entry points disagree. Unlock: normalize at the verb's edge
(carriage), or adopt BC-1 (the lock is spelling-independent by living
at the physical directory); the declared-value shape need not change.

**F-4 — The absent-coordination failure is a plain error, not a
taught refusal.** `openCoordination` wraps a failed connect in a bare
wrapped error, while the same absence at first contact gets a full
taught refusal in `init.ts` (kind, law, expected, repair). Whichever
way BC-1 rules, the verb's own first-contact failure should teach as
the bootstrap does. Small; recorded because refusal parity is a
standing law.

---

## 7. What I could not verify

1. **The operator's exact words on usability.** The dispatch carries
   "most people will not have the patience to poke and prod" as the
   operator's stated priority. I searched the tree and the board for
   the sentence and did not find it; it is carried from the dispatch
   only. The verifiable anchor I used instead is DEV-879's usability
   definition ("one command up..."), read this session.
2. **Vendor support as a statement.** That two embedded servers per
   process is the vendor's own test topology is read from the pinned
   test files; whether the vendor *documents* embedded
   multi-instance as a supported production topology was not
   verified — no vendor documentation outside the module source was
   consulted.
3. **Filesystem lock semantics.** The load-bearing properties for
   option (a) — atomic acquisition, kernel release on process death,
   per platform; their degradation on network mounts — are stated
   from general knowledge of the primitives and are exactly what the
   proposed assumptions row exists to probe. Nothing here executed
   them, and the record's recommendation stands on them being probed
   before believed, per the estate's own verification law.
4. **F-1 and F-2 were established by reading, not by running.** The
   worktree has no built Go toolchain artifacts staged for this
   record's purpose and the dispatch bounds this record to no build;
   the sequential-double-up and the two-URL evasion are code-path
   readings of `up.go`/`incarnation.go`/`register.go`, not executed
   reproductions. The reading is stated with its chain of evidence in
   §6; an executed witness is the natural first act of whatever
   ticket disposes them.
5. **No gate, no battery ran for this change.** It is one new file
   under `docs/design/`. The Lean citations were verified by reading
   the theorem statements and their presence in `Proofs.lean` and the
   ledger, not by re-running `verify/substrate/run.sh` this session.
6. **The TypeScript spine's incarnation module** (the transcription
   reference `go/daemon/incarnation.go` cites) was not re-read; the
   Go side is the side the verbs run and the side this record
   verified.

---

## 8. Honest bounds

1. **This is a pricing record, not a proof and not a repair.** The
   one formal object it leans on — `RegisterInv` and its three
   theorems — is cited, not extended; the handoff lemma is named as
   an obligation, not discharged.
2. **The recommendation extends the fence only as far as one
   filesystem's kernel.** Cross-host and network-mount exclusion is
   *not* claimed by any option on the table — not by the shipped
   posture (its ledger bound and F-2 say so) and not by the lock (its
   stated base says so). A reader who wants a cross-host fence is
   owed a different record.
3. **Crash stays absence everywhere.** Every crash window in §4.1
   reads as absence; no option manufactures a retirement, a
   staleness verdict, or a liveness answer, and the one place the
   design gains a lawful steal it does so from a kernel act, not a
   timeout.
4. **The availability regression of self-hosted records is real and
   is not argued away** (§4.1): a dark self-hosted store's history is
   unreadable until something serves it again. Sites keep the shared
   substrate for exactly this.
5. **Costs are ordering claims.** Nothing here was measured, timed,
   or benchmarked; "one command" counts commands, and that is the
   only arithmetic in the record.
6. **Four findings stand open** (F-1 through F-4), reported and
   deliberately untouched; two of them (F-1, F-2) mean the shipped
   fence is narrower than its prose whichever way BC-1 rules, and the
   ruling should dispose of them explicitly rather than by silence.
7. **Nothing dispatches from this record.** The ruling gates any
   build; the lockfile is CANDIDATE until the operator says
   otherwise; and this record ends where the ticket said to stop — at
   the priced options and the sheet.
