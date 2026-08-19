/- The compiling twin of the cross-kind store control: two digests at
   ONE declaration kind, which compare. It elaborates, so the control's
   refusal is attributable to the kind brand and not to file rot. -/
import Substrate

open Kernel Substrate

def storeIsTheOtherStore : Bool :=
  sampleStore == otherStore
