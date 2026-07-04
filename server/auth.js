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

export const registerUser = (email, password, organizationName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const id = uuidv4();
      const passwordHash = await hashPassword(password);

      console.log('📝 Registrando usuário:', email);
      db.run(
        `INSERT INTO users (id, email, password_hash, organization_name, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, email, passwordHash, organizationName || email.split("@")[0]],
        (err) => {
          if (err) {
            console.error('❌ Erro no registro:', err.message);
            reject(err);
          } else {
            console.log('✅ Usuário registrado:', email);
            resolve({ id, email, organizationName });
          }
        }
      );
    } catch (err) {
      console.error('❌ Erro no registro:', err.message);
      reject(err);
    }
  });
};

export const loginUser = (email, password) => {
  return new Promise((resolve, reject) => {
    console.log('🔐 loginUser chamado para:', email);
    console.log('🔍 Consultando usuário...');

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
      if (err) {
        console.error('❌ Erro no login:', err.message);
        return reject(err);
      }

      if (!user) {
        console.warn('⚠️ Usuário não encontrado:', email);
        return reject(new Error("Usuário não encontrado"));
      }

      try {
        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
          console.warn('⚠️ Senha incorreta para:', email);
          return reject(new Error("Senha incorreta"));
        }

        console.log('✅ Login bem-sucedido para:', email);
        const token = generateToken(user.id);
        resolve({ user: { id: user.id, email: user.email, organization: user.organization_name }, token });
      } catch (err) {
        console.error('❌ Erro na comparação de senha:', err.message);
        reject(err);
      }
    });
  });
};

export const getUserById = (userId) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT id, email, organization_name, created_at FROM users WHERE id = ?", [userId], (err, user) => {
      if (err) {
        console.error('❌ Erro ao buscar usuário:', err.message);
        reject(err);
      } else {
        resolve(user);
      }
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
