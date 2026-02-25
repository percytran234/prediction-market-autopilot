import cron from 'node-cron';
import { config } from '../config.js';
import { computeSignals } from '../signals/signalEngine.js';
import { calculateBetSize, shouldStop } from './moneyManager.js';
import { placeMockBet } from './mockBetting.js';
import {
  getSession,
  updateSession,
  insertBet,
  getOrCreateDailyStats,
  updateDailyStats,
} from '../db/models.js';
import { getExecutionMode, recordPaperDay } from '../execution-mode.js';
import { getDb } from '../db/database.js';
import * as cli from '../polymarket-cli.js';

let activeJob = null;
let activeSessionId = null;
let roundRunning = false;

export function startAgent(sessionId) {
  if (activeJob) {
    activeJob.stop();
  }

  activeSessionId = sessionId;
  updateSession(sessionId, { status: 'active' });

  const cronExpr = `*/${config.roundIntervalMinutes} * * * *`;

  activeJob = cron.schedule(cronExpr, () => {
    runRound(sessionId).catch(err => console.error('Round error:', err.message));
  });

  // Run first round immediately
  setTimeout(() => runRound(sessionId).catch(err => console.error('First round error:', err.message)), 1000);

  const mode = getExecutionMode();
  console.log(`Agent started for session ${sessionId} (every ${config.roundIntervalMinutes} min) [mode: ${mode}]`);
}

export function stopAgent(reason = 'USER_STOPPED') {
  if (activeJob) {
    activeJob.stop();
    activeJob = null;
  }
  if (activeSessionId) {
    updateSession(activeSessionId, { status: 'stopped', stop_reason: reason });
    activeSessionId = null;
  }
  roundRunning = false;
  console.log(`Agent stopped: ${reason}`);
}

export function getAgentStatus() {
  return {
    isActive: activeJob !== null,
    sessionId: activeSessionId,
  };
}

function logExecution(data) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO execution_log (mode, market_slug, token_id, direction, confidence, decision, bet_amount_usd, cli_command, cli_response, order_id, execution_price, slippage, result, pnl, bankroll_after, polymarket_midpoint, polymarket_spread, binance_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.mode, data.market_slug ?? null, data.token_id ?? null,
      data.direction ?? null, data.confidence ?? null, data.decision ?? null,
      data.bet_amount_usd ?? null, data.cli_command ?? null, data.cli_response ?? null,
      data.order_id ?? null, data.execution_price ?? null, data.slippage ?? null,
      data.result ?? null, data.pnl ?? null, data.bankroll_after ?? null,
      data.polymarket_midpoint ?? null, data.polymarket_spread ?? null, data.binance_price ?? null
    );
  } catch (err) {
    console.error('Failed to log execution:', err.message);
  }
}

function fetchPolymarketData() {
  if (!cli.isCliInstalled()) {
    return { midpoint: null, spread: null, marketSlug: null, tokenId: null, error: 'CLI not installed' };
  }
  let midpoint = null, spread = null, marketSlug = null, tokenId = null;
  try {
    const markets = cli.searchMarkets('bitcoin', 5);
    if (Array.isArray(markets) && markets.length > 0) {
      const market = markets[0];
      marketSlug = market.slug || market.condition_id || market.id;
      tokenId = market.tokens?.[0]?.token_id || market.token_id || null;
    }
    if (tokenId) {
      try { midpoint = cli.getMidpoint(tokenId); } catch {}
      try { spread = cli.getSpread(tokenId); } catch {}
    }
  } catch (err) {
    return { midpoint, spread, marketSlug, tokenId, error: err.message };
  }
  return { midpoint, spread, marketSlug, tokenId, error: null };
}

function parseCliNum(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object') return parseFloat(val.mid || val.spread || val.value || val.price || '0');
  return parseFloat(val) || null;
}

async function runRound(sessionId) {
  if (roundRunning) return;
  roundRunning = true;

  try {
    const session = getSession(sessionId);
    if (!session || session.status !== 'active') {
      stopAgent('SESSION_INVALID');
      return;
    }

    const mode = getExecutionMode();
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = getOrCreateDailyStats(sessionId, today, session.bankroll);

    // 1. Pre-bet stop check
    const preCheck = shouldStop(dailyStats);
    if (preCheck.stop) {
      if (preCheck.reason === 'CONSECUTIVE_LOSSES' && preCheck.pauseFor) {
        const pauseUntil = new Date(Date.now() + preCheck.pauseFor).toISOString();
        updateDailyStats(dailyStats.id, { is_paused: 1, pause_until: pauseUntil });
      }
      stopAgent(preCheck.reason);
      return;
    }

    // 2. Fetch Polymarket data if paper/live
    let polyData = null;
    if (mode === 'paper' || mode === 'live') {
      polyData = fetchPolymarketData();
      // Spread guard
      const spreadVal = parseCliNum(polyData.spread);
      if (spreadVal != null && spreadVal > 0.05) {
        console.log(`Skipped: spread too wide (${spreadVal.toFixed(4)} > 0.05)`);
        logExecution({ mode, decision: 'SKIP_SPREAD', polymarket_spread: spreadVal, market_slug: polyData.marketSlug, token_id: polyData.tokenId, bankroll_after: session.bankroll });
        return;
      }
    }

    // 3. Compute signals
    const signals = await computeSignals();
    console.log(`Signal: ${signals.direction} (confidence: ${signals.confidence.toFixed(1)}%) [${mode}]`);

    // 4. Check confidence threshold
    if (signals.confidence < 60) {
      insertBet({
        session_id: sessionId, round_time: new Date().toISOString(),
        direction: 'SKIP', confidence: signals.confidence, amount: 0,
        btc_price_start: null, btc_price_end: null, result: 'SKIP', pnl: 0,
        bankroll_after: session.bankroll, reasoning: signals.reasoning,
      });
      updateDailyStats(dailyStats.id, { total_bets: dailyStats.total_bets + 1, skips: dailyStats.skips + 1 });
      if (mode !== 'mock') {
        logExecution({
          mode, direction: signals.direction, confidence: signals.confidence,
          decision: 'SKIP_CONFIDENCE', bankroll_after: session.bankroll,
          polymarket_midpoint: parseCliNum(polyData?.midpoint),
          polymarket_spread: parseCliNum(polyData?.spread),
          market_slug: polyData?.marketSlug, token_id: polyData?.tokenId,
        });
      }
      console.log('Skipped (confidence below 60%)');
      return;
    }

    // 5. Calculate bet size
    const betSize = calculateBetSize(session.bankroll, dailyStats.consecutive_wins || 0);

    // 6. Execute based on mode
    if (mode === 'mock') {
      await placeMockBet(signals.direction, betSize, sessionId, signals);

    } else if (mode === 'paper') {
      const betResult = await placeMockBet(signals.direction, betSize, sessionId, signals);
      logExecution({
        mode: 'paper', market_slug: polyData?.marketSlug, token_id: polyData?.tokenId,
        direction: signals.direction, confidence: signals.confidence,
        decision: 'EXECUTE_PAPER', bet_amount_usd: betSize,
        result: betResult.result, pnl: betResult.pnl,
        bankroll_after: session.bankroll + betResult.pnl,
        polymarket_midpoint: parseCliNum(polyData?.midpoint),
        polymarket_spread: parseCliNum(polyData?.spread),
        binance_price: betResult.btc_price_start,
      });
      recordPaperDay({
        wins: betResult.result === 'WIN' ? 1 : 0,
        losses: betResult.result === 'LOSS' ? 1 : 0,
        skips: 0, pnl: betResult.pnl,
      });

    } else if (mode === 'live') {
      if (!polyData?.tokenId) {
        console.error('Live mode: no token ID available, skipping');
        logExecution({ mode: 'live', direction: signals.direction, confidence: signals.confidence, decision: 'SKIP_NO_TOKEN', bankroll_after: session.bankroll });
        return;
      }
      const side = signals.direction === 'UP' ? 'buy' : 'sell';
      const cliCommand = `polymarket -o json clob market-order --token ${polyData.tokenId} --side ${side} --amount ${betSize.toFixed(2)}`;
      let orderResult, orderId, executionPrice;
      try {
        orderResult = cli.marketOrder(polyData.tokenId, side, betSize.toFixed(2));
        orderId = orderResult?.order_id || orderResult?.id || null;
        executionPrice = parseFloat(orderResult?.avg_price || orderResult?.price || '0');
      } catch (cliErr) {
        console.error('Live order failed:', cliErr.message);
        logExecution({
          mode: 'live', direction: signals.direction, confidence: signals.confidence,
          decision: 'EXECUTE_FAILED', bet_amount_usd: betSize,
          cli_command: cliCommand, cli_response: JSON.stringify({ error: cliErr.message }),
          market_slug: polyData.marketSlug, token_id: polyData.tokenId, bankroll_after: session.bankroll,
        });
        stopAgent('CLI_ORDER_FAILED');
        return;
      }
      insertBet({
        session_id: sessionId, round_time: new Date().toISOString(),
        direction: signals.direction, confidence: signals.confidence, amount: betSize,
        btc_price_start: parseCliNum(polyData.midpoint) || executionPrice,
        btc_price_end: null, result: 'PENDING', pnl: 0, bankroll_after: session.bankroll,
        reasoning: signals.reasoning + ` [LIVE order: ${orderId}]`,
      });
      logExecution({
        mode: 'live', market_slug: polyData.marketSlug, token_id: polyData.tokenId,
        direction: signals.direction, confidence: signals.confidence,
        decision: 'EXECUTE_LIVE', bet_amount_usd: betSize,
        cli_command: cliCommand, cli_response: JSON.stringify(orderResult),
        order_id: orderId, execution_price: executionPrice,
        polymarket_midpoint: parseCliNum(polyData.midpoint), bankroll_after: session.bankroll,
      });
    }

    // 7. Post-bet stop check
    const freshSession = getSession(sessionId);
    const freshStats = getOrCreateDailyStats(sessionId, today, freshSession.bankroll);
    const postCheck = shouldStop(freshStats);
    if (postCheck.stop) {
      if (postCheck.reason === 'CONSECUTIVE_LOSSES' && postCheck.pauseFor) {
        const pauseUntil = new Date(Date.now() + postCheck.pauseFor).toISOString();
        updateDailyStats(freshStats.id, { is_paused: 1, pause_until: pauseUntil });
      }
      stopAgent(postCheck.reason);
    }
  } finally {
    roundRunning = false;
  }
}
