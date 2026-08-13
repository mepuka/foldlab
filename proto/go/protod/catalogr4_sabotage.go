//go:build catalogr4_sabotage

package protod

import "foldlab/canonical"

// catalogR4AssertedIdentity is the executable negative control for the R2
// AssertedIdentity variant: the catalog commits an identity that was not
// derived from the submitted canonical structure while retaining the honest
// scheme tag. This file is absent from every normal build.
type catalogR4AssertedIdentity struct{}

func (catalogR4AssertedIdentity) Name() string { return "bytes-sha256-v1" }

func (catalogR4AssertedIdentity) Derive(canonicalBytes []byte) string {
	preimage := append([]byte("catalog-r4-asserted-identity:"), canonicalBytes...)
	return canonical.DigestHex(preimage)
}

func configuredScheme(opts Options) (scheme, error) {
	if opts.CatalogR4Sabotage {
		return catalogR4AssertedIdentity{}, nil
	}
	return bytesSHA256V1{}, nil
}
