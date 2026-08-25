# Local papers

This directory holds the local copies of the reference corpus. The PDFs are
gitignored — the repository must not redistribute publisher-copyrighted
documents — so on a fresh checkout this README is the only file here.

The corpus is therefore **not** part of the repository; it is per-host
evidence. What the repository carries instead is enough to rebuild and verify
it:

- [`../provenance/papers.lock.json`](../provenance/papers.lock.json) — one
  entry per paper: expected filename, byte length, SHA-256 digest, and the
  arXiv identifier or DOI the document prints, where it prints one.
- [`../catalog/PAPERS.md`](../catalog/PAPERS.md) — what each cluster of
  sources may be used for, and what it may not.

## Repopulating

Fetch each paper from its recorded identifier into this directory under the
filename the lock names, then verify every file against the lock before citing
anything from it:

```sh
python - <<'PY'
import hashlib, json, pathlib
lock = json.load(open(".reference/provenance/papers.lock.json"))
for paper in lock["papers"]:
    path = pathlib.Path(paper["path"])
    if not path.exists():
        print(f"missing  {path.name}")
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    state = "ok" if digest == paper["content"]["digest"] else "DIGEST MISMATCH"
    print(f"{state:15} {path.name}")
PY
```

Thirty-eight of the eighty-eight entries carry no public identifier: the
document prints neither an arXiv number nor a DOI, so the digest is the whole
of that source's identity and the file cannot be re-fetched from the lock
alone. Those are recoverable only from a host that already holds them.

A file added here does not enter the catalog by being present. It enters when
the generator assigns it a cluster, which is also the only way the lock will
accept it — see
[../provenance/README-papers.md](../provenance/README-papers.md).
