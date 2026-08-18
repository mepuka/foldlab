// protod: the tracer-bullet daemon binary. Prints a single JSON ready
// line on stdout ({"ready":true,"url":"nats://..."}) once the request
// and ingress surfaces are live, then serves until stdin closes or an
// interrupt arrives — closing stdin is the portable shutdown path for
// test harnesses (Windows has no SIGTERM to send).
package main

import (
	"context"
	// encoding/json carriage: TRANSPORT/startup only — encoding the single
	// stdout ready line. This binary decodes no request bytes.
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"runtime/debug"

	"foldlab/proto/protod"
)

func run(storeDir, listen string, syncMode protod.SyncMode, memoryLimit int64) error {
	if memoryLimit <= 0 {
		return fmt.Errorf("--memory-limit must be positive")
	}
	debug.SetMemoryLimit(memoryLimit)
	daemon, err := protod.Acquire(context.Background(), protod.Options{
		StoreDir: storeDir,
		Listen:   listen,
		SyncMode: syncMode,
	})
	if err != nil {
		return err
	}
	defer daemon.Release()

	ready, err := json.Marshal(struct {
		Ready bool   `json:"ready"`
		URL   string `json:"url"`
	}{Ready: true, URL: daemon.URL()})
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintln(os.Stdout, string(ready)); err != nil {
		return err
	}

	interrupted := make(chan os.Signal, 1)
	signal.Notify(interrupted, os.Interrupt)
	stdinClosed := make(chan struct{})
	go func() {
		_, _ = io.Copy(io.Discard, os.Stdin)
		close(stdinClosed)
	}()

	select {
	case <-interrupted:
	case <-stdinClosed:
	}
	return nil
}

func main() {
	storeDir := flag.String("store", "", "JetStream file storage directory (required)")
	listen := flag.String("listen", "127.0.0.1:0", "host:port to listen on (port 0 = random)")
	syncMode := flag.String("sync-mode", "", "durability mode: crash-durable or power-durable (required)")
	memoryLimit := flag.Int64("memory-limit", 512<<20, "Go runtime memory limit in bytes")
	flag.Parse()
	if *storeDir == "" {
		fmt.Fprintln(os.Stderr, "protod: --store is required")
		os.Exit(2)
	}
	if *syncMode == "" {
		fmt.Fprintln(os.Stderr, "protod: --sync-mode is required")
		os.Exit(2)
	}
	if err := run(*storeDir, *listen, protod.SyncMode(*syncMode), *memoryLimit); err != nil {
		fmt.Fprintf(os.Stderr, "protod: %v\n", err)
		os.Exit(1)
	}
}
