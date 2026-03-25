export interface CompleteOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface Provider {
  name: string;
  model: string;
  complete(options: CompleteOptions): Promise<string>;
}
