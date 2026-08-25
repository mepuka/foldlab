# entity-store-ledger — mechanical ledger extractor

This experimental tool extracts the entity-store model gate, shell gate, and differential
harness reports into the committed `docs/entity-store/LEDGER.md`. It runs fresh Lean
re-elaborations rather than reading cached build output, emits deterministic text, and
contributes no trust beyond the already admitted Bun and Lean tools. The gates and their
axiom reports carry the trust.

## Run

Run these commands from this directory:

```sh
bun run gen
bun run check
bun test
```

`gen` runs the three pinned extraction commands and writes the ledger. `check` first builds
both Lean packages, runs the same fresh extraction into memory, and byte-compares it with
the committed ledger. It exits nonzero for any changed, missing, or extra byte.

The files under `test/fixtures/` are captured fixture logs used by parser unit tests. They
are deliberately small and are not extraction inputs: the end-to-end paths always run the
real commands.
