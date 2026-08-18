/- Must-not-compile control: a journal position means nothing outside
   its partition. Comparing positions across partitions is refused by
   the elaborator. The lawful twin lives in
   `cross-partition-position.witness.lean`. -/
import Kernel

open Kernel

def partitionOne : LanePartition := { lane := ⟨1⟩, shard := 0 }
def partitionTwo : LanePartition := { lane := ⟨1⟩, shard := 1 }
def positionAtOne : Position partitionOne := ⟨5⟩
def positionAtTwo : Position partitionTwo := ⟨5⟩

example : Prop := positionAtOne = positionAtTwo
