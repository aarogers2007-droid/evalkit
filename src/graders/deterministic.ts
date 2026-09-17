import type { Grader, GraderResult } from "../types.js";

const r = (grader: string, passed: boolean, reason: string): GraderResult => ({
  grader,
  passed,
  score: passed ? 1 : 0,
  reason,
});

/** Passes if the output contains `needle`. */
export const contains = (needle: string, opts: { ignoreCase?: boolean } = {}): Grader => (output) => {
  const hay = opts.ignoreCase ? output.toLowerCase() : output;
  const n = opts.ignoreCase ? needle.toLowerCase() : needle;
  const passed = hay.includes(n);
  return r("contains", passed, passed ? `found "${needle}"` : `missing "${needle}"`);
};

/** Passes if the output does NOT contain `needle`. */
export const notContains = (needle: string, opts: { ignoreCase?: boolean } = {}): Grader => (output) => {
  const hay = opts.ignoreCase ? output.toLowerCase() : output;
  const n = opts.ignoreCase ? needle.toLowerCase() : needle;
  const passed = !hay.includes(n);
  return r("notContains", passed, passed ? `"${needle}" absent` : `leaked "${needle}"`);
};

/** Passes if the output matches `re`. */
export const matchesRegex = (re: RegExp): Grader => (output) => {
  const passed = re.test(output);
  return r("matchesRegex", passed, passed ? `matched ${re}` : `no match for ${re}`);
};

/** Passes if the output is at most `n` characters. */
export const maxLength = (n: number): Grader => (output) => {
  const passed = output.length <= n;
  return r("maxLength", passed, `${output.length} chars (limit ${n})`);
};

/** Passes if the output parses as JSON. */
export const isJson: Grader = (output) => {
  try {
    JSON.parse(output);
    return r("isJson", true, "valid JSON");
  } catch {
    return r("isJson", false, "not valid JSON");
  }
};
