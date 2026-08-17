import Fabric.Emit

open Fabric.Corpus

def main : IO UInt32 := do
  IO.println header
  for vector in vectors do
    IO.println (renderVector vector)
  return 0
