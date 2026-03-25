import { ZodSchema } from "zod";

export interface StructuredError {
  verdict: "ERROR";
  error: string;
}

export function isStructuredError(value: unknown): value is StructuredError {
  return (
    typeof value === "object" &&
    value !== null &&
    "verdict" in value &&
    (value as StructuredError).verdict === "ERROR"
  );
}

function tryJsonParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function regexExtractJson(raw: string): unknown | null {
  const openBrace = raw.indexOf("{");
  const closeBrace = raw.lastIndexOf("}");
  if (openBrace === -1 || closeBrace === -1 || closeBrace <= openBrace) {
    return null;
  }
  return tryJsonParse(raw.slice(openBrace, closeBrace + 1));
}

export async function getStructuredResponse<T>(
  raw: string,
  schema: ZodSchema<T>,
  retryFn?: () => Promise<string>
): Promise<T | StructuredError> {
  let parsed = tryJsonParse(raw);

  if (parsed === null && retryFn) {
    try {
      const retryRaw = await retryFn();
      parsed = tryJsonParse(retryRaw);
    } catch {
    }
  }

  if (parsed === null) {
    parsed = regexExtractJson(raw);
  }

  if (parsed === null) {
    return {
      verdict: "ERROR",
      error: "Failed to extract JSON from provider response",
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      verdict: "ERROR",
      error: `Schema validation failed: ${issues}`,
    };
  }

  return result.data;
}
