package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"foldlab/daemon"
)

// The oracle outside both transcriptions: the pinned vendor sources as
// INSTALLED in this checkout.
//
// Both-sides-agree is not verification. Two transcriptions sharing a mistake
// agree perfectly, and two languages holding one generated table agree by
// construction. So every row's provenance digest is re-derived here from the
// bytes the pinned package actually ships — the Go modules out of the
// toolchain's own module cache, the node packages out of the spine's own
// install — and a pinned source this checkout does not carry is a FAILURE
// rather than a skip. A digest arm that quietly stopped reading the vendor
// would be a wall that stopped being one.

// vendorRoots resolves each pinned package to its installed root.
//
// The Go modules are located through the toolchain rather than through a
// declared path, and the node packages through the spine's own install. Each
// root is then checked to carry the pinned VERSION, so a checkout that
// installed something else fails here instead of digesting the wrong bytes.
type vendorRoots struct {
	roots map[string]string
}

func resolveVendorRoots(repo string) (*vendorRoots, error) {
	output, err := exec.Command("go", "env", "GOMODCACHE").Output()
	if err != nil {
		return nil, fmt.Errorf("ask the toolchain where the module cache is: %w", err)
	}
	cache := strings.TrimSpace(string(output))
	if cache == "" {
		return nil, fmt.Errorf("the toolchain reports no module cache")
	}

	roots := map[string]string{}
	for _, pin := range []daemon.VendorPin{daemon.NATSServerPin, daemon.NATSGoClientPin} {
		root := filepath.Join(cache, filepath.FromSlash(pin.Module+"@"+pin.Version))
		if _, err := os.Stat(root); err != nil {
			return nil, fmt.Errorf(
				"the module cache does not carry the pinned vendor %s %s: %w",
				pin.Module, pin.Version, err,
			)
		}
		roots[pin.Module] = root
	}
	for _, pin := range []daemon.VendorPin{daemon.NATSCorePin, daemon.NATSKVPin} {
		root := filepath.Join(
			repo, "packages", "plait", "node_modules", filepath.FromSlash(pin.Module),
		)
		installed, err := installedVersion(root)
		if err != nil {
			return nil, fmt.Errorf(
				"the spine's install does not carry the pinned vendor %s %s: %w",
				pin.Module, pin.Version, err,
			)
		}
		if installed != pin.Version {
			return nil, fmt.Errorf(
				"the table pins %s %s and this checkout installs %s",
				pin.Module, pin.Version, installed,
			)
		}
		roots[pin.Module] = root
	}
	return &vendorRoots{roots: roots}, nil
}

func installedVersion(root string) (string, error) {
	raw, err := os.ReadFile(filepath.Join(root, "package.json"))
	if err != nil {
		return "", err
	}
	manifest := struct {
		Version string `json:"version"`
	}{}
	if err := json.Unmarshal(raw, &manifest); err != nil {
		return "", err
	}
	if manifest.Version == "" {
		return "", fmt.Errorf("the installed package states no version")
	}
	return manifest.Version, nil
}

// regionBytes reads one region out of the pinned source as installed.
//
// The region is the named line span, joined by single newlines with a trailing
// one, so the digest is a function of the source's TEXT and not of whichever
// line ending the packaging happened to ship. A span that runs past the end of
// the file, or names a file the package does not carry, fails.
func (v *vendorRoots) regionBytes(region daemon.WireRegion) ([]byte, error) {
	root, carried := v.roots[region.Pin.Module]
	if !carried {
		return nil, fmt.Errorf("no installed root for the pinned vendor %s", region.Pin.Module)
	}
	path := filepath.Join(root, filepath.FromSlash(region.File))
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open the pinned vendor's source: %w", err)
	}
	defer file.Close()

	if region.First < 1 || region.Last < region.First {
		return nil, fmt.Errorf("the region names the empty span %d-%d", region.First, region.Last)
	}
	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 0, 1<<20), 1<<20)
	line := 0
	span := make([]string, 0, region.Last-region.First+1)
	for scanner.Scan() {
		line++
		if line < region.First {
			continue
		}
		if line > region.Last {
			break
		}
		span = append(span, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	if len(span) != region.Last-region.First+1 {
		return nil, fmt.Errorf(
			"the region names lines %d-%d of a file with %d lines",
			region.First, region.Last, line,
		)
	}
	return []byte(strings.Join(span, "\n") + "\n"), nil
}

// digestRegions re-derives every region digest from the installed sources.
func (v *vendorRoots) digestRegions() (map[string]string, error) {
	digests := map[string]string{}
	for _, region := range daemon.WireRegions() {
		bytes, err := v.regionBytes(region)
		if err != nil {
			return nil, fmt.Errorf("the region %s: %w", region.Key(), err)
		}
		sum := sha256.Sum256(bytes)
		digests[region.Key()] = hex.EncodeToString(sum[:])
	}
	return digests, nil
}
