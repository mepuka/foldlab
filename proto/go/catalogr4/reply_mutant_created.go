//go:build catalogr4_reply_created

package catalogr4

func init() {
	activeReplyMutant = &replyMutantControl{
		Name:   "created-true-mistyped",
		Branch: "CreateAtomic.created",
		Apply: func(subject string, reply map[string]any) bool {
			if subject != "flb.req.type.create" || reply["ok"] != true || reply["created"] != true {
				return false
			}
			reply["created"] = "true"
			return true
		},
	}
}
