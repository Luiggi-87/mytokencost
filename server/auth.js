import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { dbRun, dbGet } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-prod";

export const hashPassword = async (password) => {
  return await bcryptjs.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
  return await bcryptjs.compare(password, hash);
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const registerUser = async (email, password, organizationName) => {
  const id = uuidv4();
  const passwordHash = await hashPassword(password);

  console.log('📝 Registrando usuário:', email);
  await dbRun(
    `INSERT INTO users (id, email, password_hash, organization_name, created_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [id, email, passwordHash, organizationName || email.split("@")[0]]
  );
  console.log('✅ Usuário registrado:', email);
  return { id, email, organizationName };
};

export const loginUser = async (email, password) => {
  console.log('🔐 loginUser chamado para:', email);

  const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);

  if (!user) {
    console.warn('⚠️ Usuário não encontrado:', email);
    throw new Error("Usuário não encontrado");
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    console.warn('⚠️ Senha incorreta para:', email);
    throw new Error("Senha incorreta");
  }

  console.log('✅ Login bem-sucedido para:', email);
  const token = generateToken(user.id);
  return { user: { id: user.id, email: user.email, organization: user.organization_name }, token };
};

export const getUserById = async (userId) => {
  return await dbGet("SELECT id, email, organization_name, created_at FROM users WHERE id = ?", [userId]);
};

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Token inválido" });
  }

  req.userId = decoded.userId;
  next();
};
