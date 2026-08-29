# The construct vector bank — dimensions, versions, canonical forms

Status: PROPOSED 2026-08-28 (operator direction, this session):
specify now, mechanize as its own lane while reification, generation,
modeling, and runtime interaction proceed. Companions: the enumerated
banks (`models/bank-r0.json`, `bank-v3.json` — the degenerate one-row
version of this), the form-register spec, the analysis algebra.

## 1. The thesis (operator, recorded)

Effect code's regularity means the analysis problem is DATA
ORGANIZATION, not search: the ecosystem's surface is effectively a
giant Merkle DAG in which any observed occurrence attributes to a
canonical form with one or two prefixes on some axis — speed and
precision come from having the bank organized ahead of time and
letting the tokens fall through. The principal analytic question per
entity is its DIMENSIONALITY: how many parameters specify it, of what
types, across which versions; what errors can flow, carrying what;
what requirements it draws. With the continuation tree of effects
realized (the store language's carrier), a fully-dimensioned bank is
the road to complete static reasoning power: every node of the tree
attributed to a construct row that answers every question about it.

## 2. Row identity — the coordinate system

A row is identified by `(construct, pin)` and ADDRESSED by the hash of
its canonical content (CAS-003 canonical JSON → content address):

- **construct** — the Effect-native key (`effect/Effect.gen`), naming
  law throughout.
- **pin** — package version + git/snapshot hash of the source the row
  was extracted from. The HISTORIC axis: one construct's rows across
  pins form its version chain; generation canaries (already computed
  as set differences) become edges in this chain, not separate data.
- **address** — hash of the row's canonical form. Rows never mutate;
  a construct's evolution is a chain of addresses. The bank is an
  append-only Merkle DAG by construction — and therefore admissible,
  eventually, as CONTENT IN THE STORE ITSELF (nodes + refs), making
  the analysis substrate an instance of the thing being modeled.
  (Direction, grill-gated; the JSON carrier serves until then.)

## 3. The dimension strata (highest specificity → lowest)

1. **Signature stratum** — mechanized from the pin's own `.d.ts`
   (syntax-only parse; the declarations ARE the ground truth):
   - overloads: each with parameter count, per-parameter canonicalized
     type text + its hash, type-parameter count, return shape;
   - the `Effect<A, E, R>` decomposition where present: the ERROR
     channel's constituents (union members; tagged error names with
     their field shapes) and the REQUIREMENT channel's services —
     "what errors can be thrown and what do they contain", extracted,
     never inferred;
   - arg-level ladder: the arities under which the entity can be
     specified (data-first/data-last both recorded — they are
     distinct canonical forms).
2. **Semantic stratum** — the ruled joins: class, port (fiber
   boundary), spectrum grade. Already data; the bank absorbs them.
3. **Purpose stratum** — description/general purpose taken from the
   pin's OWN doc comments (the `.d.ts` JSDoc — the library documents
   itself; we extract, attribute, and hash, never author).
4. **Observed stratum** — wild evidence, per corpus stratum: hashes
   of every observed canonical usage form (call shape normalized then
   hashed — the n-gram/atoms machinery reborn as form hashing),
   occurrence counts, measured typical AST depth (replacing the
   seeded column), co-occurring constructs.

## 4. Attribution — letting the tokens fall through

The lookup structure mirrors the coordinates: a TRIE (the pin ships
`effect/Trie`) keyed module-prefix → member → form-hash. An observed
token chain resolves by import-resolved module prefix (one axis), then
member (second axis), then — when the deep question is asked — its
normalized form hash lands on the exact observed-form row. Attribution
cost is prefix traversal; no search anywhere. This is the fidelity ×
speed objective realized as data layout.

## 5. Mechanization plan (the delegable lane)

1. **Extractor**: per pin, walk the package's `.d.ts` files with the
   pinned syntax-only parser; emit signature-stratum rows (overloads,
   channels, arities) + purpose stratum (JSDoc). Deterministic,
   `--check` byte-gated, one output per pin: `models/vbank-<pin>.json`.
2. **Version chains**: rows joined across pins by construct key;
   canaries become chain edges. Pins to cover first: the v4 rc line,
   v3.22.1 (already enumerated), and the `@effect-ts` generation the
   corpus's old register pins.
3. **Observed forms**: the census gains form-hashing over span-linked
   hits; observed-stratum rows accrete per corpus run, keyed to the
   corpus manifest's pins (evidence provenance preserved).
4. **Trie assembly**: built from the bank at load, exactly as the
   PatternBank service builds today — this lane widens that service,
   it does not replace it.
5. **The join to reasoning**: when the continuation tree is realized
   (store-language carrier), tree nodes carry construct addresses;
   the bank answers dimension queries per node. That interface — node
   → row address → dimensions — is the reasoning seam and stays
   stable regardless of how strata grow.

## 6a. The canonical extraction ledger (operator direction 2026-08-28:
## cover every base; Merkle grouping by access pattern)

The split (MINT OWED to lab-core CONTEXT; proposed: **observed /
ascribed / derived** — glosses: EDB, ABox/TBox, IDB; Datomic, Nix,
Unison as design referents, pins pending). The resolving insight for
"the area between": wild usage and discourse are OBSERVED bytes whose
content is OTHER PEOPLE'S ascriptions — evidence we measure, never
vocabulary we rule. Our ascriptions stay a small closed ruled set.

### OBSERVED — every row: source artifact, extractor, pin, trust statement

**A. From the library pins (per construct × pin):**
1. name path, export kind, re-export/barrel topology, alias paths
2. signature set: overloads, canonicalized (name-erased) param types,
   type-param counts, return shapes; data-first/data-last as distinct
   canonical forms; pipeable registrations
3. channel decomposition per overload: A / E / R; E constituents
   (union members, tagged-error classes WITH field shapes); R
   constituents (service keys)
4. implementation body (+hash) and its internal imports — the
   library's own internal call graph
5. doc text, structurally: description, `@example` blocks (canonical
   usage forms authored by the library itself), `@since` (the historic
   axis for free), `@category` (the LIBRARY'S self-ascription —
   observed, not ours), `@deprecated`
6. runtime kind (typeof — the r0 bank), TypeId/symbol identities,
   variance annotations, type-alias/interface surfaces
7. pin metadata: version, git hash, date; changelog entries naming
   the construct
8. cross-pin raw material: presence/absence per pin (canary sets are
   DERIVED from this)

**B. From wild corpora (per occurrence × corpus pin):**
9. resolved construct + normalized form hash (call shape, arg-kind
   vector); saturation/pipe-position evidence (data-last in practice)
10. site provenance (repo pin, file, byte span) — the witness
11. containment context (entity kind, bracket interval, depth) and
    lexical/linearized hash (the sensor stratum, below identity)
12. co-occurrence sets (span / entity / file grains)
13. import-style distribution (barrel vs subpath vs named — how
    people actually reach the construct)
14. the repo's own effect version (joins occurrence to the pin axis)
15. observed error-handling: which E-channel members are actually
    caught (`catchTag` targets) — the E dimension met by usage
16. test-stratum usage, separately (how constructs are exercised)
17. adjacent comment lines at hit sites (wild micro-discourse,
    already lexically available)

**C. From discourse artifacts (observed evidence of others' ascriptions):**
18. official docs-site content per construct (pinned crawls)
19. README/tutorial mentions within corpus repos (already cloned)
20. upstream issues/discussions/PR titles naming constructs (pinned
    snapshots of the effect repos)
21. release-notes/changelog prose
22. community Q&A — CANDIDATE ONLY: provenance and ethics caveats to
    rule before any pin
23. discussion frequency per construct (operator, 2026-08-28): counts
    of community-discussion threads naming a construct, per time
    window, per source pin. Sources in provenance order: public Q&A
    archives of the community's help channels (verify availability —
    never raw chat scraping), GitHub Discussions as the always-
    pinnable fallback. RULING PROPOSED: aggregate frequencies and
    thread titles only — never stored quotations of individuals.

### ASCRIBED — ours, closed, small, grill-gated, versioned as data
1. semantic class (the existing taxonomy axis)
2. port status (in/out/interior) — judgment with observed structural
   correlates
3. domain tags (logging, streaming, schema, database, http, protocol,
   cli, ai, …) — module names supply the observed default; the
   RULING is what adopts each into the vocabulary
4. role tags: service, layer, helper, sub-helper-of, combinator,
   constructor, run/destructor, guard/predicate
5. per-construct spectrum rows (F2's table)
6. purpose-as-our-claim ONLY where the library's own words are absent
   or inadequate — otherwise the row POINTS at observed doc text
7. form-register membership (ruled forms)
8. lift-relevance grade (relation to the store language's documented
   operations)
9. cross-generation equivalence rulings (renames the chains cannot
   observe: v3 `Effect.Service` ↝ v4 `Context.Service` is a JUDGMENT)
10. model-or-black-box rulings per port construct
11. extractor trust statements (TOOLS.md rows — the meta-ascriptions)

### DERIVED — regenerable, provenance-carrying, never edited
commonality (ALWAYS corpus-pin-parameterized), complexity (one ruled
definition required first), version chains and canary sets, rollups
(module/pin/root), co-usage graphs, DAG positions, coverage and
residue, generation verdicts, discourse-frequency indexes, and the
interesting one: DOC-VS-USAGE DIVERGENCE — constructs whose observed
wild usage departs from their documented purpose — and the FRICTION
COEFFICIENT: discussion frequency over usage frequency (discussed ≫
used = confusing or aspirational; used ≫ discussed = invisible
workhorse), with discussion SPIKES joined to version-chain edges as
per-construct migration-pain measurement.

## 6. Rulings owed (grill before mechanization locks)

- Row schema ratification (field names, the canonical-form definition
  for signature text — whitespace/identifier normalization rules).
- JSDoc-as-purpose admission (an extraction, so a TOOLS.md-grade
  trust statement: the library's words, attributed, never treated as
  our claim).
- Version-chain representation (explicit edges vs recomputed diffs).
- The store-admission direction (bank as store content) — grill
  separately; nothing in strata 1–4 depends on it.
- Name: "vector bank" (operator's word) vs a mint that survives the
  naming law — the rows are less vectors than COORDINATIZED records;
  candidate: the construct ledger. Operator's call.
