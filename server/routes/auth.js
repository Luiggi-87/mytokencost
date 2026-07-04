import express from "express";
import * as auth from "../auth.js";

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

export default router;
