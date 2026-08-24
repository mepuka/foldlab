# lean skill maintenance

This directory is the aggregate Lean skill. `SKILL.md` is the only always-loaded surface; every stage
under `workflows/` is disclosed on demand.

- Keep `SKILL.md` a router. It carries the route table, pipeline order, disclosure contract, and
  standing rules. Stage procedure belongs in the stage, never here.
- Each `workflows/<stage>/` directory remains a standalone source package that stays valid when
  exported as a repository root. Keep its internal layout and relative links intact; do not hoist a
  package's `references/`, `tests/`, or `agents/` into this level.
- A stage's own `AGENTS.md` governs that package. This file governs only the aggregate.
- Adding or removing a stage means updating the route table, the pipeline diagram, and the
  cross-reference rule in `SKILL.md` in the same change.
- Stage documents cite siblings as `$lean-<stage>`. Keep that spelling so the resolution rule in
  `SKILL.md` stays mechanical.
- `.claude/skills` is a symlink to `.agents/skills`. Edit through `.agents/skills` only; never
  reintroduce a second copy of this tree.
- Validate frontmatter, relative links, and every changed case specification before release.
