// Package kmconform consumes the kernel model's conformance corpus:
// `kernel-conformance.ndjson`, format 2, the file through which the Lean
// kernel model hands its closed tables to everything that is not Lean.
//
// The package carries four things and nothing else:
//
//   - estate canonical JSON (canonjson.go) — a strict parser and an emitter
//     for the one serialization the corpus is written in;
//   - the format-2 corpus grammar (corpus.go, validate.go) — a validator that
//     refuses a malformed artifact rather than reading it best-effort, and a
//     re-emitter that proves the reading was lossless;
//   - the ten canon vectors (canonvectors.go) — constructed natively in Go
//     from the schema, so that the member sort is tested by a value this
//     package built rather than by one it read back already sorted;
//   - the generated tables (tables_generated.go) — kind, stage, and refusal
//     constants with their taught texts, the per-kind brand types, the
//     docstrings, and the model's conformance vectors, all emitted from the
//     corpus by `go run ./cmd/kmgen` and never typed by hand.
//
// # The both-ways law
//
// Parsing every line of the corpus and re-emitting it reproduces the file
// byte for byte, and canonicalizing each canon record's value yields exactly
// its bytes field. CheckBothWays runs both halves, and the package's own test
// suite runs CheckBothWays over the committed artifact, so the law is in the
// gate this module's build already executes rather than in a comment.
//
// # What the vectors are, and are not
//
// The vectors check an implementation against the MODEL'S VERDICTS. They do
// not promote the model's theorems into guarantees about any running system.
// A conforming implementation is one whose door refuses the same candidates
// for the same reasons and encodes the same acts the same way — nothing more
// is claimed, and nothing more should be read into a green conformance run.
//
// # The brand ordering, stated up front
//
// Go's defined types give the kind brands at compile time and stop there:
// an untyped constant adopts any brand, an explicit conversion crosses any
// brand, and a value-level brand (the register that issued a token) has no
// type to become. A Go consumer without the brand lint therefore has weaker
// guarantees than the TypeScript consumer, which in turn has weaker
// guarantees than the model. `foldlab/brandlint` closes the first two leaks
// mechanically and is run over this package by its own test; the third is a
// run-time check on Token.Spend and Position.Compare, and a caller who drops
// the returned error gets nothing.
package kmconform

// SupportedFormat is the one corpus grammar this package knows. A consumer
// that meets another integer MUST refuse the file — not warn, not degrade —
// naming both the format found and the format understood. Best-effort
// parsing of an unknown grammar is how a wrong table reaches production
// silently.
const SupportedFormat = 2

// ExpectedSource and ExpectedGenerator are the provenance this consumer
// expects. They are display data and no behaviour branches on them, but an
// artifact naming another model or another emitter is not this consumer's
// artifact and is refused rather than read.
const (
	ExpectedSource    = "verify/kernel"
	ExpectedGenerator = "verify/unity emit"
)

// RealCorpusPath is the model-emitted artifact, relative to this package's
// directory. It is written only by the model-end lane, by executing the Lean
// model; nothing here may hand-author a record of it.
//
// It is read cross-module, the way go/canonical reads the root fixtures. That
// is deliberate: the artifact belongs to the model, and a copy inside this
// module would be a second truth that drifts quietly. The cost is that Go's
// test cache cannot attribute a change in it to this module's root, so every
// test that reads it must run under -count=1 — which the module's gate
// already does, for this exact reason (go/AGENTS.md, docs/FREEZING.md).
const RealCorpusPath = "../../packages/plait/fixtures/kernel-conformance.ndjson"

// ConformanceCorpusPath is the artifact this module's conformance wall reads.
//
// THE ONE-LINE SWITCH. Everything downstream — the wall, cmd/kmgen, and the
// regeneration check — reads this constant and nothing else, so pointing the
// module at a different artifact is one edit here.
const ConformanceCorpusPath = RealCorpusPath
