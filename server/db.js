import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");

let db;
let dbReady = new Promise((resolve, reject) => {
  // Timeout de segurança: se não resolver em 15s, resolve mesmo assim
  const timeout = setTimeout(() => {
    console.warn('⚠️ Timeout na inicialização do banco, continuando mesmo assim');
    resolve(db);
  }, 15000);

  (async () => {
    try {
      await actuallyInitializeDb();
      clearTimeout(timeout);
      resolve(db);
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  })();
});

// Usar PostgreSQL se DATABASE_URL existe, senão construir de variáveis Railway, senão SQLite
async function actuallyInitializeDb() {
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
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
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

          if (!callback) callback = () => {};

          pool.query(convertedSql, params).then(result => {
            console.log('✓ Query executada');
            callback(null, result);
          }).catch(err => {
            console.error('❌ DB ERROR:', err.message);
            callback(err, null);
          });
        },
        all: (sql, params = [], callback) => {
          const convertedSql = convertQuery(sql);

          if (!callback) callback = () => {};

          pool.query(convertedSql, params).then(result => {
            callback(null, result?.rows || []);
          }).catch(err => {
            console.error('❌ DB ERROR:', err.message);
            callback(err, []);
          });
        },
        get: (sql, params = [], callback) => {
          const convertedSql = convertQuery(sql);

          if (!callback) callback = () => {};

          pool.query(convertedSql, params).then(result => {
            callback(null, result?.rows?.[0]);
          }).catch(err => {
            console.error('❌ DB ERROR:', err.message);
            callback(err, null);
          });
        },
        serialize: (fn) => fn(),
        pool,
      };
      console.log('✅ PostgreSQL conectado com sucesso');
      return await initializeTables();
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
      return await initializeTables();
    } catch (err) {
      console.error('❌ Erro na conexão SQLite:', err.message);
      process.exit(1);
    }
  }
}

// dbReady Promise defined above

function initializeTables() {
  return new Promise((resolve) => {
    if (!db) {
      console.log('✅ Tabelas não precisam ser criadas (DB não inicializado)');
      resolve();
      return;
    }

    console.log('🔄 Iniciando criação de tabelas...');

    // Dispara todos os CREATE TABLE sem esperar respostas
    // O PostgreSQL vai executá-los em background

    db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, organization_name TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS apis (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, api_key TEXT, base_url TEXT, pricing_model TEXT, unit_cost NUMERIC(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, client_name TEXT, description TEXT, monthly_rate NUMERIC(10,2), stripe_customer_id TEXT, stripe_auto_charge BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS costs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT NOT NULL, api_id TEXT NOT NULL, amount NUMERIC(10,2) NOT NULL, units INTEGER, unit_type TEXT, description TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (project_id) REFERENCES projects(id), FOREIGN KEY (api_id) REFERENCES apis(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS webhooks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, url TEXT NOT NULL, event TEXT NOT NULL, active BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT, type TEXT NOT NULL, threshold REAL, action TEXT, recipients TEXT, active BOOLEAN DEFAULT FALSE, triggered_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (project_id) REFERENCES projects(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // Resolve imediatamente após disparar as queries - elas vão ser executadas em background
    console.log('✅ Queries de criação de tabelas disparadas, continuando...');
    resolve();
  });
}

// Create a proxy that always returns the current db instance
export default new Proxy({}, {
  get: (target, prop) => {
    if (db && db[prop]) return db[prop];
    if (prop === 'run') return () => {};
    if (prop === 'all') return () => {};
    if (prop === 'get') return () => {};
    if (prop === 'serialize') return (fn) => fn();
    if (prop === 'pool') return db?.pool;
    return undefined;
  }
});

export { dbReady };
