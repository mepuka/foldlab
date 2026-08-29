# CAS UI — history from history

Exploration-grade. `.staging/` is pre-grade: nothing here is minted, claimed,
or gated, and no gate stamp G0–G6 attaches to anything below. The prototype
lives beside this note in `.staging/explore/cas-ui/`.

## What was built

A working view over the store's own conformance vectors
(`library/cas/vectors/*.json`, 7 words, read unmodified — no invented data).
Two panes: a log of one word on the left, the selected node's registers and
histories on the right. Keyboard: `j`/`k` move, `1`/`2`/`3` switch history,
`r` cycles register.

## Finding 1 — the two histories are one relation

Git separates *what a commit contains* (tree) from *what came before* (parent).
They are different pointer kinds with different tooling.

In this store they are the same kind of edge. The `entry` sort (tag 12) carries
no payload at all; its refs are the whole commit — one to content, one to the
parent. So `entry → file` and `entry → entry` are both just typed refs.

The consequence is that one indented structure renders both at once:

    entry    commit
      file       notes.txt · text/plain
        manifest   recipe 1 · 31 bytes · 1 leaf
          tree       leaf 0 · 31 bytes
            chunk      "children first, admission order"
      entry    commit          ← the parent, in the same tree
        ...
        entry    genesis

Content strata and commit lineage in a single walk. This is the concrete
reading of "a unified history from history view": it is not two views fused by
the UI, it is one relation the store already had.

## Finding 2 — three histories, one word

Every word projects three histories, and the view switches between them
without changing the data:

| View | Order | Question it answers |
|---|---|---|
| Admission | word index | when did this enter |
| Structure | ref closure, children-first | what is it made of |
| Journal | `entry` → `entry` chain | what came before |

`Word.lean` states the first as semantics, not convenience: *"the order IS
semantics"*, and *"a serialized word is a replayable admission history, which
is exactly what a conformance vector is."*

## Finding 3 — word vs store, made visible

`Word := List Binding` (history) and `Store := Addr32 → Option Node` (present)
differ exactly where an address is bound twice. `Word.find` is first-binding,
so the later binding is inert.

The `shared-chunk` vector is the minimal witness: **5 bindings, 4 nodes, 1
dedup**. The view renders the repeated binding dimmed with a hollow spine dot
and the tag `inert · already bound`, and the panel says, from data:

> Shared: 2 nodes reference this one. The word records 2 binding(s); the store
> holds one.

That single sentence is the history/present distinction stated over a real
entity, which is what the register goal needs.

## Finding 4 — registers are structure-invariant

Four reading levels — `identity`, `sort`, `decoded`, `bytes`. Switching them
changes only how a payload renders. The spine, the sorts, the typed edges, the
dedup marker and the selection all hold position.

This is why register-switching is usable for cross-register reasoning: a reader
moved from bytes to meaning does not lose their place. The invariant is the
structure; the variable is the reading. Two people at different levels can point
at the same row.

## Finding 5 — nothing is opaque; the ADT paid for it

Initially every non-`chunk` payload rendered as "N opaque bytes". They are not
opaque — the grammar gives each sort a layout, recovered by reading the vectors:

| Sort | Payload | Reading |
|---|---|---|
| `chunk` / `value` | raw | text when printable |
| `tree` | `u32 leafIndex, u32 byteLength` | `leaf 0 · 31 bytes` |
| `tree` (interior) | empty | joins child trees |
| `manifest` | `u32 recipe, u64 totalBytes, u32 leaves` | `recipe 1 · 32 bytes · 2 leaves` |
| `file` | length-prefixed strings | `notes.txt · text/plain` |
| `entry` | empty | `commit` / `genesis`; refs are the content |

`31` is the byte length of `"children first, admission order"`; the store's own
test data documents the store. Legibility here came from one total function
over the sort sum — case analysis on an ADT, nothing cleverer.

## Design references, as applied

- **Git** — the spine, fixed columns, short hashes, one row per event, constant
  vertical rhythm. Borrowed for stable presence: the log looks the same whatever
  it holds.
- **Unison** — names over hashes. The decoded reading is the foreground; the
  address is present but secondary and always reachable. Hashes never shout.

## What was deliberately not done

- **No xterm.js.** The visual language was the open question; the rendering
  surface is downstream of it. A terminal would have fixed the surface before
  the grammar of the view was known.
- **No foldkit.** Introducing it now would confound the aesthetic question with
  the framework question. The view's state is already `(word, view, register,
  selection)` — a Model in all but name, so the port is available when the
  aesthetics are settled.
- **Nothing minted, no vocabulary proposed, no claim made.**

## Open questions

1. **Scale.** Longest corpus word is 11 bindings; the live store holds 24
   objects and `cas-surface.json` describes 952 declarations. The log is an
   unvirtualized list and is untested past ~100 rows.
2. **Journal coverage.** Only one vector carries `entry` nodes (three of them).
   The chain view is under-exercised.
3. **`context` and `schema` sorts** have no corpus instance with real edges, so
   their readings are unexercised.
4. **Direction law.** This view only reads, so it does not cross
   hoover / execute / materialize. A write surface would, and would need a
   ruling first.
5. **Which store.** The view reads vectors. Pointing it at a live store means
   choosing a source: the MCP verbs (`cas_load`, `cas_list_roots`) are the
   obvious surface, and are themselves emitted from Lean.

## Provenance

External material referenced but **not admitted** to
[TOOLS.md](../../docs/lab-core/TOOLS.md); versions are observations resolved
2026-08-29, not pins:

- `@xterm/xterm` 6.0.0, MIT, zero dependencies (unused so far)
- `foldkit` 0.154.0, MIT, peer `effect: 4.0.0-rc.112` (unused so far)

Note the estate's Effect pin is not uniform: `library/effects` is at
`4.0.0-rc.111`, `experiments/lift-harness` at `4.0.0-rc.112`.
