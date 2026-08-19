# surface — entry points

The outermost layer: what a person or another program actually invokes. Five
files wear this plane — `cli.ts`, the `plait` bin that declares the opening
coordination, deploys a declared fold, runs the chaos arms, and serves the two
faces; `init.ts`, first contact, which mints the opening declaration set and
registers the agent client that speaks it; `mcp.ts`, the agent face whose
eight tools are the model's own tool-schema projection read from the committed
artifact copy and served verbatim (served equals derived — `bun run
check:kernel-tools` holds the copy byte-identical to the model gate's
emission, and `../../test/KernelMcp.test.ts` walls artifact-to-wire); `api.ts`,
the read face; and `../index.ts`, the curated barrel that *is* the public
surface. Nothing leaves the package that is not exported there. Surface may
import every layer beneath it; nothing imports surface.

`api.ts` serves the planes over HTTP and carries NO write. Its answers are the
canonical bytes of the plane read each one projects — the value is never
re-shaped on the way out, so a digest taken over a served payload is the digest
of the value — and every collection is bounded by a limit with a default and a
ceiling. The live read is a Server-Sent Events response over the estate's own
change stream, one frame per landed fact, written as the fact arrives. The
write half is absent by construction rather than by promise: the layer requires
the three read services and nothing else, so no handler under it can reach the
engine, the emit service, or the admission door. Wall:
`../../test/Api.test.ts` — served-equals-derived per endpoint, the canonical
round trip over every payload including both refusal registers, the bound, the
stream replay, the first frame observed before the producing sequence
completes, the write-verb refusal, and root law 10 over the bytes this face
actually serves with a planted artifact that reddens it. Beside it,
`../../test/ApiWall.test.ts` holds the other half over a real server: facts
landed through the emit path, read back through the bounded tail against their
emit acknowledgement, followed live so a landing after the read started reaches
the reader, and served through this face over the same substrate.

`init.ts` is where a practitioner meets this estate. It writes no configuration:
it mints the store, the options, the holder and the writ as canonical values,
writes each at the name its own bytes earn, names all four from one root, and
places a project-scoped registration pointing the agent client at the program
the party just ran. Saying the same sentences twice writes the same bytes, which
is what makes "start the substrate and run it again" a safe instruction, and it
is executed rather than asserted — `../../test/Init.test.ts` compares the tree
byte for byte and `../../test/BootstrapWall.test.ts` does it again over a real
substrate, then connects an agent client to what the registration named and
round-trips one admitted sentence. That gate also holds the one cross-language
oracle in this directory: the options and store digests the bootstrap declares
must be the ones the shipped substrate lifecycle command prints when it starts.

`cli.ts` is declared on the catalog-pinned Effect release's own CLI,
`effect/unstable/cli` (DEV-786). It parses nothing: the command tree is data —
`Flag`, `Argument`, and `Command` values — and the library's parser interprets
it, which is where `--help`, `--version`, `--wizard`, and shell completions come
from. Read it in the three movements its header names. Two rules govern anything
added here. Growth is a `Command` value appended to the root's
`withSubcommands`, never a new parse path. And the division of refusal holds:
the library refuses SYNTAX with its own structured usage error, the taught
vocabulary refuses LAW with a `Refusal` rendered by the one total function —
neither answers for the other, and `Fold.cli-usage.trace.txt` reddens if either
starts to.

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
trace. The CLI's three arms are all in `../../negative-controls/` and all run
from `../../test/ChaosCli.test.ts`: `Fold.cli-divergence.trace.txt` (a planted
between-arm state mutation reddens the verdict, exit=1),
`Fold.cli-refusal.trace.txt` (a refused request renders as the taught refusal
value, exit=2), and `Fold.cli-usage.trace.txt` (a malformed invocation is
refused by the library's parser and carries no estate refusal, exit=2).

One level deeper, down the plane order: `../carriage/README.md`, the clients
this surface stands on. Beside it, `../index.ts` is the module list with a
one-line law per export; `../../QUICKSTART.md` runs the surface end to end.
