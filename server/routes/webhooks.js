import express from "express";
import { v4 as uuidv4 } from "uuid";
import { dbRun, dbGet, dbAll } from "../db.js";
import { authMiddleware } from "../auth.js";
import axios from "axios";

const router = express.Router();

router.use(authMiddleware);

// GET webhooks do usuário
router.get("/", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC", [req.userId]);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo webhook
router.post("/", async (req, res) => {
  try {
    const { url, event } = req.body;

    if (!url || !event) {
      return res.status(400).json({ error: "URL e event obrigatórios" });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO webhooks (id, user_id, url, event, active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [id, req.userId, url, event]
    );
    res.status(201).json({ id, url, event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE webhook
router.delete("/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM webhooks WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.json({ message: "Webhook removido" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function triggerWebhook(userId, event, data) {
  const webhooks = await dbAll(
    "SELECT * FROM webhooks WHERE user_id = ? AND event = ? AND active = TRUE",
    [userId, event]
  );

  for (const webhook of webhooks) {
    try {
      await axios.post(webhook.url, {
        event,
        timestamp: new Date().toISOString(),
        data,
      });
    } catch (error) {
      console.error(`Webhook failed: ${webhook.url}`, error.message);
    }
  }

  return webhooks.length;
}

export default router;
