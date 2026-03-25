# second-opinion-mcp

MCP server that gives any AI coding tool a structured second opinion from another AI provider.
Killer feature: structured JSON verdicts, not chat. Every response has a fixed schema with verdict, confidence, evidence.

## Stack

- Runtime: Node.js 20+ with TypeScript
- MCP SDK: @modelcontextprotocol/sdk (subpath imports: /server/mcp.js, /server/stdio.js)
- Gemini SDK: @google/genai (NOT @google/generative-ai which is deprecated)
- OpenAI SDK: openai (used for OpenAI, Groq, DeepSeek via baseURL)
- Validation: zod (comes with MCP SDK)
- Env: dotenv

## Ralph Loop Protocol

You are running inside a Ralph Loop. Each iteration you MUST:

1. Read `prd.json` — find the FIRST story where `"passes": false`
2. Read `progress.txt` — learn from previous iterations
3. Implement ONLY that one story
4. Run `npm run build` — must compile with zero errors
5. If build fails: fix and retry. Do NOT move on with broken build.
6. Commit with message: `feat(story-N): <title>`
7. Update `prd.json` — set that story's `"passes": true`
8. Append to `progress.txt`: `[N] what was done | what was learned`
9. Stop. Do NOT start the next story. Exit cleanly.

If ALL stories have `"passes": true`, say "All stories complete" and exit.

## File Structure

```
src/
  index.ts                    # MCP server entry point
  config.ts                   # Provider detection + env config
  types.ts                    # Provider interface + shared types
  schemas.ts                  # Zod schemas for all 4 tool outputs
  prompts.ts                  # System prompts (force JSON output)
  structured-output.ts        # JSON parse + retry + regex + Zod pipeline
  providers/
    gemini.ts                 # Google Gemini via @google/genai
    openai-compatible.ts      # OpenAI/Groq/DeepSeek via openai SDK
    registry.ts               # Auto-detect provider from env vars
  tools/
    ask.ts                    # second_opinion_ask
    review.ts                 # second_opinion_review
    verify.ts                 # second_opinion_verify
    compare.ts                # second_opinion_compare
```

## Provider Architecture

```typescript
// Provider interface — every provider implements this
interface Provider {
  name: string;
  model: string;
  complete(options: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<string>;
}

// Provider config map
const PROVIDERS = {
  gemini:   { envKey: "GEMINI_API_KEY",   models: ["gemini-2.5-flash", "gemini-2.5-pro"], default: "gemini-2.5-flash" },
  openai:   { envKey: "OPENAI_API_KEY",   models: ["gpt-4.1-mini", "gpt-4.1", "o4-mini"], default: "gpt-4.1-mini", baseUrl: "https://api.openai.com/v1" },
  groq:     { envKey: "GROQ_API_KEY",     models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"], default: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" },
  deepseek: { envKey: "DEEPSEEK_API_KEY", models: ["deepseek-chat", "deepseek-reasoner"], default: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1" },
};

// Detection priority: SECOND_OPINION_PROVIDER env override > first key found in order above
// Model override: SECOND_OPINION_MODEL env var
```

## Structured Output Pipeline

Every tool response goes through this pipeline:

```
LLM raw text
  → JSON.parse() attempt
  → if fails: retry 1x with "fix your JSON" prompt
  → if fails: regex extract /\{[\s\S]*\}/ then JSON.parse
  → Zod schema validation
  → if Zod fails: return structured error
  → return validated response with provider + model fields injected
```

Error response (when pipeline fails completely):
```json
{
  "verdict": "ERROR",
  "error": "Failed to get structured response from provider",
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

## Tool Output Schemas

### second_opinion_ask
```json
{
  "verdict": "YES | NO | PARTIAL | UNCERTAIN",
  "confidence": "HIGH | MEDIUM | LOW",
  "answer": "string — the actual answer in pt-BR",
  "evidence": ["string array — supporting points"],
  "provider": "string",
  "model": "string"
}
```

### second_opinion_review
```json
{
  "verdict": "PASS | FAIL | WARNING",
  "score": 1-10,
  "criteria": [
    {
      "name": "string — e.g. security, performance, correctness",
      "status": "PASS | FAIL | WARNING",
      "findings": [
        {
          "severity": "HIGH | MEDIUM | LOW",
          "line": "number or null",
          "issue": "string",
          "fix": "string"
        }
      ]
    }
  ],
  "summary": "string — one-line summary in pt-BR",
  "provider": "string",
  "model": "string"
}
```

### second_opinion_verify
```json
{
  "verdict": "YES | NO | PARTIAL | OUTDATED | UNCERTAIN",
  "confidence": "HIGH | MEDIUM | LOW",
  "explanation": "string — the verification result in pt-BR",
  "caveats": ["string array — important nuances"],
  "docs_to_check": ["string array — doc names NOT URLs, e.g. 'Redis SET command docs'"],
  "provider": "string",
  "model": "string"
}
```

### second_opinion_compare
```json
{
  "winner": "APPROACH_A | APPROACH_B | TIE | DEPENDS",
  "confidence": "HIGH | MEDIUM | LOW",
  "comparison": [
    {
      "criterion": "string",
      "winner": "APPROACH_A | APPROACH_B | TIE",
      "reason": "string"
    }
  ],
  "recommendation": "string — final recommendation in pt-BR",
  "provider": "string",
  "model": "string"
}
```

## Tool Input Schemas

### second_opinion_ask
- question: string (required)
- context: string (optional)

### second_opinion_review
- code: string (required) — code or diff
- language: string (optional, default: "auto-detect")
- focus: string[] (optional, default: ["security", "performance", "correctness", "error-handling"])

### second_opinion_compare
- approach_a: { name: string, description: string } (required)
- approach_b: { name: string, description: string } (required)
- criteria: string[] (optional, default: ["performance", "maintainability", "complexity", "scalability"])
- context: string (required)

### second_opinion_verify
- claim: string (required)
- context: string (optional)

## System Prompts (guidelines for src/prompts.ts)

Each system prompt MUST:
1. Define the AI's role (reviewer, verifier, architect, etc.)
2. Include the EXACT JSON schema it must return (copy from schemas above)
3. Say: "Respond in Brazilian Portuguese (pt-BR)"
4. Say: "Return ONLY valid JSON. No markdown code fences. No text before or after the JSON."
5. Say: "If you cannot answer with confidence, set verdict accordingly — never make things up"

Each user prompt is built by the tool handler from the input parameters.

## Coding Rules

- ALWAYS use Context7 (resolve-library-id + query-docs) before using any SDK you haven't verified
- TypeScript strict mode — no any, no implicit returns
- Every provider.complete() call has 30s timeout via Promise.race
- Every catch block returns a structured error, never throws unhandled
- No console.log — use process.stderr.write for debug logging
- Imports: use .js extension in relative imports (ESM requirement)
- Keep functions under 50 lines
- One export per concept, named exports only

## Protected Files (DO NOT modify)

- _templates_personas/ — do not touch
- prd.json — only update "passes" field
- progress.txt — only append, never delete lines
- CLAUDE.md — do not modify

## Commands

```bash
npm install          # install deps
npm run build        # compile TypeScript
npm start            # run the MCP server
npm run dev          # watch mode
```
