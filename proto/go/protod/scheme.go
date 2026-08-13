package protod

import (
	"encoding/json"

	"foldlab/canonical"
)

// Scheme is the identity-derivation seam (W10). Both current schemes use
// SHA-256 over RFC 8785 bytes. Their distinction is the preimage contract:
// bytes-sha256-v1 attests bytes, while flb.type.v1 names the normal form of
// the owned flb.type.v0 walk.
type scheme interface {
	Name() string
	Derive(canonicalBytes []byte) string
}

type bytesSHA256V1 struct{}

func (bytesSHA256V1) Name() string { return "bytes-sha256-v1" }

func (bytesSHA256V1) Derive(canonicalBytes []byte) string {
	return canonical.DigestHex(canonicalBytes)
}

const flbTypeV1Scheme = "flb.type.v1"

type flbTypeV1 struct{}

func (flbTypeV1) Name() string { return flbTypeV1Scheme }

func (flbTypeV1) Derive(normalFormBytes []byte) string {
	return canonical.DigestHex(normalFormBytes)
}

var activeScheme scheme = flbTypeV1{}

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
