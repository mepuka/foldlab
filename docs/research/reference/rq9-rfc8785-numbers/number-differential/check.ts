// check.ts — foldlab RQ-9 reference artifact, 2026-08-16. Own-authored.
//
// Reads `hex,encoded` lines produced by emit.go and re-encodes each bit pattern
// with the runtime's own JSON.stringify — which is what
// packages/core/src/jcs.ts calls for numbers. Reports every disagreement.
//
//   bun check.ts emitted.txt
//
// Exit code 0 = no divergence, 1 = at least one divergence (printed).

const path = Bun.argv[2]
if (path === undefined) {
  console.error("usage: bun check.ts <emitted.txt>")
  process.exit(2)
}

const view = new DataView(new ArrayBuffer(8))

const encode = (value: number): string => {
  if (value === 0) return "0" // matches packages/core: JSON.stringify(-0) is already "0"
  return JSON.stringify(value)
}

let rows = 0
let bad = 0
const text = await Bun.file(path).text()
for (const line of text.split("\n")) {
  if (line.length === 0) continue
  const comma = line.indexOf(",")
  const hex = line.slice(0, comma)
  const fromGo = line.slice(comma + 1)
  view.setBigUint64(0, BigInt("0x" + hex), false)
  const value = view.getFloat64(0, false)
  const fromJs = encode(value)
  rows++
  if (fromGo !== fromJs) {
    bad++
    if (bad <= 20) console.log(`DIVERGENCE ${hex}: go=${fromGo} js=${fromJs}`)
  }
}
console.log(`rows=${rows} divergences=${bad} runtime=${process.versions.bun ? "bun " + process.versions.bun : "unknown"}`)
process.exit(bad === 0 ? 0 : 1)
