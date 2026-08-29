/**
 * The module dependency DAG — stock resolution, never hand-rolled.
 *
 * JavaScript module resolution is deterministic, so the project graph
 * is GIVEN, not computed: nodes are files, edges are resolved imports.
 * Resolution is the pinned `typescript@5.9.2` compiler's own
 * `resolveModuleName` (the operator ruling: use stock resolvers — the
 * physics does the easy part). Bare specifiers that resolve outside the
 * project (or not at all, e.g. uninstalled corpus dependencies) are
 * EXTERNAL edges, recorded but not walked.
 *
 * Topological order is simultaneously the census's iteration order and
 * the page order of the printed summary: roots by fan-in are the entry
 * candidates and print first. Cycles (legal in JS) are appended after
 * the acyclic prefix and flagged, never silently dropped.
 */
import ts from "typescript";

export type GraphNode = {
  readonly path: string;
  /** Project-internal dependencies, as node paths. */
  readonly localDeps: readonly string[];
  /** Specifiers that leave the project (packages, unresolved). */
  readonly externalDeps: readonly string[];
  readonly fanIn: number;
};

export type ModuleGraph = {
  readonly nodes: ReadonlyMap<string, GraphNode>;
  /** Importers-first topological order; cycle members appended, flagged. */
  readonly order: readonly string[];
  readonly cycles: readonly string[];
  /** fan-in 0 — the entry-point candidates. */
  readonly roots: readonly string[];
};

const OPTS: ts.CompilerOptions = {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
};

const norm = (p: string): string => p.replace(/\\/g, "/");

/** Build the graph for a set of project files and their import
 * specifiers (the readings already carry these). `extraOptions` lets a
 * project's own tsconfig feed the stock resolver — monorepo path
 * aliases resolve exactly as the project's toolchain resolves them. */
export function buildGraph(
  files: readonly { path: string; imports: readonly string[] }[],
  extraOptions: ts.CompilerOptions = {},
): ModuleGraph {
  const opts = { ...OPTS, ...extraOptions };
  const inProject = new Set(files.map((f) => norm(f.path)));
  const fanIn = new Map<string, number>();
  const local = new Map<string, string[]>();
  const external = new Map<string, string[]>();
  for (const f of files) { fanIn.set(norm(f.path), 0); }

  for (const f of files) {
    const path = norm(f.path);
    const loc: string[] = [];
    const ext: string[] = [];
    for (const spec of f.imports) {
      const r = ts.resolveModuleName(spec, path, opts, ts.sys).resolvedModule;
      const resolved = r ? norm(r.resolvedFileName) : null;
      if (resolved !== null && inProject.has(resolved)) {
        loc.push(resolved);
        fanIn.set(resolved, (fanIn.get(resolved) ?? 0) + 1);
      } else ext.push(spec);
    }
    local.set(path, loc.sort());
    external.set(path, ext.sort());
  }

  // Kahn, importers first: a node is ready when every file that imports
  // it has printed — so roots (fan-in 0) lead. Deterministic: sorted
  // ready set.
  const remainingIn = new Map(fanIn);
  const ready = [...remainingIn.entries()]
    .filter(([, n]) => n === 0).map(([p]) => p).sort();
  const order: string[] = [];
  const seen = new Set<string>();
  while (ready.length > 0) {
    const p = ready.shift()!;
    if (seen.has(p)) continue;
    seen.add(p);
    order.push(p);
    for (const d of local.get(p) ?? []) {
      remainingIn.set(d, (remainingIn.get(d) ?? 1) - 1);
      if (remainingIn.get(d) === 0) {
        ready.push(d);
        ready.sort();
      }
    }
  }
  const cycles = [...inProject].filter((p) => !seen.has(p)).sort();

  const nodes = new Map<string, GraphNode>();
  for (const f of files) {
    const path = norm(f.path);
    nodes.set(path, {
      path,
      localDeps: local.get(path) ?? [],
      externalDeps: external.get(path) ?? [],
      fanIn: fanIn.get(path) ?? 0,
    });
  }
  return {
    nodes,
    order: [...order, ...cycles],
    cycles,
    roots: [...fanIn.entries()].filter(([, n]) => n === 0).map(([p]) => p).sort(),
  };
}
