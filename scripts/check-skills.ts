/**
 * The skills-roster wall.
 *
 * AGENTS.md's "Skills" section is the steering contract that lets every
 * harness reach the three estate skills. Claims rot: a skill dropped from a
 * seat's awareness is a seat that cannot see the discipline it is judged by.
 * This script pins the steering against the tree in BOTH directions, plus the
 * per-tool manifest each skill ships for the codex-class harnesses, plus the
 * byte-identity of the skills in their two homes:
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
 *   mirror          the skills are dual-homed so no harness regresses: Claude
 *                   reads `.claude/skills/<name>/`, codex/pi/opencode read
 *                   `.agents/skills/<name>/`. The two homes must carry the
 *                   same skill bytes - `.claude/skills/<name>/` must mirror
 *                   `.agents/skills/<name>/` exactly, with only the codex
 *                   `agents/` manifest dir living in `.agents`. A missing or
 *                   drifted mirror fails.
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

/** Files under `dir`, sorted, forward-slash relative; empty when absent. */
const listFiles = (dir: string): ReadonlyArray<string> => {
  const out: Array<string> = []
  const walk = (base: string, prefix: string): void => {
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) walk(resolve(base, entry.name), rel)
      else out.push(rel)
    }
  }
  if (existsSync(dir)) walk(dir, "")
  return out.sort()
}

/**
 * The dual-home mirror law. `.claude/skills/<name>/` must be a byte-identical
 * copy of `.agents/skills/<name>/` (the codex `agents/` manifest dir excluded
 * - it lives only in `.agents`), both directions, so no skill content drifts
 * between the Claude native home and the cross-agent home.
 */
export const verifyClaudeMirror = (
  root: string,
  steering: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const reasons: Array<string> = []
  for (const name of steering) {
    const agentsDir = resolve(root, ".agents", "skills", name)
    const claudeDir = resolve(root, ".claude", "skills", name)
    if (!existsSync(claudeDir)) {
      reasons.push(`SKILL ROSTER: .claude mirror is missing skill '${name}'`)
      continue
    }
    const required = listFiles(agentsDir).filter((rel) => !rel.startsWith("agents/"))
    const present = listFiles(claudeDir)
    const diverged = (rel: string, from: ReadonlyArray<string>): boolean => {
      if (!from.includes(rel)) return true
      const aBytes = readFileSync(join(agentsDir, rel))
      const cBytes = readFileSync(join(claudeDir, rel))
      return !aBytes.equals(cBytes)
    }
    for (const rel of required) {
      if (diverged(rel, present)) {
        reasons.push(`SKILL ROSTER: .claude mirror diverges for skill '${name}' file '${rel}'`)
      }
    }
    for (const rel of present) {
      if (!required.includes(rel)) {
        reasons.push(`SKILL ROSTER: .claude mirror diverges for skill '${name}' file '${rel}'`)
      }
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
  const reasons = [
    ...verifySkillRoster(steering, disk),
    ...verifyClaudeMirror(root, steering),
  ]
  return { ok: reasons.length === 0, reasons }
}

// --- the gate ---------------------------------------------------------------

const runGate = (): number => {
  const result = checkSkills(repo)
  if (result.ok) {
    console.log(
      `SKILLS ROSTER: PASS (${result.reasons.length} refusals; AGENTS.md steering agrees with both on-disk homes at .claude/skills and .agents/skills, their manifests, and the byte-identical mirror)`,
    )
    return 0
  }
  for (const reason of result.reasons) console.error(reason)
  console.error("SKILLS ROSTER: FAIL - regenerate steering in AGENTS.md or repair the skill set / mirror")
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

type AgentSpec = {
  readonly name: string
  readonly hasSkillMd: boolean
  readonly hasManifest: boolean
}

const skillContent = (name: string): string =>
  `---\nname: ${name}\ndescription: synthetic\n---\ntext\n`

const manifestContent = (name: string): string =>
  `interface:\n  display_name: "${name}"\n`

/** Plant `.agents/skills/<name>/{SKILL.md, agents/openai.yaml}` on demand. */
const plantAgentsSkill = (root: string, spec: AgentSpec): void => {
  const dir = resolve(root, ".agents", "skills", spec.name)
  mkdirSync(dir, { recursive: true })
  if (spec.hasSkillMd) writeFileSync(join(dir, "SKILL.md"), skillContent(spec.name))
  if (spec.hasManifest) {
    const agents = join(dir, "agents")
    mkdirSync(agents, { recursive: true })
    writeFileSync(join(agents, "openai.yaml"), manifestContent(spec.name))
  }
}

/** Plant the `.claude` twin of a skill: `ok` mirrors, `drift` changes bytes. */
const plantClaudeSkill = (root: string, name: string, kind: "ok" | "drift"): void => {
  const dir = resolve(root, ".claude", "skills", name)
  mkdirSync(dir, { recursive: true })
  const body = kind === "drift" ? `${skillContent(name)}# drifted\n` : skillContent(name)
  writeFileSync(join(dir, "SKILL.md"), body)
}

type Mutant = {
  readonly name: string
  readonly steered: ReadonlyArray<string>
  readonly agents: ReadonlyArray<AgentSpec>
  /** Which agents-side skills get a `.claude` twin, and whether it drifts. */
  readonly claude?: ReadonlyArray<{ readonly name: string; readonly kind: "ok" | "drift" }>
}

const refusalsFor = (
  temporaryRoot: string,
  mutant: Mutant,
): ReadonlyArray<string> => {
  const root = resolve(temporaryRoot, mutant.name)
  mkdirSync(root, { recursive: true })
  writeFileSync(resolve(root, "AGENTS.md"), syntheticAgents(mutant.steered))
  for (const spec of mutant.agents) plantAgentsSkill(root, spec)
  for (const twin of mutant.claude ?? []) plantClaudeSkill(root, twin.name, twin.kind)
  return checkSkills(root).reasons
}

const selfTest = (): void => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "foldlab-skills-roster-"))
  const resolvedTemp = resolve(tmpdir())
  const write = process.argv.includes("--write")

  try {
    const both = { alpha: { name: "alpha", hasSkillMd: true, hasManifest: true }, beta: { name: "beta", hasSkillMd: true, hasManifest: true } }

    // The healthy control first: a section that steers the same skills both
    // homes carry, each complete, each mirrored. Machinery that refuses a
    // lawful roster or that misthrows on the prose line would fall here; a
    // green trace that never saw a lawful dual-home tree proves nothing.
    const healthy = refusalsFor(temporaryRoot, {
      name: "healthy",
      steered: ["alpha", "beta"],
      agents: [both.alpha, both.beta],
      claude: [{ name: "alpha", kind: "ok" }, { name: "beta", kind: "ok" }],
    })
    if (healthy.length !== 0) {
      throw new Error(`healthy control refused: ${healthy.join(" | ")}`)
    }

    // One mutant per law the wall guards, each dropping exactly that law:
    // the ticket's named control (a skill left on disk but dropped from the
    // section), a row steered to a missing skill, a section pointing at an
    // incomplete skill (no SKILL.md), a skill without its codex manifest, a
    // section whose bullet set is gone entirely (the vacuity guard), and the
    // two mirror breaks - `.claude` missing a skill and `.claude` carrying
    // drifted bytes.
    const label = (name: string): string => `== mutant: ${name}`

    const orphan = refusalsFor(temporaryRoot, {
      name: "unsteered-skill",
      steered: ["alpha"],
      agents: [both.alpha, both.beta],
      claude: [{ name: "alpha", kind: "ok" }, { name: "beta", kind: "ok" }],
    })
    const ghost = refusalsFor(temporaryRoot, {
      name: "steering-to-missing",
      steered: ["alpha", "ghost"],
      agents: [both.alpha],
      claude: [{ name: "alpha", kind: "ok" }],
    })
    const noSkillMd = refusalsFor(temporaryRoot, {
      name: "missing-skill-md",
      steered: ["alpha"],
      agents: [{ name: "alpha", hasSkillMd: false, hasManifest: true }],
    })
    const noManifest = refusalsFor(temporaryRoot, {
      name: "missing-manifest",
      steered: ["alpha"],
      agents: [{ name: "alpha", hasSkillMd: true, hasManifest: false }],
      claude: [{ name: "alpha", kind: "ok" }],
    })
    const emptySection = refusalsFor(temporaryRoot, {
      name: "empty-section",
      steered: [],
      agents: [both.alpha],
      claude: [{ name: "alpha", kind: "ok" }],
    })
    const mirrorMissing = refusalsFor(temporaryRoot, {
      name: "mirror-missing",
      steered: ["alpha"],
      agents: [both.alpha],
    })
    const mirrorDrift = refusalsFor(temporaryRoot, {
      name: "mirror-drift",
      steered: ["alpha"],
      agents: [both.alpha],
      claude: [{ name: "alpha", kind: "drift" }],
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
      label("mirror-missing"),
      ...mirrorMissing,
      label("mirror-drift"),
      ...mirrorDrift,
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

    const refused = {
      orphan: orphan.length > 0,
      ghost: ghost.length > 0,
      skillMd: noSkillMd.length > 0,
      manifest: noManifest.length > 0,
      empty: emptySection.length > 0,
      mirrorMissing: mirrorMissing.length > 0,
      mirrorDrift: mirrorDrift.length > 0,
    }
    if (Object.values(refused).some((value) => !value)) {
      const flat = Object.entries(refused).map(([key, value]) => `${key}=${value}`).join(" ")
      throw new Error(`a skills roster mutant was not refused (${flat})`)
    }
    console.log(
      "\nSKILLS ROSTER CONTROL: PASS (unsteered skill, steering-to-missing, missing SKILL.md, missing manifest, empty-section, missing .claude mirror, and drifted .claude mirror all refused; healthy dual-home control accepted)",
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
