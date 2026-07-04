import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");

let db;

// Usar PostgreSQL se DATABASE_URL existe, senão construir de variáveis Railway, senão SQLite
async function initializeDb() {
  let databaseUrl = process.env.DATABASE_URL;

  // Se não houver DATABASE_URL, tentar construir de variáveis individuais (Railway)
  if (!databaseUrl && process.env.PGHOST) {
    const host = process.env.PGHOST;
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const db = process.env.POSTGRES_DB;
    const port = process.env.PGPORT || 5432;

    if (user && password && db) {
      databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${db}`;
      console.log('🗄️ DATABASE_URL construído de variáveis Railway');
    }
  }

  if (databaseUrl) {
    console.log('🗄️ Usando PostgreSQL (DATABASE_URL detectado)');
    try {
      const pgModule = await import('pg');
      const { Pool } = pgModule;
      const pool = new Pool({
        connectionString: databaseUrl,
      });

      // Converter SQLite para PostgreSQL format
      const convertQuery = (sql) => {
        let counter = 1;
        // Converter ? para $1, $2, $3
        sql = sql.replace(/\?/g, () => `$${counter++}`);
        // Converter DATETIME para TIMESTAMP
        sql = sql.replace(/DATETIME/gi, 'TIMESTAMP');
        // Converter DEFAULT 1 e DEFAULT 0 para boolean
        sql = sql.replace(/DEFAULT\s+1(?=\s|,|[)']|$)/gi, 'DEFAULT TRUE');
        sql = sql.replace(/DEFAULT\s+0(?=\s|,|[)']|$)/gi, 'DEFAULT FALSE');
        return sql;
      };

      db = {
        run: (sql, params = [], callback) => {
          const convertedSql = convertQuery(sql);
          console.log('🔍 DB RUN:', convertedSql.substring(0, 50) + '...');
          pool.query(convertedSql, params, (err, result) => {
            if (err) console.error('❌ DB ERROR:', err.message);
            if (callback) callback(err, result);
          });
        },
        all: (sql, params = [], callback) => {
          const convertedSql = convertQuery(sql);
          pool.query(convertedSql, params, (err, result) => {
            if (callback) callback(err, result?.rows || []);
          });
        },
        get: (sql, params = [], callback) => {
          const convertedSql = convertQuery(sql);
          pool.query(convertedSql, params, (err, result) => {
            if (callback) callback(err, result?.rows?.[0]);
          });
        },
        serialize: (fn) => fn(),
        pool,
      };
      console.log('✅ PostgreSQL conectado com sucesso');
      initializeTables();
    } catch (err) {
      console.error('❌ Erro na conexão PostgreSQL:', err.message);
      process.exit(1);
    }
  } else {
    // Usar SQLite3 localmente
    console.log('🗄️ Usando SQLite (DATABASE_URL não encontrado)');
    try {
      const sqlite3Module = await import('sqlite3');
      const sqlite3 = sqlite3Module.default;
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = process.env.DATABASE || path.join(dataDir, "mytokencost.db");
      db = new sqlite3.Database(dbPath);
      console.log('✅ SQLite conectado com sucesso');
      db.serialize(() => initializeTables());
    } catch (err) {
      console.error('❌ Erro na conexão SQLite:', err.message);
      process.exit(1);
    }
  }
}

// Initialize immediately
initializeDb();

function initializeTables() {
  if (!db) return;
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
        unit_cost NUMERIC(10,2),
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
        monthly_rate NUMERIC(10,2),
        stripe_customer_id TEXT,
        stripe_auto_charge BOOLEAN DEFAULT FALSE,
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
        amount NUMERIC(10,2) NOT NULL,
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
}

export default db || { run: () => {}, all: () => {}, get: () => {}, serialize: (fn) => fn() };
