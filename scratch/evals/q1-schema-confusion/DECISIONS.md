# Q1 schema-confusion evaluation decisions

## D1 — Transform only digest-patterned properties

- **Decided:** Project only base properties carrying
  `^sha256:[0-9a-f]+$`; leave every other property byte-for-byte equivalent.
- **Alternatives:** Rename every identifier-looking field; author three
  independent tool suites.
- **Why:** The question concerns digest references. Derivation from one base
  avoids introducing unrelated schema differences or a second authored tool
  surface.
- **Load-bearing:** Yes. It defines what the experiment varies.

## D2 — Bare means the digest suffix is absent

- **Decided:** Remove a terminal `_digest` and otherwise retain the base field
  name. A base field already named `digest` remains `digest`.
- **Alternatives:** Replace every digest field with `value`; replace each field
  with its referenced kind regardless of semantic role.
- **Why:** Suffix removal directly compares `schema_digest`-style compound
  naming with `schema`-style naming while preserving role distinctions such as
  parent versus request.
- **Load-bearing:** Yes. It fixes the alternative under test.

## D3 — Nested references carry the semantic sort and the digest value

- **Decided:** The nested arm uses `{type,value}` under the bare field name.
  Fixed slots constrain `type` to the slot sort; `kernel_resolve` uses the base
  declaration-kind enum.
- **Alternatives:** `{kind,digest}`; an unconstrained `{type,value}` object;
  nesting under the compound field name.
- **Why:** The issue names `{type,value}`. Constraining `type` gives the
  decomposition the machine-checkable kind information it is meant to buy,
  while sharing outer names with the bare arm isolates that information.
- **Load-bearing:** Yes. It fixes the second alternative under test.

## D4 — Use two authenticated model aliases and five batch generations

- **Decided:** Run `haiku` and `sonnet`, five fresh generations per arm, with
  all eight tasks in each generation.
- **Alternatives:** One model; one CLI process per task; the unauthenticated
  local OpenAI client.
- **Why:** Two available aliases expose model dependence. Batch generation
  keeps the one-day evaluation affordable while preserving five fresh samples
  per model/arm cell. The local OpenAI client returned HTTP 401 and is not an
  available population source.
- **Load-bearing:** Yes. It fixes the population and its dependence bound.

## D4a — Ten generations per cell, superseding D4's five (round 2)

- **Decided:** Ten fresh generations per model/arm cell, 480 calls over 60
  generations.
- **Alternatives:** Keep five; raise to twenty; drop a model alias to buy depth.
- **Why:** Round 1's comparison rested on ten varying calls per arm while
  quoting a denominator of eighty. Doubling the generations is the cheapest
  honest widening of the discriminating denominator; twenty was not worth the
  spend against a battery this small.
- **Load-bearing:** Yes. It fixes the power the decision rule is read at.

## D5 — Attribute each run to the primary billed model

- **Decided:** Preserve the provider's complete `modelUsage` map and identify
  the run's canonical model as the entry with the greatest reported USD cost.
- **Alternatives:** Trust the requested alias; take the first map entry; discard
  auxiliary-model usage.
- **Why:** Claude Code may report an auxiliary model beside the requested
  generation model. The primary generation dominates billed cost, while the
  full map keeps that inference auditable and avoids presenting a mutable alias
  as a version.
- **Load-bearing:** Yes. It determines the version label on result rows.

## D6 — The ledger is a projection of the base, not an authored list

- **Decided:** One ledger entry per digest-carrying slot of the base
  projection, keyed `<generator>.<slot>`, with the planted digest derived as
  `sha256(<key>)`.
- **Alternatives:** Keep round 1's nine hand-typed keys; key the ledger by the
  twelve generated declaration kinds; key it by generated builder field names.
- **Why:** Law 1 makes a private candidate shape a defect, and round 1's
  hand-typed ledger is why `trigger-head-position` named a referent no key
  carried. Keying by declaration kind was rejected because several slots share
  a kind — `spawn.parent` and `spawn.request` are both `Digest(policy)` — so
  one digest per kind would make the confusion between them unmeasurable.
  Keying by generated builder names alone was rejected because the sketch
  carries five digest slots the generated grammar does not name, which would
  leave required fields unfillable.
- **Load-bearing:** Yes. It is the repair of the round-1 blocker.

## D7 — Unresolved cross-walks are reported, never guessed

- **Decided:** Cross-walk each slot to `KERNEL_GENERATOR_FIELDS` by exact name,
  else by position when both sides declare the same number of digest fields,
  else leave it unresolved and publish it.
- **Alternatives:** Guess by description text; drop unresolved slots from the
  battery; hand-author the map.
- **Why:** A hand-authored map is the twin Law 1 refuses. Dropping the slots
  would leave required fields unfillable and hide the divergence. Five of
  thirteen slots do not resolve, and that is a finding about the sketch.
- **Load-bearing:** Yes. It bounds what the corpus authority covers.

## D8 — The task states its tool and the slot's role, not the slot's name

- **Decided:** Each task names its tool and, per digest slot, the ledger entry
  plus that slot's role taken verbatim from the base schema's own description.
- **Alternatives:** Prose instructions with the tool left to inference
  (round 1); name the property directly.
- **Why:** Descriptions are identical across arms, so the property name and
  shape become the only varying quantity. Round 1 left the tool to inference
  and a comprehension failure landed in a naming statistic. Naming the property
  would trivialise the question.
- **Load-bearing:** Yes. It is what makes the arms comparable.

## D9 — Omission and misplacement are disjoint; confusion is their union

- **Decided:** Two primitive measures that can each fire without the other,
  plus their union reported as a union. A planted digest sitting in its own
  slot unrequested is not misplacement.
- **Alternatives:** Keep round 1's three co-reported rates; keep the wider
  every-expected-scalar definition of field confusion.
- **Why:** Round 1's `field_confusion` and `digest_in_wrong_slot` never once
  disagreed across 240 calls and were presented as independent evidence. The
  wider definition also scored a benign re-serialisation of a canonical body as
  confusion, which its own preregistration did not license.
- **Load-bearing:** Yes. It fixes what the decision rule reads.

## D10 — Every decision-rule branch fixes an action

- **Decided:** Each branch of the rule names what happens to the projection's
  naming, including the inconclusive branch.
- **Alternatives:** Keep round 1's adjectives (`supported` / `inconclusive`).
- **Why:** A rule that fixes only the label leaves the consequence to be chosen
  after the data, which is the thing preregistration exists to prevent. The
  round-1 run landed on an unhandled branch.
- **Load-bearing:** Yes.

## D11 — The eval is its own install island, gated like `proto/ts`

- **Decided:** Own `bun.lock`, added to the gate's install preflight; `scratch`
  excluded from root test discovery with that exclusion under the runner's own
  self-test; five gate stages, two of which are the generated-artifact check and
  its negative control.
- **Alternatives:** Make it a workspace member; leave it ungated; graduate it
  into `packages/`.
- **Why:** Law 9 requires a `check:*` gate, byte-identical regeneration, and an
  executed negative control. Round 1 had none, and the root stage claimed tests
  whose `ajv` import no fresh clone could resolve — a `FOLDLAB GATES: PASS` row
  that was host-local. The dispatching issue and the round-2 charge both fix the
  harness in its own directory, so graduation into `packages/` is not this
  ticket's to make.
- **Load-bearing:** Yes. It is the repair of the Law 9 blocker.

## D12 — Round 1's population is void, not amended

- **Decided:** Regenerate the whole population under the round-2 battery;
  round-1 rates are not carried forward or compared against.
- **Alternatives:** Re-score round 1's raw records; report both rounds.
- **Why:** The battery and the ledger changed, so the round-1 records are
  answers to different prompts. Re-scoring them would be a different question
  wearing the same numbers.
- **Load-bearing:** Yes.
