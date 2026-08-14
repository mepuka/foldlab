package main_test

import (
	"encoding/hex"
	"strings"
	"testing"
)

func mustClaimToken(t *testing.T, claim resp) string {
	t.Helper()
	token, ok := claim["token"].(string)
	if !ok {
		t.Fatalf("claim did not return a token: %v", claim)
	}
	decoded, err := hex.DecodeString(token)
	if err != nil || len(decoded) != 32 || hex.EncodeToString(decoded) != token {
		t.Fatalf("claim token is not opaque 32-byte lowercase hex: %q (%v)", token, err)
	}
	return token
}

func TestJournaldClaimTokenCommitsItsClaim(t *testing.T) {
	s := spawn(t, buildJournald(t))
	digest := strings.Repeat("b", 64)

	claim := s.request(map[string]any{
		"id": 1, "op": "claim", "name": "happy", "digest": digest,
		"owner": "worker-a", "leaseMs": 60_000,
	})
	if claim["ok"] != true {
		t.Fatalf("claim: %v", claim)
	}
	token := mustClaimToken(t, claim)

	commit := s.request(map[string]any{
		"id": 2, "op": "commit", "name": "happy", "digest": digest,
		"token": token, "result": "result-a",
	})
	if commit["ok"] != true || commit["first"] != true {
		t.Fatalf("token-backed commit did not land: %v", commit)
	}

	lookup := s.request(map[string]any{
		"id": 3, "op": "lookup", "name": "happy", "digest": digest,
	})
	if lookup["state"] != "committed" || lookup["result"] != "result-a" {
		t.Fatalf("lookup after token-backed commit: %v", lookup)
	}
}

func TestJournaldRefusesForeignClaimTokenDespiteObservedFence(t *testing.T) {
	s := spawn(t, buildJournald(t))
	digest := strings.Repeat("c", 64)

	claim := s.request(map[string]any{
		"id": 1, "op": "claim", "name": "foreign", "digest": digest,
		"owner": "worker-a", "leaseMs": 60_000,
	})
	fence, fenceOK := claim["fence"].(float64)
	if claim["ok"] != true || !fenceOK || fence <= 0 {
		t.Fatalf("claim did not expose its token and fence: %v", claim)
	}
	token := mustClaimToken(t, claim)
	foreign := "0" + token[1:]
	if foreign == token {
		foreign = "1" + token[1:]
	}

	attack := s.request(map[string]any{
		"id": 2, "op": "commit", "name": "foreign", "digest": digest,
		"token": foreign, "result": "forged-result",
	})
	if attack["ok"] != false || attack["reason"] != "fenced" {
		t.Fatalf("foreign token was not fenced: %v", attack)
	}
	if attack["detail"] != "claim token is stale or foreign" {
		t.Fatalf("foreign token reached the effector instead of the token gate: %v", attack)
	}

	commit := s.request(map[string]any{
		"id": 3, "op": "commit", "name": "foreign", "digest": digest,
		"token": token, "result": "owner-result",
	})
	if commit["ok"] != true {
		t.Fatalf("foreign attempt consumed the rightful token: %v", commit)
	}
}

func TestJournaldRefusesStaleTokenAfterSteal(t *testing.T) {
	s := spawn(t, buildJournald(t))
	digest := strings.Repeat("d", 64)

	claimA := s.request(map[string]any{
		"id": 1, "op": "claim", "name": "steal", "digest": digest,
		"owner": "worker-a", "leaseMs": 0,
	})
	fenceA, fenceOK := claimA["fence"].(float64)
	if claimA["ok"] != true || !fenceOK {
		t.Fatalf("claim A: %v", claimA)
	}
	tokenA := mustClaimToken(t, claimA)

	claimB := s.request(map[string]any{
		"id": 2, "op": "claim", "name": "steal", "digest": digest,
		"owner": "worker-b", "leaseMs": 60_000,
	})
	fenceB, fenceOK := claimB["fence"].(float64)
	if claimB["ok"] != true || !fenceOK || fenceB <= fenceA {
		t.Fatalf("claim B did not steal with fresh authority: A=%v B=%v", claimA, claimB)
	}
	tokenB := mustClaimToken(t, claimB)
	if tokenB == tokenA {
		t.Fatalf("claim B reused claim A's token: %q", tokenB)
	}

	stale := s.request(map[string]any{
		"id": 3, "op": "commit", "name": "steal", "digest": digest,
		"token": tokenA, "result": "stale-result",
	})
	if stale["ok"] != false || stale["reason"] != "fenced" || stale["detail"] != "claim token is stale or foreign" {
		t.Fatalf("stale token reached the effector after steal: %v", stale)
	}

	commitB := s.request(map[string]any{
		"id": 4, "op": "commit", "name": "steal", "digest": digest,
		"token": tokenB, "result": "fresh-result",
	})
	if commitB["ok"] != true {
		t.Fatalf("fresh token did not commit after steal: %v", commitB)
	}
}

func TestJournaldPreservesPostDoneAbsorptionAndRefusal(t *testing.T) {
	s := spawn(t, buildJournald(t))
	digest := strings.Repeat("e", 64)

	claim := s.request(map[string]any{
		"id": 1, "op": "claim", "name": "terminal", "digest": digest,
		"owner": "worker-a", "leaseMs": 60_000,
	})
	if claim["ok"] != true {
		t.Fatalf("claim: %v", claim)
	}
	token := mustClaimToken(t, claim)
	if commit := s.request(map[string]any{
		"id": 2, "op": "commit", "name": "terminal", "digest": digest,
		"token": token, "result": "terminal-result",
	}); commit["ok"] != true {
		t.Fatalf("first commit: %v", commit)
	}

	foreign := "0" + token[1:]
	if foreign == token {
		foreign = "1" + token[1:]
	}
	postDone := []struct {
		name   string
		token  string
		result string
		ok     bool
		first  bool
		reason string
	}{
		{name: "spent token, same result", token: token, result: "terminal-result", ok: true, first: false},
		{name: "foreign token, same result", token: foreign, result: "terminal-result", ok: true, first: false},
		{name: "foreign token, different result", token: foreign, result: "replacement-result", ok: false, reason: "committed"},
	}
	for index, attempt := range postDone {
		refusal := s.request(map[string]any{
			"id": 3 + index, "op": "commit", "name": "terminal", "digest": digest,
			"token": attempt.token, "result": attempt.result,
		})
		if refusal["ok"] != attempt.ok {
			t.Fatalf("%s: ok=%v, want %v (%v)", attempt.name, refusal["ok"], attempt.ok, refusal)
		}
		if attempt.ok && refusal["first"] != attempt.first {
			t.Fatalf("%s: first=%v, want %v (%v)", attempt.name, refusal["first"], attempt.first, refusal)
		}
		if !attempt.ok && refusal["reason"] != attempt.reason {
			t.Fatalf("%s: reason=%v, want %v (%v)", attempt.name, refusal["reason"], attempt.reason, refusal)
		}
	}

	lookup := s.request(map[string]any{
		"id": 6, "op": "lookup", "name": "terminal", "digest": digest,
	})
	if lookup["state"] != "committed" || lookup["result"] != "terminal-result" {
		t.Fatalf("post-Done attempts changed the outcome: %v", lookup)
	}
}

func TestJournaldRefusesFabricatedLegacyCommitAuthority(t *testing.T) {
	s := spawn(t, buildJournald(t))
	digest := strings.Repeat("a", 64)

	claim := s.request(map[string]any{
		"id": 1, "op": "claim", "name": "authority", "digest": digest,
		"owner": "worker-a", "leaseMs": 60_000,
	})
	if claim["ok"] != true {
		t.Fatalf("claim: %v", claim)
	}
	fence, ok := claim["fence"].(float64)
	if !ok || fence <= 0 {
		t.Fatalf("claim authority is incomplete: %v", claim)
	}
	token := mustClaimToken(t, claim)

	attack := s.request(map[string]any{
		"id": 2, "op": "commit", "name": "authority", "digest": digest,
		"owner": "worker-b", "fence": fence, "result": "forged-result",
	})
	if attack["ok"] != false {
		t.Fatalf("foreign worker committed with only an observed fence: %v", attack)
	}
	if attack["reason"] != "malformed" {
		t.Fatalf("legacy commit authority reason is %v, want malformed", attack["reason"])
	}

	lookup := s.request(map[string]any{
		"id": 3, "op": "lookup", "name": "authority", "digest": digest,
	})
	if lookup["state"] == "committed" {
		t.Fatalf("foreign fence-only commit reached Done: %v", lookup)
	}

	commit := s.request(map[string]any{
		"id": 4, "op": "commit", "name": "authority", "digest": digest,
		"token": token, "result": "owner-result",
	})
	if commit["ok"] != true {
		t.Fatalf("malformed legacy attempt consumed the daemon token: %v", commit)
	}
}

func TestSameDigestAcrossEffectorNamesDoesNotCollide(t *testing.T) {
	s := spawn(t, buildJournald(t))
	digest := strings.Repeat("d", 64)
	claimAlpha := s.request(map[string]any{
		"id": 1, "op": "claim", "name": "alpha", "digest": digest,
		"owner": "worker-a", "leaseMs": 60_000})
	tokenAlpha := mustClaimToken(t, claimAlpha)
	claimBeta := s.request(map[string]any{
		"id": 2, "op": "claim", "name": "beta", "digest": digest,
		"owner": "worker-b", "leaseMs": 60_000})
	if claimBeta["ok"] != true {
		t.Fatalf("beta claim: %v", claimBeta)
	}
	commitAlpha := s.request(map[string]any{
		"id": 3, "op": "commit", "name": "alpha", "digest": digest,
		"token": tokenAlpha, "result": "alpha-result"})
	if commitAlpha["ok"] != true {
		t.Fatalf("live unsuperseded alpha claim refused: %v", commitAlpha)
	}
}
