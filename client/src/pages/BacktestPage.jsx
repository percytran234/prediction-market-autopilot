import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { runBacktestLocal } from '../lib/backtestEngine';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }

const MARKETS = ['BTC', 'ETH', 'SOL'];
const PERIODS = [7, 14, 30, 60, 90];

// ─── Tooltip Components ───

function EquityTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="terminal-card px-3 py-2 text-xs shadow-lg border border-dark-border">
      <p className="text-dark-muted">Round #{d.round}</p>
      <p className="font-bold font-mono text-accent-green">${fmt(d.bankroll)}</p>
      {d.pnl !== undefined && (
        <p className={`font-mono ${d.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {d.pnl >= 0 ? '+' : ''}${fmt(d.pnl)}
        </p>
      )}
    </div>
  );
}

function DailyTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="terminal-card px-3 py-2 text-xs shadow-lg border border-dark-border">
      <p className="text-dark-muted">{d.date}</p>
      <p className={`font-bold font-mono ${d.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
        {d.pnl >= 0 ? '+' : ''}${fmt(d.pnl)}
      </p>
      <p className="text-dark-muted">{d.wins}W / {d.losses}L / {d.skipped}S</p>
    </div>
  );
}

// ─── Slider Component ───

function ParamSlider({ label, value, min, max, step = 1, unit = '', onChange, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold">{label}</label>
        <span className="text-sm font-bold font-mono text-accent-green">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 bg-dark-border rounded-full appearance-none cursor-pointer accent-[#00e676] disabled:opacity-40"
      />
      <div className="flex justify-between text-[9px] text-dark-muted/50 font-mono mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Stat Card ───

function StatCard({ label, value, sub, color = 'text-dark-text' }) {
  return (
    <div className="terminal-card p-4 text-center">
      <p className="text-[10px] text-dark-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-dark-muted font-mono mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───

export default function BacktestPage() {
  // Config state
  const [market, setMarket] = useState('BTC');
  const [days, setDays] = useState(30);
  const [betPercent, setBetPercent] = useState(2);
  const [skipThreshold, setSkipThreshold] = useState(60);
  const [stopLoss, setStopLoss] = useState(10);
  const [takeProfit, setTakeProfit] = useState(5);
  const [startingBankroll, setStartingBankroll] = useState(100);

  // Results state
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllBets, setShowAllBets] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await runBacktestLocal({ market, days, betPercent, skipThreshold, stopLoss, takeProfit, startingBankroll });
      setResults(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function runComparison() {
    setCompareLoading(true);
    try {
      const data = await runBacktestLocal({ market, days, betPercent, skipThreshold, stopLoss, takeProfit, startingBankroll, compareRandom: true });
      setResults(data);
    } catch (err) {
      setError(err.message);
    }
    setCompareLoading(false);
  }

  // Donut chart data
  const distributionData = useMemo(() => {
    if (!results) return [];
    return [
      { name: 'Wins', value: results.wins, color: '#00e676' },
      { name: 'Losses', value: results.losses, color: '#ff1744' },
      { name: 'Skips', value: results.skipped, color: '#4a7a4e' },
    ].filter(d => d.value > 0);
  }, [results]);

  // Merge equity curves for comparison overlay
  const comparisonData = useMemo(() => {
    if (!results?.randomBaseline?.equityCurve) return null;
    const strategy = results.equityCurve;
    const random = results.randomBaseline.equityCurve;
    const maxLen = Math.max(strategy.length, random.length);
    const merged = [];
    for (let i = 0; i < maxLen; i++) {
      merged.push({
        round: i,
        strategy: strategy[i]?.bankroll ?? strategy[strategy.length - 1]?.bankroll,
        random: random[i]?.bankroll ?? random[random.length - 1]?.bankroll,
      });
    }
    return merged;
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-dark-text">Backtest</h2>
        <span className="text-[10px] font-mono text-dark-muted uppercase tracking-widest">Strategy Simulator</span>
      </div>

      {/* ─── Configuration Panel ─── */}
      <div className="terminal-card p-5">
        <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Configuration</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Market Selector */}
          <div>
            <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold block mb-2">Market</label>
            <div className="flex gap-2">
              {MARKETS.map(m => (
                <button key={m} onClick={() => setMarket(m)} disabled={loading}
                  className={`flex-1 px-3 py-2 text-xs font-bold font-mono rounded-lg border transition ${
                    market === m
                      ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                      : 'text-dark-muted border-dark-border hover:bg-dark-hover'
                  } disabled:opacity-40`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Time Period */}
          <div>
            <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold block mb-2">Time Period</label>
            <div className="flex gap-1.5">
              {PERIODS.map(p => (
                <button key={p} onClick={() => setDays(p)} disabled={loading}
                  className={`flex-1 px-2 py-2 text-xs font-bold font-mono rounded-lg border transition ${
                    days === p
                      ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                      : 'text-dark-muted border-dark-border hover:bg-dark-hover'
                  } disabled:opacity-40`}>
                  {p}d
                </button>
              ))}
            </div>
          </div>

          {/* Starting Bankroll */}
          <div>
            <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold block mb-2">Starting Bankroll</label>
            <div className="flex items-center gap-2">
              <span className="text-dark-muted text-sm">$</span>
              <input
                type="number" min={1} max={100000} value={startingBankroll}
                onChange={e => setStartingBankroll(Math.max(1, Number(e.target.value)))}
                disabled={loading}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-mono text-dark-text focus:outline-none focus:border-accent-green/50 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Sliders */}
          <ParamSlider label="Bet Size" value={betPercent} min={1} max={10} unit="%" onChange={setBetPercent} disabled={loading} />
          <ParamSlider label="Skip Threshold" value={skipThreshold} min={50} max={80} unit="%" onChange={setSkipThreshold} disabled={loading} />
          <ParamSlider label="Stop Loss" value={stopLoss} min={5} max={20} unit="%" onChange={setStopLoss} disabled={loading} />
          <ParamSlider label="Take Profit" value={takeProfit} min={3} max={15} unit="%" onChange={setTakeProfit} disabled={loading} />
        </div>

        {/* Run Button */}
        <div className="mt-5 flex items-center gap-3">
          <button onClick={runBacktest} disabled={loading || compareLoading}
            className="px-8 py-3 bg-accent-green text-black text-sm font-extrabold rounded-xl hover:brightness-110 transition disabled:opacity-50 font-mono tracking-wide">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner w-4 h-4 border-2 border-black/30 border-t-black rounded-full" />
                Running Backtest...
              </span>
            ) : 'Run Backtest'}
          </button>
          {results && !compareLoading && (
            <button onClick={runComparison} disabled={loading}
              className="px-5 py-3 text-xs font-bold font-mono text-dark-muted border border-dark-border rounded-xl hover:bg-dark-hover hover:text-accent-green hover:border-accent-green/30 transition disabled:opacity-40">
              {compareLoading ? 'Running...' : 'Compare with Random'}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="terminal-card p-4 border-accent-red/30">
          <p className="text-xs font-mono text-accent-red">{error}</p>
        </div>
      )}

      {/* ─── Results Dashboard ─── */}
      {results && (
        <div className="space-y-5 animate-page-enter">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total P&L"
              value={`${results.totalPnL >= 0 ? '+' : ''}$${fmt(results.totalPnL)}`}
              sub={`${results.totalPnLPercent >= 0 ? '+' : ''}${fmt(results.totalPnLPercent, 1)}%`}
              color={results.totalPnL >= 0 ? 'neon-green' : 'neon-red'}
            />
            <StatCard
              label="Win Rate"
              value={`${fmt(results.winRate, 1)}%`}
              sub={`${results.wins}W / ${results.losses}L / ${results.skipped}S`}
              color={results.winRate >= 50 ? 'neon-green' : 'neon-red'}
            />
            <StatCard
              label="Max Drawdown"
              value={`-${fmt(results.maxDrawdown, 1)}%`}
              sub={`-$${fmt(results.maxDrawdownDollar)}`}
              color="neon-red"
            />
            <StatCard
              label="Sharpe Ratio"
              value={fmt(results.sharpeRatio, 2)}
              sub={results.sharpeRatio > 1 ? 'Good' : results.sharpeRatio > 0.5 ? 'Moderate' : 'Low'}
              color={results.sharpeRatio > 1 ? 'neon-green' : results.sharpeRatio > 0.5 ? 'text-accent-yellow' : 'neon-red'}
            />
          </div>

          {/* Equity Curve — most important chart */}
          <div className="terminal-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">
                Equity Curve {comparisonData ? '— Strategy vs Random' : ''}
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-dark-text">$<span className="text-accent-green font-bold">{fmt(results.startingBankroll)}</span> → $<span className={results.endingBankroll >= results.startingBankroll ? 'text-accent-green' : 'text-accent-red'}>{fmt(results.endingBankroll)}</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              {comparisonData ? (
                <LineChart data={comparisonData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="round" tick={{ fontSize: 9, fill: '#4a7a4e', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#4a7a4e', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={50} />
                  <Tooltip content={<EquityTooltip />} />
                  <ReferenceLine y={results.startingBankroll} stroke="#4a7a4e" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="strategy" stroke="#00e676" strokeWidth={2} dot={false} name="Strategy" />
                  <Line type="monotone" dataKey="random" stroke="#4a7a4e" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Random" />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                </LineChart>
              ) : (
                <AreaChart data={results.equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e676" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00e676" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="round" tick={{ fontSize: 9, fill: '#4a7a4e', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#4a7a4e', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={50} />
                  <Tooltip content={<EquityTooltip />} />
                  <ReferenceLine y={results.startingBankroll} stroke="#4a7a4e" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="bankroll" stroke="#00e676" strokeWidth={2} fill="url(#equityGrad)" dot={false}
                    activeDot={{ r: 3, fill: '#00e676', stroke: '#111a12', strokeWidth: 2 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Daily Returns + Bet Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Daily Returns Bar Chart */}
            <div className="terminal-card p-4 lg:col-span-2">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Daily Returns</h3>
              {results.dailyReturns.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={results.dailyReturns} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#4a7a4e', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}
                      tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 9, fill: '#4a7a4e', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${v.toFixed(0)}`} width={42} />
                    <Tooltip content={<DailyTooltip />} />
                    <ReferenceLine y={0} stroke="#4a7a4e" strokeDasharray="2 2" />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                      {results.dailyReturns.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? '#00e676' : '#ff1744'} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-dark-muted text-center py-8 font-mono">No daily data</p>
              )}
            </div>

            {/* Bet Distribution Donut */}
            <div className="terminal-card p-4">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Bet Distribution</h3>
              {distributionData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                        dataKey="value" startAngle={90} endAngle={-270} paddingAngle={2}>
                        {distributionData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="#111a12" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111a12', border: '1px solid #1e3320', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-[10px] font-mono mt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-green" /> Wins {results.wins}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-red" /> Losses {results.losses}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#4a7a4e' }} /> Skips {results.skipped}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-dark-muted text-center py-8 font-mono">No data</p>
              )}
            </div>
          </div>

          {/* Detailed Stats Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Metrics */}
            <div className="terminal-card p-4">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Performance Metrics</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Total Rounds', value: results.totalRounds },
                  { label: 'Bets Placed', value: results.betsPlaced },
                  { label: 'Win Rate', value: `${fmt(results.winRate, 1)}%`, color: results.winRate >= 50 ? 'text-accent-green' : 'text-accent-red' },
                  { label: 'Skip Rate', value: `${fmt(results.skipRate, 1)}%` },
                  { label: 'Total P&L', value: `${results.totalPnL >= 0 ? '+' : ''}$${fmt(results.totalPnL)}`, color: results.totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red' },
                  { label: 'Profit Factor', value: results.profitFactor === Infinity ? '∞' : fmt(results.profitFactor, 2), color: results.profitFactor >= 1 ? 'text-accent-green' : 'text-accent-red' },
                  { label: 'Avg Win', value: `+$${fmt(results.avgWinAmount)}`, color: 'text-accent-green' },
                  { label: 'Avg Loss', value: `-$${fmt(results.avgLossAmount)}`, color: 'text-accent-red' },
                  { label: 'Starting Bankroll', value: `$${fmt(results.startingBankroll)}` },
                  { label: 'Ending Bankroll', value: `$${fmt(results.endingBankroll)}`, color: results.endingBankroll >= results.startingBankroll ? 'text-accent-green' : 'text-accent-red' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-dark-border/30">
                    <span className="text-[11px] text-dark-muted">{label}</span>
                    <span className={`text-sm font-bold font-mono ${color || 'text-dark-text'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="terminal-card p-4">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Risk Metrics</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Max Drawdown', value: `-${fmt(results.maxDrawdown, 1)}%`, color: 'text-accent-red' },
                  { label: 'Max Drawdown ($)', value: `-$${fmt(results.maxDrawdownDollar)}`, color: 'text-accent-red' },
                  { label: 'Sharpe Ratio', value: fmt(results.sharpeRatio, 2), color: results.sharpeRatio > 1 ? 'text-accent-green' : results.sharpeRatio > 0.5 ? 'text-accent-yellow' : 'text-accent-red' },
                  { label: 'Sortino Ratio', value: fmt(results.sortinoRatio, 2), color: results.sortinoRatio > 1 ? 'text-accent-green' : results.sortinoRatio > 0.5 ? 'text-accent-yellow' : 'text-accent-red' },
                  { label: 'Longest Win Streak', value: `${results.longestWinStreak}`, color: 'text-accent-green' },
                  { label: 'Longest Loss Streak', value: `${results.longestLossStreak}`, color: 'text-accent-red' },
                  { label: 'Bet Size', value: `${betPercent}%` },
                  { label: 'Skip Threshold', value: `${skipThreshold}%` },
                  { label: 'Daily Stop Loss', value: `-${stopLoss}%`, color: 'text-accent-red' },
                  { label: 'Daily Take Profit', value: `+${takeProfit}%`, color: 'text-accent-green' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-dark-border/30">
                    <span className="text-[11px] text-dark-muted">{label}</span>
                    <span className={`text-sm font-bold font-mono ${color || 'text-dark-text'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Random Comparison Summary */}
          {results.randomBaseline && (
            <div className="terminal-card p-4">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Strategy vs Random Comparison</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-dark-muted uppercase">Strategy P&L</p>
                  <p className={`text-lg font-bold font-mono ${results.totalPnL >= 0 ? 'neon-green' : 'neon-red'}`}>
                    {results.totalPnL >= 0 ? '+' : ''}${fmt(results.totalPnL)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-dark-muted uppercase">Random P&L</p>
                  <p className={`text-lg font-bold font-mono ${results.randomBaseline.totalPnL >= 0 ? 'neon-green' : 'neon-red'}`}>
                    {results.randomBaseline.totalPnL >= 0 ? '+' : ''}${fmt(results.randomBaseline.totalPnL)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-dark-muted uppercase">Edge</p>
                  {(() => {
                    const edge = results.totalPnL - results.randomBaseline.totalPnL;
                    return (
                      <p className={`text-lg font-bold font-mono ${edge >= 0 ? 'neon-green' : 'neon-red'}`}>
                        {edge >= 0 ? '+' : ''}${fmt(edge)}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Simulated Bets Table (collapsible) */}
          <div className="terminal-card overflow-hidden">
            <button
              onClick={() => setShowAllBets(!showAllBets)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-dark-hover transition">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">
                Simulated Bets ({results.allBets.length})
              </h3>
              <span className="text-dark-muted text-xs font-mono">{showAllBets ? '▲ Collapse' : '▼ Expand'}</span>
            </button>
            {showAllBets && (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full trade-table">
                  <thead>
                    <tr className="border-b border-dark-border bg-[#0d1410] sticky top-0">
                      <th className="text-left">Time</th>
                      <th className="text-center">Dir</th>
                      <th className="text-right">Conf</th>
                      <th className="text-right">Entry</th>
                      <th className="text-right">Exit</th>
                      <th className="text-center">Result</th>
                      <th className="text-right">P&L</th>
                      <th className="text-right">Bankroll</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.allBets.map((bet, idx) => {
                      const isWin = bet.result === 'WIN';
                      return (
                        <tr key={idx} className={`border-b border-dark-border/30 ${isWin ? 'bg-[#0a2a0a]' : 'bg-[#2a0a0a]'}`}>
                          <td className="text-dark-muted">{bet.time.slice(0, 16).replace('T', ' ')}</td>
                          <td className="text-center">
                            <span className={bet.direction === 'UP' ? 'text-accent-green' : 'text-accent-red'}>
                              {bet.direction === 'UP' ? '▲' : '▼'} {bet.direction}
                            </span>
                          </td>
                          <td className="text-right text-dark-muted">{bet.confidence}%</td>
                          <td className="text-right text-dark-muted">${bet.entryPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-right text-dark-muted">${bet.exitPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isWin ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
                            }`}>{bet.result}</span>
                          </td>
                          <td className={`text-right font-bold ${bet.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                            {bet.pnl >= 0 ? '+' : ''}${fmt(bet.pnl)}
                          </td>
                          <td className="text-right text-dark-muted">${fmt(bet.bankroll)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="terminal-card p-12 text-center">
          <div className="text-4xl mb-3 opacity-30">📊</div>
          <p className="text-sm text-dark-muted font-mono">Configure parameters above and hit <span className="text-accent-green">Run Backtest</span> to simulate your strategy on historical data.</p>
          <p className="text-[10px] text-dark-muted/50 font-mono mt-2">Uses the same EMA/RSI/Volume signal engine as the live agent.</p>
        </div>
      )}
    </div>
  );
}
