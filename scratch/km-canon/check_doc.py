#!/usr/bin/env python3
"""Cross-check the schema document against the reference and the corpus.

Scratch demonstration, wired into nothing, not a gate. It asserts three
things about docs/design/2026-08-18-km-conformance-schema.md:

  1. Every byte-exact JSON block the document quotes is the committed
     corpus's own bytes -- not a hand transcription that drifted.
  2. Every count and size the document states matches the corpus file,
     recounted here rather than trusted.
  3. The ten canon lines that canon_vectors.py derives from section 3 of
     the document alone are byte-identical to the corpus's canon group.
     This is the load-bearing one: it closes the loop between the prose
     specification, an independent implementation of it, and the file
     three other implementations agree on.

Nothing here reads Lean, TypeScript, or Go source. Run:  python check_doc.py
"""

from __future__ import annotations

import io
import json
import os
import sys

from canon_vectors import VECTORS, canonicalize

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
DOC = os.path.join(ROOT, "docs", "design",
                   "2026-08-18-km-conformance-schema.md")
CORPUS = os.path.join(ROOT, "packages", "plait", "fixtures",
                      "kernel-conformance.ndjson")

GROUPS = ["kind", "stage", "refusal", "type", "encoding", "admission",
          "doc", "canon"]

fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    if not ok:
        fails += 1
    print("%-56s %s %s" % (label, "PASS" if ok else "FAIL", detail))


def main() -> int:
    doc = io.open(DOC, encoding="utf-8").read()

    # ----------------------------------------------------------------
    # The corpus, read as bytes first so the file-level rules are
    # checked rather than assumed.
    # ----------------------------------------------------------------
    raw = open(CORPUS, "rb").read()
    check("corpus has no CR byte", b"\r" not in raw)
    check("corpus is ASCII", max(raw) <= 0x7F)
    check("corpus ends with exactly one LF",
          raw.endswith(b"\n") and not raw.endswith(b"\n\n"))

    text = raw.decode("ascii")
    lines = text.split("\n")[:-1]
    check("corpus has no empty line", all(line for line in lines))

    n_lines = len(lines)
    n_bytes = len(raw)
    check("corpus line count is 117", n_lines == 117, str(n_lines))
    check("corpus byte count is 22632", n_bytes == 22632, str(n_bytes))
    check("doc states the 117-line total", "117 lines" in doc)
    check("doc states the 22632-byte size", "22632" in doc)

    records = [json.loads(line) for line in lines]
    header, body = records[0], records[1:]

    group: dict[str, list] = {}
    for record in body:
        group.setdefault(record["record"], []).append(record)

    # ----------------------------------------------------------------
    # 1. Every line is already canonical -- the per-line half of the
    #    both-ways law, run by this reference over the real file.
    # ----------------------------------------------------------------
    moved = [i + 1 for i, line in enumerate(lines)
             if canonicalize(json.loads(line)) != line]
    check("every corpus line is canonical", not moved, str(moved[:5]))

    # ----------------------------------------------------------------
    # 2. THE LOOP: section 3 -> canon_vectors.py -> the corpus.
    # ----------------------------------------------------------------
    derived = [
        canonicalize({"bytes": canonicalize(value), "name": name,
                      "record": "canon", "value": value})
        for name, value in VECTORS
    ]
    emitted = [canonicalize(record) for record in group["canon"]]
    for want, got in zip(derived, emitted):
        name = json.loads(want)["name"]
        check("derived canon line matches the corpus: %s" % name, want == got,
              "" if want == got else "\n  derived %s\n  corpus  %s" % (want, got))
    check("the derived ten and the corpus ten are equal as a block",
          derived == emitted)
    check("doc carries the ten canon lines as one ordered block",
          "\n".join(emitted) in doc)

    # ----------------------------------------------------------------
    # 3. The header line, quoted verbatim, and the counts it declares.
    # ----------------------------------------------------------------
    check("doc carries the corpus header line verbatim",
          canonicalize(header) in doc)
    check("header counts name exactly the eight groups",
          sorted(header["counts"]) == sorted(GROUPS))
    for name in GROUPS:
        present = len(group.get(name, []))
        check("header count for %s equals the records present" % name,
              header["counts"].get(name) == present, str(present))
    declared = sum(header["counts"].values())
    check("lines == 1 + sum(counts)", n_lines == declared + 1)

    # ----------------------------------------------------------------
    # 4. Every "(from the corpus)" example really is from the corpus.
    # ----------------------------------------------------------------
    for name in ["kind", "stage", "refusal", "encoding"]:
        check("doc carries the canonical first %s record" % name,
              canonicalize(group[name][0]) in doc)
    refused = group["admission"][0]
    admitted = next(r for r in group["admission"] if r["verdict"] == "admitted")
    check("doc carries the canonical refused-admission record",
          canonicalize(refused) in doc)
    check("doc carries the canonical admitted-admission record",
          canonicalize(admitted) in doc)
    act = next(r for r in group["type"] if r["name"] == "Act")
    fold = next(c for c in act["constructors"] if c["name"] == "fold")
    check("doc carries the canonical Act.fold constructor",
          canonicalize(fold) in doc)

    # The two doc-group examples, trailing space and all. A document that
    # trimmed them would look right and be wrong.
    for name in ["LanePartition", "Position"]:
        record = next(r for r in group["doc"] if r["name"] == name)
        check("doc carries the %s doc record verbatim" % name,
              canonicalize(record) in doc)

    # ----------------------------------------------------------------
    # 5. R12: leading whitespace trimmed, one trailing space preserved.
    # ----------------------------------------------------------------
    docs = group["doc"]
    check("every doc record ends with one trailing space",
          all(r["doc"].endswith(" ") and not r["doc"].endswith("  ")
              for r in docs))
    check("no doc record has leading whitespace",
          all(r["doc"] == r["doc"].lstrip() for r in docs))
    check("doc states the trailing-space rule",
          "trailing space" in doc)

    # ----------------------------------------------------------------
    # 6. R13: one doc record per closed-list type, index-aligned.
    # ----------------------------------------------------------------
    check("counts.doc equals counts.type", len(docs) == len(group["type"]))
    check("doc names are the type names, in the same order",
          [r["name"] for r in docs] == [r["name"] for r in group["type"]])
    check("doc states refuse-not-skip", "refuses" in doc and "skip" in doc)

    # ----------------------------------------------------------------
    # 7. R9: the transliteration, visible in the corpus as "--".
    # ----------------------------------------------------------------
    check("no em dash survives into the corpus", "—" not in text)
    dashed = [r["name"] for r in docs if "--" in r["doc"]]
    check("five doc records carry the transliterated dash",
          len(dashed) == 5, str(dashed))
    for name in dashed:
        check("doc names transliterated type %s" % name, "`%s`" % name in doc)

    # ----------------------------------------------------------------
    # 8. Closed lists and counts the document asserts in prose.
    # ----------------------------------------------------------------
    machine = [r["reason"] for r in group["refusal"]
               if r["applicability"] == "machine-applicable"]
    check("exactly four machine-applicable rows", len(machine) == 4,
          str(machine))
    for name in machine:
        check("doc names machine-applicable %s" % name, "`%s`" % name in doc)
    for record in group["encoding"]:
        check("doc names encoding vector %s" % record["name"],
              "`%s`" % record["name"] in doc)
    for record in group["canon"]:
        check("doc names canon vector %s" % record["name"],
              "`%s`" % record["name"] in doc)
    check("lawful-declare act equals the admitted encoding",
          next(r for r in group["encoding"]
               if r["name"] == "lawful-declare")["act"] == admitted["encoded"])

    # ----------------------------------------------------------------
    # 9. No stale text: format-1 language, and the two canon spellings
    #    the emission overruled.
    # ----------------------------------------------------------------
    banned = [
        ("schema, v1", "format-1 title"),
        ("Key order is fixed and is NOT alphabetical", "format-1 key rule"),
        ('"format":1', "format-1 header"),
        ("quote \\\" backslash", "the draft string-escapes spelling"),
        ("control\\u0001char\",\"name\":\"control-char", "the draft control-char record"),
        ("39-character", "the draft string-escapes length"),
        ("12-character text", "the draft control-char length"),
        ("CandidateF13", "a name from another lane"),
        ("ComposedExecution", "a name from another lane"),
    ]
    for needle, why in banned:
        check("doc free of %s" % why, needle not in doc)

    print()
    print("failures: %d" % fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
