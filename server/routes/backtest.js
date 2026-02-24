import { Router } from 'express';
import { getDb } from '../db/database.js';
import { calculateEMA, calculateRSI, calculateVolumeRatio } from '../signals/indicators.js';

const router = Router();

const SYMBOL_MAP = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT' };
const VALID_DAYS = [7, 14, 30, 60, 90];

// ─── Fetch historical klines from Binance ───

async function fetchHistoricalKlines(symbol, days) {
  // 15-min candles → 96 per day. Binance max 1000 per request.
  const totalCandles = days * 96;
  const endTime = Date.now();
  const startTime = endTime - days * 86400000;
  const allKlines = [];
  let currentStart = startTime;

  while (currentStart < endTime) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&startTime=${currentStart}&endTime=${endTime}&limit=1000`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const batch = await res.json();
    if (batch.length === 0) break;
    allKlines.push(...batch);
    currentStart = batch[batch.length - 1][0] + 1;
    if (batch.length < 1000) break;
    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  return allKlines;
}

// ─── Run signal engine on a sliding window of klines ───

function computeSignalForWindow(closes, volumes) {
  const ema5 = calculateEMA(closes, 5);
  const ema15 = calculateEMA(closes, 15);
  const rsi = calculateRSI(closes, 14);
  const volumeRatio = calculateVolumeRatio(volumes, 15);

  const emaSignal = ema5 > ema15 ? 'BULLISH' : 'BEARISH';
  const rsiSignal = rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL';
  const volumeSignal = volumeRatio > 1.5 ? 'SPIKE' : 'NORMAL';

  let score = 0;

  // Momentum (30%)
  if (emaSignal === 'BULLISH') score += 30;
  else score -= 30;

  // RSI (25%)
  if (rsiSignal === 'OVERSOLD') score += 25;
  else if (rsiSignal === 'OVERBOUGHT') score -= 25;
  else score += ((50 - rsi) / 50) * 25;

  // Volume (20%)
  if (volumeSignal === 'SPIKE') {
    score += 20 * (emaSignal === 'BULLISH' ? 1 : -1);
  } else if (volumeRatio > 1.2) {
    score += 10 * (emaSignal === 'BULLISH' ? 1 : -1);
  }

  // Baseline (25%)
  const recentAvg = closes.slice(-15).reduce((a, b) => a + b, 0) / Math.min(closes.length, 15);
  const currentPrice = closes[closes.length - 1];
  if (currentPrice > recentAvg) score += 25;
  else score -= 25;

  return {
    confidence: Math.min(100, Math.abs(score)),
    direction: score >= 0 ? 'UP' : 'DOWN',
  };
}

// ─── Run backtest simulation ───

function runBacktest(klines, params) {
  const {
    betPercent, skipThreshold, stopLoss, takeProfit, startingBankroll,
  } = params;

  const betPct = betPercent / 100;
  const stopLossPct = stopLoss / 100;
  const takeProfitPct = takeProfit / 100;

  let bankroll = startingBankroll;
  let peakBankroll = startingBankroll;
  let maxDrawdown = 0;
  let maxDrawdownDollar = 0;
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;

  const allBets = [];
  const equityCurve = [{ round: 0, bankroll: startingBankroll, pnl: 0 }];
  const dailyMap = {};

  // We need at least 60 candles of lookback for indicators
  const LOOKBACK = 60;
  if (klines.length < LOOKBACK + 1) {
    return { error: 'Not enough data for backtest' };
  }

  let wins = 0;
  let losses = 0;
  let skipped = 0;
  let betsPlaced = 0;

  // Daily tracking
  let currentDay = null;
  let dayStartBankroll = startingBankroll;
  let dayPnl = 0;
  let dayStopped = false;

  for (let i = LOOKBACK; i < klines.length - 1; i++) {
    // Extract date from candle timestamp
    const candleDate = new Date(klines[i][0]).toISOString().slice(0, 10);

    // Day rollover
    if (candleDate !== currentDay) {
      currentDay = candleDate;
      dayStartBankroll = bankroll;
      dayPnl = 0;
      dayStopped = false;
      if (!dailyMap[candleDate]) {
        dailyMap[candleDate] = { date: candleDate, pnl: 0, pnlPercent: 0, bankroll, wins: 0, losses: 0, skipped: 0 };
      }
    }

    // Check daily stop conditions
    if (dayStopped) {
      skipped++;
      dailyMap[candleDate].skipped++;
      continue;
    }

    if (dayStartBankroll > 0) {
      if (dayPnl <= -dayStartBankroll * stopLossPct) { dayStopped = true; skipped++; dailyMap[candleDate].skipped++; continue; }
      if (dayPnl >= dayStartBankroll * takeProfitPct) { dayStopped = true; skipped++; dailyMap[candleDate].skipped++; continue; }
    }

    // Check consecutive losses (4 → skip rest of day)
    if (consecutiveLosses >= 4) { dayStopped = true; skipped++; dailyMap[candleDate].skipped++; continue; }

    // Build lookback window
    const windowKlines = klines.slice(i - LOOKBACK, i + 1);
    const closes = windowKlines.map(k => parseFloat(k[4]));
    const volumes = windowKlines.map(k => parseFloat(k[5]));

    const signal = computeSignalForWindow(closes, volumes);

    const entryPrice = parseFloat(klines[i][4]); // close of current candle
    const exitPrice = parseFloat(klines[i + 1][4]); // close of next candle
    const candleTime = new Date(klines[i][0]).toISOString();

    if (signal.confidence < skipThreshold) {
      skipped++;
      dailyMap[candleDate].skipped++;
      continue;
    }

    // Place bet
    const betAmount = parseFloat((bankroll * betPct).toFixed(2));
    if (betAmount < 0.01 || bankroll <= 0) {
      skipped++;
      dailyMap[candleDate].skipped++;
      continue;
    }

    let result;
    if (signal.direction === 'UP') {
      result = exitPrice > entryPrice ? 'WIN' : 'LOSS';
    } else {
      result = exitPrice < entryPrice ? 'WIN' : 'LOSS';
    }
    if (exitPrice === entryPrice) result = 'LOSS';

    const pnl = result === 'WIN' ? betAmount : -betAmount;
    bankroll += pnl;
    dayPnl += pnl;
    betsPlaced++;

    if (result === 'WIN') {
      wins++;
      totalWinAmount += betAmount;
      consecutiveWins++;
      consecutiveLosses = 0;
      if (consecutiveWins > longestWinStreak) longestWinStreak = consecutiveWins;
      dailyMap[candleDate].wins++;
    } else {
      losses++;
      totalLossAmount += betAmount;
      consecutiveLosses++;
      consecutiveWins = 0;
      if (consecutiveLosses > longestLossStreak) longestLossStreak = consecutiveLosses;
      dailyMap[candleDate].losses++;
    }

    dailyMap[candleDate].pnl += pnl;
    dailyMap[candleDate].bankroll = bankroll;
    if (dayStartBankroll > 0) {
      dailyMap[candleDate].pnlPercent = (dailyMap[candleDate].pnl / dayStartBankroll) * 100;
    }

    // Drawdown tracking
    if (bankroll > peakBankroll) peakBankroll = bankroll;
    const drawdown = peakBankroll > 0 ? ((peakBankroll - bankroll) / peakBankroll) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    const drawdownDollar = peakBankroll - bankroll;
    if (drawdownDollar > maxDrawdownDollar) maxDrawdownDollar = drawdownDollar;

    allBets.push({
      time: candleTime,
      direction: signal.direction,
      confidence: parseFloat(signal.confidence.toFixed(1)),
      result,
      pnl: parseFloat(pnl.toFixed(2)),
      bankroll: parseFloat(bankroll.toFixed(2)),
      entryPrice,
      exitPrice,
    });

    equityCurve.push({
      round: betsPlaced,
      bankroll: parseFloat(bankroll.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(2)),
    });
  }

  // Compute Sharpe & Sortino ratios
  const pnls = allBets.map(b => b.pnl);
  const avgPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
  const variance = pnls.length > 1
    ? pnls.reduce((s, p) => s + (p - avgPnl) ** 2, 0) / (pnls.length - 1) : 0;
  const stdPnl = Math.sqrt(variance);
  const sharpeRatio = stdPnl > 0 ? parseFloat(((avgPnl / stdPnl) * Math.sqrt(252)).toFixed(2)) : 0;

  const negativePnls = pnls.filter(p => p < 0);
  const downVariance = negativePnls.length > 1
    ? negativePnls.reduce((s, p) => s + (p - avgPnl) ** 2, 0) / (negativePnls.length - 1) : 0;
  const downDev = Math.sqrt(downVariance);
  const sortinoRatio = downDev > 0 ? parseFloat(((avgPnl / downDev) * Math.sqrt(252)).toFixed(2)) : 0;

  const totalPnL = bankroll - startingBankroll;
  const totalPnLPercent = startingBankroll > 0 ? (totalPnL / startingBankroll) * 100 : 0;
  const profitFactor = totalLossAmount > 0 ? parseFloat((totalWinAmount / totalLossAmount).toFixed(2)) : totalWinAmount > 0 ? Infinity : 0;

  const dailyReturns = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRounds: klines.length - LOOKBACK - 1,
    betsPlaced,
    skipped,
    wins,
    losses,
    winRate: betsPlaced > 0 ? parseFloat(((wins / betsPlaced) * 100).toFixed(1)) : 0,
    skipRate: parseFloat(((skipped / (klines.length - LOOKBACK - 1)) * 100).toFixed(1)),
    startingBankroll,
    endingBankroll: parseFloat(bankroll.toFixed(2)),
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    totalPnLPercent: parseFloat(totalPnLPercent.toFixed(1)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
    maxDrawdownDollar: parseFloat(maxDrawdownDollar.toFixed(2)),
    sharpeRatio,
    sortinoRatio,
    longestWinStreak,
    longestLossStreak,
    avgWinAmount: wins > 0 ? parseFloat((totalWinAmount / wins).toFixed(2)) : 0,
    avgLossAmount: losses > 0 ? parseFloat((totalLossAmount / losses).toFixed(2)) : 0,
    profitFactor,
    dailyReturns,
    equityCurve,
    allBets,
  };
}

// ─── Run random baseline for comparison ───

function runRandomBaseline(klines, params) {
  const { betPercent, startingBankroll } = params;
  const betPct = betPercent / 100;
  const LOOKBACK = 60;

  let bankroll = startingBankroll;
  const equityCurve = [{ round: 0, bankroll: startingBankroll }];
  let round = 0;

  for (let i = LOOKBACK; i < klines.length - 1; i++) {
    // Skip ~same rate as signal engine (roughly 40% of the time)
    if (Math.random() < 0.4) continue;

    const betAmount = parseFloat((bankroll * betPct).toFixed(2));
    if (betAmount < 0.01 || bankroll <= 0) continue;

    const entryPrice = parseFloat(klines[i][4]);
    const exitPrice = parseFloat(klines[i + 1][4]);
    const direction = Math.random() > 0.5 ? 'UP' : 'DOWN';

    let result;
    if (direction === 'UP') result = exitPrice > entryPrice ? 'WIN' : 'LOSS';
    else result = exitPrice < entryPrice ? 'WIN' : 'LOSS';
    if (exitPrice === entryPrice) result = 'LOSS';

    const pnl = result === 'WIN' ? betAmount : -betAmount;
    bankroll += pnl;
    round++;
    equityCurve.push({ round, bankroll: parseFloat(bankroll.toFixed(2)) });
  }

  return {
    endingBankroll: parseFloat(bankroll.toFixed(2)),
    totalPnL: parseFloat((bankroll - startingBankroll).toFixed(2)),
    equityCurve,
  };
}

// ─── POST /api/backtest ───

router.post('/api/backtest', async (req, res) => {
  try {
    const {
      market = 'BTC',
      days = 30,
      betPercent = 2,
      skipThreshold = 60,
      stopLoss = 10,
      takeProfit = 5,
      startingBankroll = 100,
      compareRandom = false,
    } = req.body;

    // Validate inputs
    const symbol = SYMBOL_MAP[market];
    if (!symbol) return res.status(400).json({ error: `Invalid market: ${market}. Use BTC, ETH, or SOL.` });
    if (!VALID_DAYS.includes(days)) return res.status(400).json({ error: `Invalid days: ${days}. Use 7, 14, 30, 60, or 90.` });
    if (betPercent < 1 || betPercent > 10) return res.status(400).json({ error: 'betPercent must be 1-10' });
    if (skipThreshold < 50 || skipThreshold > 80) return res.status(400).json({ error: 'skipThreshold must be 50-80' });
    if (stopLoss < 5 || stopLoss > 20) return res.status(400).json({ error: 'stopLoss must be 5-20' });
    if (takeProfit < 3 || takeProfit > 15) return res.status(400).json({ error: 'takeProfit must be 3-15' });
    if (startingBankroll < 1) return res.status(400).json({ error: 'startingBankroll must be >= 1' });

    const params = { market, days, betPercent, skipThreshold, stopLoss, takeProfit, startingBankroll };

    // Check cache (don't cache if compareRandom since it's non-deterministic)
    const cacheKey = `${symbol}_${days}_${betPercent}_${skipThreshold}_${stopLoss}_${takeProfit}_${startingBankroll}`;
    const db = getDb();

    if (!compareRandom) {
      const cached = db.prepare('SELECT results FROM backtests WHERE cache_key = ?').get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached.results));
      }
    }

    // Fetch historical data
    const klines = await fetchHistoricalKlines(symbol, days);
    if (klines.length < 61) {
      return res.status(400).json({ error: 'Not enough historical data available from Binance for this period.' });
    }

    // Run backtest
    const results = runBacktest(klines, params);
    if (results.error) {
      return res.status(400).json({ error: results.error });
    }

    // Run random comparison if requested
    if (compareRandom) {
      results.randomBaseline = runRandomBaseline(klines, params);
    }

    // Cache results (without random baseline since it's non-deterministic)
    const cacheResults = { ...results };
    delete cacheResults.randomBaseline;
    try {
      db.prepare(
        'INSERT OR REPLACE INTO backtests (cache_key, params, results, created_at) VALUES (?, ?, ?, ?)'
      ).run(cacheKey, JSON.stringify(params), JSON.stringify(cacheResults), new Date().toISOString());
    } catch (e) {
      console.error('Cache write failed:', e.message);
    }

    res.json(results);
  } catch (err) {
    console.error('Backtest error:', err);
    res.status(500).json({ error: `Backtest failed: ${err.message}` });
  }
});

export default router;
