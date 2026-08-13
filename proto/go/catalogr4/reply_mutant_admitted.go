//go:build catalogr4_reply_admitted

package catalogr4

import "strings"

func init() {
	activeReplyMutant = &replyMutantControl{
		Name:   "admitted-mistyped",
		Branch: "Publish.admitted",
		Apply: func(subject string, reply map[string]any) bool {
			if !strings.HasPrefix(subject, "flb.ing.") || reply["ok"] != true || reply["admitted"] != true {
				return false
			}
			reply["admitted"] = "true"
			return true
		},
	}
}
