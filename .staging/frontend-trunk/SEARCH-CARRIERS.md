# SEARCH-CARRIERS — the search algebra laid onto the registry as it exists

Status: **STAGED LAYOUT — pre-grade**. Written 2026-08-30 on operator
order ("lets lay out the algebra.. and if we can't lay out our sorts
and kinds as they exist now…"). Method: every object of the search
plane ([SEARCH.md](SEARCH.md), [QUERIES.md](QUERIES.md)) is assigned a
carrier from the REGISTRY AS LANDED — the eleven ratified sorts
(`generated/grammar/manifest.json`), the annotation plane
(`Cas/Schema/Annotation.lean`, tag 0x41 rev 1), and the program plane
(`step`/`cont`) — or it is refused a carrier and becomes a named ask.
No new sorts anywhere (decision 23 holds); every ask below is
arm-additive or a registry section for a form that already exists.

## 1. The algebra, laid out

**Objects** (each a store citizen or a derived view — nothing else):

| object | what it is |
|---|---|
| `Spec` | a query spec — data: {generator, aggregator, rung} or Q-FIX rule rows |
| `Session` | a search execution — a PROGRAM: steps, dependent branching, its cuts |
| `Note` | an annotation: (key, subject, value) — text or typed ref |
| `Edge` | an association — "related to", "derived from", "about" |
| `ResultSet` | a materialized answer: spec + mark + member addresses |
| `Vec` | an embedding of addressed content under a pinned checkpoint |
| `Pref` | a preference attached to a specific past query/turn |
| `Agent` | an identity — itself a named query over attribution (§SEARCH.4) |
| `Ctx` | the query-fold state — what the session so far implies (§SEARCH.5b) |

**Operations** (generators of the plane):

```
ask      : Intent × Word → Spec            -- refine(intent, Ctx.run w)
execute  : Spec × Word → ResultSet         -- the fold; receipted (SR-1)
annotate : Key × Subject × (Text ⊕ Ref) → Note   -- grow-only, provenance-carried
relate   : Subject × Subject → Edge        -- annotate with a ref value
embed    : Content → Vec                   -- pinned deterministic function
materialize : ResultSet → Word             -- a put; dedup = memoization
```

**Laws** (all already stated, cited):

1. The answer fold: `run (w ++ δ) = run w ⋄ run δ` (QUERIES §1).
2. The query fold: `ctx_{n+1} = ctx_n ⋄ step(q_n, notes_n)` — the free
   monoid acting on `Ctx`; an instance of law 1 under SR-1
   (SEARCH §5b).
3. Memoization: same spec at same mark ⇒ same address ⇒ duplicate put
   is the identity (L92).
4. The association DAG: annotation refs resolve strictly earlier
   (admission WF), so the edge graph is acyclic with admission order
   its topological sort (QD-1's theorem, applying verbatim to edges).
5. Patchability: monotone ⇒ patch; else cut-stamped (QUERIES §4).
6. The quarantine: soft judgments happen once at write, receipted;
   reads consume exact edges and exact dedup (SEARCH §7).

## 2. The carrier table — as the registry exists TODAY

Legend: **TODAY** = spellable now, zero events. **COMPOSITE** =
spellable now via two nodes. **ARM** = needs an AnnotationSubject arm
(arm-additive, the module's own designed growth path). **SECTION** =
registry section for a form the agent language already writes.
**DEFERRED** = a future additive form, not needed yet.

| object | carrier | status | evidence |
|---|---|---|---|
| `Spec` | `value.value` payload (JSON) — a spec references classifiers by NAME (names.json strings), no edges needed | **TODAY** | manifest: value = payload, no refs |
| `Session` | `cont` + `step` — a search is a program; defunctionalized, addressed, replayable | **TODAY** (recording); the explicit query EFFECT as a `step` form is | **DEFERRED** (additive form beside put/load, only when the QuerySig lands formally) |
| `Note` on a search | annotation (0x41): `{key, subject: program(cont), value: text}` — the program arm EXISTS (0x0F) | **TODAY** | Annotation.lean:130, 189-192 |
| `Edge` search→search | annotation with REF value: `{key: foldlab/related, subject: program(q'), value: ref(program(q))}` — two typed, admission-checked, `Graph`-walked edges; `WrongKindReference` fires on the value edge | **TODAY** | the `pinLink` worked example, Annotation.lean:196-199, 214-215 |
| `Pref` on a past turn | annotation on the EXCHANGE arm (0x58) — "a recorded turn of the agent seam" | **TODAY** | Annotation.lean:128 — the PrefEval-shaped object (preferences as addressable records on specific past queries) is spellable with zero events |
| `Note`/`Edge`/`Vec` about CONTENT (value, file, chunk, tree, manifest, entry, context nodes) | nothing — the subject union spans exchange/git/program/schema/system only; "a plane outside the union is not nameable" (naming.ts:33-34) | **ARM** — the widening ask | Annotation.lean:127-132 |
| `Note` about a `Note` (the reflexive tower's own rung: notes on notes, prefs on pref-records) | nothing — 0x41 is not in its own subject union | **ARM** | same |
| `ResultSet` members | `context` node — free discipline, one CHECKED edge per member, any arity, every tag ratified via `Ty.ofTag`; no payload by design | **TODAY** for the member set; spec+mark rides a `value` node; binding the two wants a context-plane subject | **COMPOSITE** now, **ARM** to bind cleanly | manifest: context = "no payload, one typed edge per folded item" |
| `Vec` bytes | `chunk.chunk` (the 1.5KB int8 vector as bytes) + pin in a `value`; pointing at WHAT it embeds needs the content arms | **COMPOSITE** + **ARM** | manifest: chunk position-free bytes |
| `Agent` | the three-edge entry (context, value, prev) the agent language ALREADY WRITES over the entry tag — "the codec constrains a reference's expected tag, never the arity" | **SECTION** — the registry row is all that is missing (= QD-3 / COLUMNS ask 1) | manifest entry.notes; REGISTRY row 12 |
| `Ctx` materializations | a `value` fold snapshot + annotations linking constituents | **TODAY** via program-arm annotations on the session | — |
| Tombstone (text-crdt §, MemLineage-shaped) | annotation `{key: foldlab/tombstone, subject: <target>, value: text(reason)}` | **ARM** for content targets; **TODAY** for program/exchange targets | — |
| Names | `foldlab/name` — landed, published as roots, idempotent | **TODAY** | naming.ts, L197 |

**The reverse-index honesty, already in landed code**: `annotationsAbout`
walks every published root — "the cost is one load per published root,
which is the honest price of having no reverse index; **the day an
index kind lands, this walk is what it replaces**" (naming.ts:143-144).
QD-2 is pre-acknowledged by the code it will replace.

## 3. What falls out — the asks, all additive

- **CA-1 — widen `AnnotationSubject` (and with it `AnnotationValue.ref`)
  with the content planes**: at minimum `value`, `file`, `context`,
  `chunk`, plus the reflexive `annotation` arm; `entry`/`tree`/
  `manifest` when wanted. This is the module's OWN growth path —
  "Nothing is reserved for a plane that does not exist yet: growth is
  by an arm, and an arm is arm-additive" (Annotation.lean:56-57) — and
  its price is already ruled: a documented VERSIONING EVENT that moves
  the schema code's address and no stored node's
  (Annotation.lean:85-97, citing BUILD-MODELING-AUDIT §D.2). One
  widening event, chosen arms ruled by the operator.
- **CA-2 — ratify the search-plane KEY family** beside `foldlab/name`:
  `foldlab/search-note`, `foldlab/related`, `foldlab/pref`,
  `foldlab/embedding`, `foldlab/tombstone` (spellings to grill). Keys
  are structurally open strings; ratifying pins them the way the name
  seat is pinned.
- **CA-3 — the `entry.agent` registry section** (QD-3): the carrier is
  landed in the agent language; the row is owed. Identity-as-query
  (§SEARCH.4) waits on nothing else.
- **CA-4 (deferred) — `step.query`**: the explicit query effect as an
  additive form on `step`, only when searches-as-programs formalizes
  (SR-1's Lean half). Until then a session records as program + puts +
  annotations, which loses nothing observable.

## 3b. Status 2026-08-31 — CA-1 and CA-2 DISCHARGED (working tree)

Decision 40's implementation landed the widening and the keys:
`AnnotationSubject` is a 13-arm union (value, chunk, context, file,
annotation, agent, query, result + the original five) and the key
family `foldlab/{name,related,search-note,pref,embedding,tombstone}`
is ratified and emitted (`Annotation.lean`, `annotationPlane.ts`; the
stream-loop review verified both). Annotations about content and
about annotations are spellable NOW. CA-3 was superseded by the
`agent` sort; CA-4 (step.query) remains deferred. Uncommitted until
the operator's commit.

## 4. The verdict, in one paragraph

The algebra lays out on the registry as it exists — and better than
expected. Searches are programs and programs are annotatable TODAY;
the association edge between two searches is not a proposal, it is the
`pinLink` worked example already byte-pinned in the tree; preferences
attached to specific past turns — the object PrefEval shows the whole
field failing to hold in context — are spellable TODAY through the
exchange arm. What the registry cannot yet say is annotations ABOUT
CONTENT (the five-arm subject union stops at the meta/agent planes)
and notes-about-notes — one arm-additive widening event, priced by the
module's own versioning ruling, closes both. Identity needs only its
registry section. Nothing needs a new sort. The language was closer to
the search plane than the search plane knew.
