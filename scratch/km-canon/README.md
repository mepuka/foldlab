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
| `check_doc.py` | Reads the committed corpus and the schema document and asserts that every byte-exact block the document quotes is the corpus's own bytes, that every count and size it states is the corpus's own, and — the load-bearing check — that the ten lines `canon_vectors.py` derives from §3 are byte-identical to the corpus's canon group. Also checks the trailing-space rule (R12), the transliteration (R9), and the doc/type index alignment (R13). |
| `recanonicalize_v1.py` | Reads the committed corpus read-only and prints the canonical form of one record per group, plus the header line implied by the group counts. Source of the "(from the corpus)" examples in §2.2. Written when the committed corpus was format 1, to demonstrate the migration argument of §7.1; it now reports the same fixed-point property over the format-2 file. |

## Running them

```sh
cd scratch/km-canon
python canon_vectors.py       # the ten vectors + self-checks + the gap vectors
python check_doc.py           # document, reference, and corpus all agree
python recanonicalize_v1.py   # one record per group, canonicalized
```

Each exits nonzero on any failure and prints a `failures: N` line last.

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
