//go:build catalogr4_reply_refused

package catalogr4

import "strings"

func init() {
	activeReplyMutant = &replyMutantControl{
		Name:   "refusal-ok-mistyped",
		Branch: "Publish.refused",
		Apply: func(subject string, reply map[string]any) bool {
			if !strings.HasPrefix(subject, "flb.ing.") || reply["ok"] != false {
				return false
			}
			reply["ok"] = "false"
			return true
		},
	}
}
