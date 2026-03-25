import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProvider } from "../providers/registry.js";
import { askSystemPrompt, askUserPrompt } from "../prompts.js";
import { AskResponseSchema } from "../schemas.js";
import {
  getStructuredResponse,
  isStructuredError,
} from "../structured-output.js";

const inputSchema = {
  question: z.string().describe("The technical question to ask"),
  context: z
    .string()
    .optional()
    .describe("Additional context for the question"),
};

export function registerAskTool(server: McpServer): void {
  server.tool(
    "second_opinion_ask",
    "Ask a technical question and get a structured verdict (YES/NO/PARTIAL/UNCERTAIN) with confidence level and evidence",
    inputSchema,
    async (args) => {
      const provider = getProvider();

      const systemPrompt = askSystemPrompt();
      const userPrompt = askUserPrompt(args.question, args.context);

      let raw: string;
      try {
        raw = await provider.complete({
          systemPrompt,
          userPrompt,
          temperature: 0.3,
          maxTokens: 2048,
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
          maxTokens: 2048,
        });
      };

      const result = await getStructuredResponse(
        raw,
        AskResponseSchema,
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
