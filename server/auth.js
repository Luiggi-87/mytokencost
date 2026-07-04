import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "./db.js";

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

export const registerUser = (email, password, organizationName) => {
  return new Promise(async (resolve, reject) => {
    const id = uuidv4();
    const passwordHash = await hashPassword(password);

    // Timeout de segurança
    const timeout = setTimeout(() => {
      console.warn('⚠️ Register timeout - callback não respondeu em 5s');
      resolve({ id, email, organizationName });
    }, 30000);

    db.run(
      `INSERT INTO users (id, email, password_hash, organization_name, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, email, passwordHash, organizationName || email.split("@")[0]],
      (err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve({ id, email, organizationName });
      }
    );
  });
};

export const loginUser = (email, password) => {
  console.log('🔐 loginUser chamado para:', email);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ Login timeout - callback não respondeu em 30s');
      reject(new Error("Timeout ao acessar banco de dados"));
    }, 30000);

    console.log('🔍 Chamando db.get()...');
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
      console.log('✓ Callback de db.get() foi chamado. err:', err?.message, 'user:', !!user);
      clearTimeout(timeout);
      if (err) {
        console.error('❌ Erro no GET:', err.message);
        reject(err);
      } else if (!user) {
        console.warn('⚠️ Usuário não encontrado:', email);
        reject(new Error("Usuário não encontrado"));
      } else {
        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
          console.warn('⚠️ Senha incorreta para:', email);
          reject(new Error("Senha incorreta"));
        } else {
          console.log('✅ Login bem-sucedido para:', email);
          const token = generateToken(user.id);
          resolve({ user: { id: user.id, email: user.email, organization: user.organization_name }, token });
        }
      }
    });
  });
};

export const getUserById = (userId) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ GetUser timeout - callback não respondeu em 5s');
      reject(new Error("Timeout ao acessar banco de dados"));
    }, 30000);

    db.get("SELECT id, email, organization_name, created_at FROM users WHERE id = ?", [userId], (err, user) => {
      clearTimeout(timeout);
      if (err) reject(err);
      else resolve(user);
    });
  });
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
