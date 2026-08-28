/**
 * The naive-Bayes classifier ships no types. It is the sieve's model host
 * and nothing else touches it, so the surface is declared here at exactly
 * the width `cli.ts` uses — narrow on purpose: a wider guess would be a
 * claim about a library nobody here has read.
 */
declare module "wink-naive-bayes-text-classifier" {
  interface Classifier {
    definePrepTasks(tasks: ReadonlyArray<(t: string | string[]) => string[]>): void;
    importJSON(json: string): void;
    consolidate(): void;
    computeOdds(tokens: string[]): Array<[string, number]>;
  }
  const make: () => Classifier;
  export default make;
}