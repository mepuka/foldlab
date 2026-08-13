package crashstorm

import (
	"context"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

func connect(ctx context.Context, url, name string) (*nats.Conn, jetstream.JetStream, error) {
	for {
		connection, err := nats.Connect(
			url,
			nats.Name(name),
			nats.Timeout(500*time.Millisecond),
			nats.MaxReconnects(-1),
			nats.ReconnectWait(20*time.Millisecond),
		)
		if err == nil {
			js, jsErr := jetstream.New(connection)
			if jsErr == nil {
				return connection, js, nil
			}
			connection.Close()
		}
		select {
		case <-ctx.Done():
			return nil, nil, fmt.Errorf("connect %s: %w", url, ctx.Err())
		case <-time.After(25 * time.Millisecond):
		}
	}
}

func operationContext(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, 2*time.Second)
}
