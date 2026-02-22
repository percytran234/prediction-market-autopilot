export function calculateBetSize(bankroll, consecutiveWins = 0) {
  const basePercent = 0.02; // 2%
  const streakBonus = consecutiveWins >= 3 ? 0.01 : 0; // 3% after 3 wins
  return bankroll * (basePercent + streakBonus);
}

export function shouldStop(dailyStats) {
  const { current_pnl, start_bankroll, consecutive_losses, is_paused, pause_until } = dailyStats;

  if (is_paused && pause_until && new Date() < new Date(pause_until)) {
    return { stop: true, reason: 'PAUSED' };
  }

  if (current_pnl <= -(start_bankroll * 0.10)) {
    return { stop: true, reason: 'DAILY_LOSS_LIMIT' };
  }

  if (current_pnl >= (start_bankroll * 0.05)) {
    return { stop: true, reason: 'DAILY_PROFIT_TARGET' };
  }

  if (consecutive_losses >= 4) {
    return { stop: true, reason: 'CONSECUTIVE_LOSSES', pauseFor: 3600000 };
  }

  return { stop: false };
}
