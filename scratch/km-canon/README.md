# `scratch/km-canon` — the estate canonical JSON reference

Scratch demonstrations for **format 2** of
`packages/plait/fixtures/kernel-conformance.ndjson`. Wired into nothing,
imported by nothing, run by no gate. Nothing here writes a file.

The normative specification is
[`docs/design/2026-08-18-km-conformance-schema.md`](../../docs/design/2026-08-18-km-conformance-schema.md).
These programs exist so that document's byte-exact claims have a
machine-checked origin, and so that a disagreement between the Lean,
TypeScript, and Go implementations has a fourth opinion to break it
rather than being settled by majority.

Python, standard library only. The serializer was written from the prose
specification and from nothing else — no Lean, TypeScript, or Go source
was consulted while writing it. That independence is the point: it makes
this a worked example of the schema's "fourth consumer" (§8.3), and it
means the ten canon vectors have a derivation that does not run through
any of the three bound implementations.

## The three programs

| File | What it does |
|---|---|
| `canon_vectors.py` | Implements estate canonical JSON (RFC 8785 escaping and member sort; unbounded non-negative integers instead of JCS's doubles). Constructs the ten canon vectors natively **from §3 of the document**, prints their bytes and their full records, and self-checks the both-ways law, the refusal of fractions and negatives, and the 2^53 + 1 precision claim. Also prints the four **gap vectors** of §3.1 — values the ten do not reach, which are not canon vectors and appear in no corpus. |
| `check_doc.py` | Reads the committed corpus and the schema document and asserts that every byte-exact block the document quotes is the corpus's own bytes, that every count and size it states is the corpus's own, and — the load-bearing check — that the ten lines `canon_vectors.py` derives from §3 are byte-identical to the corpus's canon group. Also checks the trailing-space rule (R12), the transliteration (R9), the doc/type index alignment (R13), and the **program group** of §2.7 (see below). |
| `recanonicalize_v1.py` | Reads the committed corpus read-only and prints the canonical form of one record per group, plus the header line implied by the group counts. Source of the "(from the corpus)" examples in §2.2. Written when the committed corpus was format 1, to demonstrate the migration argument of §7.1; it now reports the same fixed-point property over the format-2 file. |

## Running them

```sh
cd scratch/km-canon
python canon_vectors.py       # the ten vectors + self-checks + the gap vectors
python check_doc.py           # document, reference, and corpus all agree
python recanonicalize_v1.py   # one record per group, canonicalized
```

Each exits nonzero on any failure and prints a `failures: N` line last.

## The program group, and the three-state output

`check_doc.py` prints three verdicts, not two:

| Verdict | Meaning |
|---|---|
| `PASS` | The check ran and held. |
| `FAIL` | The check ran and did not hold. Counts toward `failures: N`. |
| `WAIT` | The check could not run because the thing it checks is not in the tree yet. Counts toward nothing, and says so on the line. |

`WAIT` exists for the **program group** (§2.7 of the document), which is
add-only: it may or may not be in the corpus a given tree carries. A
checker that printed `PASS` over a group that is not there would be
green by silence, and one that printed `FAIL` would redden the tree for
a state the versioning rule explicitly permits. So the group's checks
announce themselves as waiting, by name, when it is absent, and run for
real when it is present. The same three-state treatment covers the
corpus size: the 117-line, 22632-byte figures the document quotes are
labelled as measurements taken at format 2's minting, and once the
corpus grows past them the checker says so on a `WAIT` line rather than
reddening.

**The group has landed** — four vectors, `ground-two-node`, `holey`,
`holey-filled`, `distill-shape` — so those checks run. What they cover:
the four record keys, the four declaration members, the
`bytes`-equals-canonicalize-`declaration` self-test, the newest-first
node order, unique node names, `args` keys as a *subset* of the
generator's fields, the four argref tags and their member sets, hole
references resolving to declared holes, `holes` ascending, the
edge-equals-consumptions rule, and the documented edge *order*. It also
requires the document to quote all four records verbatim, the same way
it already requires the header line — that is the reconciliation
pressure: the document cannot keep describing a corpus it has drifted
from.

**The validator ships with a control arm**, so a green run is evidence
rather than an assertion. It takes a lawful declaration — the corpus's
own `distill-shape` when the group is present, one built here from the
§2.7.1 grammar when it is not — applies one mutation at a time, and
requires each to be refused *for its own named reason*:

| Mutation | Caught by |
|---|---|
| a dropped edge | the edge rule alone |
| a reversed edge | the edge rule alone |
| nodes reordered oldest-first | the newest-first index condition |
| a duplicated node name | name uniqueness |
| an unknown argref tag | the argref form list |
| a stray `args` key | the field-name subset rule |
| an unknown digest kind | the closed `DeclKind` list |
| holes out of ascending order | the hole order rule |
| a hole used but not declared | hole resolution |

The two edge mutations are the whole argument for writing the
consumption relation down twice: nothing else in the declaration
notices them. And because the subset rule is a genuine *relaxation*, it
gets a positive control too — dropping a field from `args` must **not**
be a finding, and the arm asserts that as well, so the leniency is
deliberate rather than a hole in the checker.

## The loop these close

```
§3 of the document
      │  written from, and nothing else
      ▼
canon_vectors.py  ──derives──▶  ten canon lines
                                      │
                        check_doc.py  │  byte-compare
                                      ▼
                        the corpus's canon group
                                      ▲
                                      │  emitted by
                             verify/unity, and read
                             back by packages/plait
                             and go/kmconform
```

A break anywhere in that loop shows up as a failing line in
`check_doc.py` rather than as a document that quietly stopped describing
the file.

## What "agreement" means at integration

Each of the three bound implementations must, independently:

1. **Construct** the ten canon values in its own language — not parse
   them out of the corpus — canonicalize them, and match the ten `bytes`
   strings `canon_vectors.py` prints.
2. Satisfy the **both-ways law**: parse the whole corpus, re-emit
   canonically, and reproduce the input file byte for byte.

All three do. Step 1 is the half a parse-reemit test cannot reach,
because the corpus already contains sorted members and normalized
escapes. The `key-order` vector in particular is only discriminating at
construction time.

The ten are the **cross-language floor**, not a ceiling. §3.1 names four
things they do not reach; a consumer closes those with native vectors of
its own, binding nobody else. `canon_vectors.py` prints the four so this
reference makes the same coverage claim the document does and no larger
one.

See §8 of the schema document for the full plan and the per-consumer
checklist.
