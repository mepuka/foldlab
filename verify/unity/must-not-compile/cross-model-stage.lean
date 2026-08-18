/- Must-not-compile control: the two models' hole stages are distinct
   sorts. Handing a kernel stage where a fabric stage belongs is
   refused by the elaborator — crossing takes the named erasure, so
   no statement can quietly conflate the models' carriers. The lawful
   twin lives in `cross-model-stage.witness.lean`. -/
import Unity

def kernelStage : Kernel.HoleStage := .filled

example : Fabric.HoleStage := kernelStage
