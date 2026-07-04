import express from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../db.js";
import { authMiddleware } from "../auth.js";
import axios from "axios";

const router = express.Router();

router.use(authMiddleware);

// GET webhooks do usuário
router.get("/", (req, res) => {
  db.all("SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC", [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST novo webhook
router.post("/", (req, res) => {
  const { url, event } = req.body;

  if (!url || !event) {
    return res.status(400).json({ error: "URL e event obrigatórios" });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO webhooks (id, user_id, url, event, active)
     VALUES (?, ?, ?, ?, 1)`,
    [id, req.userId, url, event],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, url, event });
    }
  );
});

// DELETE webhook
router.delete("/:id", (req, res) => {
  db.run("DELETE FROM webhooks WHERE id = ? AND user_id = ?", [req.params.id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Webhook removido" });
  });
});

export async function triggerWebhook(userId, event, data) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM webhooks WHERE user_id = ? AND event = ? AND active = 1",
      [userId, event],
      async (err, webhooks) => {
        if (err) return reject(err);

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

        resolve(webhooks.length);
      }
    );
  });
}

export default router;
