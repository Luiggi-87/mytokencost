# 📊 Dados de Exemplo - Para Teste

Todas as rotas abaixo (exceto register/login) exigem `Authorization: Bearer $TOKEN`.

## 0️⃣ Autenticar

```bash
BASE_URL="http://localhost:3001/api"   # ou https://mytokencost-production.up.railway.app/api

curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123","organizationName":"Teste"}'

# copie o "token" da resposta
TOKEN="cole-o-token-aqui"
```

## Esqueci a senha

```bash
curl -X POST $BASE_URL/auth/forgot-password -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com"}'
# sempre retorna a mesma mensagem genérica, exista ou não o email (evita enumeração de usuários)
# se SMTP_HOST não estiver configurado, o link com o token aparece no console/logs do servidor

curl -X POST $BASE_URL/auth/reset-password -H "Content-Type: application/json" \
  -d '{"token":"token-recebido-por-email-ou-log","newPassword":"nova-senha-123"}'
# token expira em 1h e só pode ser usado uma vez
```

## APIs Exemplo

```bash
curl -X POST $BASE_URL/apis -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Anthropic Claude 3.5","type":"anthropic","pricing_model":"por_token","unit_cost":0.0000015}'

curl -X POST $BASE_URL/apis -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"OpenAI GPT-4","type":"openai","pricing_model":"por_token","unit_cost":0.000015}'

curl -X POST $BASE_URL/apis -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Google Gemini 1.5","type":"google","pricing_model":"por_token","unit_cost":0.00000075}'

curl -X POST $BASE_URL/apis -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Firecrawl","type":"firecrawl","pricing_model":"por_requisicao","unit_cost":0.10}'
```

## Projetos Exemplo

```bash
curl -X POST $BASE_URL/projects -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Agente de Vendas AI","client_name":"TechStartup Inc","description":"ChatBot para qualificação de leads","monthly_rate":500}'

curl -X POST $BASE_URL/projects -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Análise de Documentos","client_name":"Consultoria ABC","description":"Extrator de dados de PDFs","monthly_rate":800}'
```

## Custos Exemplo

```bash
# Pegar IDs criados
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/apis
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/projects

# Registrar custo (substitua os IDs)
curl -X POST $BASE_URL/costs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"project_id":"PROJETO_ID_AQUI","api_id":"API_ID_AQUI","amount":45.50,"units":30000,"unit_type":"tokens","description":"Chamadas de Claude no agente"}'
```

## Script Python para popular tudo de uma vez

```python
import requests

BASE_URL = "http://localhost:3001/api"

# 1. Autenticar
r = requests.post(f"{BASE_URL}/auth/register", json={
    "email": "teste@example.com", "password": "senha123", "organizationName": "Teste"
})
token = r.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Criar APIs
apis = [
    {"name": "Anthropic Claude", "type": "anthropic", "pricing_model": "por_token", "unit_cost": 0.0000015},
    {"name": "OpenAI GPT-4", "type": "openai", "pricing_model": "por_token", "unit_cost": 0.000015},
    {"name": "Google Gemini", "type": "google", "pricing_model": "por_token", "unit_cost": 0.00000075},
]
api_ids = []
for api in apis:
    r = requests.post(f"{BASE_URL}/apis", json=api, headers=headers)
    if r.status_code == 201:
        api_ids.append(r.json()["id"])
        print(f"✅ API criada: {api['name']}")

# 3. Criar Projetos
projects = [
    {"name": "Agente de Vendas", "client_name": "TechStartup", "monthly_rate": 500},
    {"name": "Análise de Docs", "client_name": "Consultoria", "monthly_rate": 800},
]
project_ids = []
for proj in projects:
    r = requests.post(f"{BASE_URL}/projects", json=proj, headers=headers)
    if r.status_code == 201:
        project_ids.append(r.json()["id"])
        print(f"✅ Projeto criado: {proj['name']}")

# 4. Registrar Custos
for i, project_id in enumerate(project_ids):
    for j, api_id in enumerate(api_ids):
        cost = {
            "project_id": project_id, "api_id": api_id,
            "amount": 10 + (i * 5) + (j * 3), "units": 5000 + (i * 1000), "unit_type": "tokens"
        }
        r = requests.post(f"{BASE_URL}/costs", json=cost, headers=headers)
        if r.status_code == 201:
            print("✅ Custo registrado")

print("\n✨ Dados populados com sucesso!")
```

Execute: `pip install requests && python populate.py`

## Verificar Dados

```bash
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/dashboard/summary
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/dashboard/monthly
```
