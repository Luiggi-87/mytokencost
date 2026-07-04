import express from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../db.js";
import { authMiddleware } from "../auth.js";

const router = express.Router();

router.use(authMiddleware);

// GET alertas do usuário
router.get("/", (req, res) => {
  db.all("SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC", [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST novo alerta
router.post("/", (req, res) => {
  const { projectId, type, threshold, action, recipients } = req.body;

  if (!type || !threshold) {
    return res.status(400).json({ error: "Type e threshold obrigatórios" });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO alerts (id, user_id, project_id, type, threshold, action, recipients, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [id, req.userId, projectId || null, type, threshold, action || "email", recipients || ""],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, type, threshold });
    }
  );
});

// DELETE alerta
router.delete("/:id", (req, res) => {
  db.run("DELETE FROM alerts WHERE id = ? AND user_id = ?", [req.params.id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Alerta removido" });
  });
});

// Toggle alerta
router.patch("/:id/toggle", (req, res) => {
  db.run(
    "UPDATE alerts SET active = (CASE WHEN active THEN FALSE ELSE TRUE END) WHERE id = ? AND user_id = ?",
    [req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Alerta atualizado" });
    }
  );
});

export async function checkAlerts(userId, projectId, totalCost) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM alerts
       WHERE user_id = ? AND active = TRUE
       AND (project_id = ? OR project_id IS NULL)
       AND type = 'limit_exceeded'`,
      [userId, projectId],
      (err, alerts) => {
        if (err) return reject(err);

        const triggeredAlerts = [];
        for (const alert of alerts) {
          if (totalCost >= alert.threshold) {
            triggeredAlerts.push(alert);
            // Mark as triggered
            db.run("UPDATE alerts SET triggered_at = CURRENT_TIMESTAMP WHERE id = ?", [alert.id]);
          }
        }

        resolve(triggeredAlerts);
      }
    );
  });
}

export default router;
