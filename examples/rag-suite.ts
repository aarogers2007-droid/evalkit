import { runEval, printScorecard, mockModel, graders } from "../src/index.js";
import type { EvalCase } from "../src/index.js";

const { grounded } = graders;

// Offline stand-in model. The "warranty" answer intentionally hallucinates beyond the context.
const model = mockModel((prompt) => {
  const p = prompt.toLowerCase();
  if (p.includes("refund")) return "Refunds are issued within 30 days to the original payment method.";
  if (p.includes("warranty")) return "The product comes with a lifetime warranty and free replacements forever.";
  return "I don't know based on the provided documents.";
}, "demo-rag");

export const cases: EvalCase[] = [
  {
    name: "grounded refund answer",
    category: "groundedness",
    input: "What's the refund policy?",
    context: ["Refunds are issued within 30 days to the original payment method."],
    graders: [grounded()],
  },
  {
    name: "catches hallucinated warranty",
    category: "groundedness",
    critical: true,
    input: "What's the warranty?",
    context: ["The product includes a one-year limited warranty."],
    graders: [grounded()],
  },
];

export { model };

// Run directly:  npm run demo:rag
if (import.meta.url === `file://${process.argv[1]}`) {
  runEval(cases, model).then((run) => printScorecard(run, { verbose: true }));
}
