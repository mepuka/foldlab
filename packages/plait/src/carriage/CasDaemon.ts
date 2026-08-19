/**
 * Plane: carriage — hosts and transport clients.
 *
 * The daemon service SHAPE moved to `kernel/CasDaemon.ts` (ruled at the
 * 2026-08-19 sitting, F1: a service is a requirement, named where it is
 * consumed). This path survives as the carriage-plane face of that shape,
 * because hosts and the wiring slice reach the daemon through carriage: when
 * the wiring lands, the Layer that implements the kernel-declared shape lands
 * HERE, beside this re-export, and the import direction stays lawful —
 * carriage reads down into kernel, never the reverse.
 *
 * @module
 */
export * from "../kernel/CasDaemon.js"
