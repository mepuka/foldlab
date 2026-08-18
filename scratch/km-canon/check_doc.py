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
  4. The program group of section 2.7, when the corpus carries it: the
     record shape, the declaration grammar, the argref forms, the
     newest-first orientation, the edge-equals-consumptions rule, and
     the bytes-equals-canonicalize-declaration self-test. The group is
     add-only, so a tree may or may not carry it; when it is absent
     those checks print WAITING rather than PASS, because a checker that
     reported green over a group that is not there would be lying by
     silence. A control arm exercises the same validator over
     single-mutation degenerates either way.

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

# The eight groups format 2 was minted with, then the add-only ninth.
MINTED_GROUPS = ["kind", "stage", "refusal", "type", "encoding", "admission",
                 "doc", "canon"]
PROGRAM = "program"
KNOWN_GROUPS = MINTED_GROUPS + [PROGRAM]

# What the corpus measured at format 2's minting. These are quoted in the
# document as historical figures, not as constants of the format; the
# counts-derived rule (lines == 1 + sum(counts)) is what carries forward.
MINTING_LINES = 117
MINTING_BYTES = 22632

# Section 2.7.1's declaration grammar, as member sets.
DECLARATION_MEMBERS = {"edges", "holes", "lineage", "nodes"}
PROGRAM_RECORD_KEYS = {"bytes", "declaration", "name", "record"}
ARGREF_MEMBERS = {
    "digest": {"arg", "id", "kind"},
    "local": {"arg", "name"},
    "literal": {"arg", "value"},
    # The fourth form, added by the emission after the freeze listed
    # three (R16). Same member set as "local", different tag -- so the
    # discriminator is the tag and never the shape.
    "hole": {"arg", "name"},
}

# A declaration built here from the section 2.7.1 grammar, used as the
# lawful arm of the control below when the corpus carries no program
# group. Once the group is emitted the control runs against the corpus's
# own richest vector instead, which is strictly better evidence.
FALLBACK_DECLARATION = {
    "edges": [{"from": 2, "to": 1}],
    "holes": [{"name": 7, "schema": 88}],
    "lineage": [],
    "nodes": [
        {"args": {"body": {"arg": "local", "name": 1},
                  "lane": {"arg": "digest", "id": 1, "kind": "lane"}},
         "generator": "emit", "name": 2},
        {"args": {"value": {"arg": "hole", "name": 7},
                  "writ": {"arg": "digest", "id": 4, "kind": "policy"}},
         "generator": "declare", "name": 1},
    ],
}

fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    if not ok:
        fails += 1
    print("%-56s %s %s" % (label, "PASS" if ok else "FAIL", detail))


def waiting(label: str, detail: str = "") -> None:
    """Neither pass nor fail: the thing checked is not in the tree yet."""
    print("%-56s %s %s" % (label, "WAIT", detail))


def is_nat(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def consumptions(declaration: dict) -> set:
    """The (consumer, consumed) pairs the nodes' local argrefs imply."""
    pairs = set()
    for node in declaration.get("nodes", []):
        args = node.get("args", {})
        if not isinstance(args, dict):
            continue
        for arg in args.values():
            if isinstance(arg, dict) and arg.get("arg") == "local":
                pairs.add((node.get("name"), arg.get("name")))
    return pairs


def edge_pairs(declaration: dict) -> set:
    """The edges array read as (from, to) pairs."""
    return {(edge.get("from"), edge.get("to"))
            for edge in declaration.get("edges", [])
            if isinstance(edge, dict)}


def ordered_consumptions(declaration: dict) -> list:
    """The consumptions in the order section 2.7.3 documents: the nodes'
    own order, each node's local argrefs taken in sorted key order."""
    pairs = []
    for node in declaration.get("nodes", []):
        args = node.get("args", {})
        if not isinstance(args, dict):
            continue
        for key in sorted(args):
            arg = args[key]
            if isinstance(arg, dict) and arg.get("arg") == "local":
                pairs.append((node.get("name"), arg.get("name")))
    return pairs


def edge_list(declaration: dict) -> list:
    return [(edge.get("from"), edge.get("to"))
            for edge in declaration.get("edges", [])
            if isinstance(edge, dict)]


def declaration_problems(declaration: dict, act_fields: dict,
                         kind_names: set) -> list:
    """Section 2.7's structural rules, as a list of what is wrong."""
    problems = []
    for member in ("edges", "holes", "lineage", "nodes"):
        if not isinstance(declaration.get(member), list):
            problems.append("%s is not an array" % member)
    if problems:
        return problems

    nodes = declaration["nodes"]
    names = [node.get("name") for node in nodes]
    if len(set(names)) != len(names):
        problems.append("node names are not unique: %s" % names)
    first_index = {}
    for i, name in enumerate(names):
        first_index.setdefault(name, i)

    declared_holes = {hole["name"] for hole in declaration["holes"]
                      if isinstance(hole, dict) and "name" in hole}

    for i, node in enumerate(nodes):
        if set(node) != {"args", "generator", "name"}:
            problems.append("node %r members %s" % (node.get("name"),
                                                    sorted(node)))
            continue
        if not is_nat(node["name"]):
            problems.append("node name %r is not a natural" % (node["name"],))
        generator = node["generator"]
        if generator not in act_fields:
            problems.append("unknown generator %r" % (generator,))
            continue
        if not isinstance(node["args"], dict):
            problems.append("node %r args is not an object" % (node["name"],))
            continue
        # Subset, not equality (R21): the emission carries fewer args
        # than the constructor has fields.
        stray = sorted(set(node["args"]) - set(act_fields[generator]))
        if stray:
            problems.append("node %r args keys %s are not fields of %s %s"
                            % (node["name"], stray, generator,
                               sorted(act_fields[generator])))
            continue
        for key, arg in sorted(node["args"].items()):
            where = "node %r arg %s" % (node["name"], key)
            if not isinstance(arg, dict):
                problems.append("%s is not an argref" % where)
                continue
            tag = arg.get("arg")
            if tag not in ARGREF_MEMBERS:
                problems.append("%s has unknown tag %r" % (where, tag))
                continue
            if set(arg) != ARGREF_MEMBERS[tag]:
                problems.append("%s members %s, expected %s"
                                % (where, sorted(arg),
                                   sorted(ARGREF_MEMBERS[tag])))
                continue
            if tag == "digest":
                if arg["kind"] not in kind_names:
                    problems.append("%s names unknown kind %r"
                                    % (where, arg["kind"]))
                if not is_nat(arg["id"]):
                    problems.append("%s id is not a natural" % where)
            elif tag == "literal":
                if not is_nat(arg["value"]):
                    problems.append("%s value is not a natural" % where)
            elif tag == "hole":
                if arg["name"] not in declared_holes:
                    problems.append("%s names undeclared hole %r"
                                    % (where, arg["name"]))
            else:
                target = first_index.get(arg["name"])
                if target is None:
                    problems.append("%s names no node" % where)
                elif target <= i:
                    problems.append("%s points at index %d, not older than %d"
                                    " -- nodes are newest-first"
                                    % (where, target, i))

    hole_names = []
    for hole in declaration["holes"]:
        if not isinstance(hole, dict) or set(hole) != {"name", "schema"}:
            problems.append("hole members %s"
                            % (sorted(hole) if isinstance(hole, dict)
                               else repr(hole)))
            continue
        if not (is_nat(hole["name"]) and is_nat(hole["schema"])):
            problems.append("hole %r carries a non-natural" % (hole["name"],))
        hole_names.append(hole["name"])
    if hole_names != sorted(hole_names):
        problems.append("holes do not ascend by name: %s" % hole_names)
    if len(set(hole_names)) != len(hole_names):
        problems.append("duplicate hole name: %s" % hole_names)

    for edge in declaration["edges"]:
        if not isinstance(edge, dict) or set(edge) != {"from", "to"}:
            problems.append("edge members %s"
                            % (sorted(edge) if isinstance(edge, dict)
                               else repr(edge)))
    if len(declaration["edges"]) != len(edge_pairs(declaration)):
        problems.append("duplicate edge row")

    if not all(is_nat(item) for item in declaration["lineage"]):
        problems.append("lineage carries a non-natural")

    return problems


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

    # Prose searches run against whitespace-flattened text so a reflow of
    # the document's line wrapping does not redden a sentence check.
    flat = " ".join(doc.split())

    # The minting figures are quoted in the document as a measurement of a
    # moment. They are checked as such: labelled in the prose, and equal to
    # the corpus only while the corpus is still the one that was minted.
    check("doc labels 117/22632 as measured at minting",
          "at the time of format 2's minting, 117 lines and 22632 bytes"
          in flat)
    check("doc states the counts-derived line rule",
          "lines == 1 + sum(header.counts)" in doc)

    records = [json.loads(line) for line in lines]
    header, body = records[0], records[1:]

    group: dict[str, list] = {}
    for record in body:
        group.setdefault(record["record"], []).append(record)

    has_program = PROGRAM in group
    if has_program:
        waiting("corpus has grown past the minting figures",
                "%d lines, %d bytes -- expected, the program group landed"
                % (n_lines, n_bytes))
    else:
        check("corpus is still the minted 117 lines", n_lines == MINTING_LINES,
              str(n_lines))
        check("corpus is still the minted 22632 bytes",
              n_bytes == MINTING_BYTES, str(n_bytes))

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
          canonicalize(header) in doc,
          "" if canonicalize(header) in doc
          else "regenerate the header example in section 2.2 from the file")
    check("header counts name exactly the groups present",
          sorted(header["counts"]) == sorted(group),
          "%s vs %s" % (sorted(header["counts"]), sorted(group)))
    check("every counts key is a group this reference knows",
          all(name in KNOWN_GROUPS for name in header["counts"]),
          str([n for n in header["counts"] if n not in KNOWN_GROUPS]))
    for name in sorted(set(list(header["counts"]) + list(group))):
        present = len(group.get(name, []))
        check("header count for %s equals the records present" % name,
              header["counts"].get(name) == present, str(present))
    declared = sum(header["counts"].values())
    check("lines == 1 + sum(counts)", n_lines == declared + 1)
    check("doc places program sixth among the sorted counts keys",
          "admission, canon, doc, encoding, kind, program, refusal, "
          "stage, type" in flat)

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
    # 9. The program group (section 2.7). Add-only and possibly absent:
    #    absent prints WAITING, present is validated in full.
    # ----------------------------------------------------------------
    kind_names = {r["name"] for r in group["kind"]}
    act_fields = {c["name"]: [f["name"] for f in c["fields"]]
                  for c in act["constructors"]}

    # The document must name every generator and every argref tag.
    for name in sorted(act_fields):
        check("doc names generator %s in the args table" % name,
              "| `%s` |" % name in doc)
    for tag in sorted(ARGREF_MEMBERS):
        check("doc names argref tag %s" % tag, '`"%s"`' % tag in doc)

    if not has_program:
        waiting("program group present in the corpus",
                "absent from this corpus; section 2.7 stands unexercised")
        for label in ["program record shape", "declaration members",
                      "bytes equals canonicalize(declaration)",
                      "newest-first order and unique names",
                      "edges equal the local consumptions",
                      "holes ascend by name",
                      "doc quotes an emitted program record"]:
            waiting("  program: %s" % label)
    else:
        programs = group[PROGRAM]
        check("program is the last group in the file",
              body[-1]["record"] == PROGRAM, body[-1]["record"])
        names = [r["name"] for r in programs]
        check("program vector names are unique",
              len(set(names)) == len(names), str(names))
        for record in programs:
            label = record.get("name", "?")
            check("program %s has exactly the four keys" % label,
                  set(record) == PROGRAM_RECORD_KEYS, str(sorted(record)))
            declaration = record.get("declaration")
            check("program %s declaration has the four members" % label,
                  isinstance(declaration, dict)
                  and set(declaration) == DECLARATION_MEMBERS,
                  str(sorted(declaration)) if isinstance(declaration, dict)
                  else repr(declaration))
            if not isinstance(declaration, dict):
                continue
            check("program %s bytes is canonicalize(declaration)" % label,
                  record.get("bytes") == canonicalize(declaration))
            problems = declaration_problems(declaration, act_fields,
                                            kind_names)
            check("program %s is well formed per section 2.7" % label,
                  not problems, "; ".join(problems))
            check("program %s edges equal its local consumptions" % label,
                  consumptions(declaration) == edge_pairs(declaration),
                  "argrefs %s vs edges %s"
                  % (sorted(consumptions(declaration)),
                     sorted(edge_pairs(declaration))))
            check("program %s edges follow the documented order" % label,
                  edge_list(declaration)
                  == ordered_consumptions(declaration),
                  "%s vs %s" % (edge_list(declaration),
                                ordered_consumptions(declaration)))
            check("doc names program vector %s" % label,
                  "`%s`" % label in doc)
        block = "\n".join(canonicalize(record) for record in programs)
        check("doc quotes the four program records as one block",
              block in doc,
              "" if block in doc
              else "regenerate section 2.7.4 from the corpus")

    # ----------------------------------------------------------------
    # 10. No stale text: format-1 language, and the two canon spellings
    #     the emission overruled.
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
        ("the eight group names", "the pre-program counts-key sentence"),
        ("exactly the eight it knows", "the pre-program counts corollary"),
        ("Total file\nlength is **117 lines**", "the pinned total"),
    ]
    for needle, why in banned:
        check("doc free of %s" % why, needle not in doc)

    # ----------------------------------------------------------------
    # 11. The program group is documented whether or not it is emitted:
    #     the group table, the checklist, and the reconciliation rows.
    # ----------------------------------------------------------------
    check("doc lists program as group 10", "| 10 | `program` |" in doc)
    check("doc specifies the program group in section 2.7",
          "### 2.7 The program group" in doc)
    check("doc states the edge-equals-consumptions rule",
          "The edge rule (NORMATIVE)" in flat)
    check("doc states the program consistency law",
          "Consistency law (NORMATIVE)" in flat
          and "Kernel.ProgramAdmission" in doc)
    check("doc states the program self-test",
          "canonicalize" in doc and "bytes`-equals-canonicalize-"
          "`declaration`" in doc)
    for number in ["34", "35", "36", "37", "38", "39"]:
        check("section 11 carries program check %s" % number,
              "\n%s. **" % number in doc)
    for row in ["R15", "R16", "R17", "R18", "R19", "R20", "R21"]:
        check("section 12 carries reconciliation row %s" % row,
              "| **%s** |" % row in doc)
    check("doc names the four program vectors",
          all("`%s`" % name in doc for name in
              ["ground-two-node", "holey", "holey-filled", "distill-shape"]))
    check("doc states the no-execution non-claim",
          "A `program` record is a declaration" in doc)

    # ----------------------------------------------------------------
    # 12. The control arm for the checks above that have no corpus to
    #     run against yet. A validator with no failing case proves
    #     nothing, and WAITING lines prove less than nothing on their
    #     own -- so the program logic is exercised here, over
    #     single-mutation degenerates of the section 2.7.4
    #     illustration, whether or not the group has landed.
    # ----------------------------------------------------------------
    if has_program:
        control_base = group[PROGRAM][-1]["declaration"]
        control_holey = next(
            (r["declaration"] for r in group[PROGRAM] if r["declaration"]
             ["holes"]), FALLBACK_DECLARATION)
        origin = "the corpus's distill-shape vector"
    else:
        control_base = FALLBACK_DECLARATION
        control_holey = FALLBACK_DECLARATION
        origin = "a declaration built here from the section 2.7.1 grammar"
    print()
    print("control arm, over %s" % origin)
    selftest_program(control_base, control_holey, act_fields, kind_names)

    print()
    print("failures: %d" % fails)
    return 1 if fails else 0


def mutate(base: dict, edit) -> dict:
    """A deep copy of a declaration with one thing changed."""
    clone = json.loads(json.dumps(base))
    edit(clone)
    return clone


def first_local(declaration: dict):
    """(node index, args key) of the first local argref, for mutating."""
    for i, node in enumerate(declaration["nodes"]):
        for key in sorted(node["args"]):
            if node["args"][key].get("arg") == "local":
                return i, key
    raise AssertionError("the control base has no local argref")


def selftest_program(base: dict, holey: dict, act_fields: dict,
                     kind_names: set) -> None:
    """Refuse each single mutation for its own named reason."""
    problems = declaration_problems(base, act_fields, kind_names)
    check("control: the lawful base has no problem", not problems,
          "; ".join(problems))
    check("control: the lawful base's edges agree",
          consumptions(base) == edge_pairs(base))

    node_i, arg_key = first_local(base)

    def drop_edge(d):
        d["edges"] = d["edges"][1:]

    def reverse_edge(d):
        first = d["edges"][0]
        first["from"], first["to"] = first["to"], first["from"]

    def oldest_first(d):
        d["nodes"] = list(reversed(d["nodes"]))

    def duplicate_name(d):
        d["nodes"][-1]["name"] = d["nodes"][0]["name"]

    def unknown_tag(d):
        d["nodes"][node_i]["args"][arg_key] = {"arg": "closure", "code": 3}

    def stray_arg(d):
        d["nodes"][node_i]["args"]["payload"] = \
            d["nodes"][node_i]["args"].pop(arg_key)

    def unknown_kind(d):
        for node in d["nodes"]:
            for arg in node["args"].values():
                if arg.get("arg") == "digest":
                    arg["kind"] = "sandwich"
                    return
        raise AssertionError("no digest argref to mutate")

    def descending_holes(d):
        d["holes"] = [{"name": 9, "schema": 1}, {"name": 2, "schema": 1}]

    def orphan_hole(d):
        d["holes"] = []

    # Mutations the edge rule alone catches -- the whole argument for
    # writing the consumption relation down twice.
    for label, edit in [("a dropped edge", drop_edge),
                        ("a reversed edge", reverse_edge)]:
        bad = mutate(base, edit)
        check("control: %s breaks edges-equal-consumptions" % label,
              consumptions(bad) != edge_pairs(bad))

    # Mutations the structural rules catch, each with the substring of
    # the reported reason that names it.
    cases = [
        (base, "nodes reordered oldest-first", oldest_first, "newest-first"),
        (base, "a duplicated node name", duplicate_name, "not unique"),
        (base, "an unknown argref tag", unknown_tag, "unknown tag"),
        (base, "a stray args key", stray_arg, "are not fields of"),
        (base, "an unknown digest kind", unknown_kind, "unknown kind"),
        (base, "holes out of ascending order", descending_holes,
         "do not ascend"),
        (holey, "a hole used but not declared", orphan_hole,
         "undeclared hole"),
    ]
    for source, label, edit, reason in cases:
        problems = declaration_problems(mutate(source, edit), act_fields,
                                        kind_names)
        check("control: %s is refused for its own reason" % label,
              any(reason in problem for problem in problems),
              str(problems))

    # The subset rule is a real relaxation, so it gets a positive control
    # too: dropping a field must NOT be a finding (R21).
    def drop_a_field(d):
        for node in d["nodes"]:
            if node["args"]:
                node["args"].pop(sorted(node["args"])[-1])
                return
        raise AssertionError("no args to drop")

    thinned = mutate(base, drop_a_field)
    thinned_problems = [p for p in declaration_problems(
        thinned, act_fields, kind_names) if "are not fields of" in p]
    check("control: dropping an args field is NOT a finding (R21)",
          not thinned_problems, str(thinned_problems))


if __name__ == "__main__":
    sys.exit(main())
