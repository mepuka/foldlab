// The frozen R2 gate as a command: climbverify <bundle-dir> exits 0
// only if the bundle passes VerifyClimb at the R2 floors.
package main

import (
	"fmt"
	"os"

	"foldlab/gauntlet"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: climbverify <bundle-dir>")
		os.Exit(2)
	}
	report, err := gauntlet.VerifyClimb(os.Args[1], gauntlet.R2())
	if err != nil {
		fmt.Fprintf(os.Stderr, "climbverify: REFUSED: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf(
		"R2 VERIFIED logical=%d physical=%d reuse=%d.%03dx workers=%d kills=%d\n"+
			"  dev %d/%d -> %d/%d (gain %d)  holdout %d/%d -> %d/%d (gain %d)\n"+
			"  spend_nano=%d naive_nano=%d winner=%s model=%s\n  head=%s\n",
		report.Logical, report.Physical, report.ReuseMilli/1000, report.ReuseMilli%1000,
		report.Workers, report.Kills,
		report.SeedDev, report.Dev, report.FinalDev, report.Dev, report.FinalDev-report.SeedDev,
		report.SeedHoldout, report.Holdout, report.WinnerHoldout, report.Holdout,
		report.WinnerHoldout-report.SeedHoldout,
		report.SpendNano, report.NaiveNano, report.Winner, report.Model, report.Head,
	)
}
