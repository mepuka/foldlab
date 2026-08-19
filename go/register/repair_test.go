package register

import "testing"

// TestEveryRefusalTeachesARepair holds the refusal-parity law at this seam: a
// failed judgment returns reason, law AND repair, never a bare error.
//
// The roster is the wall's subject rather than its convenience: a kind added to
// the package without a repair row reddens here, and a repair row for a kind
// nobody mints is caught the same way.
func TestEveryRefusalTeachesARepair(t *testing.T) {
	for _, kind := range RefusalKinds {
		refusal := &Refusal{}
		err := refuse(kind, "a law", "got", "want")
		if !asRefusal(err, refusal) {
			t.Fatalf("the kind %q did not mint a typed refusal", kind)
		}
		if len(refusal.Next) == 0 {
			t.Fatalf("the kind %q teaches no repair", kind)
		}
		if refusal.Next[0].Subject == "" || refusal.Next[0].Note == "" {
			t.Fatalf("the kind %q teaches an empty repair: %+v", kind, refusal.Next[0])
		}
		if refusal.Kind != kind || refusal.Law != "a law" {
			t.Fatalf("the refusal moved its own reason or law: %+v", refusal)
		}
	}

	// A kind outside the roster teaches nothing, which is what makes the check
	// above a check rather than a restatement.
	unknown := &Refusal{}
	if !asRefusal(refuse("no-such-kind", "a law", "got", "want"), unknown) {
		t.Fatal("an unknown kind did not mint a typed refusal")
	}
	if len(unknown.Next) != 0 {
		t.Fatalf("an unknown kind taught a repair: %+v", unknown.Next)
	}
}

func asRefusal(err error, into *Refusal) bool {
	refusal, ok := err.(*Refusal)
	if !ok {
		return false
	}
	*into = *refusal
	return true
}

// TestIncarnationLawIsStated holds the pin's law text, which the wall's output
// and the spine's own refusal both quote.
func TestIncarnationLawIsStated(t *testing.T) {
	want := "A fencing token is honored only by the backing-stream incarnation that minted it."
	if incarnationLaw != want {
		t.Fatalf("the incarnation law reads %q", incarnationLaw)
	}
}
