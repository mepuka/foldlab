package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"foldlab/crashstorm"
)

func main() {
	if len(os.Args) < 2 {
		usage()
	}
	var err error
	switch os.Args[1] {
	case "run":
		err = runController(os.Args[2:])
	case "worker":
		err = runWorker(os.Args[2:])
	case "server":
		err = runServer(os.Args[2:])
	default:
		usage()
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "gauntlet: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: gauntlet run --seed <seed> --bundle <dir>")
	os.Exit(2)
}

func runController(args []string) error {
	flags := flag.NewFlagSet("run", flag.ContinueOnError)
	seed := flags.String("seed", "", "distinct run seed")
	bundle := flags.String("bundle", "", "fresh output bundle directory")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *seed == "" || *bundle == "" {
		return fmt.Errorf("run requires --seed and --bundle")
	}
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Minute)
	defer cancel()
	report, err := crashstorm.Run(ctx, executable, *bundle, *seed)
	if err != nil {
		return err
	}
	fmt.Printf(
		"G1 VERIFIED seed=%s steps=%d workers=%d dup_runs=%d steals=%d kills=%d restarts=%d head=%s state=%s\n",
		*seed,
		report.Steps,
		report.Workers,
		report.DupRuns,
		report.Steals,
		report.Kills,
		report.ServerRestarts,
		report.Head,
		report.StateDigest,
	)
	return nil
}

func runWorker(args []string) error {
	flags := flag.NewFlagSet("worker", flag.ContinueOnError)
	url := flags.String("url", "", "NATS URL")
	bundle := flags.String("bundle", "", "bundle directory")
	salt := flags.String("salt", "", "workload salt")
	owner := flags.String("owner", "", "stable worker owner")
	index := flags.Int("index", -1, "worker index")
	paceFile := flags.String("pace-file", "", "controller pacing file")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *url == "" || *bundle == "" || *salt == "" || *owner == "" || *paceFile == "" {
		return fmt.Errorf("worker flags are incomplete")
	}
	if *index < 0 || *index >= crashstorm.Workers {
		return fmt.Errorf("worker index %d is outside [0,%d)", *index, crashstorm.Workers)
	}
	return crashstorm.RunWorker(context.Background(), *url, *bundle, *salt, *owner, *index, *paceFile)
}

func runServer(args []string) error {
	flags := flag.NewFlagSet("server", flag.ContinueOnError)
	port := flags.Int("port", 0, "TCP port")
	store := flags.String("store", "", "file-backed JetStream store")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *port <= 0 || *store == "" {
		return fmt.Errorf("server requires --port and --store")
	}
	return crashstorm.RunServer(*port, *store)
}
