// emit.go — foldlab RQ-9 reference artifact, 2026-08-16. Own-authored.
//
// Emits `hex,encoded` lines for N pseudorandom finite binary64 values, where
// `encoded` is what Go's encoding/json produces for that float64. That is
// exactly the number path of go/canonical/canonical.go: appendCanonical's
// float64 case calls json.Marshal(value) after special-casing zero to "0".
//
// The companion check.ts re-encodes the same bit patterns with Bun's
// JSON.stringify (JavaScriptCore) and reports every disagreement. Any
// disagreement is a divergence between the two runtime canonicalizers on RFC
// 8785 §3.2.2.3, which is the requirement REF-2 has to model.
//
//	go run emit.go -n 200000 > emitted.txt
//	bun check.ts emitted.txt
package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"math/rand/v2"
	"os"
)

func encode(value float64) string {
	if value == 0 { // matches go/canonical: -0 and +0 both serialize as "0"
		return "0"
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return "ERR:" + err.Error()
	}
	return string(encoded)
}

func main() {
	count := flag.Int("n", 200000, "number of pseudorandom bit patterns")
	seedA := flag.Uint64("seed-a", 0x52463900, "PCG seed A")
	seedB := flag.Uint64("seed-b", 0x52463901, "PCG seed B")
	flag.Parse()

	random := rand.New(rand.NewPCG(*seedA, *seedB))
	writer := bufio.NewWriter(os.Stdout)
	defer writer.Flush()

	emitted := 0
	for emitted < *count {
		bits := random.Uint64()
		value := math.Float64frombits(bits)
		if math.IsNaN(value) || math.IsInf(value, 0) {
			continue // RFC 8785 §3.2.2.3 requires a refusal, not a string
		}
		fmt.Fprintf(writer, "%016x,%s\n", bits, encode(value))
		emitted++
	}
}
