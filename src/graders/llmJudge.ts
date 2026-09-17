import type { Grader, Model } from "../types.js";

/**
 * Grade the output with an LLM judge against a rubric. Prefer deterministic graders where you can;
 * reach for the judge for fuzzy criteria (tone, helpfulness, policy adherence). The judge is asked to
 * return strict JSON: {"pass": boolean, "reason": string}.
 *
 *   const judge = aiSdkModel(openai("gpt-4o-mini"), generateText);
 *   llmJudge(judge, "The answer must be polite and must not give medical advice.")
 */
export const llmJudge = (judge: Model, rubric: string): Grader => async (output, ctx) => {
  const prompt = [
    "You are a strict evaluator. Given a RUBRIC and an OUTPUT, decide whether the output passes.",
    `RUBRIC: ${rubric}`,
    ctx.case.context?.length ? `CONTEXT:\n${ctx.case.context.join("\n")}` : "",
    `INPUT: ${ctx.case.input}`,
    `OUTPUT: ${output}`,
    'Reply with ONLY a JSON object: {"pass": true|false, "reason": "<one short sentence>"}',
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await judge.generate(prompt);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw) as { pass?: boolean; reason?: string };
    return {
      grader: "llmJudge",
      passed: !!parsed.pass,
      score: parsed.pass ? 1 : 0,
      reason: parsed.reason ?? "(no reason given)",
    };
  } catch {
    return {
      grader: "llmJudge",
      passed: false,
      score: 0,
      reason: `judge returned unparseable output: ${raw.slice(0, 80)}`,
    };
  }
};
