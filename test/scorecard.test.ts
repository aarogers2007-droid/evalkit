import { describe, it, expect } from "vitest";
import { scoreRun, gradeFor, gateFails } from "../src/index.js";
import type { CaseResult } from "../src/index.js";

const mk = (name: string, category: string, passed: boolean, critical = false): CaseResult => ({
  name,
  category,
  critical,
  output: "",
  passed,
  graderResults: [{ grader: "g", passed, score: passed ? 1 : 0, reason: "" }],
});

describe("scoring", () => {
  it("gradeFor buckets pass rates into letters", () => {
    expect(gradeFor(0.95)).toBe("A");
    expect(gradeFor(0.85)).toBe("B");
    expect(gradeFor(0.75)).toBe("C");
    expect(gradeFor(0.65)).toBe("D");
    expect(gradeFor(0.5)).toBe("F");
  });

  it("scoreRun aggregates overall and per-category", () => {
    const sc = scoreRun([mk("a", "x", true), mk("b", "x", false), mk("c", "y", true)], "m");
    expect(sc.total).toBe(3);
    expect(sc.passed).toBe(2);
    expect(sc.categories.find((c) => c.category === "x")?.passRate).toBeCloseTo(0.5);
    expect(sc.categories.find((c) => c.category === "y")?.grade).toBe("A");
  });

  it("gateFails on low pass rate or any critical failure", () => {
    expect(gateFails(scoreRun([mk("a", "x", true)], "m"), { threshold: 0.9 })).toBe(false);
    expect(gateFails(scoreRun([mk("a", "x", false)], "m"), { threshold: 0.9 })).toBe(true);
    // 100% pass rate but a critical case failed is impossible; test critical dominates a passing threshold:
    const mixed = scoreRun([mk("a", "x", true), mk("b", "x", true), mk("c", "x", true), mk("d", "x", true), mk("e", "x", true), mk("f", "x", true), mk("g", "x", true), mk("h", "x", true), mk("i", "x", true), mk("bad", "x", false, true)], "m");
    expect(mixed.passRate).toBeCloseTo(0.9);
    expect(gateFails(mixed, { threshold: 0.5 })).toBe(true); // passes threshold, but critical failed
  });
});
