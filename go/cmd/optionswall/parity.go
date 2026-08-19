package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"strings"

	"foldlab/canonical"
	"foldlab/daemon"
)

// The server-option vocabulary's byte-parity comparison, and the two oracles
// that keep it from being two transcriptions agreeing with each other.
//
// Both-sides-agree is not verification: two transcriptions sharing a mistake
// agree perfectly. So this arm carries an oracle OUTSIDE both sides — the pinned
// vendor's own source — and checks the tables against it before comparing them
// with each other:
//
//  1. The pin the tables name is compared against the module this binary
//     actually links, read out of its own build information. A table
//     transcribed at one version and linked against another is a table
//     describing a server nobody is running.
//  2. Every row's site is opened in the pinned vendor's own source and the
//     declaration found there is compared against the row's. A line that moved,
//     a field that was renamed, and a row that was typed from memory are all the
//     same failure to this check.
//
// Only then are the two languages' bytes compared. The spine's declaration is
// the reference for the value SHAPES; the vendor is the reference for the names
// and their sites.

// referenceMint is the one JSON line the spine's minter writes.
type referenceMint struct {
	Values map[string]struct {
		Bytes  string `json:"bytes"`
		Digest string `json:"digest"`
	} `json:"values"`
}

// parityCoordinates are the declared options value both sides mint, chosen here
// and handed over so that neither side declares a value the other did not.
//
// The sync interval crosses as the vendor's OWN rendering of the duration. The
// bound is stated where it bites: the rendering is Go's, so the comparison over
// that field compares what both sides declared and not two independent
// renderings of one duration.
type parityCoordinates struct {
	ServerName      string   `json:"serverName"`
	StoreDir        string   `json:"storeDir"`
	Host            string   `json:"host"`
	Port            int      `json:"port"`
	JetStream       bool     `json:"jetStream"`
	Listen          bool     `json:"listen"`
	NoLog           bool     `json:"noLog"`
	Signals         bool     `json:"signals"`
	SyncInterval    string   `json:"syncInterval"`
	SyncAlways      bool     `json:"syncAlways"`
	HTTPPort        int      `json:"httpPort"`
	HTTPSPort       int      `json:"httpsPort"`
	ProfPort        int      `json:"profPort"`
	WebsocketPort   int      `json:"websocketPort"`
	MQTTPort        int      `json:"mqttPort"`
	ClusterPort     int      `json:"clusterPort"`
	GatewayPort     int      `json:"gatewayPort"`
	LeafNodePort    int      `json:"leafNodePort"`
	LeafNodeRemotes []string `json:"leafNodeRemotes"`
}

func runParity(minter string) error {
	if err := checkPin(); err != nil {
		return err
	}
	if err := checkSites(); err != nil {
		return err
	}

	// A value that is NOT the estate's running one, so the comparison cannot
	// pass by both sides having memorised the same default. Every closed row is
	// still at its closed setting, because a declared value that opened one
	// would be a value the daemon refuses and therefore a value no incarnation
	// could ever cite.
	coordinates := parityCoordinates{
		ServerName:      "foldlab-substrate",
		StoreDir:        "/var/lib/foldlab/substrate",
		Host:            "127.0.0.1",
		Port:            4222,
		JetStream:       true,
		Listen:          true,
		NoLog:           false,
		Signals:         false,
		SyncInterval:    daemon.DeclaredSyncInterval.String(),
		SyncAlways:      daemon.DeclaredSyncAlways,
		HTTPPort:        0,
		HTTPSPort:       0,
		ProfPort:        0,
		WebsocketPort:   0,
		MQTTPort:        0,
		ClusterPort:     0,
		GatewayPort:     0,
		LeafNodePort:    0,
		LeafNodeRemotes: []string{},
	}
	declared := daemon.DeclaredServerOptions{
		ServerName:      coordinates.ServerName,
		StoreDir:        coordinates.StoreDir,
		Host:            coordinates.Host,
		Port:            coordinates.Port,
		JetStream:       coordinates.JetStream,
		Listen:          coordinates.Listen,
		NoLog:           coordinates.NoLog,
		Signals:         coordinates.Signals,
		SyncInterval:    daemon.DeclaredSyncInterval,
		SyncAlways:      coordinates.SyncAlways,
		HTTPPort:        coordinates.HTTPPort,
		HTTPSPort:       coordinates.HTTPSPort,
		ProfPort:        coordinates.ProfPort,
		WebsocketPort:   coordinates.WebsocketPort,
		MQTTPort:        coordinates.MQTTPort,
		ClusterPort:     coordinates.ClusterPort,
		GatewayPort:     coordinates.GatewayPort,
		LeafNodePort:    coordinates.LeafNodePort,
		LeafNodeRemotes: coordinates.LeafNodeRemotes,
	}

	reference, err := mintReference(minter, coordinates)
	if err != nil {
		return err
	}

	near := map[string]map[string]any{
		"table":     daemon.ServerOptionTable,
		"inventory": daemon.ClosedChannelInventory,
		"options":   declared.Value(),
	}
	compared := 0
	for _, name := range []string{"table", "inventory", "options"} {
		encoded, err := canonical.CanonicalizeValue(near[name])
		if err != nil {
			return err
		}
		far, minted := reference.Values[name]
		if !minted {
			return fmt.Errorf("the spine minted no %s", name)
		}
		farBytes := decodeHex(far.Bytes)
		if string(encoded) != farBytes {
			return fmt.Errorf(
				"the two languages folded different bytes for the %s\n  spine: %s\n  go:    %s",
				name, farBytes, encoded,
			)
		}
		if canonical.DigestHex(encoded) != far.Digest {
			return fmt.Errorf("the two languages named different %s values", name)
		}
		fmt.Printf("%s bytes: %s\n", name, encoded)
		fmt.Printf("%s digest: %s (equal)\n\n", name, far.Digest)
		compared++
	}

	fmt.Printf(
		"OPTIONS SCHEMA PARITY: %d declared values byte-equal across the language boundary;"+
			" %d option rows and %d inventory rows checked against the pinned vendor's own source at %s %s\n",
		compared, len(daemon.ServerOptionRoster), len(daemon.ClosedChannels),
		daemon.ServerOptionPin.Module, daemon.ServerOptionPin.Version,
	)
	return nil
}

// checkPin holds the tables' declared pin against the module this binary links.
//
// The build information is read from the running binary rather than from a
// manifest, because what a manifest says and what a binary links are two
// different facts and only the second one is what the daemon runs.
func checkPin() error {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return fmt.Errorf("this binary carries no build information to check the pin against")
	}
	for _, dependency := range info.Deps {
		if dependency.Path != daemon.ServerOptionPin.Module {
			continue
		}
		linked := dependency.Version
		if dependency.Replace != nil {
			linked = dependency.Replace.Version
		}
		if linked != daemon.ServerOptionPin.Version {
			return fmt.Errorf(
				"the option table is transcribed at %s and this binary links %s",
				daemon.ServerOptionPin.Version, linked,
			)
		}
		fmt.Printf(
			"pin oracle: the tables name %s %s and this binary links the same\n",
			daemon.ServerOptionPin.Module, linked,
		)
		return nil
	}
	return fmt.Errorf("this binary does not link %s at all", daemon.ServerOptionPin.Module)
}

// checkSites holds every row's site against the pinned vendor's own source.
//
// The vendor's source is the oracle OUTSIDE both transcriptions. A row names a
// declaration and a place; this reads the place and checks that the declaration
// found there is the one the row names. A row typed from memory, a line that
// moved under a vendor bump, and a field the vendor renamed all fail here rather
// than surviving because both languages copied the same mistake.
func checkSites() error {
	root, err := vendorRoot()
	if err != nil {
		return err
	}
	sources := make(map[string][]string)
	checked := 0
	for _, option := range daemon.ServerOptionRoster {
		if err := checkSite(root, sources, option.Site, option.Declaration); err != nil {
			return fmt.Errorf("the option row %q: %w", option.Name, err)
		}
		checked++
	}
	for _, channel := range daemon.ClosedChannels {
		if err := checkSite(root, sources, channel.Site, channel.Declaration); err != nil {
			return fmt.Errorf("the inventory row %q: %w", channel.Row, err)
		}
		checked++
	}
	fmt.Printf(
		"site oracle: %d rows resolved in the pinned vendor's own source, each declaring the field it names\n",
		checked,
	)
	return nil
}

// checkSite reads one site and compares the declaration found there with the one
// the row names.
func checkSite(root string, sources map[string][]string, site string, declaration string) error {
	file, line, err := splitSite(site)
	if err != nil {
		return err
	}
	lines, read := sources[file]
	if !read {
		lines, err = readLines(filepath.Join(root, filepath.FromSlash(file)))
		if err != nil {
			return err
		}
		sources[file] = lines
	}
	if line < 1 || line > len(lines) {
		return fmt.Errorf("%s names line %d of a file with %d lines", site, line, len(lines))
	}
	// The row's declaration is a selector path through the vendor's own types;
	// the field it ends in is what the named line has to declare.
	segments := strings.Split(declaration, ".")
	field := segments[len(segments)-1]
	fields := strings.Fields(lines[line-1])
	if len(fields) == 0 || fields[0] != field {
		return fmt.Errorf(
			"%s declares %q and the row names %s", site, strings.TrimSpace(lines[line-1]), declaration,
		)
	}
	return nil
}

func splitSite(site string) (string, int, error) {
	cut := strings.LastIndex(site, ":")
	if cut < 0 {
		return "", 0, fmt.Errorf("the site %q names no line", site)
	}
	line, err := strconv.Atoi(site[cut+1:])
	if err != nil {
		return "", 0, fmt.Errorf("the site %q names no line: %w", site, err)
	}
	return site[:cut], line, nil
}

func readLines(path string) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open the pinned vendor's source: %w", err)
	}
	defer file.Close()
	lines := make([]string, 0, 4096)
	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 0, 1<<20), 1<<20)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return lines, nil
}

// vendorRoot locates the pinned vendor's own source in the module cache.
//
// The location is derived from the toolchain rather than declared here, and a
// cache that does not carry the pinned module FAILS rather than skipping: a site
// oracle that quietly stops reading the vendor is a wall that stopped being one.
func vendorRoot() (string, error) {
	output, err := exec.Command("go", "env", "GOMODCACHE").Output()
	if err != nil {
		return "", fmt.Errorf("ask the toolchain where the module cache is: %w", err)
	}
	cache := strings.TrimSpace(string(output))
	if cache == "" {
		return "", fmt.Errorf("the toolchain reports no module cache")
	}
	root := filepath.Join(
		cache,
		filepath.FromSlash(daemon.ServerOptionPin.Module+"@"+daemon.ServerOptionPin.Version),
	)
	if _, err := os.Stat(root); err != nil {
		return "", fmt.Errorf("the module cache does not carry the pinned vendor: %w", err)
	}
	return root, nil
}

func mintReference(minter string, coordinates parityCoordinates) (referenceMint, error) {
	encoded, err := json.Marshal(coordinates)
	if err != nil {
		return referenceMint{}, err
	}
	command := exec.Command("bun", minter, string(encoded))
	command.Stderr = os.Stderr
	output, err := command.Output()
	if err != nil {
		return referenceMint{}, fmt.Errorf("mint the spine's reference values: %w", err)
	}
	minted := referenceMint{}
	if err := json.Unmarshal(output, &minted); err != nil {
		return referenceMint{}, fmt.Errorf("decode the spine's reference values: %w", err)
	}
	return minted, nil
}

// decodeHex reads back the hexadecimal the spine wrote its canonical bytes as,
// so the comparison is over bytes rather than over two encodings of them.
func decodeHex(encoded string) string {
	if len(encoded)%2 != 0 {
		return ""
	}
	decoded := make([]byte, 0, len(encoded)/2)
	for index := 0; index < len(encoded); index += 2 {
		high, low := hexNibble(encoded[index]), hexNibble(encoded[index+1])
		if high < 0 || low < 0 {
			return ""
		}
		decoded = append(decoded, byte(high<<4|low))
	}
	return string(decoded)
}

func hexNibble(character byte) int {
	switch {
	case character >= '0' && character <= '9':
		return int(character - '0')
	case character >= 'a' && character <= 'f':
		return int(character-'a') + 10
	default:
		return -1
	}
}
