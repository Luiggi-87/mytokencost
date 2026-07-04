import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET resumo do dashboard (apenas dados do usuário)
router.get('/summary', (req, res) => {
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
  db.get(
    `SELECT COALESCE(SUM(amount), 0) as total FROM costs c WHERE c.user_id = ? ${start_date ? 'AND c.date >= ?' : ''} ${end_date ? 'AND c.date <= ?' : ''}`,
    start_date && end_date ? [req.userId, start_date, end_date] : start_date ? [req.userId, start_date] : end_date ? [req.userId, end_date] : [req.userId],
    (err, totalRow) => {
      if (err) return res.status(500).json({ error: err.message });

      // Por API
      db.all(
        `SELECT a.name, a.type, COALESCE(SUM(c.amount), 0) as total
         FROM apis a
         LEFT JOIN costs c ON a.id = c.api_id AND c.user_id = ?
         WHERE a.user_id = ?
         GROUP BY a.id, a.name, a.type
         ORDER BY total DESC`,
        [req.userId, req.userId],
        (err, byApi) => {
          if (err) return res.status(500).json({ error: err.message });

          // Por projeto
          db.all(
            `SELECT p.id, p.name, p.client_name, COALESCE(SUM(c.amount), 0) as total
             FROM projects p
             LEFT JOIN costs c ON p.id = c.project_id
             WHERE p.user_id = ?
             GROUP BY p.id, p.name, p.client_name
             ORDER BY total DESC`,
            [req.userId],
            (err, byProject) => {
              if (err) return res.status(500).json({ error: err.message });

              res.json({
                total: totalRow.total || 0,
                byApi: byApi || [],
                byProject: byProject || [],
                period: { start_date, end_date }
              });
            }
          );
        }
      );
    }
  );
});

// GET custos por período (últimos 30 dias) do usuário
router.get('/monthly', (req, res) => {
  db.all(
    `SELECT
       TO_CHAR(c.date, 'YYYY-MM-DD') as date,
       COALESCE(SUM(c.amount), 0) as total
     FROM costs c
     WHERE c.user_id = ? AND c.date >= CURRENT_TIMESTAMP - INTERVAL '30 days'
     GROUP BY TO_CHAR(c.date, 'YYYY-MM-DD')
     ORDER BY date DESC`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

export default router;
