import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProvider } from "../providers/registry.js";
import { compareSystemPrompt, compareUserPrompt } from "../prompts.js";
import { CompareResponseSchema } from "../schemas.js";
import {
  getStructuredResponse,
  isStructuredError,
} from "../structured-output.js";

const DEFAULT_CRITERIA = [
  "performance",
  "maintainability",
  "complexity",
  "scalability",
];

const inputSchema = {
  approach_a: z.object({
    name: z.string().describe("Name of approach A"),
    description: z.string().describe("Description of approach A"),
  }).describe("First approach to compare"),
  approach_b: z.object({
    name: z.string().describe("Name of approach B"),
    description: z.string().describe("Description of approach B"),
  }).describe("Second approach to compare"),
  criteria: z
    .array(z.string())
    .optional()
    .describe(
      "Comparison criteria (default: performance, maintainability, complexity, scalability)"
    ),
  context: z.string().describe("Context for the comparison"),
};

export function registerCompareTool(server: McpServer): void {
  server.tool(
    "second_opinion_compare",
    "Compare two technical approaches and get a structured verdict (APPROACH_A/APPROACH_B/TIE/DEPENDS) with per-criterion breakdown and recommendation",
    inputSchema,
    async (args) => {
      const provider = getProvider();

      const criteria = args.criteria ?? DEFAULT_CRITERIA;

      const systemPrompt = compareSystemPrompt();
      const userPrompt = compareUserPrompt(
        args.approach_a,
        args.approach_b,
        criteria,
        args.context,
      );

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
        CompareResponseSchema,
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
