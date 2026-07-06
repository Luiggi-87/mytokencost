# Guia de Integração MyTokenCost para Devs

Seu gerente criou uma chave de acesso pro seu projeto. Siga este guia pra registrar custos de API automaticamente.

---

## **Os 5 Dados que Você Precisa**

Seu gerente vai fornecer:
1. **MYTOKENCOST_TOKEN** — JWT de acesso
2. **PROJECT_ID** — ID do seu projeto
3. **API_ID** — ID da API (Anthropic, OpenAI, etc)
4. **ANTHROPIC_KEY** (ou sua chave da API) — sua chave real
5. **BACKEND_URL** — padrão: `https://mytokencost.up.railway.app`

Adicione ao seu `.env`:
```
MYTOKENCOST_TOKEN=eyJhbGc...
PROJECT_ID=01469db5-8cb9-...
API_ID=e980666b-b3ee-...
ANTHROPIC_KEY=sk-ant-xxxxx
BACKEND_URL=https://mytokencost.up.railway.app
```

---

## **Node.js (JavaScript/TypeScript)**

### 1. Instale o SDK
```bash
npm install @contador-tokens/anthropic-proxy
```

### 2. Use no seu código
**Antes (seu código atual):**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_KEY
});

const msg = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Olá' }]
});
```

**Depois (com tracking):**
```javascript
import { CountedAnthropic } from '@contador-tokens/anthropic-proxy';

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: process.env.PROJECT_ID,
  apiId: process.env.API_ID,
  backendUrl: process.env.BACKEND_URL,
  debug: true // opcional: mostra logs
});

const msg = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Olá' }]
});
// ✅ Custo registrado automaticamente!
```

---

## **Python (com Anthropic)**

Para Python, você precisa criar um wrapper simples (seu SDK não existe ainda em Python):

```python
import os
import requests
from anthropic import Anthropic

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
            # Usar preços do seu modelo
            prices = {
                'claude-3-5-sonnet-20241022': {'input': 0.000003, 'output': 0.000015},
                'claude-3-opus-20250219': {'input': 0.000015, 'output': 0.00075},
            }
            pricing = prices.get(model, prices['claude-3-5-sonnet-20241022'])
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
    model='claude-3-5-sonnet-20241022',
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
		"claude-3-5-sonnet-20241022": {"input": 0.000003, "output": 0.000015},
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

	response, _ := client.Messages.New(context.Background(), &anthropic.MessageNewParams{
		Model:     anthropic.F("claude-3-5-sonnet-20241022"),
		MaxTokens: anthropic.F(int64(1024)),
		Messages: anthropic.F([]anthropic.MessageParamUnion{
			anthropic.UserMessage("Olá"),
		}),
	})

	recordCost(
		"claude-3-5-sonnet-20241022",
		int(response.Usage.InputTokens),
		int(response.Usage.OutputTokens),
	)
}
```

---

## **Resumo: O que Muda?**

| Stack | O que fazer |
|-------|-----------|
| **Node.js** | Instalar `@contador-tokens/anthropic-proxy`, trocar 1 import + 1 construtor |
| **Python** | Criar wrapper `CountedAnthropic`, chamar `_record_cost()` após cada request |
| **Go** | Criar função `recordCost()`, chamar após cada request |
| **Outro** | Fazer POST pro `/api/costs` com os dados do custo (model, tokens, valor) |

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
