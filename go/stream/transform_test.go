package stream

import "testing"

func txCorpus() []Event {
	return []Event{
		ev("alpha", 1, "a=1"), ev("beta", 1, "c=x"), ev("alpha", 2, "ab=2"),
		ev("beta", 2, "a=y"), ev("alpha", 3, "b=3"),
	}
}

func txHead(events []Event) Head { return HeadFrom(StreamSeed("t"), events) }

// XL1: fusion — one pass over the composition equals the sequential passes.
func TestComposeFuses(t *testing.T) {
	f, g, h := RenameStream("z"), FilterKeyPrefix("a"), MapValueUpper()
	xs := txCorpus()
	fused := Apply(Compose(f, g, h), xs)
	sequential := Apply(h, Apply(g, Apply(f, xs)))
	if txHead(fused) != txHead(sequential) {
		t.Fatalf("fusion broke: fused and sequential streams differ")
	}
	if len(fused) == 0 || len(fused) == len(xs) {
		t.Fatalf("degenerate corpus: filter did nothing or everything")
	}
}

// XL2: associativity, witnessed by head equality.
func TestComposeAssociative(t *testing.T) {
	f, g, h := RenameStream("z"), FilterKeyPrefix("a"), MapValueUpper()
	xs := txCorpus()
	left := Apply(Compose(Compose(f, g), h), xs)
	right := Apply(Compose(f, Compose(g, h)), xs)
	if txHead(left) != txHead(right) {
		t.Fatalf("composition is not associative")
	}
}

// XL3: empty composition is identity, and xforms do not mutate inputs.
func TestComposeIdentityAndPurity(t *testing.T) {
	xs := txCorpus()
	before := txHead(xs)
	if txHead(Apply(Compose(), xs)) != before {
		t.Fatalf("Compose() is not identity")
	}
	Apply(Compose(RenameStream("z"), MapValueUpper()), xs)
	if txHead(xs) != before {
		t.Fatalf("a transform mutated its input stream")
	}
}
