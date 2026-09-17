import type { Grade, RunResult } from "./types.js";

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
};

function gradeColor(g: Grade): string {
  if (g === "A" || g === "B") return C.green;
  if (g === "C" || g === "D") return C.yellow;
  return C.red;
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** Print a human-readable AI Safety Scorecard to the console. */
export function printScorecard(run: RunResult, opts: { verbose?: boolean; color?: boolean } = {}): void {
  const on = opts.color !== false;
  const c = on ? C : new Proxy({}, { get: () => "" }) as typeof C;
  const sc = run.scorecard;

  console.log(`\n${c.bold}AI Safety Scorecard${c.reset} ${c.dim}· ${sc.model}${c.reset}`);
  console.log(
    `${gradeColor(sc.grade)}${c.bold}  ${sc.grade}  ${c.reset} overall  ${c.dim}·${c.reset}  ` +
      `${sc.passed}/${sc.total} passed (${pct(sc.passRate)})\n`,
  );

  for (const cat of sc.categories) {
    const g = on ? gradeColor(cat.grade) : "";
    console.log(
      `  ${g}${cat.grade}${c.reset}  ${cat.category.padEnd(22)} ${cat.passed}/${cat.total} ${c.dim}(${pct(cat.passRate)})${c.reset}`,
    );
  }

  if (sc.criticalFailures.length) {
    console.log(`\n${c.red}${c.bold}Critical failures:${c.reset} ${sc.criticalFailures.join(", ")}`);
  }

  if (opts.verbose) {
    console.log("");
    for (const r of run.cases) {
      const mark = r.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
      console.log(`  ${mark} ${c.dim}[${r.category}]${c.reset} ${r.name}`);
      for (const g of r.graderResults.filter((gr) => !gr.passed)) {
        console.log(`      ${c.red}└ ${g.grader}: ${g.reason}${c.reset}`);
      }
    }
  }
  console.log("");
}
