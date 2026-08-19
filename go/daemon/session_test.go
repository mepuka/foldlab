package daemon

import (
	"errors"
	"strings"
	"testing"
)

// TestRosterIsTranscribedInOrder pins the roster's committed prefix.
//
// The roster's digest rides every folded declaration, so a row renamed,
// reordered, retyped, or removed silently renames every session this package
// ever folded. The pin below is the wall behind the add-only discipline on
// this side of the transcription: an append passes and every other edit
// reddens.
func TestRosterIsTranscribedInOrder(t *testing.T) {
	committed := []string{
		"server_id", "server_name", "version", "proto", "go", "host", "port",
		"headers", "max_payload", "jetstream", "client_id", "client_ip",
		"connect_info", "remote_account", "api_lvl", "xkey",
	}
	if len(SubstrateFields) < len(committed) {
		t.Fatalf("the roster lost rows: %d, want at least %d", len(SubstrateFields), len(committed))
	}
	for index, name := range committed {
		if SubstrateFields[index].Name != name {
			t.Fatalf("roster row %d is %q, want %q", index, SubstrateFields[index].Name, name)
		}
	}
}

// TestRosterDigestIsStable pins the roster's name. The far side folds under
// the same roster and rides the same digest, so this value moving without the
// reference's moving is a divergence rather than an edit.
func TestRosterDigestIsStable(t *testing.T) {
	name, err := RosterDigest(SubstrateRoster)
	if err != nil {
		t.Fatalf("digest the roster: %v", err)
	}
	if len(name) != 64 {
		t.Fatalf("the roster's name is %q", name)
	}
	again, err := RosterDigest(RosterValue(SubstrateFields))
	if err != nil {
		t.Fatalf("re-digest the roster: %v", err)
	}
	if again != name {
		t.Fatal("the roster's name is not a function of its rows")
	}
}

// TestAbsentFieldsFoldNull holds the fixed key set: a field the substrate did
// not send folds as null rather than being absent, so two mints over one
// connection cannot differ by an optional field's presence.
func TestAbsentFieldsFoldNull(t *testing.T) {
	folded, err := SubstrateDeclarationOf(map[string]any{"server_id": "one"})
	if err != nil {
		t.Fatalf("fold: %v", err)
	}
	fields, ok := folded["fields"].(map[string]any)
	if !ok {
		t.Fatal("the folded declaration carries no fields")
	}
	if len(fields) != len(SubstrateFields) {
		t.Fatalf("the folded key set has %d rows, want %d", len(fields), len(SubstrateFields))
	}
	for name, value := range fields {
		if name == "server_id" {
			continue
		}
		if value != nil {
			t.Fatalf("the absent field %q folded %v rather than null", name, value)
		}
	}
}

// TestCoercedFieldRefuses holds the sort discipline: a field sent at a sort the
// roster does not name refuses rather than folding a coerced value, because a
// coerced field moves the session digest without moving anything the substrate
// said.
func TestCoercedFieldRefuses(t *testing.T) {
	_, err := SubstrateDeclarationOf(map[string]any{"max_payload": "1048576"})
	if !errors.Is(err, ErrFieldSort) {
		t.Fatalf("a string in a number row returned %v", err)
	}
	if _, err := SubstrateDeclarationOf(map[string]any{"headers": float64(1)}); !errors.Is(err, ErrFieldSort) {
		t.Fatalf("a number in a boolean row returned %v", err)
	}
}

// TestShapeSetIsASet holds group three's normalization: two parties asserting
// the same shapes in different orders fold the same bytes.
func TestShapeSetIsASet(t *testing.T) {
	one := EstateDeclaration(nil, "layer", []string{"b", "a", "b"})
	two := EstateDeclaration(nil, "layer", []string{"a", "b"})
	left, err := SessionBytes(one)
	if err != nil {
		t.Fatalf("canonicalize: %v", err)
	}
	right, err := SessionBytes(two)
	if err != nil {
		t.Fatalf("canonicalize: %v", err)
	}
	if string(left) != string(right) {
		t.Fatalf("the shape set is order-dependent\n  %s\n  %s", left, right)
	}
}

// TestUndeclaredWritIsNotTheLeastWrit holds group three's distinction: no writ
// declared and an empty writ are different facts.
func TestUndeclaredWritIsNotTheLeastWrit(t *testing.T) {
	least := "0000000000000000000000000000000000000000000000000000000000000000"
	undeclared, err := SessionBytes(EstateDeclaration(nil, "layer", nil))
	if err != nil {
		t.Fatalf("canonicalize: %v", err)
	}
	declared, err := SessionBytes(EstateDeclaration(&least, "layer", nil))
	if err != nil {
		t.Fatalf("canonicalize: %v", err)
	}
	if string(undeclared) == string(declared) {
		t.Fatal("an undeclared writ folded the same bytes as a declared one")
	}
	if !strings.Contains(string(undeclared), `"writ":null`) {
		t.Fatalf("an undeclared writ did not fold null: %s", undeclared)
	}
}

// TestSessionNameIsAPureFunctionOfTheGroups holds the whole property the
// differential rests on: the fold reaches no connection, so two parties
// holding the same three groups compute the same name with zero I/O.
func TestSessionNameIsAPureFunctionOfTheGroups(t *testing.T) {
	substrate, err := SubstrateDeclarationOf(map[string]any{
		"server_id": "one", "port": float64(4222), "jetstream": true,
	})
	if err != nil {
		t.Fatalf("fold: %v", err)
	}
	estate := EstateDeclaration(nil, "layer", nil)
	first, err := SessionName(SessionValue(substrate, "options", estate))
	if err != nil {
		t.Fatalf("name: %v", err)
	}
	second, err := SessionName(SessionValue(substrate, "options", estate))
	if err != nil {
		t.Fatalf("name: %v", err)
	}
	if first != second {
		t.Fatal("the session name is not a function of its groups")
	}
	moved, err := SessionName(SessionValue(substrate, "other", estate))
	if err != nil {
		t.Fatalf("name: %v", err)
	}
	if moved == first {
		t.Fatal("a moved group-two digest did not move the session name")
	}
}

// TestGreetingParsesTheVendorsOwnOperation holds the transcription: the
// greeting's operation word is the vendor's, and a line without it refuses.
func TestGreetingParsesTheVendorsOwnOperation(t *testing.T) {
	parsed, err := parseGreeting([]byte(`INFO {"server_id":"one","port":4222}`))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if parsed["server_id"] != "one" {
		t.Fatalf("the greeting parsed to %v", parsed)
	}
	if _, err := parseGreeting([]byte(`PONG`)); err == nil {
		t.Fatal("a line that is not a greeting parsed as one")
	}
}

// TestDeclaredOptionsCarryTheVendorsOwnNames holds the transcription of the
// declared server-options value: every key is the pinned vendor's own.
func TestDeclaredOptionsCarryTheVendorsOwnNames(t *testing.T) {
	declared := DeclaredServerOptions{
		ServerName: "name", StoreDir: "store", Host: "127.0.0.1", Port: -1,
		JetStream: true, Listen: true,
		SyncInterval: DeclaredSyncInterval, SyncAlways: DeclaredSyncAlways,
	}
	encoded, err := declared.Bytes()
	if err != nil {
		t.Fatalf("canonicalize: %v", err)
	}
	for _, name := range []string{
		`"server_name"`, `"store_dir"`, `"addr"`, `"port"`, `"jetstream"`, `"dont_listen"`,
		`"no_log"`, `"sync_interval"`, `"sync_always"`,
	} {
		if !strings.Contains(string(encoded), name) {
			t.Fatalf("the declared value does not carry %s: %s", name, encoded)
		}
	}

	options, err := declared.ServerOptions()
	if err != nil {
		t.Fatalf("construct: %v", err)
	}
	if options.DontListen {
		t.Fatal("a listening declared value constructed a no-listen server")
	}
	if _, err := (DeclaredServerOptions{
		ServerName: "name", JetStream: true, SyncInterval: DeclaredSyncInterval,
	}).ServerOptions(); err == nil {
		t.Fatal("a JetStream-enabled value with no store directory constructed a server")
	}

	// The three ruled rows, refused when they are absent rather than filled in
	// silently. An option the estate did not declare is an option the estate is
	// not running under knowingly, and that is the whole reason the rows exist.
	if _, err := (DeclaredServerOptions{
		StoreDir: "store", SyncInterval: DeclaredSyncInterval,
	}).ServerOptions(); !errors.Is(err, ErrUndeclaredServerName) {
		t.Fatalf("an unnamed server constructed: %v", err)
	}
	if _, err := (DeclaredServerOptions{
		ServerName: "name", StoreDir: "store",
	}).ServerOptions(); !errors.Is(err, ErrUndeclaredSyncInterval) {
		t.Fatalf("an undeclared sync interval constructed: %v", err)
	}

	// The declared rows reach the vendor's own fields unchanged, and the log
	// posture is the declared value's rather than this package's.
	if options.SyncInterval != DeclaredSyncInterval || options.SyncAlways != DeclaredSyncAlways {
		t.Fatalf("the durability rows did not reach the vendor: %v %t",
			options.SyncInterval, options.SyncAlways)
	}
	if options.NoLog {
		t.Fatal("the daemon posture suppressed the substrate's log")
	}
	hermeticOptions, err := DeclaredServerOptions{
		ServerName: "name", StoreDir: "store", JetStream: true,
		NoLog: true, SyncInterval: DeclaredSyncInterval,
	}.ServerOptions()
	if err != nil {
		t.Fatalf("construct the hermetic posture: %v", err)
	}
	if !hermeticOptions.NoLog {
		t.Fatal("a hermetic declared value did not keep its own log suppression")
	}
}
