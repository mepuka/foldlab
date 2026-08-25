import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { generateProject } from "./generate.ts"

export class GeneratedTreeDriftError extends Error {
  readonly code = "generated-tree-drift"

  constructor(detail: string) {
    super(`generated-tree-drift: ${detail}`)
    this.name = "GeneratedTreeDriftError"
  }
}

const listFiles = (root: string, current = root): Array<string> => {
  const files: Array<string> = []
  for (const entry of readdirSync(current, { withFileTypes: true }).toSorted((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  )) {
    if (entry.name === ".lake") continue
    const absolutePath = join(current, entry.name)
    if (entry.isDirectory()) files.push(...listFiles(root, absolutePath))
    else files.push(relative(root, absolutePath))
  }
  return files
}

export const compareTrees = (committedDirectory: string, regeneratedDirectory: string): number => {
  const committedFiles = listFiles(committedDirectory)
  const regeneratedFiles = listFiles(regeneratedDirectory)
  const committedSet = new Set(committedFiles)
  const regeneratedSet = new Set(regeneratedFiles)

  for (const file of committedFiles) {
    if (!regeneratedSet.has(file)) {
      throw new GeneratedTreeDriftError(`extra committed file ${file}`)
    }
  }
  for (const file of regeneratedFiles) {
    if (!committedSet.has(file)) {
      throw new GeneratedTreeDriftError(`missing committed file ${file}`)
    }
  }
  for (const file of committedFiles) {
    if (!readFileSync(join(committedDirectory, file)).equals(readFileSync(join(regeneratedDirectory, file)))) {
      throw new GeneratedTreeDriftError(`changed file ${file}`)
    }
  }

  return committedFiles.length
}

export interface LakeBuildResult {
  exitCode: number
  stdout: string
  stderr: string
}

export const lakeBuild = (projectDirectory: string): LakeBuildResult => {
  const result = spawnSync("lake", ["build"], {
    cwd: projectDirectory,
    encoding: "utf8"
  })
  if (result.error !== undefined) {
    return {
      exitCode: 127,
      stdout: result.stdout ?? "",
      stderr: `${result.stderr ?? ""}${result.error.message}\n`
    }
  }
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  }
}

export interface CheckResult {
  comparedFiles: number
  build: LakeBuildResult
}

export const checkGeneratedTree = (
  inventoryPath: string,
  committedDirectory: string
): CheckResult => {
  const fixturePath = join(committedDirectory, "EntityStoreGenerate", "Fixtures.lean")
  if (!existsSync(fixturePath)) {
    throw new GeneratedTreeDriftError("missing handwritten file EntityStoreGenerate/Fixtures.lean")
  }

  const temporaryRoot = mkdtempSync(join(tmpdir(), "entity-store-generate-check-"))
  const regeneratedDirectory = join(temporaryRoot, "generated")
  try {
    generateProject(inventoryPath, regeneratedDirectory)
    copyFileSync(
      fixturePath,
      join(regeneratedDirectory, "EntityStoreGenerate", "Fixtures.lean")
    )
    const comparedFiles = compareTrees(committedDirectory, regeneratedDirectory)
    const build = lakeBuild(committedDirectory)
    if (build.exitCode !== 0) {
      throw new Error(`lake-build-failed: exit ${build.exitCode}\n${build.stdout}${build.stderr}`)
    }
    return { comparedFiles, build }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  const inventoryPath = process.argv[2]
  if (inventoryPath === undefined) {
    console.error("usage: bun run src/check.ts <inventory.json> [committed-generated-directory]")
    process.exit(2)
  }
  const committedDirectory =
    process.argv[3] ?? new URL("../generated", import.meta.url).pathname
  try {
    const result = checkGeneratedTree(resolve(inventoryPath), resolve(committedDirectory))
    console.log(`generated tree matches committed copy (${result.comparedFiles} files)`)
    if (result.build.stdout.length > 0) process.stdout.write(result.build.stdout)
    if (result.build.stderr.length > 0) process.stderr.write(result.build.stderr)
    console.log("lake build passed")
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
