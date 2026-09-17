import type { Model } from "./types.js";

/**
 * A deterministic, in-memory model for tests, demos, and offline CI — no API keys required.
 *
 *   const model = mockModel((prompt) => prompt.includes("bomb") ? "I can't help with that." : "ok");
 */
export function mockModel(
  responder: (prompt: string, system?: string) => string,
  name = "mock",
): Model {
  return {
    name,
    async generate(prompt, opts) {
      return responder(prompt, opts?.system);
    },
  };
}

/**
 * Adapt a Vercel AI SDK language model into an EvalKit Model. EvalKit itself stays dependency-free —
 * you bring `ai` and a provider. Pass `generateText` in so nothing is imported here:
 *
 *   import { generateText } from "ai";
 *   import { openai } from "@ai-sdk/openai";
 *   const model = aiSdkModel(openai("gpt-4o-mini"), generateText, "gpt-4o-mini");
 */
export function aiSdkModel(
  languageModel: unknown,
  generateText: (args: { model: unknown; prompt: string; system?: string }) => Promise<{ text: string }>,
  name = "ai-sdk",
): Model {
  return {
    name,
    async generate(prompt, opts) {
      const { text } = await generateText({ model: languageModel, prompt, system: opts?.system });
      return text;
    },
  };
}
