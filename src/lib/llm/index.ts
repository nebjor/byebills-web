import type { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini";

// TODO: Add AnthropicProvider, OpenAIProvider when testing those

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? "gemini";

  switch (provider) {
    case "gemini": {
      const key = process.env.GOOGLE_GEMINI_API_KEY;
      if (!key) throw new Error("GOOGLE_GEMINI_API_KEY not set");
      // GEMINI_MODEL lets you switch models without a code change.
      return new GeminiProvider(key, process.env.GEMINI_MODEL);
    }
    // case "anthropic": {
    //   const key = process.env.ANTHROPIC_API_KEY;
    //   if (!key) throw new Error("ANTHROPIC_API_KEY not set");
    //   return new AnthropicProvider(key);
    // }
    // case "openai": {
    //   const key = process.env.OPENAI_API_KEY;
    //   if (!key) throw new Error("OPENAI_API_KEY not set");
    //   return new OpenAIProvider(key);
    // }
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}
