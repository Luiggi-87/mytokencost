import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");
const isProduction = process.env.NODE_ENV === 'production';

let db;

// Usar PostgreSQL em produção ou SQLite localmente
async function initializeDb() {
  if (isProduction && process.env.DATABASE_URL) {
    console.log('🗄️ Usando PostgreSQL (Production)');
    try {
      const pgModule = await import('pg');
      const { Pool } = pgModule;
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      db = {
        run: (sql, params = [], callback) => {
          pool.query(sql, params, (err, result) => {
            if (callback) callback(err, result);
          });
        },
        all: (sql, params = [], callback) => {
          pool.query(sql, params, (err, result) => {
            if (callback) callback(err, result?.rows || []);
          });
        },
        get: (sql, params = [], callback) => {
          pool.query(sql, params, (err, result) => {
            if (callback) callback(err, result?.rows?.[0]);
          });
        },
        serialize: (fn) => fn(),
        pool,
      };
      console.log('✅ PostgreSQL connected');
      initializeTables();
    } catch (err) {
      console.error('❌ PostgreSQL connection failed:', err.message);
      process.exit(1);
    }
  } else {
    // Usar SQLite3 localmente
    console.log('🗄️ Usando SQLite (Development)');
    try {
      const sqlite3Module = await import('sqlite3');
      const sqlite3 = sqlite3Module.default;
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = process.env.DATABASE || path.join(dataDir, "mytokencost.db");
      db = new sqlite3.Database(dbPath);
      console.log('✅ SQLite connected');
      db.serialize(() => initializeTables());
    } catch (err) {
      console.error('❌ SQLite connection failed:', err.message);
      process.exit(1);
    }
  }
}

// Initialize immediately
initializeDb();

function initializeTables() {
  if (!db) return;

  db.serialize?.(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        organization_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS apis (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        api_key TEXT,
        base_url TEXT,
        pricing_model TEXT,
        unit_cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        client_name TEXT,
        description TEXT,
        monthly_rate REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS costs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        api_id TEXT NOT NULL,
        amount REAL NOT NULL,
        units INTEGER,
        unit_type TEXT,
        description TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (api_id) REFERENCES apis(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        event TEXT NOT NULL,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT,
        type TEXT NOT NULL,
        threshold REAL,
        action TEXT,
        recipients TEXT,
        active BOOLEAN DEFAULT 1,
        triggered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

export default db || { run: () => {}, all: () => {}, get: () => {}, serialize: (fn) => fn() };
