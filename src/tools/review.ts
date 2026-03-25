import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProvider } from "../providers/registry.js";
import { reviewSystemPrompt, reviewUserPrompt } from "../prompts.js";
import { ReviewResponseSchema } from "../schemas.js";
import {
  getStructuredResponse,
  isStructuredError,
} from "../structured-output.js";

const DEFAULT_FOCUS = [
  "security",
  "performance",
  "correctness",
  "error-handling",
];

const inputSchema = {
  code: z.string().describe("The code or diff to review"),
  language: z
    .string()
    .optional()
    .default("auto-detect")
    .describe("Programming language (default: auto-detect)"),
  focus: z
    .array(z.string())
    .optional()
    .describe(
      "Review focus areas (default: security, performance, correctness, error-handling)"
    ),
};

export function registerReviewTool(server: McpServer): void {
  server.tool(
    "second_opinion_review",
    "Review code and get a structured verdict (PASS/FAIL/WARNING) with score, per-criteria findings, and fix suggestions",
    inputSchema,
    async (args) => {
      const provider = getProvider();

      const focus = args.focus ?? DEFAULT_FOCUS;
      const language = args.language ?? "auto-detect";

      const systemPrompt = reviewSystemPrompt();
      const userPrompt = reviewUserPrompt(args.code, language, focus);

      let raw: string;
      try {
        raw = await provider.complete({
          systemPrompt,
          userPrompt,
          temperature: 0.3,
          maxTokens: 4096,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown provider error";
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                verdict: "ERROR",
                error: message,
                provider: provider.name,
                model: provider.model,
              }),
            },
          ],
        };
      }

      const retryFn = async (): Promise<string> => {
        return provider.complete({
          systemPrompt,
          userPrompt:
            "Your previous response was not valid JSON. Please fix it and return ONLY the JSON object with the exact schema requested.",
          temperature: 0.1,
          maxTokens: 4096,
        });
      };

      const result = await getStructuredResponse(
        raw,
        ReviewResponseSchema,
        retryFn,
      );

      if (isStructuredError(result)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ...result,
                provider: provider.name,
                model: provider.model,
              }),
            },
          ],
          isError: true,
        };
      }

      const response = {
        ...result,
        provider: provider.name,
        model: provider.model,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    },
  );
}
