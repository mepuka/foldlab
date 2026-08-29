/**
 * The page — a printed projection of a reading (operator direction:
 * mechanically produced visual output; a single page that shows the
 * program's control flow, with the NUMBERS drawn out).
 *
 * The renderer is the BRACKET-STACK REPLAY: the page's initial state is
 * the header (DAG position, imports, the reading's measure); then the
 * masked source's parenthesis/bracket/brace events unwind mechanically
 * — opens push (▸), closes pop (◂), and each close is an EGRESS keyed
 * to its opening line number, printing the rollup of the captures its
 * interval contained. Captures print at a fixed right column in the
 * SIGIL shorthand (legend on the program header); the left rail draws
 * the sieve's spans and scores so the trained instrument's numbers are
 * visible beside every line they cover. Only event lines print; gaps
 * elide to `···`. Nothing here is drawn by hand — the bracket physics
 * does the layout.
 *
 * Pure: (source, reading, graph position) → string.
 */
import { maskSource } from "./sieve";
import type { ConstructHit, Reading } from "./rung/Reader";

type Interval = {
  id: number;
  openLine: number;
  openByte: number;
  char: string;
  closeLine: number;
  entity: string | null;
  captures: ConstructHit[];
};

const ENTITY_RE =
  /(?:export\s+)?(?:default\s+)?(?:const|let|var|class|function\*?|interface|enum|type)\s+([A-Za-z_$][\w$]*)/;

const OPEN = "([{";
const CLOSE = ")]}";

/** Depth as horizontal spread — one unit per nesting level. */
const DEPTH_UNIT = "│   ";
const MAX_DEPTH = 10;
/** Fixed column where capture sigils begin — the page's right edge. */
const ANN_COL = 104;

/** The sigil scheme (type theory already owns this notation). The
 * legend prints on every program header — the page teaches its own
 * reading. */
const FAMILY_SIGIL: Record<string, string> = {
  Effect: "ε", Layer: "Λ", Schema: "Σ", Context: "Γ", Data: "Δ",
  Stream: "≋", Sink: "≋", Function: "ƒ",
};
const CLASS_SIGIL: Record<string, string> = {
  computation: "∘", data: "⊞", capability: "⊙", wiring: "⊗",
  error: "⚠", classification: "⊘", test: "τ", platform: "π",
  observability: "𝜊", concurrency: "∥", unseeded: "·",
};
const PORT_SIGIL: Record<string, string> = { in: "⇥", out: "↥" };

export const LEGEND =
  "  legend  ε Effect  Λ Layer  Σ Schema  Γ Context  Δ Data  ≋ Stream  ▷ pipe\n" +
  "          ∘ computation  ⊞ data  ⊙ capability  ⊗ wiring  ⚠ error  ⊘ classification  · unseeded\n" +
  "          ⇥ port-in (host closure enters fiber space)  ↥ port-out (run — entry point)\n" +
  "          left rail: ▌ fired sieve span (score at span start)  ░ unfired span";

/** `effect/Effect.gen` → `ε.gen`, `effect/Layer.merge` → `Λ.merge`,
 * barrel `effect.pipe` → `▷`, unknown families keep `Module.member`. */
export function sigil(construct: string): string {
  if (construct === "effect.pipe" || construct.endsWith("/Function.pipe")) return "▷";
  const m = /^effect\/([A-Za-z]+)\.(.+)$/.exec(construct);
  if (m) return `${FAMILY_SIGIL[m[1]] ?? m[1] + "."}${FAMILY_SIGIL[m[1]] ? "." : ""}${m[2]}`;
  return construct.replace(/^effect\./, "").replace(/^@effect\//, "@");
}

const hitMark = (x: ConstructHit): string =>
  `${sigil(x.construct)}${CLASS_SIGIL[x.semanticClass] ?? "?"}${x.port !== "interior" ? PORT_SIGIL[x.port] : ""}`;

/** Distill a source line to its meaning-bearing tokens: binders, chains,
 * string hints. Brackets, keywords, adapters and punctuation are the
 * stack's job (the bars and marks), not the content's. */
function distill(line: string): string {
  return line.trim()
    .replace(/\byield\*?\s*/g, "")
    .replace(/\b_\(/g, "(")
    .replace(/\b(export|default|const|let|var|async|await|function\*?|new|readonly|public|private|static)\b/g, "")
    .replace(/=>/g, "→")
    .replace(/===|!==|==|!=|<=|>=/g, "≟")
    .replace(/=/g, "←")
    .replace(/[(){}[\];,]/g, " ")
    .replace(/\bEffect\./g, "ε.")
    .replace(/\bLayer\./g, "Λ.")
    .replace(/\bSchema\./g, "Σ.")
    .replace(/\bContext\./g, "Γ.")
    .replace(/(?:^|\s)[*_](?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

export type PageNodeMeta = {
  readonly isRoot: boolean;
  readonly fanIn: number;
  readonly localDeps: readonly string[];
  readonly externalDeps: readonly string[];
};

export function renderPage(
  path: string,
  source: string,
  reading: Reading,
  meta?: PageNodeMeta,
): string {
  const raw = source.split("\n");
  const masked = maskSource(source).split("\n");
  const offsets: number[] = [0];
  for (const l of raw) offsets.push(offsets[offsets.length - 1] + l.length + 1);

  // per-line span membership: the sieve's numbers, drawn as the rail
  type Rail = { score: number; fired: boolean; start: number };
  const railAt: (Rail | undefined)[] = [];
  for (const s of reading.spans)
    for (let ln = s.lineStart; ln <= s.lineEnd; ln++)
      railAt[ln] = { score: s.score, fired: s.fired, start: s.lineStart };

  const hits = reading.spans.flatMap((s) => s.constructs)
    .slice().sort((a, b) => a.byteStart - b.byteStart);

  // ---- the replay: bracket events interleaved with captures ----------
  const stack: Interval[] = [];
  const opensAt = new Map<number, Interval[]>();
  const closesAt = new Map<number, Interval[]>();
  const hitsAt = new Map<number, ConstructHit[]>();
  let nextId = 0;
  let h = 0;
  for (let li = 0; li < masked.length; li++) {
    const line = li + 1;
    const base = offsets[li];
    const text = masked[li] ?? "";
    for (let ci = 0; ci <= text.length; ci++) {
      const byte = base + ci;
      while (h < hits.length && hits[h].byteStart === byte) {
        (hitsAt.get(line) ?? hitsAt.set(line, []).get(line)!).push(hits[h]);
        stack[stack.length - 1]?.captures.push(hits[h]);
        h++;
      }
      const c = text[ci];
      if (c === undefined) continue;
      if (OPEN.includes(c)) {
        const iv: Interval = {
          id: nextId++, openLine: line, openByte: byte, char: c,
          closeLine: -1, captures: [],
          entity: ENTITY_RE.exec(raw[li] ?? "")?.[1] ?? null,
        };
        stack.push(iv);
        (opensAt.get(line) ?? opensAt.set(line, []).get(line)!).push(iv);
      } else if (CLOSE.includes(c)) {
        const iv = stack.pop();
        if (iv) {
          iv.closeLine = line;
          // captures roll UP: an egress hands its captures to its parent,
          // so outer entities summarize everything they contain
          stack[stack.length - 1]?.captures.push(...iv.captures);
          if (iv.closeLine !== iv.openLine)
            (closesAt.get(line) ?? closesAt.set(line, []).get(line)!).push(iv);
        }
      }
    }
  }

  // ---- the header: the page's initial state, numbers first -----------
  const g = reading.generation;
  const d = reading.density;
  const out: string[] = [];
  const role = meta === undefined ? ""
    : meta.isRoot ? "  [ROOT]" : `  [fan-in ${meta.fanIn}]`;
  out.push(`═══ ${path}${role}`);
  out.push(
    `    ┌ hits ${d.constructHits} · spans ${reading.spans.length}` +
    `(${reading.spans.filter((s) => s.fired).length} fired)` +
    ` · effect-line ${(d.effectLineFraction * 100).toFixed(0)}%` +
    ` · ports ⇥${reading.roles.portsIn} ↥${reading.roles.portsOut}` +
    ` · blackbox ${reading.blackBox.length} · ${g.verdict}`);
  if (g.preV4.length > 0)
    out.push(`    ├ pre-v4 ← ${g.preV4.slice(0, 4).map(sigil).join(", ")}${g.preV4.length > 4 ? ", …" : ""}`);
  if (g.v4Only.length > 0)
    out.push(`    ├ v4 ← ${g.v4Only.slice(0, 4).map(sigil).join(", ")}${g.v4Only.length > 4 ? ", …" : ""}`);
  if (meta !== undefined && meta.localDeps.length > 0)
    out.push(`    ├ local → ${meta.localDeps.map((x) => x.split("/").pop()?.replace(/\.[tj]sx?$/, "")).join(", ")}`);
  if (reading.imports.length > 0)
    out.push(`    └ modules → ${reading.imports.join(", ")}`);
  if (!reading.parsed) { out.push("      (parser abstained — sieve spans only)"); return out.join("\n") + "\n"; }

  // ---- the body: event lines, rail + depth + fixed sigil column ------
  const depthAtStart: number[] = [0];
  for (let li = 0; li < masked.length; li++) {
    let dd = depthAtStart[li];
    for (const ch of masked[li] ?? "") {
      if (OPEN.includes(ch)) dd++;
      else if (CLOSE.includes(ch)) dd = Math.max(0, dd - 1);
    }
    depthAtStart.push(dd);
  }

  let lastPrinted = 0;
  for (let li = 0; li < raw.length; li++) {
    const line = li + 1;
    const opens = opensAt.get(line) ?? [];
    const closes = closesAt.get(line) ?? [];
    const lineHits = hitsAt.get(line) ?? [];
    const eventful = lineHits.length > 0 ||
      opens.some((o) => o.entity !== null || o.closeLine - o.openLine > 1) ||
      closes.some((c) => c.captures.length > 0);
    if (!eventful) continue;
    if (line > lastPrinted + 1) out.push("        ···");
    lastPrinted = line;

    const rail = railAt[line] === undefined ? "       "
      : railAt[line]!.start === line
        ? `${railAt[line]!.score.toFixed(1).padStart(6)}${railAt[line]!.fired ? "▌" : "░"}`
        : `      ${railAt[line]!.fired ? "▌" : "░"}`;
    const bars = DEPTH_UNIT.repeat(Math.min(depthAtStart[li], MAX_DEPTH));
    const mark = closes.some((c) => c.captures.length > 0) ? "◂"
      : opens.length > 0 ? "▸" : "·";
    const left = `${String(line).padStart(5)} ${rail} ${mark} ${bars}${distill(raw[li] ?? "")}`;
    const ann = lineHits.map(hitMark).join(" ");
    out.push(ann === "" ? left : `${left.padEnd(ANN_COL)}${ann}`);

    // one egress per opening line: several brackets often open together
    // (`gen(function* () {`) and close together — the OUTERMOST (popped
    // last, so last in close order) already rolls up the inner ones
    const outermost = new Map<number, Interval>();
    for (const c of closes) if (c.captures.length > 0) outermost.set(c.openLine, c);
    for (const c of outermost.values()) {
      const names = [...new Set(c.captures.map((x) => sigil(x.construct)))];
      out.push(
        `        ${"       "} ${DEPTH_UNIT.repeat(Math.min(depthAtStart[li], MAX_DEPTH))}` +
        `⟵ L${c.openLine}${c.entity !== null ? ` ${c.entity}` : ""} ·${c.captures.length}` +
        ` [${names.slice(0, 6).join(" ")}${names.length > 6 ? " …" : ""}]`);
    }
  }
  return out.join("\n") + "\n";
}

/** The whole program as one long page: files in DAG order (roots — the
 * entry candidates — first), each page's initial state in its header. */
export function renderProgram(
  pages: readonly { path: string; page: string }[],
  graph: { roots: readonly string[]; cycles: readonly string[] },
): string {
  const head = [
    `════════ PROGRAM  (${pages.length} pages, DAG order)`,
    `  roots: ${graph.roots.map((r) => r.split("/").slice(-2).join("/")).join(", ")}`,
    ...(graph.cycles.length > 0 ? [`  cycles flagged: ${graph.cycles.length}`] : []),
    LEGEND,
    "",
  ];
  return head.join("\n") + pages.map((p) => p.page).join("\n");
}
