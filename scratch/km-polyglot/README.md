# km-polyglot — EXEMPLAR ONLY

**Nothing in this directory is wired into any build, gate, module, test
suite, or package.** It is not imported by `go/`, `packages/`, `proto/`,
or `verify/`. It carries its own isolated Go module
(`kmconform/go.mod`) precisely so that it joins nothing. Deleting this
directory changes no gate result.

It exists to demonstrate, mechanically rather than by assertion, that
the frozen `kernel-conformance.ndjson` schema v1 is consumable from a
second language and renderable as documentation. The normative document
is
[`docs/design/2026-08-18-km-conformance-schema.md`](../../docs/design/2026-08-18-km-conformance-schema.md).

## The sample is not the artifact

`sample-kernel-conformance.ndjson` is a **sample input**, not the real
artifact. The real artifact is
`packages/plait/fixtures/kernel-conformance.ndjson`, is emitted by
executing the Lean model, and is written only by the model-end lane —
the standing house ruling is that model/runtime vectors are produced by
running the model, never hand-typed.

The sample is nonetheless faithful: every kind, stage, refusal law,
refusal repair, applicability mark, type, constructor, field, and
admission row is transcribed from `verify/kernel/Kernel/Definitions.lean`
or from a committed control trace. The `lawfulDeclareAct` encoding
vector `[0,0,7000051000172,4]` is real model output, copied from
`verify/kernel/negative-controls/door-admits-lawful.cex.txt`. The seven
other encoding vectors are constructed by hand from `Kernel.encodeAct`
and are the sample's only invented data.

## Contents

| File | What it is |
|---|---|
| `make-sample.ts` | Writes the sample artifact. Computes header counts from the records it emits, so the sample cannot disagree with itself. |
| `sample-kernel-conformance.ndjson` | The generated sample: 81 lines, LF, ASCII, 15653 bytes. |
| `kmgen.go` | The Go generator. Reads a schema-v1 artifact, validates it against the frozen grammar, emits a Go source file. Stdlib only; no module needed. |
| `kmconform/kmconform_exemplar.go` | The generated Go output. |
| `kmconform/smoke_test.go` | The only hand-written file under `kmconform/`. Proves the generated package compiles and carries the tables it claims to. |
| `kmconform/go.mod` | An isolated module, written by the generator, so the package can be vetted and tested without joining a real one. |
| `refusal-controls.sh` | Eleven single-mutation negative controls plus one positive control for the validator. A checker that cannot fail proves nothing. |
| `brand-probe/` | Establishes by compilation, not assertion, what Go's type system does and does not enforce for the schema's brands. Two arms: `accepted.go` must run, `refused.go` must not compile and must keep the diagnoses pinned in `expected.txt`. |
| `render-prose.ts` | Renders the same artifact as Markdown reference documentation. |
| `prose-sample.md` | The generated documentation. |

## Running it

From this directory:

```sh
bun run make-sample.ts                                   # write the sample
go run ./kmgen.go sample-kernel-conformance.ndjson kmconform
gofmt -l kmconform/                                      # prints nothing
(cd kmconform && go vet ./... && go test -count=1 ./...)
bash refusal-controls.sh                                 # 12 passed, 0 failed
bash brand-probe/run.sh                                  # PROBE: PASS
bun run render-prose.ts sample-kernel-conformance.ndjson > prose-sample.md
```

Both generators are deterministic: rerunning them reproduces both
outputs byte-identically (verified by sha256 across two runs).

## Toolchain observed

Go 1.26.5 windows/amd64; Bun 1.3.14.
