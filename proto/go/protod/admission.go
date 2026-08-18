package protod

import "foldlab/canonical"

// Byte-to-value admission on the meaning path (finding #36, DEV-806).
//
// `canonical.Decode` is this repository's ONLY byte-to-value admission law:
// valid UTF-8, unique member names, finite binary64 numbers, bounded nesting,
// no trailing second value. It is what makes one byte stream denote at most
// one value. `encoding/json` denotes something else — it REPAIRS. Duplicate
// member names last-win, lone surrogate escapes and raw invalid UTF-8 become
// U+FFFD. A repairing decoder names a value that did not arrive, and when the
// repaired value is then canonicalized and digested, two distinct submissions
// derive one catalog digest. That was finding #36.
//
// This is NOT the same claim as "the submitted bytes must be canonical".
// Law W2 (`proto/SPEC.md`) is deliberate and unchanged: the daemon
// canonicalizes admitted JSON itself, so FORMATTING — member order,
// whitespace, escape choice — can never move identity or cause refusal. The
// law here is narrower and orthogonal: whatever formatting arrives, it is read
// by the constrained decoder, and identity is derived from that reading alone.
//
// This file deliberately imports no `encoding/json`. The static import law in
// `encoding_json_import_law_test.go` holds every meaning path to the same rule
// so the second door is not reopened by an ordinary edit; that check states its
// own bounds, and the behavioural proof is the pair of identity controls
// (`request_body_identity_test.go`, `ingress_body_identity_test.go`).
//
// Every "no" produced here is DATA (W8): a structural `malformed` refusal
// naming the law it broke, with `got`/`expected` and a `next` hint. These are
// MEANING refusals about submitted bytes. Transport shape — a request with no
// reply inbox, an unrouted subject, a substrate failure — is never dressed up
// as one of these; per W8 such failures still surface as refusal data, marked
// local, rather than as a meaning refusal about the submission.

// decodeConstrained admits request bytes into the constrained JSON domain that
// bears identity. Every meaning path enters here and nowhere else.
func decodeConstrained(body []byte) (any, *Refusal) {
	value, err := canonical.Decode(body)
	if err != nil {
		return nil, &Refusal{
			Kind:     KindMalformed,
			Law:      "W2: requests are constrained JSON — this body has no canonical value",
			Got:      truncateForReply(body),
			Expected: "a JSON object",
			Next:     []NextHint{describeHint()},
		}
	}
	if _, ok := value.(map[string]any); !ok {
		return nil, &Refusal{
			Kind:     KindMalformed,
			Law:      "requests are JSON objects",
			Got:      value,
			Expected: "a JSON object",
			Next:     []NextHint{describeHint()},
		}
	}
	return value, nil
}

// admittedFields answers presence questions about a request body without
// re-reading the raw bytes. Callers that used to `json.Unmarshal` the body
// into `map[string]json.RawMessage` for a required-field check were opening a
// second, repairing door onto the meaning path: a body whose duplicate member
// names or invalid UTF-8 the constrained decoder refuses would still be walked
// for field presence and could emit a different refusal than the one the bytes
// earned. Presence is now asked of the admitted value.
//
// A body that does not decode yields no fields and no refusal: the caller's
// own admission step owns that verdict, and this helper never pre-empts it.
func admittedFields(body []byte) map[string]any {
	value, err := canonical.Decode(body)
	if err != nil {
		return nil
	}
	object, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	return object
}
