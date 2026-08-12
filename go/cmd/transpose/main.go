package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"foldlab/transfleet"
)

func main() {
	if len(os.Args) < 2 {
		usage()
	}
	var err error
	switch os.Args[1] {
	case "run":
		err = runController(os.Args[2:])
	case "render":
		err = renderBundle(os.Args[2:])
	case "worker":
		err = runWorker(os.Args[2:])
	case "server":
		err = runServer(os.Args[2:])
	default:
		usage()
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "transpose: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: transpose run --seed <seed> --bundle <dir> | render --bundle <dir>")
	os.Exit(2)
}

func runController(args []string) error {
	flags := flag.NewFlagSet("run", flag.ContinueOnError)
	seed := flags.String("seed", "", "run seed used to derive the workload salt")
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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	report, err := transfleet.Run(ctx, executable, *bundle, *seed)
	if err != nil {
		return err
	}
	fmt.Printf(
		"RG-A VERIFIED n=%d states=%d workers=%d min_share=%d path_tree=%s collapse=%s head=%s state=%s\n",
		report.N,
		report.States,
		report.Workers,
		report.MinWorkerShare,
		report.PathTreeNodes,
		report.CollapseFactor,
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
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *url == "" || *bundle == "" || *salt == "" || *owner == "" {
		return fmt.Errorf("worker flags are incomplete")
	}
	return transfleet.RunWorker(context.Background(), *url, *bundle, *salt, *owner, *index)
}

func renderBundle(args []string) error {
	flags := flag.NewFlagSet("render", flag.ContinueOnError)
	bundle := flags.String("bundle", "", "verified bundle directory")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *bundle == "" {
		return fmt.Errorf("render requires --bundle")
	}
	return transfleet.RenderSVG(*bundle)
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
	return transfleet.RunServer(*port, *store)
}
