// Postgres connection (Supabase) + auto-migration on boot.
// Exposes thin helpers so route files read like the old better-sqlite3 code:
//   const row  = await db.one('SELECT ... WHERE id = $1', [id]);
//   const list = await db.all('SELECT ...', []);
//   await db.nrun('UPDATE users SET name = @n WHERE id = @id', { n, id });

const fs = require('fs');
const path = require('path');
const pg = require('pg');

// Return DATE columns as raw 'YYYY-MM-DD' strings — matches the old SQLite
// shape, keeps the frontend unchanged. pg's default would parse to a Date
// object and blow the TZ into the serialized response.
pg.types.setTypeParser(1082, (val) => val);
// INT8 (bigint) arrives as a string by default; we treat our ids as JS numbers.
pg.types.setTypeParser(20, (val) => parseInt(val, 10));

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    '[db] DATABASE_URL is not set. ' +
    'Copy .env.example to .env and paste your Supabase connection string ' +
    '(Supabase dashboard → Settings → Database → Connection string → URI).'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requires SSL. The CA is not bundled with Node, so we skip
  // verification — fine for a direct pooled connection to supabase.co.
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

async function all(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

async function run(text, params) {
  const res = await pool.query(text, params);
  return { rowCount: res.rowCount, rows: res.rows };
}

/** Named-parameter variant: write `@name` in SQL and pass `{ name: value }`. */
function named(text, params = {}) {
  const values = [];
  const sql = text.replace(/@(\w+)\b/g, (_match, key) => {
    if (!(key in params)) throw new Error(`[db] missing named param: ${key}`);
    values.push(params[key]);
    return '$' + values.length;
  });
  return { sql, values };
}

async function nquery(text, params) {
  const { sql, values } = named(text, params);
  return pool.query(sql, values);
}

async function none(text, params) {
  const { sql, values } = named(text, params);
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function nall(text, params) {
  const { sql, values } = named(text, params);
  const { rows } = await pool.query(sql, values);
  return rows;
}

async function nrun(text, params) {
  const { sql, values } = named(text, params);
  const res = await pool.query(sql, values);
  return { rowCount: res.rowCount, rows: res.rows };
}

/** Wrap a callback in a transaction. Rolls back on throw. */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Apply schema.sql — DDL + seed. Idempotent via IF NOT EXISTS / ON CONFLICT,
 * so it's safe to run on every boot. Same file can be pasted into Supabase's
 * SQL Editor for one-click provisioning. */
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SCHEMA_SQL = fs.readFileSync(SCHEMA_PATH, 'utf8');

async function migrate() {
  await pool.query(SCHEMA_SQL);
}

module.exports = {
  pool,
  migrate,
  query, one, all, run,
  nquery, none, nall, nrun,
  tx,
};
