package protod

import "context"

// certificate is the admitted side of certify(bytes) -> certificate |
// Refusal. A successful certificate also carries the catalog head captured
// under the same lock as its commit or convergence observation. Task 32 hangs
// persistence of both outcomes from this named seam; it does not add another
// admission path.
type certificate struct {
	Fact        catalogFact
	Created     bool
	CatalogHead string
}

// certify is the catalog's sole admission entry point. Its bytes are the full
// type.create request body so malformed envelopes, grammar refusals, identity
// derivation, ref-graph closure, and durable commit all make one decision at
// one seam. Those bytes enter through constrained admission (admission.go) and
// nothing else, so the catalog certifies the value that arrived rather than a
// decoder's repair of it. Substrate failure remains the separate error result
// and is never disguised as a domain refusal.
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
	commit, refusal, err := d.catalog.commitCertified(
		ctx, request.Structure, request.AssertedDigest, request.Submitter)
	if err != nil || refusal != nil {
		return nil, refusal, err
	}
	return &certificate{
		Fact: commit.fact, Created: commit.created, CatalogHead: commit.catalogHead,
	}, nil, nil
}

// certifyProtocol is the flb.protocol.v0 branch of the same owned
// certification architecture: full request bytes enter once, grammar and
// references are decided before identity, and only a certificate can reach
// the catalog append helper.
func (d *Daemon) certifyProtocol(
	ctx context.Context,
	bytes []byte,
) (*certificate, *Refusal, error) {
	var request protocolCreateRequest
	if refusal := decodeBody(bytes, &request); refusal != nil {
		return nil, refusal, nil
	}
	if request.Protocol == nil {
		return nil, protocolMalformed([]string{"protocol"}, nil, "an flb.protocol.v0 value"), nil
	}
	definition, refusal := d.validateProtocol(request.Protocol, []string{"protocol"})
	if refusal != nil {
		return nil, refusal, nil
	}
	commit, refusal, err := d.catalog.commitValue(
		ctx, definition, protocolScheme, request.AssertedDigest, request.Submitter,
	)
	if err != nil || refusal != nil {
		return nil, refusal, err
	}
	return &certificate{
		Fact: commit.fact, Created: commit.created, CatalogHead: commit.catalogHead,
	}, nil, nil
}
