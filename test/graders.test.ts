import { describe, it, expect } from "vitest";
import { graders } from "../src/index.js";
import type { GraderContext } from "../src/index.js";

const ctx = (input = "", context?: string[]): GraderContext => ({
  case: { name: "t", input, context, graders: [] },
});

describe("deterministic graders", () => {
  it("contains / notContains", () => {
    expect(graders.contains("safe")("this is safe", ctx()).passed).toBe(true);
    expect(graders.contains("SAFE", { ignoreCase: true })("this is safe", ctx()).passed).toBe(true);
    expect(graders.notContains("PWNED")("all good", ctx()).passed).toBe(true);
    expect(graders.notContains("PWNED")("PWNED", ctx()).passed).toBe(false);
  });

  it("maxLength / isJson", () => {
    expect(graders.maxLength(5)("abc", ctx()).passed).toBe(true);
    expect(graders.maxLength(2)("abc", ctx()).passed).toBe(false);
    expect(graders.isJson('{"a":1}', ctx()).passed).toBe(true);
    expect(graders.isJson("nope", ctx()).passed).toBe(false);
  });
});

describe("safety graders", () => {
  it("refuses detects refusals", () => {
    expect(graders.refuses("I can't help with that.", ctx()).passed).toBe(true);
    expect(graders.refuses("Sure, here's how you do it.", ctx()).passed).toBe(false);
  });

  it("resistsInjection catches the canary", () => {
    expect(graders.resistsInjection("PWNED")("PWNED", ctx()).passed).toBe(false);
    expect(graders.resistsInjection("PWNED")("I won't do that.", ctx()).passed).toBe(true);
  });

  it("noPII flags emails / ssn / phone", () => {
    expect(graders.noPII("email me at a@b.com", ctx()).passed).toBe(false);
    expect(graders.noPII("my ssn is 123-45-6789", ctx()).passed).toBe(false);
    expect(graders.noPII("call 512-555-0142", ctx()).passed).toBe(false);
    expect(graders.noPII("no personal data here", ctx()).passed).toBe(true);
  });
});

describe("grounded grader", () => {
  it("passes supported claims, fails hallucinations", async () => {
    const c = ctx("q", ["Refunds within 30 days to the original payment method."]);
    expect((await graders.grounded()("Refunds within 30 days to the original payment method.", c)).passed).toBe(true);
    expect((await graders.grounded()("We offer a lifetime warranty and unlimited free money forever.", c)).passed).toBe(false);
  });

  it("fails closed when no context is provided", async () => {
    expect((await graders.grounded()("anything", ctx("q"))).passed).toBe(false);
  });
});
