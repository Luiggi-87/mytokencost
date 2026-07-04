import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { dbRun, dbGet, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';

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

// POST nova API
router.post('/', async (req, res) => {
  try {
    const { name, type, api_key, base_url, pricing_model, unit_cost } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO apis (id, user_id, name, type, api_key, base_url, pricing_model, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbRun(sql, [id, req.userId, name, type, api_key || null, base_url || null, pricing_model, unit_cost || 0]);
    res.status(201).json({ id, name, type, pricing_model, unit_cost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT atualizar API
router.put('/:id', (req, res) => {
  const { name, type, api_key, base_url, pricing_model, unit_cost } = req.body;
  const { id } = req.params;

  const sql = `
    UPDATE apis
    SET name = ?, type = ?, api_key = ?, base_url = ?, pricing_model = ?, unit_cost = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;

  db.run(sql, [name, type, api_key, base_url, pricing_model, unit_cost, id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, name, type, updated_at: new Date() });
  });
});

// DELETE API
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM apis WHERE id = ? AND user_id = ?', [id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'API removida' });
  });
});

export default router;
