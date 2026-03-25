# gemini-second-opinion-mcp

MCP server that gives Claude Code access to Google Gemini as a second opinion. Ask technical questions, get code reviews, verify claims, and compare approaches — all powered by Gemini 2.5 Flash.

## Prerequisites

- Node.js 20+
- Gemini API key (free tier available)

## Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key

## Installation

### Build the project

```bash
cd C:\Users\mauri\Desktop\Projetos_Pessoais\MCP-Cerebro-2
npm install
npm run build
```

### Add to Claude Code

```bash
claude mcp add gemini-second-opinion -s user -e GEMINI_API_KEY=<your-key> -- node C:\Users\mauri\Desktop\Projetos_Pessoais\MCP-Cerebro-2\dist\index.js
```

Replace `<your-key>` with your actual Gemini API key.

## Tools

### gemini_ask

General-purpose questions to Gemini. Use for technical doubts, quick consultations, or when you need a second perspective.

**Parameters:**
- `question` (string, required): The question
- `context` (string, optional): Additional context (code snippet, tech stack, etc.)

**Example:**
```
gemini_ask(question: "Is it safe to use JWT tokens in localStorage?", context: "Next.js app with Supabase auth")
```

### gemini_review_code

Send code to Gemini for review. Returns bugs, risks, and suggestions.

**Parameters:**
- `code` (string, required): The code or diff to review
- `context` (string, required): Project context
- `focus` (string, optional): Review focus (e.g., "security", "performance", "race conditions")

**Example:**
```
gemini_review_code(
  code: "async function processWebhook(req) { const data = JSON.parse(req.body); await db.insert(data); return 200; }",
  context: "FastAPI webhook handler for WhatsApp messages",
  focus: "security"
)
```

### gemini_verify_claim

Verify if a technical claim is true. Use when unsure about API behavior, compatibility, or technical facts.

**Parameters:**
- `claim` (string, required): The claim to verify
- `technology` (string, optional): Related technology

**Example:**
```
gemini_verify_claim(claim: "Python asyncio.gather() cancels all tasks if one fails", technology: "Python 3.12 asyncio")
```

### gemini_compare

Compare two technical approaches and get a recommendation for the given context.

**Parameters:**
- `approach_a` (string, required): First approach
- `approach_b` (string, required): Second approach
- `context` (string, required): Context and criteria

**Example:**
```
gemini_compare(
  approach_a: "Redis pub/sub for real-time notifications",
  approach_b: "PostgreSQL LISTEN/NOTIFY for real-time notifications",
  context: "SaaS with 500 concurrent users, already using PostgreSQL and Redis for caching"
)
```

## Free Tier Limits

- 15 requests per minute
- 1 million tokens per day
- Gemini 2.5 Flash model

See [Google AI pricing](https://ai.google.dev/pricing) for current limits.

## Development

```bash
npm run dev    # Watch mode (recompiles on change)
npm run build  # One-time build
npm start      # Run the server
```
