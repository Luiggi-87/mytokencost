import express from "express";
import * as auth from "../auth.js";
import { sendPasswordResetEmail } from "../email.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, organizationName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha obrigatórios" });
    }

    const user = await auth.registerUser(email, password, organizationName);
    const token = auth.generateToken(user.id);

    res.status(201).json({ user, token });
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha obrigatórios" });
    }

    const { user, token } = await auth.loginUser(email, password);
    res.json({ user, token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get current user
router.get("/me", auth.authMiddleware, async (req, res) => {
  try {
    const user = await auth.getUserById(req.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Solicitar reset de senha
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email obrigatório" });
  }

  // Resposta genérica sempre, para não revelar se o email existe
  const genericMessage = { message: "Se o email existir, você receberá instruções para redefinir a senha." };

  try {
    const rawToken = await auth.createPasswordResetToken(email);
    if (rawToken) {
      const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || "";
      const resetUrl = `${frontendUrl}/?reset_token=${rawToken}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
    res.json(genericMessage);
  } catch (error) {
    console.error("Erro ao processar forgot-password:", error.message);
    res.json(genericMessage);
  }
});

// Redefinir senha com token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token e nova senha são obrigatórios" });
    }

    await auth.resetPasswordWithToken(token, newPassword);
    res.json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
