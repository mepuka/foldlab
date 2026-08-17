# RQ-4 — The road not taken: verifying the implementations we already have

Research seat for RQ-4 of the REF program, 2026-08-16. Serves the honest
assessment of the alternative to extraction (D-a, D-bc, D-d, D-e; slices
REF-6/REF-7). Reference area:
`docs/research/reference/rq4-verify-existing-implementations/`.

Retrieval date for every web source below is **2026-08-16**. Repository
claims are pinned to a commit. Where a claim was mechanically checked on
this machine, the transcript is in the reference area and the claim is
marked **[ran]**. Anything not confirmed by a primary source is marked
**UNVERIFIED** and treated as a lead.

---

## Verdict, first

**No. Nothing found changes the REF-6/REF-7 plan.** The alternative is
real, it is more mature than the coordinator's framing assumed on the Go
side, and it is *thinner than assumed* on the TypeScript side. But it
loses on our seam for four reasons, in decreasing order of force:

1. **It must be paid twice, in two unrelated toolchains, neither of
   which connects to Lean.** Gobra is SMT-backed and standalone; the one
   published Isabelle→Gobra link says in its own words that the linking
   step "is unverified" (§3.1). Goose targets Rocq, not Lean, and
   declares its translator *trusted* (§1.2). Extraction is paid once and
   its trusted base is a component the estate already runs.
2. **It leaves two implementations where D-e demands one.** D-e
   obligation 3 requires the running seam to *be* the generated kernel
   under a single-source gate. Verifying two hand-written seams cannot
   satisfy that obligation; it can at best make both *provably* agree
   with two hand-restated specs, with the restatement itself an
   unpoliced drift channel — exactly the "silent drift channel" the
   program's standing law forbids.
3. **The concentration DEV-674/675 achieved cuts the other way.** It
   shrinks the verify-existing target to 782 Go lines and 1,045 TS lines
   **[ran]** — genuinely tractable, and I say so plainly below. But the
   same concentration is precisely what makes the seam replaceable by
   one generated pure function. Concentration is a *stronger* argument
   for extraction than for annotation, because it removes the usual
   reason to prefer annotation (that the behaviour is smeared across
   code you cannot regenerate).
4. **The hard part of our seam is the part these tools handle worst.**
   Every fill decision turns on canonical-byte equality of arbitrary
   JSON values (`protocol_step.go:159`,
   `bytes.Equal(filledBytes, valueBytes)`), which drags in
   reflection-based `encoding/json`, `strconv.ParseFloat`, and UTF-16
   surrogate handling. Gobra's documented stdlib support does not
   include `encoding/json`; Gillian-JS does not do higher-order
   reasoning and elides types.

The one finding that should change something: **the s2n negative-control
technique is directly adoptable and is currently a gap in our REF-6 gate
design.** See §6, recommendation R2.

---

## 1. The state of the art for verifying Go against a formal model

Two tools, and only two, are live.

### 1.1 Gobra (ETH Zurich) — the only deductive functional verifier for Go

Repository `viperproject/gobra`, `master` HEAD
`782b530fd700a1527ec36f61fa321d093c0c15f4` (2026-08-13), pushed
2026-08-15. The README's own first sentence, verbatim:

> Gobra is a prototype verifier for Go programs, based on the Viper
> verification infrastructure.

"Prototype" is the maintainers' word, at HEAD, in 2026.

**Subset, from the primary source.** `docs/tutorial.md` at that commit,
line 448:

> Gobra supports many of Go's native types, namely integers (`int`,
> `int8`, `int16`, `int32`, `int64`, `byte`, `uint8`, `rune`, `uint16`,
> `uint32`, `uint64`, `uintptr`), strings, structs, pointers, arrays,
> slices, interfaces, and channels. Note that currently the support for
> strings and specific types of integers such as `rune` is very limited.

Line 38 of the same file (present in the source as an HTML comment, so
quoted with that caveat):

> Gobra provides an incomplete but growing support for the Go standard
> library. Currently, it has partial support for the packages
> `encoding/binary`, `net`, `strconv`, `strings`, `sync`, and `time`.

`encoding/json` is not on that list. Neither is `sort`. Both are
load-bearing in our seam.

Two named holes remain open at retrieval: `select` support is
[issue #902](https://github.com/viperproject/gobra/issues/902), open,
created 2025-03-31; generics is
[#671](https://github.com/viperproject/gobra/pull/671), open, created
2023-08-24.

**Does it scale to code that talks to a network and a store?** Yes, with
a precisely-bounded meaning of "yes". VerifiedSCION verified a
production SCION border router — a packet-forwarding component with real
network I/O. From the CCS/arXiv paper (`arXiv:2405.06074v1`, 2024-05-09),
verbatim:

> We targeted the current, open-source implementation, which consists of
> 4,700 lines of Go code (ignoring comments and empty lines), including
> SCION-specific libraries, but excluding third-party libraries like the
> Go standard library or the library gopacket.

> In total, we added 13,400 lines of specifications and annotations,
> including 900 for the I/O specification and the definitions it depends
> on. We wrote another 2,400 lines of trusted specifications for the Go
> standard library and third-party libraries. The overhead of 2.8 lines
> of annotation per line of code is typical for SMT-based deductive
> verification and would be substantially higher for verification using
> an interactive theorem prover. Annotating and verifying the code took
> roughly 2.5 person years; running Gobra on the implementation takes
> three hours on a commodity laptop.

And the honest asterisk on "the deployed implementation as is":

> We achieved our goal of verifying the deployed, performance-optimized
> implementation as is, except for three small changes to work around
> limitations of Gobra. First, we rewrote one type declaration that uses
> a specific combination of Go's interfaces and Go's delegation
> mechanism that is not supported by Gobra. Second, we split some
> compound expressions, which allows us to add necessary annotations
> about intermediate results. Third, we rewrote some range-loops into
> regular for-loops, which in some cases simplifies permission-based
> reasoning.

Residual gaps, in their words: "12 functions rely on simple, unproved
lemmas relating the representation of packets as bytestrings and their
logical counterpart"; another 12 "are verified except for a few paths
(related to error handling)"; "three functions are verified partially
because of performance problems of Gobra."

**The link to the interactive prover.** This is the load-bearing
sentence for us. The paper's own trusted-base section:

> Tool soundness. We assume that the Isabelle/HOL and Gobra verification
> tools are sound. Their connection, given by the extraction of the I/O
> specification from the component model, is correct by Igloo's
> soundness proof, which is itself formalized in Isabelle/HOL. Only a
> small, mostly syntactic step, where we manually translate the I/O
> specification from Isabelle to Gobra syntax, is unverified.

Even in the best-executed instance of this road, the prover↔verifier
seam is a hand translation, unverified. (The prior in-house survey
`docs/research/2026-08-15-gobra-survey.md` reported the same sentence;
this report re-read it from the paper PDF rather than re-citing the
survey.)

### 1.2 Goose / Perennial (MIT PDOS) — real, active, and not for us

`goose-lang/goose` is **archived**: GitHub reports `archived: true`,
last push 2026-04-07, last `master` commit
`7434b9c11026be910d001abb1e1fa6bd432003a8` (2025-05-09). Its README
carries the banner "Development for this repository has moved to
<https://github.com/mit-pdos/perennial>". Perennial itself is active
(pushed 2026-08-10) and mid-migration to a "new Goose" under `new/`.

The disqualifying sentence is in the archived README, verbatim:

> The translator and semantics are trusted; you can view the process as
> giving a semantics to Go.

Goose does not prove Go→Rocq correct. It *asserts* a semantics for Go.
That is the same category of trust as Lean's C backend, pointed the
other way — and it is a trust step we would take *in addition to*
whatever the Lean estate already trusts, not instead of it.

Two further disqualifiers, both primary:

- **Target is Rocq (Coq), not Lean.** The whole `verify/moves` estate
  would be re-proved in another prover. No Lean port was found.
- **Subset.** `docs/writing-goose.md` at `7434b9c1` lists the supported
  features and closes the integer line with "`uint64`, `uint32`, `byte`
  (no signed integers are supported)". `docs/implementation.md` at the
  same commit: "control flow is not perfectly supported (particularly
  for loops, which must be translated to anonymous recursive
  definitions)."

Worth recording as a *technique*, not a plan: `docs/testing-proposal.md`
proposes validating the trusted translation by building a verified
interpreter of the Coq model and differentially testing it against real
Go execution. That is structurally the same move as our corpus/oracle
wall, applied to the translator rather than the seam. It is the field
independently arriving at "when you cannot prove the gap, wall it
empirically."

### 1.3 What was searched and not found

Searched for a tool relating **Lean 4** to **Go**: web search
("Lean 4 verify Go implementation against model refinement proof tool
2026"), GitHub org listings for `goose-lang`, the Gobra repository and
its docs, and the Viper sibling list. **No prior art found.** The only
Lean↔Gobra contact reported anywhere is the GCD/`bigmod` work described
in the prior in-house survey, where Lean lemmas are pasted into Gobra as
`trusted` comments — a human-reviewed comment, not a mechanized bridge
(that characterization is carried from
`docs/research/2026-08-15-gobra-survey.md` and is **not** re-verified
here against `arXiv:2606.05796`; treat it as a lead).

---

## 2. The same for TypeScript and JavaScript — thinness, confirmed

The coordinator expected this to be very thin. It is thinner than that,
and the confirmation is unusually clean because the flagship JavaScript
verification case study *is itself a TypeScript codebase* and says in
print what it had to do to get there.

### 2.1 There is no TypeScript verifier, and there is no TypeScript specification

Microsoft's own design document
(`microsoft/TypeScript-wiki`, `TypeScript-Design-Goals.md`), non-goal 3,
verbatim:

> Apply a sound or "provably correct" type system. Instead, strike a
> balance between correctness and productivity.

And the language specification is gone. Commit `30cb2043` (2020-09-04,
"Mark spec files as archived (#40373)") renamed `doc/spec.md` to
`doc/spec-ARCHIVED.md`; the `doc/README.md` at that commit reads:

> NOTE: the files in this directory are NOT meant to be edited. They are
> a snapshot of the out-of-date specification which is no longer being
> updated. We will not be accepting changes to these documents.

At `main` today, `GET /repos/microsoft/TypeScript/contents/doc` returns
**404** — the directory has since been removed entirely **[ran]**.

There is therefore no normative artefact against which a TypeScript
program could be proved correct *as TypeScript*. Any verification must
first erase to JavaScript and reason about ECMAScript semantics.

### 2.2 JavaScript: one live tool, ES5 Strict, ~200 lines at the frontier

`GillianPlatform/Gillian` (BSD-3-Clause, `master` HEAD
`b195dfc39a99d98f4d3c292537b6c572473653c3`, 2026-07-03; most recent
commit touching `Gillian-JS/` is that same commit). The repository
README's structure listing, verbatim:

> `Gillian-JS  # Instantiation of Gillian for ES5 JavaScript.`

Its predecessor `javert2/JaVerT2.0` (last push 2020-04-22) opens its
README with "`# Deprected - Please use Gillian-JS instead`".

The flagship result — Maksimović et al., "Gillian, Part II: Real-World
Verification for JavaScript and C", CAV 2021 — verified the message
header deserialisation module of the AWS Encryption SDK. Its own
description of the scale, verbatim:

> This is stable, critical, industry-grade code (~200loc for JS, ~950loc
> for C), which uses advanced language features to manipulate complex
> data structures.

and

> The verification itself required a substantial improvement of the
> reasoning capabilities of Gillian, especially when it came to handling
> arrays of symbolic size.

The caveats section is the decisive passage for us, verbatim:

> JS Verification: Caveats. Our JS verification is correct up to the
> following caveats. First, as the AWS SDK JS implementation is written
> in TypeScript, we elide types to obtain JS; this could be automated,
> potentially generating predicates from the types. Next, some ES6
> features, such as patterns in function parameters, are not yet
> supported by Gillian-JS; these we rewrite to ES5 Strict, preserving
> their meaning. Next, we use axiomatic specifications of the
> ArrayBuffer, DataView, and UInt8Array ES6 built-in libraries, as well
> as of the Object.freeze and Array.prototype.map built-in functions.
> […] Finally, as Gillian does not support higher-order reasoning, we
> axiomatise the toUtf8 function, passed into the deserialisation
> module as a parameter, as an injective function from raw bytes to JS
> strings.

Read that against our TS seam: types elided (we carry 13 generic
parameter sites in `kernel.ts` alone **[ran]**), ES6 rewritten to ES5
Strict (85 arrow functions in `kernel.ts`, 22 template literals
**[ran]**), builtins axiomatised (4 `JSON.*` calls in `jcs.ts`
**[ran]**), and no higher-order reasoning (36 function-typed comparator
/ fence sites across `kernel.ts` and `wire.ts` **[ran]** — the model's
`Cmp<T>` parameterization is the *point* of the kernel).

Our TS seam is 1,045 lines **[ran]** — five times the size of the
flagship JS verification, in a language whose types must be thrown away
first, using the one feature (higher-order parameters) the tool
explicitly does not reason about.

### 2.3 Mechanized JavaScript semantics: preserved, not maintained

- **JSCert** (Coq, ES5): <https://github.com/jscert/jscert>, last push
  2024-02-05, GitHub license `NOASSERTION` **[ran]**.
- **KJS** (K framework, ES5):
  <https://github.com/kframework/javascript-semantics>, last push
  2016-10-13, no license detected **[ran]**.
- **coq-of-js** (formal-land): the repository named in search results
  returns **404** from the GitHub API at retrieval **[ran]**.

Neither JSCert nor KJS has a license GitHub can identify, so per the
dispatch discipline neither is vendored here; both are linked only.

**Absence, stated as a finding.** Searching for a deductive verifier
that consumes TypeScript directly (web search on "deductive verification
TypeScript program verifier specification 2025 2026 research tool"; the
Viper sibling list — Nagini/Python, Prusti/Rust, VerCors/Java, Gobra/Go;
the Gillian instantiation list — C, C2, JS, wisl), **no such tool was
found.** The state of the art for TypeScript is: erase to ES5 JavaScript
and verify roughly two hundred lines.

---

## 3. The strongest precedent for "proved against spec, in CI, on every commit"

Two exist. The lead named one of them and named the wrong file for it.

### 3.1 s2n-tls — the SAW lead, CONFIRMED with two corrections

Repo `aws/s2n-tls` (Apache-2.0), pinned at `main` commit
`72f5db1fb96635a655ec90569ade0d500ea0555c` (2026-08-13) **[ran]**.

**Correction 1 — the file called `proof_ci` is not the SAW gate.**
`.github/workflows/proof_ci.yaml` is the CBMC starter-kit workflow
(`# CBMC starter kit 2.10`, `name: Run CBMC proofs`), configured by
`.github/workflows/proof_ci_resources/config.yaml`
(`cbmc-version: "6.9.0"`, `z3-version: "4.13.0"`,
`bitwuzla-version: "0.5.0"`, `kissat-tag: "rel-4.0.3"`,
`proofs-dir: tests/cbmc/proofs`,
`run-cbmc-proofs-command: ./run-cbmc-proofs.py`). It runs on
`push`/`pull_request`/`merge_group`, `runs-on: cbmc_ubuntu-latest_64-core`,
`timeout-minutes: 60`. This is bounded model checking for memory safety
— not correspondence to a specification.

**Correction 2 — the SAW gate is real, but it runs through AWS
CodeBuild, and it is one job out of thirty-one.** The chain, each link
read at the pinned commit:

`.github/workflows/codebuild.yml` (on `push` to `main`,
`pull_request_target` to `main`, `merge_group`)
→ `codebuild/bin/start_codebuild.sh` (its `BUILDS` array contains
`s2nGeneralBatch`)
→ `codebuild/spec/buildspec_generalbatch.yml`, which contains exactly
one SAW entry —

```yaml
      identifier: s2nSawTls
        variables:
          GCC_VERSION: NONE
          SAW: true
          TESTS: tls
```

→ `codebuild/spec/buildspec_ubuntu.yml` → `codebuild/bin/s2n_codebuild.sh`,
line 112:

```bash
if [[ "$TESTS" == "ALL" || "$TESTS" == "tls" ]]; then make -C tests/saw tmp/verify_handshake.log ; fi
```

→ `tests/saw/verify_handshake.saw`:

```
include "spec/handshake/handshake.saw";

prove_handshake_io_lowlevel;
prove_state_machine;
prove_cork_uncork;
```

So: **yes, a SAW proof that C code corresponds to a Cryptol
specification runs on every push and every PR to `aws/s2n-tls`.** The
lead is confirmed. Three refinements matter for us.

**(a) What is actually proved is narrower than "the handshake".**
`spec/handshake/handshake.saw` verifies three C functions against the
low-level Cryptol spec — `s2n_connection_get_client_auth_type`,
`s2n_advance_message`, and `s2n_conn_set_handshake_type` (twice, once
per `chosen_psk` case) — inside a 77,995-byte
`tls/s2n_handshake_io.c` **[ran]**. Eight further functions are supplied
by `crucible_llvm_unsafe_assume_spec` (socket cork/uncork/quickack,
managed-cork query, session-id generation, cache permission, resume
decrypt). The CAV 2018 paper states the analogous HMAC boundary
plainly:

> When the verifier comes across a call to one of these hash functions
> in the C code, it will instead use the provided specification. The
> result is that our proof assumes correct implementation of the hash
> functions.

**(b) The spec↔spec half is bounded.** `prove_state_machine` proves
`tls12rfcSimulatesS2N` and `tls13rfcSimulatesS2N` instantiated at
`` `{16} ``. In `rfc_handshake_tls12.cry` and `s2n_handshake_io.cry`
both traces are `take`-prefixes of length `n` **[ran]**. The statement
is universally quantified over connections and parameters but compares
only the first sixteen messages. This is a bounded trace equality, not
an inductive invariant — and it is the field's best-known instance of
"state machine proved to match its spec, in CI".

**(c) The negative controls exist and are *not* in the per-commit
gate.** `tests/saw/Makefile` defines `failure-tests`, which patches the
C with five planted defects — `tls_early_ccs`,
`tls_missing_full_handshake`, `sha_bad_magic_mod`, `cork_one`,
`cork_two` — and asserts SAW fails, grepping the log for
`error: in _SAW_verify_prestate` (or `error: in llvm_ghost_value` for
cork). But `failure-tests` is reached only through `TESTS=sawHMACPlus`
or `TESTS=sawHMACFailure` in `s2n_codebuild.sh`, and neither value
appears in `buildspec_generalbatch.yml` **[ran]**. The gate that runs on
every commit does not re-check that the prover can still fail.

The CAV 2018 paper explains why those controls exist, verbatim:

> Such tests are critical, both to display the value of the proofs, by
> providing them with realistic bugs to catch, and as a defense against
> possible bugs in the tool that may be introduced as it is updated.

**Maintenance data — the number worth remembering.** From CAV 2018:

> Since deployment of the proof to the CI system in November of 2016 our
> proofs have been re-played 956 times. This number does not account for
> proof re-plays performed in forks of the repository. We have had to
> update the proof three times. In all cases the proof update was
> complete before the code review process finished.

and the up-front cost:

> HMAC and DRBG each took roughly 3 months of engineering effort. The
> TLS handshake verification took longer at 8 months, though some of
> that time involved developing tool extensions to support reasoning
> about protocols.

The structural reason maintenance was cheap is stated too, and it is the
single most transferable design lesson in the whole survey:

> The fact that the structure of the low-level Cryptol specification
> matches the structure of the C code, coupled with SAW's use of SMT as
> the primary mechanism for discharging verification conditions, enables
> a proof that continues to work through a variety of code changes.

**Wall clock.** The SAW job runs in AWS CodeBuild and its duration is
not public. The CBMC gate *is* public, and I measured it: eight recent
successful runs of `proof_ci.yaml`, 2026-08-14, took **17–22 minutes**
each on a 64-core runner **[ran]**
(`reference/.../measured-ci-durations.txt`). Duration is
`updated_at - run_started_at` and includes provisioning.

### 3.2 VerifiedSCION — a live Gobra gate on every push and PR

`viperproject/VerifiedSCION` (Apache-2.0, pushed 2026-08-16) runs
`.github/workflows/gobra.yml` on `push` to `master` and on
`pull_request`. Three jobs, 20 `viperproject/gobra-action@main` steps,
per-step timeouts of 5m ×12, 7m, 10m ×4, 25m, 30m, and **6h** for the
`router/` package **[ran]**.

Measured: the last successful `master` run before retrieval,
2026-08-11, took **52m 37s** wall clock **[ran]**.

But the precedent has a caveat that matters more than the timing. The
paper describes how the annotated code lived:

> We then switched to a different mode, where we ported changes in the
> SCION repository into our code base every week, such that the
> annotated implementation stayed in sync with the current SCION code
> base. We fixed the version of the code base prior to the submission in
> order to have a stable target. A logical next step is to merge our
> annotations into the SCION code base; we are currently discussing this
> step with the various stakeholders.

The verification gate runs in a **verification fork**, not in the
upstream project's CI. Upstream SCION developers do not have to keep the
proof green to merge. That is a materially weaker form of "in CI on
every commit" than s2n's, and materially weaker than what REF-9's
standing law demands.

### 3.3 What happens when a proof breaks

- **s2n:** three proof updates in 956 replays, each completed inside the
  code-review window (§3.1). The blocking-ness is structural: the SAW
  job is a CodeBuild batch entry on `pull_request_target`.
- **VerifiedSCION:** "Porting changes to our code base requires
  annotating new parts and often adapting annotations of changed code,
  for instance, to adjust loop invariants. In this process, we benefit
  greatly from the fact that our program verification technique verifies
  each function independently. This modularity confines the adaptations
  to a local scope and avoids adapting or re-verifying the unaffected
  parts of the code base."
- **Perennial** (as a whole-proof-CI datum, adjacent not on-point): six
  recent successful runs of `.github/workflows/ci.yml` took **38–40
  minutes** **[ran]**.

---

## 4. The honest cost comparison for *our* seam

### 4.1 What DEV-674/675 actually left us

Mechanically measured on this machine **[ran]**
(`reference/.../subset-census.txt`):

| lane | file | lines | role |
|---|---|---|---|
| Go | `proto/go/protod/protocol_step.go` | 384 | the pure fill/close/transition kernel |
| Go | `go/canonical/canonical.go` | 398 | RFC 8785 canonical bytes + digest |
| | **Go total** | **782** | |
| TS | `packages/moves/src/kernel.ts` | 450 | the E2 move calculus |
| TS | `packages/moves/src/wire.ts` | 211 | wire surface |
| TS | `packages/core/src/jcs.ts` | 384 | RFC 8785 canonicalizer |
| | **TS total** | **1,045** | |

Line counts are `split("\n")` counts from the census script, one higher
than `wc -l` for newline-terminated files; the `wc -l` totals are 780 and
1,042. Nothing below turns on the difference.

For scale: the `proto/` tree's non-test `.go` files total 7,854 lines
**[ran]**. The concentration is real — roughly a tenth of the Go lane
carries the semantics.

The canonicalizer is included deliberately and must not be waved off.
`protocolFillStep` decides repeat-versus-conflict at
`protocol_step.go:159` by `bytes.Equal(filledBytes, valueBytes)` over
canonical bytes; `canonicalBytes` (`proto/go/protod/scheme.go:41`) is
`json.Marshal` composed with `canonical.Canonicalize`. If the
canonicalizer is not in the verified region, the seam's most
consequential comparison is unverified — which is REF-2's whole point.

### 4.2 What the concentration does and does not change

**It does change the size verdict.** 782 lines is inside the range Gobra
has demonstrably handled: AWS's Diodon Core is reported at roughly a
thousand lines in under three person-months (carried from
`docs/research/2026-08-15-gobra-survey.md`; **not** re-verified against
`arXiv:2507.00595` here — treat the figure as a lead). At VerifiedSCION's
measured rate (4,700 lines / ~2.5 person-years) 782 lines is ~0.4
person-years, and at 2.8:1 the annotation burden is ~2,200 lines. That
is a real number, not a wall. **This is the strongest version of the
rival, and it deserves to be stated in these terms rather than dismissed
by size.**

**It does not change the difficulty verdict.** The census
**[ran]** shows what those 782 lines contain: 18 `any`-typed sites
carrying decoded-JSON dynamic values, 8 `encoding/json` call sites, 50
string-typed sites, 2 `float64` sites, a `strconv.ParseFloat`, and
`unicode/utf16` surrogate handling. Against Gobra's documented
partial-stdlib list (`encoding/binary`, `net`, `strconv`, `strings`,
`sync`, `time`) and its own statement that string support "is very
limited", every one of those is a trusted-spec obligation or a rewrite.
VerifiedSCION paid 2,400 lines of trusted stdlib specs for a router that
never parses JSON.

**It does not change the arity verdict, and this is decisive.** The
concentration produced *two* pure routines, one per runtime, not one.
Verifying-existing costs 782 Go lines through Gobra **and** 1,045 TS
lines through a tool that handles ES5 JavaScript and topped out at ~200
lines. Extraction replaces both with one artefact.

**And it makes extraction cheaper than it was.** A stateless
`step(stateBytes, opBytes) → (stateBytes', receiptBytes)` (D-d) is a
drop-in for exactly the shape `protocolFillStep`/`protocolCloseStep`
already have: pure, total, no I/O, no mutation of its input (the
transition's own comment states "the transition never mutates its
input"). The engineering that made verify-existing plausible is the same
engineering that made cutover mechanical.

### 4.3 Side by side

| | Verify existing (Gobra + Gillian-JS) | Extraction (REF-6/REF-7) |
|---|---|---|
| Target size | 782 Go + 1,045 TS lines | one generated kernel |
| Toolchains | 2, unrelated | 1 |
| Link to `verify/moves` | **hand restatement, unverified** (SCION's own words) | the proved definitions *are* the kernel |
| Implementations left running | 2 hand-written | 1 generated |
| D-e obligation 2 (divergence = 0) | achievable in principle | achievable |
| D-e obligation 3 (running seam *is* the generated kernel) | **impossible by construction** | the point of the slice |
| Up-front effort, best anchor | ~0.4 py Go (SCION rate) + unknown TS; s2n's comparable 8-month handshake proof | REF-0 spike + REF-6 |
| Per-commit wall clock, measured peers | 52m (SCION Gobra); 17–22m (s2n CBMC); 38–40m (Perennial) | unmeasured; REF-0 spike will say |
| Added to trusted base | Viper/Silicon/Z3, Gobra's Go front end, ~2,400-line-class stdlib specs, Gillian-JS + its ES5 compiler + axiomatised builtins, **and the hand restatement of the Lean model in two annotation languages** | Lean's C backend, the wasm toolchain, wazero, Bun's WASM host (already enumerated in draft 17's trusted base) |
| Reversal cost | delete annotations; code unchanged | re-instate hand seams from git history |

### 4.4 The argument the field itself makes for the other side

The strongest published case *against* extraction is s2n's own, and
honesty requires quoting it in full (CAV 2018, §1):

> In order to realize the second goal, verification must continue to
> work with low effort as developers change the code. While fundamental
> advances have been made in recent years in the tractability of full
> verification, these techniques generally either: (1) target a fixed
> version of the software, requiring significant re-proof effort
> whenever the software changes or, (2) are designed around synthesis of
> correct code from specifications. Neither of these approaches would
> work for Amazon as s2n is under continuous development, and new
> versions of the code would not automatically inherit correctness from
> proofs of previous versions.

This is the sharpest challenge to REF-6/REF-7 in the literature, and it
must be answered rather than deflected. The answer is that the premise
differs: at Amazon **the code** is the artefact under continuous
development by a distributed team who will not accept generated C in a
TLS library. At foldlab **the model** is the artefact under continuous
development (the operator's stated constraint that the model is never
final), and the seam code is ours to regenerate. Under s2n's premise,
synthesis loses because the humans own the code. Under ours, synthesis
wins for the same reason — the humans own the model, and REF-9 exists to
make the regeneration automatic rather than "significant re-proof
effort".

The corroborating datum is Cedar, our nearest structural peer:
`cedar-policy/cedar-spec` (Apache-2.0, pushed 2026-08-14) has a Lean
model of exactly our kind, and it did **not** verify its production
Rust. It keeps `cedar-drt/` (differential + property-based fuzzing
against the Lean spec — the pattern VERIFICATION.md already cites for
S7) and it added `cedar-lean-ffi/`: "Rust bindings for interacting with
the Lean formalization of Cedar", built by `./build_lean_lib.sh` and
linked against `libleanshared.so`. The peer that started where we are
went to *calling the Lean model*, not to verifying the hand-written
implementation.

### 4.5 Frama-C / ACSL / VST — named, and out of scope by ratification

Frama-C is alive (latest release **33.0 "Arsenic"** per its download
page; the GitHub mirror `Frama-C/Frama-C-snapshot` was last pushed
2020-10-21 and carries no detected license **[ran]**). VST is alive
(`PrincetonUniversity/VST`, pushed 2026-08-04 **[ran]**). Both verify
**C**, and neither has a Go or TypeScript frontend.

They therefore bear on RQ-4 only in the counterfactual where the kernel
is hand-written C — which D-a named and killed on 2026-08-16
("hand-authoring where generation is possible"). Verifying the
*extracted* C is not a live option either: Lean's backend emits code
against the Lean runtime, not the small self-contained C these tools
target. **Recording them as adjacent, not on-point, is the honest
placement**; presenting them as a live alternative would be the padding
this dispatch forbids.

---

## 5. Verdict

**No change to REF-6/REF-7.** D-a, D-bc, D-d and D-e all stand.

The verdict is not "the alternative is impossible". It is:

- the alternative is **affordable on the Go side alone** (~0.4 py at the
  SCION rate for 782 lines) and **not affordable on the TS side at all**
  (the frontier is ~200 lines of ES5 JavaScript with types elided);
- it **cannot satisfy D-e obligation 3** at any price, because that
  obligation is about *which code runs*, not about what is proved of it;
- and its prover↔verifier link is, in the best published instance, a
  hand translation its own authors label unverified — a silent drift
  channel of exactly the kind the program's standing law was written to
  forbid.

Extraction remains correct for us, and the reason is now stated rather
than assumed.

---

## 6. Recommendations, each with cost, trusted-base delta, and reversal

**R1 — Record in VERIFICATION.md's REF-7 trusted-base paragraph that the
verify-existing road was assessed and rejected, citing this report.**
*Cost:* one paragraph; a maintenance obligation to update it if Gobra or
Gillian-JS materially change. *Trusted base:* nothing added — this is a
claim about a decision, not a component. *Reversal:* delete the
paragraph. (This overlaps RQ-2's remit for the trusted-base wording;
RQ-2 owns the paragraph, this is one input to it.)

**R2 — Adopt s2n's negative-control technique at REF-6, and put it
*inside* the per-commit gate rather than beside it.** REF-6 already
requires "at least three planted mutants at the kernel level, each
killed by a named vector". s2n adds two things we do not have: the
mutants are **realistic defects drawn from the code's own history** —
CAV 2018 lists "a version modified to allow early CCS, as well as a
version with the incomplete handshake bug that we discovered in the
process of developing the proof" — and the check asserts a **specific
failure message**, not merely a nonzero exit. And s2n's own arrangement shows
the anti-pattern to avoid: their `failure-tests` target is not in the
per-commit batch **[ran]**, so the gate that runs on every commit never
re-checks that the prover can still fail. *Cost:* the mutants must be
generated, not hand-written, to respect the 2026-08-15 ruling; asserting
on a refusal *name* rather than an exit code couples the gate to the
kernel's refusal vocabulary, which then cannot change silently — that
coupling is a feature but it is a cost. *Trusted base:* nothing added;
this is a gate, not a component. *Reversal:* delete the mutant roster
and its assertions; the positive gate is unaffected.

**R3 — Adopt s2n's structural lesson for REF-1's file layout: make the
Lean wire model's structure mirror the wire operations one-for-one, so
that a code change that does not change the computation does not change
the proof.** This is the mechanism CAV 2018 credits for three proof
updates in 956 replays. *Cost:* it constrains REF-1's freedom to
abstract — the temptation to state the model at a prettier level than
the wire must be resisted, and a prettier model would be easier to prove
about. *Trusted base:* nothing added. *Reversal:* refactor the model;
the theorems' statements would need re-pinning under REF-3's sha-freeze,
which is exactly the friction the freeze exists to create. This
recommendation should be handed to RQ-8, which owns the layout question
at REF-1 dispatch (grill-record amendment 7).

**R4 — Do not treat "bounded trace equality" as an acceptable form for
our refinement equation, and say so where the equation is stated.**
s2n's state-machine correspondence holds for sixteen messages **[ran]**;
draft 17's equation `translate (wireStep s op) = modelStep (translate
s) (translate op)` is per-step and unbounded, which is *stronger* — a
genuine advantage of our position that will be invisible unless it is
recorded. *Cost:* none beyond a sentence, but the sentence creates an
obligation: if REF-3 ever weakens to a bounded statement, the ledger row
must change. *Trusted base:* nothing added. *Reversal:* delete the
sentence.

**R5 — Reject a "Gobra as a second opinion on the Go seam" half-measure
if it is proposed.** It looks cheap (782 lines, ~0.4 py) and it is the
most likely form in which this road comes back. It should be refused
because it creates a *third* statement of the semantics — Lean model,
Go code, Gobra annotations — with an unverified hand translation between
the first and third, and D-e's divergence-zero obligation would then be
measured against which of the three? *Cost of the refusal:* we forgo the
memory-safety and race-freedom properties Gobra would give for free on
`protocol_step.go`. Those are real and we are not getting them another
way; Go's runtime gives memory safety but not data-race freedom.
*Trusted base:* refusing adds nothing. *Reversal:* the option remains
open after REF-7, aimed at the *shell* (transport, storage) rather than
the seam, where a third statement of semantics is not at stake.

---

## 7. What the surveyed material does NOT answer for our seam

Stated as gaps, not glossed.

1. **Nobody has verified a JSON canonicalizer.** Every case study found
   verifies either cryptographic primitives (HMAC, DRBG, SHA), a packet
   parser over fixed-width binary layouts (SCION, AWS Encryption SDK
   headers), or a protocol state machine over an enumerated message
   alphabet. Our seam's decisive comparison is canonical-byte equality
   over *arbitrary JSON values*, including IEEE-754 numbers and UTF-16
   surrogate pairs. No surveyed project has a comparable obligation, so
   none of their effort figures transfer to `canonical.go` / `jcs.ts`.
   This is RQ-9's territory and RQ-4 cannot bound it.
2. **No published cost figure exists for verifying a TypeScript program
   of our size.** The frontier is ~200 lines of ES5 JavaScript with
   types elided. Extrapolating to 1,045 lines of generic TypeScript
   would be invention. The honest statement is that the number is
   unknown because nobody has done it.
3. **The s2n SAW job's wall-clock time is not public.** It runs in AWS
   CodeBuild. I measured the CBMC gate (17–22 min) and the SCION Gobra
   gate (52 min) but the closest-analogue job's duration is unavailable,
   so REF-9's cycle-time budget cannot be set from it.
4. **Neither Gobra nor Gillian-JS was executed on this machine.** Java
   is not configured under mise and SAW is not installed **[ran]**;
   Docker is available but pulling `ghcr.io/viperproject/gobra` and
   getting a real verdict on `protocol_step.go` is a separate spike, not
   a research pass. Every claim about what Gobra would accept is
   therefore *documentary*, from the tool's own tutorial and issues, not
   executed. The subset census is a lower bound on the friction, not a
   verdict.
5. **No precedent exists for the specific gate D-e ratified.** Nothing
   surveyed re-verifies a *documented status claim* at HEAD. s2n gates
   the proof; it does not gate a sentence in a ledger asserting that the
   proof holds. RQ-5 owns this; RQ-4 found no prior art for it in the
   verify-existing literature either.
6. **The "verify the extracted artefact instead" question is untouched
   here.** Whether a WASM kernel could be checked against the Lean model
   post-hoc (translation validation on the emitted module) is RQ-3/RQ-7
   territory. This report deliberately did not chase it, and the absence
   of an answer here should not be read as an absence of an option.
7. **No evidence was found either way on whether a Gobra proof survives
   a *model* change.** All published maintenance data measures proofs
   surviving *code* changes. REF-9's premise is the opposite direction —
   the specification moves and everything downstream must follow. The
   s2n structural lesson (§3.1) is the closest thing to guidance and it
   was designed for the other direction. RQ-8 owns this gap.

---

## Independent verification — 2026-08-16

Adversarial re-check by a second agent. Every source below was re-fetched
from its primary location on 2026-08-16; nothing was taken from the report
body or its reference area on trust. Repository claims were re-read at the
pinned SHAs; PDFs were re-extracted locally; the census script and the three
GitHub API calls were re-executed and diffed against their transcripts.

**Result: 0 refuted, 0 invented APIs.** The decisionImpact conclusion
("no change to REF-6/REF-7; D-a, D-bc, D-d, D-e all stand") survives a
direct attempt to refute it. Nine defects are recorded below; none is
load-bearing on the verdict, and one of them (V6) narrows a gap the report
claims against REF-6.

### Load-bearing claims

| # | Claim | Source re-fetched | Verdict | Evidence |
|---|---|---|---|---|
| 1 | SAW gate runs per push/PR via CodeBuild, not via `proof_ci.yaml` | `aws/s2n-tls` @ `72f5db1f`: `codebuild.yml`, `start_codebuild.sh`, `buildspec_generalbatch.yml`, `s2n_codebuild.sh`, `proof_ci.yaml` | **CONFIRMED** | 31 `identifier:` entries, exactly one `s2nSawTls` with `SAW: true`/`TESTS: tls`; `s2n_codebuild.sh` line 112 matches the quoted line character-for-character; `proof_ci.yaml` header is `# CBMC starter kit 2.10` / `name: Run CBMC proofs`; the `BUILDS` array contains `s2nGeneralBatch`. See V3 for a qualification on "every PR". |
| 2 | Negative controls exist and are outside the per-commit batch | same commit: `tests/saw/Makefile`, `buildspec_generalbatch.yml`, all other `codebuild/spec/*.yml` | **CONFIRMED** | `failure-tests` (Makefile line 93) builds exactly `tls_early_ccs`, `tls_missing_full_handshake`, `sha_bad_magic_mod`, `cork_one`, `cork_two`; the `error: in _SAW_verify_prestate` grep is at lines 111 and 118, `llvm_ghost_value` at 125. Zero hits for `sawHMAC`/`sawDRBG`/`sawHMACPlus`/`sawHMACFailure` in the batch. **Strengthened:** `TESTS=ALL` also reaches `failure-tests` (`s2n_codebuild.sh` line 100), and I checked the other nine buildspecs launched by `start_codebuild.sh` — none of them sets `TESTS` at all, so no per-commit path reaches it. |
| 3 | State-machine correspondence is bounded trace equality at sixteen | `tests/saw/spec/handshake/handshake.saw`, `rfc_handshake_tls12.cry`, `s2n_handshake_io.cry` | **CONFIRMED** | ``prove_print (w4_unint_z3 []) {{ tls12rfcSimulatesS2N `{16} }}`` and the tls13 twin, verbatim. `traceRFC params = take (map message (iterate (handshakeTransition params) clientHelloSent))`. Minor: `traceS2N` is `normalizeAfterData (take (...))`, not a bare `take` — immaterial to boundedness. |
| 4 | The one sound prover-to-Gobra link calls its own linking step unverified | `arxiv.org/pdf/2405.06074v1`, re-extracted with `pypdf` 6.15.0 | **CONFIRMED** | Sentence verbatim in section 3.4 *Assumptions*, under the run-in heading "Tool soundness." All adjacent figures verbatim: 4,700 / 13,400 / 900 / 2,400 / 2.8 / roughly 2.5 person years / "three hours on a commodity laptop". The three Gobra workarounds and the 332-functions / 12 / 12 / 3 residual-gap sentences also verbatim. Authors: Pereira, Klenze, Giampietro, Limbeck, Spiliopoulos, Wolf, Eilers, Sprenger, Basin, Müller, Perrig (ETH Zurich). |
| 5 | Goose declares translator and semantics trusted; repo archived | `goose-lang/goose` README @ `7434b9c1`; `gh api repos/goose-lang/goose` | **CONFIRMED** (with V1) | "The translator and semantics are trusted; you can view the process as giving a semantics to Go." verbatim at line 8 of the README at that commit. `archived: true`, `pushed_at 2026-04-07`, license MIT. `docs/writing-goose.md` line 29 and `docs/implementation.md` line 3 quotes verbatim. **But the banner is not at that commit** — see V1. |
| 6 | Gobra: "prototype verifier", strings "very limited", stdlib list without `encoding/json` | `viperproject/gobra` @ `782b530f`: `README.md`, `docs/tutorial.md` | **CONFIRMED** | README line 6 and tutorial lines 38 and 448 verbatim; line 38 is indeed inside an HTML comment, as the report discloses; `grep -c encoding/json docs/tutorial.md` returns 0. `select` issue #902 open 2025-03-31, generics PR #671 open 2023-08-24, both confirmed via API. **Independently corroborated, more strongly than the report does — see V7.** |
| 7 | Gillian/JaVerT CAV 2021: ~200 loc, types elided, ES6 to ES5, builtins axiomatised, no higher-order | `giltho.github.io/publications/GillianCAV2021.pdf`, re-extracted | **CONFIRMED** | "(~200loc for JS, ~950loc for C)" verbatim; the whole "JS Verification: Caveats. Our JS verification is correct up to the following caveats…" paragraph verbatim through "…injective function from raw bytes to JS strings." Gillian README @ `b195dfc3` line 12 is the quoted ES5 line; `Gillian-JS/` was last touched by that same commit (API-confirmed). JaVerT2.0's README opens `# Deprected - Please use Gillian-JS instead`. |
| 8 | TypeScript disclaims soundness; spec archived; `doc/` gone | `TypeScript-Design-Goals.md`; `gh api .../commits/30cb2043`; `gh api .../contents/doc` | **CONFIRMED** | Non-goal item 3 verbatim. Commit `30cb2043` (2020-09-04) shows `doc/spec.md` renamed to `doc/spec-ARCHIVED.md` plus four renamed Word/PDF files, all status `renamed`. `contents/doc` returns HTTP 404. |
| 9 | 782 Go / 1,045 TS lines; 18 `any`, 8 `encoding/json`, `ParseFloat`, utf16 | `bun docs/research/reference/rq4-verify-existing-implementations/subset-census.mjs`, re-run from repo root | **CONFIRMED** | Output reproduces the transcript **byte-identically**. 8+10 = 18 `any`; 1+7 = 8 `json.[A-Z]`; 1 `strconv.ParseFloat`; 4 utf8/utf16; 34+2 = 36 function-typed sites. `wc -l` gives 383/397/449/210/383, i.e. 780 and 1,042, exactly as the report states. `protocol_step.go:159` is `if bytes.Equal(filledBytes, valueBytes) {`; `scheme.go:41` is `func canonicalBytes(value any) ([]byte, error) {`; `proto/` non-test Go totals 7,854 lines. Arithmetic re-derived: 782/4700 × 2.5 = 0.416 py; 782 × 2.8 = 2,190; 1045/200 = 5.2×; 782/7854 = 10.0%. Label defects in the TS probes: see V4 and V5. |
| 10 | Measured CI wall-clock on three peers | three `gh api` calls, re-run | **CONFIRMED** | All three responses reproduce the transcript identically. s2n CBMC: 17m26s to 22m30s across the eight successes of 2026-08-14. VerifiedSCION `master` 2026-08-11: 22:08:21Z to 23:00:58Z = **52m37s**. Perennial: 38m02s to 40m17s. `gobra.yml` re-read at `master`: 3 jobs, 20 `viperproject/gobra-action@main` steps, timeouts 5m ×12, 7m, 10m ×4, 25m, 30m, 6h — exactly as stated. |

### Sampled beyond the list

Also re-verified and **CONFIRMED**: CAV 2018's five quotations (956 replays / three updates; 3-month HMAC and DRBG, 8-month handshake; "Such tests are critical…"; "The fact that the structure of the low-level Cryptol specification matches the structure of the C code…"; the section 1 passage against synthesis), authors Chudnov, Collins, Cook, Dodds, Huffman, MacCárthaigh, Magill, Mertens, Mullen, Tasiran, Tomb, Westbrook; the eight `crucible_llvm_unsafe_assume_spec` overrides in `handshake.saw`; `tls/s2n_handshake_io.c` at 77,995 bytes; Cedar's `cedar-lean-ffi/build_lean_lib.sh` and the `libleanshared.so` note in its README, plus the "Rust bindings for interacting with the Lean formalization of Cedar" line; Frama-C 33.0 "Arsenic" on the download page; `Frama-C-snapshot` pushed 2020-10-21 with license `null`; VST `NOASSERTION` pushed 2026-08-04; JSCert `NOASSERTION` pushed 2024-02-05; KJS license `null` pushed 2016-10-13; `formal-land/coq-of-js` HTTP 404; Perennial MIT, pushed 2026-08-10, master `aa4b4b61`, README section "New goose" describing the backwards-incompatible migration under `new/`; VerifiedSCION Apache-2.0 pushed 2026-08-16 with `on: push[master]` plus `pull_request`. Draft 17's D-a, D-bc, D-d and D-e, its REF-6 mutant requirement, and the refinement equation at line 52 all read as the report characterises them; grill-record amendment 7 (wire-model home moves to REF-1 dispatch, informed by RQ-8) confirmed.

**Absence claims re-tested, not refuted.** Independent searches for a TypeScript deductive verifier and for a Lean 4 to Go verification bridge returned nothing on-point (the nearest 2026 hits — Velvet, an in-Lean verifier for imperative programs; the SVIL 2026 workshop — have no Go or TypeScript frontend). The report's section 1.3 and section 2.3 absences stand.

### Defects

- **V1 — the Goose banner is misattributed.** Section 1.2 says "the archived README" at `7434b9c1` "carries the banner *Development for this repository has moved to mit-pdos/perennial*". It does not: at `7434b9c1` (branch `master`) the README begins with the title and CI badges and no banner. The banner exists only in `README.md` on the repository's **default branch, `new`**. The trusted-translator sentence *is* verbatim at `7434b9c1`. Substance intact, citation wrong.
- **V2 — the s2n YAML excerpt is reformatted, not verbatim.** Section 3.1's fenced block prints `identifier: s2nSawTls` above a more-indented `variables:` block. In the source the order is inverted and the indentation differs (`env:` then `variables:` then the settings, with `identifier: s2nSawTls` last, at the entry level). As printed it is not parseable YAML. The facts it asserts are correct.
- **V3 — "every push and every PR" overstates the PR half.** `codebuild.yml` starts CodeBuild on `pull_request_target` only after querying `GET /repos/{repo}/collaborators/{author}/permission` and finding `admin` or `write`; otherwise it prints instructions for a maintainer to launch the build by hand. For external-contributor PRs the SAW gate does not run automatically. This weakens section 3.3's "the blocking-ness is structural" slightly.
- **V4 — two census probes over-count, against the README's stated direction.** `subset-census.mjs` counts "template literals" by matching raw backticks. `kernel.ts` has 22 backticks spread over 10 lines, so at most 11 template literals; section 2.2's "22 template literals **[ran]**" is roughly double. "Arrow functions" matches every `=>`, which includes function-*type* annotations (`kernel.ts:12` `export type Cmp<T> = (left: T, right: T) => Ordering`, and about twenty more in the `MoveAlgebra` interface) — types that are erased before any JS analysis, so counting them as ES6 syntax Gillian must rewrite double-counts. The reference README says "Regex counts are a *lower* bound"; for these two probes they are an upper bound. The argument does not turn on the magnitudes.
- **V5 — the Go "string operations" probe is mislabelled.** It counts occurrences of the type name `string` (including in comments), not operations on strings. Section 4.2's own wording ("50 string-typed sites") is accurate; the census line's label is not. Same shape for "signed ints", which also matches bare `int`.
- **V6 — the gap named against REF-6 is partly already closed.** Draft 17's REF-6 gate list already reads "…no trap on any corpus row; **mutants die**; regeneration byte-identical…". So "the mutant roster must sit inside the per-commit gate" is satisfied as drafted. What is genuinely new in R2 is only (a) asserting a **named refusal** rather than a bare failure, and (b) drawing mutants from real defect history. The recommendation should be narrowed to those two before it reaches the REF-6 dispatch, or it will read as fixing something that is not broken.
- **V7 — the load-bearing stdlib evidence rests on a commented-out line when stronger evidence was available.** `tutorial.md` line 38 sits inside an HTML comment, meaning the maintainers withdrew it from the rendered tutorial; the report discloses this but still leans on it in the verdict's reason 4. Independent and uncommented corroboration exists and was not used: at `782b530f` the shipped stub tree `src/main/resources/stubs/` contains exactly `bytes`, `encoding/binary`, `errors`, `fmt`, `net`, `strconv`, `strings`, `sync`, `time` — **no `encoding/json`, no `sort`**. That is the artefact Gobra actually loads, and it confirms the claim harder than the comment does. Recommend citing the stub tree instead.
- **V8 — the report's own `UNVERIFIED` convention is declared and never used.** The preamble states that anything not confirmed by a primary source "is marked **UNVERIFIED** and treated as a lead"; the string appears nowhere else in the document. The two carried figures (Diodon Core at roughly a thousand lines in under three person-months; the Lean-to-Gobra GCD/`bigmod` characterization) are flagged as "not re-verified … treat as a lead" instead. This satisfies dispatch rule 1 but not the report's own stated notation; one of the two should change.
- **V9 — UNVERIFIABLE: whether the SAW CodeBuild batch is a required merge check.** Section 3.3 asserts the gate's "blocking-ness is structural". The repository shows only that the batch is *launched* on `pull_request_target` and `push`; whether its result is a required status check, and the CodeBuild project to buildspec mapping itself, live in AWS configuration outside the repository and cannot be confirmed from public data. The same boundary caps section 3.1(c): the claim is properly read as "no per-commit path *visible in the repository* reaches `failure-tests`", which is what I verified.

### Discipline compliance (against `scratch/dispatch/19-refinement-research-questions.md`)

Sources dated and commit-pinned throughout, yes. Leads separated from evidence, with the two carried in-house figures explicitly marked as not re-verified, yes (notation caveat at V8). Section 7, "What the surveyed material does NOT answer", present and specific, yes. All five recommendations carry cost, trusted-base delta and reversal, yes. Reference-area README records what each item is, where it came from, its license and the retrieval date, and states what was deliberately *not* vendored and why, yes. Every **[ran]** mark in the body has a transcript in the reference area, and both transcripts reproduce on re-execution, yes.
