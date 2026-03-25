import type { Provider } from "../types.js";
import { PROVIDER_CONFIG, DETECTION_ORDER } from "../config.js";
import { GeminiProvider } from "./gemini.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";

function detectProvider(): { name: string; apiKey: string } {
  const override = process.env.SECOND_OPINION_PROVIDER?.toLowerCase();

  if (override) {
    const config = PROVIDER_CONFIG[override];
    if (!config) {
      throw new Error(
        `Unknown provider "${override}". Valid providers: ${Object.keys(PROVIDER_CONFIG).join(", ")}`,
      );
    }
    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      throw new Error(
        `SECOND_OPINION_PROVIDER is set to "${override}" but ${config.envKey} is not set`,
      );
    }
    return { name: override, apiKey };
  }

  for (const name of DETECTION_ORDER) {
    const config = PROVIDER_CONFIG[name];
    const apiKey = process.env[config.envKey];
    if (apiKey) {
      return { name, apiKey };
    }
  }

  throw new Error(
    "No provider API key found. Set one of: " +
      DETECTION_ORDER.map((name) => PROVIDER_CONFIG[name].envKey).join(", "),
  );
}

// Singleton cache: reuse the same provider instance while env stays the same.
let cachedProvider: Provider | null = null;
let cachedFingerprint: string | null = null;

function envFingerprint(): string {
  return [
    process.env.SECOND_OPINION_PROVIDER ?? "",
    process.env.SECOND_OPINION_MODEL ?? "",
    ...DETECTION_ORDER.map((n) => process.env[PROVIDER_CONFIG[n].envKey] ?? ""),
  ].join("|");
}

export function getProvider(): Provider {
  const fingerprint = envFingerprint();

  if (cachedProvider && cachedFingerprint === fingerprint) {
    return cachedProvider;
  }

  const { name, apiKey } = detectProvider();
  const config = PROVIDER_CONFIG[name];
  const model = process.env.SECOND_OPINION_MODEL || config.default;

  if (name === "gemini") {
    cachedProvider = new GeminiProvider(apiKey, model);
  } else {
    cachedProvider = new OpenAICompatibleProvider(apiKey, model, name, config.baseUrl!);
  }

  cachedFingerprint = fingerprint;
  return cachedProvider;
}
