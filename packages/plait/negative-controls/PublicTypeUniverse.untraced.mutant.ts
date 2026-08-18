import type { KernelDeclKind } from "../src/kernel/KernelTables.generated.js"

/** The anchored sibling proves enforcement does not reject every exported type. */
export interface CorpusDerivedControl {
  readonly kind: KernelDeclKind
}

/** Planted fabric-era type: no declaration ancestry reaches the kernel corpus. */
export interface FabricEraControl {
  readonly value: string
}
