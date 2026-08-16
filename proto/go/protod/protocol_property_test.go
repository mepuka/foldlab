// Self-consistency properties for the protocol-session fill path:
// permutation convergence under redelivery, and the at-least-once collapse
// across a process restart. These claim daemon self-consistency laws, not
// model verdicts — the generated DEV-670 wall subsumes them.
//
// The generated multisets give each seat at most one distinct value on
// purpose: the no-self-revision refusal is order-DEPENDENT by design (a
// seat that contributed the filled value refuses a differing value while
// the hole is filled yet absorbs it while disputed), so convergence is
// claimed exactly over the multisets where no refusal can fire in any
// order.
package protod_test

import (
	"fmt"
	"math/rand"
	"reflect"
	"testing"
)

type permutationFill struct {
	principal string
	value     string
}

func runPermutationOrder(t *testing.T, rng *rand.Rand, fills []permutationFill, order []int) string {
	t.Helper()
	h := acquire(t)
	protocol := bootstrapThreeSeatDecision(t, h)
	opened := h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": protocol, "bindings": readProtocolMoveFixture(t).Bindings,
	})
	if opened["ok"] != true {
		t.Fatalf("open: %v", opened)
	}
	session := opened["session"].(string)
	delivered := make([]permutationFill, 0, len(fills))
	for _, position := range order {
		fill := fills[position]
		mustFillProtocol(t, h, session, fill.principal, "decision", fill.value)
		delivered = append(delivered, fill)
		if rng.Intn(3) == 0 {
			redelivery := delivered[rng.Intn(len(delivered))]
			before := protocolState(t, h, session)
			result := mustFillProtocol(t, h, session, redelivery.principal, "decision", redelivery.value)
			if result["head"] != before["head"] {
				t.Fatalf("redelivery of %v moved the head: %v -> %v", redelivery, before["head"], result["head"])
			}
			after := protocolState(t, h, session)
			if !reflect.DeepEqual(before, after) {
				t.Fatalf("redelivery of %v changed the served fold:\nbefore: %v\nafter:  %v", redelivery, before, after)
			}
		}
	}
	mustCloseProtocol(t, h, session, "operator-principal")
	return protocolState(t, h, session)["final_state_digest"].(string)
}

func TestFillPermutationsConvergeUnderRedelivery(t *testing.T) {
	seeds := []int64{0x06750001, 0x06750002}
	principals := map[string]string{
		"operator":    "operator-principal",
		"coordinator": "coordinator-principal",
		"builder":     "builder-principal",
	}
	seatNames := []string{"operator", "coordinator", "builder"}
	alphabet := []string{"v", "w", "x"}
	const casesPerSeed = 12
	for _, seed := range seeds {
		rng := rand.New(rand.NewSource(seed))
		for caseIndex := range casesPerSeed {
			t.Run(fmt.Sprintf("seed-%#x-case-%02d", seed, caseIndex), func(t *testing.T) {
				fills := []permutationFill{}
				for _, seat := range seatNames {
					if rng.Intn(2) == 0 {
						continue
					}
					value := alphabet[rng.Intn(len(alphabet))]
					for range 1 + rng.Intn(2) {
						fills = append(fills, permutationFill{principals[seat], value})
					}
				}
				if len(fills) == 0 {
					fills = append(fills, permutationFill{principals["coordinator"], alphabet[rng.Intn(len(alphabet))]})
				}
				orderA := rng.Perm(len(fills))
				orderB := rng.Perm(len(fills))
				digestA := runPermutationOrder(t, rng, fills, orderA)
				digestB := runPermutationOrder(t, rng, fills, orderB)
				if digestA != digestB {
					t.Fatalf("fill multiset %v diverged across orders %v and %v:\n%s\n%s",
						fills, orderA, orderB, digestA, digestB)
				}
			})
		}
	}
}

func TestRestartRedeliveryCollapses(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	session := openTaskAcceptanceSession(t, h)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "accept"})
	before := protocolState(t, h, session)
	release()

	reopened, _ := acquireStore(t, store)
	redelivered := mustFillProtocol(t, reopened, session, "coordinator-principal", "decision", map[string]any{"verdict": "accept"})
	if redelivered["head"] != before["head"] {
		t.Fatalf("restart redelivery moved the head: %v -> %v", before["head"], redelivered["head"])
	}
	after := protocolState(t, reopened, session)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("restart redelivery changed the served fold:\nbefore: %v\nafter:  %v", before, after)
	}
}
