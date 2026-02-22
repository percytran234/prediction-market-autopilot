import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'prediction-agent.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
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
  `);
}
