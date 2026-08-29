# STATE OF THE MECHANIZATION — 2026-08-29, end of the hard build push

Operator-commissioned status report. Every row graded on the proof
ladder; WAITING names what blocks it. Audit cadence: two-hour checks
against this document; the critical path (the brain stem → cas_word →
FE-1 → daemon → dogfood) is the lane.

## The proof ladder

- **L5 ROCK SOLID** — theorem + byte gate + CROSS-HOST or operational
  proof: bytes agree between independent implementations, or the
  thing runs end to end against a real store.
- **L4 GATED** — theorem-backed and byte-identity gated, single host;
  no independent second implementation yet.
- **L3 PROVED, UNWIRED** — Lean theorems landed; no host consumer.
- **L2 BUILT, YOUNG** — operational code with tests, hours old,
  unstressed.
- **L1 RULED, OWED** — ratified design, slice commissioned or queued.
- **L0 PAPER** — spec/statement only; nothing to run.

## L5 — rock solid end-to-end byte validity

| Capability | The proof |
|---|---|
| Content addressing + admission | Lean judgment + host door; re-digest at every load; SIGKILL probe: 2097/2097 verified post-crash |
| Conformance vectors / words | Lean-computed words = host-run answers, binding for binding (VectorPrograms cross-host run gate) |
| Program round trip (document plane) | T12: Lean-emitted lift documents recognized by BOTH TS engines byte-for-byte; decodeLift exactness PROVED |
| Schema ingestion two-doors | 95-triple verdict corpus computed by executing the Lean model, mirrored by the generated TS gate |
| Stage-1 inventory | THREE instruments (tsc API, Lean/tree-sitter twin, OXC) byte-agree on the body; 6/6 files parse clean on OXC |
| Grammar registry | manifestV0 → JSON + REGISTRY.md + kindTags.ts, witnesses guard layouts against encoders cross-layer |
| Replication | litestream replicate→restore preserves every Lean-computed address (scripted check) |
| MCP tool table | one Lean value → JSON manifest + typed TS table + served handlers; boot gate refuses drift; e2e smoke over real frames |

## L4 — gated, theorem-backed, single host

Admission map (ACC-1 totality, 11 guards both directions) · emitted
layers (SystemNode → EmittedLayers.ts, 12/12 key-set differential,
mutation-checked both registers; CANON-1 guard live) · the four
ledgers (surface 1900+ decls, obligations 63, laws 9/37 bound with
28 counted owed, environment 44 tasks/16 exes) · computed program
prose (point :: envelope, byte-gated) · admission/annotation/exchange
kinds (naming ruling landed: subject union over five planes, typed
values, CodeRef catalog pair) · the build relation (sources/outputs +
blake3 freshness + forced gen:ci mirror with envledger refusal —
fired twice tonight, correct both times).

## L3 — proved, unwired (the brain-stem lane is wiring these NOW)

encodeProg/decodeProg (programs as content at tags 14/15 — NO host
codec until P0 lands) · W-SEC/W-COR (verify-without-store — no host
verifyHandler) · the envelope sandwich + FRAME-1 (proved through
refusing runs) + MS-1's hash-determination boundary + the
counter-witness · putWord early cutoff (proved; no consumer).

## L2 — built, young, unstressed

cas serve + BS-1 (stall-visible, loss-proof, bounded — probes are
standing tests; hours old) · SystemNode authoring (two roots, seven
arms) · census instrument (140,583 decls; found a real twin
divergence: the defaulted-parameter form axis, UNRULED) · env/law/
obligation emitters · the OXC instrument · mise skip discipline
(check:cas 0.08s on unchanged tree).

## L1 — ruled, owed (the queue, in critical-path order)

1. **P0 THE BRAIN STEM — IN FLIGHT NOW**: host step/cont codec with
   cross-host address agreement, queue 22 (lit + load in RunParams,
   manifest bump), run-by-address, R7 stamp, the operational
   transcript. WAITING ON: the lane (dispatched).
2. **cas_word** (WordSig + three theorems) — the front end's true
   blocker; "words are receipts" is L0 for the RUNNING system until
   this lands. WAITING ON: P0 merge.
3. **FE-1 emitagents** (four client configs + SETUP.md + OWED list) —
   no ruling needed, both inputs gated. WAITING ON: P0 merge (order).
4. **The daemon bind** (~50 lines: Core.ts + McpServer.layerHttp) —
   BS-1 precondition now MERGED. WAITING ON: sequencing after P0.
5. **Dogfood wave 1** (the newcomer) — WAITING ON: P0 + CLI audit
   (in flight).
6. Code-mode register manifest row (sandbox-tier ruling owed for the
   TS half; the document half needs only the row) · G5/L-S guarded
   table (consumer named: agentStep; SPEC-2 scoped speculation) ·
   build-step arm on SystemNode + Trace kind at Persistable ·
   telemetry/logging hoovers (backlog research) · Persistable folding
   (top of backlog) · Rust/Go daemon adoption scout (libsql/sqld) ·
   working-tag register · E1/E2/E5 plain-language emitters · Ast→
   Schema value door · litestream TOOLS row + lag metric · D1
   re-ruling (tree-sitter legs only; OXC is the instrument).

## L0 — paper only

λ• succinct-verifier payoff (cost model absent — flagged in DESIGN)
· SPEC-1's word-coarsening (refused; SPEC-2 is the path) · L-S owed
theorems (L-A↪L-S, L-S↪L-P) · wasm Lean verifier in the browser ·
full-content CodeRef file nodes (the ruling's open half) · scheme-1
hashing (BLAKE3 behind AddressScheme; identification before agility)
· SAF + Build-Systems-à-la-Carte G0 pins (corpus pin pending).

## Honest operational answers (the operator's four questions)

INTERPRET PROGRAMS: inline documents YES (proved + operational);
by-address IN FLIGHT (P0). LAYER/BUILD DEPENDENCIES: layers YES
(L4); build steps L1. RUN MCP: YES (L2 — young, now stall-proof).
PLAIN LANGUAGE FOR ALL OPERATIONS: programs + tools + registry YES;
verdict notes and the literature NO (E2/E5 owed). INTELLIGIBLE AND
USABLE: unmeasured — dogfood exists to answer it.

## Waiting on the operator (top asks only)

Census twin-divergence form axis (defaulted parameters) · D1
re-ruling formalization · FRONTEND's asks 7/10/11 (UI split ratify,
MCP protocol currency, distribution posture) · sqld scout release ·
Turso token rotation (SECURITY, D1 of the paperwork audit).
