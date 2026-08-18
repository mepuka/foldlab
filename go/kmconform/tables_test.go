// The generated tables against the corpus they were generated from.
//
// The regeneration gate in cmd/kmgen proves the committed file is a fresh
// emission. This file proves the emission says what the artifact says — the
// two are different claims, and only the second catches a generator that
// drops a field or mis-maps a column while regenerating perfectly.
package kmconform_test

import (
	"strings"
	"testing"

	"foldlab/kmconform"
)

func TestGeneratedKindsMatchTheCorpus(t *testing.T) {
	for _, row := range loadCorpus(t).Kinds {
		kind, known := kmconform.DeclKindByName(row.Name)
		if !known {
			t.Fatalf("the generated table does not carry the kind %q", row.Name)
		}
		if int(kind) != row.Rank {
			t.Fatalf("kind %q is rank %d in the corpus and %d in the generated table", row.Name, row.Rank, kind)
		}
		if kind.String() != row.Name {
			t.Fatalf("kind rank %d renders as %q, the corpus names it %q", row.Rank, kind, row.Name)
		}
	}
	// The decode half refuses rather than saturating: a clamped rank is a
	// plausible wrong answer, which is worse than an error.
	if _, ok := kmconform.DeclKindFromRank(12); ok {
		t.Fatal("rank 12 was accepted; the kind universe is closed at twelve")
	}
	if _, ok := kmconform.DeclKindByName("nonesuch"); ok {
		t.Fatal("an unknown kind name resolved")
	}
}

func TestGeneratedStagesMatchTheCorpus(t *testing.T) {
	corpus := loadCorpus(t)
	for _, row := range corpus.Stages {
		stage, ok := kmconform.HoleStageFromRank(uint8(row.Rank))
		if !ok {
			t.Fatalf("stage rank %d was refused", row.Rank)
		}
		if stage.String() != row.Name {
			t.Fatalf("stage rank %d renders as %q, the corpus names it %q", row.Rank, stage, row.Name)
		}
	}
	if _, ok := kmconform.HoleStageFromRank(uint8(len(corpus.Stages))); ok {
		t.Fatalf("rank %d was accepted; the stage ladder is closed", len(corpus.Stages))
	}
	// Rank is observed only in the reached-at-least direction.
	if !kmconform.StageSealed.Reached(kmconform.StageOpened) {
		t.Fatal("sealed does not reach opened")
	}
	if kmconform.StageOpened.Reached(kmconform.StageSealed) {
		t.Fatal("opened reaches sealed")
	}
}

func TestGeneratedRefusalsCarryTheCorpusTexts(t *testing.T) {
	corpus := loadCorpus(t)
	if len(kmconform.RefusalTable) != len(corpus.Refusals) {
		t.Fatalf("the generated table has %d rows, the corpus %d",
			len(kmconform.RefusalTable), len(corpus.Refusals))
	}
	for index, row := range corpus.Refusals {
		generated := kmconform.RefusalTable[index]
		if generated.Wire != row.Reason {
			t.Fatalf("row %d is %q in the generated table and %q in the corpus", index, generated.Wire, row.Reason)
		}
		if generated.Law != row.Law {
			t.Fatalf("row %q: the law drifted.\n generated: %s\n    corpus: %s", row.Reason, generated.Law, row.Law)
		}
		if generated.Repair != row.Repair {
			t.Fatalf("row %q: the repair drifted.\n generated: %s\n    corpus: %s", row.Reason, generated.Repair, row.Repair)
		}
		if generated.Applicability.String() != row.Applicability {
			t.Fatalf("row %q is %q in the generated table and %q in the corpus",
				row.Reason, generated.Applicability, row.Applicability)
		}
		reason, known := kmconform.RefusalByWire(row.Reason)
		if !known || int(reason) != index {
			t.Fatalf("RefusalByWire(%q) gave (%d, %v), want (%d, true)", row.Reason, reason, known, index)
		}
		if taught := kmconform.Taught(reason); taught.Wire != row.Reason {
			t.Fatalf("Taught(%d) is %q, want %q", reason, taught.Wire, row.Reason)
		}
	}
	if _, known := kmconform.RefusalByWire("no-such-reason"); known {
		t.Fatal("an unknown wire reason resolved; unknown reasons are refused, never defaulted")
	}
}

func TestTheCodemodCatalogIsTheMachineApplicableFour(t *testing.T) {
	wires := []string{}
	for _, row := range kmconform.MachineApplicableRepairs() {
		wires = append(wires, row.Wire)
	}
	const want = "last-writer-wins,unverified-read,past-mutation,anchored-resolve"
	if got := strings.Join(wires, ","); got != want {
		t.Fatalf("the codemod catalog is [%s], want [%s]", got, want)
	}
}

func TestARefusalErrorTeachesTheLegalNextMove(t *testing.T) {
	// The taught table is the caller-facing diagnostic vocabulary. An error
	// that named only the reason would make the caller look the repair up,
	// which is the same as not teaching it.
	err := kmconform.Refuse(kmconform.ReasonLastWriterWins)
	taught := kmconform.Taught(kmconform.ReasonLastWriterWins)
	for _, part := range []string{taught.Wire, taught.Law, taught.Repair} {
		if !strings.Contains(err.Error(), part) {
			t.Fatalf("the refusal error omits %q; it says %q", part, err)
		}
	}
}

func TestGeneratedVectorsMatchTheCorpus(t *testing.T) {
	corpus := loadCorpus(t)
	if len(kmconform.EncodingVectors) != len(corpus.Encodings) {
		t.Fatalf("%d generated encoding vectors, %d in the corpus",
			len(kmconform.EncodingVectors), len(corpus.Encodings))
	}
	for index, row := range corpus.Encodings {
		generated := kmconform.EncodingVectors[index]
		if generated.Name != row.Name {
			t.Fatalf("encoding vector %d is %q in the generated table and %q in the corpus",
				index, generated.Name, row.Name)
		}
		if len(generated.Act) != len(row.Act) {
			t.Fatalf("vector %q has %d elements generated and %d in the corpus",
				row.Name, len(generated.Act), len(row.Act))
		}
		for position, number := range row.Act {
			if !number.IsUint64() || number.Uint64() != generated.Act[position] {
				t.Fatalf("vector %q element %d is %d generated and %s in the corpus",
					row.Name, position, generated.Act[position], number)
			}
		}
	}
	if len(kmconform.AdmissionVectors) != len(corpus.Admissions) {
		t.Fatalf("%d generated admission vectors, %d in the corpus",
			len(kmconform.AdmissionVectors), len(corpus.Admissions))
	}
	admitted := 0
	for index, row := range corpus.Admissions {
		generated := kmconform.AdmissionVectors[index]
		if generated.Name != row.Name {
			t.Fatalf("admission %d is %q generated and %q in the corpus", index, generated.Name, row.Name)
		}
		if generated.Admitted != (row.Verdict == "admitted") {
			t.Fatalf("admission %q disagrees about the verdict", row.Name)
		}
		if generated.Admitted {
			admitted++
			continue
		}
		if generated.Reason != row.Reason {
			t.Fatalf("admission %q refuses with %q generated and %q in the corpus",
				row.Name, generated.Reason, row.Reason)
		}
		if _, known := kmconform.RefusalByWire(generated.Reason); !known {
			t.Fatalf("admission %q refuses with %q, which the taught table does not carry",
				row.Name, generated.Reason)
		}
	}
	if admitted != 1 {
		t.Fatalf("%d admitted vectors, want exactly 1: a suite of refusals alone cannot tell a "+
			"correct door from one that refuses everything", admitted)
	}
}

func TestGeneratedProgramVectorsMatchTheCorpus(t *testing.T) {
	corpus := loadCorpus(t)
	if len(kmconform.ProgramVectorTable) != len(corpus.Programs) {
		t.Fatalf("%d generated program vectors, %d in the corpus",
			len(kmconform.ProgramVectorTable), len(corpus.Programs))
	}
	if len(kmconform.ProgramVectorNames) != len(corpus.Programs) {
		t.Fatalf("%d generated program vector names, %d in the corpus",
			len(kmconform.ProgramVectorNames), len(corpus.Programs))
	}
	for index, row := range corpus.Programs {
		generated := kmconform.ProgramVectorTable[index]
		if generated.Name != row.Name {
			t.Fatalf("program vector %d is %q in the generated table and %q in the corpus",
				index, generated.Name, row.Name)
		}
		if kmconform.ProgramVectorNames[index] != row.Name {
			t.Fatalf("program vector name %d is %q generated and %q in the corpus",
				index, kmconform.ProgramVectorNames[index], row.Name)
		}
		if generated.Bytes != row.Bytes {
			t.Fatalf("program vector %q: the generated bytes are\n  %s\nthe corpus declares\n  %s",
				row.Name, generated.Bytes, row.Bytes)
		}
		// The generated bytes must still be the declaration's own
		// serialization, so a generator that copied the wrong column is caught
		// by the same self-test the group exists for.
		encoded, err := row.Declaration.Canonical()
		if err != nil {
			t.Fatalf("program vector %q: %v", row.Name, err)
		}
		if string(encoded) != generated.Bytes {
			t.Fatalf("program vector %q: the generated bytes are not the declaration's canonical form",
				row.Name)
		}
		vector, known := kmconform.ProgramVectorByName(row.Name)
		if !known || vector.Bytes != row.Bytes {
			t.Fatalf("ProgramVectorByName(%q) gave (%+v, %v)", row.Name, vector, known)
		}
	}
	if _, known := kmconform.ProgramVectorByName("no-such-vector"); known {
		t.Fatal("an unknown program vector name resolved; unknown names are refused")
	}
}

func TestGeneratedDocsMatchTheCorpus(t *testing.T) {
	corpus := loadCorpus(t)
	if len(kmconform.DocTable) != len(corpus.Docs) {
		t.Fatalf("%d generated doc entries, %d in the corpus", len(kmconform.DocTable), len(corpus.Docs))
	}
	for index, row := range corpus.Docs {
		entry := kmconform.DocTable[index]
		if entry.Name != row.Name || entry.Doc != row.Doc {
			t.Fatalf("doc %d drifted: generated (%s) %q, corpus (%s) %q",
				index, entry.Name, entry.Doc, row.Name, row.Doc)
		}
		text, found := kmconform.DocFor(row.Name)
		if !found || text != row.Doc {
			t.Fatalf("DocFor(%q) did not return the corpus text", row.Name)
		}
	}
	// An absent docstring is reported as absent, so a caller cannot render a
	// blank description and believe it came from the model.
	if _, found := kmconform.DocFor("NoSuchType"); found {
		t.Fatal("DocFor resolved a type that carries no doc record")
	}
}

func TestGeneratedTypeNamesAreTheClosedList(t *testing.T) {
	corpus := loadCorpus(t)
	if len(kmconform.TypeNames) != len(corpus.Types) {
		t.Fatalf("%d generated type names, %d type records", len(kmconform.TypeNames), len(corpus.Types))
	}
	for index, row := range corpus.Types {
		if kmconform.TypeNames[index] != row.Name {
			t.Fatalf("type %d is %q generated and %q in the corpus", index, kmconform.TypeNames[index], row.Name)
		}
	}
}

func TestBrandsCoverEveryKind(t *testing.T) {
	corpus := loadCorpus(t)
	if len(kmconform.BrandTypeNames) != len(corpus.Kinds) {
		t.Fatalf("%d brand types for %d kinds", len(kmconform.BrandTypeNames), len(corpus.Kinds))
	}
	for index, row := range corpus.Kinds {
		want := strings.ToUpper(row.Name[:1]) + row.Name[1:] + "Digest"
		if kmconform.BrandTypeNames[index] != want {
			t.Fatalf("brand %d is %q, want %q", index, kmconform.BrandTypeNames[index], want)
		}
	}
}

func TestTheValueLevelBrandsAreRuntimeChecks(t *testing.T) {
	// In the model these refusals are type errors and there is nothing to
	// write. Here they are error values, so the test's job is to prove they
	// fire and that they teach — and to leave on record that a caller who
	// drops the error has neither guarantee.
	issuer := kmconform.NewProgramDigest(11)
	other := kmconform.NewProgramDigest(12)
	token := kmconform.NewToken(issuer, 7)
	if value, err := token.Spend(issuer); err != nil || value != 7 {
		t.Fatalf("spending at the issuing register gave (%d, %v), want (7, nil)", value, err)
	}
	_, err := token.Spend(other)
	if err == nil {
		t.Fatal("a token was spent at a register that did not issue it")
	}
	if !strings.Contains(err.Error(), "cross-sort-identifier") {
		t.Fatalf("the refusal does not name the taught reason: %v", err)
	}

	here := kmconform.LanePartition{Lane: kmconform.NewLaneDigest(3), Shard: 0}
	there := kmconform.LanePartition{Lane: kmconform.NewLaneDigest(3), Shard: 1}
	if order, err := kmconform.NewPosition(here, 1).Compare(kmconform.NewPosition(here, 2)); err != nil || order != -1 {
		t.Fatalf("comparing within a partition gave (%d, %v), want (-1, nil)", order, err)
	}
	if _, err := kmconform.NewPosition(here, 1).Compare(kmconform.NewPosition(there, 2)); err == nil {
		t.Fatal("two positions in different partitions compared")
	}
}
