// COORDINATOR-OWNED — the G1 gate binary. Verifies one or more bundle
// directories at the pinned G1 floors and reports what each proved.
package main

import (
	"fmt"
	"os"

	"foldlab/gauntlet"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: gauntletverify <bundle-dir> [<bundle-dir> ...]")
		os.Exit(2)
	}
	failed := false
	for _, dir := range os.Args[1:] {
		report, err := gauntlet.Verify(dir, gauntlet.G1())
		if err != nil {
			failed = true
			fmt.Printf("REFUSED  %s\n         %v\n", dir, err)
			continue
		}
		fmt.Printf(
			"VERIFIED %s\n         steps=%d workers=%d dup_runs=%d steals=%d kills=%d restarts=%d\n"+
				"         head=%s\n         state=%s\n         cf[%d]=%s\n",
			dir, report.Steps, report.Workers, report.DupRuns, report.Steals,
			report.Kills, report.ServerRestarts, report.Head, report.StateDigest,
			report.CfPosition, report.CfStateDigest,
		)
	}
	if failed {
		os.Exit(1)
	}
}
