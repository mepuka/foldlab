package daemon

import (
	"fmt"
	"sort"
	"strings"

	"foldlab/canonical"
)

// The wire vocabulary: five transcribed tables naming the whole surface the
// estate speaks to its substrate, and the canonical rendering that makes those
// five tables one value two languages can be held to.
//
// **Adoption by transcription, never by design.** Every word below is the
// pinned vendor's own, carried verbatim, in the vendor's own declaration order.
// No wire word is coined here; a word the pinned vendor surface does not carry
// may enter the estate only as a declared value whose name is its own digest,
// never as a hand-named protocol extension. A hand-designed state union, event
// name, or admin verb is precisely the drift class this table exists to refuse.
//
// **Full adoption, no convenient subset.** Rows are transcribed whole even
// where the estate's single-server posture has no use for them, and such a row
// is CLASSIFIED as declared-but-unused rather than omitted. A table that
// carried only the rows somebody needed today would be a design decision
// wearing a transcription's clothes, and the first word it dropped would be the
// word the next slice needed.
//
// **Every row carries four columns beyond its wire word.** The shape the word's
// payload or signature takes as the pinned source states it; the provenance pin
// — vendor package identity, version, and the digest of the exact source region
// transcribed; the estate classification under the three wire shapes; and, for
// every row classified as chatter, the promotion note saying what the message
// may accelerate and what it may never decide. A row with no provenance pin
// cannot be rendered, which is the closure the wall's fourth arm executes.
//
// **The provenance is a digest, never a location.** A row names the vendor
// package, the version, and the sha256 of the region's bytes. The region's
// coordinates ride beside the row as the wall's own oracle input and never
// reach the rendering: what a reader of the rendered table obtains is a name
// for some bytes, and a name for bytes is checkable anywhere the bytes are.
//
// **This is the normative home.** The canonical rendering below is what the
// spine's table passes through; the spine reads no vendor source of its own,
// because a second reading is a second transcription and two transcriptions
// sharing a mistake agree perfectly. The wall compares the two renderings byte
// for byte and re-derives every row's digest from the pinned vendor source as
// installed, so the comparison rests on an oracle outside both sides.
//
// Staged debt, stated rather than absorbed, in the shape the server-option
// roster and the status vocabulary already carry: these five tables are
// hand-carried transcription owing the corpus's SUBSTRATE-VOCABULARY EMITTER
// GROUP, which the emitter does not yet mint. The corpus provably carries no
// substrate-vocabulary group today — no generator emits a protocol verb, an API
// subject, a system event subject, a status event type, or a lifecycle entry —
// so the tables below are transcription with provenance until that group
// exists, never a twin of one. Growing that emitter group is not this work; it
// is named here so the debt has a creditor.

// WireDirection says which way a wire word travels.
type WireDirection string

const (
	// ClientToServer marks a word a connecting process writes.
	ClientToServer WireDirection = "client-to-server"
	// ServerToClient marks a word the substrate writes.
	ServerToClient WireDirection = "server-to-client"
	// EitherDirection marks a word both sides write.
	EitherDirection WireDirection = "either"
)

// WireShape is the estate's classification of a row under the three shapes
// every message the estate carries takes.
type WireShape string

const (
	// JournalFact marks a row whose message becomes evidence on a lane —
	// history, appended, never retracted.
	JournalFact WireShape = "journal-fact"
	// CommitmentRegister marks a row whose act needs a winner: an exclusive
	// disposition landed at a fenced register.
	CommitmentRegister WireShape = "commitment-register"
	// EphemeralChatter marks a row that may accelerate a fold and may decide
	// nothing. Dropping every such message changes no fold value.
	EphemeralChatter WireShape = "ephemeral-chatter"
)

// WireUse says whether the estate speaks or hears a row at its current posture.
type WireUse string

const (
	// Spoken marks a row the estate writes, reads, or grants today.
	Spoken WireUse = "spoken"
	// DeclaredUnused marks a row the pinned vendor declares and this estate's
	// posture never reaches. The row is transcribed anyway: omission is how a
	// table starts lying, and a posture that changes must find the word already
	// carried rather than newly invented.
	DeclaredUnused WireUse = "declared-but-unused"
)

// WireRegion is one row's coordinates in a pinned vendor source.
//
// The region is the wall's oracle input and never enters the rendering. It
// names the narrowest span of the pinned source that states the row: where the
// vendor declares a row on one line, the region is that line; where a row's two
// spellings sit adjacent, the region is both.
type WireRegion struct {
	Pin   VendorPin
	File  string
	First int
	Last  int
}

// Key is the region's stable name, used to look one region's digest up in the
// generated digest table.
func (region WireRegion) Key() string {
	return fmt.Sprintf(
		"%s@%s %s %d-%d",
		region.Pin.Module, region.Pin.Version, region.File, region.First, region.Last,
	)
}

// The four pinned vendor packages the five tables are transcribed from, as
// installed in this checkout.
//
// Two are Go modules the daemon links and two are node packages the spine
// installs. A row's pin is the package whose own source declares that row's
// word: the substrate declares what it writes, a client declares what it
// writes, and neither is asked about the other's.
var (
	// NATSServerPin is the embedded substrate itself.
	NATSServerPin = VendorPin{Module: "github.com/nats-io/nats-server/v2", Version: "v2.14.4"}
	// NATSGoClientPin is the Go client the daemon's own connections use.
	NATSGoClientPin = VendorPin{Module: "github.com/nats-io/nats.go", Version: "v1.53.1"}
	// NATSCorePin is the spine's client core.
	NATSCorePin = VendorPin{Module: "@nats-io/nats-core", Version: "3.4.0"}
	// NATSKVPin is the spine's key-value client.
	NATSKVPin = VendorPin{Module: "@nats-io/kv", Version: "3.4.0"}
)

// ProtocolVerb is one row of the client/server op family.
type ProtocolVerb struct {
	// Word is the wire word verbatim, exactly as the pinned source states it.
	Word string
	// Direction is which way the word travels.
	Direction WireDirection
	// Shape is the word's payload or argument shape as the pinned source states
	// it: the vendor's own argument order, or the vendor's own identifier for
	// the value the word carries.
	Shape string
	// Declaration is the vendor's own identifier that declares the word.
	Declaration string
	Region      WireRegion
	Wire        WireShape
	Use         WireUse
	// Promotion is what this message may accelerate and what it may never
	// decide. Required of every chatter row and empty on every other.
	Promotion string
}

// APISubject is one row of the JetStream API and key-value subject surface.
type APISubject struct {
	// Subject is the vendor's own subscription spelling of the subject.
	Subject string
	// Template is the vendor's own format spelling, empty where the vendor
	// declares none. Both spellings are carried because both are the vendor's:
	// a table that kept one would be choosing for its readers.
	Template string
	// Declaration is the vendor's own identifier for the subject spelling this
	// row carries. Where the vendor declares only a format spelling, it is that
	// identifier and TemplateDeclaration is empty — a row names one declaration
	// twice in no case.
	Declaration string
	// TemplateDeclaration is the vendor's own identifier for the format
	// spelling, empty where the vendor declares none.
	TemplateDeclaration string
	Region              WireRegion
	Wire                WireShape
	Use                 WireUse
	Promotion           string
}

// SystemSubject is one row of the system-account event subject surface.
type SystemSubject struct {
	// Subject is the vendor's own spelling of the subject.
	Subject string
	// Declaration is the vendor's own identifier for it.
	Declaration string
	Region      WireRegion
	Wire        WireShape
	Use         WireUse
	Promotion   string
}

// StatusField is one transcribed payload field of one status event.
type StatusField struct {
	// Name is the vendor's own field name, verbatim.
	Name string
	// Sort is the estate's own word for the shape the vendor's type takes. The
	// sort vocabulary is spelled apart from the event vocabulary on purpose:
	// a word appearing in both would make a consumer's sort branch
	// indistinguishable from a per-event branch.
	Sort string
	// Optional is whether the vendor declares the field optional.
	Optional bool
}

// StatusEvent is one row of the client status event vocabulary.
type StatusEvent struct {
	// Type is the vendor's own event discriminant, verbatim.
	Type string
	// Declaration is the vendor's own type-alias name for the row.
	Declaration string
	Payload     []StatusField
	// Placement carries the seven-transitions/four-readings split as a COLUMN
	// rather than as a comment: a reading modelled as a state would be exactly
	// the invention the vocabulary ruling forbids, and a placement that lived
	// in prose could not be checked.
	Placement string
	Region    WireRegion
	Wire      WireShape
	Use       WireUse
	Promotion string
}

// LifecycleEntry is one row of the server's lifecycle surface.
type LifecycleEntry struct {
	// Entry is the vendor's own identifier for the entry point.
	Entry string
	// Signature is the vendor's own declaration of it, verbatim.
	Signature string
	// Phase is the lifecycle phase the entry belongs to, in the vocabulary the
	// estate's own lifecycle contract already uses.
	Phase     string
	Region    WireRegion
	Wire      WireShape
	Use       WireUse
	Promotion string
}

// The promotion notes, written once per family and carried by every row of it.
//
// A note is per family and not per row because what differs between two rows of
// one family is which word they carry, not what a message wearing that word may
// do. Writing the same sentence out ninety times would make ninety chances to
// write it differently.
const (
	promoteSessionFold  = "This line is one of the three groups the substrate session folds from: it accelerates the mint by supplying its group, and it decides nothing, because the session's name is the digest of the folded value and a line that never arrived leaves no session rather than a session wearing defaults."
	promoteCarriedValue = "The line carries a value onto a subject. It may accelerate a reader already folding that lane, and it decides nothing: what a lane means is the fold over the values it carries, and a value that must be exactly-once meaningful is promoted by its own digest before any line carries it."
	promoteInterest     = "Interest is carriage. It decides which messages this connection is offered and never what any of them mean: a fold's value is a function of delivered support and query alone, so interest changes what arrives and never what it says."
	promoteDelivery     = "Delivery accelerates a reader toward a position it could also have reached by reading the lane. It decides nothing: a fold at an anchor is the same value whether the message was delivered once, redelivered, or never seen at all."
	promoteLiveness     = "The liveness exchange may accelerate a client's own staleness reading. It decides nothing, because \"the substrate is alive now\" is unsayable: aliveness is productive-through-a-position, a reader's fold over heartbeat and readiness facts."
	promoteAck          = "A protocol acknowledgement accelerates nothing the estate reads and decides nothing. The estate's acknowledgement of a published value is the position the lane assigned it."
	promoteProtocolErr  = "A protocol error is the substrate's own account of a refusal. It may accelerate a client toward its own teardown and it decides nothing, because a refusal that means anything here is typed at the one door with reason, law, and repair."

	promoteAdminRequest = "A request-reply against the substrate's own administration. It may accelerate a declared shape into existence and it decides nothing: what a stream or consumer must be is the shape the estate declared, and the reply is evidence that the substrate now matches it."
	promoteAdminRead    = "A read of the substrate's own account of itself. It may accelerate a reader toward a position and it decides nothing: presence, staleness, and history are folds over lanes, never answers a broker gives."
	promoteDirectRead   = "A direct read of one message by its coordinates. It may accelerate a resolve and it decides nothing, because a resolve is a read of bytes a digest already names and a digest read is never stale."
	promoteFamilyPrefix = "A subject-family prefix rather than a request subject: it names where a family lives so a grant or a deny can address the family whole. It accelerates nothing on its own and decides nothing, because authority is what a writ declares and a prefix is only how that declaration is spelled."
	promoteClusterAdmin = "A clustered-substrate administration request. It may accelerate a placement decision inside the substrate and it decides nothing here: this estate's single-server posture reaches no such request, and the acts that need a winner are landed at the estate's own fenced registers."

	promoteAccountEvent  = "The substrate's own account of an account-scoped occurrence. It may accelerate a fold that is already reading the session lane and it decides nothing: presence is a fold over established-and-not-ended facts, and a broker's view of who is connected is both late and, for reaped connections, wrong."
	promoteServerEvent   = "The substrate's own account of its own lifecycle. It may accelerate a supervisor toward looking sooner and it decides nothing: what the estate knows about an incarnation is the incarnation lane, whose facts a fenced decide lands."
	promoteSystemRequest = "A request into the substrate's system account. It may accelerate an operator act and it decides nothing here: the acts with blast radius are the operator's, outside the algebra, and nothing the estate folds is a function of a reply to one of these."
	promoteSystemClaims  = "An account-claims exchange for an operator-run resolver. It may accelerate a credential's propagation and it decides nothing: credential custody is host engineering and stays outside the meaning path."
	promoteSystemDebug   = "A debug or measurement service the substrate exports about itself. It may accelerate an investigation and it decides nothing, because a measurement is never a fact of the record unless somebody emits one citing it."
	promoteSystemInbox   = "A system-account inbox coordinate: where a reply to one of these requests is addressed. It accelerates a request-reply round trip and decides nothing, because the reply is chatter whatever coordinate carried it."

	promoteStatusReading = "A reading WITHIN a state rather than a change of state. It may accelerate a reader's own sense of how a connection is doing, and it decides nothing: promoting a reading to a state would name a state the vendor never declared, which is exactly the invention the vocabulary ruling forbids."

	promoteConstruct   = "Construction is carriage and accelerates nothing. It decides nothing: the meaning of the acquire phase is the declared server-options value, whose digest the incarnation cites, and a server constructed from a value nobody declared is what the admission door refuses before any listener could bind."
	promoteRunningRead = "A local view's answer to \"is it up\". It may accelerate a supervisor toward looking and it decides nothing, because aliveness is unsayable as a present-tense fact and prolonged silence is refused at the supervisor's fence, never by a boolean."
	promoteJoin        = "A join on the process value. It is carriage ordering — a caller waiting for a teardown already decided — and it decides nothing that the disposition at the register did not already decide."
	promoteCoordinate  = "A coordinate the substrate hands its own clients. It accelerates connecting and decides nothing: a session fact pins the digest of the connect options it was established under, never the address it dialled."
	promoteInProcess   = "The daemon's own client-zero transport. It is carriage: the connection it opens mints a substrate-session fact like any other, and which transport carried the establishment is not part of what the fact means."
	promoteEnableJS    = "Enabling the resource plane is carriage under an incarnation the register has already landed. It decides nothing on its own: the one running server over a store directory is decided at the incarnation register, and that the resource plane is on is what the declared options value says."
)

// ProtocolVerbs is the client/server op family, transcribed whole.
//
// Twelve rows: every word a connection of this estate writes or reads on the
// core protocol. A row's pin is the pinned source belonging to the party that
// WRITES the word — the substrate declares what the substrate sends and a
// client declares what a client sends — which is why the table draws on two
// pinned modules and says so per row.
//
// Every row is classified as chatter, and that is a finding of the
// transcription rather than a gap in it: a protocol verb is carriage in every
// case. What a PUB carries may be a journal fact; the word PUB never is.
var ProtocolVerbs = []ProtocolVerb{
	{
		Word:        "INFO",
		Direction:   ServerToClient,
		Shape:       "INFO <json> — the substrate's own declaration of itself, shaped by server.Info",
		Declaration: "server.InfoProto",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/route.go", First: 129, Last: 129},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteSessionFold,
	},
	{
		Word:        "CONNECT",
		Direction:   ClientToServer,
		Shape:       "CONNECT <json> — the connecting process's declared options, shaped by server.ClientOpts",
		Declaration: "nats.connectProto",
		Region:      WireRegion{Pin: NATSGoClientPin, File: "nats.go", First: 2048, Last: 2048},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteSessionFold,
	},
	{
		Word:        "PUB",
		Direction:   ClientToServer,
		Shape:       "PUB <subject> [reply-to] <#bytes>\\r\\n<payload>",
		Declaration: "nats._PUB_P_",
		Region:      WireRegion{Pin: NATSGoClientPin, File: "nats.go", First: 2034, Last: 2034},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteCarriedValue,
	},
	{
		Word:        "HPUB",
		Direction:   ClientToServer,
		Shape:       "HPUB <subject> [reply-to] <#header-bytes> <#total-bytes>\\r\\n<headers><payload>",
		Declaration: "nats._HPUB_P_",
		Region:      WireRegion{Pin: NATSGoClientPin, File: "nats.go", First: 2035, Last: 2035},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteCarriedValue,
	},
	{
		Word:        "SUB",
		Direction:   ClientToServer,
		Shape:       "SUB <subject> [queue-group] <sid>",
		Declaration: "nats.subProto",
		Region:      WireRegion{Pin: NATSGoClientPin, File: "nats.go", First: 2051, Last: 2051},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteInterest,
	},
	{
		Word:        "UNSUB",
		Direction:   ClientToServer,
		Shape:       "UNSUB <sid> [max-msgs]",
		Declaration: "nats.unsubProto",
		Region:      WireRegion{Pin: NATSGoClientPin, File: "nats.go", First: 2052, Last: 2052},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteInterest,
	},
	{
		Word:        "MSG",
		Direction:   ServerToClient,
		Shape:       "MSG <subject> <sid> [reply-to] <#bytes>\\r\\n<payload>",
		Declaration: "server.msgHeadProto",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/client.go", First: 105, Last: 109},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteDelivery,
	},
	{
		Word:        "HMSG",
		Direction:   ServerToClient,
		Shape:       "HMSG <subject> <sid> [reply-to] <#header-bytes> <#total-bytes>\\r\\n<headers><payload>",
		Declaration: "server.msgHeadProto (header arm)",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/client.go", First: 105, Last: 109},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteDelivery,
	},
	{
		Word:        "PING",
		Direction:   EitherDirection,
		Shape:       "PING — no argument",
		Declaration: "server.pingProto",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/client.go", First: 92, Last: 92},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteLiveness,
	},
	{
		Word:        "PONG",
		Direction:   EitherDirection,
		Shape:       "PONG — no argument",
		Declaration: "server.pongProto",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/client.go", First: 93, Last: 93},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteLiveness,
	},
	{
		Word:        "+OK",
		Direction:   ServerToClient,
		Shape:       "+OK — no argument; sent only under the verbose option",
		Declaration: "server.okProto",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/client.go", First: 95, Last: 95},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAck,
	},
	{
		Word:        "-ERR",
		Direction:   ServerToClient,
		Shape:       "-ERR '<message>'",
		Declaration: "server.errProto",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/client.go", First: 94, Last: 94},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteProtocolErr,
	},
}

// APISubjects is the JetStream API and key-value subject surface, transcribed
// whole.
//
// The closure rule, stated so a reader can check the table is complete rather
// than trusting that it is: every constant the pinned substrate declares in its
// JetStream API source whose value begins with the API prefix, paired into one
// row per operation where the vendor declares both a subscription spelling and
// a format spelling; plus the two key-value coordinates the pinned key-value
// client declares, which the estate's permission projection addresses and the
// substrate declares only as a deny-all family.
//
// The permission projection READS this table. Before this table existed it
// wrote these subjects by hand, which is how a projection and a substrate come
// to disagree about a word neither of them owns.
var APISubjects = []APISubject{
	{
		Subject:     "$JS.API.>",
		Declaration: "server.jsAllAPI",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 39, Last: 39},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteFamilyPrefix,
	},
	{
		Subject:     "$JS.API",
		Declaration: "server.JSApiPrefix",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 44, Last: 44},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteFamilyPrefix,
	},
	{
		Subject:     "$JS.API.INFO",
		Declaration: "server.JSApiAccountInfo",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 48, Last: 48},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteAdminRead,
	},
	{
		Subject:             "$JS.API.STREAM.CREATE.*",
		Template:            "$JS.API.STREAM.CREATE.%s",
		Declaration:         "server.JSApiStreamCreate",
		TemplateDeclaration: "server.JSApiStreamCreateT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 52, Last: 53},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.STREAM.UPDATE.*",
		Template:            "$JS.API.STREAM.UPDATE.%s",
		Declaration:         "server.JSApiStreamUpdate",
		TemplateDeclaration: "server.JSApiStreamUpdateT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 57, Last: 58},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:     "$JS.API.STREAM.NAMES",
		Declaration: "server.JSApiStreams",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 62, Last: 62},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAdminRead,
	},
	{
		Subject:     "$JS.API.STREAM.LIST",
		Declaration: "server.JSApiStreamList",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 64, Last: 64},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAdminRead,
	},
	{
		Subject:             "$JS.API.STREAM.INFO.*",
		Template:            "$JS.API.STREAM.INFO.%s",
		Declaration:         "server.JSApiStreamInfo",
		TemplateDeclaration: "server.JSApiStreamInfoT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 68, Last: 69},
		Wire:                EphemeralChatter,
		Use:                 Spoken,
		Promotion:           promoteAdminRead,
	},
	{
		Subject:             "$JS.API.STREAM.DELETE.*",
		Template:            "$JS.API.STREAM.DELETE.%s",
		Declaration:         "server.JSApiStreamDelete",
		TemplateDeclaration: "server.JSApiStreamDeleteT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 73, Last: 74},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.STREAM.PURGE.*",
		Template:            "$JS.API.STREAM.PURGE.%s",
		Declaration:         "server.JSApiStreamPurge",
		TemplateDeclaration: "server.JSApiStreamPurgeT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 78, Last: 79},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.STREAM.SNAPSHOT.*",
		Template:            "$JS.API.STREAM.SNAPSHOT.%s",
		Declaration:         "server.JSApiStreamSnapshot",
		TemplateDeclaration: "server.JSApiStreamSnapshotT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 85, Last: 86},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.STREAM.RESTORE.*",
		Template:            "$JS.API.STREAM.RESTORE.%s",
		Declaration:         "server.JSApiStreamRestore",
		TemplateDeclaration: "server.JSApiStreamRestoreT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 90, Last: 91},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.STREAM.MSG.DELETE.*",
		Template:            "$JS.API.STREAM.MSG.DELETE.%s",
		Declaration:         "server.JSApiMsgDelete",
		TemplateDeclaration: "server.JSApiMsgDeleteT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 95, Last: 96},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.STREAM.MSG.GET.*",
		Template:            "$JS.API.STREAM.MSG.GET.%s",
		Declaration:         "server.JSApiMsgGet",
		TemplateDeclaration: "server.JSApiMsgGetT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 100, Last: 101},
		Wire:                EphemeralChatter,
		Use:                 Spoken,
		Promotion:           promoteDirectRead,
	},
	{
		Subject:             "$JS.API.DIRECT.GET.*",
		Template:            "$JS.API.DIRECT.GET.%s",
		Declaration:         "server.JSDirectMsgGet",
		TemplateDeclaration: "server.JSDirectMsgGetT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 106, Last: 107},
		Wire:                EphemeralChatter,
		Use:                 Spoken,
		Promotion:           promoteDirectRead,
	},
	{
		Subject:             "$JS.API.DIRECT.GET.*.>",
		Template:            "$JS.API.DIRECT.GET.%s.%s",
		Declaration:         "server.JSDirectGetLastBySubject",
		TemplateDeclaration: "server.JSDirectGetLastBySubjectT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 111, Last: 112},
		Wire:                EphemeralChatter,
		Use:                 Spoken,
		Promotion:           promoteDirectRead,
	},
	{
		Subject:     "$JS.API.DIRECT.GET",
		Declaration: "server.jsDirectGetPre",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 115, Last: 115},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteFamilyPrefix,
	},
	{
		Subject:             "$JS.API.CONSUMER.CREATE.*",
		Template:            "$JS.API.CONSUMER.CREATE.%s",
		Declaration:         "server.JSApiConsumerCreate",
		TemplateDeclaration: "server.JSApiConsumerCreateT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 121, Last: 122},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.CONSUMER.CREATE.*.>",
		Template:            "$JS.API.CONSUMER.CREATE.%s.%s.%s",
		Declaration:         "server.JSApiConsumerCreateEx",
		TemplateDeclaration: "server.JSApiConsumerCreateExT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 123, Last: 124},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.CONSUMER.DURABLE.CREATE.*.*",
		Template:            "$JS.API.CONSUMER.DURABLE.CREATE.%s.%s",
		Declaration:         "server.JSApiDurableCreate",
		TemplateDeclaration: "server.JSApiDurableCreateT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 128, Last: 129},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.CONSUMER.NAMES.*",
		Template:            "$JS.API.CONSUMER.NAMES.%s",
		Declaration:         "server.JSApiConsumers",
		TemplateDeclaration: "server.JSApiConsumersT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 133, Last: 134},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRead,
	},
	{
		Subject:             "$JS.API.CONSUMER.LIST.*",
		Template:            "$JS.API.CONSUMER.LIST.%s",
		Declaration:         "server.JSApiConsumerList",
		TemplateDeclaration: "server.JSApiConsumerListT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 137, Last: 138},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRead,
	},
	{
		Subject:             "$JS.API.CONSUMER.INFO.*.*",
		Template:            "$JS.API.CONSUMER.INFO.%s.%s",
		Declaration:         "server.JSApiConsumerInfo",
		TemplateDeclaration: "server.JSApiConsumerInfoT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 142, Last: 143},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRead,
	},
	{
		Subject:             "$JS.API.CONSUMER.DELETE.*.*",
		Template:            "$JS.API.CONSUMER.DELETE.%s.%s",
		Declaration:         "server.JSApiConsumerDelete",
		TemplateDeclaration: "server.JSApiConsumerDeleteT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 147, Last: 148},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.CONSUMER.PAUSE.*.*",
		Template:            "$JS.API.CONSUMER.PAUSE.%s.%s",
		Declaration:         "server.JSApiConsumerPause",
		TemplateDeclaration: "server.JSApiConsumerPauseT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 152, Last: 153},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Template:    "$JS.API.CONSUMER.MSG.NEXT.%s.%s",
		Declaration: "server.JSApiRequestNextT",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 156, Last: 156},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAdminRead,
	},
	{
		Template:    "$JS.API.CONSUMER.RESET.%s.%s",
		Declaration: "server.JSApiConsumerResetT",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 159, Last: 159},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAdminRequest,
	},
	{
		Subject:             "$JS.API.CONSUMER.UNPIN.*.*",
		Template:            "$JS.API.CONSUMER.UNPIN.%s.%s",
		Declaration:         "server.JSApiConsumerUnpin",
		TemplateDeclaration: "server.JSApiConsumerUnpinT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 162, Last: 163},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteAdminRequest,
	},
	{
		Subject:     "$JS.API.CONSUMER.MSG.NEXT.",
		Declaration: "server.jsRequestNextPre",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 166, Last: 166},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteFamilyPrefix,
	},
	{
		Subject:             "$JS.API.STREAM.PEER.REMOVE.*",
		Template:            "$JS.API.STREAM.PEER.REMOVE.%s",
		Declaration:         "server.JSApiStreamRemovePeer",
		TemplateDeclaration: "server.JSApiStreamRemovePeerT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 174, Last: 175},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteClusterAdmin,
	},
	{
		Subject:             "$JS.API.STREAM.LEADER.STEPDOWN.*",
		Template:            "$JS.API.STREAM.LEADER.STEPDOWN.%s",
		Declaration:         "server.JSApiStreamLeaderStepDown",
		TemplateDeclaration: "server.JSApiStreamLeaderStepDownT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 179, Last: 180},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteClusterAdmin,
	},
	{
		Subject:             "$JS.API.CONSUMER.LEADER.STEPDOWN.*.*",
		Template:            "$JS.API.CONSUMER.LEADER.STEPDOWN.%s.%s",
		Declaration:         "server.JSApiConsumerLeaderStepDown",
		TemplateDeclaration: "server.JSApiConsumerLeaderStepDownT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 184, Last: 185},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteClusterAdmin,
	},
	{
		Subject:     "$JS.API.META.LEADER.STEPDOWN",
		Declaration: "server.JSApiLeaderStepDown",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 190, Last: 190},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteClusterAdmin,
	},
	{
		Subject:     "$JS.API.SERVER.REMOVE",
		Declaration: "server.JSApiRemoveServer",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 195, Last: 195},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteClusterAdmin,
	},
	{
		Subject:             "$JS.API.ACCOUNT.PURGE.*",
		Template:            "$JS.API.ACCOUNT.PURGE.%s",
		Declaration:         "server.JSApiAccountPurge",
		TemplateDeclaration: "server.JSApiAccountPurgeT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 200, Last: 201},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteClusterAdmin,
	},
	{
		Subject:             "$JS.API.ACCOUNT.STREAM.MOVE.*.*",
		Template:            "$JS.API.ACCOUNT.STREAM.MOVE.%s.%s",
		Declaration:         "server.JSApiServerStreamMove",
		TemplateDeclaration: "server.JSApiServerStreamMoveT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 206, Last: 207},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteClusterAdmin,
	},
	{
		Subject:             "$JS.API.ACCOUNT.STREAM.CANCEL_MOVE.*.*",
		Template:            "$JS.API.ACCOUNT.STREAM.CANCEL_MOVE.%s.%s",
		Declaration:         "server.JSApiServerStreamCancelMove",
		TemplateDeclaration: "server.JSApiServerStreamCancelMoveT",
		Region:              WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 212, Last: 213},
		Wire:                EphemeralChatter,
		Use:                 DeclaredUnused,
		Promotion:           promoteClusterAdmin,
	},
	{
		Subject:     "$JS.API.ACCOUNT.",
		Declaration: "server.jsAPIAccountPre",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_api.go", First: 216, Last: 216},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteFamilyPrefix,
	},
	{
		Subject:     "$KV",
		Declaration: "kv.kvSubjectPrefix",
		Region:      WireRegion{Pin: NATSKVPin, File: "lib/kv.js", First: 85, Last: 85},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteFamilyPrefix,
	},
	{
		Subject:     "KV_",
		Declaration: "kv.kvPrefix",
		Region:      WireRegion{Pin: NATSKVPin, File: "lib/types.d.ts", First: 429, Last: 429},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteFamilyPrefix,
	},
}

// SystemSubjects is the system-account event subject surface, transcribed in
// full.
//
// The closure rule: every constant the pinned substrate declares whose value is
// a subject rooted at the system-account prefix followed by a token separator.
// The substrate's own system-account NAME is declared elsewhere and is not a
// subject, so it is not a row here; that exclusion is a stated closure and not
// an omission.
//
// Most of these rows the estate's single-server posture never sees, and every
// one of them is transcribed anyway and CLASSIFIED as declared-but-unused.
// Omission is how a table starts lying: a table that carried only the reachable
// rows would read, to the next posture, as a claim that the others do not
// exist.
//
// Every row is chatter. That is not a shortcut; it is the standing ruling: the
// substrate's own event machinery may accelerate what the facts determine and
// may decide nothing, in either posture.
var SystemSubjects = []SystemSubject{
	{
		Subject:     "$SYS.REQ.ACCOUNT.%s.CLAIMS.LOOKUP",
		Declaration: "server.accLookupReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 43, Last: 43},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemClaims,
	},
	{
		Subject:     "$SYS.REQ.CLAIMS.PACK",
		Declaration: "server.accPackReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 44, Last: 44},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemClaims,
	},
	{
		Subject:     "$SYS.REQ.CLAIMS.LIST",
		Declaration: "server.accListReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 45, Last: 45},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemClaims,
	},
	{
		Subject:     "$SYS.REQ.CLAIMS.UPDATE",
		Declaration: "server.accClaimsReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 46, Last: 46},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemClaims,
	},
	{
		Subject:     "$SYS.REQ.CLAIMS.DELETE",
		Declaration: "server.accDeleteReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 47, Last: 47},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemClaims,
	},
	{
		Subject:     "$SYS.ACCOUNT.%s.CONNECT",
		Declaration: "server.connectEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 49, Last: 49},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAccountEvent,
	},
	{
		Subject:     "$SYS.ACCOUNT.%s.DISCONNECT",
		Declaration: "server.disconnectEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 50, Last: 50},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAccountEvent,
	},
	{
		Subject:     "$SYS.REQ.ACCOUNT.%s.%s",
		Declaration: "server.accDirectReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 51, Last: 51},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.REQ.ACCOUNT.PING.%s",
		Declaration: "server.accPingReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 52, Last: 52},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.ACCOUNT.%s.CLAIMS.UPDATE",
		Declaration: "server.accUpdateEventSubjOld",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 55, Last: 55},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemClaims,
	},
	{
		Subject:     "$SYS.REQ.ACCOUNT.%s.CLAIMS.UPDATE",
		Declaration: "server.accUpdateEventSubjNew",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 56, Last: 56},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemClaims,
	},
	{
		Subject:     "$SYS._INBOX_.%s",
		Declaration: "server.connsRespSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 57, Last: 57},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemInbox,
	},
	{
		Subject:     "$SYS.ACCOUNT.%s.SERVER.CONNS",
		Declaration: "server.accConnsEventSubjNew",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 58, Last: 58},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAccountEvent,
	},
	{
		Subject:     "$SYS.SERVER.ACCOUNT.%s.CONNS",
		Declaration: "server.accConnsEventSubjOld",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 59, Last: 59},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAccountEvent,
	},
	{
		Subject:     "$SYS.SERVER.%s.LAMEDUCK",
		Declaration: "server.lameDuckEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 60, Last: 60},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
	{
		Subject:     "$SYS.SERVER.%s.SHUTDOWN",
		Declaration: "server.shutdownEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 61, Last: 61},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
	{
		Subject:     "$SYS.REQ.SERVER.%s.KICK",
		Declaration: "server.clientKickReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 62, Last: 62},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.REQ.SERVER.%s.LDM",
		Declaration: "server.clientLDMReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 63, Last: 63},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.SERVER.%s.CLIENT.AUTH.ERR",
		Declaration: "server.authErrorEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 64, Last: 64},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
	{
		Subject:     "$SYS.ACCOUNT.CLIENT.AUTH.ERR",
		Declaration: "server.authErrorAccountEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 65, Last: 65},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAccountEvent,
	},
	{
		Subject:     "$SYS.SERVER.%s.STATSZ",
		Declaration: "server.serverStatsSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 66, Last: 66},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
	{
		Subject:     "$SYS.REQ.SERVER.%s.%s",
		Declaration: "server.serverDirectReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 67, Last: 67},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.REQ.SERVER.PING.%s",
		Declaration: "server.serverPingReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 68, Last: 68},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.REQ.SERVER.PING",
		Declaration: "server.serverStatsPingReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 69, Last: 69},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.REQ.SERVER.%s.RELOAD",
		Declaration: "server.serverReloadReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 70, Last: 70},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.ACCOUNT.%s.LEAFNODE.CONNECT",
		Declaration: "server.leafNodeConnectEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 71, Last: 71},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteAccountEvent,
	},
	{
		Subject:     "$SYS.LATENCY.M2.%s",
		Declaration: "server.remoteLatencyEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 72, Last: 72},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemDebug,
	},
	{
		Subject:     "$SYS._INBOX.%s.%s",
		Declaration: "server.inboxRespSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 73, Last: 73},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemInbox,
	},
	{
		Subject:     "$SYS.REQ.USER.INFO",
		Declaration: "server.userDirectInfoSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 76, Last: 76},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.REQ.USER.%s.INFO",
		Declaration: "server.userDirectReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 77, Last: 77},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.REQ.ACCOUNT.NSUBS",
		Declaration: "server.accNumSubsReqSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 81, Last: 81},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.DEBUG.SUBSCRIBERS",
		Declaration: "server.accSubsSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 84, Last: 84},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemDebug,
	},
	{
		Subject:     "$SYS.SERVER.%s.OCSP.PEER.CONN.REJECT",
		Declaration: "server.ocspPeerRejectEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 95, Last: 95},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
	{
		Subject:     "$SYS.SERVER.%s.OCSP.PEER.LINK.INVALID",
		Declaration: "server.ocspPeerChainlinkInvalidEventSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 96, Last: 96},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
	{
		Subject:     "$SYS._INBOX.",
		Declaration: "server.InboxPrefix",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/events.go", First: 2979, Last: 2979},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemInbox,
	},
	{
		Subject:     "$SYS.REQ.USER.AUTH",
		Declaration: "server.AuthCalloutSubject",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/auth_callout.go", First: 30, Last: 30},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteSystemRequest,
	},
	{
		Subject:     "$SYS.JSC.STREAM.ASSIGNMENT.RESULT",
		Declaration: "server.streamAssignmentSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_cluster.go", First: 7503, Last: 7503},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
	{
		Subject:     "$SYS.JSC.CONSUMER.ASSIGNMENT.RESULT",
		Declaration: "server.consumerAssignmentSubj",
		Region:      WireRegion{Pin: NATSServerPin, File: "server/jetstream_cluster.go", First: 7504, Last: 7504},
		Wire:        EphemeralChatter,
		Use:         DeclaredUnused,
		Promotion:   promoteServerEvent,
	},
}

// StatusEvents is the client status event vocabulary, transcribed whole.
//
// Eleven rows in the pinned client's own DECLARATION order — which differs from
// the order its own union restates them in, the slow-consumer and
// force-reconnect rows swapping places between the two. The declaration order
// is the one the bytes carry, and a table ordered by a restatement would be
// ordered by the restatement's mistakes.
//
// The seven-transitions/four-readings split rides as the placement COLUMN. Seven
// rows are state transitions and become facts on the session lane; four are
// readings within a state and stay chatter. A reading promoted to a state would
// name a state the vendor never declared.
//
// This table ABSORBS the spine's existing eleven-event transcription. The two
// are held byte-equal by the wall rather than kept in step by hand, and a
// disagreement between them is a finding, never something to quietly settle.
var StatusEvents = []StatusEvent{
	{
		Type:        "disconnect",
		Declaration: "DisconnectStatus",
		Payload:     []StatusField{{Name: "server", Sort: "string"}},
		Placement:   "transition",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 1, Last: 4},
		Wire:        JournalFact,
		Use:         Spoken,
	},
	{
		Type:        "reconnect",
		Declaration: "ReconnectStatus",
		Payload:     []StatusField{{Name: "server", Sort: "string"}},
		Placement:   "transition",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 5, Last: 8},
		Wire:        JournalFact,
		Use:         Spoken,
	},
	{
		Type:        "reconnecting",
		Declaration: "ReconnectingStatus",
		Payload:     []StatusField{},
		Placement:   "transition",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 9, Last: 11},
		Wire:        JournalFact,
		Use:         Spoken,
	},
	{
		Type:        "update",
		Declaration: "ClusterUpdateStatus",
		Payload: []StatusField{
			{Name: "added", Sort: "string-list", Optional: true},
			{Name: "deleted", Sort: "string-list", Optional: true},
		},
		Placement: "observation",
		Region:    WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 12, Last: 16},
		Wire:      EphemeralChatter,
		Use:       DeclaredUnused,
		Promotion: promoteStatusReading,
	},
	{
		Type:        "ldm",
		Declaration: "LDMStatus",
		Payload:     []StatusField{{Name: "server", Sort: "string"}},
		Placement:   "transition",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 17, Last: 20},
		Wire:        JournalFact,
		Use:         Spoken,
	},
	{
		Type:        "error",
		Declaration: "ServerErrorStatus",
		Payload:     []StatusField{{Name: "error", Sort: "error-object"}},
		Placement:   "observation",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 21, Last: 24},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteStatusReading,
	},
	{
		Type:        "ping",
		Declaration: "ClientPingStatus",
		Payload:     []StatusField{{Name: "pendingPings", Sort: "number"}},
		Placement:   "observation",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 25, Last: 28},
		Wire:        EphemeralChatter,
		Use:         Spoken,
		Promotion:   promoteStatusReading,
	},
	{
		Type:        "staleConnection",
		Declaration: "StaleConnectionStatus",
		Payload:     []StatusField{},
		Placement:   "transition",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 29, Last: 31},
		Wire:        JournalFact,
		Use:         Spoken,
	},
	{
		Type:        "forceReconnect",
		Declaration: "ForceReconnectStatus",
		Payload:     []StatusField{},
		Placement:   "transition",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 32, Last: 34},
		Wire:        JournalFact,
		Use:         DeclaredUnused,
	},
	{
		Type:        "slowConsumer",
		Declaration: "SlowConsumerStatus",
		Payload: []StatusField{
			{Name: "sub", Sort: "subscription"},
			{Name: "pending", Sort: "number"},
		},
		Placement: "observation",
		Region:    WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 35, Last: 39},
		Wire:      EphemeralChatter,
		Use:       Spoken,
		Promotion: promoteStatusReading,
	},
	{
		Type:        "close",
		Declaration: "CloseStatus",
		Payload:     []StatusField{},
		Placement:   "transition",
		Region:      WireRegion{Pin: NATSCorePin, File: "lib/core.d.ts", First: 40, Last: 42},
		Wire:        JournalFact,
		Use:         Spoken,
	},
}

// LifecycleEntries is the substrate's lifecycle surface, transcribed whole.
//
// Ten rows: the entry points the estate's own lifecycle contract names, with
// each signature as the pinned source states it. The daemon holds the process
// value through exactly these and through nothing else, so a phase this table
// does not name is a phase the daemon cannot enter.
//
// The three rows classified as commitment registers are the acts that need a
// winner. Everything else is carriage: readiness is an observation, not a
// promise, and every remaining row accelerates something a fold already
// determines.
var LifecycleEntries = []LifecycleEntry{
	{
		Entry:     "server.NewServer",
		Signature: "func NewServer(opts *Options) (*Server, error)",
		Phase:     "acquire",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 698, Last: 698},
		Wire:      EphemeralChatter,
		Use:       Spoken,
		Promotion: promoteConstruct,
	},
	{
		Entry:     "server.Server.Start",
		Signature: "func (s *Server) Start()",
		Phase:     "start",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 2250, Last: 2250},
		Wire:      CommitmentRegister,
		Use:       Spoken,
	},
	{
		Entry:     "server.Server.ReadyForConnections",
		Signature: "func (s *Server) ReadyForConnections(dur time.Duration) bool",
		Phase:     "ready",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 4033, Last: 4033},
		Wire:      JournalFact,
		Use:       Spoken,
	},
	{
		Entry:     "server.Server.Running",
		Signature: "func (s *Server) Running() bool",
		Phase:     "serve",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 1687, Last: 1687},
		Wire:      EphemeralChatter,
		Use:       Spoken,
		Promotion: promoteRunningRead,
	},
	{
		Entry:     "server.Server.LameDuckShutdown",
		Signature: "func (s *Server) LameDuckShutdown()",
		Phase:     "drain",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 4431, Last: 4431},
		Wire:      CommitmentRegister,
		Use:       Spoken,
	},
	{
		Entry:     "server.Server.Shutdown",
		Signature: "func (s *Server) Shutdown()",
		Phase:     "stop",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 2571, Last: 2571},
		Wire:      CommitmentRegister,
		Use:       Spoken,
	},
	{
		Entry:     "server.Server.WaitForShutdown",
		Signature: "func (s *Server) WaitForShutdown()",
		Phase:     "stop",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 2761, Last: 2761},
		Wire:      EphemeralChatter,
		Use:       Spoken,
		Promotion: promoteJoin,
	},
	{
		Entry:     "server.Server.ClientURL",
		Signature: "func (s *Server) ClientURL() string",
		Phase:     "serve",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 1072, Last: 1072},
		Wire:      EphemeralChatter,
		Use:       Spoken,
		Promotion: promoteCoordinate,
	},
	{
		Entry:     "server.Server.InProcessConn",
		Signature: "func (s *Server) InProcessConn() (net.Conn, error)",
		Phase:     "serve",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/server.go", First: 2869, Last: 2869},
		Wire:      EphemeralChatter,
		Use:       Spoken,
		Promotion: promoteInProcess,
	},
	{
		Entry:     "server.Server.EnableJetStream",
		Signature: "func (s *Server) EnableJetStream(config *JetStreamConfig) error",
		Phase:     "acquire",
		Region:    WireRegion{Pin: NATSServerPin, File: "server/jetstream.go", First: 193, Last: 193},
		Wire:      EphemeralChatter,
		Use:       DeclaredUnused,
		Promotion: promoteEnableJS,
	},
}

// The by-declaration lookups: how a consumer reaches a row without spelling the
// row's own word.
//
// A consumer that looked a row up BY ITS WIRE WORD would have restated the word
// to find it, which is the second statement the footprint sweep exists to
// refuse. So every lookup is keyed by the vendor's own IDENTIFIER for the
// declaration — a name in the vendor's source, never a word on the wire — and
// the word travels out of the row rather than into the query.
//
// Each lookup panics on a key no row carries. That is deliberate and it is not
// a refusal path: the key is a compile-time constant in every caller, so an
// unknown key is a defect in the estate's own source rather than a condition
// any input can produce, and returning a zero row would let a consumer publish
// on the empty subject.

func mustVerb(declaration string) ProtocolVerb {
	for _, row := range ProtocolVerbs {
		if row.Declaration == declaration {
			return row
		}
	}
	panic(fmt.Sprintf("the protocol verb table declares no %s", declaration))
}

func mustSubject(declaration string) APISubject {
	for _, row := range APISubjects {
		if row.Declaration == declaration {
			return row
		}
	}
	panic(fmt.Sprintf("the API subject table declares no %s", declaration))
}

func mustStatusEvent(declaration string) StatusEvent {
	for _, row := range StatusEvents {
		if row.Declaration == declaration {
			return row
		}
	}
	panic(fmt.Sprintf("the status event table declares no %s", declaration))
}

func mustLifecycleEntry(entry string) LifecycleEntry {
	for _, row := range LifecycleEntries {
		if row.Entry == entry {
			return row
		}
	}
	panic(fmt.Sprintf("the lifecycle table declares no %s", entry))
}

// Name is the entry point's own identifier without the vendor's qualification —
// the word a readiness observation names its gate by.
func (entry LifecycleEntry) Name() string {
	segments := strings.Split(entry.Entry, ".")
	return segments[len(segments)-1]
}

// WireCensus is the DECLARED row count of each group, in the rendering's group
// order.
//
// It is hand-declared and it is the census arm's first count. The second count
// is derived by walking the rendered bytes, so the two never share a source: a
// row appended to a table without its census line moving, or a census line
// moved without its table, fails the arm rather than passing quietly.
var WireCensus = []struct {
	Group string
	Rows  int
}{
	{Group: "protocol-verbs", Rows: 12},
	{Group: "api-subjects", Rows: 40},
	{Group: "system-subjects", Rows: 38},
	{Group: "status-events", Rows: 11},
	{Group: "lifecycle-entries", Rows: 10},
}

// WireRegions is every region the five tables cite, in table order, with
// duplicates removed.
//
// The digest table is generated from exactly this list, so a row whose region
// is not in it cannot be pinned and a region carried here with no row is a
// digest nobody names.
func WireRegions() []WireRegion {
	regions := make([]WireRegion, 0, 128)
	seen := make(map[string]bool, 128)
	add := func(region WireRegion) {
		if seen[region.Key()] {
			return
		}
		seen[region.Key()] = true
		regions = append(regions, region)
	}
	for _, row := range ProtocolVerbs {
		add(row.Region)
	}
	for _, row := range APISubjects {
		add(row.Region)
	}
	for _, row := range SystemSubjects {
		add(row.Region)
	}
	for _, row := range StatusEvents {
		add(row.Region)
	}
	for _, row := range LifecycleEntries {
		add(row.Region)
	}
	return regions
}

// pinValue renders one row's provenance: the vendor package, its version, and
// the digest of the region's bytes.
//
// A region with no digest renders an EMPTY digest rather than being skipped, so
// the closure arm sees an unpinned row instead of a table that quietly lost one.
func pinValue(region WireRegion, digests map[string]string) map[string]any {
	return map[string]any{
		"package": region.Pin.Module,
		"version": region.Pin.Version,
		"digest":  digests[region.Key()],
	}
}

// WireVocabularyValue declares the whole wire vocabulary as one value.
//
// The rendering is a deterministic function of the tables and the digest table
// and of nothing else: no map iteration reaches the output, no clock is read,
// and no locale is consulted. Two renderings in one process agree, and the wall
// checks that they do, because a rendering that varied would make byte-parity a
// coin toss rather than a wall.
func WireVocabularyValue(digests map[string]string) map[string]any {
	verbs := make([]any, 0, len(ProtocolVerbs))
	for _, row := range ProtocolVerbs {
		verbs = append(verbs, map[string]any{
			"word":        row.Word,
			"direction":   string(row.Direction),
			"shape":       row.Shape,
			"declaration": row.Declaration,
			"pin":         pinValue(row.Region, digests),
			"wire":        string(row.Wire),
			"use":         string(row.Use),
			"promotion":   row.Promotion,
		})
	}

	subjects := make([]any, 0, len(APISubjects))
	for _, row := range APISubjects {
		subjects = append(subjects, map[string]any{
			"subject":             row.Subject,
			"template":            row.Template,
			"declaration":         row.Declaration,
			"templateDeclaration": row.TemplateDeclaration,
			"pin":                 pinValue(row.Region, digests),
			"wire":                string(row.Wire),
			"use":                 string(row.Use),
			"promotion":           row.Promotion,
		})
	}

	events := make([]any, 0, len(SystemSubjects))
	for _, row := range SystemSubjects {
		events = append(events, map[string]any{
			"subject":     row.Subject,
			"declaration": row.Declaration,
			"pin":         pinValue(row.Region, digests),
			"wire":        string(row.Wire),
			"use":         string(row.Use),
			"promotion":   row.Promotion,
		})
	}

	statuses := make([]any, 0, len(StatusEvents))
	for _, row := range StatusEvents {
		payload := make([]any, 0, len(row.Payload))
		for _, field := range row.Payload {
			payload = append(payload, map[string]any{
				"name":     field.Name,
				"sort":     field.Sort,
				"optional": field.Optional,
			})
		}
		statuses = append(statuses, map[string]any{
			"type":        row.Type,
			"declaration": row.Declaration,
			"payload":     payload,
			"placement":   row.Placement,
			"pin":         pinValue(row.Region, digests),
			"wire":        string(row.Wire),
			"use":         string(row.Use),
			"promotion":   row.Promotion,
		})
	}

	entries := make([]any, 0, len(LifecycleEntries))
	for _, row := range LifecycleEntries {
		entries = append(entries, map[string]any{
			"entry":     row.Entry,
			"signature": row.Signature,
			"phase":     row.Phase,
			"pin":       pinValue(row.Region, digests),
			"wire":      string(row.Wire),
			"use":       string(row.Use),
			"promotion": row.Promotion,
		})
	}

	return map[string]any{
		"v":    float64(0),
		"kind": "substrate-wire-vocabulary",
		"groups": []any{
			map[string]any{"group": "protocol-verbs", "rows": verbs},
			map[string]any{"group": "api-subjects", "rows": subjects},
			map[string]any{"group": "system-subjects", "rows": events},
			map[string]any{"group": "status-events", "rows": statuses},
			map[string]any{"group": "lifecycle-entries", "rows": entries},
		},
	}
}

// WireVocabularyBytes renders the whole vocabulary canonically.
func WireVocabularyBytes(digests map[string]string) ([]byte, error) {
	return canonical.CanonicalizeValue(WireVocabularyValue(digests))
}

// WireDigestKeys is every digest-table key the tables name, sorted, so that a
// generated digest table has a stated order that does not depend on a map walk.
func WireDigestKeys() []string {
	regions := WireRegions()
	keys := make([]string, 0, len(regions))
	for _, region := range regions {
		keys = append(keys, region.Key())
	}
	sort.Strings(keys)
	return keys
}
