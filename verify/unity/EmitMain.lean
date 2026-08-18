/- The kernel conformance emitter's entry point. The emitter checks its
   own document before printing a byte of it: every sentence vector must
   decode back to its own framing, the header's counts must match the
   records actually rendered, the planted set must still refuse sixteen
   and admit one, and every line must be printable ASCII. A failing
   check writes the reason to standard error and exits nonzero, so a
   corpus that cannot certify itself never reaches the fixture. -/
import Unity.Emit

open Unity.Emit

def main : IO UInt32 := do
  let failures := emitFailures
  if failures.isEmpty then
    for line in document do
      IO.println line
    return 0
  else
    let err <- IO.getStderr
    for failure in failures do
      err.putStrLn failure
    err.putStrLn "emit: refusing to print a corpus that fails its own checks"
    return 1
