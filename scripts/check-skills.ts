/**
 * The skills-roster wall.
 *
 * AGENTS.md's "Skills" section is the steering contract that lets every
 * harness reach the three estate skills. Claims rot: a skill dropped from a
 * seat's awareness is a seat that cannot see the discipline it is judged by.
 * This script pins the steering against the tree in BOTH directions, plus the
 * per-tool manifest each skill ships for the codex-class harnesses:
 *
 *   steering→disk   every skill AGENTS.md names exists on disk at
 *                   `.agents/skills/<name>/` (a row pointing at a missing
 *                   skill fails).
 *   disk→steering   every skill on disk under `.agents/skills/` is named in
 *                   AGENTS.md (a skill added without steering fails, so the
 *                   roster cannot go stale by omission).
 *   completeness    each steered skill carries its `SKILL.md` and its
 *                   `agents/openai.yaml` per-tool manifest - a row pointing
 *                   at an incomplete skill fails.
 *   vacuity         AGENTS.md steers at least one skill, so deleting the
 *                   section (and not the skills) or both together cannot
 *                   make an empty agreement pass.
 *
 * What this does NOT buy: nothing here checks that the manifest's prose
 * matches the skill, or that the SKILL.md still teaches what the section
 * says it teaches. A manifest is required present and non-empty; its content
 * is review territory. A bound wall is checkable, not sufficient.
 *
 * Usage:
 *   bun scripts/check-skills.ts               # the gate
 *   bun scripts/check-skills.ts --self-test    # the negative controls
 *   bun scripts/check-skills.ts --self-test --write  # re-record the control trace
 *
 * A gate that cannot fail proves nothing (AGENTS.md). The `--self-test` arm
 * re-plays the real section-parser and disk-walker against synthetic trees in
 * which exactly one law has been dropped, requires each to refuse, and diffs
 * the refusals against the committed `scripts/skills-control.trace.txt`.
 */
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const repo = resolve(import.meta.dir, "..")

type DiskSkill = {
  readonly name: string
  readonly hasSkillMd: boolean
  readonly hasManifest: boolean
}

/** The names AGENTS.md steers to: lines of the form `- .agents/skills/<name>/`. */
export const parseSteering = (agentsText: string): ReadonlyArray<string> => {
  const names: Array<string> = []
  for (const match of agentsText.matchAll(/^\s*[-*] +\x60\.agents\/skills\/([a-z0-9]+(?:-[a-z0-9]+)*)\/\x60/gm)) {
    const name = match[1]
    if (name !== undefined && !names.includes(name)) names.push(name)
  }
  return names.sort()
}

export const discoverSkills = (root: string): ReadonlyArray<DiskSkill> => {
  const skillsDir = resolve(root, ".agents", "skills")
  if (!existsSync(skillsDir)) return []
  const found: Array<DiskSkill> = []
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = resolve(skillsDir, entry.name)
    found.push({
      name: entry.name,
      hasSkillMd: existsSync(join(dir, "SKILL.md")),
      hasManifest: existsSync(join(dir, "agents", "openai.yaml")),
    })
  }
  return found.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/**
 * The decision. Returns the refusals (empty means the roster agrees). Stable
 * messages, no host-specific paths, so a committed control trace can pin them.
 */
export const verifySkillRoster = (
  steering: ReadonlyArray<string>,
  disk: ReadonlyArray<DiskSkill>,
): ReadonlyArray<string> => {
  if (steering.length === 0) {
    return ["SKILL ROSTER: AGENTS.md steers no skill (section deleted)"]
  }
  const reasons: Array<string> = []
  for (const skill of disk) {
    if (!steering.includes(skill.name)) {
      reasons.push(`SKILL ROSTER: on-disk skill '${skill.name}' has no steering in AGENTS.md`)
    }
  }
  for (const name of steering) {
    const skill = disk.find((candidate) => candidate.name === name)
    if (skill === undefined) {
      reasons.push(`SKILL ROSTER: AGENTS.md steers to missing skill '${name}'`)
      continue
    }
    if (!skill.hasSkillMd) {
      reasons.push(`SKILL ROSTER: skill '${name}' is missing SKILL.md`)
    }
    if (!skill.hasManifest) {
      reasons.push(`SKILL ROSTER: skill '${name}' is missing its agents/openai.yaml manifest`)
    }
  }
  return reasons
}

export const checkSkills = (
  root: string,
): { readonly ok: boolean; readonly reasons: ReadonlyArray<string> } => {
  const agentsPath = resolve(root, "AGENTS.md")
  const steering = existsSync(agentsPath) ? parseSteering(readFileSync(agentsPath, "utf8")) : []
  const disk = discoverSkills(root)
  const reasons = verifySkillRoster(steering, disk)
  return { ok: reasons.length === 0, reasons }
}

// --- the gate ---------------------------------------------------------------

const runGate = (): number => {
  const result = checkSkills(repo)
  if (result.ok) {
    console.log(
      `SKILLS ROSTER: PASS (${result.reasons.length} refusals; AGENTS.md steering agrees with the on-disk skill set and their manifests)`,
    )
    return 0
  }
  for (const reason of result.reasons) console.error(reason)
  console.error("SKILLS ROSTER: FAIL - regenerate steering in AGENTS.md or repair the skill set")
  return 1
}

// --- the negative controls ----------------------------------------------------

const normalize = (text: string): string => text.replaceAll("\r\n", "\n")

const syntheticAgents = (steered: ReadonlyArray<string>): string => {
  const bullets = steered.map((name) => `- \x60.agents/skills/${name}/\x60 — synthetic steering`).join("\n")
  return [
    "# synthetic agents",
    "## Skills",
    "Prose mentioning `.agents/skills/ghost/SKILL.md` is not steering; only bullets below are.",
    bullets,
    "",
  ].join("\n")
}

type Spec = {
  readonly name: string
  readonly hasSkillMd: boolean
  readonly hasManifest: boolean
}

const plantSkill = (root: string, spec: Spec): void => {
  const dir = resolve(root, ".agents", "skills", spec.name)
  mkdirSync(dir, { recursive: true })
  if (spec.hasSkillMd) {
    writeFileSync(join(dir, "SKILL.md"), `---\nname: ${spec.name}\ndescription: synthetic\n---\ntext\n`)
  }
  if (spec.hasManifest) {
    const agents = join(dir, "agents")
    mkdirSync(agents, { recursive: true })
    writeFileSync(join(agents, "openai.yaml"), `interface:\n  display_name: "${spec.name}"\n`)
  }
}

const selfTest = (): void => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "foldlab-skills-roster-"))
  const resolvedTemp = resolve(tmpdir())
  const write = process.argv.includes("--write")

  try {
    const refusalsFor = (mutant: {
      readonly name: string
      readonly steered: ReadonlyArray<string>
      readonly specs: ReadonlyArray<Spec>
    }): ReadonlyArray<string> => {
      const root = resolve(temporaryRoot, mutant.name)
      mkdirSync(root, { recursive: true })
      writeFileSync(resolve(root, "AGENTS.md"), syntheticAgents(mutant.steered))
      for (const spec of mutant.specs) plantSkill(root, spec)
      return checkSkills(root).reasons
    }

    // The healthy control first: a section that steers the same skills the
    // disk carries, each complete. Machinery that refuses a lawful roster or
    // that misthrows on the prose line would fall here; a green trace that
    // never saw a lawful tree proves nothing.
    const healthy = refusalsFor({
      name: "healthy",
      steered: ["alpha", "beta"],
      specs: [
        { name: "alpha", hasSkillMd: true, hasManifest: true },
        { name: "beta", hasSkillMd: true, hasManifest: true },
      ],
    })
    if (healthy.length !== 0) {
      throw new Error(`healthy control refused: ${healthy.join(" | ")}`)
    }

    // One mutant per law the wall guards, each dropping exactly that law:
    // the ticket's named control (a skill left on disk but dropped from the
    // section), a row steered to a missing skill, a section pointing at an
    // incomplete skill (no SKILL.md), a skill without its codex manifest,
    // and a section whose bullet set is gone entirely (the vacuity guard).
    const label = (name: string): string => `== mutant: ${name}`

    const orphan = refusalsFor({
      name: "unsteered-skill",
      steered: ["alpha"],
      specs: [
        { name: "alpha", hasSkillMd: true, hasManifest: true },
        { name: "beta", hasSkillMd: true, hasManifest: true },
      ],
    })
    const ghost = refusalsFor({
      name: "steering-to-missing",
      steered: ["alpha", "ghost"],
      specs: [{ name: "alpha", hasSkillMd: true, hasManifest: true }],
    })
    const noSkillMd = refusalsFor({
      name: "missing-skill-md",
      steered: ["alpha"],
      specs: [{ name: "alpha", hasSkillMd: false, hasManifest: true }],
    })
    const noManifest = refusalsFor({
      name: "missing-manifest",
      steered: ["alpha"],
      specs: [{ name: "alpha", hasSkillMd: true, hasManifest: false }],
    })
    const emptySection = refusalsFor({
      name: "empty-section",
      steered: [],
      specs: [{ name: "alpha", hasSkillMd: true, hasManifest: true }],
    })

    const trace = [
      label("unsteered-skill"),
      ...orphan,
      label("steering-to-missing"),
      ...ghost,
      label("missing-skill-md"),
      ...noSkillMd,
      label("missing-manifest"),
      ...noManifest,
      label("empty-section"),
      ...emptySection,
      "",
    ].join("\n")

    const tracePath = resolve(repo, "scripts", "skills-control.trace.txt")
    if (write) {
      writeFileSync(tracePath, trace)
      console.log(`SKILLS ROSTER CONTROL: wrote ${tracePath}`)
      return
    }
    const expected = normalize(readFileSync(tracePath, "utf8"))
    if (normalize(trace) !== expected) {
      throw new Error(`skills roster control trace moved\n${trace}`)
    }

    const orphansRefused = orphan.length > 0
    const ghostRefused = ghost.length > 0
    const skillMdRefused = noSkillMd.length > 0
    const manifestRefused = noManifest.length > 0
    const emptyRefused = emptySection.length > 0
    if (!(orphansRefused && ghostRefused && skillMdRefused && manifestRefused && emptyRefused)) {
      throw new Error(
        "a skills roster mutant was not refused " +
          `(orphan=${orphansRefused} ghost=${ghostRefused} skillMd=${skillMdRefused} ` +
          `manifest=${manifestRefused} empty=${emptyRefused})`,
      )
    }
    console.log(
      "\nSKILLS ROSTER CONTROL: PASS (unsteered skill, steering-to-missing, missing SKILL.md, missing manifest, and empty-section all refused; healthy control accepted)",
    )
  } finally {
    if (!temporaryRoot.startsWith(`${resolvedTemp}\\`) &&
      !temporaryRoot.startsWith(`${resolvedTemp}/`)) {
      throw new Error(`refusing to remove non-temporary skills roster directory: ${temporaryRoot}`)
    }
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

if (process.argv.includes("--self-test")) {
  selfTest()
} else {
  process.exit(runGate())
}
