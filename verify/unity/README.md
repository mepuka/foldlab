# verify/unity — the bridge, the corpus emitter, and the TypeScript surfaces

This package sits between the two models and reads both of them read-only. It
carries three things a reader usually comes here for.

**The bridge and its laws.** `Unity/Definitions.lean`, `Unity/Laws.lean` and
`Unity/Proofs.lean` are the definitions / statements / proofs partition the gate
enforces; `Unity/Dsl.lean` spells the planted candidates in the kernel's own
surface syntax.

**The kernel conformance corpus.** `Unity/Emit.lean` computes every row — by
running the kernel model's definitions, by reading the Lean environment at
elaboration time through `Unity/Reflect.lean`, and by running this package's
canonicalizer in `Unity/Canon.lean`. `Unity/Check.lean` reads the committed
interchange back and compares it with the environment.

**The TypeScript surfaces.** `Unity/Ts.lean` is the target grammar written down
as data — declarations, types, expressions and doc comments at the node set the
generated files actually use — with ONE printer over it. `Unity/TsKernel.lean`
folds three inputs into that grammar, and `Unity/Sha.lean` derives the digest a
surface names its source by.

## Regenerating

```sh
cd verify/unity
./run.sh                      # the gate: every wall, every control
lake exe emit                 # the conformance interchange
lake exe ts --target=kernel-tables  --meanings=refusal-meanings.ndjson
lake exe ts --target=refusal-kinds  --meanings=refusal-meanings.ndjson
```

The emitter prints to standard output and refuses rather than printing a
surface it cannot certify. The two `ts` targets write the runtime package's
`kernel/KernelTables.generated.ts` and `truth/RefusalKinds.generated.ts`; the
gate proves the committed files are a fresh emission, so a redirect that
regenerates them belongs in the same commit as whatever moved them.

## What the TypeScript emitter reads

Three inputs, and only one of them comes from outside this package.

1. **The corpus**, taken from this package's own emission rather than from a
   file, so the surfaces are projected from what the model computes. The gate
   separately proves that emission byte-identical to the committed interchange.
2. **The projection AST** of `verify/projections`, walked over the emitter's
   own manifest. It is what supplies the declaration shapes, and in particular
   the binder ROLE, which is what selects the sorts that become branded
   aliases. The dependency runs one way: this package requires the toolkit by
   path, and the toolkit knows nothing about this one.
3. **`refusal-meanings.ndjson`**, the reviewed refusal roster — the runtime
   spellings in their persisted order and the standing meaning each carries.
   Those sentences are prose under review; nothing computes them. The file is
   tracking-native gate material and is never rendered outward.

## What the gate proves about them

- Each surface is emitted twice, the two emissions agree, and both equal the
  committed file byte for byte.
- The em dash rides through verbatim, and no other code point leaves ASCII. The
  prose register folds an em dash to two hyphens; this target does not, and the
  arm is there because the two registers are easy to confuse.
- Four printer mutations — the wrapped-meaning column, the binder role, the
  bytes the provenance digest is taken over, and the corpus-versus-roster
  ancestry — each move a surface and each restore byte-identically.
- Two roster reconciliations refuse: a corpus reason with no reviewed meaning,
  and a roster that names a runtime kind twice.

## Honest bounds

The target grammar carries the node set measured across all four generated
TypeScript files, but only two of them are emitted here. The constructors the
other two need — the concatenated string runs, the function types, the tuple
and operator types, the broken call arguments — compile and print, and no
committed surface exercises them yet. Nothing above claims otherwise.

The provenance a surface carries is SHA-256 over the corpus's own bytes,
derived in `Unity/Sha.lean`. That implementation is walled by agreement: the
digest it produces for the committed corpus is the digest an independent
implementation of the same standard produces for the same bytes, and the gate's
byte wall fails the moment it stops agreeing.
