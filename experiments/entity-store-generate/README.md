# entity-store-generate — Stage 2 generation gate

This experimental tool turns a schemaVersion 1 inventory into a committed Lean project.
It preserves inventory order and transcribes each `_tag` into a constructor and an
exhaustive `tagOf` match. The generated Lean file also contains decided statements that
the tags are distinct and that the constructor list has the inventory's length.

The generator makes no domain choices. It copies inventory facts into Lean text, with the
source repository, commit, package, file paths, and git blob pins on line 1 of every file it
emits. The generator contributes no trust: the Lean kernel checks its declarations and
statements, while the byte comparison exposes drift. The committed tree was generated from
the real 21-variant inventory. Tests exercise the three-variant mini inventory.

## Run

Run these commands from this directory:

```sh
bun run gen
bun run check
bun test
```

`bun run gen` reads `../entity-store-extract/inventory.json`. The underlying command also
accepts another inventory and output directory:

```sh
bun run src/generate.ts <inventory.json> [output-directory]
```

`bun run check` regenerates into a temporary directory, copies the protected handwritten
fixture into that directory, and compares the complete file trees byte for byte. Added,
removed, or changed files fail before the command builds the committed project with Lake.

`generated/EntityStoreGenerate/Fixtures.lean` is the only handwritten file in the generated
project. The generator does not write or remove it. Its `rfl` examples make a changed tag
fail during Lean elaboration as well as during the byte comparison.

The tests make all changes in disposable copies. They demonstrate failures for a hand edit,
a changed tag, and an added constructor, and demonstrate byte-identical output from two
independent runs.

## NOT CLAIMED

- No claim is made about the pinned Effect implementation.
- No Effect variant is mapped to an E2 carrier constructor.
- Nothing here assesses or strengthens the extractor's trust seam.
