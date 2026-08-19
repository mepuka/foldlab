package daemon

import (
	"strings"
	"testing"
)

// estateDeclared is the estate's own declared server-options value at the
// posture this package's tests run under: hermetic, no socket, and every
// closed-inventory row at its closed setting.
func estateDeclared() DeclaredServerOptions {
	return DeclaredServerOptions{
		ServerName:   "foldlab-options-test",
		StoreDir:     "/var/lib/foldlab/substrate",
		SyncInterval: DeclaredSyncInterval,
		SyncAlways:   DeclaredSyncAlways,
		NoLog:        true,
	}
}

// TestEveryRefusalTeachesARepair holds refusal parity at this seam: a failed
// judgment returns reason, law AND repair, never a bare error.
//
// The roster is the subject rather than the convenience. A reason added to the
// package without a repair reddens here, and the closed-channel reason is
// checked through a real inventory row, because that is where its repair lives.
func TestEveryRefusalTeachesARepair(t *testing.T) {
	store := NewOptionsStore()
	for _, kind := range RefusalKinds {
		var refusal *Refusal
		switch kind {
		case KindClosedChannel:
			enabling := estateDeclared()
			enabling.WebsocketPort = 8080
			refusal = AdmitServerOptions(enabling)
		case KindUndeclaredOption:
			refusal = AdmitUnder([]ClosedChannel{{
				Row:     "a row nothing declares",
				Option:  "no_such_option",
				Closed:  float64(0),
				Subject: "substrate.options",
				Repair:  "unreachable: the row names no declared option",
			}}, estateDeclared())
		case KindCitationUnresolved:
			refusal = AdmitOptionsCitation(store, "a digest nothing carries", estateDeclared())
		case KindCitationMismatch:
			other := estateDeclared()
			other.ServerName = "foldlab-options-test-other"
			digest, err := store.Declare(other)
			if err != nil {
				t.Fatalf("declare the other value: %v", err)
			}
			refusal = AdmitOptionsCitation(store, digest, estateDeclared())
		default:
			t.Fatalf("the roster carries %q and this test mints nothing for it", kind)
		}
		if refusal == nil {
			t.Fatalf("the reason %q minted no refusal", kind)
		}
		if refusal.Kind != kind {
			t.Fatalf("the reason %q minted a refusal reading %q", kind, refusal.Kind)
		}
		if refusal.Law == "" {
			t.Fatalf("the reason %q states no law", kind)
		}
		if len(refusal.Next) == 0 {
			t.Fatalf("the reason %q teaches no repair", kind)
		}
		if refusal.Next[0].Subject == "" || refusal.Next[0].Note == "" {
			t.Fatalf("the reason %q teaches an empty repair: %+v", kind, refusal.Next[0])
		}
	}
}

// TestEveryClosedChannelTeachesAPassingRepair walks the inventory and holds each
// row's repair to what a repair has to do.
//
// A repair that says "remove the field" is a FAILING repair: the field is how
// the estate declares the channel closed, so removing it would replace a
// declared closure with an absence — which is exactly what the declared value
// exists to retire. The repair has to name the inventory, say the row is closed
// by declaration rather than by accident, and name the act that would open it.
func TestEveryClosedChannelTeachesAPassingRepair(t *testing.T) {
	seen := make(map[string]struct{}, len(ClosedChannels))
	for _, channel := range ClosedChannels {
		if channel.Row == "" || channel.Option == "" {
			t.Fatalf("an inventory row names no channel or no option: %+v", channel)
		}
		if _, already := seen[channel.Row]; already {
			t.Fatalf("the inventory carries %q twice", channel.Row)
		}
		seen[channel.Row] = struct{}{}
		if channel.Subject == "" || channel.Repair == "" {
			t.Fatalf("the row %q teaches no repair", channel.Row)
		}
		for _, required := range []string{
			"closed-channel inventory",
			"closed by declaration rather than by accident",
			"operator ruling",
		} {
			if !strings.Contains(channel.Repair, required) {
				t.Fatalf("the row %q teaches a repair that never says %q", channel.Row, required)
			}
		}
		for _, failing := range []string{"remove the field", "delete the field", "drop the field"} {
			if strings.Contains(strings.ToLower(channel.Repair), failing) {
				t.Fatalf("the row %q teaches the failing repair %q", channel.Row, failing)
			}
		}
		row := optionRowFor(channel.Option)
		if row == nil {
			t.Fatalf("the row %q reads %q, which the option table does not carry", channel.Row, channel.Option)
		}
		if row.Declaration != channel.Declaration || row.Site != channel.Site {
			t.Fatalf(
				"the row %q and the option table disagree about where %q is declared",
				channel.Row, channel.Option,
			)
		}
	}
}

// optionRowFor is the table read the tests use; it is a read over data rather
// than a switch over names, which is the property the table exists for.
func optionRowFor(name string) *ServerOption {
	for index := range ServerOptionRoster {
		if ServerOptionRoster[index].Name == name {
			return &ServerOptionRoster[index]
		}
	}
	return nil
}

// TestTheDeclaredValueCarriesEveryTableRow holds the schema to the table.
//
// The table is the schema and the declared value is what a party actually
// carries, so a row in one and not the other is a row nobody declared. Both
// directions are walked, because a value carrying a key the table never named
// is the same defect read from the other side.
func TestTheDeclaredValueCarriesEveryTableRow(t *testing.T) {
	declaration, ok := estateDeclared().Value()["options"].(map[string]any)
	if !ok {
		t.Fatal("the declared value carries no options")
	}
	for _, option := range ServerOptionRoster {
		if _, found := optionAt(declaration, option.Name); !found {
			t.Fatalf("the table carries %q and the declared value does not", option.Name)
		}
	}
	carried := 0
	var walk func(record map[string]any, prefix string)
	walk = func(record map[string]any, prefix string) {
		for key, value := range record {
			path := key
			if prefix != "" {
				path = prefix + "." + key
			}
			if nested, isRecord := value.(map[string]any); isRecord {
				walk(nested, path)
				continue
			}
			carried++
			if optionRowFor(path) == nil {
				t.Fatalf("the declared value carries %q and the table does not", path)
			}
		}
	}
	walk(declaration, "")
	if carried != len(ServerOptionRoster) {
		t.Fatalf("the declared value carries %d settings and the table names %d", carried, len(ServerOptionRoster))
	}
}

// TestEachClosedChannelRefusesOnItsOwn is the per-row paired probe in unit form:
// one row enabled at a time refuses naming that row, and the estate's own value
// with every row closed is admitted.
//
// The wall executes the same pairing against real sockets and a real store
// directory; this test is what makes a row added without a refusal red before
// the wall ever runs.
func TestEachClosedChannelRefusesOnItsOwn(t *testing.T) {
	if refusal := AdmitServerOptions(estateDeclared()); refusal != nil {
		t.Fatalf("the estate's own declared value was refused: %v", refusal)
	}
	for _, channel := range ClosedChannels {
		enabling, err := enableChannel(estateDeclared(), channel.Row)
		if err != nil {
			t.Fatalf("enable %q: %v", channel.Row, err)
		}
		refusal := AdmitServerOptions(enabling)
		if refusal == nil {
			t.Fatalf("the value enabling %q was admitted", channel.Row)
		}
		if refusal.Kind != KindClosedChannel {
			t.Fatalf("the value enabling %q refused as %q", channel.Row, refusal.Kind)
		}
		got, _ := refusal.Got.(string)
		if !strings.HasPrefix(got, channel.Row+" is enabled") {
			t.Fatalf("the refusal for %q reads %q", channel.Row, got)
		}
		if refusal.Next[0].Note != channel.Repair {
			t.Fatalf("the refusal for %q taught a repair the inventory does not carry", channel.Row)
		}
		// The same value over an EMPTY inventory is admitted, which is what
		// shows the inventory is what refused rather than some other check.
		if refusal := AdmitUnder(nil, enabling); refusal != nil {
			t.Fatalf("the value enabling %q was refused with no inventory: %v", channel.Row, refusal)
		}
	}
}

// TestAdmissionPrecedesConstruction holds the ordering the whole guarantee rests
// on: a refused value yields no daemon at all.
func TestAdmissionPrecedesConstruction(t *testing.T) {
	enabling := estateDeclared()
	enabling.ClusterPort = 6222
	instance, err := Acquire(enabling)
	if instance != nil {
		instance.Shutdown()
		t.Fatal("a refused declared value produced a server")
	}
	refusal, ok := err.(*Refusal)
	if !ok {
		t.Fatalf("a refused declared value produced a bare error: %v", err)
	}
	if refusal.Kind != KindClosedChannel {
		t.Fatalf("a refused declared value refused as %q", refusal.Kind)
	}
}

// TestTheCitationRoundTrips holds the citation's own law: a digest an
// incarnation cites resolves to the bytes the incarnation ran under.
func TestTheCitationRoundTrips(t *testing.T) {
	store := NewOptionsStore()
	running := estateDeclared()
	digest, err := store.Declare(running)
	if err != nil {
		t.Fatalf("declare the running value: %v", err)
	}
	if refusal := AdmitOptionsCitation(store, digest, running); refusal != nil {
		t.Fatalf("the running value's own citation was refused: %v", refusal)
	}
	resolved, encoded, err := store.Resolve(digest)
	if err != nil {
		t.Fatalf("resolve the citation: %v", err)
	}
	own, err := running.Bytes()
	if err != nil {
		t.Fatalf("take the running value's bytes: %v", err)
	}
	if string(encoded) != string(own) {
		t.Fatalf("the resolved bytes are not the running value's:\n  resolved: %s\n  running:  %s", encoded, own)
	}
	if resolved.ServerName != running.ServerName {
		t.Fatalf("the resolved value names %q", resolved.ServerName)
	}

	// The negative half: a citation computed over a different value refuses.
	other := running
	other.Port = 4222
	otherDigest, err := store.Declare(other)
	if err != nil {
		t.Fatalf("declare the other value: %v", err)
	}
	if otherDigest == digest {
		t.Fatal("two different declared values were named the same")
	}
	refusal := AdmitOptionsCitation(store, otherDigest, running)
	if refusal == nil {
		t.Fatal("a citation over a different value was admitted")
	}
	if refusal.Kind != KindCitationMismatch {
		t.Fatalf("a citation over a different value refused as %q", refusal.Kind)
	}
}

// enableChannel declares one inventory row enabled and leaves every other row
// at its closed setting.
//
// The switch is the one place this package turns a row name into a field, and
// it is here in the test rather than in the package because the shipped door
// never needs it: the door reads the declared value, and only a prober needs to
// build a value that opens something.
func enableChannel(declared DeclaredServerOptions, row string) (DeclaredServerOptions, error) {
	switch row {
	case "websocket":
		declared.WebsocketPort = 18080
	case "mqtt":
		declared.MQTTPort = 11883
	case "cluster":
		declared.ClusterPort = 16222
	case "gateway":
		declared.GatewayPort = 17222
	case "leafnode-listener":
		declared.LeafNodePort = 17422
	case "leafnode-remotes":
		declared.LeafNodeRemotes = []string{"nats-leaf://127.0.0.1:17422"}
	case "https-monitoring":
		declared.HTTPSPort = 18222
	case "profiling":
		declared.ProfPort = 16060
	default:
		return declared, errUnknownRow(row)
	}
	return declared, nil
}

type errUnknownRow string

func (e errUnknownRow) Error() string {
	return "no probe knows how to enable the inventory row " + string(e)
}
