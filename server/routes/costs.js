import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';
import { triggerWebhook } from './webhooks.js';
import { checkAlerts } from './alerts.js';

const router = express.Router();
router.use(authMiddleware);

// GET custos do usuário
router.get('/', async (req, res) => {
  try {
    const { project_id, api_id, start_date, end_date } = req.query;

    let sql = `
      SELECT c.*, p.name as project_name, a.name as api_name, a.type as api_type
      FROM costs c
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN apis a ON c.api_id = a.id
      WHERE c.user_id = ?
    `;
    const params = [req.userId];

    if (project_id) {
      sql += ' AND c.project_id = ?';
      params.push(project_id);
    }

    if (api_id) {
      sql += ' AND c.api_id = ?';
      params.push(api_id);
    }

    if (start_date) {
      sql += ' AND c.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND c.date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY c.date DESC';

    const rows = await dbAll(sql, params);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo custo
router.post('/', async (req, res) => {
  try {
    const { project_id, api_id, amount, units, unit_type, description } = req.body;

    if (!project_id || !api_id || !amount) {
      return res.status(400).json({ error: 'Projeto, API e valor são obrigatórios' });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO costs (id, user_id, project_id, api_id, amount, units, unit_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbRun(sql, [id, req.userId, project_id, api_id, amount, units || null, unit_type || null, description || null]);

    // Disparar webhook
    try {
      await triggerWebhook(req.userId, 'cost.recorded', {
        cost_id: id,
        project_id,
        api_id,
        amount,
        units
      });
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
    }

    // Verificar alertas
    try {
      const alerts = await checkAlerts(req.userId, project_id, amount);
      if (alerts.length > 0) {
        console.log(`⚠️ Alertas disparados: ${alerts.length}`);
      }
    } catch (alertError) {
      console.error('Alert error:', alertError);
    }

    res.status(201).json({ id, project_id, api_id, amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE custo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM costs WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Custo removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
