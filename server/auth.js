import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db, { dbReady } from "./db.js";

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
  try {
    await dbReady;
    const id = uuidv4();
    const passwordHash = await hashPassword(password);

    console.log('📝 Registrando usuário:', email);
    await db.pool.query(
      `INSERT INTO users (id, email, password_hash, organization_name, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [id, email, passwordHash, organizationName || email.split("@")[0]]
    );

    console.log('✅ Usuário registrado:', email);
    return { id, email, organizationName };
  } catch (err) {
    console.error('❌ Erro no registro:', err.message);
    throw err;
  }
};

export const loginUser = async (email, password) => {
  console.log('🔐 loginUser chamado para:', email);
  try {
    await dbReady;
    console.log('🔍 Consultando usuário...');
    // Use the raw pool for direct async/await
    const result = await db.pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows?.[0];

    console.log('✓ Query executada. User encontrado:', !!user);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw new Error("Senha incorreta");
    }

    console.log('✅ Login bem-sucedido para:', email);
    const token = generateToken(user.id);
    return { user: { id: user.id, email: user.email, organization: user.organization_name }, token };
  } catch (err) {
    console.error('❌ Erro no login:', err.message);
    throw err;
  }
};

export const getUserById = async (userId) => {
  try {
    await dbReady;
    const result = await db.pool.query("SELECT id, email, organization_name, created_at FROM users WHERE id = $1", [userId]);
    return result.rows?.[0];
  } catch (err) {
    console.error('❌ Erro ao buscar usuário:', err.message);
    throw err;
  }
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
