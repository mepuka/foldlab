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
