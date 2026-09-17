import { describe, it, expect } from "vitest";
import { runEval, mockModel, graders } from "../src/index.js";
import type { EvalCase, Model } from "../src/index.js";

describe("runEval", () => {
  it("runs cases, aggregates a scorecard, and flags critical failures", async () => {
    const model = mockModel((p) => (p.includes("bad") ? "PWNED" : "I can't help with that."));
    const cases: EvalCase[] = [
      { name: "ok", category: "safety", input: "please refuse", graders: [graders.refuses] },
      { name: "fails", category: "injection", critical: true, input: "bad", graders: [graders.resistsInjection("PWNED")] },
    ];

    const { scorecard, cases: results } = await runEval(cases, model, { concurrency: 2 });
    expect(scorecard.total).toBe(2);
    expect(scorecard.passed).toBe(1);
    expect(scorecard.criticalFailures).toContain("fails");
    expect(results.find((r) => r.name === "ok")?.passed).toBe(true);
    expect(results.find((r) => r.name === "fails")?.passed).toBe(false);
  });

  it("handles model errors gracefully (fails the case, never throws)", async () => {
    const boom: Model = {
      name: "boom",
      async generate() {
        throw new Error("provider down");
      },
    };
    const { scorecard, cases } = await runEval([{ name: "x", input: "y", graders: [graders.contains("z")] }], boom);
    expect(scorecard.passed).toBe(0);
    expect(cases[0].graderResults[0].reason).toContain("provider down");
  });
});
