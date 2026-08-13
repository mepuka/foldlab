package catalogr4

type replyMutantControl struct {
	Name   string
	Branch string
	Hits   int
	Apply  func(subject string, reply map[string]any) bool
}

var activeReplyMutant *replyMutantControl

func applyReplyMutant(subject string, reply map[string]any) {
	if activeReplyMutant != nil && activeReplyMutant.Apply(subject, reply) {
		activeReplyMutant.Hits++
	}
}
