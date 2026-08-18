# km-algebra — exemplars for the algebraic register

**Exemplar only.** Wired into nothing, imported by nothing, gated by
nothing. These files exist so that two claims in
`docs/design/2026-08-18-km-algebraic-register.md` are measured rather
than asserted. Neither is a gate, and neither ships.

| File | What it demonstrates | Run |
| --- | --- | --- |
| `rung-brands.ts` | KM-17's rung ladder as phantom type constraints: `join` elaborates only at a bounded-semilattice-branded carrier, partition merge demands commutative-or-better, a windowed difference demands inverses, `present` is not an algebra, and a sketch's answer is not an exact one. Seven `@ts-expect-error` must-not-compile controls, so the file type-checks only if each of them fails to. | see `run.sh` |
| `run.sh` | Three arms: the exemplar under the pinned `tsgo`, the same under `tsc` as referee, and a **mutation arm** that weakens `join` to the commutative-monoid rung and confirms three controls stop failing. Without arm 3 a green suite could mean the file rotted. | `bash scratch/km-algebra/run.sh` |
| `two-registers.ts` | KM-18's claim that the plain-word and algebraic registers are two concretizations of ONE abstract statement type, not two hand-written texts. Renders `join`, partition merge, a taught refusal, and the doc-layer JSDoc line — every one of them twice, from one datum. | `bun scratch/km-algebra/two-registers.ts` |

In the shipped design nothing in these files is hand-written: every
declaration comes out of the conformance corpus's `law`, `rung`,
`operator`, and `algebra` record groups. They are the reference sketches
generation owes, in the same posture as
`verify/kernel/projections/kernel.ts`.

Running `two-registers.ts` produced finding **N-1**, recorded in the
design at §6.3: a single generic plain-word template rendered a
shard-merge as a join and said something false, so the plain register
carries a per-operator phrasing datum and the renderer has no generic
fallback. The algebraic register needed no such datum, because the
symbol already carries the distinction.
