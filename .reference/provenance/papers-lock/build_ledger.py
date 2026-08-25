"""Generate the paper lock and the catalog index from extracted evidence.

Inputs are evidence files produced by the extraction pass: file digests, the
identifiers liteparse found in each document, and the title as printed on the
document. Cluster assignment and role boundaries are the human judgment this
script renders; it never invents an identifier. A paper with no assigned
cluster, or a cluster with no assigned paper, is an error rather than a
silent omission.
"""

import json
import re
import sys
from pathlib import Path

# DOI strings some publishers leave as template placeholders in preprints.
PLACEHOLDER_DOI = re.compile(r"0000000|nnnnnnn|XXXXXXX", re.I)

CLUSTERS = [
    (
        "normative-standard",
        "Normative standard",
        "The algorithm definition itself: state diagrams, step mappings, padding, and the parameter sets. A behavior requirement about SHA-3 may be owned here.",
        "Nothing about any implementation's correctness, performance, or security in deployment.",
        ["nist-2015-fips202-sha3-standard"],
    ),
    (
        "hash-mechanization",
        "Mechanized hash functions and their assurance record",
        "Prior mechanizations of hash primitives in proof assistants — what was stated, at which layer, and against which carrier — plus the record of what mechanization has failed to catch.",
        "Transfer of any of these theorems to this estate's definitions; each is a theorem about its own model and toolchain.",
        [
            "almeida-2019-sha3-sponge-easycrypt",
            "doussot-2024-lean4-sha3",
            "appel-2015-sha256-verification",
            "beringer-2015-openssl-hmac",
            "borrione-toma-2003-sha-formalization-acl2",
            "toma-borrione-2004-sha1-acl2-slides",
            "mouha-celi-2023-sha3-vulnerability",
            "kobeissi-2026-verification-theatre",
        ],
    ),
    (
        "canonical-hashing",
        "Canonical hashing, alpha-equivalence, and graph canonization",
        "The working set for a content-addressing scheme with proved invariance: how to hash terms modulo binding, how to canonize cyclic and shared structure, and what the known algorithms cost. Directly bears on the cycle-ordering defect this estate is tracking.",
        "Any claim that a published scheme is sound as stated for this estate's term algebra; each carries its own equivalence relation and must be restated before it binds.",
        [
            "maziarz-2021-hashing-modulo-alpha-equivalence",
            "blaauwbroek-olsak-geuvers-2024-hashing-modulo-context-sensitive-alpha",
            "apinis-ahman-2025-simple-formalization-alpha-equivalence",
            "helbling-2020-directed-graph-hashing",
            "bloyet-2019-scott-graphs-as-rooted-trees",
            "bloyet-2020-scott-correctness-complexity",
            "grabmayer-rochel-2014-maximal-sharing-letrec",
            "braibant-jourdan-monniaux-2014-hash-consed-coq",
            "schneider-2025-slotted-egraphs",
            "zucker-2026-lifting-egraphs",
            "dorsch-2017-coalgebraic-partition-refinement",
        ],
    ),
    (
        "crypto-toolchains",
        "High-assurance cryptographic toolchains and libraries",
        "Pattern and prior art for the spec-to-executable architecture: where each project puts its specification, its implementation, and the bridge between them, and what its trust boundary admits.",
        "Any transferred guarantee. These are theorems about C, assembly, F*, or Jasmin artifacts, not about Lean definitions in this estate.",
        [
            "almeida-2017-jasmin-ccs",
            "almeida-2020-last-mile-sp",
            "almeida-2023-formally-verifying-kyber-ep4",
            "almeida-2024-formally-verifying-kyber-ep5",
            "tsai-2025-jazzline-cryptoline-jasmin",
            "lai-2023-cryptoline-block-function-lec",
            "lim-nagarakatte-2019-casm-verify",
            "smith-2011-axe-dissertation-FRONTMATTER-ONLY",
            "erbsen-2019-fiat-crypto",
            "bond-2017-vale-verifying-crypto-assembly",
            "fromherz-2019-verified-efficient-embedding-verifiable-assembly",
            "ho-2023-modularity-code-specialization-zero-cost-abstractions",
            "hacl-star-2017-verified-modern-crypto-library",
            "polubelova-2020-haclxn-verified-generic-simd-crypto",
            "protzenko-2017-verified-lowlevel-programming-fstar",
            "protzenko-2019-verified-crypto-web-applications-webassembly",
            "protzenko-2020-evercrypt",
            "haselwarter-2023-last-yard",
            "hawblitzel-2014-ironclad-apps",
            "boston-2021-verified-cryptographic-code-for-everybody",
        ],
    ),
    (
        "side-channel-preservation",
        "Side-channel and speculative-execution preservation",
        "What a compilation step can and cannot preserve once the attacker model includes timing and speculation; the shape of a preservation statement over an operational semantics.",
        "Any claim that this estate's artifacts are constant-time or Spectre-resistant. No such property is stated or tested here.",
        [
            "barthe-2020-high-assurance-crypto-spectre-era",
            "shivakumar-2022-spectre-declassified",
            "shivakumar-2022-typing-against-spectre-v1",
            "shivakumar-2024-spectre-rsb",
            "arranz-olmos-2024-preservation-sct-by-compilation",
            "arranz-olmos-2025-kem-ind-cca-preserving-compilation-jasmin",
        ],
    ),
    (
        "crypto-proof-frameworks",
        "Game-based cryptographic proof frameworks",
        "How probabilistic programs, oracles, and adversary games are represented inside a higher-order logic when a security property rather than a functional one is the target.",
        "Any security claim in this estate. The current programme states functional correctness only; no game, adversary, or advantage bound is defined.",
        [
            "basin-lochbihler-sefidgar-2020-crypthol",
            "lochbihler-2016-probabilistic-functions-crypto-oracles",
        ],
    ),
    (
        "proof-assistant-internals",
        "Proof-assistant internals, kernel checking, and reduction cost",
        "What the kernel actually does when it is asked to decide an equality, what reduction strategies cost, and how external certificates enter a proof. The basis for every feasibility judgment about kernel-checked evaluation.",
        "A performance result measured on another system or toolchain version is evidence about that pin only, never a prediction for this estate's pinned Lean.",
        [
            "demoura-ullrich-2021-lean4",
            "carneiro-2024-lean4lean",
            "boving-2025-verified-bit-blasting-bv-decide",
            "szeider-2026-lrat-catcher-lean4",
            "courant-leroy-2026-lazy-concurrent-convertibility-checker",
            "boespflug-2011-full-reduction-full-throttle",
            "gregoire-leroy-2002-compiled-strong-reduction",
            "gregoire-mahboubi-2005-ring-done-right",
            "sakaguchi-2022-reflexive-tactics-algebra",
            "gonthier-2005-four-colour-theorem",
            "gonthier-mahboubi-2010-small-scale-reflection",
            "gross-2021-performance-engineering-proof-systems",
            "magaud-2003-changing-data-representation",
            "ekici-2017-smtcoq",
            "boehme-2011-z3-bitvector-proof-reconstruction",
            "niemetz-2019-bit-width-independent-proofs",
            "cohen-johnsonfreyd-2024-core-why3-coq",
        ],
    ),
    (
        "semantics-carriers",
        "Effectful semantics carriers and coinductive reasoning",
        "Carriers for programs with effects, recursion, and nontermination — interaction trees and their descendants — together with the equational and coinductive machinery that makes them provable.",
        "A settled carrier decision for this estate. No domain decision selects any of these representations.",
        [
            "xia-2020-interaction-trees",
            "xia-2020-interaction-trees-popl-published",
            "koh-2019-from-c-to-interaction-trees",
            "zakowski-2020-gpaco-weak-bisimulation",
            "zakowski-2021-llvm-ir-semantics",
            "beck-2025-vellvm-formalizing-informal-llvm",
            "chappe-2023-choice-trees",
            "fadaei-sammler-2025-hitrees",
            "frumin-timany-birkedal-2024-guarded-interaction-trees",
            "foster-hur-woodcock-2021-interaction-trees-isabelle",
            "kan-ertel-2026-interaction-tree-riscv",
            "zhang-2021-http-kv-server-itrees-vst",
        ],
    ),
    (
        "translation-validation",
        "Translation validation and derived-artifact correctness",
        "How a generated artifact is made trustworthy without trusting its generator: per-run validation, verified generators, and typed intermediate representations. The pattern any code generation in this estate must answer to.",
        "A verdict about any generator used here. Admission of a tool is governed by the tool register, not by these papers.",
        [
            "necula-2000-translation-validation",
            "jourdan-pottier-leroy-2012-validating-lr1-parsers",
            "lasser-casinghino-fisher-roux-2019-verified-ll1-parser-generator",
            "leissa-2024-mimir-ir",
        ],
    ),
    (
        "type-effect-lineage",
        "Type-system and effect lineage (E1)",
        "The declarative and algorithmic systems behind the typechecker and ability model this estate compares itself to; the specification shape any typechecker-equivalence claim must take.",
        "Any implementation's conformance to these systems, and any statement about content addressing, which neither paper treats.",
        [
            "dunfield-krishnaswami-2013-bidirectional",
            "lindley-mcbride-mclaughlin-2016-frank",
        ],
    ),
    (
        "proof-automation-ml",
        "Machine-assisted proof search and development flow",
        "How learned models are attached to a proof assistant, what they are measured against, and the reported experience of driving formalization with them.",
        "Any trust contribution. A model-produced proof step carries the kernel's verdict and nothing else; harnesses are admitted with an empty trust statement.",
        [
            "rute-2024-graph2tac",
            "blaauwbroek-2024-tacticians-web",
            "16146_Tree_Based_Premise_Selec",
            "klaus-2026-rust-to-lean-pipeline",
            "tropin-2025-highly-interactive-testing",
        ],
    ),
]


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_jsonl(path):
    out = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.strip():
            record = json.loads(line)
            out[record["stem"]] = record
    return out


def identifier(record):
    """Return the identifier the document itself carries, or None."""
    if record.get("arxiv"):
        return {"scheme": "arXiv", "value": record["arxiv"][0]}
    for doi in record.get("doi", []):
        if not PLACEHOLDER_DOI.search(doi):
            return {"scheme": "DOI", "value": doi}
    return None


def identifier_markdown(ident):
    if not ident:
        return "unresolved — pinned by digest"
    if ident["scheme"] == "arXiv":
        # Strip only a trailing version marker; an old-style identifier keeps
        # its archive prefix, which splitting on "v" would truncate.
        bare = re.sub(r"v\d+$", "", ident["value"])
        return f"[arXiv:{ident['value']}](https://arxiv.org/abs/{bare})"
    return f"[doi:{ident['value']}](https://doi.org/{ident['value']})"


def main(files_path, identity_path, titles_path, lock_out, index_out, snapshot):
    files = {Path(f["file"]).stem: f for f in load(files_path)}
    identity = load_jsonl(identity_path)
    titles = load(titles_path)

    assigned = [stem for cluster in CLUSTERS for stem in cluster[4]]
    duplicates = {s for s in assigned if assigned.count(s) > 1}
    missing = set(files) - set(assigned)
    unknown = set(assigned) - set(files)
    if duplicates or missing or unknown:
        raise SystemExit(
            f"cluster assignment is not a partition:\n"
            f"  duplicated: {sorted(duplicates)}\n"
            f"  unassigned files: {sorted(missing)}\n"
            f"  assigned but absent: {sorted(unknown)}"
        )

    entries = []
    for cluster_id, _, _, _, stems in CLUSTERS:
        for stem in stems:
            record = identity.get(stem, {})
            ident = identifier(record)
            entries.append(
                {
                    "id": stem,
                    "path": f".reference/papers/{files[stem]['file']}",
                    "title": titles.get(stem),
                    "cluster": cluster_id,
                    "identifier": ident,
                    "content": {
                        "algorithm": "sha256",
                        "digest": files[stem]["sha256"],
                        "bytes": files[stem]["bytes"],
                    },
                }
            )

    lock = {
        "schemaVersion": 1,
        "kind": "reference-paper-lock",
        "location": ".reference/provenance",
        "snapshotDate": snapshot,
        "note": (
            "Identity of each locally held paper. Titles and identifiers are read "
            "off the document itself; a null title or identifier records that the "
            "document did not yield one, and is never filled in by inference. "
            "Local copies are gitignored; the digest makes each independently "
            "re-fetchable and verifiable."
        ),
        "papers": sorted(entries, key=lambda e: e["id"]),
    }
    Path(lock_out).write_text(json.dumps(lock, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        "# Local paper corpus",
        "",
        f"Status: generated index, snapshot {snapshot}. Do not edit by hand — this",
        "file is rendered from the paper lock plus the cluster roles declared in the",
        "generator; regeneration instructions are in",
        "[../provenance/README-papers.md](../provenance/README-papers.md).",
        "",
        f"{len(entries)} papers are held locally under [`.reference/papers/`](../papers/README.md)",
        "(gitignored: the repository must not redistribute publisher-copyrighted",
        "documents, so a fresh checkout holds none of them). Canonical",
        "identity — digest, byte length, and the identifier printed on the document —",
        "lives in the [paper lock](../provenance/papers.lock.json). This index adds the",
        "one thing a digest cannot carry: what each group of sources may be used for,",
        "and what it may not.",
        "",
        "Two entries in the [reference catalog](REFERENCES.md) (the E1 type-system",
        "lineage) carry per-source role scoping in prose; they are also listed here.",
        "",
        "## Clusters",
        "",
        "| Cluster | Papers |",
        "| --- | --- |",
    ]
    for cluster_id, title, _, _, stems in CLUSTERS:
        lines.append(f"| [{title}](#{cluster_id}) | {len(stems)} |")
    lines.append("")

    for cluster_id, title, supports, boundary, stems in CLUSTERS:
        lines += [
            f"## {title}",
            "",
            f'<a id="{cluster_id}"></a>',
            "",
            f"**Supports.** {supports}",
            "",
            f"**Does not support.** {boundary}",
            "",
            "| Source | Identifier | Local pin (sha256) |",
            "| --- | --- | --- |",
        ]
        for stem in stems:
            record = identity.get(stem, {})
            title_text = titles.get(stem)
            if not title_text:
                title_text = (
                    f"`{stem}` — title not recoverable from the document "
                    "(text layer does not decode); identity pending"
                )
            digest = files[stem]["sha256"]
            lines.append(
                f"| {title_text} | {identifier_markdown(identifier(record))} | `{digest[:16]}…` |"
            )
        lines.append("")

    lines += [
        "## Reading this index",
        "",
        "A cluster's **Supports** line is the only use its members are admitted for.",
        "A source cited outside that line is being used beyond its role, which is a",
        "provenance defect (C6), not a stylistic one. Identifiers marked *unresolved*",
        "carry no public pin: the document did not print an arXiv identifier or a DOI,",
        "so the digest is the whole of its identity until one is resolved by hand.",
        "",
    ]
    Path(index_out).write_text("\n".join(lines), encoding="utf-8")
    print(f"lock: {len(entries)} papers -> {lock_out}")
    print(f"index: {len(CLUSTERS)} clusters -> {index_out}")
    resolved = sum(1 for e in entries if e["identifier"])
    print(f"identifiers resolved from document text: {resolved}/{len(entries)}")


if __name__ == "__main__":
    main(*sys.argv[1:7], snapshot="2026-08-24")
