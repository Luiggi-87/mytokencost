# ⚡ MyTokenCost - Quick Start (5 min)

## 1️⃣ Install

```bash
npm install
```

## 2️⃣ Run

**Windows:**
```bash
npm run dev
# or double-click start.bat
```

**Mac/Linux:**
```bash
npm run dev
# or: bash start.sh
```

## 3️⃣ Access

Open in browser:
```
http://localhost:3001
```

## 4️⃣ Configurar APIs

1. Vá para aba **🔌 APIs**
2. Clique **➕ Adicionar Nova API**
3. Preencha:
   - Nome: Ex: "Anthropic Claude"
   - Tipo: Selecione da lista
   - API Key: (opcional, apenas local)
   - Modelo de Preço: "Por Token"
   - Custo: Ex: 0.000003 (R$ por token)
4. Clique **Adicionar**

### Exemplos de Preço (atualizar conforme necessário)

**Anthropic Claude 3.5 Sonnet**
- Input: R$ 0.000002 por token
- Output: R$ 0.00001 por token

**OpenAI GPT-4**
- Input: R$ 0.000015 por token
- Output: R$ 0.00006 por token

**Google Gemini**
- Input: R$ 0.00000025 por token
- Output: R$ 0.000001 por token

## 5️⃣ Criar Projeto

1. Vá para **📁 Projetos**
2. Clique **➕ Novo Projeto**
3. Preencha:
   - Nome do Projeto: "Agente de Vendas"
   - Cliente: "Empresa XYZ"
   - Taxa Mensal: Deixe 0 se não souber
4. Clique **Criar**

## 6️⃣ Registrar Custo

1. Vá para **💸 Custos**
2. Clique **Registrar Custo**
3. Preencha:
   - Projeto: "Agente de Vendas"
   - API: "Anthropic Claude"
   - Valor: 0.15 (exemplo em R$)
   - Quantidade: 5000 (tokens)
4. Clique **Registrar Custo**

## 7️⃣ Ver Dashboard

Volte para **📊 Dashboard** e veja:
- Total gasto
- Custos por API
- Custos por Projeto

---

## 🔄 Fluxo Completo

```
1. Adicionar API (preços, tipos)
   ↓
2. Criar Projeto (cliente/app)
   ↓
3. Usar a API (chamadas no seu app)
   ↓
4. Registrar Custo (quanto gastou)
   ↓
5. Ver no Dashboard (análise visual)
   ↓
6. Cobrar Cliente (use os dados)
```

---

## 📱 Testar Endpoints

### Listar APIs
```bash
curl http://localhost:3001/api/apis
```

### Listar Projetos
```bash
curl http://localhost:3001/api/projects
```

### Dashboard
```bash
curl http://localhost:3001/api/dashboard/summary
```

### Health Check
```bash
curl http://localhost:3001/api/health
```

---

## 🚀 Deploy (Próximo Passo)

Ver [DEPLOY.md](DEPLOY.md) para Netlify, Railway, Docker, etc.

---

## ❓ Dúvidas Comuns

**P: Posso usar sem internet?**
R: Sim, tudo roda localmente. Apenas configure as APIs manualmente.

**P: Os dados ficam seguros?**
R: Sim, SQLite local. Nenhum dado sai do seu computador.

**P: Como exportar dados?**
R: Futura feature. Por enquanto, o SQLite pode ser consultado diretamente.

**P: Precisa de servidor dedicado?**
R: Não agora. Depois você pode hospedar na Netlify, Railway, etc.

**P: Como sincronizar com as APIs reais?**
R: Implementação futura. Por enquanto é manual.

---

Qualquer dúvida, veja os arquivos:
- [README.md](README.md) - Documentação completa
- [DEPLOY.md](DEPLOY.md) - Como hospedar online
