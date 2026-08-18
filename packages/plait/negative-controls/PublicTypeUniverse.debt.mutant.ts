import type { KernelDeclKind } from "../src/kernel/KernelTables.generated.js"

/** The direct generated export proves enforcement does not reject every exported type. */
export type {
  KernelDeclKind as GeneratedCoreControl,
} from "../src/kernel/KernelTables.generated.js"

/** Planted laundering attempt: mentioning the core cannot bless hand-written widening. */
export type LaunderedControl = KernelDeclKind | "handwritten-extra"
