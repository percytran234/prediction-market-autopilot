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

  console.log(`Agent started for session ${sessionId} (every ${config.roundIntervalMinutes} min)`);
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

async function runRound(sessionId) {
  // Prevent overlapping rounds (bet wait can exceed interval)
  if (roundRunning) return;
  roundRunning = true;

  try {
    const session = getSession(sessionId);
    if (!session || session.status !== 'active') {
      stopAgent('SESSION_INVALID');
      return;
    }

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

    // 2. Compute signals
    const signals = await computeSignals();
    console.log(`Signal: ${signals.direction} (confidence: ${signals.confidence.toFixed(1)}%)`);

    // 3. Check confidence threshold
    if (signals.confidence < 60) {
      insertBet({
        session_id: sessionId,
        round_time: new Date().toISOString(),
        direction: 'SKIP',
        confidence: signals.confidence,
        amount: 0,
        btc_price_start: null,
        btc_price_end: null,
        result: 'SKIP',
        pnl: 0,
        bankroll_after: session.bankroll,
        reasoning: signals.reasoning,
      });
      updateDailyStats(dailyStats.id, {
        total_bets: dailyStats.total_bets + 1,
        skips: dailyStats.skips + 1,
      });
      console.log('Skipped (confidence below 60%)');
      return;
    }

    // 4. Calculate bet size and place mock bet
    const betSize = calculateBetSize(session.bankroll, dailyStats.consecutive_wins || 0);
    const betResult = await placeMockBet(signals.direction, betSize, sessionId, signals);

    // 5. Post-bet stop check
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
