# second-opinion-mcp

Leia em ingles: [English](README.md)

Servidor MCP que da a qualquer ferramenta de IA uma segunda opiniao estruturada de outro provedor de IA.

## Por Que Isso Existe

Assistentes de IA alucinam, perdem bugs e dao conselhos desatualizados. Este servidor permite que eles verifiquem respostas com um provedor de IA diferente e recebam um veredito legivel por maquina. Nada de chat ou markdown -- schemas JSON fixos com enums (`YES`/`NO`, `PASS`/`FAIL`), niveis de confianca e arrays de evidencias, tudo validado com Zod.

## Provedores

| Provedor | Variavel | Modelo Padrao | Preco |
|----------|----------|---------------|-------|
| Gemini | `GEMINI_API_KEY` | gemini-2.5-flash | Tier gratuito disponivel (pode exigir faturamento ativo no Google Cloud). Planos pagos para mais limites |
| OpenAI | `OPENAI_API_KEY` | gpt-4.1-mini | Pago por uso (exige faturamento) |
| Groq | `GROQ_API_KEY` | llama-3.3-70b-versatile | Tier gratuito disponivel, planos pagos para mais limites |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat | Pago por uso (exige faturamento) |

Configure uma chave de API e o servidor detecta automaticamente o provedor. Ordem de deteccao: Gemini > OpenAI > Groq > DeepSeek.

## Inicio Rapido

### Claude Code (um comando)

```bash
# Com Gemini (tier gratuito)
claude mcp add second-opinion -s user -e GEMINI_API_KEY=sua-chave -- npx @mrssoftwares/second-opinion-mcp

# Com OpenAI
claude mcp add second-opinion -s user -e OPENAI_API_KEY=sua-chave -- npx @mrssoftwares/second-opinion-mcp

# Com Groq (tier gratuito)
claude mcp add second-opinion -s user -e GROQ_API_KEY=sua-chave -- npx @mrssoftwares/second-opinion-mcp

# Com DeepSeek
claude mcp add second-opinion -s user -e DEEPSEEK_API_KEY=sua-chave -- npx @mrssoftwares/second-opinion-mcp
```

### Outros Clientes MCP (config JSON)

```json
{
  "mcpServers": {
    "second-opinion": {
      "command": "npx",
      "args": ["@mrssoftwares/second-opinion-mcp"],
      "env": {
        "GEMINI_API_KEY": "sua-chave-aqui"
      }
    }
  }
}
```

### A Partir do Codigo Fonte

```bash
git clone https://github.com/mauricioreiss/second-opinion-mcp.git
cd second-opinion-mcp
npm install && npm run build
```

## Ferramentas

### `second_opinion_ask`

Faz uma pergunta tecnica. Retorna um veredito, nao uma parede de texto.

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `question` | string | sim | A pergunta tecnica |
| `context` | string | nao | Contexto adicional |

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

Veredito: `YES` | `NO` | `PARTIAL` | `UNCERTAIN`. Confianca: `HIGH` | `MEDIUM` | `LOW`.

### `second_opinion_review`

Code review com achados estruturados por criterio.

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `code` | string | sim | Codigo ou diff para revisar |
| `language` | string | nao | Linguagem (detectada automaticamente se omitido) |
| `focus` | string[] | nao | Criterios de revisao (padrao: security, performance, correctness, error-handling) |

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

Veredito: `PASS` | `FAIL` | `WARNING`. Score: 1-10. Severidade dos achados: `HIGH` | `MEDIUM` | `LOW`. Line pode ser `null`.

### `second_opinion_verify`

Verifica a veracidade de uma afirmacao tecnica.

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `claim` | string | sim | A afirmacao a verificar |
| `context` | string | nao | Contexto adicional |

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

Veredito: `YES` | `NO` | `PARTIAL` | `OUTDATED` | `UNCERTAIN`. Confianca: `HIGH` | `MEDIUM` | `LOW`.

### `second_opinion_compare`

Compara duas abordagens com analise por criterio.

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `approach_a` | `{name, description}` | sim | Primeira abordagem |
| `approach_b` | `{name, description}` | sim | Segunda abordagem |
| `criteria` | string[] | nao | Criterios de comparacao (padrao: performance, maintainability, complexity, scalability) |
| `context` | string | sim | Contexto da comparacao |

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

Vencedor: `APPROACH_A` | `APPROACH_B` | `TIE` | `DEPENDS`. Vencedor por criterio: `APPROACH_A` | `APPROACH_B` | `TIE`.

## Como Funciona

- Sua ferramenta de IA chama uma das 4 ferramentas MCP com input estruturado
- O servidor monta um prompt que forca output apenas em JSON para o provedor configurado (Gemini, OpenAI, Groq ou DeepSeek)
- A resposta passa por um pipeline de parsing: `JSON.parse` -> retry com prompt de correcao -> extracao via regex
- O objeto parseado e validado contra um schema Zod. Se passar, o veredito estruturado e retornado ao chamador

Toda resposta segue um schema fixo. Sem markdown, sem chat, sem surpresas.

## Configuracao

| Variavel | Descricao |
|----------|-----------|
| `GEMINI_API_KEY` | Chave da API do Google Gemini |
| `OPENAI_API_KEY` | Chave da API da OpenAI |
| `GROQ_API_KEY` | Chave da API do Groq |
| `DEEPSEEK_API_KEY` | Chave da API do DeepSeek |
| `SECOND_OPINION_PROVIDER` | Forca um provedor especifico (ignora auto-deteccao) |
| `SECOND_OPINION_MODEL` | Forca um modelo especifico (sobrescreve o padrao do provedor) |

Apenas uma chave de API e necessaria. Veja `.env.example` para detalhes e links para obter cada chave.

## Limitacoes

- Respostas em portugues brasileiro (pt-BR) por padrao
- Um provedor por vez (sem consenso multi-provedor)
- Timeout de 30 segundos por requisicao
- Limites de rate dependem do seu plano no provedor (tiers gratuitos tem limites menores; planos pagos removem a maioria das restricoes)
- O tier gratuito do Gemini pode retornar erros 503 se o faturamento nao estiver ativo no seu projeto Google Cloud ou se a cota gratuita for excedida. Se isso acontecer, ative o faturamento em https://console.cloud.google.com/billing ou troque de provedor
- Respostas de LLMs sao nao-deterministicas; o mesmo input pode gerar vereditos diferentes entre chamadas

## Licenca

MIT
