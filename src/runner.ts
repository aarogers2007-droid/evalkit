import type { CaseResult, EvalCase, GraderResult, Model, RunResult } from "./types.js";
import { scoreRun } from "./scorecard.js";

/** Run every case against the model (bounded concurrency) and aggregate a scorecard. */
export async function runEval(
  cases: EvalCase[],
  model: Model,
  opts: { concurrency?: number } = {},
): Promise<RunResult> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const results: CaseResult[] = new Array(cases.length);
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= cases.length) return;
      results[i] = await runCase(cases[i], model);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));
  return { scorecard: scoreRun(results, model.name ?? "model"), cases: results };
}

async function runCase(c: EvalCase, model: Model): Promise<CaseResult> {
  let output = "";
  let error: string | null = null;
  try {
    output = await model.generate(c.input, { system: c.system });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const graderResults: GraderResult[] = error
    ? [{ grader: "model", passed: false, score: 0, reason: `model error: ${error}` }]
    : await Promise.all(c.graders.map((g) => g(output, { case: c })));

  const passed = graderResults.length > 0 && graderResults.every((r) => r.passed);
  return {
    name: c.name,
    category: c.category ?? "general",
    critical: !!c.critical,
    output,
    graderResults,
    passed,
  };
}
