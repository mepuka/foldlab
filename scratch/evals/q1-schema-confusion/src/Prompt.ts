/**
 * The prompt, assembled so that exactly one thing differs between arms.
 *
 * Each task names its tool and, for every digest slot that tool requires, the
 * ledger entry to put there and the slot's role as the base schema's own
 * description states it. Descriptions are identical in all three arms, so the
 * property name and shape are the only things that move — which is the whole
 * of the question being measured. Naming the tool is deliberate: tool selection
 * is not what Q1 asks about, and leaving it to be inferred would let a
 * comprehension failure land in a naming statistic, which is exactly how round
 * 1 went wrong.
 *
 * @module
 */
import type { BatteryTask } from "./Battery.ts"
import { projectArguments, type ToolDocument, type Variant } from "./Projection.ts"
import type { ModelCall } from "./Scoring.ts"

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
    "Produce exactly one tool call for each task, in task order, with no explanation. " +
    "For each entry under `fill`, put the candidate value named by `candidate` into the " +
    "one property of that tool's input schema whose description is `slot_described_as`. " +
    "Copy the values under `literals` into the properties they are keyed by, exactly. " +
    "Populate only the properties named this way.",
  tools: options.tools.tools,
  candidates: options.candidates,
  tasks: options.tasks.map((task) => ({
    task_id: task.id,
    tool: task.tool,
    fill: task.assignments.map((assignment) => ({
      candidate: assignment.ledger_key,
      slot_described_as: assignment.role,
    })),
    literals: task.literals,
  })),
})
