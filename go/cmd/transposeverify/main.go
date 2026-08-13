// COORDINATOR-OWNED — the RG-A gate binary. Verifies transposition
// bundles at the pinned RGA floors and reports the collapse factor.
package main

import (
	"fmt"
	"os"

	"foldlab/gauntlet"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: transposeverify <bundle-dir> [<bundle-dir> ...]")
		os.Exit(2)
	}
	failed := false
	for _, dir := range os.Args[1:] {
		report, err := gauntlet.VerifyTransposition(dir, gauntlet.RGA())
		if err != nil {
			failed = true
			fmt.Printf("REFUSED  %s\n         %v\n", dir, err)
			continue
		}
		fmt.Printf(
			"VERIFIED %s\n         n=%d states=%d workers=%d min_share=%d\n"+
				"         path-tree nodes = %s\n         collapse factor = %s\n"+
				"         head=%s\n         state=%s\n",
			dir, report.N, report.States, report.Workers, report.MinWorkerShare,
			report.PathTreeNodes, report.CollapseFactor, report.Head, report.StateDigest,
		)
	}
	if failed {
		os.Exit(1)
	}
}
