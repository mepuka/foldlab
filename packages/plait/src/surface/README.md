# surface — entry points

The outermost layer: what a person or another program actually invokes. Two
files wear this plane — `cli.ts`, the `plait` bin that deploys a declared fold
and runs the chaos arms that print a canonical measured scoreboard, and
`../index.ts`, the curated barrel that *is* the public surface. Nothing leaves
the package that is not exported there. Surface may import every layer beneath
it; nothing imports surface.

Nothing in this directory is machine-generated. What is generated *from* it —
from the barrel, not from the corpus — is
`../../test/PublicEffects.signatures.txt`, the manifest of every public call
and construct signature with the error channel it carries. Regenerate from
`packages/plait` with `bun run generate:public-effects`; its first line is the
command, its second the authority the manifest claims.

Wall: `bun run check:public-effects` re-emits the declarations and diffs that
manifest, failing on any public Effect whose error channel is not a `Refusal`;
`bun run check:type-control` runs the twenty planted tsc controls in
`../../negative-controls/PublicEffects.*`, each refuted on a committed compiler
trace. The CLI's arm is `../../negative-controls/Fold.cli-divergence.trace.txt`.

One level deeper, down the plane order: `../carriage/README.md`, the clients
this surface stands on. Beside it, `../index.ts` is the module list with a
one-line law per export; `../../QUICKSTART.md` runs the surface end to end.
