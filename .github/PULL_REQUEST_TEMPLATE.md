<!-- Delete nothing. An unticked box is information; a deleted section is not. -->

## The claim

<!-- One line: what is true after this merge that was not true before.
     Not the diff — the claim the diff makes. -->

## Gates

Tick what you ran locally. `gates.yml` re-runs all of it; a tick you
cannot defend is worse than an empty box.

- [ ] `bun run typecheck`
- [ ] `bun test`
- [ ] `cd go && gofmt -l .` — printed nothing
- [ ] `cd go && go vet ./... && go test ./...`
- [ ] `cd proto/go && gofmt -l . && go vet ./... && go test ./...`
- [ ] `cd proto/ts && bun install && bunx tsc --noEmit && bun test .`

Off the battery, and only if this PR touches them: `bun run build:wasm
&& bun run test:wasm` (wasm wall), `bash verify/catalog/run.sh` (R2, ~12 min of
TLC — `model-gate.yml` runs it weekly), the long JCS fuzz variants in
README.md.

## Frozen fixtures

`fixtures/` and `proto/wire/fixtures/` are frozen. A digest mismatch
means the change is wrong (AGENTS.md), unless regeneration was
explicitly requested and the reason is written down.

- [ ] No frozen fixture changed.
- [ ] A fixture changed. Who asked, and why:

## Decisions

- [ ] Nothing the spec left open was decided here.
- [ ] A DECISIONS entry was added or dispositioned — link:
- [ ] A rung moved, and VERIFICATION.md now says so — link:

## Findings left red

A red test whose disposition says "red as evidence" is not a merge
blocker; a red test with no disposition is.

- [ ] None.
- [ ] Left red on purpose — link the disposition:
