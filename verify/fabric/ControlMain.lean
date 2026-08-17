import Fabric.ControlProofs

open Fabric

def showControl (name vector : String) (lawful mutant : Nat) : IO UInt32 := do
  IO.println s!"control={name};vector={vector};lawful={lawful};mutant={mutant};verdict={if lawful == mutant then "survived" else "refuted"}"
  return if lawful == mutant then 1 else 0

/-- Drift-format control line: the mutant is refuted when its output moves
    across the row's two presentations while the lawful output does not.
    A lawful drift would mean the row fails to isolate the mutant, so the
    verdict then reads survived. -/
def showDriftControl (name vector : String)
    (lawfulLeft lawfulRight mutantLeft mutantRight : String) : IO UInt32 := do
  let refuted := lawfulLeft == lawfulRight && mutantLeft != mutantRight
  IO.println s!"control={name};vector={vector};lawful-left={lawfulLeft};lawful-right={lawfulRight};mutant-left={mutantLeft};mutant-right={mutantRight};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

def renderSegments (segments : List (ContextSegment Nat)) : String :=
  String.intercalate "|" (segments.map fun segment =>
    s!"{segment.volatility.name}:{segment.source}:{segment.text}")

def renderEntryList (entries : List Nat) : String :=
  String.intercalate "," (entries.map toString)

def encodeTrace (trace : List Nat) : Nat :=
  trace.foldl (fun encoded operation => encoded * 10 + operation) 0

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
  | ["drop-successor-discipline"] =>
      showControl "drop-successor-discipline" "six-before-five-reordering"
        (encodeTrace (guardedApply Emitter.appendStep 4 2
          Mutants.reorderedDeliveryVector []))
        (encodeTrace (Mutants.arrivalOrderApply Emitter.appendStep 4
          Mutants.reorderedDeliveryVector []))
  | ["drop-meet-clamping"] =>
      showControl "drop-meet-clamping" "attenuation-request-clamped"
        (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest).budget
        (Mutants.unclampedChild Mutants.rootPolicy Mutants.escalatingRequest).budget
  | ["drop-payload-integrity"] =>
      showControl "drop-payload-integrity" "payload-conflict-window"
        (fold Nat.add 0 [2, 3])
        (Mutants.lastWriteBufferApply Nat.add 10 2
          Mutants.payloadConflictDeliveries 0)
  | ["drop-declared-reads"] =>
      showDriftControl "drop-declared-reads" "off-read-set-valuation-drift"
        (renderSegments (assemble Emitter.contextProgram Emitter.valuationOne))
        (renderSegments (assemble Emitter.contextProgram Emitter.valuationTwo))
        (renderSegments (Mutants.ambientAssemble Emitter.timestampRead
          Emitter.contextProgram Emitter.valuationOne))
        (renderSegments (Mutants.ambientAssemble Emitter.timestampRead
          Emitter.contextProgram Emitter.valuationTwo))
  | ["drop-volatility-order"] =>
      showDriftControl "drop-volatility-order" "two-completion-schedules"
        (renderSegments (assemble Emitter.contextProgram Emitter.valuationOne))
        (renderSegments (assemble Emitter.contextProgram Emitter.valuationOne))
        (renderSegments (Mutants.scheduleOrderAssemble
          Mutants.completionScheduleEager Emitter.contextProgram
          Emitter.valuationOne))
        (renderSegments (Mutants.scheduleOrderAssemble
          Mutants.completionScheduleLate Emitter.contextProgram
          Emitter.valuationOne))
  | ["drop-identity-tiebreak"] =>
      showDriftControl "drop-identity-tiebreak" "two-arrival-orders"
        (renderEntryList (topK Emitter.groundScore id Emitter.groundWidth
          Emitter.queryArrivalOne))
        (renderEntryList (topK Emitter.groundScore id Emitter.groundWidth
          Emitter.queryArrivalTwo))
        (renderEntryList (Mutants.arrivalOrderTopK Emitter.groundWidth
          Emitter.queryArrivalOne))
        (renderEntryList (Mutants.arrivalOrderTopK Emitter.groundWidth
          Emitter.queryArrivalTwo))
  | ["drop-schedule-independence"] =>
      showDriftControl "drop-schedule-independence" "two-ambient-threads"
        (renderEntryList ((topKAlgebra Emitter.groundScore id).answer
          Emitter.queryArrivalOne Emitter.groundWidth))
        (renderEntryList ((topKAlgebra Emitter.groundScore id).answer
          Emitter.queryArrivalOne Emitter.groundWidth))
        (renderEntryList (Mutants.ambientScheduleAnswer
          Mutants.ambientThreadEmpty Emitter.groundWidth
          Emitter.queryArrivalOne))
        (renderEntryList (Mutants.ambientScheduleAnswer
          Mutants.ambientThreadBoosting Emitter.groundWidth
          Emitter.queryArrivalOne))
  | ["drop-within-class-order"] =>
      showDriftControl "drop-within-class-order" "two-reads-one-class"
        (renderSegments ((assemble Mutants.twoStaticProgram
          Emitter.valuationOne).filter fun segment =>
            segment.volatility == Volatility.static))
        (renderSegments ((renderReads Mutants.twoStaticProgram
          Emitter.valuationOne).filter fun segment =>
            segment.volatility == Volatility.static))
        (renderSegments ((Mutants.rivalAssemble Mutants.twoStaticProgram
          Emitter.valuationOne).filter fun segment =>
            segment.volatility == Volatility.static))
        (renderSegments ((renderReads Mutants.twoStaticProgram
          Emitter.valuationOne).filter fun segment =>
            segment.volatility == Volatility.static))
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (drop-idempotence|drop-commutativity|drop-successor-discipline|drop-meet-clamping|drop-payload-integrity|drop-declared-reads|drop-volatility-order|drop-identity-tiebreak|drop-schedule-independence|drop-within-class-order)"
      return 2
