# Q1 schema-confusion evaluation preregistration

Status: **PREREGISTERED.** This contract is committed before any evaluation
population is generated. Results do not amend it.

## Question

Does the kernel tool projection's compound digest naming produce more reliable
model calls than either bare field names or nested `{type,value}` references?
The comparison measures the locally available models on a fixed synthetic
battery. It does not claim a model-independent naming law.

## Fixed inputs

`verify/kernel/projections/tools.schema.json` is the base projection. The
harness refuses a base document that does not match the expected eight-tool
manifest and records its SHA-256 digest with every run.

Only properties whose base JSON Schema carries the digest pattern
`^sha256:[0-9a-f]+$` change between arms:

| Arm | Example |
| --- | --- |
| `compound` | `lane_digest: "sha256:..."` |
| `bare` | `lane: "sha256:..."` |
| `nested` | `lane: {"type":"lane","value":"sha256:..."}` |

The `bare` arm removes a terminal `_digest`; a property already named `digest`
stays `digest`. The `nested` arm uses those same bare property names and wraps
the digest. Fixed-sort slots constrain `type` to the slot's sort. The
kind-polymorphic `kernel_resolve.digest` slot constrains `type` to the base
kind enum and is scored against the sibling `kind` value. Descriptions, tool
names, non-digest fields, and all other constraints stay equal.

The candidate battery has eight rows, one per base tool:

1. declare a schema under a writ;
2. resolve a program;
3. emit a canonical body to a lane;
4. join a canonical contribution into a cell;
5. fold a reduction over a lane at an anchor;
6. decide a register at a fencing token;
7. trigger a head-advanced-past production;
8. spawn a child writ from parent and requested writs.

Every prompt carries the same candidate ledger. Candidate digests are distinct
64-hex SHA-256-shaped strings, so their intended semantic slots are mechanically
recoverable without a model judge. Each expected call is stated once in base
coordinates and projected by the same arm transformation as its schema.

## Population

The locally authenticated Claude CLI supplies two available model aliases:
`haiku` and `sonnet`. The harness records the canonical model version returned
by the provider rather than treating either alias as a durable version.

Each model/arm cell has five independent CLI generations. One generation
answers all eight battery rows, yielding 40 scored calls per cell and 240 calls
overall:

```text
8 tasks × 3 arms × 2 model aliases × 5 generations = 240 calls
```

The CLI exposes no seed or temperature control in this path. Runs are repeated
fresh with no session persistence. Eight calls produced by one generation are
not statistically independent; the report states both the 240-call count and
the 30 independent-generation count.

## Measures

All measures are mechanical and use one battery row as the denominator.

- **Valid-call rate:** exactly one response row names the battery task, selects
  its expected tool, and its arguments validate against that arm's projected
  tool schema. Candidate correctness is not part of this syntactic measure.
- **Field-confusion rate:** at least one planted candidate value occurs in an
  argument slot other than the expected semantic slot, or an expected planted
  candidate is absent from its slot. Missing, duplicate, or wrong-tool response
  rows count as confused because the intended fields were not populated.
- **Digest-in-wrong-slot rate:** at least one planted digest occurs outside its
  expected digest slot, including another digest slot, a non-digest slot, or a
  nested reference carrying the wrong `type`. Missing, duplicate, or wrong-tool
  rows count only when a returned digest can be assigned to a wrong slot; this
  measure does not turn total omission into a placement error.

The harness also reports counts for missing rows, duplicate rows, wrong tools,
schema-invalid arguments, and omitted expected candidates so the three rates
remain auditable.

Each binomial call-level rate carries a Wilson 95% interval. Intervals describe
this finite population; they do not correct for the eight-within-generation
correlation.

## Decision rule

The compound convention is supported for this population only if its valid-call
rate is no lower than both alternatives and neither confusion rate is higher.
A digest-in-wrong-slot regression vetoes an arm even when its valid-call rate is
higher. Exact ties and comparisons whose Wilson intervals overlap are reported
as inconclusive. No result from this sample licenses a claim about production
agents, long-horizon sessions, or later model versions.
