import { getDb } from './database.js';

// --- Wallet ---
export function getWallet() {
  return getDb().prepare('SELECT * FROM wallet WHERE id = 1').get();
}

export function saveWallet(address, encryptedKey) {
  const existing = getWallet();
  if (existing) {
    getDb().prepare('UPDATE wallet SET address = ?, encrypted_key = ? WHERE id = 1').run(address, encryptedKey);
  } else {
    getDb().prepare('INSERT INTO wallet (id, address, encrypted_key) VALUES (1, ?, ?)').run(address, encryptedKey);
  }
}

// --- Sessions ---
export function createSession(userAddress, depositAmount) {
  const result = getDb().prepare(
    'INSERT INTO sessions (user_address, deposit_amount, bankroll, daily_start_bankroll, status) VALUES (?, ?, ?, ?, ?)'
  ).run(userAddress, depositAmount, depositAmount, depositAmount, 'idle');
  return result.lastInsertRowid;
}

export function getSession(id) {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

export function getActiveSession() {
  return getDb().prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
}

export function getLatestSession() {
  return getDb().prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT 1').get();
}

export function updateSession(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  getDb().prepare(`UPDATE sessions SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
}

// --- Bets ---
export function insertBet(bet) {
  const result = getDb().prepare(`
    INSERT INTO bets (session_id, round_time, direction, confidence, amount, btc_price_start, btc_price_end, result, pnl, bankroll_after, reasoning)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    bet.session_id, bet.round_time, bet.direction, bet.confidence,
    bet.amount, bet.btc_price_start, bet.btc_price_end, bet.result,
    bet.pnl, bet.bankroll_after, bet.reasoning
  );
  return result.lastInsertRowid;
}

export function updateBet(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  getDb().prepare(`UPDATE bets SET ${sets} WHERE id = ?`).run(...values, id);
}

export function getPendingBet(sessionId) {
  return getDb().prepare("SELECT * FROM bets WHERE session_id = ? AND result = 'PENDING' ORDER BY id DESC LIMIT 1").get(sessionId);
}

export function getBetHistory(sessionId, limit = 50) {
  return getDb().prepare('SELECT * FROM bets WHERE session_id = ? ORDER BY id DESC LIMIT ?').all(sessionId, limit);
}

export function getAllBets(limit = 50) {
  return getDb().prepare('SELECT * FROM bets ORDER BY id DESC LIMIT ?').all(limit);
}

// --- Daily Stats ---
export function getDailyStats(sessionId, date) {
  return getDb().prepare('SELECT * FROM daily_stats WHERE session_id = ? AND date = ?').get(sessionId, date);
}

export function createDailyStats(sessionId, date, startBankroll) {
  const result = getDb().prepare(
    'INSERT INTO daily_stats (session_id, date, start_bankroll) VALUES (?, ?, ?)'
  ).run(sessionId, date, startBankroll);
  return result.lastInsertRowid;
}

export function updateDailyStats(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  getDb().prepare(`UPDATE daily_stats SET ${sets} WHERE id = ?`).run(...values, id);
}

export function getOrCreateDailyStats(sessionId, date, startBankroll) {
  let stats = getDailyStats(sessionId, date);
  if (!stats) {
    createDailyStats(sessionId, date, startBankroll);
    stats = getDailyStats(sessionId, date);
  }
  return stats;
}
