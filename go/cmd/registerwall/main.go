// Command registerwall is the Go process used by the heterogeneous crash-steal wall.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/nats-io/nats.go"

	"foldlab/register"
)

func main() {
	if len(os.Args) < 5 {
		fmt.Fprintln(os.Stderr, "usage: registerwall URL steal WORK HOLDER | URL commit WORK TOKEN OUTCOME")
		os.Exit(2)
	}
	nc, err := nats.Connect(os.Args[1])
	if err != nil {
		fatal(err)
	}
	defer nc.Close()
	client, err := register.Open(nc)
	if err != nil {
		fatal(err)
	}

	var state register.State
	switch os.Args[2] {
	case "steal":
		state, err = client.ExpireSteal(os.Args[3], os.Args[4])
	case "commit":
		if len(os.Args) != 6 {
			fatal(fmt.Errorf("commit requires TOKEN OUTCOME"))
		}
		token, parseErr := strconv.ParseUint(os.Args[4], 10, 64)
		if parseErr != nil {
			fatal(parseErr)
		}
		state, err = client.Commit(os.Args[3], token, os.Args[5])
	default:
		fatal(fmt.Errorf("unknown action %q", os.Args[2]))
	}
	if err != nil {
		fatal(err)
	}
	if err := json.NewEncoder(os.Stdout).Encode(state); err != nil {
		fatal(err)
	}
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
