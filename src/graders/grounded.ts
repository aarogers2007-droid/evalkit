import type { Grader } from "../types.js";

const STOP = new Set(
  "a an the is are was were be been being of to in on for and or but with as at by from this that these those it its you your our we they i".split(
    " ",
  ),
);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

/**
 * Cheap, dependency-free RAG groundedness check: every substantive sentence in the output should share
 * enough token overlap with the provided `case.context` to be plausibly supported by it. Catches blatant
 * hallucination with zero API calls. For nuanced grounding, layer an `llmJudge` on top.
 */
export const grounded = (opts: { minOverlap?: number } = {}): Grader => (output, ctx) => {
  const context = (ctx.case.context ?? []).join(" ");
  if (!context.trim()) {
    return { grader: "grounded", passed: false, score: 0, reason: "no context provided to check against" };
  }
  const ctxTokens = new Set(tokenize(context));
  const sentences = output.split(/(?<=[.!?])\s+/).filter((s) => tokenize(s).length >= 4);
  if (sentences.length === 0) {
    return { grader: "grounded", passed: true, score: 1, reason: "no substantive claims to verify" };
  }
  const min = opts.minOverlap ?? 0.5;
  const unsupported: string[] = [];
  let supported = 0;
  for (const s of sentences) {
    const toks = tokenize(s);
    const overlap = toks.filter((t) => ctxTokens.has(t)).length / toks.length;
    if (overlap >= min) supported++;
    else unsupported.push(s.trim().slice(0, 60));
  }
  const score = supported / sentences.length;
  const passed = unsupported.length === 0;
  return {
    grader: "grounded",
    passed,
    score,
    reason: passed ? "all claims supported by context" : `unsupported: ${unsupported.join(" | ")}`,
  };
};
