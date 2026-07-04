# 📊 Dados de Exemplo - Para Teste

Execute os comandos abaixo via terminal para pré-popular com dados de exemplo.

## APIs Exemplo

```bash
# Anthropic
curl -X POST http://localhost:3001/api/apis \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anthropic Claude 3.5",
    "type": "anthropic",
    "pricing_model": "por_token",
    "unit_cost": 0.0000015
  }'

# OpenAI
curl -X POST http://localhost:3001/api/apis \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI GPT-4",
    "type": "openai",
    "pricing_model": "por_token",
    "unit_cost": 0.000015
  }'

# Google
curl -X POST http://localhost:3001/api/apis \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google Gemini 1.5",
    "type": "google",
    "pricing_model": "por_token",
    "unit_cost": 0.00000075
  }'

# Firecrawl
curl -X POST http://localhost:3001/api/apis \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Firecrawl",
    "type": "firecrawl",
    "pricing_model": "por_requisicao",
    "unit_cost": 0.10
  }'
```

## Projetos Exemplo

```bash
# Projeto 1
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agente de Vendas AI",
    "client_name": "TechStartup Inc",
    "description": "ChatBot para qualificação de leads",
    "monthly_rate": 500
  }'

# Projeto 2
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Análise de Documentos",
    "client_name": "Consultoria ABC",
    "description": "Extrator de dados de PDFs",
    "monthly_rate": 800
  }'

# Projeto 3
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assistente de Email",
    "client_name": "Gerador de Suporte",
    "description": "Respostas automáticas com IA",
    "monthly_rate": 1200
  }'
```

## Custos Exemplo

Primeiro, obtenha os IDs das APIs e Projetos:

```bash
# Pegar IDs
curl http://localhost:3001/api/apis | jq '.[].id'
curl http://localhost:3001/api/projects | jq '.[].id'
```

Depois registre os custos (substitua os IDs):

```bash
# Exemplo com IDs fictícios
curl -X POST http://localhost:3001/api/costs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PROJETO_ID_AQUI",
    "api_id": "API_ID_AQUI",
    "amount": 45.50,
    "units": 30000,
    "unit_type": "tokens",
    "description": "Chamadas de Claude no agente"
  }'
```

## ⭐ Atalho: Script Python para Popular

Crie `populate.py`:

```python
import requests
import json

BASE_URL = "http://localhost:3001/api"

# APIs
apis = [
    {"name": "Anthropic Claude", "type": "anthropic", "pricing_model": "por_token", "unit_cost": 0.0000015},
    {"name": "OpenAI GPT-4", "type": "openai", "pricing_model": "por_token", "unit_cost": 0.000015},
    {"name": "Google Gemini", "type": "google", "pricing_model": "por_token", "unit_cost": 0.00000075},
    {"name": "Firecrawl", "type": "firecrawl", "pricing_model": "por_requisicao", "unit_cost": 0.10},
]

# Projetos
projects = [
    {"name": "Agente de Vendas", "client_name": "TechStartup", "monthly_rate": 500},
    {"name": "Análise de Docs", "client_name": "Consultoria", "monthly_rate": 800},
]

# Criar APIs
api_ids = []
for api in apis:
    r = requests.post(f"{BASE_URL}/apis", json=api)
    if r.status_code == 201:
        api_ids.append(r.json()["id"])
        print(f"✅ API criada: {api['name']}")

# Criar Projetos
project_ids = []
for proj in projects:
    r = requests.post(f"{BASE_URL}/projects", json=proj)
    if r.status_code == 201:
        project_ids.append(r.json()["id"])
        print(f"✅ Projeto criado: {proj['name']}")

# Criar Custos exemplo
for i, project_id in enumerate(project_ids):
    for j, api_id in enumerate(api_ids):
        cost = {
            "project_id": project_id,
            "api_id": api_id,
            "amount": 10 + (i * 5) + (j * 3),
            "units": 5000 + (i * 1000),
            "unit_type": "tokens"
        }
        r = requests.post(f"{BASE_URL}/costs", json=cost)
        if r.status_code == 201:
            print(f"✅ Custo registrado")

print("\n✨ Dados populados com sucesso!")
```

Execute:
```bash
pip install requests
python populate.py
```

---

## Verificar Dados

```bash
# Ver tudo
curl http://localhost:3001/api/dashboard/summary | jq .

# Ver histórico últimos 30 dias
curl http://localhost:3001/api/dashboard/monthly | jq .
```

