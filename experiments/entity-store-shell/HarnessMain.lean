import Shell

/-- `harness <scripts-dir> <fresh-work-dir> [--verbose]`. -/
def main (argv : List String) : IO UInt32 :=
  match argv with
  | scripts :: work :: rest =>
      Shell.runHarness ⟨scripts⟩ ⟨work⟩ (rest.contains "--verbose")
  | _ => do
      IO.eprintln "usage: harness <scripts-dir> <fresh-work-dir> [--verbose]"
      pure 2
