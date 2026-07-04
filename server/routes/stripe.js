import express from "express";
import { dbRun, dbGet } from "../db.js";
import { authMiddleware } from "../auth.js";
import { createStripeCustomer, chargeStripeCustomer } from "../stripe.js";

const router = express.Router();

router.use(authMiddleware);

// Connect Stripe ao projeto
router.post("/:projectId/connect", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { clientEmail } = req.body;

    // Verificar se projeto pertence ao usuário
    const project = await dbGet(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?",
      [projectId, req.userId]
    );
    if (!project) return res.status(404).json({ error: "Projeto não encontrado" });

    // Criar Stripe customer
    const customerId = await createStripeCustomer(
      projectId,
      project.client_name,
      clientEmail
    );

    if (!customerId) {
      return res.status(500).json({ error: "Stripe não configurado" });
    }

    res.json({ customerId, message: "Stripe conectado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configurar auto-charge para projeto
router.post("/:projectId/auto-charge", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { enabled } = req.body;

    await dbRun(
      "UPDATE projects SET stripe_auto_charge = ? WHERE id = ? AND user_id = ?",
      [!!enabled, projectId, req.userId]
    );
    res.json({ message: `Auto-charge ${enabled ? "ativado" : "desativado"}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
