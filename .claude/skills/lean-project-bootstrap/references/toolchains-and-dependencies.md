# Toolchains and dependencies

Lake is Lean's standard build tool; Elan selects the project toolchain from `lean-toolchain`.
Projects should use a specific version or revision so old builds remain reproducible
([Lake](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Lake/),
[Elan](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Managing-Toolchains-with-Elan/)).

- Inspect before update. `lake update` may fetch dependencies and rewrite toolchain/manifest state.
- Preserve the resolved manifest during repairs. A migration records old/new pins and source fixes.
- Prefer an exact stable release for ordinary projects. A nightly/custom toolchain needs a reason.
- Treat dependency caches as performance artifacts, not proof artifacts.
- A dependency adds code, tactics, build steps, transitive packages, and trust assumptions. Select
  the smallest surface that supplies the required semantics.

Do not silently install Elan, switch a global default, link/uninstall toolchains, or delete a cache.
Report the prerequisite or request authorization for the exact action.
