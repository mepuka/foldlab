import FabricVeil

open FabricVeil

def writeCorpus (path : System.FilePath) : IO Unit := do
  let text ← IO.ofExcept Corpus.corpusText
  IO.FS.writeFile path text

def writeControls (directory : System.FilePath) : IO Unit := do
  let (commitGuard, stealStrictness) ← IO.ofExcept Corpus.controlTexts
  IO.FS.writeFile (directory / "drop-commit-token-guard.cex.json") commitGuard
  IO.FS.writeFile (directory / "drop-steal-strict-increase.cex.json") stealStrictness

def main (args : List String) : IO UInt32 := do
  match args with
  | ["--write-corpus", path] =>
      writeCorpus path
      pure 0
  | ["--write-controls", directory] =>
      writeControls directory
      pure 0
  | _ =>
      IO.eprintln "usage: fabric_veil_export --write-corpus PATH | --write-controls DIRECTORY"
      pure 2
