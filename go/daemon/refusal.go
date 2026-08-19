package daemon

import "fmt"

// The daemon's typed refusal, and the roster of reasons it mints.
//
// **Transcribed from the register's, deliberately.** A failed judgment on the
// meaning path returns reason, law AND repair — never a bare error and never a
// panic — and the shape that carries those three is already settled at the
// register seam. This package restates that shape rather than inventing a
// second one, because two refusal shapes in one estate is exactly the drift a
// transcription discipline exists to refuse. The gap the restatement leaves is
// stated rather than hidden: the Go side has no shared refusal package, so the
// two declarations are held together by their fields and by review, not by a
// wall.
//
// The repair is what makes a refusal a teaching rather than a verdict. Every
// constructor below supplies one, and the roster is walked by a totality test
// so that a reason added without a repair reddens instead of shipping.

// Next is one taught repair step: the surface to go to, and what to do there.
type Next struct {
	// Subject is the surface the repair is performed at.
	Subject string
	// Note is what to do there, in a sentence a reader can act on.
	Note string
}

// Refusal is one typed refusal: reason, law, what was seen, what was required,
// and the repair.
type Refusal struct {
	// Kind is the reason, drawn from [RefusalKinds].
	Kind string
	// Law is the sentence the refused value broke.
	Law string
	// Got is what the refused value carried.
	Got any
	// Want is what admission required.
	Want any
	// Next is the repair. Every refusal this package mints carries one.
	Next []Next
}

func (r *Refusal) Error() string {
	return fmt.Sprintf("%s: %s (got %v, want %v)", r.Kind, r.Law, r.Got, r.Want)
}

// The reasons this package refuses for.
const (
	// KindClosedChannel refuses a declared value that enables a channel the
	// estate's closed inventory carries.
	KindClosedChannel = "closed-channel"
	// KindUndeclaredOption refuses an inventory row that reads an option the
	// declared value does not carry. An absent option is not a closed one, so
	// the walk refuses rather than reading absence as safety.
	KindUndeclaredOption = "undeclared-option"
	// KindCitationUnresolved refuses a citation whose digest resolves to no
	// declared value.
	KindCitationUnresolved = "options-citation-unresolved"
	// KindCitationMismatch refuses a citation whose resolved value is not the
	// value the incarnation ran under.
	KindCitationMismatch = "options-citation-mismatch"
)

// RefusalKinds is the roster of reasons this package mints, so that the repair
// discipline is checkable rather than asserted.
var RefusalKinds = []string{
	KindClosedChannel,
	KindUndeclaredOption,
	KindCitationUnresolved,
	KindCitationMismatch,
}
