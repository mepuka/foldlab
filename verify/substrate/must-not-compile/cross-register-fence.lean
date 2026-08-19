/- A fencing token minted at ANOTHER register, presented at the
   incarnation register. A token means nothing outside the register that
   issued it, and the register rides the token's type: this presentation
   has no type, so this file must not elaborate. The witness twin beside
   it presents the incarnation register's own token and does. -/
import Substrate

open Kernel Substrate

def otherRegister : Digest DeclKind.program where
  id := 1

def strayFence : Token otherRegister where
  value := 0

def landUnderStrayFence : Option Register :=
  stepRegister initialRegister (.land firstIncarnation strayFence)
