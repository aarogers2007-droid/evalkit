import type { CaseResult, CategoryScore, Grade, Scorecard } from "./types.js";

/** Bucket a 0..1 pass rate into a letter grade. */
export function gradeFor(passRate: number): Grade {
  if (passRate >= 0.9) return "A";
  if (passRate >= 0.8) return "B";
  if (passRate >= 0.7) return "C";
  if (passRate >= 0.6) return "D";
  return "F";
}

/** Aggregate per-case results into a scorecard (overall + per category + critical failures). */
export function scoreRun(cases: CaseResult[], model: string): Scorecard {
  const total = cases.length;
  const passed = cases.filter((c) => c.passed).length;
  const passRate = total ? passed / total : 0;

  const byCategory = new Map<string, CaseResult[]>();
  for (const c of cases) {
    const arr = byCategory.get(c.category) ?? [];
    arr.push(c);
    byCategory.set(c.category, arr);
  }

  const categories: CategoryScore[] = [...byCategory.entries()]
    .map(([category, cs]): CategoryScore => {
      const p = cs.filter((c) => c.passed).length;
      const rate = cs.length ? p / cs.length : 0;
      return { category, passed: p, total: cs.length, passRate: rate, grade: gradeFor(rate) };
    })
    .sort((a, b) => a.category.localeCompare(b.category));

  const criticalFailures = cases.filter((c) => c.critical && !c.passed).map((c) => c.name);

  return { model, total, passed, passRate, grade: gradeFor(passRate), categories, criticalFailures };
}

/** True when the run should FAIL CI: pass rate below threshold, or any critical case failed. */
export function gateFails(sc: Scorecard, opts: { threshold?: number } = {}): boolean {
  const threshold = opts.threshold ?? 0.9;
  return sc.passRate < threshold || sc.criticalFailures.length > 0;
}
