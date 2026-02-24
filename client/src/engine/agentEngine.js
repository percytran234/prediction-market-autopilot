// Client-side agent engine — runs prediction loop entirely in the browser.
// Persists state to localStorage, fetches real BTC prices from Binance.

import { computeSignals } from './signalEngine.js';
import { getCurrentBTCPrice, fetchBTCKlines } from './priceService.js';

const STORAGE_KEY = 'prediction_agent_state';
const STRAT_KEY = 'prediction_agent_strategy';
const DAILY_HISTORY_KEY = 'prediction_agent_daily_history';
const ROUND_INTERVAL_MS = 60_000; // 1 minute
const MAX_CONSECUTIVE_LOSSES = 4;

const STRATEGIES = {
  safe:       { betPct: 0.02, lossLimit: -0.10, profitTarget: 0.05, confThresh: 65 },
  balanced:   { betPct: 0.03, lossLimit: -0.15, profitTarget: 0.08, confThresh: 60 },
  aggressive: { betPct: 0.05, lossLimit: -0.20, profitTarget: 0.12, confThresh: 55 },
};

// --------------- Persistence ---------------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted */ }
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}

function defaultState() {
  return {
    bankroll: 0,
    depositAmount: 0,
    agentStatus: 'idle', // idle | active | stopped | withdrawn
    stopReason: null,
    bets: [],
    activityLog: [],
    consecutiveWins: 0,
    consecutiveLosses: 0,
    dailyStartBankroll: 0,
    totalDeposited: 0,
    pendingBet: null,
    priceHistory: [], // { time, price }
    sessionDate: new Date().toISOString().slice(0, 10),
  };
}

// --------------- Engine class ---------------

export class AgentEngine {
  constructor(onChange) {
    this.onChange = onChange;
    this.state = loadState() || defaultState();
    // Ensure sessionDate exists for older saved states
    if (!this.state.sessionDate) {
      this.state.sessionDate = new Date().toISOString().slice(0, 10);
    }
    this.intervalId = null;
    this.roundRunning = false;

    // Check for day rollover on load
    this._checkDayRollover();

    // If the engine was "active" when the page closed, resume
    if (this.state.agentStatus === 'active') {
      this._startPolling();
    }
  }

  _getStrategy() {
    try {
      const key = localStorage.getItem(STRAT_KEY) || 'safe';
      return STRATEGIES[key] || STRATEGIES.safe;
    } catch { return STRATEGIES.safe; }
  }

  _getStrategyKey() {
    try {
      return localStorage.getItem(STRAT_KEY) || 'safe';
    } catch { return 'safe'; }
  }

  getState() {
    return { ...this.state };
  }

  getDashboard() {
    const s = this.state;
    const resolved = s.bets.filter(b => b.result === 'WIN' || b.result === 'LOSS');
    const wins = resolved.filter(b => b.result === 'WIN').length;
    const losses = resolved.filter(b => b.result === 'LOSS').length;
    const skips = s.bets.filter(b => b.result === 'SKIP').length;
    const totalPnl = resolved.reduce((sum, b) => sum + (b.pnl || 0), 0);
    const pnlPercent = s.dailyStartBankroll > 0 ? (totalPnl / s.dailyStartBankroll) * 100 : 0;
    const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 0;

    return {
      bankroll: s.bankroll,
      pnl: totalPnl,
      pnlPercent,
      winRate,
      totalBets: resolved.length + skips,
      wins,
      losses,
      skips,
      agentStatus: s.agentStatus,
      stopReason: s.stopReason,
      totalDeposited: s.totalDeposited,
      consecutiveWins: s.consecutiveWins,
      consecutiveLosses: s.consecutiveLosses,
      activeBets: s.bets.filter(b => b.result === 'PENDING').length,
      successRate: s.bets.length > 0
        ? ((wins / Math.max(1, resolved.length)) * 100)
        : 0,
    };
  }

  getBets() {
    return [...this.state.bets].reverse();
  }

  getAllBetsWithHistory() {
    const current = [...this.state.bets];
    const currentIds = new Set(current.map(b => b.id));
    const history = this.getDailyHistory();
    const historical = history.flatMap(d => (d.trades || []).filter(b => !currentIds.has(b.id)));
    const combined = [...current, ...historical];
    combined.sort((a, b) => new Date(b.round_time).getTime() - new Date(a.round_time).getTime());
    return combined;
  }

  getDailyHistory() {
    try {
      const raw = localStorage.getItem(DAILY_HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  getActivityLog() {
    return [...this.state.activityLog].slice(-50).reverse();
  }

  getPriceHistory() {
    return this.state.priceHistory.slice(-60);
  }

  // --------------- Actions ---------------

  deposit(amount) {
    this.state.bankroll += amount;
    this.state.depositAmount += amount;
    this.state.totalDeposited += amount;
    if (this.state.dailyStartBankroll === 0) {
      this.state.dailyStartBankroll = this.state.bankroll;
    }
    if (this.state.agentStatus === 'idle' || this.state.agentStatus === 'stopped' || this.state.agentStatus === 'withdrawn') {
      this.state.agentStatus = 'idle';
      this.state.stopReason = null;
    }
    this._log('DEPOSIT', `Deposited $${amount.toFixed(2)} → bankroll $${this.state.bankroll.toFixed(2)}`);
    this._persist();
  }

  start() {
    if (this.state.bankroll <= 0) return;
    this._checkDayRollover();
    this.state.agentStatus = 'active';
    this.state.stopReason = null;
    if (this.state.dailyStartBankroll === 0) {
      this.state.dailyStartBankroll = this.state.bankroll;
    }
    this._log('START', 'Agent started — scanning for signals...');
    this._persist();
    this._startPolling();
    // Run first round immediately
    setTimeout(() => this._runRound(), 500);
  }

  stop() {
    this._stopPolling();
    this.state.agentStatus = 'stopped';
    this.state.stopReason = 'USER_STOPPED';
    this.state.pendingBet = null;
    this._log('STOP', 'Agent stopped by user');
    this._persist();
  }

  withdraw() {
    this._stopPolling();
    const amount = this.state.bankroll;
    this.state.bankroll = 0;
    this.state.agentStatus = 'withdrawn';
    this.state.stopReason = 'WITHDRAWN';
    this.state.pendingBet = null;
    this._log('WITHDRAW', `Withdrew $${amount.toFixed(2)} to connected wallet`);
    this._persist();
    return amount;
  }

  reset() {
    this._stopPolling();
    this.state = defaultState();
    this._persist();
  }

  // --------------- Daily History ---------------

  _checkDayRollover() {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.state.sessionDate) {
      this.state.sessionDate = today;
      return;
    }
    if (this.state.sessionDate !== today) {
      // Archive previous day's trades
      this._archiveDay(this.state.sessionDate);
      // Start fresh session — bankroll carries over
      this.state.bets = [];
      this.state.activityLog = [];
      this.state.consecutiveWins = 0;
      this.state.consecutiveLosses = 0;
      this.state.dailyStartBankroll = this.state.bankroll;
      this.state.sessionDate = today;
      this.state.pendingBet = null;
      this.state.stopReason = null;
      if (this.state.agentStatus === 'stopped') {
        this.state.agentStatus = 'idle';
      }
      this._log('START', `New trading day: ${today} — bankroll carried over: $${this.state.bankroll.toFixed(2)}`);
      this._persist();
    }
  }

  _archiveDay(date) {
    const resolved = this.state.bets.filter(b => b.result === 'WIN' || b.result === 'LOSS');
    if (resolved.length === 0 && this.state.bets.length === 0) return;

    const totalPnl = resolved.reduce((s, b) => s + (b.pnl || 0), 0);
    const wins = resolved.filter(b => b.result === 'WIN').length;
    const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 0;

    const dayRecord = {
      date,
      trades: [...this.state.bets],
      summary: {
        totalPnl,
        winRate,
        totalBets: resolved.length,
        startBankroll: this.state.dailyStartBankroll,
        endBankroll: this.state.bankroll,
      },
    };

    try {
      const history = JSON.parse(localStorage.getItem(DAILY_HISTORY_KEY) || '[]');
      const existing = history.findIndex(h => h.date === date);
      if (existing >= 0) history[existing] = dayRecord;
      else history.push(dayRecord);
      localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }

  // --------------- Internal ---------------

  _startPolling() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      if (this.state.agentStatus === 'active') {
        this._runRound();
      }
    }, ROUND_INTERVAL_MS);
    // Also poll BTC price every 10s for the chart
    this._priceIntervalId = setInterval(() => this._fetchPrice(), 10_000);
    this._fetchPrice();
  }

  _stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this._priceIntervalId) {
      clearInterval(this._priceIntervalId);
      this._priceIntervalId = null;
    }
  }

  async _fetchPrice() {
    try {
      const price = await getCurrentBTCPrice();
      this.state.priceHistory.push({ time: Date.now(), price });
      // Keep last 120 points (20 min at 10s intervals)
      if (this.state.priceHistory.length > 120) {
        this.state.priceHistory = this.state.priceHistory.slice(-120);
      }
      this._persist();
    } catch { /* ignore */ }
  }

  async _runRound() {
    if (this.roundRunning) return;
    if (this.state.agentStatus !== 'active') return;
    this.roundRunning = true;

    try {
      // Check for day rollover
      this._checkDayRollover();

      const strat = this._getStrategy();

      // Check stop conditions first
      const stopCheck = this._shouldStop();
      if (stopCheck.stop) {
        this._stopPolling();
        this.state.agentStatus = 'stopped';
        this.state.stopReason = stopCheck.reason;
        this._log('AUTO_STOP', `Agent stopped: ${this._reasonLabel(stopCheck.reason)}`);
        this._archiveDay(this.state.sessionDate);
        this._persist();
        return;
      }

      // Compute signals
      this._log('SCAN', 'Scanning BTC signals...');
      this._persist();
      const signals = await computeSignals();
      const btcPrice = signals.currentPrice || await getCurrentBTCPrice();

      this._log('SIGNAL', `${signals.direction} (${signals.confidence.toFixed(1)}% confidence) — ${signals.reasoning}`);

      // Check confidence against strategy threshold
      if (signals.confidence < strat.confThresh) {
        const bet = {
          id: Date.now(),
          round_time: new Date().toISOString(),
          direction: 'SKIP',
          confidence: signals.confidence,
          amount: 0,
          btc_price_start: btcPrice,
          btc_price_end: null,
          result: 'SKIP',
          pnl: 0,
          bankroll_after: this.state.bankroll,
          reasoning: signals.reasoning,
        };
        this.state.bets.push(bet);
        this._log('SKIP', `Skipped — confidence ${signals.confidence.toFixed(1)}% < ${strat.confThresh}% threshold`);
        this._persist();
        return;
      }

      // Calculate bet size using strategy
      const betAmount = parseFloat((this.state.bankroll * strat.betPct).toFixed(2));

      if (betAmount < 0.01) {
        this._log('SKIP', 'Bankroll too low for minimum bet');
        this._persist();
        return;
      }

      // Place bet as PENDING
      const bet = {
        id: Date.now(),
        round_time: new Date().toISOString(),
        direction: signals.direction,
        confidence: signals.confidence,
        amount: betAmount,
        btc_price_start: btcPrice,
        btc_price_end: null,
        result: 'PENDING',
        pnl: 0,
        bankroll_after: this.state.bankroll,
        reasoning: signals.reasoning,
      };
      this.state.bets.push(bet);
      this.state.pendingBet = bet.id;
      this._log('BET', `${signals.direction} $${betAmount.toFixed(2)} at BTC $${btcPrice.toLocaleString()} (${signals.confidence.toFixed(1)}%)`);
      this._persist();

      // Wait for round resolution (use a shorter time for demo: 30s)
      await new Promise(r => setTimeout(r, 30_000));

      // Resolve bet
      const exitPrice = await getCurrentBTCPrice();
      let result;
      if (signals.direction === 'UP') {
        result = exitPrice > btcPrice ? 'WIN' : 'LOSS';
      } else {
        result = exitPrice < btcPrice ? 'WIN' : 'LOSS';
      }
      if (exitPrice === btcPrice) result = 'LOSS';

      const pnl = result === 'WIN' ? betAmount : -betAmount;
      this.state.bankroll += pnl;

      // Update bet record
      const idx = this.state.bets.findIndex(b => b.id === bet.id);
      if (idx !== -1) {
        this.state.bets[idx].btc_price_end = exitPrice;
        this.state.bets[idx].result = result;
        this.state.bets[idx].pnl = pnl;
        this.state.bets[idx].bankroll_after = this.state.bankroll;
      }
      this.state.pendingBet = null;

      // Update streaks
      if (result === 'WIN') {
        this.state.consecutiveWins++;
        this.state.consecutiveLosses = 0;
      } else {
        this.state.consecutiveLosses++;
        this.state.consecutiveWins = 0;
      }

      const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
      this._log(
        result,
        `${result} ${pnlStr} | BTC $${btcPrice.toFixed(2)} → $${exitPrice.toFixed(2)} | Bankroll: $${this.state.bankroll.toFixed(2)}`
      );
      this._persist();

      // Post-bet stop check
      const postCheck = this._shouldStop();
      if (postCheck.stop) {
        this._stopPolling();
        this.state.agentStatus = 'stopped';
        this.state.stopReason = postCheck.reason;
        this._log('AUTO_STOP', `Agent stopped: ${this._reasonLabel(postCheck.reason)}`);
        this._archiveDay(this.state.sessionDate);
        this._persist();
      }
    } catch (err) {
      this._log('ERROR', `Round error: ${err.message}`);
    } finally {
      this.roundRunning = false;
      this._persist();
    }
  }

  _shouldStop() {
    const strat = this._getStrategy();
    const resolved = this.state.bets.filter(b => b.result === 'WIN' || b.result === 'LOSS');
    const totalPnl = resolved.reduce((sum, b) => sum + (b.pnl || 0), 0);

    if (this.state.dailyStartBankroll > 0) {
      if (totalPnl <= this.state.dailyStartBankroll * strat.lossLimit) {
        return { stop: true, reason: 'DAILY_LOSS_LIMIT' };
      }
      if (totalPnl >= this.state.dailyStartBankroll * strat.profitTarget) {
        return { stop: true, reason: 'DAILY_PROFIT_TARGET' };
      }
    }
    if (this.state.consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
      return { stop: true, reason: 'CONSECUTIVE_LOSSES' };
    }
    return { stop: false };
  }

  _reasonLabel(reason) {
    const strat = this._getStrategy();
    const labels = {
      DAILY_LOSS_LIMIT: `Hit ${(strat.lossLimit * 100).toFixed(0)}% daily loss limit`,
      DAILY_PROFIT_TARGET: `Hit +${(strat.profitTarget * 100).toFixed(0)}% profit target`,
      CONSECUTIVE_LOSSES: '4 consecutive losses',
      USER_STOPPED: 'Stopped by user',
      WITHDRAWN: 'Funds withdrawn',
    };
    return labels[reason] || reason;
  }

  _log(type, message) {
    this.state.activityLog.push({
      id: Date.now() + Math.random(),
      time: new Date().toISOString(),
      type,
      message,
    });
    // Keep last 200 log entries
    if (this.state.activityLog.length > 200) {
      this.state.activityLog = this.state.activityLog.slice(-200);
    }
    // Notify React
    if (this.onChange) this.onChange();
  }

  _persist() {
    saveState(this.state);
    if (this.onChange) this.onChange();
  }

  destroy() {
    this._stopPolling();
  }
}
