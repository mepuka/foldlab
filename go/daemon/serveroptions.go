package daemon

import (
	"bytes"
	"fmt"
	"strings"

	"foldlab/canonical"
)

// The server-option table, the closed-channel inventory, and the one door a
// declared server-options value passes through before any server exists.
//
// **Everything the daemon knows about its server options is a declared value.**
// The table below is the roster of options the daemon depends on; the declared
// value carries a setting for every one of them; the vendor's own options struct
// is constructed from that value and from nothing else. A default nobody chose
// is the state this file retires: an option the estate depends on and has not
// declared is an option the estate runs under without having said so.
//
// **The table is transcription, not design.** Every key is the pinned vendor's
// own — its configuration word where it has one, and otherwise its own field
// name in the snake spelling the vendor's own configuration uses. The `Named`
// column records which of the two a row is, so a reader resolves the key back
// to the vendor rather than to a convention. `Declaration` is the vendor's own
// identifier verbatim and `Site` is where that identifier is declared in the
// pinned source, so a row resolves to one declaration at one version rather than
// to a table somebody maintains.
//
// **The values are transcribed, not ruled.** Several rows carry settings that
// are priced decisions belonging to the operator — the sync mode, the log
// suppression, the server name, the monitoring HTTP port. This file records
// what is MEASURED at those rows and changes none of them; a row whose value
// moves here would be a ruling taken by a transcription, which is the failure
// mode the declared value exists to prevent.
//
// Staged debt, stated rather than absorbed: both tables are hand-carried
// transcription owing the corpus's substrate-vocabulary emitter group, which the
// emitter does not yet mint. They are transcription with provenance until that
// group exists, never a twin of one, and the byte comparison against the spine's
// own tables is what keeps the two languages one table read twice.

// OptionSort is the sort one declared option's value carries.
type OptionSort string

// The four sorts the declared server-options value carries.
const (
	OptionString     OptionSort = "string"
	OptionNumber     OptionSort = "number"
	OptionBoolean    OptionSort = "boolean"
	OptionStringList OptionSort = "string-list"
)

// OptionNaming records which of the vendor's two spellings a row's key is.
type OptionNaming string

const (
	// NamedByConfig marks a key the vendor's own configuration or wire form
	// spells, carried verbatim.
	NamedByConfig OptionNaming = "config"
	// NamedByField marks a key the vendor's configuration has no word for, so
	// the key is the vendor's own field name in the snake spelling its
	// configuration uses everywhere else. No estate word enters either way.
	NamedByField OptionNaming = "field"
)

// ServerOption is one transcribed row of the option table.
type ServerOption struct {
	// Name is the key the declared value carries this option under, as a path
	// through the value's own nesting. The nesting is the vendor's: a row
	// inside the vendor's own configuration block is spelled inside it here.
	Name string
	Sort OptionSort
	// Named says whether Name is the vendor's configuration word or its field
	// name.
	Named OptionNaming
	// Declaration is the vendor's own identifier for this option, verbatim.
	Declaration string
	// Site is where that identifier is declared in the pinned vendor source.
	Site string
}

// VendorPin is the pinned vendor the tables below were transcribed at.
//
// A version is a pin and not a location: a reader checks the tables against the
// declarations the named module version ships, which is what the parity wall's
// oracle arm does with the linked module.
type VendorPin struct {
	Module  string
	Version string
}

// ServerOptionPin is the pin both tables in this file were read at.
var ServerOptionPin = VendorPin{
	Module:  "github.com/nats-io/nats-server/v2",
	Version: "v2.14.4",
}

// ServerOptionRoster is every server option the daemon depends on, transcribed.
//
// The roster is ADD-ONLY in the same sense the session field roster is: the
// declared value's key set is this list, so a row renamed, retyped, or removed
// renames every options value the estate ever declared and every incarnation
// that cited one. A row joins by appending, with its provenance.
//
// The last eight rows are the closed-channel inventory's own options. They are
// in the table because the daemon depends on them: it depends on them being at
// their closed setting, and a dependency nobody declared is the one the door
// below cannot check.
var ServerOptionRoster = []ServerOption{
	{Name: "server_name", Sort: OptionString, Named: NamedByConfig, Declaration: "server.Options.ServerName", Site: "server/opts.go:399"},
	{Name: "store_dir", Sort: OptionString, Named: NamedByConfig, Declaration: "server.Options.StoreDir", Site: "server/opts.go:468"},
	{Name: "addr", Sort: OptionString, Named: NamedByConfig, Declaration: "server.Options.Host", Site: "server/opts.go:400"},
	{Name: "port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.Port", Site: "server/opts.go:401"},
	{Name: "dont_listen", Sort: OptionBoolean, Named: NamedByConfig, Declaration: "server.Options.DontListen", Site: "server/opts.go:402"},
	{Name: "jetstream", Sort: OptionBoolean, Named: NamedByConfig, Declaration: "server.Options.JetStream", Site: "server/opts.go:447"},
	{Name: "no_log", Sort: OptionBoolean, Named: NamedByField, Declaration: "server.Options.NoLog", Site: "server/opts.go:410"},
	{Name: "no_sigs", Sort: OptionBoolean, Named: NamedByField, Declaration: "server.Options.NoSigs", Site: "server/opts.go:411"},
	{Name: "sync_interval", Sort: OptionString, Named: NamedByConfig, Declaration: "server.Options.SyncInterval", Site: "server/opts.go:469"},
	{Name: "sync_always", Sort: OptionBoolean, Named: NamedByField, Declaration: "server.Options.SyncAlways", Site: "server/opts.go:470"},
	{Name: "http_port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.HTTPPort", Site: "server/opts.go:436"},
	{Name: "https_port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.HTTPSPort", Site: "server/opts.go:438"},
	{Name: "prof_port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.ProfPort", Site: "server/opts.go:474"},
	{Name: "websocket.port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.Websocket.Port", Site: "server/opts.go:598"},
	{Name: "mqtt.port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.MQTT.Port", Site: "server/opts.go:693"},
	{Name: "cluster.port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.Cluster.Port", Site: "server/opts.go:68"},
	{Name: "gateway.port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.Gateway.Port", Site: "server/opts.go:146"},
	{Name: "leafnodes.port", Sort: OptionNumber, Named: NamedByConfig, Declaration: "server.Options.LeafNode.Port", Site: "server/opts.go:185"},
	{Name: "leafnodes.remotes", Sort: OptionStringList, Named: NamedByConfig, Declaration: "server.Options.LeafNode.Remotes", Site: "server/opts.go:219"},
}

// ServerOptionTableValue declares one option table as a value, so that the
// table has a name of its own and two languages can be held to one table by
// comparing bytes rather than by reading two lists.
func ServerOptionTableValue(pin VendorPin, roster []ServerOption) map[string]any {
	rows := make([]any, 0, len(roster))
	for _, option := range roster {
		rows = append(rows, map[string]any{
			"name":        option.Name,
			"sort":        string(option.Sort),
			"named":       string(option.Named),
			"declaration": option.Declaration,
			"site":        option.Site,
		})
	}
	return map[string]any{
		"v":    float64(0),
		"kind": "substrate-server-option-table",
		"pin": map[string]any{
			"module":  pin.Module,
			"version": pin.Version,
		},
		"options": rows,
	}
}

// ServerOptionTable is the declared option table this package stands on.
var ServerOptionTable = ServerOptionTableValue(ServerOptionPin, ServerOptionRoster)

// ClosedChannelLaw is the law the door below defends.
//
// It is one law over an inventory of rows rather than one law per row, because
// what is being kept is a single property: the estate's substrate admits
// connections at the doors the estate declared and at no others.
const ClosedChannelLaw = "A declared server-options value opens no admission channel outside the estate's declared inventory; a closed channel is closed by declaration, never by accident."

// ClosedChannel is one row of the closed-channel inventory.
//
// Each row refuses on its own. The row carries the option it reads, the setting
// at which that option is CLOSED, and the repair a party who wanted the channel
// is taught — all as data, because a refusal assembled from a switch statement
// cannot be compared across a language boundary and a repair written at a
// call site cannot be read by anybody who has not gone looking for it.
type ClosedChannel struct {
	// Row is the channel's own name.
	Row string
	// Option is the declared option this row reads, by the table's own key.
	Option string
	// Declaration is the vendor's own identifier for that option, verbatim.
	Declaration string
	// Site is where that identifier is declared in the pinned vendor source.
	Site string
	// Closed is the setting at which this channel is closed, declared rather
	// than inferred: absence is not closure, and a row whose closed setting
	// were implicit would be a row nobody declared.
	Closed any
	// Subject is the surface the repair is performed at.
	Subject string
	// Repair is what a party who wanted this channel is taught. It names the
	// inventory, states that the row is closed by declaration, and names the
	// act that would open it.
	Repair string
}

// ClosedChannels is the estate's closed-channel inventory.
//
// Eight rows, each refusing on its own. Four are the operator-named channels
// and four are the remaining admission surfaces the pinned vendor can open from
// its own options struct; every one of them is a door into the estate's
// substrate that the estate has not declared, and the door below refuses a
// declared value that opens any of them BEFORE a server is constructed, which
// is what makes the refusal a refusal rather than a shutdown.
//
// The inventory is not a blanket no. The estate's own declared value passes it
// unchanged, which is the other half of every probe the wall runs: a refusal
// that refused everything would prove nothing about what it refuses.
var ClosedChannels = []ClosedChannel{
	{
		Row:         "websocket",
		Option:      "websocket.port",
		Declaration: "server.Options.Websocket.Port",
		Site:        "server/opts.go:598",
		Closed:      float64(0),
		Subject:     "substrate.options.websocket",
		Repair:      "The WebSocket listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting, and the inventory is where the estate says so out loud. Opening it is an operator ruling and nothing less, because a new listener is a new authentication surface — a door with its own upgrade handshake, its own cookie and token handling, and its own account posture, none of which anybody has ruled. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
	},
	{
		Row:         "mqtt",
		Option:      "mqtt.port",
		Declaration: "server.Options.MQTT.Port",
		Site:        "server/opts.go:693",
		Closed:      float64(0),
		Subject:     "substrate.options.mqtt",
		Repair:      "The MQTT listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a new listener is a new authentication surface — and this one also brings a second protocol whose topics are translated into the estate's subjects, so what a connection may reach stops being a question the estate's own permission projection answers. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
	},
	{
		Row:         "cluster",
		Option:      "cluster.port",
		Declaration: "server.Options.Cluster.Port",
		Site:        "server/opts.go:68",
		Closed:      float64(0),
		Subject:     "substrate.options.cluster",
		Repair:      "The cluster route listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a route is a new authentication surface that admits another SERVER rather than a client — a peer that carries every subject and shares the estate's data plane, which is a durability and consensus posture nobody has ruled. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
	},
	{
		Row:         "gateway",
		Option:      "gateway.port",
		Declaration: "server.Options.Gateway.Port",
		Site:        "server/opts.go:146",
		Closed:      float64(0),
		Subject:     "substrate.options.gateway",
		Repair:      "The gateway listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a gateway is a new authentication surface admitting an entire other cluster, and traffic crossing it is governed by an authority outside this estate. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
	},
	{
		Row:         "leafnode-listener",
		Option:      "leafnodes.port",
		Declaration: "server.Options.LeafNode.Port",
		Site:        "server/opts.go:185",
		Closed:      float64(0),
		Subject:     "substrate.options.leafnodes",
		Repair:      "The leafnode listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a new listener is a new authentication surface, and a leafnode binds a remote server into an account of this estate's own — the subjects it may import and export are an account posture, not a port number. The daemon is deliberately shaped so this row remains openable; opening it is still a ruling. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
	},
	{
		Row:         "leafnode-remotes",
		Option:      "leafnodes.remotes",
		Declaration: "server.Options.LeafNode.Remotes",
		Site:        "server/opts.go:219",
		Closed:      []any{},
		Subject:     "substrate.options.leafnodes",
		Repair:      "The leafnode remotes are a row of the estate's closed-channel inventory, and they are closed by declaration rather than by accident: the declared server-options value carries this list empty. Opening it is an operator ruling and nothing less. This row admits in the other direction — the substrate dials OUT and binds itself into another authority's namespace — so it is a new authentication surface in the sense that matters most: a credential this estate presents elsewhere, and a set of subjects that then cross both ways. Bring the ruling and this inventory row moves with it; until one exists, declare the list empty and the substrate starts.",
	},
	{
		Row:         "https-monitoring",
		Option:      "https_port",
		Declaration: "server.Options.HTTPSPort",
		Site:        "server/opts.go:438",
		Closed:      float64(0),
		Subject:     "substrate.options.monitoring",
		Repair:      "The HTTPS monitoring listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a monitoring listener is a new authentication surface that serves the substrate's own state — who is connected, what streams exist, what the server is doing — over a socket whose credential posture nobody has ruled. The daemon needs no such socket: its health and registration reads are in-process, and what they observe lands as facts. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
	},
	{
		Row:         "profiling",
		Option:      "prof_port",
		Declaration: "server.Options.ProfPort",
		Site:        "server/opts.go:474",
		Closed:      float64(0),
		Subject:     "substrate.options.profiling",
		Repair:      "The profiling listener is a row of the estate's closed-channel inventory, and it is closed by declaration rather than by accident: the declared server-options value carries this port at its closed setting. Opening it is an operator ruling and nothing less, because a profiling listener is a new authentication surface with no authentication at all — it serves the process's own memory, goroutines, and stacks to anybody who reaches the port. Bring the ruling and this inventory row moves with it; until one exists, declare the port at its closed setting and the substrate starts.",
	},
}

// ClosedChannelInventoryValue declares one closed-channel inventory as a value.
//
// The law rides the value rather than each row, because the rows share it: what
// differs per row is which channel is closed and what a party who wanted it is
// taught.
func ClosedChannelInventoryValue(law string, channels []ClosedChannel) map[string]any {
	rows := make([]any, 0, len(channels))
	for _, channel := range channels {
		rows = append(rows, map[string]any{
			"row":         channel.Row,
			"option":      channel.Option,
			"declaration": channel.Declaration,
			"site":        channel.Site,
			"closed":      channel.Closed,
			"subject":     channel.Subject,
			"repair":      channel.Repair,
		})
	}
	return map[string]any{
		"v":        float64(0),
		"kind":     "substrate-closed-channels",
		"law":      law,
		"channels": rows,
	}
}

// ClosedChannelInventory is the declared inventory this package's door walks.
var ClosedChannelInventory = ClosedChannelInventoryValue(ClosedChannelLaw, ClosedChannels)

// AdmitServerOptions is the one admission door a declared server-options value
// passes through.
//
// It returns nil for an admitted value and a typed refusal for a refused one.
// Nothing else in this package constructs a server, so there is no second door
// and no path around this one: [Acquire] calls it first, before the value is
// digested, before the vendor's options struct is built, and before any
// listener could be bound.
func AdmitServerOptions(declared DeclaredServerOptions) *Refusal {
	return AdmitUnder(ClosedChannels, declared)
}

// AdmitUnder is the same door over a given inventory.
//
// The inventory is a PARAMETER because the inventory is data, and because a
// refusal that cannot be executed without its own refutation is a refusal
// nobody has measured: the committed control runs this door over an EMPTY
// inventory and the enabling values are admitted, which is what shows the
// inventory is doing the refusing. No shipped caller passes anything but
// [ClosedChannels].
func AdmitUnder(inventory []ClosedChannel, declared DeclaredServerOptions) *Refusal {
	declaration, ok := declared.Value()["options"].(map[string]any)
	if !ok {
		return &Refusal{
			Kind: KindUndeclaredOption,
			Law:  ClosedChannelLaw,
			Got:  "a declared value carrying no options",
			Want: "a declared server-options value",
			Next: repairFor(KindUndeclaredOption),
		}
	}
	for _, channel := range inventory {
		current, found := optionAt(declaration, channel.Option)
		if !found {
			return &Refusal{
				Kind: KindUndeclaredOption,
				Law:  ClosedChannelLaw,
				Got:  fmt.Sprintf("%s is absent from the declared value", channel.Option),
				Want: fmt.Sprintf("a declared setting for %s (%s)", channel.Option, channel.Declaration),
				Next: repairFor(KindUndeclaredOption),
			}
		}
		enabled, err := differs(current, channel.Closed)
		if err != nil {
			return &Refusal{
				Kind: KindUndeclaredOption,
				Law:  ClosedChannelLaw,
				Got:  fmt.Sprintf("%s carries a setting that does not canonicalize: %v", channel.Option, err),
				Want: fmt.Sprintf("a declared setting for %s (%s)", channel.Option, channel.Declaration),
				Next: repairFor(KindUndeclaredOption),
			}
		}
		if !enabled {
			continue
		}
		return &Refusal{
			Kind: KindClosedChannel,
			Law:  ClosedChannelLaw,
			Got: fmt.Sprintf(
				"%s is enabled: %s is %v (%s)",
				channel.Row, channel.Option, current, channel.Declaration,
			),
			Want: fmt.Sprintf(
				"%s at its declared closed setting %v",
				channel.Option, channel.Closed,
			),
			Next: []Next{{Subject: channel.Subject, Note: channel.Repair}},
		}
	}
	return nil
}

// optionAt reads one option out of a declared value's option map by the path
// the table names it under. The path is the vendor's own nesting, so a row
// inside a vendor configuration block is found inside it here.
func optionAt(declaration map[string]any, path string) (any, bool) {
	cursor := any(declaration)
	for _, segment := range strings.Split(path, ".") {
		record, ok := cursor.(map[string]any)
		if !ok {
			return nil, false
		}
		cursor, ok = record[segment]
		if !ok {
			return nil, false
		}
	}
	return cursor, true
}

// differs compares two declared settings by their canonical bytes.
//
// Bytes rather than Go equality, because the settings are declared values and
// identity is of canonical bytes here: a list and a number are compared the same
// way, and a row whose closed setting is a shape rather than a scalar needs no
// special case.
func differs(current any, closed any) (bool, error) {
	left, err := canonical.CanonicalizeValue(current)
	if err != nil {
		return false, err
	}
	right, err := canonical.CanonicalizeValue(closed)
	if err != nil {
		return false, err
	}
	return !bytes.Equal(left, right), nil
}

// repairFor is the repair table for the reasons that are not carried by an
// inventory row. The closed-channel reason takes its repair from the row that
// refused, which is the whole reason the rows carry one.
func repairFor(kind string) []Next {
	switch kind {
	case KindUndeclaredOption:
		return []Next{{
			Subject: "substrate.options",
			Note:    "Declare a setting for every option the inventory reads before submitting the value; an absent option is not a closed one, and a door that read absence as closure would admit exactly the values nobody declared.",
		}}
	case KindCitationUnresolved:
		return []Next{{
			Subject: "substrate.options.resolve",
			Note:    "Declare the server-options value into the store the citation resolves against before landing the incarnation fact; a digest that resolves to nothing is a citation of nothing, and the incarnation would name a value no reader can obtain.",
		}}
	case KindCitationMismatch:
		return []Next{{
			Subject: "substrate.options.resolve",
			Note:    "Resolve the digest the incarnation cites, compare its bytes against the value the server was constructed from, and land a fact citing the exact value; an incarnation cites the value it ran under, never a value like it.",
		}}
	default:
		return nil
	}
}

// OptionsStore resolves a declared server-options value from its digest.
//
// It is content-addressed by construction: a value is stored under the digest
// of its own canonical bytes, so a resolve is a read and never a search, and a
// digest that resolves at all resolves to exactly the bytes it names. The store
// is the carrier the fold table already names for this question — "what options
// does this run under" is a resolve, and a resolve is never stale.
type OptionsStore struct {
	values map[string]DeclaredServerOptions
	bytes  map[string][]byte
}

// NewOptionsStore opens an empty store.
func NewOptionsStore() *OptionsStore {
	return &OptionsStore{
		values: make(map[string]DeclaredServerOptions),
		bytes:  make(map[string][]byte),
	}
}

// Declare puts one declared value into the store under its own name.
func (s *OptionsStore) Declare(declared DeclaredServerOptions) (string, error) {
	encoded, err := declared.Bytes()
	if err != nil {
		return "", err
	}
	digest := canonical.DigestHex(encoded)
	s.values[digest] = declared
	s.bytes[digest] = encoded
	return digest, nil
}

// Resolve reads back the value one digest names.
//
// A digest the store does not carry REFUSES rather than returning a zero value:
// an unresolvable citation is a citation of nothing, and returning an empty
// value would let a reader compare against something the estate never declared.
func (s *OptionsStore) Resolve(digest string) (DeclaredServerOptions, []byte, error) {
	encoded, carried := s.bytes[digest]
	if !carried {
		return DeclaredServerOptions{}, nil, &Refusal{
			Kind: KindCitationUnresolved,
			Law:  "An incarnation cites the declared server-options value it started under, and a cited digest resolves to that value's bytes.",
			Got:  fmt.Sprintf("the digest %s resolves to no declared value", digest),
			Want: "a digest the options store carries",
			Next: repairFor(KindCitationUnresolved),
		}
	}
	return s.values[digest], encoded, nil
}

// AdmitOptionsCitation round-trips one incarnation's options citation.
//
// The citation is admitted only when the cited digest RESOLVES and the resolved
// bytes are byte-identical to the value the incarnation was constructed from.
// Recomputing the digest of the running value and comparing digests would be a
// weaker check by exactly the thing that matters: it would compare two names
// rather than the value a reader would obtain, so a store that resolved a digest
// to the wrong bytes would pass it.
//
// **The comparison is over bytes and the RENDERING is over digests, and those
// are two different questions.** A declared server-options value carries the
// store directory, which is a filesystem path — an ambient coordinate that means
// nothing to a party on another host and that a rendered surface may not carry
// at all (root law 10). So the refusal below names what it compared rather than
// reprinting it: provenance on a rendered surface is a digest of the value,
// never the value's bytes and never a path out of them. The bytes stay where
// they are useful — inside the comparison — and the reader is taught the read
// that turns either digest back into a value, which is what the repair names.
//
// The resolved side's digest is DERIVED from the bytes that resolved rather than
// reprinting the citation, and that derivation is load-bearing. The store is
// content-addressed, so an honest resolve renders the cited digest back; a store
// that resolved a digest to the wrong bytes renders a different one, and the
// refusal shows the store lying instead of covering for it.
func AdmitOptionsCitation(
	store *OptionsStore,
	cited string,
	running DeclaredServerOptions,
) *Refusal {
	_, resolved, err := store.Resolve(cited)
	if err != nil {
		refusal, ok := err.(*Refusal)
		if ok {
			return refusal
		}
		return &Refusal{
			Kind: KindCitationUnresolved,
			Law:  "An incarnation cites the declared server-options value it started under, and a cited digest resolves to that value's bytes.",
			Got:  err.Error(),
			Want: "a digest the options store carries",
			Next: repairFor(KindCitationUnresolved),
		}
	}
	encoded, err := running.Bytes()
	if err != nil {
		return &Refusal{
			Kind: KindCitationMismatch,
			Law:  "An incarnation cites the declared server-options value it started under, and a cited digest resolves to that value's bytes.",
			Got:  err.Error(),
			Want: "a declared value whose canonical bytes can be taken",
			Next: repairFor(KindCitationMismatch),
		}
	}
	if !bytes.Equal(resolved, encoded) {
		return &Refusal{
			Kind: KindCitationMismatch,
			Law:  "An incarnation cites the declared server-options value it started under, and a cited digest resolves to that value's bytes.",
			Got: fmt.Sprintf(
				"the cited digest %s resolves to the value named %s",
				cited, canonical.DigestHex(resolved),
			),
			Want: fmt.Sprintf(
				"a citation of the running value, which is named %s",
				canonical.DigestHex(encoded),
			),
			Next: repairFor(KindCitationMismatch),
		}
	}
	return nil
}
