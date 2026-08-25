import Shell

private def harnessUsage : String :=
  "usage: harness <scripts-dir> <fresh-work-dir> [--verbose] \
   [--record <transcripts-dir> | --compare <transcripts-dir>]"

/-- `harness <scripts-dir> <fresh-work-dir> [--verbose] [--record DIR | --compare DIR]`.

    Neither transcript flag changes the differential; each adds the CV-1 transcript leg on
    top of it. With no flag the behavior is exactly what it was before CV-1. -/
def main (argv : List String) : IO UInt32 :=
  match argv with
  | scripts :: work :: rest =>
      let verbose := rest.contains "--verbose"
      let flags := rest.filter (fun a => a != "--verbose")
      match flags with
      | [] => Shell.runHarness ⟨scripts⟩ ⟨work⟩ verbose .plain
      | ["--record", d] => Shell.runHarness ⟨scripts⟩ ⟨work⟩ verbose (.record ⟨d⟩)
      | ["--compare", d] => Shell.runHarness ⟨scripts⟩ ⟨work⟩ verbose (.compare ⟨d⟩)
      | _ => do
          IO.eprintln harnessUsage
          pure 2
  | _ => do
      IO.eprintln harnessUsage
      pure 2
