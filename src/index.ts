#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PROVIDER_CONFIG, DETECTION_ORDER } from "./config.js";
import { registerAskTool } from "./tools/ask.js";
import { registerReviewTool } from "./tools/review.js";
import { registerVerifyTool } from "./tools/verify.js";
import { registerCompareTool } from "./tools/compare.js";

function validateProviderAvailability(): void {
  const override = process.env.SECOND_OPINION_PROVIDER?.toLowerCase();

  if (override) {
    const config = PROVIDER_CONFIG[override];
    if (!config) {
      process.stderr.write(
        `Error: Unknown provider "${override}". Valid providers: ${Object.keys(PROVIDER_CONFIG).join(", ")}\n`,
      );
      process.exit(1);
    }
    if (!process.env[config.envKey]) {
      process.stderr.write(
        `Error: SECOND_OPINION_PROVIDER is set to "${override}" but ${config.envKey} is not set\n`,
      );
      process.exit(1);
    }
    return;
  }

  const hasKey = DETECTION_ORDER.some(
    (name) => process.env[PROVIDER_CONFIG[name].envKey],
  );

  if (!hasKey) {
    const keys = DETECTION_ORDER.map((name) => PROVIDER_CONFIG[name].envKey).join(", ");
    process.stderr.write(
      `Error: No provider API key found. Set one of: ${keys}\n`,
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  validateProviderAvailability();

  const server = new McpServer({
    name: "second-opinion-mcp",
    version: "1.0.0",
  });

  registerAskTool(server);
  registerReviewTool(server);
  registerVerifyTool(server);
  registerCompareTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
