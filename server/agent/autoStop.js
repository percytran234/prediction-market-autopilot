import { shouldStop } from './moneyManager.js';
import { getOrCreateDailyStats, updateDailyStats, updateSession } from '../db/models.js';

export function checkAutoStop(sessionId, bankroll) {
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = getOrCreateDailyStats(sessionId, today, bankroll);
  const result = shouldStop(dailyStats);

  if (result.stop) {
    if (result.reason === 'CONSECUTIVE_LOSSES' && result.pauseFor) {
      const pauseUntil = new Date(Date.now() + result.pauseFor).toISOString();
      updateDailyStats(dailyStats.id, { is_paused: 1, pause_until: pauseUntil });
    }

    if (result.reason === 'DAILY_LOSS_LIMIT' || result.reason === 'DAILY_PROFIT_TARGET') {
      updateSession(sessionId, { status: 'stopped', stop_reason: result.reason });
    }
  }

  return result;
}
