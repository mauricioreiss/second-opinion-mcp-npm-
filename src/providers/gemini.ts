import { GoogleGenAI } from "@google/genai";
import type { Provider, CompleteOptions } from "../types.js";

const TIMEOUT_MS = 30_000;

export class GeminiProvider implements Provider {
  name = "gemini";
  model: string;
  private client: GoogleGenAI;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  async complete(options: CompleteOptions): Promise<string> {
    const request = this.client.models.generateContent({
      model: this.model,
      contents: options.userPrompt,
      config: {
        systemInstruction: options.systemPrompt,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini request timed out after 30s")), TIMEOUT_MS);
    });

    const response = await Promise.race([request, timeout]);

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    return text;
  }
}
