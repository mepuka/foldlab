/- The Go projection's entry point. The generator checks what its own
   consumer checks before it prints a byte: the corpus validator the
   interchange emitter runs, then the Go-side identifier and alphabet
   checks the spelling adds. A generator more tolerant than its
   consumer bakes the defect into compiled code, so a failing check
   writes the reason to standard error and exits nonzero and no
   emission reaches the tree.

   `--raw` prints the NODE LAYOUT alone — the printer's `RawFormat`
   half, before the elastic pass — so the gate can measure how much of
   the file the elastic pass decides instead of taking it on trust. It
   is a measurement surface, never an emission: nothing writes it to
   the tree. -/
import Unity.GoTables

def main (arguments : List String) : IO UInt32 := do
  let failures := Unity.GoTables.emissionFailures
  if failures.isEmpty then
    match arguments with
    | [] => IO.print Unity.GoTables.emission
    | ["--raw"] =>
        for line in Unity.GoPrinter.lines Unity.GoTables.tables do
          IO.println line
    | _ =>
        let err <- IO.getStderr
        err.putStrLn "usage: goemit [--raw]"
        return 2
    return 0
  else
    let err <- IO.getStderr
    for failure in failures do
      err.putStrLn s!"REFUSED: {failure}"
    err.putStrLn "goemit: refusing to print an emission that fails its own checks"
    return 1
