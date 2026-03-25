#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// --- Startup validation ---

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  process.stderr.write(
    "ERROR: GEMINI_API_KEY not found in environment variables.\n" +
      "Set it via: export GEMINI_API_KEY=your-key-here\n" +
      "Or create a .env file with: GEMINI_API_KEY=your-key-here\n" +
      "Get a free key at: https://aistudio.google.com/apikey\n"
  );
  process.exit(1);
}

// --- Clients ---

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const server = new McpServer({
  name: "gemini-second-opinion",
  version: "1.0.0",
});

// --- Gemini helper ---

interface GeminiCallOptions {
  systemInstruction: string;
  prompt: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

async function callGemini(opts: GeminiCallOptions): Promise<string> {
  const timeoutMs = 30_000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Timeout: Gemini did not respond within 30s")),
      timeoutMs
    );
  });

  const requestPromise = ai.models.generateContent({
    model: opts.model,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
    },
  });

  const response = await Promise.race([requestPromise, timeoutPromise]);
  return response.text ?? "Sem resposta do Gemini.";
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("timeout")) {
      return "Erro: Gemini não respondeu em 30 segundos. Tente novamente.";
    }
    if (msg.includes("429") || msg.includes("rate") || msg.includes("quota")) {
      return "Erro: Rate limit do Gemini atingido. Aguarde alguns segundos e tente novamente. Free tier: 15 req/min.";
    }
    if (
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("api key") ||
      msg.includes("unauthorized")
    ) {
      return "Erro: GEMINI_API_KEY inválida ou sem permissão. Verifique sua chave em https://aistudio.google.com/apikey";
    }
    return `Erro ao chamar Gemini: ${err.message}`;
  }
  return "Erro desconhecido ao chamar Gemini.";
}

// --- Tool 1: gemini_ask ---

server.tool(
  "gemini_ask",
  "Pergunta livre ao Gemini. Use para dúvidas técnicas, consultas rápidas, ou quando precisar de uma segunda perspectiva.",
  {
    question: z.string().describe("A pergunta"),
    context: z
      .string()
      .optional()
      .describe("Contexto adicional (trecho de código, stack técnica, etc.)"),
  },
  async ({ question, context }) => {
    try {
      const prompt = context
        ? `Pergunta: ${question}\n\nContexto:\n${context}`
        : question;

      const result = await callGemini({
        systemInstruction:
          "Você é um engenheiro senior dando uma segunda opinião técnica.\n" +
          "Seja direto, objetivo, e aponte riscos que o outro engenheiro pode ter perdido.\n" +
          "Responda em português brasileiro. Máximo 500 palavras.",
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.3,
        maxOutputTokens: 2000,
      });

      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: formatError(err) }],
        isError: true,
      };
    }
  }
);

// --- Tool 2: gemini_review_code ---

server.tool(
  "gemini_review_code",
  "Envia código para Gemini revisar. Retorna bugs, riscos, e sugestões.",
  {
    code: z.string().describe("O código ou diff para revisar"),
    context: z.string().describe("Contexto do projeto"),
    focus: z
      .string()
      .optional()
      .describe(
        'Foco da revisão (ex: "segurança", "performance", "race conditions")'
      ),
  },
  async ({ code, context, focus }) => {
    try {
      let prompt = `Contexto do projeto: ${context}\n\nCódigo para revisão:\n\`\`\`\n${code}\n\`\`\``;
      if (focus) {
        prompt += `\n\nFoco da revisão: ${focus}`;
      }

      const result = await callGemini({
        systemInstruction:
          "Você é um code reviewer senior e implacável. Analise o código abaixo e reporte:\n" +
          "1. BUGS: Erros lógicos, edge cases não tratados, race conditions\n" +
          "2. SEGURANÇA: Injection, auth bypass, data exposure, OWASP top 10\n" +
          "3. PERFORMANCE: N+1 queries, blocking calls, memory leaks\n" +
          "4. SUGESTÕES: Melhorias concretas (com exemplo de código)\n\n" +
          "Regras:\n" +
          "- Só reporte problemas REAIS com alta confiança (>80%)\n" +
          "- Não reporte style issues (formatação, naming) — foco em bugs e riscos\n" +
          "- Se o código está bom, diga 'Código aprovado, sem issues críticos encontrados.'\n" +
          "- Responda em português brasileiro.",
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.2,
        maxOutputTokens: 3000,
      });

      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: formatError(err) }],
        isError: true,
      };
    }
  }
);

// --- Tool 3: gemini_verify_claim ---

server.tool(
  "gemini_verify_claim",
  "Verifica se uma afirmação técnica é verdadeira. Use quando não tiver certeza sobre comportamento de uma API, compatibilidade, ou fato técnico.",
  {
    claim: z.string().describe("A afirmação a verificar"),
    technology: z.string().optional().describe("Tecnologia relacionada"),
  },
  async ({ claim, technology }) => {
    try {
      const prompt = technology
        ? `Tecnologia: ${technology}\n\nAfirmação: ${claim}`
        : `Afirmação: ${claim}`;

      const result = await callGemini({
        systemInstruction:
          "Você é um verificador de fatos técnicos. Analise a afirmação abaixo e responda:\n" +
          "- VERDADEIRO / FALSO / PARCIALMENTE VERDADEIRO\n" +
          "- Explicação curta (2-3 frases) com a informação correta\n" +
          "- Se não tiver certeza: diga 'NÃO TENHO CERTEZA — verificar na documentação oficial'\n" +
          "- Cite a versão específica quando relevante\n" +
          "- Responda em português brasileiro.",
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.1,
        maxOutputTokens: 1000,
      });

      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: formatError(err) }],
        isError: true,
      };
    }
  }
);

// --- Tool 4: gemini_compare ---

server.tool(
  "gemini_compare",
  "Compara duas abordagens técnicas e diz qual é melhor para o contexto dado.",
  {
    approach_a: z.string().describe("Primeira abordagem"),
    approach_b: z.string().describe("Segunda abordagem"),
    context: z.string().describe("Contexto e critérios para a comparação"),
  },
  async ({ approach_a, approach_b, context }) => {
    try {
      const prompt =
        `Contexto: ${context}\n\n` +
        `ABORDAGEM A:\n${approach_a}\n\n` +
        `ABORDAGEM B:\n${approach_b}`;

      const result = await callGemini({
        systemInstruction:
          "Você é um arquiteto de software comparando duas abordagens. Analise:\n" +
          "1. ABORDAGEM A vs ABORDAGEM B — tabela comparativa (performance, manutenção, segurança, complexidade)\n" +
          "2. VENCEDOR: Qual é melhor para o contexto dado e POR QUÊ\n" +
          "3. RISCOS: O que pode dar errado com a abordagem escolhida\n" +
          "4. Se ambas são equivalentes, diga 'Ambas são aceitáveis' e explique quando usar cada uma.\n" +
          "- Responda em português brasileiro.",
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.3,
        maxOutputTokens: 2000,
      });

      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: formatError(err) }],
        isError: true,
      };
    }
  }
);

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
