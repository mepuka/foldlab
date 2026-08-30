# MATHY DIRECTIONS — ornament built by the store

**Lane:** front end / ornamentation.
**Status:** pre-grade, conception mode, for operator grilling. This document
proposes a direction; it does not promote a definition or claim a theorem.
**Companions:** `ORNAMENTATION.md` and `PROOF-OBLIGATIONS.md` in this
directory.
**Written against:** the local working tree, 2026-08-30. No external source is
used.

---

## 0. The direction

The existing direction stands: Prairie Ledger, Light Screen, and Taliesin
Bloom; ink plus one verdict hue; four trust marks; the book rather than the
dashboard; no decoration that carries no claim. This document gives that
vocabulary a grammar.

The central visual object is the **trunk**: the ordered, growing history of
what the store admitted. A screen is not decorated after the data arrives. It
is built by the same distinctions that build the trunk:

1. a datum has a sort;
2. children arrive before the node that names them;
3. the word grows by ordered addition;
4. a node's exact address is computed from its canonical bytes and presents
   their identity, with the estate's collision limits kept explicit;
5. independent effects enter through an explicitly sided sum; and
6. a recursive return is constructible only when it crosses a suspension.

Those six structures supply the composition rules. The historical names,
line quality, proportions, and warmth remain authored taste. The algebra tells
us **when a line may join, nest, repeat, close, or break**; it does not tell us
whether that line should look Prairie, Arts and Crafts, or Swiss.

### A small glossary

- A **sort** is a node form, such as `file`, `tree`, or `schema`.
- A **binding** is one node paired with its content address.
- A **word** is the ordered list of bindings produced by a run: the store's
  history, not merely a log message.
- A **prefix** is an initial part of that word.
- A **signature** is a family of operations and the answer type of each one.
- A **suspension** (`susp`) is a delay boundary around recursive schema code.
  It makes a recursive knot buildable; it does not promise that forcing the
  knot will finish.

---

## 1. The source structures, and the limits they impose

| Named estate structure or law | What it permits visually | What it forbids visually |
|---|---|---|
| `Cas.Grammar.Ty`: `value`, `chunk`, `tree`, `manifest`, `file`, `entry`, `context`, `step`, `cont`, `schema`, `git` (`library/cas/Cas/Grammar/Sorts.lean:23-56`) | Distinct structural roles and typed joints | An ornamental taxonomy unrelated to the actual sort table |
| `Tree : Ty → Type`; ill-kinded edges do not typecheck; `Tree.node_tag` stamps the sort's tag (`library/cas/Cas/Grammar/Tree.lean:57-59,133-135`) | A child meets a parent through a joint that declares the expected sort | Generic connector lines that make every thing appear connectable to every other thing |
| `Tree.flatten`: children first, own binding last (`Tree.lean:197-216`) | Structure accumulates inward-to-outward and ends in a root cap | Drawing a parent as settled before its dependencies |
| `Word = List Binding`; `find` and resolution remain stable under append (THE-ALGEBRA L62-L69) | Accretive ornament: old marks stay fixed while new marks are added | Reflowing or restyling completed trunk rows when a later row arrives |
| `wfFrom_append` (L69) and the proposed prefix theorem `wf (x ++ y) → wf x` (L74; FE-O7) | An ornament sequence may be split into consecutive bands without changing its order | Treating fork-by-prefix as fully licensed before L74 is named and proved |
| Address is computed from the canonical pre-image (L96); equality reflects node equality only under an injective hash hypothesis (L98), while collision resistance is deliberately not assumed (L99) | The full address is the identity mark; one successfully verified store object may reuse one rendered motif across views | A short prefix, similar shape, or repeated label pretending to be identity |
| Signature sum `S ⊕ₛ T` and `Prog.inl`/`Prog.inr` have explicit left and right structure (`library/cas/Cas/Lang/Sig.lean:20-25`; `Prog.lean:41-49`). Their interpretation-preservation laws remain OWED (L21-L26). | A split surface with named left and right compartments, derived from the syntax alone | A blended "effects" cloud, or a visual claim that the still-owed injection laws are already proved |
| `⊕ₛ` has no unit, and associativity/commutativity are false as Lean equations (L27-L28) | Parentheses and side survive in the drawing | Reordering, flattening, or regrouping summed borders as though the sum were a commutative palette |
| `Ast.bareRefs` stops at `susp`; `Document.Guarded` means no cycle of bare edges; `references_guarded_decidable` connects the check to that property (`library/cas/Cas/Schema/Guarded.lean:85-92,175-180,361-382`) | A recursive line may close only by visibly crossing a suspension gate | A bare recursive loop drawn as admitted, or a guarded loop drawn as guaranteed to terminate |

The table is deliberately asymmetric. The positive rules are useful only if
their negative halves stay visible. In particular, this direction does **not**
borrow associativity from an algebra that does not have it.

---

## 2. The three motif families, now derived

### 2.1 Prairie Ledger — the word made visible

Prairie Ledger is the family of baselines, ticks, combs, ruled bands, and
long horizontal or vertical runs. It renders ordered growth.

**PL-1 — one tick is one binding.** A primary cadence mark may repeat only
over a carrier that is actually a list: a `Word`, a program table, a reference
list, or another declared collection. Repetition preserves source order.
Source: `Word = List Binding` and `PProg = List PLine`
(`THE-ALGEBRA.md` §1.1), with ordered word growth in L130.

**PL-2 — the rule grows at the frontier.** A completed mark never moves,
changes weight, or acquires a new meaning when a suffix is appended. The new
ornament appears at the open end of the rule. Source: `find_append_of_some`
and `resolvesIn_mono` (L63 and L68); both say established answers survive word
growth.

**PL-3 — children collect into their parent.** Child marks are laid down
first; their rails converge on the later parent mark. The parent's terminal
cap is never shown ahead of its children. Source: `Tree.flatten`
(`Tree.lean:197-216`) and the host's gated children-first, root-last closure
(L200).

**PL-4 — a prefix ends cleanly, but provisionally.** A prefix cut is drawn as
a square stop, not torn paper: it is intended to be a valid place from which
to fork. This visual licence remains **PENDING** until L74 / FE-O7 is a named
theorem. Source: `wfFrom_append` (L69) plus the explicitly owed prefix law
(L74; `PROOF-OBLIGATIONS.md` FE-O7).

**PL-5 — duplicates do not earn a new growth ring.** A duplicate `put` leaves
the word unchanged, so the trunk gains no full binding tick. If the UI needs
to report the attempt, it belongs in a receipt view as an inert echo, not in
the trunk's admission cadence. Source: duplicate insertion leaves the word
unchanged (L92), and run growth is a sublist of declared puts rather than one
binding per line (L130).

This is why Prairie Ledger is not merely "horizontal lines." It is the
visual form of append, prefix, and children-first admission.

### 2.2 Light Screen — sorts, holes, and explicit sums

Light Screen is the family of frames, apertures, joints, typed holes, and
thin boundaries. It renders what may contain or connect to what.

**LS-1 — every joint declares a sort.** A connector terminates in a joint
whose shape or adjacent word identifies the child's expected sort. Shape is
never the only carrier; the sort word remains available at the nearer
resolution. Source: the indexed grammar `Tree : Ty → Type` and
`Tree.node_tag` (`Tree.lean:57-59,133-135`).

**LS-2 — constructor arity controls the frame.** A leaf has no inner joint; a
one-child wrapper has one inlet; an ordered pair has two distinct inlets. A
frame does not gain ornamental compartments that the constructor does not
have. Source: the actual constructors in `Tree.lean:59-91`.

**LS-3 — holes are typed and honest.** An empty place is labelled by the sort
it awaits and renders `—`, never a fabricated zero or generic loading shape.
When a matching binding arrives, that same hole is filled rather than replaced
by a different layout. Source: the trunk's "surface of typed holes"
(`REGISTER-HANDLER.md`, "The trunk"), the grammar's sort index, and the
existing `—`, never `0` rule (`ORNAMENTATION.md` §3; FE-O5 requirement 5).

**LS-4 — a view frame names its collection and derivation.** A view is a
cached register over the trunk, so its outer frame carries: which collection
fed it, which register rendered it, and whether it is current or stale. Source:
`REGISTER-HANDLER.md`, "Collection is the front end" and "The trunk".

**LS-5 — sums remain sided and parenthesized.** `S ⊕ₛ T` renders as a frame
with a labelled left bay and right bay. Nested sums retain their brackets;
`(S ⊕ₛ T) ⊕ₛ U` must not look like `S ⊕ₛ (T ⊕ₛ U)`. Source: the explicit
left/right syntax in `Sig.sum`, `Prog.inl`, and `Prog.inr`, plus the absence of
unit/associative/commutative laws in L27-L28. This rule does not assume the
still-owed interpretation laws L21-L26.

**LS-6 — light means boundary, not glow.** A pale field may mark a projection,
typed boundary, suspension gate, or cached-view extent. It may not be added
merely to make a card feel elevated. Source: the existing semantic-placement
admission test (`ORNAMENTATION.md` §6.5) and the structures named in LS-1
through LS-5.

### 2.3 Taliesin Bloom — earned closure and guarded return

Taliesin Bloom is the family of root caps, rosettes, returning curves, and
small terminal flourishes. It renders closure that the structure has earned.

**TB-1 — bloom is root-last.** A terminal bloom may appear only on the binding
that closes a rendered tree or receipt. It grows out of the collected child
rails; it is not stamped onto every successful row. Source: `Tree.flatten`
places the term's own binding last (`Tree.lean:197-216`), while
`Tree.self_mem_flatten` and `Tree.flatten_nonempty` ensure the term contributes
its own binding (`Tree.lean:235-243`). The stronger general last-entry lemma is
still owed as L82, so the implementation should follow the constructor
definition rather than claim that lemma today.

**TB-2 — a returning curve crosses a suspension eye.** In a schema view, a
recursive line may return to an earlier name only by passing through a small
open eye labelled `susp`. Remove that eye and the loop must break into a
refusal mark. Source: `bareRefs_susp` and `Document.Guarded`
(`Guarded.lean:125-180`).

**TB-3 — guarded is not done.** The suspension eye is neutral ink, never the
quiet completion bloom and never a green check. It states "this recursive knot
is constructible," not "forcing it terminates." Source: the explicit
constructibility-not-productivity limit in `Guarded.lean:27-50`.

**TB-4 — identical addressed substructure reuses one motif.** When two views
refer to the same verified full address, they may reuse the same bloom geometry
or collapse to one shared submotif. The reuse is keyed by the full address,
not visual similarity. Source: address-from-canonical-pre-image (L96), with
the Level-1 equality limit stated by L98-L99.

**TB-5 — completion is quiet.** An admitted root closes in ink. Saturated hue
is reserved for `owed`, `refused`, or `stale`; completion does not celebrate
itself. Source: the inherited spending rule (`ORNAMENTATION.md` §4.1) and the
root-last condition TB-1.

The bloom is therefore rare. If it appears everywhere, it no longer says that
structure has closed.

---

## 3. Accent families: signs that carry a claim

The existing four trust marks remain. They become **sign accents** placed on
the structural grammar above; they never create a second geometry system.

| Accent | Derived placement rule | Source structure or law |
|---|---|---|
| **Addressed** | The full address chip is the mark. An abbreviated display may appear in a row, but copy and identity use all 64 lowercase hex characters. | Address is the canonical pre-image's hash (L96); collision resistance is not assumed (L99); inherited `W-A1` in `ORNAMENTATION.md` §5.4 |
| **Verified-here** | A small closed joint sits immediately beside the address only after this process recomputed the digest and canonical bytes. | Host load re-verification gate (L195) and FE-O6's untrusted-reader boundary |
| **Gated** | A fine double rule may edge an emitted, byte-gated surface; it attaches to the surface, not every value inside it. | Byte-identity gate over generated surfaces (L230) and FE-O1's proposed component gate |
| **Owed** | The one saturated sign sits beside the exact unsupported statement, never on the whole card or page. | Existing trust-mark rule (`ORNAMENTATION.md` §4.2) and claim discipline carried by `PROOF-OBLIGATIONS.md` |
| **Receipt** | A children-first comb ends at the admitted root address; skipped duplicate puts appear as hollow notches, not bindings. | `Tree.flatten` order, duplicate inertness (L92), and word-growth sublist law (L130) |
| **Refusal** | The line breaks at the boundary that rejected composition and prints the clause name at full weight. No generic warning triangle. | `put` rejects exactly when reference checking rejects (L87-L90); guarded documents name `unguardedCycle` at the door |
| **Suspension** | A returning schema line passes through an open eye marked `susp`; the eye is neutral and remains visible at close resolution. | `bareRefs_susp` and `references_guarded_decidable` (`Guarded.lean`) |

Three carriers still accompany every accent: position, shape, and a word.
Colour is never sufficient. This keeps the existing accessibility rule and
makes the mathematical source inspectable rather than mystical.

---

## 4. The ornament grammar

This is a design grammar, not yet a proposed Lean type. If it later becomes
data, it belongs in the one addressable presentation carrier ruled in
`ORNAMENTATION.md` §6.5; it must not become a second theme beside `Style`.

### 4.1 Forms

```text
ornament ::= datum(sort, claim)
           | hole(sort)
           | seq(ornament, ornament)
           | nest(sort, [edge(sort, ornament)], ornament)
           | sum(left-name, ornament, right-name, ornament)
           | guard(ornament)
           | close(address, ornament)
           | sign(clause, ornament)
```

Plain reading:

- `datum` is one binding-scale mark.
- `hole` is a typed place not yet filled.
- `seq` puts two ornaments in an order.
- `nest` puts typed children inside the frame of their parent sort.
- `sum` keeps two operation families separate and sided.
- `guard` marks the suspension a recursive return crosses.
- `close` adds the addressed root cap.
- `sign` attaches a verdict, refusal, or trust claim.

### 4.2 Composition rules

**G1 — composition is semantic.** Every form carries a sort, edge, address,
clause, collection, or claim. A form with none is not admitted. Source: the
semantic-placement test already absorbed by `ORNAMENTATION.md` §6.5.

**G2 — sequence preserves order.** `seq(x, y)` may be laid out horizontally,
vertically, or wrapped into consecutive bands, but its leaf order remains
`x` then `y`. The list carrier and `wfFrom_append` license consecutive
decomposition; they do not license sorting. Source: `Word = List Binding`,
L69, and L130.

**G3 — regrouping is carrier-specific.** Consecutive word bands may be
visually bracketed differently only when their flattened ordered leaves are
identical. Signature-sum frames may not be regrouped at all. Source: list
append in the `Word` carrier versus the explicit failure of sum associativity
as an equation (L28).

**G4 — nesting follows constructor arity and edge order.** `nest` has exactly
the child slots of the constructor it renders. The first and second child are
not interchangeable. Source: `Tree.node` and `Tree.flatten`
(`Tree.lean:97-123,197-216`).

**G5 — repetition requires a collection.** A cadence may repeat for word
bindings, program lines, references, fields, or union members because those
are declared lists. A scalar address, status, or payload does not generate a
decorative repeat. Source: the carriers catalogued in `THE-ALGEBRA.md` §1.1.

**G6 — growth is accretive.** Appending a suffix adds marks only at the
frontier. Cached views may update their explicitly derived totals, but a
completed trunk row does not re-render. Source: L63, L68, the trunk's
ever-increasing addition, and the inherited completed-row rule
(`ORNAMENTATION.md` §3).

**G7 — sums retain injection and brackets.** `sum` always shows the left and
right names, and nested sums show nesting. No symmetry, flattening, or neutral
empty bay is inferred. Source: the definitions of `Sig.sum`, `Prog.inl`, and
`Prog.inr`, with L27-L28 recording the absent laws. The drawing makes no
claim that the owed semantic laws L21-L26 have landed.

**G8 — a recursive close requires a guard.** A returning schema edge can
close only inside `guard`. Without it, the line ends in `sign(unguardedCycle,
...)`. Source: `Document.Guarded` and `references_guarded_decidable`.

**G9 — a root close requires an address.** `close` takes a full address and is
drawn after its children. A provisional, running, or refused structure keeps
an open cap. Source: `Tree.address_spec`, `Tree.flatten`, and the execution
statuses in `THE-ALGEBRA.md` §1.1.

**G10 — motion renders spend, not structure.** Only a running computation's
fuel frontier moves. Trees, sums, addresses, and completed receipts do not
wiggle, pulse, or reflow. Source: fuel consumption L46-L47 and the inherited
motion rule (`ORNAMENTATION.md` §4.5).

### 4.3 Precedence

Keep the existing chain, now with meanings:

```text
foundation → datum → joint → cadence → sign → bloom → light/motion
Style         sort      edge     word       claim    root    boundary/spend
```

Later layers may qualify earlier ones but may not obscure them. A sign may
break a cadence at a refusal; it may not hide the binding's sort. A bloom may
close a root; it may not cover the address. Motion may show fuel being spent;
it may not rearrange the word.

---

## 5. Sort-to-shape consequences

This is the smallest shape vocabulary the current grammar earns. It avoids a
bespoke icon for every noun.

| Structural role | Current estate forms | Earned visual form | Source |
|---|---|---|---|
| Outer-grammar terminal | `value`, `chunk`, `schema`, `git` constructors have no store refs in grammar v0 | A datum cap with no inner inlet | `Tree.node`, `Tree.lean:100-123` |
| One-child wrapper | `leaf → chunk`, `manifest → tree`, `file → manifest` | One inlet flowing into one later cap | `Tree` constructors and `flatten`, `Tree.lean:64-79,203-210` |
| Ordered binary joint | `parent(left, right)` | A two-pronged joint with visibly stable left/right order | `Tree.parent`, `Tree.node`, `Tree.flatten` |
| Historical joint | `entry(item, prev)` | An asymmetric join: the item branch and previous-entry branch remain labelled | `Tree.entry`, `Tree.lean:81-84,212-214` |
| Genesis | `genesis` | A square starting stop, not a bloom | `Tree.genesis`, `Tree.lean:80,211` |
| Program cadence | `step` and `cont`; a continuation's edges are step nodes in order | Step ticks collected inside a continuation frame | `Sorts.lean:12-20`; program table and children-first encoding in `THE-ALGEBRA.md` §§1.1, 2.10-2.12 |
| Schema recursion, inside the schema payload | `reference` and `susp` | Named returning line crossing a suspension eye | `Guarded.lean` |
| Sort without a current `Tree` constructor | `context` | Generated default datum with its sort word; no invented special motif yet | `Ty` contains `context`, while the current constructors in `Tree.lean:59-91` do not |

The `schema` sort is terminal only in the **outer store grammar**: its payload
has no outer refs in v0. When a schema view opens that payload, its own
`reference`/`susp` structure earns the guarded-return motif. The two levels
must not be conflated.

---

## 6. Worked examples

The sketches show relations, not proposed pixel-perfect components.

### 6.1 A trunk row — Prairie Ledger plus a typed joint

An `entry` has an item and a previous entry. Both precede the new entry's own
binding. A new row adds at the frontier; earlier rows do not move.

```text
        item : file ─────┐
                         ├─ 0042  entry  [9b3e…71af]  verified-here  —
previous : entry ────────┘                                      ■
                                                                  frontier
```

The asymmetric fork is earned by `Tree.entry(item, prev)`. The square at the
right is the addressed binding, not a generic bullet. The long baseline is
Prairie Ledger PL-2: future additions continue to the right or downward
without changing row 0042. At close resolution the abbreviated chip expands
to the full address.

### 6.2 A view frame — Light Screen over a collection

The frame identifies the collection and the register. Its holes keep their
sorts even when no value fills them.

```text
┌ project-proof view ─ collection: changed *.lean ─ register: everyday ┐
│ proof        [schema]  7f20…04d1   verified-here                     │
│ explanation  [value ]  —           awaiting collection               │
│ source       [file  ]  b813…ee09   stale                              │
└ derived from trunk through #0187 ─ style @ 6c45…92aa ────────────────┘
```

The absent explanation is a typed `value` hole, not empty card furniture.
`stale` qualifies the source row rather than tinting the whole view. The frame
is a cached register over a named collection, as required by the trunk model;
its exact cache policy remains a per-view decision.

### 6.3 A receipt accent — children first, root last

The receipt shows the actual admission cadence. Its rails collect toward the
addressed root.

```text
01  chunk ──┐
02  tree  ──┤
03  chunk ──┤
04  tree  ──┤
05  tree  ──┤  parent
06  manifest┤
07  file  ──┴────────────── ◎ [4e8b…0c22]
             children first     admitted root
```

`◎` is the quiet terminal bloom, keyed by the full root address in the real
surface. If line 03 were a duplicate `put`, it would be a hollow side notch in
the operation receipt and would not receive a trunk sequence number, because
L92 says the word did not grow.

### 6.4 A guarded recursive schema — Taliesin return through a suspension

```text
          bare reference
      A ───────────────▶ B
      ▲                  │
      │       ┌ susp ┐   │
      └───────┤  ◌   ◀───┘
              └──────┘
```

The loop closes because the return crosses the suspension eye `◌`. This says
the non-suspend relation has no cycle: the recursive schema is constructible.
It does **not** say evaluation terminates, so the eye stays neutral ink and
does not receive a completion bloom.

### 6.5 A refusal mark — the unguarded line cannot close

```text
      A ───────────────▶ B
      ▲                  │
      │                  │
      └──────── × ───────┘  unguardedCycle
                   owed/refused hue
```

The broken return is the refusal. The saturated `×` is not sufficient alone;
the clause word travels with it. Insert a real `susp` in the schema and the
same composition may use the guarded-return form. This is a rendering of the
door's guardedness decision, not a generic error icon.

---

## 7. What does not map — taste stays taste

The following choices are authored. They may be tested for usability or
accessibility, but the algebra does not choose them.

1. **The family names and historical flavour.** "Prairie Ledger," "Light
   Screen," and "Taliesin Bloom" are evocative names, not estate theorems.
2. **Exact geometry.** Corner radius, stroke width, cap shape, branch angle,
   rosette petal count, and whether a joint is square or round are taste.
3. **Typeface and typographic scale.** The algebra earns tabular numerals and
   machine fields; it does not select a font family or modular scale.
4. **The verdict hue.** The existing rule governs where saturation is spent,
   and OkLCH makes contrast testable. It does not derive a hue from a law.
5. **Spacing and density constants.** Uniform rows and fixed gutters are ruled;
   their pixel measurements are authored and must be tested at the intended
   scale.
6. **Which collection deserves a view.** Collection is the front end, but the
   algebra does not decide what a person wants to watch or what deserves a
   whole screen.
7. **Cache policy.** A view is a cached register, but offloaded session state
   versus recalculation from new additions remains a per-view product choice.
8. **One glyph per sort.** The grammar earns role shapes—terminal, unary,
   binary, historical—not eleven tiny logos. Any richer icon set is authored.
9. **Sum regrouping.** There is no algebraic licence for it today. If a future
   signature-morphism theory supplies isomorphisms, the direction may gain a
   controlled visual equivalence; this draft does not pretend it already has
   one.
10. **Hash certainty.** The address system supports exact recomputation and a
    collision branch. It does not license a visual claim that SHA-256 is
    injective.
11. **Guarded completion.** Passing guardedness means a recursive document can
    be built. It does not mean it has a value or terminates when forced.
12. **Performance.** Ten million entries is the trunk's product target. The
    laws do not choose virtualization, batching, cache size, or frame budget.
13. **Motion timing.** Fuel earns a moving frontier; easing, duration, and
    reduced-motion treatment remain interaction design and accessibility work.

These are not embarrassments or gaps to hide. They are the authored residue
the original ornamentation direction asked us to name honestly.

---

## 8. Grilling questions

1. Are Prairie Ledger, Light Screen, and Taliesin Bloom the right allocation
   of word, typed boundary, and earned closure, or should the names remain
   looser than these structural roles?
2. Is the rule "one primary cadence mark per actual binding" strict enough,
   especially when a program line performs a duplicate put and the word does
   not grow?
3. Should the sort-to-shape vocabulary stop at structural roles, as proposed,
   or does any existing sort earn a unique mark beyond its word and tag?
4. Is preserving the parentheses of every signature sum desirable at the
   everyday register, or only at protocol resolution?
5. Does the suspension eye belong only in schema-detail views, or should an
   everyday refusal be allowed to teach the same guardedness rule?
6. Is the terminal bloom too celebratory even in ink, given the existing
   position that certainty is quiet?
7. May the prefix stop ship visually before FE-O7 is proved, if it carries an
   explicit `owed` sign, or must fork ornament wait for the theorem?
8. Which first real consumer should force this grammar into the single
   addressable `Style` carrier: the trunk row, the receipt, or the generated
   schema viewer?

Until those questions are grilled, this file is a direction: precise enough
to draw from, honest enough not to confuse taste with law, and deliberately
short of minting a second presentation language.
