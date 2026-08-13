# packages/cache — agent contract

The federated fold cache: the fold-through service, its storage seam,
and coordination-free merge. Read root `AGENTS.md` first; scoped laws:

- **The key rule lives in `@foldlab/core/foldCache`.** Nothing here
  assembles a cache key from a digest and a head. A second key rule is
  the `entity.ts` hazard again: it does not fail loudly, it silently
  never hits, or hits on the wrong thing.
- **Only two refusals are not economic.** `runCached` fails with
  `IdentityUnavailable` or `CorruptEntry` and nothing else. A backing
  store that cannot be reached is a miss; a value with no canonical form
  is a permanent miss. Unreachability costs time, never correctness — so
  it is not in the error channel.
- **A collision is never a merge.** Two different byte strings under one
  key is proof that one side is corrupt or that SHA-256 broke. Refuse,
  loudly, on both the write path and the merge path. Never last-writer-
  wins, never first-writer-wins.
- **Eviction has no write channel, by type.** An `Eviction` policy sees
  `KeyStat` (key, size, age) and returns keys. It never sees bytes and
  never produces them, so the worst a wrong policy can do is cost money.
- **Federation is a separate service.** A single-node user provides
  `Backing` and `FoldCache` and never learns that `Federation`, `Peers`,
  or a snapshot exists.
- **No NATS in tests.** `BackingJournalKv` is a declared adapter with a
  Layer signature and no build. Bringing a broker up inside `bun test`
  is out of bounds; the in-memory adapter is what the laws run against.
- Runtime dependency: `effect` at the pinned catalog version and
  `@foldlab/core`, nothing else. Confirm APIs against `repos/effect/`,
  never memory.
