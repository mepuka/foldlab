package protod

import "context"

// certificate is the admitted side of certify(bytes) -> certificate |
// Refusal. Task 32 hangs persistence of both outcomes from this named seam;
// it does not add another admission path.
type certificate struct {
	Fact    catalogFact
	Created bool
}

// certify is the catalog's sole admission entry point. Its bytes are the full
// type.create request body so malformed envelopes, grammar refusals, identity
// derivation, ref-graph closure, and durable commit all make one decision at
// one seam. Substrate failure remains the separate error result and is never
// disguised as a domain refusal.
func (d *Daemon) certify(
	ctx context.Context,
	bytes []byte,
) (*certificate, *Refusal, error) {
	var request createRequest
	if refusal := decodeBody(bytes, &request); refusal != nil {
		return nil, refusal, nil
	}
	if request.Structure == nil {
		return nil, &Refusal{
			Kind:     KindMalformed,
			Law:      "type.create carries the submitted structure in \"structure\"",
			Path:     []string{"structure"},
			Expected: "an flb.type.v0 node",
			Example:  map[string]any{"structure": map[string]any{"k": "string"}},
			Next:     []NextHint{describeHint()},
		}, nil
	}
	fact, created, refusal, err := d.catalog.commitCertified(
		ctx, request.Structure, request.AssertedDigest, request.Submitter)
	if err != nil || refusal != nil {
		return nil, refusal, err
	}
	return &certificate{Fact: fact, Created: created}, nil, nil
}
