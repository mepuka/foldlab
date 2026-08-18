# surface — entry points

The outermost layer: what a person or another program actually invokes. Two
files wear this plane — `cli.ts`, the `plait` bin that deploys a declared fold
and runs the chaos arms that print a canonical measured scoreboard, and
`../index.ts`, the curated barrel that *is* the public surface. Nothing leaves
the package that is not exported there.

Nothing in this directory is machine-generated. What is generated *from* it —
from the barrel, not from the corpus — is
`../../test/PublicEffects.signatures.txt`, the manifest of every public call
and construct signature with the error channel it carries. Regenerate from
`packages/plait` with `bun run generate:public-effects`; its first line is the
command, its second the authority the manifest claims.

Wall: `bun run check:public-effects` re-emits the declarations and diffs that
manifest, failing on any public Effect whose error channel is not a `Refusal`,
and `bun run check:type-control` runs the twenty planted tsc controls in
`../../negative-controls/PublicEffects.*`, each refuted on its own committed
compiler trace. The CLI's own arm is the divergence control at
`../../negative-controls/Fold.cli-divergence.trace.txt`.

One level deeper: `../index.ts` lists every export with a one-line law, then
`../kernel/README.md` for the language those exports are written in;
`../../QUICKSTART.md` runs this surface end to end.
