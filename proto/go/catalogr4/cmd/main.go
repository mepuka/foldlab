package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"foldlab/proto/catalogr4"
)

func main() {
	mode := flag.String("mode", "honest", "coverage, corrupted, sabotage, or honest")
	flag.Parse()

	config := catalogr4.DefaultCorpusConfig()
	corpus, err := catalogr4.GenerateCorpus(config)
	if err != nil {
		fatal(err)
	}

	switch *mode {
	case "coverage":
		printJSON(struct {
			Method   catalogr4.CorpusConfig `json:"method"`
			Coverage catalogr4.Coverage     `json:"coverage"`
		}{Method: config, Coverage: catalogr4.MeasureCoverage(corpus)})
	case "corrupted":
		report, err := catalogr4.RunCorruptedControls(context.Background(), corpus)
		if err != nil {
			fatal(err)
		}
		printJSON(report)
	case "sabotage":
		divergence, err := catalogr4.RunSabotageControl(context.Background())
		if err != nil {
			fatal(err)
		}
		printJSON(struct {
			Caught     bool                  `json:"caught"`
			Divergence *catalogr4.Divergence `json:"divergence"`
		}{Caught: true, Divergence: divergence})
	case "honest":
		report, err := catalogr4.RunHonestCorpus(context.Background(), corpus)
		if err != nil {
			fatal(err)
		}
		printJSON(report)
		if report.Divergence != nil {
			os.Exit(1)
		}
	default:
		fatal(fmt.Errorf("unknown mode %q", *mode))
	}
}

func printJSON(value any) {
	encoded, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		fatal(err)
	}
	fmt.Println(string(encoded))
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(2)
}
