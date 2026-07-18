import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET todas as empresas do usuário
router.get('/', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST nova empresa
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    const id = uuidv4();
    await dbRun('INSERT INTO companies (id, user_id, name) VALUES (?, ?, ?)', [id, req.userId, name]);
    res.status(201).json({ id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT atualizar empresa
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    await dbRun(
      'UPDATE companies SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, id, req.userId]
    );
    res.json({ id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE empresa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM clients WHERE company_id = ? AND user_id = ?', [id, req.userId]);
    await dbRun('UPDATE projects SET company_id = NULL, client_id = NULL WHERE company_id = ? AND user_id = ?', [id, req.userId]);
    await dbRun('DELETE FROM companies WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Empresa removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
