# second-opinion-mcp

Leia em portugues: [Portugues](README.pt-BR.md)

MCP server that gives any AI coding tool a structured second opinion from another AI provider.

## Why This Exists

AI coding assistants hallucinate, miss bugs, and give outdated advice. This server lets them cross-check answers with a different AI provider and get back a machine-readable verdict they can act on. Not chat, not markdown -- fixed JSON schemas with enums (`YES`/`NO`, `PASS`/`FAIL`), confidence levels, and evidence arrays, all validated with Zod.

## Providers

| Provider | Env Key | Default Model | Pricing |
|----------|---------|---------------|---------|
| Gemini | `GEMINI_API_KEY` | gemini-2.5-flash | Free tier available, paid plans for higher limits |
| OpenAI | `OPENAI_API_KEY` | gpt-4.1-mini | Pay-as-you-go |
| Groq | `GROQ_API_KEY` | llama-3.3-70b-versatile | Free tier available, paid plans for higher limits |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat | Pay-as-you-go |

Set one API key and the server auto-detects the provider. Detection order: Gemini > OpenAI > Groq > DeepSeek.

## Quick Start

### Claude Code (one command)

```bash
# With Gemini (free tier)
claude mcp add second-opinion -s user -e GEMINI_API_KEY=your-key -- npx second-opinion-mcp

# With OpenAI
claude mcp add second-opinion -s user -e OPENAI_API_KEY=your-key -- npx second-opinion-mcp

# With Groq (free tier)
claude mcp add second-opinion -s user -e GROQ_API_KEY=your-key -- npx second-opinion-mcp

# With DeepSeek
claude mcp add second-opinion -s user -e DEEPSEEK_API_KEY=your-key -- npx second-opinion-mcp
```

### Other MCP Clients (JSON config)

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

### From Source

```bash
git clone https://github.com/mauricioreiss/second-opinion-mcp-npm-.git
cd second-opinion-mcp-npm-
npm install && npm run build
```

## Tools

### `second_opinion_ask`

Ask a technical question. Returns a verdict, not a wall of text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The technical question |
| `context` | string | no | Additional context |

```json
{
  "verdict": "NO",
  "confidence": "HIGH",
  "answer": "Usar eval() para parsing de JSON e inseguro. Use JSON.parse().",
  "evidence": [
    "eval() executa codigo arbitrario, permitindo injecao de codigo",
    "JSON.parse() rejeita JSON invalido sem executar codigo"
  ],
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

Verdict: `YES` | `NO` | `PARTIAL` | `UNCERTAIN`. Confidence: `HIGH` | `MEDIUM` | `LOW`.

### `second_opinion_review`

Code review with structured findings per criterion.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | yes | Code or diff to review |
| `language` | string | no | Language (auto-detected if omitted) |
| `focus` | string[] | no | Review criteria (default: security, performance, correctness, error-handling) |

```json
{
  "verdict": "FAIL",
  "score": 3,
  "criteria": [
    {
      "name": "security",
      "status": "FAIL",
      "findings": [
        {
          "severity": "HIGH",
          "line": 5,
          "issue": "SQL injection via string interpolation",
          "fix": "Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [id])"
        }
      ]
    }
  ],
  "summary": "Vulnerabilidade critica de SQL injection encontrada.",
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

Verdict: `PASS` | `FAIL` | `WARNING`. Score: 1-10. Finding severity: `HIGH` | `MEDIUM` | `LOW`. Line can be `null`.

### `second_opinion_verify`

Fact-check a technical claim.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `claim` | string | yes | The claim to verify |
| `context` | string | no | Additional context |

```json
{
  "verdict": "PARTIAL",
  "confidence": "MEDIUM",
  "explanation": "Redis WATCH monitora chaves, mas nao garante isolamento total como locks tradicionais.",
  "caveats": [
    "WATCH usa optimistic locking, nao bloqueia outros clientes",
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

Verdict: `YES` | `NO` | `PARTIAL` | `OUTDATED` | `UNCERTAIN`. Confidence: `HIGH` | `MEDIUM` | `LOW`.

### `second_opinion_compare`

Compare two approaches with per-criterion breakdown.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `approach_a` | `{name, description}` | yes | First approach |
| `approach_b` | `{name, description}` | yes | Second approach |
| `criteria` | string[] | no | Comparison criteria (default: performance, maintainability, complexity, scalability) |
| `context` | string | yes | Context for the comparison |

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
      "reason": "Redis tem TTL nativo e pub/sub, facilitando gerenciamento de sessoes"
    }
  ],
  "recommendation": "Redis e a melhor escolha para sessoes. TTL nativo elimina logica de expiracao manual.",
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

Winner: `APPROACH_A` | `APPROACH_B` | `TIE` | `DEPENDS`. Per-criterion winner: `APPROACH_A` | `APPROACH_B` | `TIE`.

## How It Works

- Your AI tool calls one of the 4 MCP tools with structured input
- The server builds a prompt that forces JSON-only output for the configured provider (Gemini, OpenAI, Groq, or DeepSeek)
- The response goes through a parse pipeline: `JSON.parse` -> retry with correction prompt -> regex extraction
- The parsed object is validated against a Zod schema. If it passes, the structured verdict is returned to the caller

Every response follows a fixed schema. No markdown, no chat, no surprises.

## Configuration

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GROQ_API_KEY` | Groq API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `SECOND_OPINION_PROVIDER` | Force a specific provider (skips auto-detection) |
| `SECOND_OPINION_MODEL` | Force a specific model (overrides provider default) |

Only one API key is required. See `.env.example` for details and links to get each key.

## Limitations

- Responses are in Brazilian Portuguese (pt-BR) by default
- One provider at a time (no multi-provider consensus)
- 30-second timeout per request
- Rate limits depend on your provider plan (free tiers have lower limits; paid plans remove most restrictions)
- LLM responses are non-deterministic; the same input may produce different verdicts across calls

## License

MIT
