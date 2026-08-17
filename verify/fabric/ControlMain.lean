import Fabric.ControlProofs

open Fabric

def showControl (name vector : String) (lawful mutant : Nat) : IO UInt32 := do
  IO.println s!"control={name};vector={vector};lawful={lawful};mutant={mutant};verdict={if lawful == mutant then "survived" else "refuted"}"
  return if lawful == mutant then 1 else 0

def main (args : List String) : IO UInt32 := do
  match args with
  | ["drop-idempotence"] =>
      showControl "drop-idempotence" "duplicated-deliveries"
        (Nat.max 1 1) (Mutants.additiveMerge 1 1)
  | ["drop-commutativity"] =>
      showControl "drop-commutativity" "permuted-evidence-schedule"
        (Nat.max 1 2) (Mutants.leftBiasedMerge 1 2)
  | ["drop-floor-guard"] =>
      showControl "drop-floor-guard" "floor-violating-stale-replay"
        (fold Nat.add 0 [2, 3])
        (Mutants.unguardedApply Nat.add Mutants.floorReplayVector 0)
  | ["drop-meet-clamping"] =>
      showControl "drop-meet-clamping" "attenuation-request-clamped"
        (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest).budget
        (Mutants.unclampedChild Mutants.rootPolicy Mutants.escalatingRequest).budget
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (drop-idempotence|drop-commutativity|drop-floor-guard|drop-meet-clamping)"
      return 2
