# second-opinion-mcp

MCP server that gives any AI coding tool a structured second opinion from another AI provider.

Not chat. Not conversation. **Structured JSON verdicts** with fixed schemas: `YES`/`NO`, `PASS`/`FAIL`, confidence levels, evidence arrays, and actionable findings.

## Why

Your AI coding assistant can hallucinate, miss bugs, or give outdated advice. This server lets it cross-check with a different AI provider and get back a machine-readable verdict it can act on.

## Providers

| Provider | Env Key | Default Model | Free Tier |
|----------|---------|---------------|-----------|
| Gemini | `GEMINI_API_KEY` | gemini-2.5-flash | 15 RPM, 1M tokens/day |
| OpenAI | `OPENAI_API_KEY` | gpt-4.1-mini | Pay-as-you-go |
| Groq | `GROQ_API_KEY` | llama-3.3-70b-versatile | 30 RPM, 14.4K tokens/min |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat | Pay-as-you-go (cheap) |

Set one key and the server auto-detects which provider to use. Override with `SECOND_OPINION_PROVIDER` and `SECOND_OPINION_MODEL` env vars.

## Installation

### From npm

```bash
npm install -g second-opinion-mcp
```

### From source

```bash
git clone https://github.com/snarktank/second-opinion-mcp.git
cd second-opinion-mcp
npm install
npm run build
```

### Add to Claude Code

```bash
claude mcp add second-opinion -s user -e GEMINI_API_KEY=your-key -- npx second-opinion-mcp
```

Or add to your MCP client config manually:

```json
{
  "mcpServers": {
    "second-opinion": {
      "command": "npx",
      "args": ["second-opinion-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Tools

### `second_opinion_ask`

Ask a technical question. Get a verdict, not a wall of text.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The technical question |
| `context` | string | no | Additional context |

**Example output:**

```json
{
  "verdict": "NO",
  "confidence": "HIGH",
  "answer": "Usar eval() para parsing de JSON e inseguro, especialmente com input de usuarios. Use JSON.parse().",
  "evidence": [
    "eval() executa codigo arbitrario, permitindo injecao de codigo malicioso",
    "JSON.parse() rejeita JSON invalido sem executar codigo",
    "OWASP lista eval injection como vulnerabilidade critica"
  ],
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

### `second_opinion_review`

Code review with structured findings per criterion.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | yes | Code or diff to review |
| `language` | string | no | Language (auto-detected if omitted) |
| `focus` | string[] | no | Review criteria (default: security, performance, correctness, error-handling) |

**Example output:**

```json
{
  "verdict": "FAIL",
  "score": 2,
  "criteria": [
    {
      "name": "security",
      "status": "FAIL",
      "findings": [
        {
          "severity": "HIGH",
          "line": 2,
          "issue": "SQL injection via string interpolation",
          "fix": "Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [id])"
        }
      ]
    }
  ],
  "summary": "Vulnerabilidade critica de SQL injection. Use queries parametrizadas.",
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

### `second_opinion_verify`

Fact-check a technical claim.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `claim` | string | yes | The claim to verify |
| `context` | string | no | Additional context |

**Example output:**

```json
{
  "verdict": "YES",
  "confidence": "HIGH",
  "explanation": "WATCH monitora chaves e aborta a transacao MULTI/EXEC se qualquer chave monitorada for modificada por outro cliente.",
  "caveats": [
    "WATCH nao bloqueia outros clientes, apenas detecta conflitos",
    "A transacao precisa ser re-tentada manualmente apos abort"
  ],
  "docs_to_check": [
    "Redis WATCH command docs",
    "Redis transactions documentation"
  ],
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

### `second_opinion_compare`

Compare two approaches with per-criterion breakdown.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `approach_a` | `{name, description}` | yes | First approach |
| `approach_b` | `{name, description}` | yes | Second approach |
| `criteria` | string[] | no | Comparison criteria (default: performance, maintainability, complexity, scalability) |
| `context` | string | yes | Context for the comparison |

**Example output:**

```json
{
  "winner": "APPROACH_A",
  "confidence": "HIGH",
  "comparison": [
    {
      "criterion": "performance",
      "winner": "TIE",
      "reason": "Ambos operam em microsegundos para operacoes simples de key-value"
    },
    {
      "criterion": "features",
      "winner": "APPROACH_A",
      "reason": "Redis tem TTL nativo, pub/sub, e estruturas de dados que facilitam sessoes"
    }
  ],
  "recommendation": "Redis e a melhor escolha para sessoes. TTL nativo elimina logica de expiracao manual.",
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

## How It Works

1. Your AI tool calls one of the 4 MCP tools
2. The server builds a structured prompt that forces JSON output
3. Sends to the configured provider (Gemini, OpenAI, Groq, or DeepSeek)
4. Parses the response: `JSON.parse` -> retry with correction prompt -> regex extract -> Zod validation
5. Returns a validated, schema-conforming JSON verdict

Every response has a fixed schema. No surprises, no markdown, no chat.

## Configuration

Copy `.env.example` to `.env` and set your keys:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GROQ_API_KEY` | Groq API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `SECOND_OPINION_PROVIDER` | Force a provider (skips auto-detection) |
| `SECOND_OPINION_MODEL` | Force a model (overrides provider default) |

## Development

```bash
npm run dev    # Watch mode
npm run build  # Build once
npm start      # Run the server
```

## Limitations

- Responses are in Brazilian Portuguese (pt-BR) by default
- One provider at a time (no multi-provider consensus)
- 30-second timeout per request
- Free tier rate limits vary by provider
- LLM responses are non-deterministic; verdicts may vary between calls

## License

MIT
