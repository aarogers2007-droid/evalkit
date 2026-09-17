#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runEval } from "./runner.js";
import { printScorecard } from "./report.js";
import { gateFails } from "./scorecard.js";
import type { EvalCase, Model } from "./types.js";

/**
 * Usage:  evalkit <suite-file> [--threshold 0.9] [--json] [--verbose] [--no-color]
 *
 * The suite file must export `cases` (EvalCase[]) and `model` (Model).
 * Exits non-zero when the run fails the gate — drop it straight into CI.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: evalkit <suite-file> [--threshold 0.9] [--json] [--verbose] [--no-color]");
    process.exit(2);
  }

  const threshold = flagNum(args, "--threshold", 0.9);
  const json = args.includes("--json");
  const verbose = args.includes("--verbose");
  const color = !args.includes("--no-color");

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

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
