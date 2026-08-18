# Prior-art sweep reports — template-algebra investigation (dispatch 37)

Status: verbatim preservation of the two commissioned research-sweep
reports (Opus agents, 2026-08-17), so the investigation record's
lead-tier citations can be re-verified against the exact links the
sweeps fetched. Consumed by
`docs/research/2026-08-18-template-algebra-investigation.md` §6/§8.
Everything below is the agents' own text, lightly retitled; claims are
lead-tier until re-verified against primary sources.

---

## Report A — formal treatments of Mustache/Handlebars-class languages

### Ledger

| Work | Year | What it formalizes | Mechanized? | What it proves | Relevance |
|---|---|---|---|---|---|
| **Mustache spec** (mustache/spec) | ongoing (v1.3) | Nothing formal — YAML/JSON conformance test suite | No | Nothing; test-driven conformance only | The "spec" is a baseline oracle, not a semantics; no operational semantics exists to import |
| **JWIG** — Christensen, Møller, Schwartzbach (TOPLAS) | 2003 | XML templates with named gaps + a plug operation (`e1<[g = e2]`) as first-class data | On paper (dataflow analysis, summary-graph lattice) | Generated XHTML valid; no run-time document-construction errors | Nearest structural ancestor: templates with named holes + fill; typing = DTD validity; analysis, not algebra |
| **XACT** — Kirkegaard, Møller, Schwartzbach (IEEE TSE) | 2004 | XML templates first-class, XPath manipulation, DTDs as types | On paper | Valid input transformed to valid output | Schemas-as-types works for template values |
| **Static Validation of XSLT** — Møller et al. (TOPLAS) | 2007 | XSLT via the XML-graph formalism | On paper | Output validity against a schema | The Aarhus line is the only sustained formal attack on templating |
| **Samuel, Saxena, Song** (CCS '11) | 2011 | Context type qualifiers over a real templating language (Closure/Soy class) | On paper | Automatic, context-correct sanitizer placement | The only type system aimed at templating languages as such; "context" ≈ hole type by output position |
| **Closure strict autoescaping / safe-html-types / Trusted Types** | 2010s– | Content kinds (`SanitizedContent`) as an output-context lattice | No | "Recursively guaranteed not to underescape" — asserted, not proved | Design precedent, not a result |
| **Ur** — Chlipala (PLDI '10) | 2010 | Type-level record computation; code-generating metaprograms | On paper | Generation never produces invalid code | Typed answer to templates-as-generators |
| **Ur/Web** — Chlipala (POPL '15, CACM '16) | 2015 | Whole-app model under one type system | On paper | Type safety across client/server/DB | Typed alternative to string templating, shipped |
| **Omar et al., TSLs** (ECOOP '14, Wyvern) | 2014 | Type-specific languages, hygienic literal parsing | On paper | Non-interference of composed extensions | Typed-literal story for host-embedded templates |
| **Taha & Sheard, MetaML** (PEPM '97; TCS 2000) | 1997/2000 | Staged λ-calculus; quote/escape/run | On paper | Type-check once before stage 1; generated programs safe | The principled cousin: well-typed output by construction |
| **Pickering, Löh, Wu — Typed Template Haskell spec** (arXiv) | 2021 | Core semantics for typed quotation w/ polymorphism | Mechanization status not established | Source-to-core translation for a multi-stage calculus | Model for how to write the semantics |
| **Rompf & Odersky, LMS** (GPCE '10, CACM '12) | 2010/12 | Staging via types only | No | Engineering result | Contrast: staging without quote syntax |
| **Flatt, Binding as Sets of Scopes** (POPL '16) | 2016 | Scope-set macro expansion | On paper (Racket's expander) | Hygiene model | Only load-bearing if sections become binders |
| **Kohlbecker et al.** | 1986 | Renaming-based hygiene | UNVERIFIED by direct fetch (attested via Clinger & Flatt, PACMPL 2020) | Capture avoidance | Historical root |
| **Jourdan, Pottier, Leroy** (ESOP '12) | 2012 | LR(1) automaton vs grammar | **Coq** | Validator proved correct (verified C99 parser) | Verified-parser precedent |
| **Koprowski & Binsztok, TRX** (ESOP '10; LMCS 2011) | 2010/11 | PEG semantics + parser interpreter | **Coq** | Total correctness incl. termination | PEG fits Mustache delimiter scanning |
| **Lasser et al.** (ITP '19) | 2019 | LL(1) parser generation | **Coq** | Soundness/completeness/termination | Alternative |
| **Danielsson** | 2013 | Grammar-indexed pretty-printers | **Agda** | Round-trip: print-then-parse = id | The `parse ∘ render = id` theorem shape |
| **Narcissus** — Delaware et al. | 2018/19 | Binary formats; decoder+encoder from one spec | **Coq** | Encoder/decoder inverses | One-spec-two-directions architecture |
| **EverParse/LowParse** — Ramananandro et al. (USENIX Sec '19) | 2019 | TLV formats | **F\*** | Memory safety; parse∘serialize = Some; **non-malleability** | Non-malleability = render-injectivity shape |
| **Fiore, Plotkin, Turi** (LICS '99) | 1999 | Initial-algebra semantics of binding syntax; substitution monoids | On paper (PDF extraction failed; content attested via nLab + secondary — treat exact statements as second-hand) | Simultaneous substitution derived by structural recursion, provably correct | The mathematical home of fill |
| **Hamana** (APLAS '04) | 2004 | Free Σ-monoids with metavariables | On paper | Terms-with-metavariables = free algebras with substitution structure | Metavariables are the holes |
| **Fiore** (MFCS '08 / UCAM-CL-TR-807) | 2008 | Second-order algebraic theories | On paper | Second-order Lawvere theories | Only needed if templates bind |
| **Fiore & Szamozvancev** (POPL '22) | 2022 | Syntax-with-binding generated from a signature | **Agda** | Weakening/substitution/metasubstitution correctness; semantic substitution lemma | The best mechanization template; port the shape to Lean 4 |
| **nLab `clone`** | — | Abstract clone axioms | Reference | Clones ≡ cartesian operads ≡ one-object cartesian multicategories ≡ Lawvere theories ≡ finitary monads | The decisive "operads add nothing" citation |

### Thinness assessment

Direct formal or mechanized treatments of Mustache/Handlebars/Jinja2/
Liquid-class languages: **zero** — searched by language name, by
"logic-less", by proof assistant × engine name, by venue
(ICFP/OOPSLA/PLDI/ECOOP), and by generic phrasing; only practitioner
material or unrelated senses of "template" returned. The Mustache
"spec" is a YAML conformance suite with no grammar production or
rendering judgment. The word "template" is search-poisoned
(arXiv:1507.06778 surfaces on every query and is about logic
specification). Nearest misses in order: JWIG (has the object — named
gaps + plug — but no algebraic theory of plug; nobody asked whether
plug forms a clone), Samuel–Saxena–Song (the only type system, aimed
at XSS), Ur/Web (replaces rather than models). Correction recorded:
the auto-sanitization paper is Samuel–Saxena–Song (CCS '11);
Saxena–Molnar–Livshits is ScriptGard, a different CCS '11 paper.
UNVERIFIED, unfetched: MLj, WASH, iData/iTasks; Kohlbecker '86 direct;
mechanization status of the Typed Template Haskell spec.

### Recommendation (verbatim conclusion)

Free monad on a polynomial signature plus simultaneous substitution is
the honest answer; operads are decoration. An abstract clone is
exactly the fill operation, and clones ≡ cartesian operads ≡ Lawvere
theories ≡ finitary monads (nLab, citing Kelly, Power, FPT, Staton) —
the choice of vocabulary changes no theorems. Operadic language earns
its keep only for linear holes; Handlebars is emphatically cartesian
(partials duplicate under `{{#each}}`, drop under falsy `{{#if}}`).
Model `Template` as a plain inductive family; prove left unit, right
unit, associativity of fill by structural induction; do not
instantiate `Monad`/`LawfulMonad` if index typing fights; import no
category theory to state a twenty-line result. Load-bearing citations:
FPT LICS '99; Fiore–Szamozvancev POPL '22; Hamana APLAS '04; nLab
`clone`; JWIG TOPLAS 2003. Optional per theorem target: Narcissus /
EverParse (inverse/non-malleability shapes); Samuel–Saxena–Song +
`SanitizedContent` (context-typed holes). Skip hygiene and
second-order theories unless sections become real binders; staging is
one related-work paragraph.

### Sources (as fetched by the sweep)

- https://github.com/mustache/spec
- https://cs.au.dk/~amoeller/papers/jwig/
- https://www.brics.dk/JWIG/manual/jwigman.pdf
- https://cs.au.dk/~amoeller/papers/xact/abstract.html
- https://dl.acm.org/doi/10.1145/2046707.2046775
- https://github.com/google/closure-templates/blob/master/documentation/concepts/auto-escaping.md
- https://github.com/google/safe-html-types/blob/main/doc/security_reviewers_guide_safehtml.md
- https://adam.chlipala.net/papers/UrPLDI10/
- http://adam.chlipala.net/papers/UrWebPOPL15/UrWebPOPL15.pdf
- https://www.cs.cmu.edu/~aldrich/papers/ecoop14-tsls.pdf
- https://dl.acm.org/citation.cfm?id=259019
- https://arxiv.org/abs/2112.03653
- https://dl.acm.org/doi/10.1145/2184319.2184345
- https://users.cs.utah.edu/~mflatt/scope-sets/
- https://dl.acm.org/doi/10.1145/3386330
- https://xavierleroy.org/publi/validated-parser.pdf
- https://arxiv.org/abs/1105.2576
- https://tupl.cs.tufts.edu/papers/itp2019_ll1.pdf
- https://gup.ub.gu.se/file/126689
- https://arxiv.org/abs/1803.04870
- https://www.usenix.org/conference/usenixsecurity19/presentation/delignat-lavaud
- https://homepages.inf.ed.ac.uk/gdp/publications/Abstract_Syn.pdf
- https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-807.pdf
- https://arxiv.org/abs/2201.03504
- https://ncatlab.org/nlab/show/clone

---

## Report B — agent orchestration on pure CAS + CRDTs

### Verdict up front

The claim as stated does not survive. Direct prior instance: **grite**
(neul-labs), described in arXiv:2606.19616 *"Before the Pull Request:
Mining Multi-Agent Coordination"* (June 2026): content-addressed
append-only event log, CRDT merge for shared state, CAS TTL leases on
git refs for exclusive decisions — explicitly no server and no
agreement round. Its novelty sentence is close to a paraphrase of
Plait's.

### Ledger

| System | Coordination substrate | Orchestrates or replicates? | Bearing on the claim |
|---|---|---|---|
| **grite** (arXiv:2606.19616) | WAL in `refs/grite/wal`; event ids = 256-bit BLAKE2b, content-addressed, tamper-evident; CBOR + optional Ed25519; CRDT projection (LWW + commutative-set); TTL leases at `refs/grite/locks/<resource_hash>` via CAS on a git ref; no server, no agreement round | Both (task-pool eval, locks-only and locks+state arms) | Refutes the claim as stated |
| **CodeCRDT** (arXiv:2510.18893) | Yjs over centralized Hocuspocus relay, SQLite; claiming via optimistic write-verify on Y.Map LWW (50 ms) | Both — decentralized claiming, 600 trials | Near miss: exclusivity from LWW, not CAS; centralized relay; no content addressing |
| **Beads** (Yegge) | Git as distributed DB; work as dependency DAG; mutations = commits | Tracks ready work for agents | Git-CAS-adjacent; no lattice, no lease primitive; grite names it closest comparison |
| **Lasp** (PPDP '15) | CRDT dataflow, coordination-free, SEC, ~1,000 AWS nodes | State only (ad counter) | No decision mechanism, no CAS, never orchestrated agents |
| **Anna** | Coordination-free lattice actors, wait-free | Storage only | ACI knowledge plane is old |
| **Cloudburst** | Anna + co-located caches | Stateful FaaS composition | Nearest CALM execution system; no decision register |
| **Hydro / "Keep CALM and CRDT On"** (VLDB '22) | Compiler stack; CALM decides coordination-free queries | Neither | Closest to the CALM half; no orchestrator |
| **"When Coordination Is Avoidable"** (arXiv:2602.18673) | Analysis only; Thompson interdependence × CALM; pooled tasks join via semilattice; 65 workflows + 13,417 tasks classified | Neither — no implementation | The CALM-on-agent-work idea is published; the system is not |
| **LVars** (Kuper) | Monotone lattice writes + threshold reads | Parallel programming model | Lattice accumulation prior art; no distribution, no agents |
| **Katara** (OOPSLA '22), **VeriFx** | CRDT synthesis/verification | Neither | Verified-lattice-laws prior art for design, not harnesses |
| **Bazel RBE / Buildbarn** | CAS keyed by digest; central scheduler | Orchestrates tasks at scale | CAS + orchestration but central scheduler, no CRDT plane, no contention (scheduler consensus UNVERIFIED) |
| **Nix ca-derivations** | Content-addressed store; build graph as scheduler | Deterministic tasks | No competing autonomous writers, no lattice plane |
| **Unison** | Content-addressed code; `Remote` ability | Distributes computation | No CRDT plane, no contention model |
| **IPVM / Bacalhau** | CIDs; dedicated orchestrator | Orchestrates jobs | Centrally scheduled; no lattice merge |
| **DXOS ECHO** | P2P CRDT graph DB; agents as sync peers | Replicates | No decision mechanism |
| **Automerge / Yjs / Loro / cr-sqlite / Diamond Types** | CRDT libraries | State sync only (2026 survey enumerates exactly these) | No exclusive-decision primitive in the local-first stack |
| **Linda / tuple spaces** | Associative space; atomic destructive `in` | Orchestrates — the ancestor | Exclusive claim is 40 years old; matching ≠ addressing; no lattice |
| **Temporal / Cadence** | Sharded DB persistence; one op per History Shard; journal + replay | Orchestrates | Contrast class |
| **Restate / DBOS / Inngest / Resonate / Step Functions / Durable Functions** | Durable execution over replicated log/DB (specifics UNVERIFIED) | Orchestrate | Contrast class |
| **etcd/ZooKeeper leases** | CAS on keys, Raft/ZAB-backed | Orchestrates | Same API shape, opposite substrate — name explicitly |
| **LangGraph / AutoGen / CrewAI** | Central checkpointer / message history / LanceDB | Orchestrate | Mainstream agent field is central-DB |
| **AgentGit** (arXiv:2511.00628) | Git-like commit/revert over MAS state | Rollback, not claiming | Git metaphor, not git-as-CAS coordination |

### Nearest misses

1. **grite — a hit, not a miss.** Verified from README and arXiv HTML.
   Lacks relative to Plait (targeted extraction): no CALM/monotonicity/
   semilattice mention anywhere; convergence by property-based testing
   ("two replicas rebuild to byte-identical projections"), explicitly
   not theorem-proving; LWW not a general join-semilattice; no
   two-plane vocabulary; leases advisory ("a substrate cannot enforce
   coordination on an uncooperative agent"); evaluated on seeded
   deterministic agents; `libgrite-core` v0.5.3.
2. **CodeCRDT** — autonomous LLM agents, decentralized claiming, 100%
   convergence over 600 trials; but no CAS register (racier LWW
   write-then-verify), no content-addressed store, no CALM analysis.
3. **Bazel RBE / Buildbarn** — genuine CAS orchestration at scale; but
   central assignment, no competing autonomous writers, no CRDT plane
   (same for Nix, Bacalhau).

### Verdict

Not defensible as written; one-link rebuttal via arXiv:2606.19616.
Component-level canonical citations to expect: Anna/LVars/Lasp
(lattice accumulation); Hellerstein–Alvaro + "Keep CALM and CRDT On"
(CALM avoidance); arXiv:2602.18673 (CALM task classification,
analysis-only); Bazel/Nix (CAS task graphs); Linda `in` (exclusive
claiming, 1985); Katara/VeriFx (verified lattice laws).

Surviving qualifiers, descending strength: (1) machine-checked lattice
laws in a running harness — unmatched on this sweep; (2) CALM analysis
as the method that derives the split — absent from grite and every
framework; (3) general join-semilattice merge vs LWW. Safe
formulation: *"Plait is, to our knowledge, the first agent
orchestration harness in which the coordination/no-coordination split
is derived by explicit CALM analysis and the knowledge plane's
join-semilattice laws are machine-checked, rather than asserted or
property-tested. The closest prior system, grite, shares the CAS-log +
CRDT-merge + lease-register architecture but establishes convergence
by testing and performs no monotonicity analysis."* Concretely: cite
grite in related work; move the novelty claim from architecture to
derivation and proof.

UNVERIFIED: Buildbarn scheduler consensus internals; Restate/DBOS/
Inngest/Resonate/Step Functions substrate specifics; Lasp 10-year
retrospective contents (PDF unextractable; title/venue confirmed);
StateFuse architecture (PDF unextractable); arXiv:2605.03310 confirmed
irrelevant (prediction-markets Brier-score study). One fetch flagged
skepticism about grite's 2026 dates — that reflects the fetching
model's knowledge cutoff; repo and paper resolve and are mutually
consistent.

### Sources (as fetched by the sweep)

- https://github.com/neul-labs/grite
- https://arxiv.org/html/2606.19616v1
- https://lib.rs/crates/libgrite-core
- https://arxiv.org/html/2510.18893
- https://arxiv.org/pdf/2210.12605
- https://arxiv.org/html/2602.18673
- https://arxiv.org/abs/2605.03310
- https://arxiv.org/pdf/1708.06423
- https://webperso.info.ucl.ac.be/~pvr/ppdp-2025-lasp.pdf
- https://dsf.berkeley.edu/jmh/papers/anna_ieee18.pdf
- https://www.vldb.org/pvldb/vol13/p2438-sreekanti.pdf
- https://hydro.run/
- https://arxiv.org/abs/2205.12425
- https://dl.acm.org/doi/10.1145/2502323.2502326
- https://github.com/bazelbuild/remote-apis
- https://www.tweag.io/blog/2021-12-02-nix-cas-4/
- https://github.com/bacalhau-project/bacalhau
- https://www.unison-lang.org/docs/the-big-idea/
- https://docs.dxos.org/echo/introduction/
- https://docs.temporal.io/encyclopedia/architecture/temporal-architecture
- https://betterstack.com/community/guides/ai/beads-issue-tracker-ai-agents/
- https://arxiv.org/abs/2511.00628
- https://zylos.ai/research/2026-03-17-crdts-distributed-state-sync-multi-agent-systems/
- https://en.wikipedia.org/wiki/Tuple_space
