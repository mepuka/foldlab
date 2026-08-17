import Lake

open Lake DSL

package fabricVeil where
  preferReleaseBuild := true
  buildArchive? := .none

require veil from git
  "https://github.com/verse-lab/veil.git" @
  "300c305e945750ab3fb62de4a79c23161b24da39"

@[default_target]
lean_lib FabricVeil where
  globs := #[`FabricVeil, .submodules `FabricVeil]
  leanOptions := #[⟨`weak.veil.smt.trust, false⟩]

lean_lib FabricVeilControls where
  globs := #[.submodules `Controls]

lean_exe fabric_veil_export where
  root := `Main
  leanOptions := #[⟨`weak.veil.smt.trust, false⟩]
