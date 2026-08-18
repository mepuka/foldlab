import type { KernelDeclKind } from "../src/kernel/KernelTables.generated.js"

/** The anchored sibling proves enforcement does not reject every exported type. */
export interface GeneratedCoreControl {
  readonly kind: KernelDeclKind
}

/** Planted ticketed debt: this declaration does not derive from the generated core. */
export interface FabricEraControl {
  readonly value: string
}
