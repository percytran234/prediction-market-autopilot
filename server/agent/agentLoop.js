import cron from 'node-cron';
import { config } from '../config.js';
import { computeSignals } from '../signals/signalEngine.js';
import { calculateBetSize } from './moneyManager.js';
import { checkAutoStop } from './autoStop.js';
import { resolveBet } from '../polymarket/mock.js';
import {
  getSession,
  updateSession,
  insertBet,
  updateBet,
  getPendingBet,
  getOrCreateDailyStats,
  updateDailyStats,
} from '../db/models.js';

let activeJob = null;
let activeSessionId = null;

export function startAgentLoop(sessionId) {
  if (activeJob) {
    activeJob.stop();
  }

  activeSessionId = sessionId;
  updateSession(sessionId, { status: 'active' });

  const cronExpr = `*/${config.roundIntervalMinutes} * * * *`;

  activeJob = cron.schedule(cronExpr, async () => {
    try {
      await runRound(sessionId);
    } catch (err) {
      console.error('Agent loop error:', err.message);
    }
  });

  // Run first round immediately
  setTimeout(() => runRound(sessionId).catch(err => console.error('First round error:', err.message)), 2000);

  console.log(`Agent started for session ${sessionId} (every ${config.roundIntervalMinutes} min)`);
  return activeJob;
}

export function stopAgentLoop(reason = 'USER_STOPPED') {
  if (activeJob) {
    activeJob.stop();
    activeJob = null;
  }
  if (activeSessionId) {
    updateSession(activeSessionId, { status: 'stopped', stop_reason: reason });
    activeSessionId = null;
  }
}

export function getAgentStatus() {
  return {
    isActive: activeJob !== null,
    sessionId: activeSessionId,
  };
}

async function runRound(sessionId) {
  const session = getSession(sessionId);
  if (!session || session.status !== 'active') {
    stopAgentLoop('SESSION_INVALID');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyStats = getOrCreateDailyStats(sessionId, today, session.bankroll);

  // First resolve any pending bet
  const pendingBet = getPendingBet(sessionId);
  if (pendingBet) {
    await resolvePendingBet(pendingBet, session, dailyStats);
    return; // Let the next round place a new bet
  }

  // Check auto-stop conditions
  const stopCheck = checkAutoStop(sessionId, session.bankroll);
  if (stopCheck.stop) {
    if (stopCheck.reason !== 'PAUSED') {
      stopAgentLoop(stopCheck.reason);
    }
    console.log(`Agent stopped: ${stopCheck.reason}`);
    return;
  }

  // Compute signals
  const signals = await computeSignals();
  console.log(`Signal: ${signals.direction} (confidence: ${signals.confidence}%)`);

  if (signals.confidence < 60) {
    // SKIP
    insertBet({
      session_id: sessionId,
      round_time: new Date().toISOString(),
      direction: 'SKIP',
      confidence: signals.confidence,
      amount: 0,
      btc_price_start: signals.currentPrice,
      btc_price_end: null,
      result: 'SKIP',
      pnl: 0,
      bankroll_after: session.bankroll,
      reasoning: `Confidence ${signals.confidence.toFixed(1)}% below 60% threshold. Skipping.`,
    });

    updateDailyStats(dailyStats.id, { skips: dailyStats.skips + 1 });
    console.log('Skipped round (low confidence)');
    return;
  }

  // Place bet
  const betSize = calculateBetSize(session.bankroll, dailyStats.consecutive_wins || 0);

  const betId = insertBet({
    session_id: sessionId,
    round_time: new Date().toISOString(),
    direction: signals.direction,
    confidence: signals.confidence,
    amount: betSize,
    btc_price_start: signals.currentPrice,
    btc_price_end: null,
    result: 'PENDING',
    pnl: 0,
    bankroll_after: session.bankroll,
    reasoning: `${signals.direction} signal: EMA momentum ${signals.signals.momentum}, RSI ${signals.signals.rsi}, Volume ratio ${signals.signals.volumeRatio}`,
  });

  console.log(`Bet placed: ${signals.direction} $${betSize.toFixed(2)} at BTC $${signals.currentPrice.toFixed(2)}`);
}

async function resolvePendingBet(bet, session, dailyStats) {
  const resolution = await resolveBet(bet.direction, bet.btc_price_start);
  const pnl = resolution.result === 'WIN' ? bet.amount * 0.85 : -bet.amount; // 85% payout on win
  const newBankroll = session.bankroll + pnl;

  updateBet(bet.id, {
    btc_price_end: resolution.btcPriceEnd,
    result: resolution.result,
    pnl: pnl,
    bankroll_after: newBankroll,
  });

  updateSession(session.id, { bankroll: newBankroll });

  // Update daily stats
  const statsUpdate = {
    current_pnl: dailyStats.current_pnl + pnl,
    total_bets: dailyStats.total_bets + 1,
  };

  if (resolution.result === 'WIN') {
    statsUpdate.wins = dailyStats.wins + 1;
    statsUpdate.consecutive_losses = 0;
    statsUpdate.consecutive_wins = (dailyStats.consecutive_wins || 0) + 1;
  } else {
    statsUpdate.losses = dailyStats.losses + 1;
    statsUpdate.consecutive_losses = dailyStats.consecutive_losses + 1;
    statsUpdate.consecutive_wins = 0;
  }

  updateDailyStats(dailyStats.id, statsUpdate);
  console.log(`Bet resolved: ${resolution.result} | P&L: $${pnl.toFixed(2)} | Bankroll: $${newBankroll.toFixed(2)}`);
}
