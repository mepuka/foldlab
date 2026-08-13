package protod

// Refusals are data (W8): every "no" this daemon utters is one of these
// values, marshaled into a reply. Nothing throws across the seam and no
// NATS error ever carries a domain refusal.

// RefusalSort names whether a daemon refusal is permanent evidence about its
// request bytes or a head-relative observation that later presence repeals.
// It is server-side classification only: W7's wire refusal stays unchanged.
type RefusalSort string

const (
	RefusalStructural RefusalSort = "structural"
	RefusalAbsence    RefusalSort = "absence"
)

// Refusal kinds. Each names the one law that refused; the conformance test
// covers every kind from the daemon side. The blocks make the ontology visible
// at the declaration site without adding a field to the wire value.
const (
	KindMalformed        = "malformed"         // body is not a JSON object the handler can read
	KindInvalidStructure = "invalid-structure" // flb.type.v0 grammar violation
	KindDigestMismatch   = "digest-mismatch"   // asserted identity the daemon cannot re-derive (W1)
	KindBadJournal       = "bad-journal"       // ingress subject names an invalid or reserved journal
	KindBadCursor        = "bad-cursor"        // read cursor does not verify against the journal (W6)
	KindUnknownRequest   = "unknown-request"   // request subject has no handler
)

const (
	KindUnknownRef      = "unknown-ref"      // a ref digest does not resolve at the current catalog head
	KindUnknownIdentity = "unknown-identity" // ingress frame claims a digest absent at the current catalog head (W4)
	KindUnknownJournal  = "unknown-journal"  // read addresses a journal absent at the current journal head
)

var refusalSortByKind = map[string]RefusalSort{
	KindMalformed:        RefusalStructural,
	KindInvalidStructure: RefusalStructural,
	KindDigestMismatch:   RefusalStructural,
	KindBadJournal:       RefusalStructural,
	KindBadCursor:        RefusalStructural,
	KindUnknownRequest:   RefusalStructural,
	KindUnknownRef:       RefusalAbsence,
	KindUnknownIdentity:  RefusalAbsence,
	KindUnknownJournal:   RefusalAbsence,
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

// Refusal is the uniform refusal value. Its sort is intentionally absent from
// this type: classification is server-side and W7's wire shape is unchanged.
// Law carries the sentence that
// refused; Path/Got/Expected/Example locate and teach the repair; Next
// makes self-repair possible without external docs. Local is always
// false from the daemon — the TS client marks its own refusals true.
type Refusal struct {
	Kind     string     `json:"kind"`
	Law      string     `json:"law"`
	Path     []string   `json:"path,omitempty"`
	Got      any        `json:"got,omitempty"`
	Expected any        `json:"expected,omitempty"`
	Example  any        `json:"example,omitempty"`
	Next     []NextHint `json:"next"`
	Local    bool       `json:"local"`
}

type refusalReply struct {
	OK      bool     `json:"ok"`
	Refusal *Refusal `json:"refusal"`
}

func refuse(r *Refusal) refusalReply {
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
