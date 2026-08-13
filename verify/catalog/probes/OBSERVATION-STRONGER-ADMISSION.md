# OBSERVATION — a stronger admission law is available, and the model already satisfies it

Status: **OBSERVATION, not a finding.** Nothing here is a gate hole and
nothing here is refuted. The ratified model satisfies the stronger
property at every configuration checked. This note exists to put a
design question in front of the operator, with the evidence attached.

Raised 2026-08-13 by the BREAKER team, as a by-product of
`FINDING-BRIDGE-001` — while looking for the checkable content of
`Publish`'s refusal branch.

## The property

```tla
AdmittedStaysResolvableAtD ==
  \A d \in Daemons : \A k \in DOMAIN data[d] :
    data[d][k] \in ResolvableIds(d)
```

Every frame sitting in a daemon's data journal is resolvable **at that
daemon**, now — not merely, as the ratified `NoAdmissionOnFaith` says,
committed somewhere in the mesh.

Informally: *a daemon can always still explain the frames it admitted,
using only evidence it currently holds.*

## It holds, and it is strictly stronger

| Probe | Config | Property | Verdict |
|---|---|---|---|
| `X3-admitted-resolvable` | ratified, 2/2/2/1 | `AdmittedStaysResolvableAtD` | **clean**, 119,145 / 18,295 / depth 16 |
| `X4-admitted-reset-control` | same + `ResettingMirror = TRUE` | `AdmittedStaysResolvableAtD` | **violated, depth 6** |
| `X5-noadmission-reset` | same + `ResettingMirror = TRUE` | ratified `NoAdmissionOnFaith` | **clean**, 163,101 / 21,977 / depth 16 |

X3 says the ratified model already satisfies it. X4 with X5 says it is
strictly stronger than `NoAdmissionOnFaith`: over the *same* behaviours,
the ratified law survives and this one does not.

Logs: `probes/_runlogs/X3-admitted-resolvable.txt`,
`X4-admitted-reset-control.txt`, `X5-noadmission-reset.txt`.
Definition: `probes/BridgeFix.tla`.

## The 6-state witness (from X4, `ResettingMirror = TRUE`)

```text
1. initial          all catalogs, mirrors, data journals empty
2. CreateBegin(1,1,1)   creator 1 snapshots daemon 1 at length 0
3. CreateFinish(1)      daemon 1 commits [val 1, id 1]
4. MirrorAdvance(2,1)   daemon 2 mirrors daemon 1's fact
5. Publish(2,1)         daemon 2 ADMITS digest 1 — resolvable via the mirror
6. MirrorReset(2,1)     daemon 2's mirror of daemon 1 is dropped
```

After step 6: `data[2] = <<1>>`, but `ResolvableIds(2) = {}`. Daemon 2
holds an admitted frame it can no longer explain from its own evidence.
Digest 1 is still committed at daemon 1, so `NoAdmissionOnFaith` is
untroubled — which is exactly why the ratified law cannot see this.

## Why this is not a defect

`MirrorReset` is gated on `ResettingMirror`, which is `FALSE` in every
ratified configuration. It exists solely as the negative control for
`ResolutionMonotonicity` — it *is* ADR-0009's explicitly rejected
"replica renumbers history" alternative. Under the ratified model
mirrors never reset, resolvable sets only grow, and
`AdmittedStaysResolvableAtD` follows.

So: no ratified claim is weaker than advertised, and no gate run should
change on account of this note.

## The open question for the operator

**Should "admitted frames stay locally resolvable" be a ratified law?**

The reason it is worth asking rather than filing away: ADR-0009 says a
replica is a verified mirror holding a *prefix* of its origin. Real
replicas that resync on gap — the ordinary implementation of "I fell
behind, refetch from a known-good point" — can transiently look like
`MirrorReset` rather than like `MirrorAdvance`, if the resync is
implemented as *drop and refetch* rather than as *extend in place*. The
model forbids that shape by construction (`MirrorAdvance` only ever
appends at the origin position), and `ResolutionMonotonicity` is the law
that says so. But the model's forbidding it is a modelling decision,
not yet an implementation obligation anywhere in the executable gate:

- `ResolutionMonotonicity` is checked on the split and wire models, and
  it is exactly what `CatalogBroken.reset.cfg` refutes when dropped.
- But `MirrorAdvance` in the R4 executable harness is, per
  `R4-DECISIONS.md` and `README.md`, the explicitly limited
  *re-create-and-project* substitute, because replica roles are unbuilt.
  The R4 claim does not cover verified origin-position copy, prefix
  preservation, or lag transport.

So the property that would catch a drop-and-refetch replica is asserted
in TLA and not yet exercised against anything executable. If replica
roles get built, `AdmittedStaysResolvableAtD` is a cheap, sharp
conformance target: it is a **state** predicate over a single daemon's
own observable journals and resolve index, so a harness can check it
after every step without any interposition seam — precisely the property
`R4-FINDING-001` found the split create map lacked.

Three dispositions, none of them urgent:

1. **Ratify it.** Add `AdmittedStaysResolvableAtD` to `Catalog.cfg` and
   `CatalogWire.cfg`, with `X4` promoted to a negative control in the
   `CatalogBroken*` style. Cost is near zero — X3 shows the state space
   is unchanged (119,145 / 18,295 / depth 16, identical to the cap2
   canary). Note that `CatalogBroken.reset.cfg` does **not** currently
   check `NoAdmissionOnFaith`, so this would be new coverage, not a
   restatement.
2. **Record it as a deliberate non-law**, on the grounds that a daemon
   is entitled to have admitted on evidence it has since gapped past,
   and that `NoAdmissionOnFaith` plus `ResolutionMonotonicity` together
   already say everything the ownership model intends.
3. **Defer to ticket 012 / replica roles**, and revisit when
   `MirrorAdvance` stops being a substitute.

The BREAKER team has no view on which is right — this is an ownership
question about what the catalog promises, not a verification question.
What we can say is that the model satisfies it today, that it is
strictly stronger than the law currently claimed, and that it is
unusually cheap to check.
