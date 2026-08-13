# Issue 63 — decisions

## ISSUE-63-D1 — installation may defer the patch; typecheck may not

- **Decided:** the `prepare` lifecycle script exits successfully with a clear
  notice when `@effect/language-service` has not been linked yet. The ordinary
  path still applies the patch immediately. `bun run typecheck` invokes the
  same wrapper in required mode and refuses to run TypeScript unpatched.
- **Alternatives:** document a two-command bootstrap; silently skip the patch;
  recursively invoke `bun install --ignore-scripts` from the lifecycle hook;
  remove compile-time Effect diagnostics.
- **Why:** installation must be able to create its own dependencies, while a
  recursive installer risks lock and lifecycle re-entry. Deferral makes a
  fresh one-command install total, and required mode keeps the repository's
  compile-time Effect diagnostics from becoming optional evidence.
- **Load-bearing:** no. This changes bootstrap and gate mechanics only; it does
  not change application behavior, canonical identity, fixtures, or a claimed
  verification rung.
