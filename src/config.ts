export interface ProviderConfig {
  envKey: string;
  models: string[];
  default: string;
  baseUrl?: string;
}

export const PROVIDER_CONFIG: Record<string, ProviderConfig> = {
  gemini: {
    envKey: "GEMINI_API_KEY",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"],
    default: "gemini-2.5-flash",
  },
  openai: {
    envKey: "OPENAI_API_KEY",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-5.4-mini", "gpt-5.4-nano", "o4-mini"],
    default: "gpt-4.1-mini",
    baseUrl: "https://api.openai.com/v1",
  },
  groq: {
    envKey: "GROQ_API_KEY",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b"],
    default: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  deepseek: {
    envKey: "DEEPSEEK_API_KEY",
    models: ["deepseek-chat", "deepseek-reasoner"],
    default: "deepseek-chat",
    baseUrl: "https://api.deepseek.com/v1",
  },
};

export const DETECTION_ORDER = ["gemini", "openai", "groq", "deepseek"] as const;
