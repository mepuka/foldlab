import Veil

set_option warn.sorry false

set_option veil.smt.trust true in
theorem trusted_smt_reflexivity (x : Int) : x = x := by
  veil_smt

set_option veil.smt.trust false in
theorem reconstructed_smt_reflexivity (x : Int) : x = x := by
  veil_smt

#print axioms trusted_smt_reflexivity
#print axioms reconstructed_smt_reflexivity
