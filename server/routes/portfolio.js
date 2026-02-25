import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// Helper: get all resolved bets across all sessions
function getAllBets() {
  return getDb().prepare(`
    SELECT b.*, s.deposit_amount, s.created_at as session_created
    FROM bets b
    JOIN sessions s ON b.session_id = s.id
    WHERE b.result IN ('WIN', 'LOSS', 'SKIP')
    ORDER BY b.round_time ASC
  `).all();
}

// Helper: parse period string to days
function periodToDays(period) {
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  if (period === '90d') return 90;
  return 99999; // 'all'
}

// ─── GET /api/portfolio/summary ─────────────────────────────────────
router.get('/api/portfolio/summary', (req, res) => {
  try {
    const bets = getAllBets();
    if (!bets.length) return res.json({ empty: true });

    const session = getDb().prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT 1').get();
    const wins = bets.filter(b => b.result === 'WIN');
    const losses = bets.filter(b => b.result === 'LOSS');
    const skips = bets.filter(b => b.result === 'SKIP');
    const traded = wins.length + losses.length;
    const winRate = traded > 0 ? (wins.length / traded) * 100 : 0;

    const totalPnl = bets.reduce((s, b) => s + (b.pnl || 0), 0);
    const depositAmount = session ? session.deposit_amount : 0;
    const totalValue = session ? session.bankroll : 0;
    const pnlPercent = depositAmount > 0 ? (totalPnl / depositAmount) * 100 : 0;

    // Today's P&L
    const today = new Date().toISOString().split('T')[0];
    const todayBets = bets.filter(b => b.round_time && b.round_time.startsWith(today));
    const todayPnl = todayBets.reduce((s, b) => s + (b.pnl || 0), 0);

    const memberSince = session ? session.created_at : null;

    res.json({
      totalValue,
      allTimePnL: totalPnl,
      allTimePnLPercent: pnlPercent,
      todayPnl,
      totalRounds: bets.length,
      totalWins: wins.length,
      totalLosses: losses.length,
      totalSkips: skips.length,
      winRate,
      memberSince,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/portfolio/equity ──────────────────────────────────────
router.get('/api/portfolio/equity', (req, res) => {
  try {
    const period = req.query.period || 'all';
    const days = periodToDays(period);
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const bets = getDb().prepare(`
      SELECT b.*, s.deposit_amount
      FROM bets b
      JOIN sessions s ON b.session_id = s.id
      WHERE b.result IN ('WIN', 'LOSS', 'SKIP')
        AND b.round_time >= ?
      ORDER BY b.round_time ASC
    `).all(cutoff);

    if (!bets.length) return res.json([]);

    // Group by date
    const byDate = {};
    for (const b of bets) {
      const date = b.round_time.split('T')[0];
      if (!byDate[date]) byDate[date] = { pnl: 0, lastBankroll: 0 };
      byDate[date].pnl += b.pnl || 0;
      if (b.bankroll_after) byDate[date].lastBankroll = b.bankroll_after;
    }

    let cumulativePnl = 0;
    const deposit = bets[0].deposit_amount || 100;
    // BTC buy-hold simulation: normalize to same starting value
    const btcStartPrice = bets[0].btc_price_start || 100000;

    const equity = Object.entries(byDate).map(([date, d]) => {
      cumulativePnl += d.pnl;
      // Find BTC price for this date from last bet of that day
      const dayBets = bets.filter(b => b.round_time.startsWith(date) && b.btc_price_start);
      const btcPrice = dayBets.length > 0 ? dayBets[dayBets.length - 1].btc_price_start : btcStartPrice;
      const btcBuyHold = deposit * (btcPrice / btcStartPrice);

      return {
        date,
        bankroll: d.lastBankroll || deposit + cumulativePnl,
        pnl: d.pnl,
        cumulativePnl,
        btcBuyHold,
      };
    });

    res.json(equity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/portfolio/calendar ────────────────────────────────────
router.get('/api/portfolio/calendar', (req, res) => {
  try {
    const bets = getAllBets();
    if (!bets.length) return res.json([]);

    const byDate = {};
    for (const b of bets) {
      const date = b.round_time.split('T')[0];
      if (!byDate[date]) byDate[date] = { pnl: 0, wins: 0, losses: 0, skips: 0, bankroll: 0 };
      byDate[date].pnl += b.pnl || 0;
      if (b.result === 'WIN') byDate[date].wins++;
      else if (b.result === 'LOSS') byDate[date].losses++;
      else if (b.result === 'SKIP') byDate[date].skips++;
      if (b.bankroll_after) byDate[date].bankroll = b.bankroll_after;
    }

    const deposit = bets[0].deposit_amount || 100;
    const calendar = Object.entries(byDate).map(([date, d]) => ({
      date,
      pnl: d.pnl,
      pnlPercent: deposit > 0 ? (d.pnl / deposit) * 100 : 0,
      wins: d.wins,
      losses: d.losses,
      skips: d.skips,
    }));

    res.json(calendar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/portfolio/hourly ──────────────────────────────────────
router.get('/api/portfolio/hourly', (req, res) => {
  try {
    const bets = getAllBets().filter(b => b.result !== 'SKIP');
    if (!bets.length) return res.json([]);

    const hours = {};
    for (let h = 0; h < 24; h++) hours[h] = { totalPnl: 0, trades: 0, wins: 0 };

    for (const b of bets) {
      const hour = new Date(b.round_time).getUTCHours();
      hours[hour].totalPnl += b.pnl || 0;
      hours[hour].trades++;
      if (b.result === 'WIN') hours[hour].wins++;
    }

    const result = Object.entries(hours).map(([hour, d]) => ({
      hour: parseInt(hour),
      avgPnl: d.trades > 0 ? d.totalPnl / d.trades : 0,
      totalPnl: d.totalPnl,
      trades: d.trades,
      winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/portfolio/markets ─────────────────────────────────────
router.get('/api/portfolio/markets', (req, res) => {
  try {
    const bets = getAllBets().filter(b => b.result !== 'SKIP');
    if (!bets.length) return res.json([]);

    // Group by market - derive from direction/btc_price presence
    const markets = {};
    for (const b of bets) {
      const market = b.btc_price_start ? 'BTC' : 'OTHER';
      if (!markets[market]) markets[market] = { trades: 0, wins: 0, losses: 0, totalPnl: 0, dailyPnl: {} };
      markets[market].trades++;
      if (b.result === 'WIN') markets[market].wins++;
      else markets[market].losses++;
      markets[market].totalPnl += b.pnl || 0;

      const date = b.round_time.split('T')[0];
      if (!markets[market].dailyPnl[date]) markets[market].dailyPnl[date] = 0;
      markets[market].dailyPnl[date] += b.pnl || 0;
    }

    const result = Object.entries(markets).map(([market, d]) => {
      const dailyVals = Object.values(d.dailyPnl);
      return {
        market,
        trades: d.trades,
        wins: d.wins,
        losses: d.losses,
        winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
        totalPnl: d.totalPnl,
        bestDay: dailyVals.length ? Math.max(...dailyVals) : 0,
        worstDay: dailyVals.length ? Math.min(...dailyVals) : 0,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/portfolio/streaks ─────────────────────────────────────
router.get('/api/portfolio/streaks', (req, res) => {
  try {
    const bets = getAllBets().filter(b => b.result === 'WIN' || b.result === 'LOSS');
    if (!bets.length) return res.json({ currentStreak: { type: 'W', count: 0 }, longestWin: 0, longestLoss: 0, recentStreaks: [] });

    let longestWin = 0, longestLoss = 0;
    let currentType = null, currentCount = 0;
    const streaks = [];

    for (const b of bets) {
      const type = b.result === 'WIN' ? 'W' : 'L';
      if (type === currentType) {
        currentCount++;
      } else {
        if (currentType) streaks.push({ type: currentType, count: currentCount });
        currentType = type;
        currentCount = 1;
      }
      if (type === 'W' && currentCount > longestWin) longestWin = currentCount;
      if (type === 'L' && currentCount > longestLoss) longestLoss = currentCount;
    }
    if (currentType) streaks.push({ type: currentType, count: currentCount });

    res.json({
      currentStreak: streaks.length ? streaks[streaks.length - 1] : { type: 'W', count: 0 },
      longestWin,
      longestLoss,
      recentStreaks: streaks.slice(-10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/portfolio/risk ────────────────────────────────────────
router.get('/api/portfolio/risk', (req, res) => {
  try {
    const bets = getAllBets().filter(b => b.result !== 'SKIP');
    if (!bets.length) return res.json({ maxDrawdown: 0, maxDrawdownDollar: 0, currentDrawdown: 0, sharpeRatio: 0, sortinoRatio: 0, winLossRatio: 0, profitFactor: 0, avgWin: 0, avgLoss: 0 });

    const wins = bets.filter(b => b.result === 'WIN');
    const losses = bets.filter(b => b.result === 'LOSS');
    const avgWin = wins.length > 0 ? wins.reduce((s, b) => s + b.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, b) => s + b.pnl, 0) / losses.length) : 0;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    const totalWinPnl = wins.reduce((s, b) => s + b.pnl, 0);
    const totalLossPnl = Math.abs(losses.reduce((s, b) => s + b.pnl, 0));
    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;

    // Drawdown calculation
    let peak = 0;
    let maxDD = 0, maxDDDollar = 0, currentDD = 0;
    for (const b of bets) {
      const val = b.bankroll_after || 0;
      if (val > peak) peak = val;
      const dd = peak > 0 ? ((peak - val) / peak) * 100 : 0;
      const ddDollar = peak - val;
      if (dd > maxDD) { maxDD = dd; maxDDDollar = ddDollar; }
      currentDD = dd;
    }

    // Sharpe & Sortino (daily returns)
    const dailyReturns = {};
    for (const b of bets) {
      const date = b.round_time.split('T')[0];
      if (!dailyReturns[date]) dailyReturns[date] = 0;
      dailyReturns[date] += b.pnl || 0;
    }
    const returns = Object.values(dailyReturns);
    const meanReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

    const negReturns = returns.filter(r => r < 0);
    const downVariance = negReturns.length > 1 ? negReturns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / (negReturns.length - 1) : 0;
    const downDev = Math.sqrt(downVariance);
    const sortinoRatio = downDev > 0 ? (meanReturn / downDev) * Math.sqrt(252) : 0;

    res.json({
      maxDrawdown: maxDD,
      maxDrawdownDollar: maxDDDollar,
      currentDrawdown: currentDD,
      sharpeRatio,
      sortinoRatio,
      winLossRatio,
      profitFactor,
      avgWin,
      avgLoss,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/portfolio/export/csv ──────────────────────────────────
router.get('/api/portfolio/export/csv', (req, res) => {
  try {
    const bets = getAllBets();
    if (!bets.length) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="portfolio-history.csv"');
      return res.send('date,time,market,direction,confidence,result,pnl,bankroll\nNo data');
    }

    const header = 'date,time,market,direction,confidence,result,pnl,bankroll';
    const rows = bets.map(b => {
      const dt = new Date(b.round_time);
      const date = dt.toISOString().split('T')[0];
      const time = dt.toISOString().split('T')[1].split('.')[0];
      const market = b.btc_price_start ? 'BTC' : 'OTHER';
      return `${date},${time},${market},${b.direction || ''},${(b.confidence || 0).toFixed(1)},${b.result},${(b.pnl || 0).toFixed(4)},${(b.bankroll_after || 0).toFixed(2)}`;
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio-history.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
