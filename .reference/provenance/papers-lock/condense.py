"""Condense liteparse transcripts into per-paper identity evidence.

For each parsed document, emit one JSON record carrying only what the file
itself states: the opening text, and any arXiv identifier, DOI, or ISBN found
in it. Nothing is inferred here; classification happens downstream against
this evidence.
"""

import json
import re
import sys
from pathlib import Path

ARXIV = re.compile(r"arXiv[:\s]\s*([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)", re.I)
ARXIV_OLD = re.compile(r"arXiv[:\s]\s*([a-zA-Z\-]+(?:\.[A-Z]{2})?/[0-9]{7}(?:v[0-9]+)?)", re.I)
DOI = re.compile(r"\b(10\.[0-9]{4,9}/[-._;()/:A-Za-z0-9]+)")
ISBN = re.compile(r"ISBN[:\s]*([0-9\-]{10,17})", re.I)


def walk_text(node, out):
    """Collect text from whatever shape the transcript uses."""
    if isinstance(node, str):
        out.append(node)
    elif isinstance(node, dict):
        for key in ("text", "content", "value", "markdown"):
            if isinstance(node.get(key), str):
                out.append(node[key])
        for key, value in node.items():
            if key not in ("text", "content", "value", "markdown"):
                walk_text(value, out)
    elif isinstance(node, list):
        for item in node:
            walk_text(item, out)


def main(directory):
    for path in sorted(Path(directory).glob("*.json")):
        try:
            doc = json.loads(path.read_text(encoding="utf-8", errors="replace"))
        except Exception as exc:
            print(json.dumps({"file": path.name, "error": str(exc)}))
            continue

        chunks = []
        walk_text(doc, chunks)
        text = " ".join(" ".join(chunks).split())

        record = {
            "stem": path.stem,
            "arxiv": sorted(set(ARXIV.findall(text) + ARXIV_OLD.findall(text)))[:3],
            "doi": sorted({d.rstrip(".,);") for d in DOI.findall(text)})[:3],
            "isbn": sorted(set(ISBN.findall(text)))[:2],
            "head": text[:700],
        }
        print(json.dumps(record, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1])
