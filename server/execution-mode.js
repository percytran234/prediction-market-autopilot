import { getDb } from './db/database.js';
import * as cli from './polymarket-cli.js';

const MODES = ['mock', 'paper', 'live'];

export function getExecutionMode() {
  return process.env.EXECUTION_MODE || 'mock';
}

export function isValidMode(mode) {
  return MODES.includes(mode);
}

export function getPaperTradingDays() {
  const db = getDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM paper_trading_days WHERE rounds > 0'
  ).get();
  return row?.count || 0;
}

export function getRequiredPaperDays() {
  return parseInt(process.env.REQUIRE_PAPER_DAYS || '7');
}

export function canGoLive() {
  const gates = {
    live_confirmed: process.env.LIVE_MODE_CONFIRMED === 'true',
    paper_days_met: getPaperTradingDays() >= getRequiredPaperDays(),
    cli_healthy: false,
    wallet_has_funds: false,
  };

  try {
    const health = cli.healthCheck();
    gates.cli_healthy = health.ok;
  } catch {}

  try {
    const balance = cli.getBalance();
    gates.wallet_has_funds = balance && parseFloat(balance.balance || balance.amount || '0') > 0;
  } catch {}

  return {
    allowed: Object.values(gates).every(Boolean),
    gates,
  };
}

export function getSetupStatus() {
  const mode = getExecutionMode();
  const cliInstalled = cli.isCliInstalled();
  let cliHealthy = false;
  let walletStatus = null;
  let approvalStatus = null;
  let balances = null;

  if (cliInstalled) {
    try { cliHealthy = cli.healthCheck().ok; } catch {}
    try { walletStatus = cli.walletInfo(); } catch {}
    try { approvalStatus = cli.checkApprovals(); } catch {}
    try { balances = cli.getBalance(); } catch {}
  }

  const paperDays = getPaperTradingDays();
  const requiredDays = getRequiredPaperDays();
  const liveGates = canGoLive();

  return {
    execution_mode: mode,
    cli_installed: cliInstalled,
    cli_healthy: cliHealthy,
    wallet: walletStatus,
    approvals: approvalStatus,
    balances,
    paper_trading_days: paperDays,
    required_paper_days: requiredDays,
    live_unlocked: liveGates.allowed,
    live_gates: liveGates.gates,
  };
}

export function recordPaperDay(stats) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT * FROM paper_trading_days WHERE date = ?').get(today);
  if (existing) {
    db.prepare(
      'UPDATE paper_trading_days SET rounds = rounds + 1, wins = wins + ?, losses = losses + ?, skips = skips + ?, pnl = pnl + ? WHERE date = ?'
    ).run(stats.wins || 0, stats.losses || 0, stats.skips || 0, stats.pnl || 0, today);
  } else {
    db.prepare(
      'INSERT INTO paper_trading_days (date, rounds, wins, losses, skips, pnl) VALUES (?, 1, ?, ?, ?, ?)'
    ).run(today, stats.wins || 0, stats.losses || 0, stats.skips || 0, stats.pnl || 0);
  }
}
