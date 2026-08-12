--------------------------- MODULE EffectorTwoKey -----------------------------
(***************************************************************************)
(* The WITHDRAWN two-key protocol: a claim register and a separate outcome *)
(* register, with nothing binding the fence validation to the outcome      *)
(* create.  The transition table lives in Effector.tla (stated once; the   *)
(* config sets TwoKey = TRUE).  TLC must REDISCOVER the fencing violation  *)
(* here — the begin/steal/finish trace of CEX-3.  A checker that cannot    *)
(* find the known bug proves nothing.                                      *)
(***************************************************************************)
EXTENDS Effector
================================================================================
