import type { Grader } from "../types.js";

const STOP = new Set(
  "a an the is are was were be been being of to in on for and or but with as at by from this that these those it its you your our we they i".split(
    " ",
  ),
);

// Common discourse/framing words a grounded answer legitimately adds ("according to the passage…").
// They are NOT claims, so they must not count as hallucination.
const DISCOURSE = new Set(
  ("according passage text based provided using answer question explain explains mentions states says tells " +
    "describes information essentially basically generally specifically therefore however overall summary " +
    "something sometimes different important actually usually example examples everything anything").split(
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

/** A token that would be a *specific new claim* if it isn't in the source: a number, or a content-ish word. */
function isSalient(tok: string): boolean {
  if (DISCOURSE.has(tok)) return false;
  if (/\d/.test(tok)) return true; // numbers/dates — the classic fabricated specific
  return tok.length >= 8; // long tokens are specific content ("warranty", "discovered"), not common filler
}

/**
 * Cheap, dependency-free RAG groundedness check. A faithful answer reuses the source's content words
 * (plus short glue and framing); a hallucination smuggles in *new specifics* — names, numbers, or other
 * content terms absent from the context. So we flag "salient novel tokens" (a number, or a content-ish
 * word ≥6 chars) that don't appear in `case.context`. Any novel number, or two or more novel content
 * words, fails. This ignores conversational paraphrase ("according to the passage…") that the older
 * per-sentence overlap check wrongly punished. For nuanced grounding, layer an `llmJudge` on top.
 */
export const grounded = (opts: { maxNovel?: number } = {}): Grader => (output, ctx) => {
  const context = (ctx.case.context ?? []).join(" ");
  if (!context.trim()) {
    return { grader: "grounded", passed: false, score: 0, reason: "no context provided to check against" };
  }
  const ctxTokens = new Set(tokenize(context));
  const salient = tokenize(output).filter(isSalient);
  if (salient.length === 0) {
    return { grader: "grounded", passed: true, score: 1, reason: "no specific claims to verify" };
  }

  const novel = salient.filter((t) => !ctxTokens.has(t));
  const novelNumbers = novel.filter((t) => /\d/.test(t));
  const maxNovel = opts.maxNovel ?? 1; // tolerate one stray content word; two-plus (or any number) = fabrication
  const passed = novelNumbers.length === 0 && novel.length <= maxNovel;
  const score = salient.length ? 1 - novel.length / salient.length : 1;

  return {
    grader: "grounded",
    passed,
    score,
    reason: passed
      ? "every specific claim is supported by the context"
      : `unsupported by context: ${[...new Set(novel)].join(", ")}`,
  };
};
