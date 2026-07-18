import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET todos os clientes do usuário (opcionalmente filtrado por empresa)
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    const rows = company_id
      ? await dbAll('SELECT * FROM clients WHERE user_id = ? AND company_id = ? ORDER BY created_at DESC', [req.userId, company_id])
      : await dbAll('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo cliente
router.post('/', async (req, res) => {
  try {
    const { name, company_id } = req.body;

    if (!name || !company_id) {
      return res.status(400).json({ error: 'Nome e empresa são obrigatórios' });
    }

    const id = uuidv4();
    await dbRun('INSERT INTO clients (id, user_id, company_id, name) VALUES (?, ?, ?, ?)', [id, req.userId, company_id, name]);
    res.status(201).json({ id, name, company_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { name, company_id } = req.body;
    const { id } = req.params;

    await dbRun(
      'UPDATE clients SET name = ?, company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, company_id, id, req.userId]
    );
    res.json({ id, name, company_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('UPDATE projects SET client_id = NULL WHERE client_id = ? AND user_id = ?', [id, req.userId]);
    await dbRun('DELETE FROM clients WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Cliente removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
