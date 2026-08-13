//go:build gauntlet_findings

package gauntlet

import (
	"errors"
	"testing"
)

// This probe is intentionally red. CL4 permits deterministic pinned moves,
// but the wire carries no move-set identifier or digest. Replacing every
// mutation's via with an unpinned free-form label therefore erases receipt
// provenance without providing the alternative pinned-move evidence.
func TestFindingG07UnpinnedManualMutationPasses(t *testing.T) {
	fx := buildClimbBundle(t)
	payloads := journalPayloads(t, fx.dir)
	for i, payload := range payloads {
		var fact map[string]any
		mustUnmarshal(t, []byte(payload), &fact)
		if fact["kind"] == "mutation" {
			fact["via"] = "manual"
			payloads[i] = string(mustCanonical(t, fact))
		}
	}
	rechain(t, fx.dir, payloads)
	_, err := verifyClimbAgainstCorpus(fx.dir, climbTestFloors, fx.corpusSHA)
	if err == nil || !errors.Is(err, ErrLineage) {
		t.Fatalf("FINDING-G07: unpinned manual mutation provenance accepted: %v", err)
	}
}
