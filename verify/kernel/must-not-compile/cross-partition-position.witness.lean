/- Witness twin: the same comparison inside one partition elaborates. -/
import Kernel

open Kernel

def partitionOne : LanePartition := { lane := ⟨1⟩, shard := 0 }
def positionAtOne : Position partitionOne := ⟨5⟩
def laterPositionAtOne : Position partitionOne := ⟨6⟩

example : Prop := positionAtOne = laterPositionAtOne
