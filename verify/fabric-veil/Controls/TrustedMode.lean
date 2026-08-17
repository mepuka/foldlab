import Veil

namespace FabricVeil.Controls

set_option warn.sorry false

/- Demonstration control only: this theorem is deliberately outside the roster. -/
set_option veil.smt.trust true in
theorem trusted_mode_control (x : Int) : x = x := by
  veil_smt

#print axioms trusted_mode_control

end FabricVeil.Controls
