import express from 'express';
import { dbRun, dbGet, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET resumo do dashboard (apenas dados do usuário)
router.get('/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = ` AND c.user_id = ?`;
    const params = [req.userId];

    if (start_date) {
      dateFilter += ' AND c.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      dateFilter += ' AND c.date <= ?';
      params.push(end_date);
    }

    // Total gasto
    const totalRow = await dbGet(
      `SELECT COALESCE(SUM(amount), 0) as total FROM costs c WHERE c.user_id = ? ${start_date ? 'AND c.date >= ?' : ''} ${end_date ? 'AND c.date <= ?' : ''}`,
      start_date && end_date ? [req.userId, start_date, end_date] : start_date ? [req.userId, start_date] : end_date ? [req.userId, end_date] : [req.userId]
    );

    // Por projeto (com empresa/cliente, se atribuídos)
    const byProject = await dbAll(
      `SELECT p.id, p.name, p.client_name, p.company_id, p.client_id, COALESCE(SUM(c.amount), 0) as total
       FROM projects p
       LEFT JOIN costs c ON p.id = c.project_id
       WHERE p.user_id = ?
       GROUP BY p.id, p.name, p.client_name, p.company_id, p.client_id
       ORDER BY total DESC`,
      [req.userId]
    );

    // APIs dentro de cada projeto (para o card "Por projeto" expandir)
    const projectApis = await dbAll(
      `SELECT c.project_id, a.id as api_id, a.name as api_name, COALESCE(SUM(c.amount), 0) as total
       FROM costs c
       JOIN apis a ON a.id = c.api_id
       WHERE c.user_id = ?
       GROUP BY c.project_id, a.id, a.name
       ORDER BY total DESC`,
      [req.userId]
    );

    const companies = await dbAll('SELECT id, name FROM companies WHERE user_id = ? ORDER BY name', [req.userId]);
    const clients = await dbAll('SELECT id, name, company_id FROM clients WHERE user_id = ? ORDER BY name', [req.userId]);

    res.json({
      total: totalRow.total || 0,
      byProject: byProject || [],
      projectApis: projectApis || [],
      companies: companies || [],
      clients: clients || [],
      period: { start_date, end_date }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET custos por período (últimos 30 dias) do usuário
router.get('/monthly', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT
         TO_CHAR(c.date, 'YYYY-MM-DD') as date,
         COALESCE(SUM(c.amount), 0) as total
       FROM costs c
       WHERE c.user_id = ? AND c.date >= CURRENT_TIMESTAMP - INTERVAL '30 days'
       GROUP BY TO_CHAR(c.date, 'YYYY-MM-DD')
       ORDER BY date DESC`,
      [req.userId]
    );
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
