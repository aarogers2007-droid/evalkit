/** Core types for EvalKit. */

export type Grade = "A" | "B" | "C" | "D" | "F";

/** Anything that can turn a prompt into text. Wrap your provider (OpenAI, Anthropic, local) in this. */
export interface Model {
  /**
   * Turn a prompt into text. `opts.system` is the case's system prompt; `opts.context` is the case's
   * retrieved passages (for RAG groundedness) — a real adapter should inject them into the prompt so a
   * groundedness grader is checking against material the model actually saw.
   */
  generate(prompt: string, opts?: { system?: string; context?: string[] }): Promise<string>;
  /** Optional label used in the scorecard header (e.g. "gpt-4o-mini"). */
  readonly name?: string;
}

/** One test: an input, optional context, and the graders its output must pass. */
export interface EvalCase {
  name: string;
  input: string;
  system?: string;
  /** Retrieved passages, for RAG groundedness graders. */
  context?: string[];
  graders: Grader[];
  /** Groups the case in the scorecard (e.g. "prompt-injection"). Defaults to "general". */
  category?: string;
  /** If true, a failure here fails the whole run regardless of the pass-rate threshold. */
  critical?: boolean;
}

export interface GraderContext {
  case: EvalCase;
}

export interface GraderResult {
  grader: string;
  passed: boolean;
  /** 0..1 */
  score: number;
  reason: string;
}

/** A grader inspects a model's output for one case and returns a pass/fail with a reason. */
export type Grader = (output: string, ctx: GraderContext) => GraderResult | Promise<GraderResult>;

export interface CaseResult {
  name: string;
  category: string;
  critical: boolean;
  output: string;
  graderResults: GraderResult[];
  passed: boolean;
}

export interface CategoryScore {
  category: string;
  passed: number;
  total: number;
  passRate: number;
  grade: Grade;
}

export interface Scorecard {
  model: string;
  total: number;
  passed: number;
  passRate: number;
  grade: Grade;
  categories: CategoryScore[];
  criticalFailures: string[];
}

export interface RunResult {
  scorecard: Scorecard;
  cases: CaseResult[];
}
