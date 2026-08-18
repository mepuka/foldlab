#!/usr/bin/env python3
"""Show what a corpus record looks like once re-serialized canonically.

Scratch demonstration, wired into nothing. It reads the committed corpus
read-only and prints one canonically-serialized record per group, plus the
format-2 header line implied by the group counts. The point was to source
the byte-exact examples in the schema document from the real corpus rather
than from a hand-typed guess.

Written against the format-1 corpus, while that was the committed one, to
show that canonicalization is a fixed point over it -- the migration
argument of section 7.1. The committed corpus is now the format-2
emission, so the same run reports the same property over 117 records
rather than 85. The property is the point; the count is whatever file the
script is pointed at.

It writes nothing. Run:  python recanonicalize_v1.py
"""

from __future__ import annotations

import json
import os
import sys

from canon_vectors import canonicalize

CORPUS = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "packages", "plait", "fixtures", "kernel-conformance.ndjson",
)

# Format-2 group order. v1 carries the first six; doc and canon arrived
# with the bump, program arrived after it under the add-only rule.
V2_GROUPS = ["kind", "stage", "refusal", "type", "encoding", "admission",
             "doc", "canon", "program"]


def main() -> int:
    raw = open(CORPUS, "rb").read()
    if b"\r" in raw:
        print("FAIL: CR byte in corpus")
        return 1
    lines = raw.decode("ascii").split("\n")
    if lines[-1] != "":
        print("FAIL: corpus does not end with LF")
        return 1
    lines = lines[:-1]

    records = [json.loads(l) for l in lines]
    header = records[0]
    body = records[1:]

    counts: dict[str, int] = {}
    for r in body:
        counts[r["record"]] = counts.get(r["record"], 0) + 1

    print("corpus at format %s: %d lines, %d body records"
          % (header.get("format"), len(lines), len(body)))
    print("header counts:            %s" % json.dumps(header["counts"]))
    print("recounted from the body:  %s"
          % json.dumps({g: counts.get(g, 0) for g in V2_GROUPS if g in counts}))
    agree = all(header["counts"].get(g) == counts.get(g) for g in counts)
    print("counts agree: %s" % ("PASS" if agree else "FAIL"))
    print()

    v2_counts = dict(counts)
    v2_counts["doc"] = 22    # every closed-list type carries a docstring
    v2_counts["canon"] = 10  # the ten canon vectors
    v2_header = {
        "counts": v2_counts,
        "format": 2,
        "generator": "verify/unity emit",
        "record": "header",
        "source": "verify/kernel",
    }
    total = 1 + sum(v2_counts.values())
    print("the format-2 header line implied by those counts (%d lines total):"
          % total)
    print(canonicalize(v2_header))
    print()

    print("one record per v1 group, re-serialized canonically")
    print("-" * 78)
    for group in V2_GROUPS:
        first = next((r for r in body if r["record"] == group), None)
        if first is None:
            print("%-10s (new in format 2, no v1 exemplar)" % group)
            continue
        line = canonicalize(first)
        print("%-10s %s" % (group, line if len(line) <= 300
                            else line[:297] + "..."))
    print()

    # The admission group has two shapes; show the admitted one too.
    admitted = next(r for r in body
                    if r["record"] == "admission" and r["verdict"] == "admitted")
    print("admission, admitted shape:")
    print(canonicalize(admitted))
    print()

    # The both-ways law over the whole v1 body: parse, canonicalize, parse
    # again, canonicalize again -- the second pass must be a fixed point.
    once = [canonicalize(r) for r in records]
    twice = [canonicalize(json.loads(l)) for l in once]
    print("canonicalization is a fixed point over all %d records: %s"
          % (len(records), "PASS" if once == twice else "FAIL"))

    # ASCII, still, after canonicalization.
    nonascii = [l for l in once if any(ord(c) > 0x7F for c in l)]
    print("all canonicalized records are ASCII: %s"
          % ("PASS" if not nonascii else "FAIL (%d lines)" % len(nonascii)))

    return 0 if (agree and once == twice and not nonascii) else 1


if __name__ == "__main__":
    sys.exit(main())
