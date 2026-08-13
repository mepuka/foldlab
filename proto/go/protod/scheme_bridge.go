package protod

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

const schemeBridgeKind = "flb.scheme-bridge.v0"

type schemeIdentity struct {
	Digest string `json:"digest"`
	Scheme string `json:"scheme"`
}

// schemeBridge is append-only evidence that one owned term was identified
// under two schemes. It never rewrites either catalog fact in place.
type schemeBridge struct {
	Kind string         `json:"kind"`
	From schemeIdentity `json:"from"`
	To   schemeIdentity `json:"to"`
}

func newSchemeBridge(fromScheme, fromDigest, toScheme, toDigest string) schemeBridge {
	return schemeBridge{
		Kind: schemeBridgeKind,
		From: schemeIdentity{Scheme: fromScheme, Digest: fromDigest},
		To:   schemeIdentity{Scheme: toScheme, Digest: toDigest},
	}
}

func decodeSchemeBridge(encoded []byte) (schemeBridge, error) {
	decoder := json.NewDecoder(bytes.NewReader(encoded))
	decoder.DisallowUnknownFields()
	var bridge schemeBridge
	if err := decoder.Decode(&bridge); err != nil {
		return schemeBridge{}, err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		if err == nil {
			return schemeBridge{}, fmt.Errorf("scheme bridge carries trailing JSON")
		}
		return schemeBridge{}, err
	}
	if bridge.Kind != schemeBridgeKind {
		return schemeBridge{}, fmt.Errorf("scheme bridge kind %q, want %q", bridge.Kind, schemeBridgeKind)
	}
	if bridge.From.Scheme == "" || bridge.To.Scheme == "" {
		return schemeBridge{}, fmt.Errorf("scheme bridge names both schemes")
	}
	if !hexDigest.MatchString(bridge.From.Digest) || !hexDigest.MatchString(bridge.To.Digest) {
		return schemeBridge{}, fmt.Errorf("scheme bridge digests are 64 lowercase hex characters")
	}
	return bridge, nil
}
