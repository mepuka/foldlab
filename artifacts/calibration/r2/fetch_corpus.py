# Rebuilds the R2 corpus from MathArena via the HuggingFace
# datasets-server and verifies the pinned digest. The corpus is never
# committed (competition-owned problem text); this script + the digest
# ARE the corpus reference. Law: the rebuilt bytes must hash to the
# pinned value or the verifier refuses everything downstream.
import hashlib
import json
import re
import urllib.request

PINNED_SHA256 = "8ce15a57d0d8a6b8bba1efb7f04ceeb64358a8d2e8227c6651d90af8c9fae5f2"
SOURCES = ["aime_2026", "hmmt_nov_2025", "hmmt_feb_2026"]
API = "https://datasets-server.huggingface.co/rows?dataset=MathArena%2F{src}&config=default&split=train&offset=0&length=100"

corpus = []
for src in SOURCES:
    with urllib.request.urlopen(API.format(src=src)) as r:
        d = json.load(r)
    for row in d["rows"]:
        row = row["row"]
        a = str(row["answer"])
        if re.fullmatch(r"-?\d+", a):
            corpus.append(
                {
                    "id": f"{src}-{row['problem_idx']}",
                    "source": src,
                    "problem": row["problem"],
                    "answer": a,
                }
            )
corpus.sort(key=lambda c: c["id"])
blob = json.dumps(
    corpus, sort_keys=True, separators=(",", ":"), ensure_ascii=False
).encode("utf-8")
digest = hashlib.sha256(blob).hexdigest()
if digest != PINNED_SHA256:
    raise SystemExit(f"corpus digest MISMATCH: {digest} != pinned {PINNED_SHA256}")
with open("corpus.json", "wb") as f:
    f.write(blob)
print(f"corpus.json rebuilt and verified: {len(corpus)} questions, sha256 {digest}")
