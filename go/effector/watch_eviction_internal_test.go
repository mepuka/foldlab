package effector

import (
	"context"

	"github.com/nats-io/nats.go/jetstream"
)

// OpenHistoryFindingForTest bypasses the production History:1 admission gate
// only for the preserved issue #15 one-field substrate control. It is compiled
// into tests, never into the library.
func OpenHistoryFindingForTest(
	ctx context.Context,
	js jetstream.JetStream,
	name string,
) (*Effector, error) {
	kv, err := js.KeyValue(ctx, "E_"+name)
	if err != nil {
		return nil, err
	}
	stream, err := js.Stream(ctx, "KV_E_"+name)
	if err != nil {
		return nil, err
	}
	return &Effector{kv: kv, stream: stream}, nil
}
