# Provenance — HILBERT engagement session, 2026-08-29

**C6 status: EXPLICITLY PENDING.** No source consulted in this session is
resolved into `.reference/provenance/`. Nothing produced here is gated work,
and no assertion in these notes or in the published artifact carries a claim
stamp. This file is the explicit pending mark C6 requires.

## Source 1 — the paper (primary, bytes held)

| | |
|---|---|
| Title | HILBERT: Recursively Building Formal Proofs with Informal Reasoning |
| Authors | Varambally, Voice, Sun, Chen, Yu, Ye — UC San Diego / Apple |
| Venue | ICLR 2026 (published conference paper) |
| URL | https://proceedings.iclr.cc/paper_files/paper/2026/file/41b95e8ee0e054dab145a7564d9cd58a-Paper-Conference.pdf |
| Code | https://github.com/Rose-STL-Lab/ml-hilbert |
| Retrieved | 2026-08-29 |
| Bytes | 2037010 |
| sha256 | `3350c6e2cd201eaf788eb281f9e06cea47592a9b95c955414a6ac5c76e4c47d9` |

The digest is of the bytes actually read this session, so every quotation and
figure reference is independently re-verifiable against it.

**Copy location: SCRATCHPAD ONLY**, deliberately outside the repository. The
`.gitignore` policy note is explicit that the public repo must not redistribute
publisher-copyrighted documents; the paper was therefore never written into the
tree, not even under `.reference/papers/`.

**Extraction tool.** `liteparse` 2.0.0 (`npm:@llamaindex/liteparse`), which
[TOOLS.md](../../docs/lab-core/TOOLS.md) line 58 carries under **pending
admission — evidence preparation only, not gated work**. That standing is
sufficient here for the same reason it is sufficient for the paper-lock
corpus: this is evidence, not gated work. Page images for Figures 1 and 2 were
rendered from the same bytes and read directly, so figure claims do not rest on
text extraction.

**Not pinned.** The paper is absent from `.reference/catalog/REFERENCES.md` and
from `papers.lock.json`. Pinning it would mean holding the PDF under
`.reference/papers/` and regenerating the lock through the declared procedure
in `README-papers.md` — a generated file that is never hand-edited. That was
not done and is not proposed here.

## Source 2 — the essay (secondary, WEAKER EVIDENCE — read this)

| | |
|---|---|
| Title | As Rocks May Think |
| Author | Eric Jang |
| URL | https://evjang.com/2026/02/04/rocks.html |
| Retrieved | 2026-08-29 |
| Digest | NONE — no bytes were retained |

**The raw text was never read.** The fetch returned a *model-generated
reconstruction* of the essay, not the source. Every quoted coinage
("prospecting for lucky circuits", "ambient thinkers", "rules-based rewards")
and every attributed argument rests on that reconstruction and could be
paraphrase, compression, or error. Treat as hearsay about a real document.
Nothing built on it should advance past conversation without re-reading the
source directly.

## What was produced, and its grade

- Six pre-read notes and one post-read note in this directory — pre-grade,
  gitignored, no grade claimed.
- One published artifact (private): "The Owed Column". Conception mode (C3).
  It carries this same pending mark in its footer.
- No repository code was read-modified, no build was run, no commit was made.
  `formal/` and `library/` were read-only for the whole session.

## Standing caveat on the design proposals

Everything proposed — `HoleSig`, the `owed` code point, `cas_sketch`/`cas_close`,
`inferAt`, the verdict axes — is conception-mode sketching. The load-bearing
unknown is canonical spelling for `Prop`; without it the addressing story does
not exist. The named pending obligations are recorded in the artifact and are
pending, not owed-and-forgotten.
