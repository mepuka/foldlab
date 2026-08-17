import Fabric.ControlProofs

open Fabric

def showControl (name vector : String) (lawful mutant : Nat) : IO UInt32 := do
  IO.println s!"control={name};vector={vector};lawful={lawful};mutant={mutant};verdict={if lawful == mutant then "survived" else "refuted"}"
  return if lawful == mutant then 1 else 0

def main (args : List String) : IO UInt32 := do
  match args with
  | ["drop-idempotence"] =>
      showControl "drop-idempotence" "duplicated-deliveries"
        (foldEvidence Emitter.observationCmp Emitter.duplicatedEvidence).toList.length
        (Mutants.foldMultiplicity Emitter.duplicatedEvidence (1, 10) +
          Mutants.foldMultiplicity Emitter.duplicatedEvidence (2, 20))
  | ["drop-commutativity"] =>
      showControl "drop-commutativity" "permuted-evidence-schedule"
        (foldEvidence Emitter.observationCmp Emitter.permutedEvidence).toList.head!.1
        (Mutants.foldLeftBiased Emitter.permutedEvidence).toList.head!.1
  | ["drop-floor-guard"] =>
      showControl "drop-floor-guard" "floor-violating-stale-replay"
        (fold Nat.add 0 [2, 3])
        (Mutants.unguardedApply Nat.add 10 2 Mutants.floorReplayVector 0)
  | ["drop-meet-clamping"] =>
      showControl "drop-meet-clamping" "attenuation-request-clamped"
        (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest).budget
        (Mutants.unclampedChild Mutants.rootPolicy Mutants.escalatingRequest).budget
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (drop-idempotence|drop-commutativity|drop-floor-guard|drop-meet-clamping)"
      return 2
