import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getCurrentBTCPrice } from '../engine/priceService.js';

// ─── Helpers ───
function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }
function fmtPnl(v) {
  if (v == null) return '—';
  return (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);
}
function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

// ─── Risk Meter Gauge ───
function RiskMeter({ value }) {
  // value 0-100
  const r = 40;
  const circ = Math.PI * r; // half circle
  const offset = circ - (value / 100) * circ;
  const color = value < 30 ? '#00ff88' : value < 60 ? '#ff6600' : '#ff3333';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" className="w-full max-w-[140px]">
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke="#1e1e2e"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="animate-gauge"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="50" y="50" textAnchor="middle" fill={color} fontSize="16" fontFamily="JetBrains Mono, monospace" fontWeight="700">
          {value}
        </text>
      </svg>
      <span className="text-[10px] text-dark-muted font-mono mt-1">
        {value < 30 ? 'LOW RISK' : value < 60 ? 'MODERATE' : 'HIGH RISK'}
      </span>
    </div>
  );
}

// ─── Stat Card ───
function StatCard({ label, value, sub, color, glow, blink }) {
  return (
    <div className="terminal-card glow-card rounded-xl p-3 relative overflow-hidden">
      <p className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-1 relative z-10">{label}</p>
      <p className={`text-xl font-bold font-mono relative z-10 ${color || 'text-dark-text'} ${glow || ''} ${blink ? 'animate-blink' : ''}`}>
        {value}
      </p>
      {sub && <p className={`text-[10px] mt-0.5 font-mono relative z-10 ${color || 'text-dark-muted'}`}>{sub}</p>}
    </div>
  );
}

// ─── BTC Price Tooltip ───
function PriceTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="terminal-card px-3 py-2 text-xs shadow-lg">
      <p className="text-dark-muted mb-1">{formatTime(d.time)}</p>
      <p className="text-dark-text font-bold font-mono">${Number(d.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
}

// ─── Equity Curve Tooltip ───
function EquityTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="terminal-card px-3 py-2 text-xs shadow-lg">
      <p className="text-dark-muted mb-1">Trade #{d.idx}</p>
      <p className="text-dark-text font-bold font-mono">${fmt(d.equity)}</p>
    </div>
  );
}

export default function DashboardPage({ engine, account, dashboard, bets }) {
  const [depositAmount, setDepositAmount] = useState('100');
  const [loading, setLoading] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const intervalRef = useRef(null);

  const agentStatus = dashboard?.agentStatus || 'idle';
  const isActive = agentStatus === 'active';
  const hasBalance = (dashboard?.bankroll || 0) > 0;

  // Live price polling
  useEffect(() => {
    let mounted = true;
    async function tick() {
      try {
        const p = await getCurrentBTCPrice();
        if (mounted) setLivePrice(p);
      } catch {}
    }
    tick();
    intervalRef.current = setInterval(tick, 5000);
    return () => { mounted = false; clearInterval(intervalRef.current); };
  }, []);

  // ─── Computed metrics ───
  const resolved = (bets || []).filter(b => b.result === 'WIN' || b.result === 'LOSS');
  const wins = resolved.filter(b => b.result === 'WIN').length;
  const losses = resolved.filter(b => b.result === 'LOSS').length;
  const pnls = resolved.map(b => b.pnl || 0);

  // Equity curve data
  const equityCurve = [];
  let runningEquity = dashboard?.totalDeposited || 0;
  const chronological = [...resolved].reverse();
  equityCurve.push({ idx: 0, equity: runningEquity });
  chronological.forEach((b, i) => {
    runningEquity += (b.pnl || 0);
    equityCurve.push({ idx: i + 1, equity: runningEquity });
  });

  // Sharpe ratio (simplified: mean/stddev of returns)
  const avgPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
  const stdPnl = pnls.length > 1
    ? Math.sqrt(pnls.reduce((sum, p) => sum + (p - avgPnl) ** 2, 0) / (pnls.length - 1))
    : 0;
  const sharpe = stdPnl > 0 ? (avgPnl / stdPnl) * Math.sqrt(252) : 0;

  // Max drawdown
  let peak = 0, maxDd = 0;
  let eq = 0;
  for (const p of pnls.slice().reverse()) {
    eq += p;
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDd) maxDd = dd;
  }
  const maxDdPct = (dashboard?.totalDeposited || 0) > 0
    ? (maxDd / dashboard.totalDeposited) * 100
    : 0;

  // Win/Loss streaks
  let currentStreak = 0, streakType = null, bestWinStreak = 0, bestLossStreak = 0;
  let tempWin = 0, tempLoss = 0;
  for (const b of chronological) {
    if (b.result === 'WIN') { tempWin++; tempLoss = 0; if (tempWin > bestWinStreak) bestWinStreak = tempWin; }
    else { tempLoss++; tempWin = 0; if (tempLoss > bestLossStreak) bestLossStreak = tempLoss; }
  }
  currentStreak = dashboard?.consecutiveWins > 0
    ? dashboard.consecutiveWins
    : -(dashboard?.consecutiveLosses || 0);
  streakType = currentStreak > 0 ? 'W' : currentStreak < 0 ? 'L' : '';

  // Best/worst trade
  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

  // Average bet size
  const betAmounts = resolved.map(b => b.amount || 0);
  const avgBetSize = betAmounts.length > 0 ? betAmounts.reduce((a, b) => a + b, 0) / betAmounts.length : 0;

  // Risk level (composite: drawdown %, consecutive losses, bet size)
  const riskScore = Math.min(100, Math.round(
    (maxDdPct / 15) * 40 +
    ((dashboard?.consecutiveLosses || 0) / 4) * 40 +
    (avgBetSize / (dashboard?.bankroll || 1)) * 20 * 100
  ));

  // Price chart
  const priceHistory = engine.getPriceHistory();
  const priceData = (priceHistory || []).map(p => ({ time: p.time, price: p.price }));
  const prices = priceData.map(d => d.price);
  const pMin = prices.length > 0 ? Math.min(...prices) : 0;
  const pMax = prices.length > 0 ? Math.max(...prices) : 0;
  const pRange = pMax - pMin || 1;
  const isUp = priceData.length >= 2 && priceData[priceData.length - 1].price >= priceData[0].price;
  const chartColor = isUp ? '#00ff88' : '#ff3333';

  const displayPrice = livePrice || (priceData.length > 0 ? priceData[priceData.length - 1].price : null);
  const priceChange = priceData.length >= 2 ? priceData[priceData.length - 1].price - priceData[0].price : 0;
  const priceChangePct = priceData.length >= 2 && priceData[0].price > 0 ? (priceChange / priceData[0].price) * 100 : 0;

  // Pending bet
  const pendingBet = (bets || []).find(b => b.result === 'PENDING');

  // ─── Actions ───
  function handleDeposit() {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    setLoading('deposit');
    engine.deposit(amt);
    setDepositAmount('100');
    setLoading(null);
  }
  function handleStart() { setLoading('start'); engine.start(); setLoading(null); }
  function handleStop() { setLoading('stop'); engine.stop(); setLoading(null); }
  function handleWithdraw() {
    if (!confirm('Withdraw all funds and stop the agent?')) return;
    engine.withdraw();
  }
  function handleReset() {
    if (!confirm('Reset all data? This clears bet history and bankroll.')) return;
    engine.reset();
  }

  // Status config
  const statusCfg = {
    active: { label: 'ACTIVE', color: 'neon-green', dot: true },
    stopped: { label: 'STOPPED', color: 'neon-red' },
    idle: { label: 'IDLE', color: 'text-dark-muted' },
    withdrawn: { label: 'WITHDRAWN', color: 'text-dark-muted' },
  };
  const st = statusCfg[agentStatus] || statusCfg.idle;

  return (
    <div className="space-y-4 animate-slide-in">
      {/* ─── Top Bar: Status + Controls ─── */}
      <div className="terminal-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {st.dot && <span className="status-dot-active" />}
            <span className={`text-sm font-bold font-mono ${st.color}`}>{st.label}</span>
          </div>
          {dashboard?.stopReason && (
            <span className="text-[10px] text-dark-muted font-mono px-2 py-0.5 bg-dark-bg rounded">
              {dashboard.stopReason}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!hasBalance && !isActive ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="100"
                className="w-24 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm font-mono text-dark-text focus:outline-none focus:border-accent-orange"
              />
              <button onClick={handleDeposit} disabled={loading === 'deposit'}
                className="px-4 py-1.5 bg-accent-orange text-dark-bg text-sm font-bold rounded-lg hover:brightness-110 transition disabled:opacity-40">
                Deposit
              </button>
            </div>
          ) : isActive ? (
            <button onClick={handleStop} disabled={loading === 'stop'}
              className="px-4 py-1.5 bg-accent-red/10 text-accent-red text-sm font-bold rounded-lg border border-accent-red/30 hover:bg-accent-red/20 transition disabled:opacity-40">
              Stop Agent
            </button>
          ) : (
            <>
              <button onClick={handleStart} disabled={!hasBalance}
                className="px-4 py-1.5 bg-accent-green/10 text-accent-green text-sm font-bold rounded-lg border border-accent-green/30 hover:bg-accent-green/20 transition disabled:opacity-40">
                Start Agent
              </button>
              <button onClick={handleWithdraw} disabled={!hasBalance}
                className="px-4 py-1.5 text-accent-blue text-sm font-medium rounded-lg border border-accent-blue/30 hover:bg-accent-blue/10 transition disabled:opacity-40">
                Withdraw
              </button>
              <div className="flex items-center gap-1">
                <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm font-mono text-dark-text focus:outline-none focus:border-accent-orange" />
                <button onClick={handleDeposit}
                  className="px-3 py-1.5 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-dark-hover transition">
                  +Deposit
                </button>
              </div>
            </>
          )}
          {!isActive && (dashboard?.bankroll === 0 || agentStatus === 'withdrawn') && (
            <button onClick={handleReset}
              className="px-3 py-1.5 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/30 transition">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Bankroll"
          value={`$${fmt(dashboard?.bankroll)}`}
          color="text-dark-text"
          glow={isActive ? 'animate-neon-pulse' : 'neon-green'}
          blink={isActive}
        />
        <StatCard
          label="Total P&L"
          value={fmtPnl(dashboard?.pnl)}
          sub={`${dashboard?.pnl >= 0 ? '+' : ''}${fmt(dashboard?.pnlPercent)}%`}
          color={dashboard?.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}
          glow={dashboard?.pnl >= 0 ? 'neon-green' : 'neon-red'}
        />
        <StatCard
          label="Win Rate"
          value={`${fmt(dashboard?.winRate, 1)}%`}
          sub={`${wins}W / ${losses}L`}
          color={dashboard?.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'}
        />
        <StatCard
          label="Sharpe Ratio"
          value={fmt(sharpe, 2)}
          sub="Annualized"
          color={sharpe > 0 ? 'text-accent-green' : sharpe < 0 ? 'text-accent-red' : 'text-dark-muted'}
        />
      </div>

      {/* ─── Advanced Metrics + Risk Meter ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Max Drawdown" value={`${fmt(maxDdPct, 1)}%`} color="text-accent-red" />
        <StatCard
          label="Current Streak"
          value={`${Math.abs(currentStreak)}${streakType}`}
          color={currentStreak > 0 ? 'text-accent-green' : currentStreak < 0 ? 'text-accent-red' : 'text-dark-muted'}
        />
        <StatCard label="Best Trade" value={`+$${fmt(bestTrade)}`} color="text-accent-green" />
        <StatCard label="Worst Trade" value={`-$${fmt(Math.abs(worstTrade))}`} color="text-accent-red" />
        <StatCard label="Avg Bet Size" value={`$${fmt(avgBetSize)}`} />
        <div className="terminal-card glow-card rounded-xl p-3 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-1">Risk Level</p>
          <RiskMeter value={riskScore} />
        </div>
      </div>

      {/* ─── Pending Bet ─── */}
      {pendingBet && (
        <div className="terminal-card border-accent-orange/30 p-4 relative overflow-hidden">
          <div className="absolute inset-0 border border-accent-orange/20 rounded-xl animate-pulse-glow pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
            <span className="text-sm font-medium text-accent-orange font-mono">ROUND IN PROGRESS</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-dark-muted mb-1 uppercase">Direction</p>
              <p className="font-bold font-mono">
                <span className={pendingBet.direction === 'UP' ? 'neon-green' : 'neon-red'}>
                  {pendingBet.direction === 'UP' ? '\u25B2' : '\u25BC'} {pendingBet.direction}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-dark-muted mb-1 uppercase">Amount</p>
              <p className="font-bold font-mono">${fmt(pendingBet.amount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-dark-muted mb-1 uppercase">Confidence</p>
              <p className="font-bold font-mono neon-orange">{fmt(pendingBet.confidence, 1)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-dark-muted mb-1 uppercase">BTC Entry</p>
              <p className="font-bold font-mono">${Number(pendingBet.btc_price_start || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BTC Price Chart */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">BTC/USDT</h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/20 font-mono animate-blink">LIVE</span>
            </div>
            {displayPrice && (
              <div className="text-right">
                <p className={`text-lg font-bold font-mono ${isUp ? 'neon-green' : 'neon-red'}`}>
                  ${Number(displayPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-[10px] font-mono ${priceChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(3)}%)
                </p>
              </div>
            )}
          </div>
          {priceData.length < 2 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-dark-muted">
              <div className="flex flex-col items-center gap-2">
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                <span className="font-mono text-xs">Collecting price data...</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={priceData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis domain={[pMin - pRange * 0.1, pMax + pRange * 0.1]} tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} width={48} />
                <Tooltip content={<PriceTooltip />} />
                <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={1.5} fill="url(#priceGrad)" dot={false} activeDot={{ r: 3, fill: chartColor, stroke: '#111118', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Equity Curve */}
        <div className="terminal-card p-4">
          <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Equity Curve</h3>
          {equityCurve.length < 2 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-dark-muted font-mono">
              No trades yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6600" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#ff6600" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="idx" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={48} />
                <Tooltip content={<EquityTooltip />} />
                <Line type="monotone" dataKey="equity" stroke="#ff6600" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#ff6600', stroke: '#111118', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Activity Feed + Wallet ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Feed */}
        <div className="lg:col-span-2 terminal-card overflow-hidden flex flex-col" style={{ maxHeight: 340 }}>
          <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Activity Log</h3>
          </div>
          <div className="overflow-y-auto flex-1 scrollbar-thin">
            {(() => {
              const log = engine.getActivityLog();
              if (!log || log.length === 0) return (
                <p className="text-xs text-dark-muted text-center py-8 font-mono">No activity yet</p>
              );
              const typeCfg = {
                START: { c: 'text-accent-green', i: '\u25B6' },
                STOP: { c: 'text-accent-red', i: '\u25A0' },
                AUTO_STOP: { c: 'text-accent-red', i: '\u26D4' },
                SCAN: { c: 'text-accent-blue', i: '\u25CE' },
                SIGNAL: { c: 'text-accent-blue', i: '\u25C8' },
                BET: { c: 'text-accent-orange', i: '\u25C9' },
                WIN: { c: 'text-accent-green', i: '\u2713' },
                LOSS: { c: 'text-accent-red', i: '\u2717' },
                SKIP: { c: 'text-dark-muted', i: '\u23ED' },
                DEPOSIT: { c: 'text-accent-blue', i: '\u25B8' },
                WITHDRAW: { c: 'text-accent-orange', i: '\u25C2' },
                ERROR: { c: 'text-accent-red', i: '\u26A0' },
              };
              return (
                <div className="divide-y divide-dark-border/40">
                  {log.map((entry) => {
                    const cfg = typeCfg[entry.type] || { c: 'text-dark-muted', i: '\u2022' };
                    return (
                      <div key={entry.id} className="px-4 py-2 flex items-start gap-2.5 hover:bg-dark-hover transition-colors duration-100">
                        <span className={`text-xs mt-0.5 shrink-0 w-4 text-center ${cfg.c}`}>{cfg.i}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${cfg.c}`}>{entry.type}</span>
                            <span className="text-[10px] text-dark-muted font-mono">{formatTime(new Date(entry.time).getTime())}</span>
                          </div>
                          <p className="text-[11px] text-dark-text/80 leading-relaxed break-words mt-0.5">{entry.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Wallet Summary */}
        <div className="terminal-card p-4">
          <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Agent Wallet</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-dark-muted">Address</span>
              <span className="text-[11px] font-mono text-dark-text">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-dark-muted">Status</span>
              <div className="flex items-center gap-1.5">
                {agentStatus === 'active' && <span className="status-dot-active" />}
                <span className={`text-[11px] font-bold font-mono ${st.color}`}>{st.label}</span>
              </div>
            </div>
            <div className="border-t border-dark-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-dark-muted">Bankroll</span>
                <span className="text-sm font-bold font-mono neon-green">${fmt(dashboard?.bankroll)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-dark-muted">Total Deposited</span>
                <span className="text-[11px] font-mono text-dark-muted">${fmt(dashboard?.totalDeposited)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-dark-muted">P&L</span>
                <span className={`text-[11px] font-bold font-mono ${dashboard?.pnl >= 0 ? 'neon-green' : 'neon-red'}`}>
                  {fmtPnl(dashboard?.pnl)}
                </span>
              </div>
            </div>
            <div className="border-t border-dark-border pt-3">
              <p className="text-[9px] text-dark-muted leading-relaxed font-mono">
                Client-side demo mode. Connect MetaMask on Polygon Amoy for testnet integration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Trades (last 5) ─── */}
      {resolved.length > 0 && (
        <div className="terminal-card overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-border">
            <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Recent Trades</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full trade-table">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left">Time</th>
                  <th className="text-left">Dir</th>
                  <th className="text-right">Conf</th>
                  <th className="text-right">Size</th>
                  <th className="text-center">Result</th>
                  <th className="text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {(bets || []).filter(b => b.result === 'WIN' || b.result === 'LOSS').slice(0, 5).map(bet => (
                  <tr key={bet.id} className={`border-b border-dark-border/30 ${bet.result === 'WIN' ? 'bg-accent-green/[0.03]' : 'bg-accent-red/[0.03]'}`}>
                    <td className="text-dark-muted">{formatTime(new Date(bet.round_time).getTime())}</td>
                    <td>
                      <span className={bet.direction === 'UP' ? 'text-accent-green' : 'text-accent-red'}>
                        {bet.direction === 'UP' ? '\u25B2' : '\u25BC'} {bet.direction}
                      </span>
                    </td>
                    <td className="text-right text-dark-muted">{fmt(bet.confidence, 1)}%</td>
                    <td className="text-right">${fmt(bet.amount)}</td>
                    <td className="text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${bet.result === 'WIN' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                        {bet.result}
                      </span>
                    </td>
                    <td className={`text-right font-bold ${bet.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {fmtPnl(bet.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
