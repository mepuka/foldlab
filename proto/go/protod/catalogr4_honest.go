//go:build !catalogr4_sabotage

package protod

import "errors"

func configuredScheme(opts Options) (scheme, error) {
	if opts.CatalogR4Sabotage {
		return nil, errors.New("protod: catalog R4 sabotage is unavailable in an honest build")
	}
	return bytesSHA256V1{}, nil
}
