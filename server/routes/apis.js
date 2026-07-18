import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pricesPath = path.join(__dirname, '..', 'prices.json');
const prices = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));

const router = express.Router();
router.use(authMiddleware);

const API_TYPES = {
  anthropic: { name: 'Anthropic Claude', icon: '🧠' },
  openai: { name: 'OpenAI', icon: '🤖' },
  google: { name: 'Google AI Studio', icon: '🔍' },
  firecrawl: { name: 'Firecrawl', icon: '🔥' },
  huggingface: { name: 'Hugging Face', icon: '🤗' },
  cohere: { name: 'Cohere', icon: '📝' },
  mistral: { name: 'Mistral', icon: '⚡' },
  groq: { name: 'Groq', icon: '⚙️' },
  replicate: { name: 'Replicate', icon: '🎬' },
  perplexity: { name: 'Perplexity AI', icon: '🔎' },
  bedrock: { name: 'AWS Bedrock', icon: '☁️' },
  azure: { name: 'Azure OpenAI', icon: '☁️' },
  together: { name: 'Together AI', icon: '🤝' },
  other: { name: 'Outro', icon: '📦' }
};

// GET todas as APIs do usuário
router.get('/', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM apis WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tipos de API disponíveis
router.get('/types', (req, res) => {
  res.json(API_TYPES);
});

// GET preços de um provedor (modelos e seus custos)
router.get('/pricing/:provider', (req, res) => {
  const provider = req.params.provider;
  if (!prices[provider]) {
    return res.status(404).json({ error: `Provedor não encontrado: ${provider}` });
  }
  res.json(prices[provider]);
});

// POST nova API
router.post('/', async (req, res) => {
  try {
    const { name, type, api_key, base_url, pricing_model, unit_cost, model, project_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO apis (id, user_id, name, type, api_key, base_url, pricing_model, unit_cost, model, project_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbRun(sql, [id, req.userId, name, type, api_key || null, base_url || null, pricing_model, unit_cost || 0, model || null, project_id || null]);
    res.status(201).json({ id, name, type, pricing_model, unit_cost, model, project_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT atualizar API
router.put('/:id', async (req, res) => {
  try {
    const { name, type, api_key, base_url, pricing_model, unit_cost, model, project_id } = req.body;
    const { id } = req.params;

    const sql = `
      UPDATE apis
      SET name = ?, type = ?, api_key = ?, base_url = ?, pricing_model = ?, unit_cost = ?, model = ?, project_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    await dbRun(sql, [name, type, api_key, base_url, pricing_model, unit_cost, model || null, project_id || null, id, req.userId]);
    res.json({ id, name, type, updated_at: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE API
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM apis WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'API removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
