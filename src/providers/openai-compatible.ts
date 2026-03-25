import OpenAI from "openai";
import type { Provider, CompleteOptions } from "../types.js";

const TIMEOUT_MS = 30_000;

export class OpenAICompatibleProvider implements Provider {
  name: string;
  model: string;
  private client: OpenAI;

  constructor(
    apiKey: string,
    model: string,
    name: string,
    baseURL: string,
  ) {
    this.name = name;
    this.model = model;
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async complete(options: CompleteOptions): Promise<string> {
    const request = this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      response_format: { type: "json_object" },
    });

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${this.name} request timed out after 30s`)),
        TIMEOUT_MS,
      );
    });

    const response = await Promise.race([request, timeout]);

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error(`${this.name} returned empty response`);
    }

    return text;
  }
}
