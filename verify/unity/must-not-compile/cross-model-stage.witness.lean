/- Witness twin: the same stage crosses through the named erasure, so
   the control file fails for the sort discipline and not for rot. -/
import Unity

def kernelStage : Kernel.HoleStage := .filled

example : Fabric.HoleStage := Unity.stageOf kernelStage
