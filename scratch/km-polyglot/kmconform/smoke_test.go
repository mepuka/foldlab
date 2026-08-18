// EXEMPLAR ONLY — not wired into any build or gate. Hand-written (the
// only hand-written file in this directory) to prove the GENERATED
// package compiles, runs, and carries the tables it claims to.
package kmconform

import "testing"

func TestKindTableIsClosedAndRanked(t *testing.T) {
	if got := len(declKindNames); got != 12 {
		t.Fatalf("kind universe has %d members, want 12", got)
	}
	if KindSchema != 0 || KindProgram != 1 || KindLanguage != 11 {
		t.Fatalf("kind ranks moved: schema=%d program=%d language=%d", KindSchema, KindProgram, KindLanguage)
	}
	if KindProgram.String() != "program" {
		t.Fatalf("kind name round-trip failed: %q", KindProgram.String())
	}
	if _, ok := DeclKindFromRank(12); ok {
		t.Fatal("rank 12 resolved; the universe is closed at 12")
	}
}

func TestStageRankIsMonotone(t *testing.T) {
	if len(holeStageNames) != 5 {
		t.Fatalf("stage universe has %d members, want 5", len(holeStageNames))
	}
	if !StageSealed.Reached(StageOpened) {
		t.Fatal("sealed must have reached opened")
	}
	if StageOpened.Reached(StageSealed) {
		t.Fatal("opened must not have reached sealed")
	}
}

func TestRefusalParityIsTotal(t *testing.T) {
	if len(RefusalTable) != 16 {
		t.Fatalf("taught table has %d rows, want 16", len(RefusalTable))
	}
	machine := 0
	for i, r := range RefusalTable {
		if r.Law == "" || r.Repair == "" {
			t.Fatalf("row %d (%s) refuses without teaching", i, r.Wire)
		}
		if r.Applicability == MachineApplicable {
			machine++
		}
		back, ok := RefusalByWire(r.Wire)
		if !ok || back != RefusalReason(i) {
			t.Fatalf("wire round-trip failed for %q", r.Wire)
		}
	}
	if machine != 4 {
		t.Fatalf("%d machine-applicable repairs, want 4", machine)
	}
	if got := len(MachineApplicableRepairs()); got != 4 {
		t.Fatalf("codemod catalog has %d entries, want 4", got)
	}
}

func TestTokenRefusesCrossRegister(t *testing.T) {
	issuing := NewProgramDigest(3)
	other := NewProgramDigest(99)
	tok := NewToken(issuing, 7)

	if _, err := tok.Spend(issuing); err != nil {
		t.Fatalf("a token must spend at its own register: %v", err)
	}
	_, err := tok.Spend(other)
	if err == nil {
		t.Fatal("a token spent at a foreign register must be refused")
	}
	re, ok := err.(RefusalError)
	if !ok || re.Refusal.Wire != "cross-sort-identifier" {
		t.Fatalf("wrong refusal: %v", err)
	}
}

func TestPositionRefusesCrossPartition(t *testing.T) {
	one := LanePartition{Lane: NewLaneDigest(1), Shard: 0}
	two := LanePartition{Lane: NewLaneDigest(1), Shard: 1}

	if _, err := NewPosition(one, 4).Compare(NewPosition(one, 6)); err != nil {
		t.Fatalf("same-partition compare must succeed: %v", err)
	}
	if _, err := NewPosition(one, 4).Compare(NewPosition(two, 6)); err == nil {
		t.Fatal("cross-partition compare must be refused")
	}
}

func TestVectorsArePresentAndShaped(t *testing.T) {
	if len(EncodingVectors) != 8 {
		t.Fatalf("%d encoding vectors, want one per generator (8)", len(EncodingVectors))
	}
	// Generator tags 0..7 must each appear exactly once.
	var seen [8]int
	for _, v := range EncodingVectors {
		if len(v.Act) == 0 {
			t.Fatalf("vector %q is empty", v.Name)
		}
		if v.Act[0] > 7 {
			t.Fatalf("vector %q carries generator tag %d", v.Name, v.Act[0])
		}
		seen[v.Act[0]]++
	}
	for tag, n := range seen {
		if n != 1 {
			t.Fatalf("generator tag %d appears %d times, want 1", tag, n)
		}
	}

	if len(AdmissionVectors) != 17 {
		t.Fatalf("%d admission vectors, want 17", len(AdmissionVectors))
	}
	admitted := 0
	for _, a := range AdmissionVectors {
		if a.Admitted {
			admitted++
			if len(a.Encoded) == 0 {
				t.Fatalf("admitted vector %q carries no encoding", a.Name)
			}
			continue
		}
		if _, ok := RefusalByWire(a.Reason); !ok {
			t.Fatalf("refused vector %q names unknown reason %q", a.Name, a.Reason)
		}
	}
	if admitted != 1 {
		t.Fatalf("%d admitted vectors, want exactly the lawful twin", admitted)
	}
}

// The admission rows and the taught table agree row for row: the kernel
// gate's control order coincides with RefusalReason declaration order.
func TestAdmissionOrderMatchesRefusalOrder(t *testing.T) {
	for i := 0; i < 16; i++ {
		if AdmissionVectors[i].Admitted {
			t.Fatalf("row %d is admitted; the first 16 rows are the planted unlawful set", i)
		}
		if AdmissionVectors[i].Reason != RefusalTable[i].Wire {
			t.Fatalf("row %d: admission reason %q != refusal row %q",
				i, AdmissionVectors[i].Reason, RefusalTable[i].Wire)
		}
	}
}
