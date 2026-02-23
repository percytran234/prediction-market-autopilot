import { config } from '../config.js';
import { getCurrentBTCPrice } from '../signals/priceService.js';
import {
  getSession,
  insertBet,
  updateBet,
  updateSession,
  getOrCreateDailyStats,
  updateDailyStats,
} from '../db/models.js';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function placeMockBet(direction, betAmount, sessionId, signalData = {}) {
  const session = getSession(sessionId);
  if (!session) throw new Error('Session not found');

  // 1. Record current BTC price
  const btcPriceStart = await getCurrentBTCPrice();

  // 2. Insert bet as PENDING
  const betId = insertBet({
    session_id: sessionId,
    round_time: new Date().toISOString(),
    direction,
    confidence: signalData.confidence || null,
    amount: betAmount,
    btc_price_start: btcPriceStart,
    btc_price_end: null,
    result: 'PENDING',
    pnl: 0,
    bankroll_after: session.bankroll,
    reasoning: signalData.reasoning || null,
  });

  console.log(`Bet #${betId} PENDING: ${direction} $${betAmount.toFixed(2)} at BTC $${btcPriceStart.toFixed(2)}`);

  // 3. Wait ROUND_INTERVAL_MINUTES
  const waitMs = config.roundIntervalMinutes * 60 * 1000;
  await wait(waitMs);

  // 4. Fetch BTC price again
  const btcPriceEnd = await getCurrentBTCPrice();

  // 5. Determine result
  let result;
  if (direction === 'UP') {
    result = btcPriceEnd > btcPriceStart ? 'WIN' : 'LOSS';
  } else {
    result = btcPriceEnd < btcPriceStart ? 'WIN' : 'LOSS';
  }
  if (btcPriceEnd === btcPriceStart) result = 'LOSS';

  const pnl = result === 'WIN' ? betAmount : -betAmount;

  // 6. Reload session for current bankroll (may have changed)
  const freshSession = getSession(sessionId);
  const newBankroll = freshSession.bankroll + pnl;

  // 7. Update bet record
  updateBet(betId, {
    btc_price_end: btcPriceEnd,
    result,
    pnl,
    bankroll_after: newBankroll,
  });

  // 8. Update session bankroll
  updateSession(sessionId, { bankroll: newBankroll });

  // 9. Update daily stats
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = getOrCreateDailyStats(sessionId, today, freshSession.bankroll);

  const statsUpdate = {
    current_pnl: dailyStats.current_pnl + pnl,
    total_bets: dailyStats.total_bets + 1,
  };

  if (result === 'WIN') {
    statsUpdate.wins = dailyStats.wins + 1;
    statsUpdate.consecutive_losses = 0;
    statsUpdate.consecutive_wins = (dailyStats.consecutive_wins || 0) + 1;
  } else {
    statsUpdate.losses = dailyStats.losses + 1;
    statsUpdate.consecutive_losses = dailyStats.consecutive_losses + 1;
    statsUpdate.consecutive_wins = 0;
  }

  updateDailyStats(dailyStats.id, statsUpdate);

  console.log(`Bet #${betId} ${result} | P&L: $${pnl.toFixed(2)} | BTC $${btcPriceStart.toFixed(2)} → $${btcPriceEnd.toFixed(2)} | Bankroll: $${newBankroll.toFixed(2)}`);

  return { result, pnl, btc_price_start: btcPriceStart, btc_price_end: btcPriceEnd };
}
