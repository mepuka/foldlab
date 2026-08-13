package protod

// Refusals are data (W8): every "no" this daemon utters is one of these
// values, marshaled into a reply. Nothing throws across the seam and no
// NATS error ever carries a domain refusal.

// Refusal kinds. Each names the one law that refused; the conformance
// test covers every kind from the daemon side.
const (
	KindMalformed        = "malformed"         // body is not a JSON object the handler can read
	KindInvalidStructure = "invalid-structure" // flb.type.v0 grammar violation
	KindUnknownRef       = "unknown-ref"       // a ref digest does not resolve in the catalog
	KindDigestMismatch   = "digest-mismatch"   // asserted identity the daemon cannot re-derive (W1)
	KindUnknownIdentity  = "unknown-identity"  // ingress frame claims an uncataloged digest (W4)
	KindBadJournal       = "bad-journal"       // ingress subject names an invalid or reserved journal
	KindUnknownJournal   = "unknown-journal"   // read addresses a journal that does not exist
	KindBadCursor        = "bad-cursor"        // read cursor does not verify against the journal (W6)
	KindUnknownRequest   = "unknown-request"   // request subject has no handler
)

// NextHint teaches the caller what to do next (W7): a subject plus a
// filled body template.
type NextHint struct {
	Subject string `json:"subject"`
	Note    string `json:"note"`
	Body    any    `json:"body,omitempty"`
}

// Refusal is the uniform refusal value. Law carries the sentence that
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
