import express from "express";
import { v4 as uuidv4 } from "uuid";
import { dbRun, dbGet, dbAll } from "../db.js";
import { authMiddleware } from "../auth.js";

const router = express.Router();

router.use(authMiddleware);

// GET alertas do usuário
router.get("/", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC", [req.userId]);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo alerta
router.post("/", async (req, res) => {
  try {
    const { projectId, type, threshold, action, recipients } = req.body;

    if (!type || !threshold) {
      return res.status(400).json({ error: "Type e threshold obrigatórios" });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO alerts (id, user_id, project_id, type, threshold, action, recipients, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [id, req.userId, projectId || null, type, threshold, action || "email", recipients || ""]
    );
    res.status(201).json({ id, type, threshold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE alerta
router.delete("/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM alerts WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.json({ message: "Alerta removido" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle alerta
router.patch("/:id/toggle", async (req, res) => {
  try {
    await dbRun(
      "UPDATE alerts SET active = (CASE WHEN active THEN FALSE ELSE TRUE END) WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );
    res.json({ message: "Alerta atualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function checkAlerts(userId, projectId, totalCost) {
  const alerts = await dbAll(
    `SELECT * FROM alerts
     WHERE user_id = ? AND active = TRUE
     AND (project_id = ? OR project_id IS NULL)
     AND type = 'limit_exceeded'`,
    [userId, projectId]
  );

  const triggeredAlerts = [];
  for (const alert of alerts) {
    if (totalCost >= alert.threshold) {
      triggeredAlerts.push(alert);
      // Mark as triggered
      await dbRun("UPDATE alerts SET triggered_at = CURRENT_TIMESTAMP WHERE id = ?", [alert.id]);
    }
  }

  return triggeredAlerts;
}

export default router;
