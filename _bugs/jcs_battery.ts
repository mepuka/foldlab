import { GoJcsProbe, localProbeOutcome, type ProbeOutcome } from "../packages/core/test/jcsProbe.ts"

// Adversarial hand-picked JSON byte strings: number edge cases, astral
// Unicode, degenerate structures. We feed the SAME raw bytes to TS and Go
// canonicalizers and diff the outcome (accepted + canonical bytes).
const cases: Array<[string, string]> = [
  ["1e-7", "1e-7"],
  ["1e-6", "1e-6"],
  ["1e21", "1e21"],
  ["1e20", "1e20"],
  ["1e-21", "1e-21"],
  ["5e-324", "min subnormal"],
  ["1.7976931348623157e308", "max double"],
  ["2.2250738585072014e-308", "min normal"],
  ["9007199254740993", "2^53+1 (unrepresentable odd)"],
  ["123456789012345680000", "big int-ish"],
  ["0.1", "0.1"],
  ["-0", "negative zero"],
  ["1000000000000000000000", "1e21 as integer literal"],
  ["100000000000000000000", "1e20 as integer literal"],
  ["3.141592653589793", "pi"],
  ["1E+2", "uppercase exp"],
  ["0.0000001", "0.0000001"],
  ["[1e-7,1e21,5e-324]", "number array"],
  ["{\"\\uD834\\uDD1E\":1}", "astral key (G-clef) escaped"],
  ["\"\\uD834\\uDD1E\"", "astral string value escaped"],
  ["{\"\\uE000\":1,\"\\uD800\\uDC00\":2}", "U+E000 vs U+10000 key ordering"],
  ["{\"\\u0041\":1,\"\\u00c4\":2,\"\\u010c\":3}", "latin key ordering"],
  ["[]", "empty array"],
  ["{}", "empty object"],
  ["1.0", "1.0 trailing zero"],
  ["1e0", "1e0"],
  ["-0.0", "-0.0"],
  ["100", "100"],
  ["0e0", "0e0"],
]

const enc = new TextEncoder()
const probe = new GoJcsProbe()
const render = (o: ProbeOutcome) => o.accepted ? `ok:${o.canonical}` : "REFUSED"
let diffs = 0
try {
  for (const [raw, label] of cases) {
    const bytes = enc.encode(raw)
    const ts = localProbeOutcome(bytes)
    const go = await probe.canonicalize(bytes)
    const same = ts.accepted === go.accepted && (!ts.accepted || (go.accepted && ts.canonical === go.canonical))
    if (!same) {
      diffs++
      console.log(`DIVERGENCE [${label}] input=${JSON.stringify(raw)}`)
      console.log(`   TS: ${render(ts)}`)
      console.log(`   GO: ${render(go)}`)
    }
  }
} finally {
  await probe.close?.()
}
console.log(diffs === 0 ? "ALL AGREE (no divergence in battery)" : `${diffs} DIVERGENCE(S)`)
