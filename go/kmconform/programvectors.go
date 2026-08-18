package kmconform

// The program vectors, constructed natively.
//
// Same discipline as canonvectors.go and for the same reason: a declaration
// read out of the corpus is already sorted, already edge-consistent, already
// admission-ordered, so re-checking it proves that the file agrees with
// itself and nothing about whether this consumer would have built the same
// thing. Only a declaration this package assembles exercises the member sort
// inside an args object, the edge derivation, and the newest-first ordering.
//
// PROVENANCE, vector by vector:
//
//   - ground-two-node is Unity.Planted.groundProgram lifted. The bridge plants
//     `nodeOne = {name 1, declare, uses []}` and
//     `nodeTwo = {name 2, emit, uses [1]}` and lists them newest-first as
//     `[nodeTwo, nodeOne]`. The lift is minimal: it adds exactly the one local
//     argument reference that the consumption has to become for the edge law
//     to see it, and nothing else. Node one keeps the planted empty argument
//     list, which is also why an args object binds a SUBSET of its
//     generator's fields rather than all of them.
//   - holey and holey-filled are the one-hole program and its filled twin.
//     The twin is DERIVED here by applying a valuation, never built a second
//     time — that is Kernel.fillProgram at declaration level, and building it
//     twice would let the pair agree by transcription rather than by the law.
//   - distill-shape is the record's four-node sketch at ground identities:
//     resolve, then decide, then emit, then join, each consuming the one
//     before it.
//
// THE IDENTITIES BELOW ARE A PIN, NOT A DERIVATION. The freeze names the
// vectors and their shapes; it does not name which digest labels a lifted
// declare carries. They are reconciled to the emitted corpus, which is
// normative — the model-end lane emits, this lane reads — and a future
// disagreement is settled the same way, in this one file.
//
// Nothing here executes. A declaration is a declaration.

import (
	"fmt"
	"math/big"
)

// The ground identities, as the model-end lane emitted them. Small labels, as
// everywhere in the model: a digest is an identity label and the runtime's
// hasher is the trusted base.
const (
	groundLaneDigest     = 1
	groundWritDigest     = 4
	groundRegisterDigest = 5
	groundResourceDigest = 6
	groundTargetDigest   = 8
	groundLineageDigest  = 9

	// holeyHole is the one-hole program's declared parameter, holeySchema the
	// digest of the schema that types it, and holeyFill the value the twin is
	// filled with.
	holeyHole   = 7
	holeySchema = 88
	holeyFill   = 42
)

// ProgramVectors builds the freeze's committed program declarations, in the
// order they stand in the corpus.
//
// Bytes is COMPUTED by the serializer, never transcribed, for the same reason
// the canon vectors compute theirs: a hand-typed byte string could disagree
// with what the serializer actually does, and the disagreement would read as
// agreement.
func ProgramVectors() ([]ProgramRow, error) {
	// ground-two-node. Newest first, so the emit that consumes stands ahead of
	// the declare it consumes.
	ground := withDerivedEdges(ProgramDeclaration{
		Nodes: []ProgramNodeRow{
			{
				Name:      nat(2),
				Generator: "emit",
				Args:      []NodeArg{{Field: "body", Ref: localArg(1)}},
			},
			{
				Name:      nat(1),
				Generator: "declare",
			},
		},
	})

	// holey: the same two nodes, with the declared value standing in a hole.
	holey := withDerivedEdges(ProgramDeclaration{
		Holes: []ProgramHole{{Name: nat(holeyHole), Schema: nat(holeySchema)}},
		Nodes: []ProgramNodeRow{
			{
				Name:      nat(2),
				Generator: "emit",
				Args: []NodeArg{
					// Supplied lane-then-body, out of canonical order, so the
					// member sort inside an args object is exercised by a value
					// this package built rather than by one it read back sorted.
					{Field: "lane", Ref: digestArg("lane", groundLaneDigest)},
					{Field: "body", Ref: localArg(1)},
				},
			},
			{
				Name:      nat(1),
				Generator: "declare",
				Args: []NodeArg{
					{Field: "writ", Ref: digestArg("policy", groundWritDigest)},
					{Field: "value", Ref: holeArg(holeyHole)},
				},
			},
		},
	})

	// holey-filled: the twin, derived. Filling a hole turns it into a literal
	// wherever it stands and retires it from the declared parameters — the
	// valuation correspondence, applied rather than restated.
	holeyFilled := holey.Fill(ValuationOf([2]uint64{holeyHole, holeyFill}))

	// distill-shape: resolve, decide, emit, join, newest first.
	distill := withDerivedEdges(ProgramDeclaration{
		Lineage: []*big.Int{nat(groundLineageDigest)},
		Nodes: []ProgramNodeRow{
			{
				Name:      nat(4),
				Generator: "join",
				Args: []NodeArg{
					{Field: "cell", Ref: digestArg("resource", groundResourceDigest)},
					{Field: "contribution", Ref: localArg(3)},
				},
			},
			{
				Name:      nat(3),
				Generator: "emit",
				Args: []NodeArg{
					{Field: "body", Ref: localArg(2)},
					{Field: "lane", Ref: digestArg("lane", groundLaneDigest)},
				},
			},
			{
				Name:      nat(2),
				Generator: "decide",
				Args: []NodeArg{
					{Field: "outcome", Ref: localArg(1)},
					{Field: "register", Ref: digestArg("program", groundRegisterDigest)},
				},
			},
			{
				Name:      nat(1),
				Generator: "resolve",
				Args: []NodeArg{
					{Field: "target", Ref: digestArg("index", groundTargetDigest)},
				},
			},
		},
	})

	vectors := []struct {
		name        string
		declaration ProgramDeclaration
	}{
		{"ground-two-node", ground},
		{"holey", holey},
		{"holey-filled", holeyFilled},
		{"distill-shape", distill},
	}
	rows := make([]ProgramRow, 0, len(vectors))
	for _, vector := range vectors {
		encoded, err := vector.declaration.Canonical()
		if err != nil {
			return nil, fmt.Errorf("program vector %q: %w", vector.name, err)
		}
		rows = append(rows, ProgramRow{
			Name:        vector.name,
			Bytes:       string(encoded),
			Declaration: vector.declaration,
		})
	}
	return rows, nil
}

// withDerivedEdges fills in the edge list from the nodes. The builder never
// writes an edge by hand: an edge IS a consumption, so restating one is an
// opportunity for the two to disagree, and the freeze's consistency rule
// exists precisely because that opportunity is real. It also means the byte
// comparison against the corpus tests the emitted edge list rather than
// echoing it.
func withDerivedEdges(declaration ProgramDeclaration) ProgramDeclaration {
	declaration.Edges = declaration.DerivedEdges()
	return declaration
}

func nat(value uint64) *big.Int { return new(big.Int).SetUint64(value) }

func digestArg(kind string, id uint64) ArgRef {
	return ArgRef{Arg: ArgDigest, Kind: kind, ID: nat(id)}
}

func localArg(name uint64) ArgRef {
	return ArgRef{Arg: ArgLocal, Name: nat(name)}
}

func holeArg(name uint64) ArgRef {
	return ArgRef{Arg: ArgHole, Name: nat(name)}
}
