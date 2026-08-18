# Slice close, 2026-08-18 — what stays open

The initial refactor slice (epic DEV-743 stages 1–3 plus the ninth and tenth
substrate probe suites) closed at main `75c0193e7`. Merged this slice: the
transport spine extraction with its table-driven gate suite (PR #86), the KV
watch probe suite (PR #87), the blob service split (PR #88), defect
classification — defects never wear the absence sort (PR #89), the tenth
probe suite for object-store semantics (PR #90), and the pull-form commons
pump bound (PR #92). Every PR carried a board review verdict; every charge
was applied before merge. This file records what the slice deliberately
leaves open, so the next slice starts from a list rather than a memory.

## The kernel model is not merged

PR #91 (branch `agent/kernel-model`) is held. The DEV-749 adversarial review
found a live blocker at the admission door: a trigger candidate referencing a
lane absent from the door's catalog is admitted, and the `Unlawful` predicate
does not name it — `translatePredicate` brands raw leaf identifiers without
catalog checks, trigger admission checks only the target program, and
`Unlawful.danglingRef` never sees trigger leaves. The owed repair:
catalog-check every leaf identifier the predicate translation touches (lane
and position sorts included), extend the dangling-reference law to trigger
leaves, and land the review's planted counterexample as a door control that
asserts refusal. The four commits added after the reviewed head (the repair
applicability marking and three projections) do not touch the door. The
branch also predates this slice's merges and needs a rebase onto main before
the repair lands.

## Security is unmapped, now on the map

The estate has no threat model. The operator ruled this slice that security
approaches enter the map as next-slice work. This slice's own evidence seeds
the list:

- The object store's whole-object digest is checked only at the last chunk:
  a reader is handed every byte of a tampered object before the refusal
  arrives, so any streamed prefix is unverified (FINDING-DEV730 series, PR
  #90). The estate's verify-on-read discipline at `Resolved.resolve` is the
  only oracle; nothing may relax it.
- Object-store metadata is written by the client and never checked by the
  server — it is not an integrity oracle and must never be treated as one.
- The NATS deployment posture is local development: no authn/authz threat
  model exists for a multi-tenant or networked estate. The DEV-716 ACL suite
  covers application-scope, not adversaries.
- The mcp_config Cloudflare Access secret is exposed in cleartext via
  `multica agent list` and its rotation is still owed (operator's act).

## Refactor wave, remaining stages

- DEV-737 (extract `casJoinLoop` per the G-2 contract) and DEV-739 (resolve
  cache on the verified resolve path) were held only for file conflicts with
  this slice's PRs; those files are merged, so both dispatch now.
- Stage 4: DEV-740 (the sorts sweep — canonical strings become concrete
  types). Stage 5: DEV-741 (matcher set, equivalence instances, Equal-digest
  coherence wall). Stage 6: DEV-742 (durable Catalog layer per R-4).
- DEV-745 (shuttle epic S1) was held until stages 1–2 landed; they have.

## Loose ends from the close itself

- The operator merged PRs #87–#90 with CI skipped; the local gates were run
  per-branch before each push (the plait battery green at every merged head),
  but the full CI lane has not stamped the final main. The next CI run on
  main is the confirmation.
- `ObjectStoreSemantics.test.ts` and the DEV-730 findings doc record that
  unwrapped `ENOTFOUND` handling was refused pending operator disposition
  during the PR #89 round (structural admission removed; the pinned error
  classes are the whole classification).
