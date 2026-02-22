import { Router } from 'express';
import { getLatestSession, getBetHistory, getAllBets, getOrCreateDailyStats } from '../db/models.js';
import { computeSignals } from '../signals/signalEngine.js';

const router = Router();

router.get('/api/dashboard', (req, res) => {
  try {
    const session = getLatestSession();
    if (!session) {
      return res.json({
        bankroll: 0,
        dailyPnl: 0,
        dailyPnlPercent: 0,
        winRate: 0,
        totalBets: 0,
        wins: 0,
        losses: 0,
        skips: 0,
        status: 'idle',
        stopReason: null,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyStats = getOrCreateDailyStats(session.id, today, session.bankroll);

    const totalBetsPlaced = dailyStats.wins + dailyStats.losses;
    const winRate = totalBetsPlaced > 0 ? (dailyStats.wins / totalBetsPlaced) * 100 : 0;

    res.json({
      bankroll: session.bankroll,
      deposit: session.deposit_amount,
      dailyPnl: dailyStats.current_pnl,
      dailyPnlPercent: dailyStats.start_bankroll > 0
        ? (dailyStats.current_pnl / dailyStats.start_bankroll) * 100
        : 0,
      winRate,
      totalBets: dailyStats.total_bets,
      wins: dailyStats.wins,
      losses: dailyStats.losses,
      skips: dailyStats.skips,
      status: session.status,
      stopReason: session.stop_reason,
      consecutiveLosses: dailyStats.consecutive_losses,
      consecutiveWins: dailyStats.consecutive_wins || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/bets/history', (req, res) => {
  try {
    const session = getLatestSession();
    if (!session) return res.json([]);

    const bets = getBetHistory(session.id, 50);
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/signals/current', async (req, res) => {
  try {
    const signals = await computeSignals();
    res.json(signals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
