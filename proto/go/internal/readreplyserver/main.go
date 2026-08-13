// Command readreplyserver is test support for the TypeScript read verifier.
// It serves one caller-selected journal.read reply over a real NATS transport,
// without sharing any verification code with the client under test.
package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
)

func main() {
	reply := os.Getenv("FOLDLAB_TEST_READ_REPLY")
	if reply == "" {
		fatal(errors.New("FOLDLAB_TEST_READ_REPLY is required"))
	}

	natsServer, err := server.NewServer(&server.Options{
		ServerName: "flb-read-reply-test",
		Host:       "127.0.0.1",
		Port:       server.RANDOM_PORT,
		NoLog:      true,
		NoSigs:     true,
	})
	if err != nil {
		fatal(err)
	}
	go natsServer.Start()
	if !natsServer.ReadyForConnections(10 * time.Second) {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		fatal(errors.New("embedded nats-server did not become ready"))
	}

	connection, err := nats.Connect(natsServer.ClientURL())
	if err != nil {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		fatal(err)
	}
	subscription, err := connection.Subscribe("flb.req.journal.read", func(message *nats.Msg) {
		if message.Reply != "" {
			_ = message.Respond([]byte(reply))
		}
	})
	if err != nil {
		connection.Close()
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		fatal(err)
	}
	if err := connection.Flush(); err != nil {
		connection.Close()
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		fatal(err)
	}

	fmt.Printf("{\"ready\":true,\"url\":%q}\n", natsServer.ClientURL())
	_, _ = io.Copy(io.Discard, os.Stdin)

	_ = subscription.Drain()
	_ = connection.Drain()
	natsServer.Shutdown()
	natsServer.WaitForShutdown()
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
