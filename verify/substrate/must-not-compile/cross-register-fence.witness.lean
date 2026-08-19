/- The compiling twin of the cross-register fence control: the same
   landing, presented with a token the incarnation register itself
   issued. It elaborates, so the control's refusal is attributable to the
   register brand and not to file rot. -/
import Substrate

open Kernel Substrate

def ownFence : Token incarnationRegister where
  value := 0

def landUnderOwnFence : Option Register :=
  stepRegister initialRegister (.land firstIncarnation ownFence)
