import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { gatewayAuth, hashApiKey } from '../middleware/gatewayAuth.js';
import { shouldStop, calculateBetSize } from '../agent/moneyManager.js';

const router = Router();

// ─── POST /api/gateway/register ───
router.post('/api/gateway/register', (req, res) => {
  try {
    const { agent_name, agent_type = 'custom', config = {} } = req.body;
    if (!agent_name) {
      return res.status(400).json({ error: 'agent_name is required' });
    }
    if (!['openclaw', 'polymarket', 'custom'].includes(agent_type)) {
      return res.status(400).json({ error: 'agent_type must be openclaw, polymarket, or custom' });
    }

    const agentId = 'agent_' + crypto.randomBytes(8).toString('hex');
    const apiKey = 'pk_' + crypto.randomBytes(24).toString('hex');
    const walletAddress = '0x' + crypto.randomBytes(20).toString('hex');

    const agentConfig = {
      max_bet_percent: config.max_bet_percent || 2,
      daily_stop_loss: config.daily_stop_loss || 10,
      daily_profit_target: config.daily_profit_target || 5,
      skip_threshold: config.skip_threshold || 60,
      markets: config.markets || ['BTC'],
      cooldown_seconds: config.cooldown_seconds || 60,
    };

    const startingBankroll = config.starting_bankroll || 100;

    getDb().prepare(
      `INSERT INTO agents (agent_id, agent_name, agent_type, api_key_hash, config, wallet_address, bankroll, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
    ).run(agentId, agent_name, agent_type, hashApiKey(apiKey), JSON.stringify(agentConfig), walletAddress, startingBankroll);

    res.json({
      agent_id: agentId,
      api_key: apiKey,
      wallet_address: walletAddress,
      config: agentConfig,
      bankroll: startingBankroll,
      message: 'Agent registered. Save your API key — it will not be shown again.',
    });
  } catch (err) {
    console.error('Gateway register error:', err);
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

// ─── Helper: get agent's daily stats from agent_signals ───
function getAgentDailyStats(agentId, config, bankroll) {
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();

  const todaySignals = db.prepare(
    `SELECT * FROM agent_signals WHERE agent_id = ? AND date(created_at) = ? ORDER BY id ASC`
  ).all(agentId, today);

  let currentPnl = 0;
  let consecutiveLosses = 0;
  let consecutiveWins = 0;
  let wins = 0;
  let losses = 0;
  let skips = 0;
  let executes = 0;
  let blocks = 0;
  let lastSignalTime = null;

  for (const s of todaySignals) {
    if (s.decision === 'EXECUTE') {
      executes++;
      currentPnl += s.pnl || 0;
      if (s.result === 'WIN') {
        wins++;
        consecutiveWins++;
        consecutiveLosses = 0;
      } else if (s.result === 'LOSS') {
        losses++;
        consecutiveLosses++;
        consecutiveWins = 0;
      }
    } else if (s.decision === 'SKIP') {
      skips++;
    } else if (s.decision === 'BLOCK') {
      blocks++;
    }
    lastSignalTime = s.created_at;
  }

  // Find start of day bankroll from first signal or current bankroll
  const firstToday = todaySignals.find(s => s.decision === 'EXECUTE');
  const startBankroll = firstToday ? (firstToday.bankroll_after - (firstToday.pnl || 0)) : bankroll;

  return {
    current_pnl: currentPnl,
    start_bankroll: startBankroll,
    consecutive_losses: consecutiveLosses,
    consecutive_wins: consecutiveWins,
    is_paused: 0,
    pause_until: null,
    wins, losses, skips, executes, blocks,
    lastSignalTime,
    totalToday: todaySignals.length,
  };
}

// ─── POST /api/gateway/submit-signal ───
router.post('/api/gateway/submit-signal', gatewayAuth, (req, res) => {
  try {
    const agent = req.agent;
    const config = agent.parsedConfig;
    const { market, direction, confidence, reasoning, source, metadata } = req.body;

    // Validate input
    if (!market || !direction || confidence === undefined) {
      return res.status(400).json({ error: 'market, direction, and confidence are required' });
    }
    if (!['UP', 'DOWN'].includes(direction.toUpperCase())) {
      return res.status(400).json({ error: 'direction must be UP or DOWN' });
    }
    if (confidence < 0 || confidence > 100) {
      return res.status(400).json({ error: 'confidence must be 0-100' });
    }
    if (agent.status !== 'active') {
      return res.status(400).json({ error: 'Agent is stopped. Cannot accept signals.' });
    }

    const allowedMarkets = config.markets || ['BTC'];
    if (!allowedMarkets.includes(market.toUpperCase())) {
      return res.status(400).json({ error: `Market ${market} not in allowed markets: ${allowedMarkets.join(', ')}` });
    }

    const dailyStats = getAgentDailyStats(agent.agent_id, config, agent.bankroll);

    // Build discipline-compatible stats for shouldStop()
    const disciplineStats = {
      current_pnl: dailyStats.current_pnl,
      start_bankroll: dailyStats.start_bankroll,
      consecutive_losses: dailyStats.consecutive_losses,
      is_paused: dailyStats.is_paused,
      pause_until: dailyStats.pause_until,
    };

    // Override thresholds from agent config
    const stopLossPct = (config.daily_stop_loss || 10) / 100;
    const profitTargetPct = (config.daily_profit_target || 5) / 100;

    let decision = 'EXECUTE';
    let decisionReason = null;

    // Check 1: Confidence threshold
    const skipThreshold = config.skip_threshold || 60;
    if (confidence < skipThreshold) {
      decision = 'SKIP';
      decisionReason = `Confidence ${confidence}% below threshold ${skipThreshold}%`;
    }

    // Check 2: Daily stop-loss
    if (decision === 'EXECUTE' && dailyStats.start_bankroll > 0 &&
        dailyStats.current_pnl <= -(dailyStats.start_bankroll * stopLossPct)) {
      decision = 'BLOCK';
      decisionReason = `Daily stop-loss reached: ${dailyStats.current_pnl.toFixed(2)} <= -${(dailyStats.start_bankroll * stopLossPct).toFixed(2)}`;
    }

    // Check 3: Daily profit target
    if (decision === 'EXECUTE' && dailyStats.start_bankroll > 0 &&
        dailyStats.current_pnl >= (dailyStats.start_bankroll * profitTargetPct)) {
      decision = 'BLOCK';
      decisionReason = `Daily profit target reached: ${dailyStats.current_pnl.toFixed(2)} >= +${(dailyStats.start_bankroll * profitTargetPct).toFixed(2)}`;
    }

    // Check 4: Consecutive losses
    if (decision === 'EXECUTE' && dailyStats.consecutive_losses >= 4) {
      decision = 'BLOCK';
      decisionReason = `${dailyStats.consecutive_losses} consecutive losses — cooldown triggered`;
    }

    // Check 5: Cooldown
    if (decision === 'EXECUTE' && dailyStats.lastSignalTime) {
      const cooldownMs = (config.cooldown_seconds || 60) * 1000;
      const elapsed = Date.now() - new Date(dailyStats.lastSignalTime).getTime();
      if (elapsed < cooldownMs) {
        decision = 'BLOCK';
        decisionReason = `Cooldown: ${Math.ceil((cooldownMs - elapsed) / 1000)}s remaining`;
      }
    }

    // Check 6: Bankroll too low
    if (decision === 'EXECUTE' && agent.bankroll <= 0) {
      decision = 'BLOCK';
      decisionReason = 'Bankroll depleted';
    }

    // Calculate bet amount
    const betPct = (config.max_bet_percent || 2) / 100;
    let betAmount = 0;
    let result = null;
    let pnl = 0;
    let bankrollAfter = agent.bankroll;

    if (decision === 'EXECUTE') {
      betAmount = parseFloat((agent.bankroll * betPct).toFixed(2));
      if (betAmount < 0.01) {
        decision = 'BLOCK';
        decisionReason = 'Bet amount too small';
      }
    }

    // Execute mock bet (50/50 simulation weighted by confidence)
    if (decision === 'EXECUTE') {
      const winProbability = 0.4 + (confidence / 100) * 0.25;
      result = Math.random() < winProbability ? 'WIN' : 'LOSS';
      pnl = result === 'WIN' ? betAmount : -betAmount;
      bankrollAfter = parseFloat((agent.bankroll + pnl).toFixed(2));

      // Update agent bankroll
      getDb().prepare('UPDATE agents SET bankroll = ?, updated_at = CURRENT_TIMESTAMP WHERE agent_id = ?')
        .run(bankrollAfter, agent.agent_id);
    }

    // Log the signal
    getDb().prepare(
      `INSERT INTO agent_signals (agent_id, market, direction, confidence, reasoning, source, metadata, decision, decision_reason, bet_amount, result, pnl, bankroll_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      agent.agent_id, market.toUpperCase(), direction.toUpperCase(), confidence,
      reasoning || null, source || null, JSON.stringify(metadata || {}),
      decision, decisionReason, betAmount, result, pnl, bankrollAfter
    );

    res.json({
      decision,
      decision_reason: decisionReason,
      bet_amount: betAmount,
      result,
      pnl,
      bankroll: bankrollAfter,
      signal: { market, direction: direction.toUpperCase(), confidence },
    });
  } catch (err) {
    console.error('Gateway submit-signal error:', err);
    res.status(500).json({ error: 'Failed to process signal' });
  }
});

// ─── GET /api/gateway/status ───
router.get('/api/gateway/status', gatewayAuth, (req, res) => {
  try {
    const agent = req.agent;
    const config = agent.parsedConfig;
    const dailyStats = getAgentDailyStats(agent.agent_id, config, agent.bankroll);

    // Lifetime stats
    const db = getDb();
    const lifetime = db.prepare(
      `SELECT
        COUNT(*) as total_signals,
        SUM(CASE WHEN decision = 'EXECUTE' THEN 1 ELSE 0 END) as executes,
        SUM(CASE WHEN decision = 'SKIP' THEN 1 ELSE 0 END) as skips,
        SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END) as blocks,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN decision = 'EXECUTE' THEN pnl ELSE 0 END) as total_pnl
       FROM agent_signals WHERE agent_id = ?`
    ).get(agent.agent_id);

    res.json({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      agent_type: agent.agent_type,
      status: agent.status,
      bankroll: agent.bankroll,
      config,
      today: {
        pnl: dailyStats.current_pnl,
        wins: dailyStats.wins,
        losses: dailyStats.losses,
        skips: dailyStats.skips,
        blocks: dailyStats.blocks,
        executes: dailyStats.executes,
        consecutive_losses: dailyStats.consecutive_losses,
        signals_count: dailyStats.totalToday,
      },
      lifetime: {
        total_signals: lifetime.total_signals || 0,
        executes: lifetime.executes || 0,
        skips: lifetime.skips || 0,
        blocks: lifetime.blocks || 0,
        wins: lifetime.wins || 0,
        losses: lifetime.losses || 0,
        total_pnl: parseFloat((lifetime.total_pnl || 0).toFixed(2)),
        win_rate: lifetime.executes > 0
          ? parseFloat(((lifetime.wins / lifetime.executes) * 100).toFixed(1))
          : 0,
      },
      limits: {
        daily_stop_loss: `${config.daily_stop_loss || 10}%`,
        daily_stop_loss_remaining: parseFloat(((dailyStats.start_bankroll * (config.daily_stop_loss || 10) / 100) + dailyStats.current_pnl).toFixed(2)),
        daily_profit_target: `${config.daily_profit_target || 5}%`,
        daily_profit_remaining: parseFloat(((dailyStats.start_bankroll * (config.daily_profit_target || 5) / 100) - dailyStats.current_pnl).toFixed(2)),
        consecutive_losses: `${dailyStats.consecutive_losses}/4`,
        cooldown_seconds: config.cooldown_seconds || 60,
      },
      created_at: agent.created_at,
    });
  } catch (err) {
    console.error('Gateway status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ─── GET /api/gateway/agents (admin — no auth) ───
router.get('/api/gateway/agents', (req, res) => {
  try {
    const db = getDb();
    const agents = db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all();

    const result = agents.map(a => {
      const config = JSON.parse(a.config || '{}');
      const dailyStats = getAgentDailyStats(a.agent_id, config, a.bankroll);

      const lifetime = db.prepare(
        `SELECT
          COUNT(*) as total_signals,
          SUM(CASE WHEN decision = 'EXECUTE' THEN 1 ELSE 0 END) as executes,
          SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losses,
          SUM(CASE WHEN decision = 'EXECUTE' THEN pnl ELSE 0 END) as total_pnl
         FROM agent_signals WHERE agent_id = ?`
      ).get(a.agent_id);

      return {
        agent_id: a.agent_id,
        agent_name: a.agent_name,
        agent_type: a.agent_type,
        status: a.status,
        bankroll: a.bankroll,
        config,
        today_pnl: parseFloat(dailyStats.current_pnl.toFixed(2)),
        today_signals: dailyStats.totalToday,
        lifetime_pnl: parseFloat((lifetime.total_pnl || 0).toFixed(2)),
        lifetime_signals: lifetime.total_signals || 0,
        lifetime_wins: lifetime.wins || 0,
        lifetime_losses: lifetime.losses || 0,
        win_rate: lifetime.executes > 0
          ? parseFloat(((lifetime.wins / lifetime.executes) * 100).toFixed(1))
          : 0,
        created_at: a.created_at,
      };
    });

    res.json({ agents: result, total: result.length, active: result.filter(a => a.status === 'active').length });
  } catch (err) {
    console.error('Gateway agents error:', err);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// ─── POST /api/gateway/stop ───
router.post('/api/gateway/stop', gatewayAuth, (req, res) => {
  try {
    const agent = req.agent;
    getDb().prepare("UPDATE agents SET status = 'stopped', updated_at = CURRENT_TIMESTAMP WHERE agent_id = ?")
      .run(agent.agent_id);

    res.json({
      agent_id: agent.agent_id,
      status: 'stopped',
      final_bankroll: agent.bankroll,
      message: 'Agent stopped. No further signals will be accepted.',
    });
  } catch (err) {
    console.error('Gateway stop error:', err);
    res.status(500).json({ error: 'Failed to stop agent' });
  }
});

// ─── GET /api/gateway/logs ───
router.get('/api/gateway/logs', gatewayAuth, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const logs = getDb().prepare(
      'SELECT * FROM agent_signals WHERE agent_id = ? ORDER BY id DESC LIMIT ?'
    ).all(req.agent.agent_id, limit);

    res.json({
      agent_id: req.agent.agent_id,
      logs: logs.map(l => ({
        ...l,
        metadata: JSON.parse(l.metadata || '{}'),
      })),
      count: logs.length,
    });
  } catch (err) {
    console.error('Gateway logs error:', err);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// ─── GET /api/gateway/agent/:agentId/signals (admin — for frontend) ───
router.get('/api/gateway/agent/:agentId/signals', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 200);
    const signals = getDb().prepare(
      'SELECT * FROM agent_signals WHERE agent_id = ? ORDER BY id DESC LIMIT ?'
    ).all(req.params.agentId, limit);

    res.json(signals.map(s => ({ ...s, metadata: JSON.parse(s.metadata || '{}') })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get signals' });
  }
});

export default router;
