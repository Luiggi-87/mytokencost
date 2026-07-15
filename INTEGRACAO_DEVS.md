# Guia de Integração MyTokenCost para Devs

Seu gerente criou uma chave de acesso pro seu projeto. Siga este guia pra registrar custos de API automaticamente.

---

## **O que copiar e mandar pro seu dev**

A forma mais simples: vá na aba **Integração** do MyTokenCost, seção **"Exemplo de Código"**, e clique em **"Copiar Código Completo"**. Isso copia um bloco de código já preenchido com seu token, projeto e API — cole exatamente assim numa mensagem pro dev, sem precisar explicar mais nada.

O código copiado se parece com isto:

```javascript
import { CountedAnthropic } from '@mtc-247ia/anthropic-proxy';

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,
  token: 'eyJhbGc...',        // já preenchido pelo sistema
  projectId: 'a9af06d3-...',  // já preenchido pelo sistema
  apiId: '9d209942-...',      // já preenchido pelo sistema
  backendUrl: 'https://mytokencost.up.railway.app'
});

// Use normalmente - custos registram automaticamente
const msg = await client.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Olá' }]
});
```

O dev só precisa: (1) instalar `npm install @mtc-247ia/anthropic-proxy`, (2) trocar o import do `Anthropic` normal pelo `CountedAnthropic`, (3) colar a chave real da Anthropic na variável de ambiente `ANTHROPIC_KEY`. Nada mais muda no código dele.

---

## **OPÇÃO FÁCIL: Validar Chave do Provider Diretamente**

Se o dev preferir só usar a própria chave da Anthropic sem configurar token/IDs:

### 1. Descubra as informações da chave
```bash
curl -X POST https://mytokencost.up.railway.app/api/integrations/validate-key \
  -H "Content-Type: application/json" \
  -d '{"provider_key": "sk-ant-xxxxx"}'
```

Retorna (modelos testados em paralelo, com preço de cada um):
```json
{
  "provider": "anthropic",
  "name": "Anthropic Claude",
  "is_valid": true,
  "models_tested": [
    { "model": "claude-opus-4-8", "status": "active", "pricing": { "input_per_million": 5, "output_per_million": 25 } },
    { "model": "claude-sonnet-5", "status": "active", "pricing": { "input_per_million": 3, "output_per_million": 15 } },
    { "model": "claude-haiku-4-5", "status": "active", "pricing": { "input_per_million": 1, "output_per_million": 5 } }
  ]
}
```

Pra Bedrock e Azure (que não têm uma chave única), manda `provider` explícito + os campos extras em vez de `provider_key`:
```bash
# Bedrock
curl -X POST https://mytokencost.up.railway.app/api/integrations/validate-key \
  -H "Content-Type: application/json" \
  -d '{"provider": "bedrock", "access_key_id": "AKIA...", "secret_access_key": "...", "region": "us-east-1"}'

# Azure OpenAI
curl -X POST https://mytokencost.up.railway.app/api/integrations/validate-key \
  -H "Content-Type: application/json" \
  -d '{"provider": "azure", "provider_key": "sua-chave", "endpoint": "https://SEU-RECURSO.openai.azure.com", "deployment": "meu-deployment"}'
```

---

## **OPÇÃO TRADICIONAL: Os 5 Dados que Você Precisa** (se preferir configurar manualmente)

1. **MYTOKENCOST_TOKEN** — JWT de acesso (aba Integração → "Copiar Token")
2. **PROJECT_ID** — ID do projeto (aba Integração → "Copiar Project ID")
3. **API_ID** — ID da API (aba Integração → "Copiar API ID")
4. **ANTHROPIC_KEY** — a chave real da Anthropic (você fornece)
5. **BACKEND_URL** — `https://mytokencost.up.railway.app`

Adicione ao `.env` do dev:
```
MYTOKENCOST_TOKEN=eyJhbGc...
PROJECT_ID=a9af06d3-...
API_ID=9d209942-...
ANTHROPIC_KEY=sk-ant-xxxxx
BACKEND_URL=https://mytokencost.up.railway.app
```

---

## **Node.js (JavaScript/TypeScript) — Completo**

### 1. Instale o SDK
```bash
npm install @mtc-247ia/anthropic-proxy
```

### 2. Troque no código
**Antes:**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_KEY
});

const msg = await client.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Olá' }]
});
```

**Depois (com tracking):**
```javascript
import { CountedAnthropic } from '@mtc-247ia/anthropic-proxy';

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: process.env.PROJECT_ID,
  apiId: process.env.API_ID,
  backendUrl: process.env.BACKEND_URL,
  debug: true // opcional: mostra logs
});

const msg = await client.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Olá' }]
});
// ✅ Custo registrado automaticamente!
```

---

## **Python (com Anthropic)**

Para Python, o dev precisa criar um wrapper simples (o SDK ainda não existe em Python):

```python
import os
import requests
from anthropic import Anthropic

MODEL_PRICES = {
    'claude-opus-4-8': {'input': 0.000005, 'output': 0.000025},
    'claude-sonnet-5': {'input': 0.000003, 'output': 0.000015},
    'claude-haiku-4-5': {'input': 0.000001, 'output': 0.000005},
}

class CountedAnthropic(Anthropic):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.mytokencost_token = os.getenv('MYTOKENCOST_TOKEN')
        self.project_id = os.getenv('PROJECT_ID')
        self.api_id = os.getenv('API_ID')
        self.backend_url = os.getenv('BACKEND_URL', 'https://mytokencost.up.railway.app')

    def _record_cost(self, model, input_tokens, output_tokens):
        """Registra custo no MyTokenCost"""
        try:
            total_tokens = input_tokens + output_tokens
            pricing = MODEL_PRICES.get(model, MODEL_PRICES['claude-sonnet-5'])
            cost = input_tokens * pricing['input'] + output_tokens * pricing['output']

            requests.post(
                f'{self.backend_url}/api/costs',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.mytokencost_token}'
                },
                json={
                    'project_id': self.project_id,
                    'api_id': self.api_id,
                    'amount': cost,
                    'units': total_tokens,
                    'unit_type': 'tokens',
                    'description': f'Claude {model} - {input_tokens}in + {output_tokens}out'
                }
            )
        except Exception as e:
            print(f'Erro ao registrar custo: {e}')

# Uso:
client = CountedAnthropic(api_key=os.getenv('ANTHROPIC_KEY'))

response = client.messages.create(
    model='claude-sonnet-5',
    max_tokens=1024,
    messages=[{'role': 'user', 'content': 'Olá'}]
)

# Registra o custo
client._record_cost(
    response.model,
    response.usage.input_tokens,
    response.usage.output_tokens
)

print(response.content[0].text)
```

---

## **Go**

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/anthropics/anthropic-sdk-go"
)

type CostData struct {
	ProjectID   string  `json:"project_id"`
	APIID       string  `json:"api_id"`
	Amount      float64 `json:"amount"`
	Units       int     `json:"units"`
	UnitType    string  `json:"unit_type"`
	Description string  `json:"description"`
}

func recordCost(model string, inputTokens, outputTokens int) error {
	token := os.Getenv("MYTOKENCOST_TOKEN")
	projectID := os.Getenv("PROJECT_ID")
	apiID := os.Getenv("API_ID")
	backendURL := os.Getenv("BACKEND_URL")

	prices := map[string]map[string]float64{
		"claude-opus-4-8":  {"input": 0.000005, "output": 0.000025},
		"claude-sonnet-5":  {"input": 0.000003, "output": 0.000015},
		"claude-haiku-4-5": {"input": 0.000001, "output": 0.000005},
	}

	pricing := prices[model]
	cost := float64(inputTokens)*pricing["input"] + float64(outputTokens)*pricing["output"]

	data := CostData{
		ProjectID:   projectID,
		APIID:       apiID,
		Amount:      cost,
		Units:       inputTokens + outputTokens,
		UnitType:    "tokens",
		Description: fmt.Sprintf("Claude %s - %din + %dout", model, inputTokens, outputTokens),
	}

	jsonData, _ := json.Marshal(data)
	req, _ := http.NewRequest("POST", backendURL+"/api/costs", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	_, err := client.Do(req)
	return err
}

func main() {
	client := anthropic.NewClient()

	response, _ := client.Messages.New(context.Background(), anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeSonnet5,
		MaxTokens: 1024,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock("Olá")),
		},
	})

	recordCost(
		string(response.Model),
		int(response.Usage.InputTokens),
		int(response.Usage.OutputTokens),
	)
}
```

---

## **Resumo: O que Mudou?**

| Stack | O que fazer |
|-------|-----------|
| **Node.js** | Instalar `@mtc-247ia/anthropic-proxy`, trocar 1 import + 1 construtor |
| **Python** | Criar wrapper `CountedAnthropic`, chamar `_record_cost()` após cada request |
| **Go** | Criar função `recordCost()`, chamar após cada request |
| **Outro** | Fazer POST pro `/api/costs` com os dados do custo (model, tokens, valor) |

---

## **Modelos Suportados (Claude)**

| Modelo | Input | Output |
|--------|-------|--------|
| `claude-opus-4-8` | $5.00 / 1M tokens | $25.00 / 1M tokens |
| `claude-sonnet-5` | $3.00 / 1M tokens | $15.00 / 1M tokens |
| `claude-haiku-4-5` | $1.00 / 1M tokens | $5.00 / 1M tokens |

---

## **Outros Provedores com Pacote Pronto**

Além da Anthropic, também temos SDK proxy pronto pra:

| Provedor | Pacote | Import |
|----------|--------|--------|
| OpenAI | `@mtc-247ia/openai-proxy` | `import { CountedOpenAI } from '@mtc-247ia/openai-proxy'` |
| Google Gemini | `@mtc-247ia/gemini-proxy` | `import { CountedGemini } from '@mtc-247ia/gemini-proxy'` |
| Groq | `@mtc-247ia/groq-proxy` | `import { CountedGroq } from '@mtc-247ia/groq-proxy'` |
| Mistral AI | `@mtc-247ia/mistral-proxy` | `import { CountedMistral } from '@mtc-247ia/mistral-proxy'` |
| Cohere | `@mtc-247ia/cohere-proxy` | `import { CountedCohere } from '@mtc-247ia/cohere-proxy'` |
| Perplexity AI | `@mtc-247ia/perplexity-proxy` | `import { CountedPerplexity } from '@mtc-247ia/perplexity-proxy'` |
| Together AI | `@mtc-247ia/together-proxy` | `import { CountedTogether } from '@mtc-247ia/together-proxy'` |

O padrão de uso é o mesmo em todos: instala o pacote, troca o import do SDK oficial pela versão `Counted*`, passa `token`/`projectId`/`apiId`/`backendUrl` no construtor. O nome do método de chat varia por provedor (ex: `chat.completions.create` na maioria, mas `chat.complete` na Mistral e `chat` direto na Cohere) — a aba **Integração** do MyTokenCost já gera o código certo pra cada um quando você seleciona a API.

---

## **Provedores "Especiais" (não encaixam no padrão de 1 chave)**

Esses 5 também têm pacote pronto, mas funcionam diferente dos demais — vale saber a diferença antes de integrar:

| Provedor | Pacote | Por que é diferente |
|----------|--------|----------------------|
| Hugging Face | `@mtc-247ia/huggingface-proxy` | Cobra por **tempo de execução** (segundos), não por token — não há preço fixo por modelo |
| Replicate | `@mtc-247ia/replicate-proxy` | Cobra por **tempo de computação** (`predict_time`, varia por hardware) |
| Firecrawl | `@mtc-247ia/firecrawl-proxy` | Não é um LLM — é raspagem de site (scrape/crawl/search), cobra em **créditos** |
| AWS Bedrock | `@mtc-247ia/bedrock-proxy` | Autentica com **Access Key + Secret Key + Região** (AWS SigV4), não uma chave única |
| Azure OpenAI | `@mtc-247ia/azure-openai-proxy` | Autentica com **Endpoint + Deployment Name + chave**, não uma chave única |

```javascript
// Hugging Face / Replicate: unit_type "seconds" — custo = duração × pricePerSecond (ajuste ao seu plano)
import { CountedHuggingFace } from '@mtc-247ia/huggingface-proxy';
const hf = new CountedHuggingFace({ apiKey: process.env.HF_TOKEN, token, projectId, apiId, backendUrl });
await hf.chatCompletion({ model: 'Qwen/Qwen3-32B', messages: [{ role: 'user', content: 'Olá' }] });

// Firecrawl: unit_type "credits" — não é chat completion
import { CountedFirecrawl } from '@mtc-247ia/firecrawl-proxy';
const fc = new CountedFirecrawl({ apiKey: process.env.FIRECRAWL_API_KEY, token, projectId, apiId, backendUrl });
await fc.scrape('https://example.com');

// Bedrock: precisa de accessKeyId + secretAccessKey + region (não apiKey)
import { CountedBedrockRuntime, ConverseCommand } from '@mtc-247ia/bedrock-proxy';
const bedrock = new CountedBedrockRuntime({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1', token, projectId, apiId, backendUrl
});
await bedrock.send(new ConverseCommand({
  modelId: 'anthropic.claude-sonnet-5',
  messages: [{ role: 'user', content: [{ text: 'Olá' }] }]
}));

// Azure OpenAI: precisa de endpoint + deployment (não só apiKey)
import { CountedAzureOpenAI } from '@mtc-247ia/azure-openai-proxy';
const azure = new CountedAzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deployment: 'meu-deployment', model: 'gpt-4o',
  token, projectId, apiId, backendUrl
});
await azure.chat.completions.create({ messages: [{ role: 'user', content: 'Olá' }] });
```

Pra Bedrock e Azure, a aba **Integração** mostra campos extras (Access Key/Secret/Região ou Endpoint/Deployment) em vez do campo único de chave, tanto pra gerar o código quanto pra validar/testar a credencial.

---

## **Teste Rápido**

Para verificar se está funcionando:
1. Faça uma chamada de API
2. Vá pra aba "Dashboard" no MyTokenCost
3. Veja o custo aparecer em tempo real em "Por API"

✅ Se apareceu = tudo certo!
❌ Se não apareceu = verifique token/IDs

---

## **Dúvidas?**

Peça ao seu gerente para verificar os dados no MyTokenCost → aba **Integração**.
