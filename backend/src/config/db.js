const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

function requireEnv(name) {
  const value = process.env[name];
  if (!value || String(value).trim().length === 0) {
    const err = new Error(`Missing required environment variable: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return value;
}

async function getPool() {
  if (pool) return pool;
  requireEnv('DB_USER');
  requireEnv('DB_PASSWORD');
  requireEnv('DB_SERVER');
  requireEnv('DB_NAME');
  pool = await sql.connect(config);
  return pool;
}

module.exports = { sql, getPool, requireEnv };