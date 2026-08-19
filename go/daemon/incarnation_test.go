package daemon

import (
	"errors"
	"strings"
	"testing"
)

// TestRoundKeySeparatesChainPositionsAndStores holds the key choice: the round
// is the store together with the incarnation being succeeded, so succession is
// sayable and two stores never collide at one position.
func TestRoundKeySeparatesChainPositionsAndStores(t *testing.T) {
	store, other := strings.Repeat("5", 64), strings.Repeat("6", 64)
	predecessor := strings.Repeat("7", 64)

	head, err := RoundKey(store, "")
	if err != nil {
		t.Fatalf("round key for a chain head: %v", err)
	}
	successor, err := RoundKey(store, predecessor)
	if err != nil {
		t.Fatalf("round key for a successor: %v", err)
	}
	elsewhere, err := RoundKey(other, "")
	if err != nil {
		t.Fatalf("round key for another store: %v", err)
	}
	if head == successor || head == elsewhere || successor == elsewhere {
		t.Fatalf("two rounds shared a key: %s %s %s", head, successor, elsewhere)
	}
}

// TestIncarnationNameCoversItsPredecessor holds the chain's integrity at the
// level of names: a value's name covers its predecessor's name, which is why an
// honest chain cannot carry a cycle.
func TestIncarnationNameCoversItsPredecessor(t *testing.T) {
	store, options := strings.Repeat("5", 64), strings.Repeat("7", 64)
	head, err := IncarnationName(SubstrateIncarnation{Store: store, Options: options})
	if err != nil {
		t.Fatalf("name the chain head: %v", err)
	}
	successor, err := IncarnationName(SubstrateIncarnation{
		Store: store, Options: options, Predecessor: head,
	})
	if err != nil {
		t.Fatalf("name the successor: %v", err)
	}
	if head == successor {
		t.Fatal("a successor and its predecessor share a name")
	}
}

// TestChainWalkIsTotalAndAcyclic holds the walk: it returns the whole history
// newest first, refuses a step the history does not carry rather than ending
// early, and refuses a planted cycle rather than looping.
func TestChainWalkIsTotalAndAcyclic(t *testing.T) {
	seed := func(length int) (map[string]SubstrateIncarnation, []string) {
		t.Helper()
		history := make(map[string]SubstrateIncarnation, length)
		names := make([]string, 0, length)
		predecessor := ""
		for index := 0; index < length; index++ {
			value := SubstrateIncarnation{
				Store:       strings.Repeat("5", 64),
				Options:     strings.Repeat(string(rune('0'+index%10)), 64),
				Predecessor: predecessor,
			}
			name, err := IncarnationName(value)
			if err != nil {
				t.Fatalf("name incarnation %d: %v", index, err)
			}
			history[name] = value
			names = append(names, name)
			predecessor = name
		}
		return history, names
	}

	for _, length := range []int{1, 2, 5, 17} {
		history, names := seed(length)
		walked, err := WalkChain(history, names[len(names)-1])
		if err != nil {
			t.Fatalf("walk a chain of %d: %v", length, err)
		}
		if len(walked) != length {
			t.Fatalf("the walk returned %d steps over a chain of %d", len(walked), length)
		}
		for index, name := range walked {
			if name != names[length-1-index] {
				t.Fatalf("the walk is not newest first at step %d", index)
			}
		}
	}

	history, names := seed(4)
	delete(history, names[1])
	if _, err := WalkChain(history, names[3]); !errors.Is(err, ErrChainStep) {
		t.Fatalf("a missing step returned %v", err)
	}

	// Honest digests cannot form a cycle — a value's name covers its
	// predecessor's — so the cycle has to be planted, and the walk has to
	// survive it rather than run forever.
	history, names = seed(3)
	oldest := history[names[0]]
	oldest.Predecessor = names[2]
	history[names[0]] = oldest
	if _, err := WalkChain(history, names[2]); !errors.Is(err, ErrChainStep) {
		t.Fatalf("a planted cycle returned %v", err)
	}
}

// TestCrashIsNotAFact holds the forgery refusal: the cause roster carries no row
// a crash could enter under, so a retirement on a dead incarnation's behalf is
// unmintable rather than merely discouraged.
func TestCrashIsNotAFact(t *testing.T) {
	incarnation := strings.Repeat("a", 64)
	for _, forged := range []string{"crashed", "killed", "timed-out", "unreachable", ""} {
		if _, err := RetiredIncarnationFact(incarnation, forged); !errors.Is(err, ErrUndeclaredCause) {
			t.Fatalf("the cause %q was mintable: %v", forged, err)
		}
	}
	for _, declared := range RetirementCauses {
		fact, err := RetiredIncarnationFact(incarnation, declared)
		if err != nil {
			t.Fatalf("the declared cause %q was refused: %v", declared, err)
		}
		if fact["cause"] != declared {
			t.Fatalf("the fact carries cause %v, want %q", fact["cause"], declared)
		}
	}
}

// TestFoldNeverSaysLive holds the standing vocabulary: an incarnation the record
// established and never retired reads as established forever, and no elapsed
// anything moves it. "Live" is not one of the answers.
func TestFoldNeverSaysLive(t *testing.T) {
	store := strings.Repeat("5", 64)
	value := SubstrateIncarnation{Store: store, Options: strings.Repeat("7", 64)}
	digest, err := IncarnationName(value)
	if err != nil {
		t.Fatalf("name the incarnation: %v", err)
	}
	standings, err := FoldIncarnations([]map[string]any{
		EstablishedIncarnationFact(digest, value),
	})
	if err != nil {
		t.Fatalf("fold: %v", err)
	}
	if len(standings) != 1 || standings[0].Standing != StandingEstablished {
		t.Fatalf("the fold returned %+v", standings)
	}
	if standings[0].Cause != "" {
		t.Fatalf("an unretired incarnation carries the cause %q", standings[0].Cause)
	}
	for _, forbidden := range []Standing{"live", "running", "alive", "healthy"} {
		if standings[0].Standing == forbidden {
			t.Fatalf("the fold reported %q", forbidden)
		}
	}

	retired, err := RetiredIncarnationFact(digest, CauseDrained)
	if err != nil {
		t.Fatalf("retire: %v", err)
	}
	standings, err = FoldIncarnations([]map[string]any{
		EstablishedIncarnationFact(digest, value), retired,
	})
	if err != nil {
		t.Fatalf("fold a retirement: %v", err)
	}
	if standings[0].Standing != StandingRetired || standings[0].Cause != CauseDrained {
		t.Fatalf("the retired incarnation folded as %+v", standings[0])
	}

	// A retirement for an incarnation the lane never established is a broken
	// record, not a shorter one.
	if _, err := FoldIncarnations([]map[string]any{retired}); err == nil {
		t.Fatal("a retirement with no establishment folded without refusing")
	}
}

// TestGreatestIncarnationRefusesTies holds the read: greatest position wins and
// a tie refuses rather than picking, which is the Environment.ts discipline this
// read inherits.
func TestGreatestIncarnationRefusesTies(t *testing.T) {
	store := strings.Repeat("5", 64)
	standings := []IncarnationStanding{
		{Incarnation: "a", Store: store, Position: 1, Standing: StandingEstablished},
		{Incarnation: "b", Store: store, Position: 2, Standing: StandingEstablished},
	}
	greatest, err := GreatestIncarnation(standings, store)
	if err != nil || greatest.Incarnation != "b" {
		t.Fatalf("the greatest-position read returned %+v, %v", greatest, err)
	}

	tied := append(standings, IncarnationStanding{
		Incarnation: "c", Store: store, Position: 2, Standing: StandingEstablished,
	})
	if _, err := GreatestIncarnation(tied, store); !errors.Is(err, ErrTiedIncarnations) {
		t.Fatalf("a tie returned %v", err)
	}

	if _, err := GreatestIncarnation(standings, strings.Repeat("6", 64)); !errors.Is(
		err, ErrNoIncarnation,
	) {
		t.Fatalf("a store with no incarnation returned %v", err)
	}
}

// TestLameDuckFactCarriesTheVendorsOwnEventName holds the adoption discipline:
// the estate invents no name for the disposition.
func TestLameDuckFactCarriesTheVendorsOwnEventName(t *testing.T) {
	fact := LameDuckFact(strings.Repeat("a", 64), strings.Repeat("b", 64), "foldlab-substrate")
	if fact["event"] != "ldm" {
		t.Fatalf("the lame-duck fact names the event %v, want the vendor's own", fact["event"])
	}
	if fact["server"] != "foldlab-substrate" {
		t.Fatalf("the lame-duck fact names the server %v", fact["server"])
	}
}

// TestLaneDrivenConsumerHoldsNoTransport holds the consumer seam by
// construction: the consumer's whole state is a lane and an anchor, so there is
// no object on which a status callback could be registered.
func TestLaneDrivenConsumerHoldsNoTransport(t *testing.T) {
	consumer := NewLameDuckConsumer(nil)
	if consumer.Anchor().Seq != -1 {
		t.Fatalf("a fresh consumer starts at %d, want the genesis position", consumer.Anchor().Seq)
	}
}
