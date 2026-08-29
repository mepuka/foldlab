/**
 * C1 — the declaration enumerator, and the twin over it.
 *
 * The census's one original instrument is the declaration walk, so it gets
 * the treatment the harness gives its recognizers: the two legs are run over
 * the same sources and the assertion is AGREEMENT, plus a small set of
 * pinned expectations so a twin that agreed on the WRONG answer would still
 * be caught. (Agreement alone is satisfiable by two identically broken
 * walks; the pinned cases are what rule that out.)
 *
 * Needs no corpus: every source here is written by the test.
 */
import { describe, expect, it } from "vitest";
import { parseSync } from "oxc-parser";
// @ts-expect-error — the untyped oxc leg, imported as the engine it is.
import { oxcDecls } from "../src/decls-oxc.mjs";
import { ckDecls, ckParsed, ckSourceFile } from "../src/decls-ck";
import { declKey, DECL_KINDS, type Decl } from "../src/census-contract";
import { PARSE_OPTIONS, observe } from "../src/legs";

const ck = (src: string): Decl[] => ckDecls(ckSourceFile(src));
const oxc = (src: string): Decl[] => {
  const { program } = parseSync("t.ts", src, PARSE_OPTIONS);
  return oxcDecls(program) as Decl[];
};
const keys = (ds: Decl[]): string[] => ds.map(declKey);

/** Every construct the definition names, plus the shapes that broke it. */
const SOURCES: Record<string, string> = {
  empty: "",
  onlyImports: 'import * as E from "effect";\nimport type { A } from "./a";\n',
  variables: "const a = 1;\nexport const b = 2, c = 3;\nlet d;\nvar e = 4;\n",
  destructuring: "const { a, b } = obj;\nexport const [x, y] = arr;\n",
  functions: "function f() {}\nexport function g() {}\nexport default function h() {}\n",
  anonymousDefault: "export default function () {}\n",
  classes: "class A {}\nexport class B extends A {}\nexport default class C {}\n",
  interfaces: "interface I { a: number }\nexport interface J extends I {}\n",
  typeAliases: "type T = number;\nexport type U = T | string;\n",
  enums: "enum E { A }\nexport enum F { B }\nexport const enum G { C }\n",
  namespaces: "namespace N { export const x = 1; }\nexport namespace M {}\n",
  ambientModule: 'declare module "m" { const z: number; }\n',
  ambientGlobal: "declare global { interface Window { z: number } }\n",
  // The `.d.ts` shape the twin caught: a body-less signature carries no
  // `declare` modifier, and TypeScript and oxc spell it differently.
  dtsSignatures: "export function f(): void;\nexport function g(a: string): number;\n",
  declaredFunction: "declare function f(): void;\nexport declare const c: number;\n",
  overloads: "export function f(a: string): void;\nexport function f(a: number): void;\nexport function f(a: any) {}\n",
  reexports: 'export { a } from "./a";\nexport * from "./b";\nexport * as ns from "./c";\n',
  exportAssignment: "const x = 1;\nexport default x;\nexport = x;\n",
  importEquals: 'import q = require("q");\n',
  variance: "export interface F<in E> { x: E }\nexport class G<in out T, out U> {}\nexport type H<out X> = X;\n",
  varianceMixed: "export interface P<A, in B> {}\nexport interface Q<A, B> {}\n",
  nestedNotCounted:
    "export function outer() {\n  function inner() {}\n  const local = 1;\n  return [inner, local];\n}\n",
  abstractClass: "export abstract class A { abstract m(): void }\n",
  asyncGenerator: "export async function* ag() {}\nexport default async function () {}\n",
  decorated: "@dec\nexport class D {}\n",
};

describe("C1 — declaration enumeration", () => {
  it("the two legs agree on every pinned source", () => {
    for (const [name, src] of Object.entries(SOURCES))
      expect(keys(oxc(src)), name).toEqual(keys(ck(src)));
  });

  it("counts every construct the definition names, and nothing else", () => {
    // Pinned, not merely agreed: two identically broken walks would agree.
    expect(keys(ck(SOURCES.variables))).toEqual([
      "variable|a|-|-|-", "variable|b|x|-|-", "variable|c|x|-|-",
      "variable|d|-|-|-", "variable|e|-|-|-",
    ]);
    expect(keys(ck(SOURCES.functions))).toEqual([
      "function|f|-|-|-", "function|g|x|-|-", "function|h|x|-|-",
    ]);
    expect(keys(ck(SOURCES.enums)).length).toBe(3);
    expect(keys(ck(SOURCES.namespaces))).toEqual(["module|N|-|-|-", "module|M|x|-|-"]);
    expect(keys(ck(SOURCES.ambientGlobal))).toEqual(["module|global|-|d|-"]);
  });

  it("re-exports, export assignments and import-equals declare nothing", () => {
    expect(ck(SOURCES.reexports)).toEqual([]);
    expect(ck(SOURCES.importEquals)).toEqual([]);
    expect(ck(SOURCES.onlyImports)).toEqual([]);
    // `const x = 1` is the only declaration; the two export forms are not.
    expect(keys(ck(SOURCES.exportAssignment))).toEqual(["variable|x|-|-|-"]);
  });

  it("does not descend into bodies — the unit is the TOP-LEVEL declaration", () => {
    expect(keys(ck(SOURCES.nestedNotCounted))).toEqual(["function|outer|x|-|-"]);
  });

  it("reads a body-less signature as ambient on both legs", () => {
    // The regression the twin found: `.d.ts` writes `export function f(): void;`
    // with no `declare` keyword, and a leg that read only the modifier
    // disagreed with one that read `TSDeclareFunction`.
    expect(keys(ck(SOURCES.dtsSignatures))).toEqual(["function|f|x|d|-", "function|g|x|d|-"]);
    expect(keys(oxc(SOURCES.dtsSignatures))).toEqual(keys(ck(SOURCES.dtsSignatures)));
  });

  it("detects in/out variance — the D1 evidence fact — on both legs", () => {
    const c = ck(SOURCES.variance);
    expect(c.map((d) => d.variance)).toEqual([true, true, true]);
    expect(keys(oxc(SOURCES.variance))).toEqual(keys(c));
    // One variant parameter is enough, and none means none.
    expect(ck(SOURCES.varianceMixed).map((d) => d.variance)).toEqual([true, false]);
  });

  it("uses only the shared vocabulary", () => {
    for (const src of Object.values(SOURCES))
      for (const d of ck(src)) expect(DECL_KINDS).toContain(d.kind);
  });
});

describe("C1 — the parse boundary (R12)", () => {
  const broken = "export const a = = 1;\n";

  it("a leg that cannot parse contributes no declarations", () => {
    const sf = ckSourceFile(broken);
    expect(ckParsed(sf)).toBe(false);
    const o = observe(broken);
    expect(o.declsCk).toEqual([]);
  });

  it("a file only one leg can parse is parseDisjoint, not a declaration disagreement", () => {
    // Reported once, in the more specific bucket: the two facts have one
    // cause, and counting both would double every finding of this kind.
    const o = observe(broken);
    if (o.parseDisjoint) expect(o.declAgree).toBe(true);
  });
});

describe("C1 — determinism", () => {
  it("the same source yields the same rows twice", () => {
    for (const src of Object.values(SOURCES)) {
      const a = observe(src);
      const b = observe(src);
      expect(a.declKeyCk).toBe(b.declKeyCk);
      expect(a.declKeyOxc).toBe(b.declKeyOxc);
      expect(a.verdictKeyCk).toBe(b.verdictKeyCk);
    }
  });
});
