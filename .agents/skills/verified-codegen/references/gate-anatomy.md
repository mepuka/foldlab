# Anatomy of a verification gate

A gate is one script, run with no arguments, that either prints a
named PASS line per arm and exits 0, or fails loudly naming exactly
which arm and why. Its value is that "is this artifact trustworthy?"
becomes a command instead of a review. The arms below are a catalog —
take the ones whose failure mode exists in your project, and be able
to say why you skipped the rest.

## Structural arms

- **Required-file roster.** Enumerate the files the package must
  contain; fail on absence. Catches partial checkouts and deletions
  that a build might survive silently.
- **Dependency and toolchain pins, asserted from BOTH sides.** The
  package asserts its own dependency set exactly (nothing extra, no
  network sources), and — when it depends on supposedly-frozen
  upstreams — asserts the upstream's own pins from the dependent side
  (their manifests unchanged, their sources byte-identical via
  `git diff --quiet -- <paths>`, no reverse references to this package
  in their build/gate files). Requiring must not become touching, and
  the gate is where that stays true mechanically.
- **Partition checks.** If the project separates concerns by file
  (definitions vs statements vs proofs; src vs generated vs tests),
  grep-enforce the separation: no `theorem` in a definitions file, no
  definitions in a proofs file, no hand edits in a `*.generated.*`
  file. Partition drift is how "generated" files quietly accrete
  hand-written content.

## Completeness arms (rosters)

- **Item roster with two-way diff.** Keep a committed list of the
  artifact's items (theorems, exported symbols, controls, vectors);
  discover the actual items by grep/AST at gate time; diff BOTH
  directions. One direction catches orphans (item exists, roster
  doesn't know it — it is escaping the checks); the other catches
  staleness (roster names a ghost).
- **Footprint sweeps.** Whatever your platform's notion of "what does
  this really depend on" is — axiom footprints, public API surface,
  import graphs — sweep it against an allowlist. This catches trust
  widening that no individual file review sees.

## Generated-artifact arms

- **Byte-identical regeneration.** Regenerate to a temp path, diff
  against the committed artifact. THE core arm for anything generated;
  also run the generator twice and compare, so nondeterminism is its
  own failure rather than a flaky diff.
- **Pinned header/count lines.** If the artifact declares counts or a
  header, pin the expected line in the gate. Yes, this means a schema
  change edits two places — deliberately: the gate line is the second
  factor that makes an accidental change loud.
- **Environment cross-check.** Where a checker can rebuild the
  artifact's claims from the compiler/environment (metaprogramming),
  run it as a gate arm. It guards the committed bytes against stale
  regeneration and tampering even when the generator itself is
  correct.

## Falsifiability arms

- **Executable controls with byte-pinned traces.** Each control runs a
  mutant (a wrong translation, a degenerate input, a dropped premise)
  and must print `verdict=refuted`; the full output line is committed
  and diffed, so the control's own behavior cannot drift silently.
  Include an orphan check: every committed trace must correspond to an
  exercised control and vice versa.
- **Must-not-compile controls with witness twins.** A file that must
  FAIL compilation/typechecking, paired with a witness file differing
  only in the lawful detail that must SUCCEED, plus pinned diagnostic
  lines. The twin is what proves the refusal is for the intended
  reason and not rot. (TypeScript variant: a negative tsconfig +
  expected-diagnostics trace; expect-error annotations are the weak
  form.)
- **Probe your arms when you build them.** Before trusting a new arm,
  make it fail on purpose: tamper one byte, plant one wrong row,
  mutate the source temporarily — confirm the arm fires with its own
  message, restore, and `cmp` the restoration. Record the probe
  results in your report. This is where self-comparison bugs (a check
  comparing a value to itself in disguise) are found, and experience
  says you have at least one.

## Reporting rules

- Quote the gate's actual PASS/FAIL lines in any report; paraphrased
  green is not green.
- Never state a count you didn't just compute.
- When a gate arm is intentionally absent, say so and say why — an
  absent arm someone assumed present is worse than no gate.
