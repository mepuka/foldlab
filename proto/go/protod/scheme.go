package protod

import (
	"encoding/json"

	"foldlab/canonical"
)

// Scheme is the identity-derivation seam (W10). The interim scheme
// digests the canonical structure bytes; the owned scheme — a digest
// over the normalized flb.type.v0 walk — lands here as a second
// scheme with no wire change.
type scheme interface {
	Name() string
	Derive(canonicalBytes []byte) string
}

type bytesSHA256V1 struct{}

func (bytesSHA256V1) Name() string { return "bytes-sha256-v1" }

func (bytesSHA256V1) Derive(canonicalBytes []byte) string {
	return canonical.DigestHex(canonicalBytes)
}

var activeScheme scheme = bytesSHA256V1{}

// canonicalBytes marshals a decoded JSON value and canonicalizes it
// (RFC 8785). Identity is always of these bytes, never of what the
// submitter happened to send (W2).
func canonicalBytes(value any) ([]byte, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return canonical.Canonicalize(raw)
}
