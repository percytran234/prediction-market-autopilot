import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

// sql.js compatibility wrapper that matches better-sqlite3's API
function wrapSqlJs(sqlJsDb) {
  return {
    _db: sqlJsDb,
    prepare(sql) {
      const database = this._db;
      return {
        get(...params) {
          const stmt = database.prepare(sql);
          if (params.length) stmt.bind(params);
          let result;
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            result = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
          }
          stmt.free();
          return result;
        },
        all(...params) {
          const stmt = database.prepare(sql);
          if (params.length) stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            rows.push(Object.fromEntries(cols.map((c, i) => [c, vals[i]])));
          }
          stmt.free();
          return rows;
        },
        run(...params) {
          const stmt = database.prepare(sql);
          if (params.length) stmt.bind(params);
          stmt.step();
          stmt.free();
          const result = database.exec('SELECT last_insert_rowid() as id');
          return {
            lastInsertRowid: result.length ? result[0].values[0][0] : 0,
          };
        },
      };
    },
    exec(sql) {
      this._db.exec(sql);
    },
    pragma(str) {
      try {
        this._db.exec(`PRAGMA ${str}`);
      } catch {
        // sql.js may not support all pragmas
      }
    },
  };
}

if (process.env.VERCEL) {
  // Use sql.js (pure JS SQLite via WebAssembly) for Vercel serverless
  const { default: initSqlJs } = await import('sql.js');
  const { readFileSync } = await import('fs');
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  let wasmBinary;
  try {
    wasmBinary = readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
  } catch {
    // Fallback: let sql.js find it on its own
  }
  const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
  db = wrapSqlJs(new SQL.Database());
} else {
  // Use better-sqlite3 for local development
  const { default: Database } = await import('better-sqlite3');
  const DB_PATH = path.join(__dirname, '..', '..', 'prediction-agent.db');
  db = new Database(DB_PATH);
}

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS wallet (
    id INTEGER PRIMARY KEY DEFAULT 1,
    address TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    deposit_amount REAL DEFAULT 0,
    bankroll REAL DEFAULT 0,
    daily_start_bankroll REAL DEFAULT 0,
    status TEXT DEFAULT 'idle',
    stop_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id),
    round_time DATETIME NOT NULL,
    direction TEXT,
    confidence REAL,
    amount REAL,
    btc_price_start REAL,
    btc_price_end REAL,
    result TEXT,
    pnl REAL DEFAULT 0,
    bankroll_after REAL,
    reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id),
    date TEXT NOT NULL,
    start_bankroll REAL,
    current_pnl REAL DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    skips INTEGER DEFAULT 0,
    consecutive_losses INTEGER DEFAULT 0,
    consecutive_wins INTEGER DEFAULT 0,
    is_paused BOOLEAN DEFAULT 0,
    pause_until DATETIME
  );

  CREATE TABLE IF NOT EXISTS backtests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    params TEXT NOT NULL,
    results TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT UNIQUE NOT NULL,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL DEFAULT 'custom',
    api_key_hash TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    wallet_address TEXT,
    bankroll REAL DEFAULT 100,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    market TEXT NOT NULL,
    direction TEXT NOT NULL,
    confidence REAL NOT NULL,
    reasoning TEXT,
    source TEXT,
    metadata TEXT DEFAULT '{}',
    decision TEXT NOT NULL,
    decision_reason TEXT,
    bet_amount REAL DEFAULT 0,
    result TEXT,
    pnl REAL DEFAULT 0,
    bankroll_after REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS execution_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    market_slug TEXT,
    token_id TEXT,
    direction TEXT,
    confidence REAL,
    decision TEXT,
    bet_amount_usd REAL,
    cli_command TEXT,
    cli_response TEXT,
    order_id TEXT,
    execution_price REAL,
    slippage REAL,
    result TEXT,
    pnl REAL,
    bankroll_after REAL,
    polymarket_midpoint REAL,
    polymarket_spread REAL,
    binance_price REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS paper_trading_days (
    date TEXT PRIMARY KEY,
    rounds INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    skips INTEGER DEFAULT 0,
    pnl REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export function getDb() {
  return db;
}
