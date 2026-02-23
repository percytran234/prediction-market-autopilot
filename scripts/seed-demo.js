import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'prediction-agent.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure schema exists
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

// ─── Clear existing data ────────────────────────────────────────────
db.exec('DELETE FROM bets');
db.exec('DELETE FROM daily_stats');
db.exec('DELETE FROM sessions');

// ─── Reuse or create agent wallet record ────────────────────────────
const existingWallet = db.prepare('SELECT * FROM wallet WHERE id = 1').get();
if (!existingWallet) {
  db.prepare('INSERT INTO wallet (id, address, encrypted_key) VALUES (1, ?, ?)')
    .run('0xAgentWalletDemo000000000000000000000000', '{"demo":"true"}');
}

// ─── Create session ─────────────────────────────────────────────────
const sessionResult = db.prepare(
  'INSERT INTO sessions (user_address, deposit_amount, bankroll, daily_start_bankroll, status) VALUES (?, ?, ?, ?, ?)'
).run('0xDemoUser1234567890', 100, 100, 100, 'active');
const sessionId = sessionResult.lastInsertRowid;

// ─── Bet generation plan ────────────────────────────────────────────
// Exactly 20 bets: 12 wins, 5 losses, 3 skips
// Order is scripted to feel natural (streaks, mixed results)
const outcomes = [
  'WIN', 'WIN', 'SKIP', 'WIN', 'LOSS',       // rounds 1-5
  'WIN', 'WIN', 'WIN', 'LOSS', 'SKIP',        // rounds 6-10
  'WIN', 'LOSS', 'WIN', 'WIN', 'SKIP',        // rounds 11-15
  'LOSS', 'WIN', 'WIN', 'LOSS', 'WIN',        // rounds 16-20
];

// Directions for non-skip bets (mix of UP and DOWN)
const directions = [
  'UP', 'DOWN', null, 'UP', 'DOWN',
  'UP', 'UP', 'DOWN', 'UP', null,
  'DOWN', 'UP', 'UP', 'DOWN', null,
  'DOWN', 'UP', 'UP', 'DOWN', 'UP',
];

// Reasoning templates
const winReasons = [
  'RSI 28 oversold + EMA bullish crossover → BET UP',
  'EMA12 > EMA26 momentum + volume spike 1.8x → BET DOWN (correction expected)',
  'RSI 72 overbought reversal + volume confirmation → BET UP',
  'Strong EMA bullish + RSI 35 recovery signal → BET UP',
  'Volume ratio 2.1x above avg + EMA alignment → BET UP',
  'RSI divergence detected + EMA bearish cross → BET DOWN',
  'Triple EMA confirmation + RSI 42 neutral-bullish → BET UP',
  'EMA momentum strong + volume breakout 1.6x → BET DOWN',
  'RSI 31 deep oversold bounce + EMA support → BET UP',
  'Bullish EMA stack + RSI turning up from 38 → BET UP',
  'Volume surge 2.3x + EMA12 crossing above EMA26 → BET UP',
  'Strong downtrend EMA + RSI 68 weakening → BET DOWN',
];

const lossReasons = [
  'EMA bearish but RSI neutral → BET DOWN (whipsawed)',
  'RSI 55 momentum play + EMA bullish → BET UP (reversed at resistance)',
  'Volume spike + EMA crossover signal → BET DOWN (false breakout)',
  'RSI 62 trending + EMA support → BET UP (stopped out)',
  'EMA bearish confirmation + volume drop → BET DOWN (squeezed)',
];

const skipReasons = [
  'Confidence 47% — RSI flat, EMA sideways, signals unclear → SKIP',
  'Confidence 52% — mixed signals, volume below avg → SKIP',
  'Confidence 44% — EMA converging, no clear direction → SKIP',
];

// ─── Generate bets ──────────────────────────────────────────────────
const baseBtcPrice = 99847.50;
const now = Date.now();
let bankroll = 100;
let winIdx = 0;
let lossIdx = 0;
let skipIdx = 0;
let consecutiveWins = 0;
let consecutiveLosses = 0;
let maxConsecWins = 0;
let maxConsecLosses = 0;

const insertBet = db.prepare(`
  INSERT INTO bets (session_id, round_time, direction, confidence, amount, btc_price_start, btc_price_end, result, pnl, bankroll_after, reasoning)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAll = db.transaction(() => {
  for (let i = 0; i < 20; i++) {
    const roundTime = new Date(now - (20 - i) * 60000).toISOString();
    const outcome = outcomes[i];
    const direction = directions[i];

    // BTC price drifts slightly upward with small noise per round
    const drift = i * 12.5;
    const noise = ((i * 7 + 13) % 47 - 23) * 2.1;  // deterministic pseudo-random
    const btcStart = parseFloat((baseBtcPrice + drift + noise).toFixed(2));

    if (outcome === 'SKIP') {
      const confidence = parseFloat((42 + skipIdx * 5 + ((i * 3) % 7)).toFixed(1));
      insertBet.run(
        sessionId, roundTime, 'SKIP', confidence,
        0, btcStart, null, 'SKIP',
        0, parseFloat(bankroll.toFixed(2)),
        skipReasons[skipIdx % skipReasons.length]
      );
      skipIdx++;
      consecutiveWins = 0;
      consecutiveLosses = 0;
      continue;
    }

    const betSize = parseFloat((bankroll * 0.02).toFixed(2));
    const confidence = parseFloat((62 + ((i * 7 + winIdx * 3) % 24)).toFixed(1));

    // Price movement: wins move in the right direction, losses move against
    let priceMove;
    if (outcome === 'WIN') {
      priceMove = direction === 'UP'
        ? 15 + (winIdx * 7 % 35)
        : -(18 + (winIdx * 5 % 30));
    } else {
      priceMove = direction === 'UP'
        ? -(12 + (lossIdx * 9 % 25))
        : (14 + (lossIdx * 6 % 20));
    }
    const btcEnd = parseFloat((btcStart + priceMove).toFixed(2));

    // P&L: prediction market payouts vary by implied odds (0.55–0.80x)
    // Losses always lose the full bet amount
    const payoutRates = [0.60, 0.55, 0.72, 0.58, 0.65, 0.52, 0.70, 0.56, 0.68, 0.54, 0.62, 0.50];
    const pnl = outcome === 'WIN'
      ? parseFloat((betSize * payoutRates[winIdx % payoutRates.length]).toFixed(4))
      : parseFloat((-betSize).toFixed(4));
    bankroll = parseFloat((bankroll + pnl).toFixed(4));

    let reasoning;
    if (outcome === 'WIN') {
      reasoning = winReasons[winIdx % winReasons.length];
      winIdx++;
      consecutiveWins++;
      consecutiveLosses = 0;
      if (consecutiveWins > maxConsecWins) maxConsecWins = consecutiveWins;
    } else {
      reasoning = lossReasons[lossIdx % lossReasons.length];
      lossIdx++;
      consecutiveLosses++;
      consecutiveWins = 0;
      if (consecutiveLosses > maxConsecLosses) maxConsecLosses = consecutiveLosses;
    }

    insertBet.run(
      sessionId, roundTime, direction, confidence,
      betSize, btcStart, btcEnd, outcome,
      pnl, parseFloat(bankroll.toFixed(2)),
      reasoning
    );
  }
});

insertAll();

// ─── Update session with final bankroll ─────────────────────────────
const finalBankroll = parseFloat(bankroll.toFixed(2));
db.prepare('UPDATE sessions SET bankroll = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
  .run(finalBankroll, sessionId);

// ─── Create daily_stats ─────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const totalPnl = parseFloat((finalBankroll - 100).toFixed(2));
const betsPlaced = 12 + 5; // wins + losses
const winRate = ((12 / betsPlaced) * 100).toFixed(1);

db.prepare(`
  INSERT INTO daily_stats (session_id, date, start_bankroll, current_pnl, total_bets, wins, losses, skips, consecutive_losses, consecutive_wins)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(sessionId, today, 100, totalPnl, betsPlaced, 12, 5, 3, maxConsecLosses, maxConsecWins);

// ─── Summary ────────────────────────────────────────────────────────
console.log(`✅ Seeded 20 bets | Bankroll: $100.00 → $${finalBankroll.toFixed(2)} | Win rate: ${winRate}% (12W/5L/3S)`);

db.close();
