# Gobra survey — deductive verification for Go

Commissioned 2026-08-15 as part of the operator-ordered independent
review of spec-to-implementation assurance (sub-report of the
Go-assurance research thread; Opus 5 agent, web research with primary
sources). Verbatim below.

---

**Bottom line:** Gobra is a real, actively maintained tool (commits
landed the day of this survey) that has verified production Go code at
ETH, AWS, and in the Go standard library. It is also still, by its own
README's word, a "prototype": no `select`, no generics, buggy
closures, and a two-person bus factor. It is standalone SMT-backed —
connecting it to a Lean or Isabelle model requires manually restating
the spec, leaving an unverified translation gap.

## 1. Primary sources

| Source | URL |
|---|---|
| CAV 2021 paper | https://dl.acm.org/doi/10.1007/978-3-030-81685-8_17 |
| Extended version (arXiv) | https://arxiv.org/abs/2105.13840 |
| GitHub repo | https://github.com/viperproject/gobra |
| Tutorial | https://github.com/viperproject/gobra/blob/master/docs/tutorial.md |
| Gobra Book (alpha) | https://viperproject.github.io/gobra-book/ |
| ETH project page | https://www.pm.inf.ethz.ch/research/gobra.html |
| Viper infrastructure | https://pm.inf.ethz.ch/research/viper.html |

Authors of the CAV paper: F. A. Wolf, L. Arquint, M. Clochard,
W. Oortwijn, J. C. Pereira, P. Müller. Funded originally by EU Horizon
2020 NGI-POINTER, grant No 871528.

## 2. Go subset supported

**Supported:** goroutines, channels (buffered and unbuffered),
interfaces with structural subtyping, slices, arrays, structs,
pointers, maps, defer, closures, `sync.Mutex`, `sync.WaitGroup`,
range loops, type assertions, variadic functions, first-class
predicates.

**Explicitly weak or unsupported:**

- **`select`: NOT SUPPORTED.** Issue #902, open since 2025-03-31.
- **Generics: NOT SUPPORTED.** Issue #671, open since 2023-08-24.
- **Reflection:** out of scope entirely.
- **Strings and `rune`:** tutorial: "currently the support for
  strings and specific types of integers such as `rune` is very
  limited."
- **Integer overflow:** `int`/`uint` treated as unbounded by default;
  opt-in overflow checking is alpha (`v25.09-overflow-alpha`).
- **Closures:** supported but incomplete — issues #502, #503, #513,
  #532, #723, #978 (crash, 2025-12).
- **Maps:** supported but buggy — #893, #929, #912, #932; several
  fixed August 2026.
- **Standard library:** partial; in practice you write trusted specs
  for whatever stdlib you touch (SCION needed 2,400 lines of them).

## 3. Specification language

Implicit dynamic frames (a variant of separation logic — the Viper
native logic). Machinery: accessibility predicates `acc(&x)`;
fractional permissions; quantified permissions; recursive `pred` with
`fold`/`unfold`; ghost code; `pure` functions; magic wands; `old(e)`;
`decreases` termination measures; `trusted`; `outline(...)`.

Two annotation syntaxes: bare `.gobra` files, or real `.go` files
with a `// +gobra` header and `// @`-prefixed annotations invisible
to the Go compiler (how VerifiedSCION ships compilable verified Go).

## 4. Annotation burden — published ratios

- CAV 2021 §4: 0.3–3.1 lines of annotation per line of code across 14
  small examples; verification seconds-to-a-minute each.
- SCION: **2.8 lines of annotation per line of code** ("typical for
  SMT-based deductive verification and would be substantially higher
  for verification using an interactive theorem prover").
  Spot-checked live: `router/dataplane.go` is 5,368 lines, 3,388
  annotation lines.

## 5. Real-world use

### VerifiedSCION (flagship)

"Protocols to Code: Formal Verification of a Next-Generation Internet
Router", CCS 2025 — https://arxiv.org/abs/2405.06074 ; repo
https://github.com/viperproject/VerifiedSCION (pushed 2026-08-15).

| Metric | Value |
|---|---|
| Go code | ~4,700 lines |
| Annotations | 13,400 lines (incl. 900 for the I/O spec) |
| Trusted stdlib/3p specs | 2,400 lines |
| Ratio | 2.8 : 1 |
| Effort, annotation + verification | ~2.5 person-years |
| Effort, protocol model (Isabelle/HOL) | 2–3 person-years additional |
| Gobra runtime | 3 hours on a commodity laptop |
| Fully verified | 332 functions across 12 packages |
| Caveats | 12 functions rely on unproved lemmas; 12 verified except error paths; 3 partial; 5 functions marked `requires false` (excluded) |

Properties: memory safety, crash freedom, race freedom, termination
of packet processing, functional correctness of crypto/routing
checks, I/O conformance to the protocol model; protocol-level path
authorization, valley freedom, loop freedom. Bugs found: 13 unknown
implementation issues (all confirmed), 5 protocol-level attacks —
which "escaped the extensive code reviews, testing, and fuzzing."
Deployed commercially by Anapaya.

### AWS (Diodon, IEEE S&P 2026)

"The Secrets Must Not Flow" — https://arxiv.org/abs/2507.00595 .
Split a 100k+ LoC production Go codebase into a security-critical
Core verified with Gobra (~1% of code, under three person-months;
secrecy + injective agreement) and an Application handled by
automatic I/O-independence analyses.

### Go standard library

"GCD: Garbled, Corrected, Demonstrandum" (FCS '26) —
https://arxiv.org/pdf/2606.05796 . Verified `extendedGCD` in
`crypto/internal/fips140/bigmod`; found two deviations from BoringSSL
missed by three reviewers; fix yields 24% speedup, scheduled for Go
1.28. Proof runs in ~17s (CI-viable).

### Security protocols

WireGuard, signed DH, NSL —
https://github.com/viperproject/SecurityProtocolImplementations and
https://github.com/viperproject/protocol-verification-refinement
(refinement w.r.t. a Tamarin model).

## 6. Maintenance status (2026-08)

Active: pushed 2026-08-15; 2,330 commits; 27 contributors; bus factor
2 (ArquintL 829 + jcp19 640 = 63%); 175 open issues; releases 1–2/yr
(v26.02 latest); MPL 2.0; ETH PM group under the Centre for Cyber
Trust. Install paths: VSCode extension (Gobra IDE), Docker
`ghcr.io/viperproject/gobra:latest`, GitHub Action, fat JAR, browser
playground. Still self-labeled "prototype"; book chapters on
channels, WaitGroup, variadics, `error` are unwritten.

## 7. Realistic effort (few thousand lines, stdlib-only Go)

| Anchor | Go LoC | Effort | Implied rate |
|---|---|---|---|
| SCION router (full functional + conformance) | 4,700 | 2.5 py | ~1,900 LoC/py |
| AWS Diodon Core | ~1,000 | <3 pm | ~4,000 LoC/py |

Estimate: 1–3 person-years for full functional correctness with an
IDF-fluent team; several person-months for the scoped-down bundle
(memory safety, crash freedom, race freedom, key functional
properties). Multipliers: trusted stdlib specs are the tax; avoid
`select`/generics; 3h wall-clock for 4.7k lines; expect
proof-motivated refactors; the learning curve is the real cost.

## 8. Lean/Coq connection — the key architectural answer

**Gobra is standalone and SMT-backed (Viper → Silicon/Carbon → Z3).
There is no proof-assistant integration.** Relating a Gobra-verified
property to an external model means restating the spec in Gobra's
language with a manual, unverified translation step. Both documented
instances confirm the pattern:

1. SCION ↔ Isabelle/HOL (Igloo methodology): "Only a small, mostly
   syntactic step, where we manually translate the I/O specification
   from Isabelle to Gobra syntax, is unverified."
2. GCD ↔ Lean: four lemmata proved in Lean, included as comments,
   marked `trusted` for Gobra — "there remains a small trust gap as
   we switch from one formalism to another."

Pattern: the proof assistant proves what Z3 cannot; the result is
asserted into Gobra as trusted; the seam is a human-reviewed comment.
No proof-term export, no shared kernel, no mechanized bridge.

## 9. Other Go verifiers (Perennial/Goose out of this sub-report's scope)

| Tool | What it does | Status |
|---|---|---|
| Ginger (OOPSLA 2024) | Partial-deadlock freedom via Go → VirGo → Dafny; evaluated on an Uber codebase | no public repo found |
| Gomela | Bounded model checking via Promela/SPIN | dormant (2023) |
| GCatch | Static concurrency bug detection | dormant (2023) |
| Behavioral types (Lange et al.) | Global deadlock/race properties, not contracts | research line |
| NilAway (Uber) | Heuristic nil-panic linting | not sound |

No Go frontend exists for Frama-C, KeY, VeriFast, or Why3. Viper
siblings: Nagini (Python), Prusti (Rust), VerCors (Java).

## Summary judgment

Gobra is the only game in town for deductive functional verification
of Go, and it is a real one — plan for ~3:1 annotation ratio,
~2,000–4,000 lines of Go per person-year, a hard stop at `select` and
generics, a trusted-spec tax for the stdlib, and a manual, unverified
seam if you need to tie the result to a Lean model.
