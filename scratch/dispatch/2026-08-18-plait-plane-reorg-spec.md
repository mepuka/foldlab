# Plait src reorganization: the filesystem carries the stack

Status: RATIFIED by the operator 2026-08-18 (all §7 placements per
recommendation: ContextProgram → kernel/, Wire+Subjects → kernel/,
internal/ stays flat, Kernel* export deferred to its own ticket).
DEV-743 ruled complete the same day — stage 2's seat-collision block
is lifted. Coordinator-written at the operator's direction; execution
tracked under epic DEV-760.
Method: the codebase-design / improve-codebase-architecture skills
(deep modules, seams, depth-as-leverage vocabulary), applied to
`packages/plait/src` at main tip 7223ff79f (post PR #96 — the kernel
corpus slice is merged). Conceptual basis: the architecture
abstractions note (`scratch/research/2026-08-18-algebra-engine-architecture.md`,
AE-1..AE-7) and the kernel-model walkthrough (KM-15..KM-21).

## 1. The friction, stated in the skills' terms

The package's modules are individually DEEP — `Cell`/`Lane`/`Fold`/
`Register` each present a small interface over a substantial adapter
in `internal/` (the seam discipline is already right, and this spec
must not disturb it). The shallowness is at the PACKAGE level: the
top of `src/` is 27 flat names, so the package's own interface
carries no map. The conceptual stack — which module is vocabulary,
which is judgment, which is a state plane, which is carriage — lives
only in documents and chat sessions. Every maintainer and every
agent session re-derives it. Locality of understanding is the thing
a directory tree is FOR; ours spends it.

The fix is not deepening any module; it is making the filesystem
carry the stack, so the code teaches the concept.

## 2. The five layers

Directory = plane, import direction = the stack's arrows. Verified
against the actual import graph at tip — the layering below has ZERO
existing violations, so the move is churn-only.

    truth/      the vocabulary every sentence speaks   (deepest; imports nothing local outside itself)
    kernel/     the language: corpus, door, programs, wire grammar
    planes/     the state carriers, one seam per plane
    carriage/   hosts and transport clients
    surface/    entry points

**The law: a layer imports only itself and layers above it in this
list** (truth is the top of the "above" order — deepest). `internal/`
is exempt: it is private adapters and helpers, importable from any
layer, never itself importing a public module except its own seam's
siblings. It stays exactly where it is.

## 3. The placement table

| File | Layer | Note |
| --- | --- | --- |
| Refusal.ts | truth/ | the grammar's no — everything speaks it |
| Canonical.ts, CanonicalJson.ts, SchemaCanonical.ts | truth/ | the one byte form |
| Digest.ts | truth/ | the one name |
| Algebra.ts | truth/ | rungs and witnesses (`Fold` already consumes `hasCommutativeWitness`) |
| KernelCorpusSchemas.ts | kernel/ | the interchange grammar |
| KernelTables.generated.ts, KernelSchemas.generated.ts, KernelBuilder.generated.ts | kernel/ | [GEN] the corpus projections — names and headers unchanged |
| KernelDoor.ts | kernel/ | admit — the judgment seam |
| KernelProgram.ts | kernel/ | program declarations (imports CanonicalJson: kernel→truth ✓) |
| ContextProgram.ts | kernel/ | cataloged program family (placement judgment call — see §7) |
| Wire.ts | kernel/ | the envelope IS a projection of the language, not transport |
| Subjects.ts | kernel/ | the addressing grammar (`Lane` imports it: planes→kernel ✓) |
| Cell.ts | planes/ | join plane |
| Lane.ts | planes/ | positioned plane |
| Register.ts | planes/ | fence plane |
| Fold.ts, Anchor.ts | planes/ | the read canon and its coordinate |
| Catalog.ts, Blob.ts, Resolved.ts | planes/ | declare/resolve stores; verify-on-read |
| FabricClient.ts | carriage/ | transport client |
| CasDaemon.ts | carriage/ | daemon host (imports kernel corpus: carriage→kernel ✓) |
| cli.ts | surface/ | entry point |
| internal/* (13 files) | internal/ | UNMOVED — adapters keep their homes |
| index.ts | src/ | UNMOVED — public namespaces byte-stable, only re-export paths change |

## 4. What deliberately does not change

- **The public surface.** `index.ts` keeps its 16 namespaces and
  their doc lines; DECISIONS.md T7's public-surface walk and the
  emitted-declaration gate are the walls proving it. The unexported
  status of the Kernel* modules is preserved by the move; exporting
  them is a stage-3 surface decision, never a side effect.
- **The interface/adapter seams.** Every plane module keeps its
  `internal/` adapter; no module is merged, split, or renamed.
- **Generated files.** Names, headers, and the generators that emit
  them; only their directory changes, and the emitter config moves
  with them in the same commit.
- **Semantics.** The move commit contains path edits only. Any
  behavioral diff hiding in a "reorganization" commit is the thing
  reviews can't catch — churn and meaning never share a commit.

## 5. Stage plan

**Stage 1 — vocabulary, additive, conflict-free (can start now).**
CONTEXT.md gains the five-layer vocabulary with one-line glosses;
each src module gets a one-line plane tag in its header doc. No
moves. This stage is safe against every in-flight DEV-743 seat.

**Stage 2 — the move, one atomic commit (BLOCKED on: operator
ratification of this spec + DEV-743's surface-touching seats
landing).** Physical moves per §3, import-path updates, test-import
updates, emitter config paths. Walls: public-surface walk
byte-stable; emitted-declaration gate green; corpus replay
byte-identical; full battery green; tsc referee agrees with tsgo.
Coordination note: a whole-package path churn is maximal merge
surface — the R-2 union lesson says the coordinator lands this one,
between waves, never concurrent with a seat editing the same files.

**Stage 3 — the seams (the real slice; parallelizable after 2).**
Materialize the session's conceptual mappings as module interfaces:

- **T-door.** One `admit` seam: cli, FabricClient, and CasDaemon
  route all judgment through KernelDoor — no side-door validation
  anywhere in carriage or surface. Depth argument: the door is the
  package's deepest possible module (the whole law corpus behind one
  function); every host that validates privately is a second door.
- **T-rungs.** KM-17 in types: Algebra's rung ladder as brands
  carried by fold declarations, so rung⇒carrier violations are type
  errors (the license table materialized). `Fold`'s existing
  commutative-witness check is the embryo; this ticket grows it into
  the ladder.
- **T-coalgebra.** The duplex gap: `internal/pump.ts` has NO public
  seam — subscription/consumer behavior exists with no interface. Cut
  a `planes/` (or carriage/) consumer module: sessions as read-plane
  state, every outbound view a declared fold (the egress-law
  candidate's code shape; enforcement stays stated-only until the
  law is proved).
- **T-address.** KM-15/16 sugar: explicit roots + iterated-resolve
  path helpers over Catalog/Resolved. No new machinery — a path is a
  composed resolve; rootless paths refuse.

**Stage 4 — the walls that keep it true.** An import-direction lint
(the §2 law as a gate check) and the ops/harness projection of the
new layout (AE-5's skeleton). Optional: AE-7 measurement hooks at
the layer seams.

## 6. Depth notes per new seam (stage 3)

| Seam | Interface (sketch) | What sits behind it | Leverage |
| --- | --- | --- | --- |
| door | `admit(candidate) → Act ⊕ Refusal` | the whole generated corpus + door checks | every host, one judgment; refusal parity everywhere |
| rungs | brands on `Fold.declare` | the algebra ladder + witnesses | carrier misuse becomes a compile error |
| consumers | `subscribe(fold, anchor policy) → session` | pump, ack state, redelivery | duplex made first-class; egress accountable |
| paths | `at(root, ...names) → Resolved` | catalog greatest-reads | addressing-as-language, agents navigate by resolve |

## 7. Open placements (grill items for the ruling)

1. ContextProgram: kernel/ (as placed — program family) vs planes/
   (as catalog consumer). Recommendation: kernel/.
2. Wire + Subjects in kernel/: the "wire grammar is a projection"
   reading vs a carriage/ instinct. The import graph forces
   kernel/-or-deeper (Lane imports both); recommendation stands.
3. Whether internal/ eventually mirrors the layers (internal/planes/
   etc.): recommend NO until a real navigation friction shows —
   adapters' location is not the concept map.
4. Exporting Kernel* namespaces from index.ts: a real surface
   decision with T7 consequences; stage 3+, its own ticket, not
   assumed.

## 8. Honest bounds

No runtime behavior change is claimed or permitted through stage 2;
the walls verify absence of change, not improvement. The layering
law is enforced by review until stage 4's lint lands. The
coalgebra seam materializes the egress law's SHAPE only — the law
itself remains a stated-only candidate until proved. Placement of
three files (§7) is judgment, not derivation, and says so.
