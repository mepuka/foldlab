// COORDINATOR-OWNED — the R1 gate binary. Verifies receipts bundles at
// the pinned R1 floors and reports the verified economics.
package main

import (
	"fmt"
	"os"

	"foldlab/gauntlet"
)

func usd(micro int64) string {
	return fmt.Sprintf("$%d.%06d", micro/1_000_000, micro%1_000_000)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: realverify <bundle-dir> [<bundle-dir> ...]")
		os.Exit(2)
	}
	failed := false
	for _, dir := range os.Args[1:] {
		report, err := gauntlet.VerifyReal(dir, gauntlet.R1())
		if err != nil {
			failed = true
			fmt.Printf("REFUSED  %s\n         %v\n", dir, err)
			continue
		}
		fmt.Printf(
			"VERIFIED %s\n         model=%s logical=%d physical=%d reuse=%d.%03dx kills=%d\n"+
				"         spend=%s naive=%s saved=%s\n         head=%s\n",
			dir, report.Model, report.Logical, report.Physical,
			report.ReuseMilli/1000, report.ReuseMilli%1000, report.Kills,
			usd(report.SpendMicro), usd(report.NaiveSpendMicro),
			usd(report.NaiveSpendMicro-report.SpendMicro), report.Head,
		)
	}
	if failed {
		os.Exit(1)
	}
}
