import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'prediction-agent.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
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

// Clear existing demo data
db.exec('DELETE FROM bets');
db.exec('DELETE FROM daily_stats');
db.exec('DELETE FROM sessions');

// Create demo session
const sessionResult = db.prepare(
  'INSERT INTO sessions (user_address, deposit_amount, bankroll, daily_start_bankroll, status) VALUES (?, ?, ?, ?, ?)'
).run('0xDemoUser1234567890abcdef', 100, 100, 100, 'stopped');
const sessionId = sessionResult.lastInsertRowid;

// Generate 18 realistic demo bets
const baseBtcPrice = 97500;
let bankroll = 100;
let wins = 0;
let losses = 0;
let skips = 0;
const now = Date.now();

const demoBets = [];
for (let i = 0; i < 18; i++) {
  const roundTime = new Date(now - (18 - i) * 60000).toISOString();
  const priceVariation = (Math.random() - 0.5) * 500;
  const btcStart = baseBtcPrice + priceVariation + i * 10;
  const confidence = 30 + Math.random() * 70;

  if (confidence < 60) {
    // SKIP
    demoBets.push({
      session_id: sessionId,
      round_time: roundTime,
      direction: 'SKIP',
      confidence,
      amount: 0,
      btc_price_start: btcStart,
      btc_price_end: null,
      result: 'SKIP',
      pnl: 0,
      bankroll_after: bankroll,
      reasoning: `Confidence ${confidence.toFixed(1)}% below 60% threshold.`,
    });
    skips++;
  } else {
    const direction = Math.random() > 0.5 ? 'UP' : 'DOWN';
    const betSize = bankroll * 0.02;
    const priceMove = (Math.random() - 0.45) * 200; // Slight upward bias
    const btcEnd = btcStart + priceMove;

    let result;
    if (direction === 'UP') result = btcEnd > btcStart ? 'WIN' : 'LOSS';
    else result = btcEnd < btcStart ? 'WIN' : 'LOSS';

    const pnl = result === 'WIN' ? betSize * 0.85 : -betSize;
    bankroll += pnl;

    if (result === 'WIN') wins++;
    else losses++;

    demoBets.push({
      session_id: sessionId,
      round_time: roundTime,
      direction,
      confidence,
      amount: betSize,
      btc_price_start: btcStart,
      btc_price_end: btcEnd,
      result,
      pnl,
      bankroll_after: bankroll,
      reasoning: `${direction} signal: EMA momentum ${direction === 'UP' ? 'BULLISH' : 'BEARISH'}, RSI ${(40 + Math.random() * 20).toFixed(1)}, Volume ratio ${(0.8 + Math.random() * 1.2).toFixed(2)}`,
    });
  }
}

// Insert demo bets
const insertBet = db.prepare(`
  INSERT INTO bets (session_id, round_time, direction, confidence, amount, btc_price_start, btc_price_end, result, pnl, bankroll_after, reasoning)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const bet of demoBets) {
  insertBet.run(
    bet.session_id, bet.round_time, bet.direction, bet.confidence,
    bet.amount, bet.btc_price_start, bet.btc_price_end, bet.result,
    bet.pnl, bet.bankroll_after, bet.reasoning
  );
}

// Update session bankroll
db.prepare('UPDATE sessions SET bankroll = ?, stop_reason = ? WHERE id = ?')
  .run(bankroll, 'DEMO_COMPLETE', sessionId);

// Create daily stats
const today = new Date().toISOString().split('T')[0];
db.prepare(
  'INSERT INTO daily_stats (session_id, date, start_bankroll, current_pnl, total_bets, wins, losses, skips) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
).run(sessionId, today, 100, bankroll - 100, wins + losses, wins, losses, skips);

console.log(`Seeded ${demoBets.length} demo bets`);
console.log(`  Wins: ${wins}, Losses: ${losses}, Skips: ${skips}`);
console.log(`  Final bankroll: $${bankroll.toFixed(2)} (P&L: $${(bankroll - 100).toFixed(2)})`);

db.close();
