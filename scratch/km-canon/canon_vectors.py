#!/usr/bin/env python3
"""Estate canonical JSON: an independent reference for the ten canon vectors.

This file is a scratch demonstration, wired into nothing. It exists so the
ten canon vectors of kernel-conformance.ndjson format 2 have a byte-exact
reference that was written from the prose specification in
docs/design/2026-08-18-km-conformance-schema.md and from nothing else --
no Lean, no TypeScript, no Go source was consulted while writing it.

It is therefore also the worked example of section 7's "fourth consumer":
Python is not one of the three implementations the freeze binds, and the
whole serializer below is under a hundred lines.

Standard library only. Run:  python canon_vectors.py
"""

from __future__ import annotations

import json
import sys

# --------------------------------------------------------------------------
# The serializer. Estate canonical JSON = RFC 8785 (JCS) with one deviation:
# every number is an unbounded non-negative integer in minimal decimal.
# --------------------------------------------------------------------------

# JCS names exactly two single-character escapes plus five two-character
# escapes; every other control character below 0x20 goes to \u00XX with
# LOWERCASE hex digits. Nothing else is escaped -- notably not the forward
# slash, and not any character above 0x7F.
_SHORT = {
    0x22: '\\"',
    0x5C: "\\\\",
    0x08: "\\b",
    0x0C: "\\f",
    0x0A: "\\n",
    0x0D: "\\r",
    0x09: "\\t",
}


def canon_string(s: str) -> str:
    """Serialize a string, quotes included, per JCS escaping."""
    out = ['"']
    for ch in s:
        cp = ord(ch)
        if cp in _SHORT:
            out.append(_SHORT[cp])
        elif cp < 0x20:
            out.append("\\u%04x" % cp)
        else:
            # The corpus is ASCII by rule; a canonicalizer that meets a
            # non-ASCII character emits it raw (JCS never escapes above
            # 0x7F), so the ASCII rule is enforced here rather than
            # papered over with an escape a JCS peer would not produce.
            if cp > 0x7F:
                raise ValueError("non-ASCII U+%04X in corpus string" % cp)
            out.append(ch)
    out.append('"')
    return "".join(out)


def canon_number(n: object) -> str:
    """Serialize a number. THE DEVIATION: unbounded non-negative integer."""
    if isinstance(n, bool) or not isinstance(n, int):
        raise ValueError("not an integer: %r" % (n,))
    if n < 0:
        raise ValueError("negative number: %r" % (n,))
    return str(n)  # Python ints are unbounded; str() is minimal decimal.


def canonicalize(value: object) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, str):
        return canon_string(value)
    if isinstance(value, int):
        return canon_number(value)
    if isinstance(value, list):
        return "[" + ",".join(canonicalize(v) for v in value) + "]"
    if isinstance(value, dict):
        # Members sorted lexicographically by key. All keys are ASCII, so
        # code-unit order is byte order and a plain sort is correct.
        parts = []
        for k in sorted(value.keys()):
            if not isinstance(k, str):
                raise ValueError("non-string key: %r" % (k,))
            parts.append(canon_string(k) + ":" + canonicalize(value[k]))
        return "{" + ",".join(parts) + "}"
    raise ValueError("not a JSON value: %r" % (value,))


# --------------------------------------------------------------------------
# The ten canon vectors, constructed natively -- never parsed from the
# corpus. Construction is where the vectors have discriminating power: an
# emitter that preserves insertion order rather than sorting fails
# key-order here and nowhere else.
# --------------------------------------------------------------------------

VECTORS: list[tuple[str, object]] = [
    ("empty-object", {}),
    ("empty-array", []),
    ("empty-string", ""),
    ("zero", 0),
    ("big-integer", 9007199254740993),
    # Built with "b" inserted first, on purpose.
    ("key-order", {"b": 1, "a": 2}),
    ("nested-object", {"z": {"y": [3, 4]}}),
    ("nested-array", [[], [{}]]),
    # Section 3 row 9: the nine characters a, U+0022, b, U+005C, c,
    # U+000A, d, U+0009, e -- the two single-character escapes and two
    # of the five two-character ones, alternating with single ordinary
    # letters, so the vector catches an escaper that mangles the
    # characters adjacent to an escape.
    ("string-escapes",
     "a" + chr(0x22) + "b" + chr(0x5C) + "c" + chr(0x0A)
     + "d" + chr(0x09) + "e"),
    # Section 3 row 10: the single character U+0001, and nothing else.
    ("control-char", chr(0x01)),
]

# What section 3.1 names as uncovered by the ten. Not canon vectors and
# not emitted anywhere -- they are checked here so this reference makes
# the same coverage claim the document does, and no larger one.
GAP_VECTORS: list[tuple[str, object]] = [
    ("control-char-surrounded", "control" + chr(0x01) + "char"),
    ("hex-letter", chr(0x0B)),
    ("every-two-char-escape", "\b\f\n\r\t"),
    ("literals", [None, True, False]),
]


def main() -> int:
    failures = 0
    print("estate canonical JSON -- the ten canon vectors")
    print("=" * 78)
    print()
    print("%-16s %s" % ("name", "bytes (the canonical serialization)"))
    print("-" * 78)
    for name, value in VECTORS:
        print("%-16s %s" % (name, canonicalize(value)))
    print()
    print("the ten canon records, as they appear in the corpus")
    print("-" * 78)
    lines = []
    for name, value in VECTORS:
        record = {
            "bytes": canonicalize(value),
            "name": name,
            "record": "canon",
            "value": value,
        }
        line = canonicalize(record)
        lines.append(line)
        print(line)
    print()
    print("self-checks")
    print("-" * 78)

    # 1. The both-ways law, per record: parse the emitted line back and
    #    canonicalize its value member; it must equal its bytes member.
    for line in lines:
        back = json.loads(line)
        again = canonicalize(back["value"])
        ok = again == back["bytes"]
        failures += 0 if ok else 1
        print("%-16s value-recanonicalizes-to-bytes: %s"
              % (back["name"], "PASS" if ok else "FAIL"))

    # 2. The both-ways law, whole corpus: parse then re-emit every line.
    reemit = [canonicalize(json.loads(l)) for l in lines]
    ok = reemit == lines
    failures += 0 if ok else 1
    print("%-16s parse-reemit is byte-identical: %s"
          % ("(all ten)", "PASS" if ok else "FAIL"))

    # 3. The integer deviation is enforced, not assumed.
    for bad in [1.0, -1, 1.5]:
        try:
            canonicalize(bad)
            print("%-16s refuses %r: FAIL" % ("(deviation)", bad))
            failures += 1
        except ValueError:
            print("%-16s refuses %r: PASS" % ("(deviation)", bad))

    # 4. The big integer survives at full precision (the reason for the
    #    deviation). 9007199254740993 is 2^53 + 1: the smallest odd
    #    integer an IEEE-754 double cannot represent.
    big = 9007199254740993
    ok = canonicalize(big) == "9007199254740993" and int(float(big)) != big
    failures += 0 if ok else 1
    print("%-16s 2^53+1 exact in, exact out, lossy as a double: %s"
          % ("(precision)", "PASS" if ok else "FAIL"))

    print()
    print("gap vectors -- what the ten do not reach (section 3.1)")
    print("-" * 78)
    print("These are NOT canon vectors and appear in no corpus. They are")
    print("here so this reference makes the same coverage claim the")
    print("document does: the ten are the cross-language floor, and a")
    print("consumer closes the rest natively.")
    print()
    gap_expected = {
        "control-char-surrounded": '"control\\u0001char"',
        "hex-letter": '"\\u000b"',
        "every-two-char-escape": '"\\b\\f\\n\\r\\t"',
        "literals": "[null,true,false]",
    }
    for name, value in GAP_VECTORS:
        got = canonicalize(value)
        ok = got == gap_expected[name]
        failures += 0 if ok else 1
        print("%-26s %-22s %s" % (name, got, "PASS" if ok else "FAIL"))

    print()
    print("failures: %d" % failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
