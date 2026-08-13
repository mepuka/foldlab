//go:build catalogr4_reply_converged

package catalogr4

func init() {
	activeReplyMutant = &replyMutantControl{
		Name:   "created-false-missing",
		Branch: "CreateAtomic.converged",
		Apply: func(subject string, reply map[string]any) bool {
			if subject != "flb.req.type.create" || reply["ok"] != true || reply["created"] != false {
				return false
			}
			delete(reply, "created")
			return true
		},
	}
}
