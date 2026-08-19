# DEV-813 prep: the stale-bound audit

**Seven rows carry the I-JSON safe-range bound, and all seven are stale.** The
sketch types every `Nat`-derived coordinate as
`{"type":"integer","minimum":0,"maximum":9007199254740991}`. A4 ruled on
2026-08-19 that identity fields carry exact integers and clients must not parse
them as doubles, so the ceiling is a wire-invented refusal the ruled domain
does not carry.

There are no `"type": "number"` rows and no float-flavoured constraints
anywhere in the sketch: the numeric staleness is entirely this one bound, on
these seven fields.

## The witness

`9007199254740993` — two to the fifty-third plus one — is a **gated** corpus
record:

```
packages/plait/src/kernel/KernelSchemas.generated.ts:259
  {"bytes":"9007199254740993","name":"big-integer","record":"canon","value":9007199254740993}

verify/unity/run.sh:434
  if [[ "$(grep -c '"value":9007199254740993' "$fixture")" -ne 1 ]]; then
    echo "GATE: FAIL — the corpus lost its past-the-safe-range integer witness"
```

`verify/unity/run.sh:425-432` states the ruling in the tree: "Format 2
deliberately leaves the double-safe integer range … Format 1's safe-integer
ceiling is retired here on purpose." `Unity/Canon.lean:207` carries the same
fact on the reader: `Nat` is arbitrary precision "which is what lets the
encoding vectors carry values past the double-safe range."

The model side agrees without qualification. `Position`, `Token`,
`LanePartition.shard` and the hole name are all `Nat`, and Lean's `Nat` is
unbounded. The sketch's ceiling exists nowhere in the model.

## The seven rows, with the corrected fragment

| # | field | model sort | as committed | corrected |
| --- | --- | --- | --- | --- |
| 1 | `kernel_fold.shard` | `LanePartition.shard : Nat` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | `{"type":"integer","minimum":0}` |
| 2 | `kernel_fold.anchor_floor` | `Position partition` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | `{"type":"integer","minimum":0}` |
| 3 | `kernel_fold.anchor_head` | `Position partition` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | `{"type":"integer","minimum":0}` |
| 4 | `kernel_decide.token_fence` | `Token register` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | `{"type":"integer","minimum":0}` |
| 5 | `kernel_trigger.hole` | `Nat` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | `{"type":"integer","minimum":0}` |
| 6 | `kernel_trigger.shard` | `LanePartition.shard : Nat` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | `{"type":"integer","minimum":0}` |
| 7 | `kernel_trigger.position` | `Position partition` | `{"type":"integer","minimum":0,"maximum":9007199254740991}` | `{"type":"integer","minimum":0}` |

The correction is the same edit seven times: delete `maximum`, keep
`minimum: 0`. `minimum: 0` stays because it is a real model fact — `Nat` is
non-negative — and is the one numeric constraint the carrier map can source.

## The `$comment` that must move with them

The file header states the retired lean verbatim:

> integers only (I-JSON safe range; no floats exist in the canonical grammar)

The second half is still true and the first half is not. The replacement the
A4 ruling dictates is that integers are exact and unbounded and clients must
not parse them as doubles. That sentence is authored prose with no model
source, so it belongs in the same reviewed manifest as the rest of the wire
convention, and it is the sentence the `§11a` ruling-3 edit rides on — the
grill sheet records "A4's §11a edit with DEV-813's recut."

## What the audit does not find

No row is typed `"number"`. No `multipleOf`, `exclusiveMinimum`, or
`exclusiveMaximum` appears. No doubles-flavoured constraint exists outside the
seven `maximum` values above. The staleness is narrow and the repair is
mechanical; what is not mechanical is where the corrected fragment is written
down, which is the same open question the naming and carrier tables raise.
