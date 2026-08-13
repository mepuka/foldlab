package catalogr4

import (
	"strings"
	"testing"
)

func TestStrictReplyDecodingRejectsMissingAndMistypedBranchFields(t *testing.T) {
	tests := []struct {
		name  string
		value map[string]any
		check func(map[string]any) error
		want  string
	}{
		{
			name:  "created missing",
			value: validCreateReply(),
			check: func(reply map[string]any) error { _, err := decodeCreateFact(reply); return err },
			want:  `missing field "created"`,
		},
		{
			name:  "created mistyped",
			value: validCreateReply(),
			check: func(reply map[string]any) error { _, err := decodeCreateFact(reply); return err },
			want:  `field "created" is string, want boolean`,
		},
		{
			name:  "admitted mistyped",
			value: validAdmitReply(),
			check: func(reply map[string]any) error { return decodeAdmitFact(reply, dataJournalName) },
			want:  `field "admitted" is string, want boolean`,
		},
		{
			name:  "refusal ok mistyped",
			value: validRefusalReply(),
			check: func(reply map[string]any) error { _, err := decodeRefusalFact(reply); return err },
			want:  `field "ok" is string, want boolean`,
		},
	}

	delete(tests[0].value, "created")
	tests[1].value["created"] = "false"
	tests[2].value["admitted"] = "true"
	tests[3].value["ok"] = "false"

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := test.check(test.value)
			if err == nil || !strings.Contains(err.Error(), test.want) {
				t.Fatalf("error = %v, want it to contain %q", err, test.want)
			}
		})
	}
}

func validCreateReply() map[string]any {
	return map[string]any{
		"ok": true, "created": false, "digest": strings.Repeat("0", 64),
		"scheme": "bytes-sha256-v1", "catalogSeq": float64(0),
		"catalogHead": strings.Repeat("0", 64), "next": []any{},
	}
}

func validAdmitReply() map[string]any {
	return map[string]any{
		"ok": true, "admitted": true, "journal": dataJournalName,
		"seq": float64(0), "head": strings.Repeat("0", 64), "note": "identity only", "next": []any{},
	}
}

func validRefusalReply() map[string]any {
	return map[string]any{
		"ok": false,
		"refusal": map[string]any{
			"kind": "unknown-identity", "law": "create before publish",
			"next": []any{}, "local": false,
		},
	}
}
