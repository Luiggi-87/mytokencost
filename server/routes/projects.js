import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET todos os projetos do usuário
router.get('/', (req, res) => {
  db.all('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST novo projeto
router.post('/', (req, res) => {
  const { name, client_name, description, monthly_rate } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome do projeto é obrigatório' });
  }

  const id = uuidv4();
  const sql = `
    INSERT INTO projects (id, user_id, name, client_name, description, monthly_rate)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [id, req.userId, name, client_name || null, description || null, monthly_rate || 0], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, name, client_name, monthly_rate });
  });
});

// PUT atualizar projeto
router.put('/:id', (req, res) => {
  const { name, client_name, description, monthly_rate } = req.body;
  const { id } = req.params;

  const sql = `
    UPDATE projects
    SET name = ?, client_name = ?, description = ?, monthly_rate = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;

  db.run(sql, [name, client_name, description, monthly_rate, id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, name, updated_at: new Date() });
  });
});

// DELETE projeto
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Primeiro deleta os custos associados
  db.run('DELETE FROM costs WHERE project_id = ? AND user_id = ?', [id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Depois deleta o projeto
    db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, req.userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Projeto removido' });
    });
  });
});

export default router;
