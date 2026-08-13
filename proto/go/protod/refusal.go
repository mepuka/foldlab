package protod

// Refusals are data (W8): every "no" this daemon utters is one of these
// values, marshaled into a reply. Nothing throws across the seam and no
// NATS error ever carries a domain refusal.

// RefusalSort names whether a daemon refusal is permanent evidence about its
// request bytes or a head-relative observation that later presence repeals.
// It rides on every daemon refusal so an archived value retains the sort that
// was true under the grammar that emitted it.
type RefusalSort string

const (
	RefusalStructural RefusalSort = "structural"
	RefusalAbsence    RefusalSort = "absence"
)

// RefusalSortGrammarDigest pins the canonical kind-to-sort manifest for the
// current grammar. A changed classification mints a new digest; readers of an
// archived refusal never reinterpret its persisted Sort through a newer table.
const (
	RefusalSortGrammar       = "flb.type.v0+flb.session.v0"
	RefusalSortGrammarDigest = "080507edd048db53696fa855243c2f7811b867f2b92820957bda2798949999fc"
)

// Refusal kinds. Each names the one law that refused; the conformance test
// covers every kind from the daemon side. The blocks make the ontology visible
// at the declaration site.
const (
	KindMalformed        = "malformed"         // body is not a JSON object the handler can read
	KindInvalidStructure = "invalid-structure" // flb.type.v0 grammar violation
	KindDigestMismatch   = "digest-mismatch"   // asserted identity the daemon cannot re-derive (W1)
	KindBadJournal       = "bad-journal"       // ingress subject names an invalid or reserved journal
	KindBadCursor        = "bad-cursor"        // read cursor does not verify against the journal (W6)
	KindUnknownRequest   = "unknown-request"   // request subject has no handler
	KindSessionStale     = "session-stale"     // expectedHead is not the session's current head
	KindSessionPrincipal = "session-principal" // mutator principal differs from the session's open.author
)

const (
	KindUnknownRef      = "unknown-ref"      // a ref digest does not resolve at the current catalog head
	KindUnknownIdentity = "unknown-identity" // ingress frame claims a digest absent at the current catalog head (W4)
	KindUnknownJournal  = "unknown-journal"  // read addresses a journal absent at the current journal head
)

var refusalSortByKind = map[string]RefusalSort{
	KindMalformed:         RefusalStructural,
	KindInvalidStructure:  RefusalStructural,
	KindDigestMismatch:    RefusalStructural,
	KindBadJournal:        RefusalStructural,
	KindBadCursor:         RefusalStructural,
	KindUnknownRequest:    RefusalStructural,
	KindUnknownRef:        RefusalAbsence,
	KindUnknownIdentity:   RefusalAbsence,
	KindUnknownJournal:    RefusalAbsence,
	KindSessionStale:      RefusalAbsence,
	KindSessionPrincipal:  RefusalStructural,
	KindCompactionBlocked: RefusalAbsence,
}

// RefusalSortOf classifies daemon refusal kinds. Client-local refusals are not
// daemon observations and deliberately have no classification here.
func RefusalSortOf(kind string) (RefusalSort, bool) {
	sort, ok := refusalSortByKind[kind]
	return sort, ok
}

// Corpus law: a future fold over refusals may admit only RefusalStructural.
// Absence is retry-relevant head-relative state, never permanent evidence.

// NextHint teaches the caller what to do next (W7): a subject plus a
// filled body template.
type NextHint struct {
	Subject string `json:"subject"`
	Note    string `json:"note"`
	Body    any    `json:"body,omitempty"`
}

// Refusal is the uniform refusal value. Sort is persisted in every serialized
// daemon refusal; it is not reconstructed by readers from mutable code. Law
// carries the sentence that refused; Path/Got/Expected/Example locate and
// teach the repair; Next
// makes self-repair possible without external docs. Local is always
// false from the daemon — the TS client marks its own refusals true.
type Refusal struct {
	Kind     string      `json:"kind"`
	Sort     RefusalSort `json:"sort"`
	Law      string      `json:"law"`
	Path     []string    `json:"path,omitempty"`
	Got      any         `json:"got,omitempty"`
	Expected any         `json:"expected,omitempty"`
	Example  any         `json:"example,omitempty"`
	Next     []NextHint  `json:"next"`
	Local    bool        `json:"local"`
}

type refusalReply struct {
	OK      bool     `json:"ok"`
	Refusal *Refusal `json:"refusal"`
}

func refuse(r *Refusal) refusalReply {
	sort, ok := RefusalSortOf(r.Kind)
	if !ok {
		panic("protod: unclassified refusal kind " + r.Kind)
	}
	r.Sort = sort
	if r.Next == nil {
		r.Next = []NextHint{}
	}
	return refusalReply{OK: false, Refusal: r}
}

func describeHint() NextHint {
	return NextHint{
		Subject: SubjectContractDescribe,
		Note:    "request the daemon's contract; every subject and body shape is described there",
		Body:    map[string]any{},
	}
}
