/**
 * The sieve — non-parsing triage (grill ruling: DEMOTED from span-finder
 * to scheduler/annotator; spans belong to parsers). Transliterates code
 * into a compressed alphabet where effect-ness survives only via import
 * RESOLUTION (the `§` anchor — no import, no fire, zero-effect files
 * silent BY CONSTRUCTION), then scores char n-grams. Model:
 * ../models/sieve-r1.json (provenance in its config block).
 */
// The transliteration rung — code → compressed symbol stream (operator
// ruling 2026-08-28). Effect-ness survives via import RESOLUTION (never
// spelling); member names after a dot keep verbatim text on any
// receiver; everything else collapses. Brackets stay literal chars —
// they ARE the linearization. Whitespace drops out of the stream.

import { EFFECT_MODULE } from "./contract";

const IMPORT_RE =
  /import\s+(?:type\s+)?(?:\*\s+as\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*,?\s*)?(?:{([^}]*)})?\s*from\s*["']([^"']+)["']/g;

/** Local names bound to effect modules in this file, by import scan. */
export function effectBindings(src: string): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(IMPORT_RE)) {
    if (!EFFECT_MODULE.test(m[4])) continue;
    if (m[1]) out.add(m[1]); // import * as X
    if (m[2]) out.add(m[2]); // default import
    if (m[3])
      for (const piece of m[3].split(",")) {
        const p = piece.trim();
        if (!p) continue;
        const as = p.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
        if (as) out.add(as[2] ?? as[1]);
      }
  }
  return out;
}

const TOKEN_RE =
  /\/\/.*$|\/\*[\s\S]*?(?:\*\/|$)|`(?:[^`\\]|\\.)*`?|"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|[A-Za-z_$][\w$]*|\d[\w.]*|=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\?\.|\*\*|\+\+|--|[-+*/%=<>!&|^~?:;,.(){}[\]@#\\]|\S/gm;

const KW: Record<string, string> = {
  const: "v", let: "v", var: "v", function: "f", yield: "y", return: "r",
  class: "k", interface: "k", namespace: "k", type: "k", enum: "k",
  extends: "z", implements: "z", new: "w", import: "m", from: "m",
  export: "p", declare: "p", async: "a", await: "a",
  if: "h", else: "h", for: "h", while: "h", switch: "h", case: "h", do: "h",
  try: "h", catch: "h", finally: "h", throw: "h",
  true: "n", false: "n", null: "n", undefined: "n", this: "x",
  readonly: "", static: "", public: "", private: "", protected: "", abstract: "",
};

/** One line → its symbol string. `bindings` from effectBindings(file). */
export function translitLine(line: string, bindings: Set<string>): string {
  let out = "";
  let prev = "";
  for (const m of line.matchAll(TOKEN_RE)) {
    const t = m[0];
    const c = t[0];
    let sym: string;
    if (t.startsWith("//") || t.startsWith("/*")) sym = "c";
    else if (c === '"' || c === "'") sym = "s";
    else if (c === "`") sym = "t";
    else if (/[0-9]/.test(c)) sym = "n";
    else if (/[A-Za-z_$]/.test(c)) {
      if (t in KW) sym = KW[t];
      else if (bindings.has(t)) sym = "§"; // effect signifier: never occurs in identifiers
      else if (prev === ".") sym = t; // member name: verbatim, any receiver
      else sym = /[A-Z]/.test(c) ? "X" : "x";
    } else sym = t; // punctuation, brackets, multi-char ops: literal
    out += sym;
    prev = t;
  }
  return out;
}

/** Char n-grams over the padded symbol string, plus the bracket-position
features (depth at line start, indent bucket) as their own tokens. */
export function grams(sym: string, depth: number, indent: number, n = 4): string[] {
  const out: string[] = [`d${Math.min(depth, 9)}`, `i${Math.min(indent >> 2, 9)}`];
  const s = "^" + sym + "$";
  if (s.length <= n) { out.push(s); return out; }
  for (let i = 0; i + n <= s.length; i++) out.push(s.slice(i, i + n));
  return out;
}

/** Bracket depth delta of a symbol string (strings/comments already collapsed). */
export function depthDelta(sym: string): number {
  let d = 0;
  for (const ch of sym) {
    if (ch === "(" || ch === "[" || ch === "{") d++;
    else if (ch === ")" || ch === "]" || ch === "}") d--;
  }
  return d;
}

/** Mask multi-line constructs so per-line lexing is safe: block-comment,
string, and template INTERIORS become spaces (length and newlines
preserved); delimiters stay so strings/templates still read as s/t. */
export function maskSource(src: string): string {
  let out = "";
  type St = "code" | "line" | "block" | "s1" | "s2" | "tpl";
  let st: St = "code";
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1];
    if (st === "code") {
      if (c === "/" && d === "/") { st = "line"; out += "//"; i++; }
      else if (c === "/" && d === "*") { st = "block"; out += "/*"; i++; }
      else if (c === "'") { st = "s1"; out += c; }
      else if (c === '"') { st = "s2"; out += c; }
      else if (c === "`") { st = "tpl"; out += c; }
      else out += c;
    } else if (st === "line") {
      if (c === "\n") { st = "code"; out += c; } else out += " ";
    } else if (st === "block") {
      if (c === "*" && d === "/") { st = "code"; out += "*/"; i++; }
      else out += c === "\n" ? c : " ";
    } else if (st === "s1" || st === "s2") {
      const q = st === "s1" ? "'" : '"';
      if (c === "\\") { out += "  "; i++; }
      else if (c === q) { st = "code"; out += c; }
      else if (c === "\n") { st = "code"; out += c; } // unterminated: bail
      else out += " ";
    } else { // tpl
      if (c === "\\") { out += "  "; i++; }
      else if (c === "`") { st = "code"; out += c; }
      else out += c === "\n" ? c : " ";
    }
  }
  return out;
}

export type LineRec = { sym: string; depth: number; indent: number; line: string };

/** A file → per-line records with running bracket depth. */
export function translitFile(src: string): LineRec[] {
  const bindings = effectBindings(src);
  const out: LineRec[] = [];
  let depth = 0;
  const masked = maskSource(src).split("\n");
  const raw = src.split("\n");
  for (let li = 0; li < raw.length; li++) {
    const line = masked[li] ?? "";
    const sym = translitLine(line, bindings);
    const indent = line.length - line.trimStart().length;
    out.push({ sym, depth: Math.max(depth, 0), indent, line: raw[li] });
    depth += depthDelta(sym);
  }
  return out;
}
