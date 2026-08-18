import { projectArguments, type ToolDocument, type Variant } from "./Projection.ts"
import type { BatteryTask, ModelCall } from "./Scoring.ts"

export const projectExpectedCall = (
  base: ToolDocument,
  task: BatteryTask,
  variant: Variant,
): ModelCall => {
  const tool = base.tools.find((candidate) => candidate.name === task.tool)
  return {
    task_id: task.id,
    name: task.tool,
    arguments: tool === undefined
      ? task.arguments
      : projectArguments(tool, task.arguments, variant),
  }
}

export const makePrompt = (options: {
  readonly tools: ToolDocument
  readonly tasks: readonly BatteryTask[]
  readonly candidates: Readonly<Record<string, string>>
}): string => JSON.stringify({
  instruction:
    "Produce exactly one tool call for each task. Use only the candidate values and exact canonical strings/numbers requested. Return calls in task order with no explanation.",
  tools: options.tools.tools,
  candidates: options.candidates,
  tasks: options.tasks.map((task) => ({
    task_id: task.id,
    request: task.instruction,
    expected_tool_family: "kernel",
  })),
})
