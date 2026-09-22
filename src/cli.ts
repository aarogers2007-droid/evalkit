#!/usr/bin/env node
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { runEval } from "./runner.js";
import { printScorecard, renderHtmlReport } from "./report.js";
import { gateFails } from "./scorecard.js";
import type { EvalCase, Model } from "./types.js";

/**
 * Usage:
 *   evalkit <suite-file> [--threshold 0.9] [--json] [--verbose] [--no-color]
 *                        [--html <path>] [--title "..."] [--subject "..."]
 *
 * The suite file must export `cases` (EvalCase[]) and `model` (Model).
 * Exits non-zero when the run fails the gate — drop it straight into CI.
 * With --html, also writes a standalone, emailable scorecard to <path>.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error(
      "usage: evalkit <suite-file> [--threshold 0.9] [--json] [--verbose] [--no-color] [--html <path>] [--title ...] [--subject ...]",
    );
    process.exit(2);
  }

  const threshold = flagNum(args, "--threshold", 0.9);
  const json = args.includes("--json");
  const verbose = args.includes("--verbose");
  const color = !args.includes("--no-color");
  const html = flagStr(args, "--html");
  const title = flagStr(args, "--title");
  const subject = flagStr(args, "--subject");

  const mod = (await import(pathToFileURL(resolve(file)).href)) as {
    cases?: EvalCase[];
    model?: Model;
    default?: { cases?: EvalCase[]; model?: Model };
  };
  const cases = mod.cases ?? mod.default?.cases;
  const model = mod.model ?? mod.default?.model;
  if (!Array.isArray(cases) || !model) {
    console.error("suite must export `cases` (EvalCase[]) and `model` (Model)");
    process.exit(2);
  }

  const run = await runEval(cases, model);
  if (json) console.log(JSON.stringify(run.scorecard, null, 2));
  else printScorecard(run, { verbose, color });

  if (html) {
    writeFileSync(resolve(html), renderHtmlReport(run, { title, subject }), "utf8");
    if (!json) console.log(`  ↳ HTML scorecard written to ${html}\n`);
  }

  process.exit(gateFails(run.scorecard, { threshold }) ? 1 : 0);
}

function flagNum(args: string[], flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1] !== undefined) {
    const n = Number(args[i + 1]);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function flagStr(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith("--")) return args[i + 1];
  return undefined;
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
