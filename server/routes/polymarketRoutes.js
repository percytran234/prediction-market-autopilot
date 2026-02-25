import { Router } from 'express';
import { getDb } from '../db/database.js';
import { getSetupStatus, getExecutionMode, getPaperTradingDays, getRequiredPaperDays, canGoLive } from '../execution-mode.js';
import * as cli from '../polymarket-cli.js';
import { stopAgent, getAgentStatus } from '../agent/agentLoop.js';

const router = Router();

// In-memory cache for market searches
let marketsCache = null;
let marketsCacheTime = 0;
const MARKETS_CACHE_TTL = 3600000; // 1 hour

// ─── GET /api/setup-status ───
router.get('/api/setup-status', (req, res) => {
  try {
    const status = getSetupStatus();
    res.json(status);
  } catch (err) {
    console.error('Setup status error:', err);
    res.status(500).json({ error: 'Failed to get setup status' });
  }
});

// ─── GET /api/execution-mode ───
router.get('/api/execution-mode', (req, res) => {
  res.json({
    mode: getExecutionMode(),
    paper_days: getPaperTradingDays(),
    required_paper_days: getRequiredPaperDays(),
    live_gates: canGoLive(),
  });
});

// ─── GET /api/polymarket/markets ───
router.get('/api/polymarket/markets', (req, res) => {
  try {
    const query = req.query.q || 'bitcoin';

    // Return cached results if fresh
    if (marketsCache && Date.now() - marketsCacheTime < MARKETS_CACHE_TTL) {
      return res.json(marketsCache);
    }

    if (!cli.isCliInstalled()) {
      return res.json({ markets: [], cli_installed: false, message: 'Polymarket CLI not installed' });
    }

    try {
      const result = cli.searchMarkets(query, 10);
      const data = { markets: result, cli_installed: true, cached: false };
      marketsCache = data;
      marketsCacheTime = Date.now();
      res.json(data);
    } catch (cliErr) {
      res.json({ markets: [], cli_installed: true, error: cliErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// ─── GET /api/polymarket/market/:id ───
router.get('/api/polymarket/market/:id', (req, res) => {
  try {
    if (!cli.isCliInstalled()) {
      return res.json({ error: 'CLI not installed', cli_installed: false });
    }
    const market = cli.getMarket(req.params.id);
    res.json(market);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/polymarket/price/:tokenId ───
router.get('/api/polymarket/price/:tokenId', (req, res) => {
  try {
    if (!cli.isCliInstalled()) {
      return res.json({ error: 'CLI not installed', cli_installed: false });
    }

    const tokenId = req.params.tokenId;
    let midpoint = null;
    let spread = null;
    let book = null;

    try { midpoint = cli.getMidpoint(tokenId); } catch {}
    try { spread = cli.getSpread(tokenId); } catch {}
    try { book = cli.getOrderBook(tokenId); } catch {}

    res.json({ midpoint, spread, book, token_id: tokenId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/emergency-stop ───
router.post('/api/emergency-stop', (req, res) => {
  try {
    const mode = getExecutionMode();
    let cancelResult = null;

    // If live mode, cancel all open orders
    if (mode === 'live' && cli.isCliInstalled()) {
      try {
        cancelResult = cli.cancelAll();
      } catch (err) {
        cancelResult = { error: err.message };
      }
    }

    // Stop the agent
    stopAgent('EMERGENCY_STOP');

    // Log the emergency stop
    const db = getDb();
    db.prepare(
      `INSERT INTO execution_log (mode, decision, cli_command, cli_response, created_at) VALUES (?, 'EMERGENCY_STOP', ?, ?, datetime('now'))`
    ).run(mode, mode === 'live' ? 'polymarket -o json clob cancel-all' : null, cancelResult ? JSON.stringify(cancelResult) : null);

    res.json({
      success: true,
      mode,
      orders_cancelled: cancelResult,
      message: mode === 'live'
        ? 'Agent stopped. All open orders cancelled.'
        : 'Agent stopped.',
    });
  } catch (err) {
    console.error('Emergency stop error:', err);
    res.status(500).json({ error: 'Emergency stop failed: ' + err.message });
  }
});

export default router;
