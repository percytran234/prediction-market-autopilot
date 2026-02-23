export function calculateBetSize(bankroll, consecutiveWins = 0) {
  const percent = consecutiveWins >= 3 ? 0.03 : 0.02;
  return bankroll * percent;
}

export function shouldStop(dailyStats) {
  const { current_pnl, start_bankroll, consecutive_losses, is_paused, pause_until } = dailyStats;

  // Currently paused
  if (is_paused && pause_until && new Date() < new Date(pause_until)) {
    return { stop: true, reason: 'PAUSED' };
  }

  // Daily loss limit: -10%
  if (start_bankroll > 0 && current_pnl <= -(start_bankroll * 0.10)) {
    return { stop: true, reason: 'DAILY_LOSS_LIMIT' };
  }

  // Daily profit target: +5%
  if (start_bankroll > 0 && current_pnl >= (start_bankroll * 0.05)) {
    return { stop: true, reason: 'DAILY_PROFIT_TARGET' };
  }

  // Consecutive losses: pause 1 hour
  if (consecutive_losses >= 4) {
    return { stop: true, reason: 'CONSECUTIVE_LOSSES', pauseFor: 3600000 };
  }

  return { stop: false };
}
