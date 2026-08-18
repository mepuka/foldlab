export const Variants = ["compound", "bare", "nested"] as const

export type Variant = (typeof Variants)[number]

export interface JsonSchema {
  readonly [keyword: string]: unknown
  readonly type?: string
  readonly pattern?: string
  readonly description?: string
  readonly enum?: readonly string[]
  readonly minimum?: number
  readonly maximum?: number
  readonly additionalProperties?: boolean
  readonly required?: readonly string[]
  readonly properties?: Readonly<Record<string, JsonSchema>>
}

export interface ToolSchema {
  readonly name: string
  readonly description: string
  readonly input_schema: JsonSchema & {
    readonly type: "object"
    readonly additionalProperties: false
    readonly required: readonly string[]
    readonly properties: Readonly<Record<string, JsonSchema>>
  }
}

export interface ToolDocument {
  readonly version?: string
  readonly $comment?: string
  readonly digest_format?: JsonSchema
  readonly tools: readonly ToolSchema[]
  readonly refusal_result?: JsonSchema
}

export const DigestPattern = "^sha256:[0-9a-f]+$"

export const isDigestSchema = (schema: JsonSchema): boolean =>
  schema.type === "string" && schema.pattern === DigestPattern

export const bareDigestFieldName = (field: string): string =>
  field.endsWith("_digest") ? field.slice(0, -"_digest".length) : field

const fixedDigestType = (field: string): string => {
  if (field === "digest") return "digest"
  const bare = bareDigestFieldName(field)
  const separator = bare.lastIndexOf("_")
  return separator === -1 ? bare : bare.slice(separator + 1)
}

const nestedDigestSchema = (
  field: string,
  schema: JsonSchema,
  properties: Readonly<Record<string, JsonSchema>>,
): JsonSchema => {
  const kindValues = field === "digest" ? properties.kind?.enum : undefined
  const types = kindValues ?? [fixedDigestType(field)]

  return {
    type: "object",
    additionalProperties: false,
    required: ["type", "value"],
    properties: {
      type: { type: "string", enum: types },
      value: schema,
    },
  }
}

const projectInputSchema = (
  input: ToolSchema["input_schema"],
  variant: Exclude<Variant, "compound">,
): ToolSchema["input_schema"] => {
  const properties = Object.fromEntries(
    Object.entries(input.properties).map(([field, schema]) => {
      if (!isDigestSchema(schema)) return [field, schema]
      const name = bareDigestFieldName(field)
      return [
        name,
        variant === "nested"
          ? nestedDigestSchema(field, schema, input.properties)
          : schema,
      ]
    }),
  )

  return {
    ...input,
    required: input.required.map((field) =>
      isDigestSchema(input.properties[field] ?? {})
        ? bareDigestFieldName(field)
        : field
    ),
    properties,
  }
}

export const projectToolDocument = (
  base: ToolDocument,
  variant: Variant,
): ToolDocument => {
  if (variant === "compound") return base

  return {
    ...base,
    tools: base.tools.map((tool) => ({
      ...tool,
      input_schema: projectInputSchema(tool.input_schema, variant),
    })),
  }
}

export const projectArguments = (
  tool: ToolSchema,
  arguments_: Readonly<Record<string, unknown>>,
  variant: Variant,
): Readonly<Record<string, unknown>> => {
  if (variant === "compound") return arguments_

  return Object.fromEntries(
    Object.entries(arguments_).map(([field, value]) => {
      const schema = tool.input_schema.properties[field]
      if (schema === undefined || !isDigestSchema(schema)) {
        return [field, value]
      }

      const name = bareDigestFieldName(field)
      if (variant === "bare") return [name, value]

      const dynamicType = field === "digest" ? arguments_.kind : undefined
      return [
        name,
        {
          type: typeof dynamicType === "string"
            ? dynamicType
            : fixedDigestType(field),
          value,
        },
      ]
    }),
  )
}
