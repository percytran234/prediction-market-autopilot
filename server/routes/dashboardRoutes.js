import { Router } from 'express';
import { getLatestSession, getBetHistory, getOrCreateDailyStats } from '../db/models.js';
import { getAgentStatus } from '../agent/agentLoop.js';

const router = Router();

router.get('/api/dashboard', (req, res) => {
  try {
    const session = getLatestSession();
    if (!session) {
      return res.json({
        bankroll: 0,
        pnl: 0,
        pnlPercent: 0,
        winRate: 0,
        totalBets: 0,
        wins: 0,
        losses: 0,
        skips: 0,
        agentStatus: 'idle',
        stopReason: null,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyStats = getOrCreateDailyStats(session.id, today, session.bankroll);
    const { isActive } = getAgentStatus();

    const betsPlaced = dailyStats.wins + dailyStats.losses;
    const winRate = betsPlaced > 0 ? (dailyStats.wins / betsPlaced) * 100 : 0;

    res.json({
      bankroll: session.bankroll,
      pnl: dailyStats.current_pnl,
      pnlPercent: dailyStats.start_bankroll > 0
        ? (dailyStats.current_pnl / dailyStats.start_bankroll) * 100
        : 0,
      winRate,
      totalBets: dailyStats.total_bets,
      wins: dailyStats.wins,
      losses: dailyStats.losses,
      skips: dailyStats.skips,
      agentStatus: isActive ? 'active' : session.status,
      stopReason: session.stop_reason,
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

export default router;
