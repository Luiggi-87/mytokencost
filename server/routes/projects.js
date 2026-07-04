import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { dbRun, dbGet, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET todos os projetos do usuário
router.get('/', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo projeto
router.post('/', async (req, res) => {
  try {
    const { name, client_name, description, monthly_rate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do projeto é obrigatório' });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO projects (id, user_id, name, client_name, description, monthly_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await dbRun(sql, [id, req.userId, name, client_name || null, description || null, monthly_rate || 0]);
    res.status(201).json({ id, name, client_name, monthly_rate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT atualizar projeto
router.put('/:id', async (req, res) => {
  try {
    const { name, client_name, description, monthly_rate } = req.body;
    const { id } = req.params;

    const sql = `
      UPDATE projects
      SET name = ?, client_name = ?, description = ?, monthly_rate = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    await dbRun(sql, [name, client_name, description, monthly_rate, id, req.userId]);
    res.json({ id, name, updated_at: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE projeto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Primeiro deleta os custos associados
    await dbRun('DELETE FROM costs WHERE project_id = ? AND user_id = ?', [id, req.userId]);

    // Depois deleta o projeto
    await dbRun('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Projeto removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
