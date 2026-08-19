/- A store directory's digest compared with the incarnation register's.
   Digests are branded by the declaration kind they name and never
   compare across kinds: the comparison has no type, so this file must
   not elaborate. -/
import Substrate

open Kernel Substrate

def storeIsTheRegister : Bool :=
  sampleStore == incarnationRegister
