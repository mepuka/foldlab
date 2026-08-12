package transfleet

import (
	"errors"
	"fmt"
	"time"

	"github.com/nats-io/nats-server/v2/server"
)

func RunServer(port int, storeDir string) error {
	options := &server.Options{
		ServerName: "foldlab-rg-a",
		Host:       "127.0.0.1",
		Port:       port,
		JetStream:  true,
		StoreDir:   storeDir,
		NoLog:      true,
		NoSigs:     true,
	}
	natsServer, err := server.NewServer(options)
	if err != nil {
		return fmt.Errorf("create nats-server: %w", err)
	}
	go natsServer.Start()
	if !natsServer.ReadyForConnections(15 * time.Second) {
		return errors.New("nats-server did not become ready")
	}
	natsServer.WaitForShutdown()
	return nil
}
