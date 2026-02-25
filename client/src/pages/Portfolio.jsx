import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const API = '/api/portfolio';
const GREEN = '#00e676';
const RED = '#ff1744';
const MUTED = '#4a7a4e';
const CARD_BG = '#111a12';
const BORDER = '#1e3320';

function fmt$(v, dec = 2) {
  if (v == null || isNaN(v)) return '$0.00';
  const sign = v >= 0 ? '+$' : '-$';
  return `${sign}${Math.abs(v).toFixed(dec)}`;
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return '0.00%';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

// ─── Custom Tooltip ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1410] border border-dark-border rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-dark-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke }}>
          {p.name}: {prefix === '$' ? `$${Number(p.value).toFixed(2)}` : Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="terminal-card p-4 flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-dark-muted font-mono">{label}</span>
      <span className={`text-xl font-bold font-mono ${color || 'text-dark-text'}`}>{value}</span>
      {sub && <span className="text-[11px] text-dark-muted font-mono">{sub}</span>}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="text-6xl mb-4 opacity-30">📊</div>
      <h2 className="text-xl font-bold text-dark-text mb-2">No trading history yet</h2>
      <p className="text-dark-muted text-sm mb-6">Start the agent to begin collecting performance data.</p>
      <a href="/" className="px-6 py-2.5 bg-accent-green text-black text-sm font-bold rounded-xl hover:brightness-110 transition font-mono">
        Go to Dashboard
      </a>
    </div>
  );
}

// ─── Calendar Heatmap ───────────────────────────────────────────────
function CalendarHeatmap({ data }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const { grid, months } = useMemo(() => {
    if (!data.length) return { grid: [], months: [] };

    // Last 90 days
    const now = new Date();
    const days = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = data.find(e => e.date === dateStr);
      days.push({
        date: dateStr,
        dayOfWeek: d.getDay(),
        pnl: entry ? entry.pnl : null,
        pnlPercent: entry ? entry.pnlPercent : null,
        wins: entry ? entry.wins : 0,
        losses: entry ? entry.losses : 0,
      });
    }

    // Build columns (weeks)
    const cols = [];
    let col = [];
    for (const day of days) {
      if (day.dayOfWeek === 0 && col.length > 0) {
        cols.push(col);
        col = [];
      }
      col.push(day);
    }
    if (col.length) cols.push(col);

    // Month labels
    const ms = [];
    let lastMonth = -1;
    cols.forEach((c, ci) => {
      const m = new Date(c[0].date).getMonth();
      if (m !== lastMonth) {
        ms.push({ idx: ci, label: new Date(c[0].date).toLocaleString('en', { month: 'short' }) });
        lastMonth = m;
      }
    });

    return { grid: cols, months: ms };
  }, [data]);

  function getColor(pnl) {
    if (pnl === null) return '#1a1a1a';
    if (pnl === 0) return '#2a2a2a';
    if (pnl > 0) {
      const intensity = Math.min(pnl / 2, 1);
      if (intensity > 0.6) return '#00c853';
      if (intensity > 0.3) return '#00e676';
      return '#1b5e20';
    } else {
      const intensity = Math.min(Math.abs(pnl) / 2, 1);
      if (intensity > 0.6) return '#d50000';
      if (intensity > 0.3) return '#ff1744';
      return '#b71c1c';
    }
  }

  const SZ = 13;
  const GAP = 2;

  return (
    <div className="terminal-card p-5">
      <h3 className="text-sm font-bold text-dark-text mb-1 font-mono">PERFORMANCE CALENDAR</h3>
      <p className="text-[10px] text-dark-muted mb-4 font-mono">Last 90 days — hover for details</p>

      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: grid.length * (SZ + GAP) + 30 }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ marginLeft: 28 }}>
            {months.map((m, i) => (
              <span key={i} className="text-[9px] text-dark-muted font-mono absolute" style={{ left: 28 + m.idx * (SZ + GAP) }}>{m.label}</span>
            ))}
          </div>

          <div className="flex gap-0 mt-4">
            {/* Day labels */}
            <div className="flex flex-col mr-1" style={{ gap: GAP }}>
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <span key={i} className="text-[8px] text-dark-muted font-mono" style={{ height: SZ, lineHeight: SZ + 'px' }}>{d}</span>
              ))}
            </div>

            {/* Grid */}
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {/* Pad first week */}
                {wi === 0 && Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                  <div key={`pad-${i}`} style={{ width: SZ, height: SZ }} />
                ))}
                {week.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/30"
                    style={{ width: SZ, height: SZ, backgroundColor: getColor(day.pnl) }}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[9px] text-dark-muted font-mono">Loss</span>
            {['#d50000', '#ff1744', '#b71c1c', '#2a2a2a', '#1b5e20', '#00e676', '#00c853'].map((c, i) => (
              <div key={i} className="rounded-sm" style={{ width: 10, height: 10, backgroundColor: c }} />
            ))}
            <span className="text-[9px] text-dark-muted font-mono">Win</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredDay && (
        <div className="mt-3 px-3 py-2 bg-dark-bg rounded-lg border border-dark-border text-xs font-mono inline-block">
          <span className="text-dark-muted">{hoveredDay.date}</span>
          {hoveredDay.pnl !== null ? (
            <>
              <span className="mx-2">|</span>
              <span className={hoveredDay.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>{fmt$(hoveredDay.pnl)}</span>
              <span className="mx-2">|</span>
              <span className="text-dark-muted">W:{hoveredDay.wins} L:{hoveredDay.losses}</span>
            </>
          ) : (
            <span className="text-dark-muted ml-2">No trades</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Portfolio Page ────────────────────────────────────────────
export default function PortfolioPage() {
  const [summary, setSummary] = useState(null);
  const [equity, setEquity] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [risk, setRisk] = useState(null);
  const [period, setPeriod] = useState('all');
  const [showBtc, setShowBtc] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/summary`).then(r => r.json()),
      fetch(`${API}/equity?period=${period}`).then(r => r.json()),
      fetch(`${API}/calendar`).then(r => r.json()),
      fetch(`${API}/hourly`).then(r => r.json()),
      fetch(`${API}/markets`).then(r => r.json()),
      fetch(`${API}/streaks`).then(r => r.json()),
      fetch(`${API}/risk`).then(r => r.json()),
    ]).then(([sum, eq, cal, hr, mkt, str, rsk]) => {
      setSummary(sum);
      setEquity(eq);
      setCalendar(cal);
      setHourly(hr);
      setMarkets(mkt);
      setStreaks(str);
      setRisk(rsk);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  // Reload equity when period changes
  useEffect(() => {
    fetch(`${API}/equity?period=${period}`).then(r => r.json()).then(setEquity);
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="spinner" />
        <span className="ml-3 text-dark-muted font-mono text-sm">Loading portfolio...</span>
      </div>
    );
  }

  if (!summary || summary.empty) return <EmptyState />;

  const pnlColor = summary.allTimePnL >= 0 ? 'text-accent-green' : 'text-accent-red';
  const todayColor = summary.todayPnl >= 0 ? 'text-accent-green' : 'text-accent-red';

  // Hourly insights
  const bestHours = hourly.filter(h => h.trades > 0 && h.avgPnl > 0).sort((a, b) => b.avgPnl - a.avgPnl);
  const bestHourRange = bestHours.length > 0
    ? `Best hours: ${bestHours.slice(0, 3).map(h => `${String(h.hour).padStart(2, '0')}:00`).join(', ')} UTC`
    : 'Not enough data yet';

  const MARKET_COLORS = { BTC: '#ff9100', ETH: '#3b82f6', SOL: '#a855f7', OTHER: '#6b7280' };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text font-mono tracking-tight">Portfolio</h1>
          <p className="text-[11px] text-dark-muted font-mono mt-0.5">Historical performance analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open(`${API}/export/csv`, '_blank')}
            className="px-4 py-2 text-xs font-mono bg-dark-card border border-dark-border rounded-lg hover:border-accent-green/50 hover:text-accent-green transition"
          >
            Download CSV
          </button>
          <button className="px-4 py-2 text-xs font-mono bg-dark-card border border-dark-border rounded-lg text-dark-muted cursor-not-allowed relative">
            Share Results
            <span className="absolute -top-2 -right-2 text-[8px] bg-accent-yellow text-black px-1.5 py-0.5 rounded-full font-bold">SOON</span>
          </button>
        </div>
      </div>

      {/* ── SECTION 1: Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Portfolio Value" value={`$${summary.totalValue.toFixed(2)}`} sub={`Deposited: $${(summary.totalValue - summary.allTimePnL).toFixed(2)}`} />
        <StatCard label="All-Time P&L" value={fmt$(summary.allTimePnL)} sub={fmtPct(summary.allTimePnLPercent)} color={pnlColor} />
        <StatCard label="Today's P&L" value={fmt$(summary.todayPnl)} color={todayColor} />
        <StatCard label="Win Rate" value={`${summary.winRate.toFixed(1)}%`} sub={`${summary.totalWins}W / ${summary.totalLosses}L`} color="text-accent-green" />
        <StatCard label="Total Rounds" value={summary.totalRounds} sub={`${summary.totalSkips} skipped`} />
      </div>

      {/* ── SECTION 2: Equity Curve ── */}
      <div className="terminal-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-dark-text font-mono">EQUITY CURVE</h3>
            <p className="text-[10px] text-dark-muted font-mono">Portfolio value over time</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBtc(!showBtc)}
              className={`px-3 py-1.5 text-[10px] font-mono rounded-lg border transition ${showBtc ? 'border-accent-green/50 text-accent-green bg-accent-green/10' : 'border-dark-border text-dark-muted hover:text-dark-text'}`}
            >
              vs Buy & Hold BTC
            </button>
            <div className="flex rounded-lg border border-dark-border overflow-hidden">
              {['7d', '30d', '90d', 'all'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-[10px] font-mono transition ${period === p ? 'bg-accent-green/20 text-accent-green' : 'text-dark-muted hover:text-dark-text'}`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equity} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff9100" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ff9100" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e3320" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: MUTED, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: MUTED, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<ChartTooltip prefix="$" />} />
              <Area type="monotone" dataKey="bankroll" name="Portfolio" stroke={GREEN} strokeWidth={2} fill="url(#equityGrad)" dot={false} activeDot={{ r: 4, fill: GREEN, stroke: CARD_BG }} />
              {showBtc && (
                <Area type="monotone" dataKey="btcBuyHold" name="BTC Buy & Hold" stroke="#ff9100" strokeWidth={1.5} strokeDasharray="6 3" fill="url(#btcGrad)" dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SECTION 3: Calendar Heatmap ── */}
      <CalendarHeatmap data={calendar} />

      {/* ── SECTION 4: Market Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart */}
        <div className="terminal-card p-5">
          <h3 className="text-sm font-bold text-dark-text mb-4 font-mono">P&L BY MARKET</h3>
          {markets.length > 0 ? (
            <div className="flex items-center justify-center" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={markets.map(m => ({ name: m.market, value: Math.abs(m.totalPnl), actualPnl: m.totalPnl }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                    stroke="none"
                  >
                    {markets.map((m, i) => (
                      <Cell key={i} fill={MARKET_COLORS[m.market] || MARKET_COLORS.OTHER} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0d1410] border border-dark-border rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
                        <p className="text-dark-text">{d.name}</p>
                        <p className={d.actualPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>{fmt$(d.actualPnl)}</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-dark-muted text-xs font-mono">No market data</p>}
        </div>

        {/* Market Table */}
        <div className="terminal-card p-5 overflow-x-auto">
          <h3 className="text-sm font-bold text-dark-text mb-4 font-mono">MARKET DETAILS</h3>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-dark-muted text-[10px] uppercase tracking-wider border-b border-dark-border">
                <th className="text-left pb-2 pr-4">Market</th>
                <th className="text-right pb-2 pr-4">Trades</th>
                <th className="text-right pb-2 pr-4">Win Rate</th>
                <th className="text-right pb-2 pr-4">P&L</th>
                <th className="text-right pb-2 pr-4">Best Day</th>
                <th className="text-right pb-2">Worst Day</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m, i) => (
                <tr key={i} className="border-b border-dark-border/50">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MARKET_COLORS[m.market] || MARKET_COLORS.OTHER }} />
                      {m.market}
                    </div>
                  </td>
                  <td className="text-right py-2 pr-4 text-dark-muted">{m.trades}</td>
                  <td className="text-right py-2 pr-4">{m.winRate.toFixed(1)}%</td>
                  <td className={`text-right py-2 pr-4 ${m.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{fmt$(m.totalPnl)}</td>
                  <td className="text-right py-2 pr-4 text-accent-green">{fmt$(m.bestDay)}</td>
                  <td className="text-right py-2 text-accent-red">{fmt$(m.worstDay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 5: Time of Day Analysis ── */}
      <div className="terminal-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-dark-text font-mono">TIME-OF-DAY PERFORMANCE</h3>
            <p className="text-[10px] text-dark-muted font-mono">Average P&L by hour (UTC)</p>
          </div>
          <span className="text-[10px] text-accent-green font-mono bg-accent-green/10 px-3 py-1 rounded-full">{bestHourRange}</span>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid stroke="#1e3320" strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: MUTED, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={h => `${String(h).padStart(2, '0')}`} />
              <YAxis tick={{ fontSize: 9, fill: MUTED, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(2)}`} />
              <Tooltip content={<ChartTooltip prefix="$" />} />
              <Bar dataKey="avgPnl" name="Avg P&L" radius={[3, 3, 0, 0]}>
                {hourly.map((h, i) => (
                  <Cell key={i} fill={h.avgPnl >= 0 ? GREEN : RED} fillOpacity={h.trades > 0 ? 0.8 : 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SECTION 6: Streak Analysis ── */}
      {streaks && (
        <div className="terminal-card p-5">
          <h3 className="text-sm font-bold text-dark-text mb-4 font-mono">STREAK ANALYSIS</h3>
          <div className="flex items-center gap-6 flex-wrap">
            {/* Current Streak Badge */}
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2.5 rounded-xl text-lg font-bold font-mono ${streaks.currentStreak.type === 'W' ? 'bg-accent-green/15 text-accent-green border border-accent-green/30' : 'bg-accent-red/15 text-accent-red border border-accent-red/30'}`}>
                {streaks.currentStreak.type === 'W' ? '🔥' : '❄️'} {streaks.currentStreak.type}{streaks.currentStreak.count}
              </div>
              <div>
                <p className="text-[10px] text-dark-muted font-mono uppercase">Current</p>
                <p className="text-xs font-mono text-dark-text">{streaks.currentStreak.count} {streaks.currentStreak.type === 'W' ? 'wins' : 'losses'} in a row</p>
              </div>
            </div>

            <div className="h-8 w-px bg-dark-border" />

            {/* Longest Win */}
            <div>
              <p className="text-[10px] text-dark-muted font-mono uppercase">Longest Win</p>
              <p className="text-lg font-bold text-accent-green font-mono">{streaks.longestWin}</p>
            </div>

            <div className="h-8 w-px bg-dark-border" />

            {/* Longest Loss */}
            <div>
              <p className="text-[10px] text-dark-muted font-mono uppercase">Longest Loss</p>
              <p className="text-lg font-bold text-accent-red font-mono">{streaks.longestLoss}</p>
            </div>

            <div className="h-8 w-px bg-dark-border hidden md:block" />

            {/* Recent Streaks Visualization */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-[10px] text-dark-muted font-mono uppercase mb-2">Recent Streaks</p>
              <div className="flex items-end gap-1">
                {streaks.recentStreaks.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-mono text-dark-muted">{s.count}</span>
                    <div
                      className="rounded-sm min-w-[16px]"
                      style={{
                        height: Math.max(8, s.count * 12),
                        backgroundColor: s.type === 'W' ? GREEN : RED,
                        opacity: 0.6 + (i / streaks.recentStreaks.length) * 0.4,
                      }}
                    />
                    <span className="text-[8px] font-mono" style={{ color: s.type === 'W' ? GREEN : RED }}>{s.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 7: Risk Metrics ── */}
      {risk && (
        <div className="terminal-card p-5">
          <h3 className="text-sm font-bold text-dark-text mb-4 font-mono">RISK METRICS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-dark-bg rounded-lg border border-dark-border/50">
              <p className="text-[10px] text-dark-muted font-mono uppercase">Max Drawdown</p>
              <p className="text-lg font-bold text-accent-red font-mono">{risk.maxDrawdown.toFixed(2)}%</p>
              <p className="text-[10px] text-dark-muted font-mono">{fmt$(- risk.maxDrawdownDollar)}</p>
            </div>
            <div className="p-3 bg-dark-bg rounded-lg border border-dark-border/50">
              <p className="text-[10px] text-dark-muted font-mono uppercase">Current Drawdown</p>
              <p className="text-lg font-bold font-mono" style={{ color: risk.currentDrawdown > 0 ? RED : GREEN }}>{risk.currentDrawdown.toFixed(2)}%</p>
            </div>
            <div className="p-3 bg-dark-bg rounded-lg border border-dark-border/50">
              <p className="text-[10px] text-dark-muted font-mono uppercase">Sharpe Ratio</p>
              <p className="text-lg font-bold text-dark-text font-mono">{risk.sharpeRatio.toFixed(2)}</p>
              <p className="text-[10px] text-dark-muted font-mono">{risk.sharpeRatio > 1 ? 'Good' : risk.sharpeRatio > 0 ? 'Fair' : 'Poor'}</p>
            </div>
            <div className="p-3 bg-dark-bg rounded-lg border border-dark-border/50">
              <p className="text-[10px] text-dark-muted font-mono uppercase">Sortino Ratio</p>
              <p className="text-lg font-bold text-dark-text font-mono">{risk.sortinoRatio.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-dark-bg rounded-lg border border-dark-border/50">
              <p className="text-[10px] text-dark-muted font-mono uppercase">Profit Factor</p>
              <p className="text-lg font-bold text-dark-text font-mono">{risk.profitFactor === Infinity ? '∞' : risk.profitFactor.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-dark-bg rounded-lg border border-dark-border/50">
              <p className="text-[10px] text-dark-muted font-mono uppercase">Win/Loss Ratio</p>
              <p className="text-lg font-bold text-dark-text font-mono">{risk.winLossRatio === Infinity ? '∞' : risk.winLossRatio.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-dark-bg rounded-lg border border-dark-border/50 col-span-2">
              <p className="text-[10px] text-dark-muted font-mono uppercase mb-2">Avg Win vs Avg Loss</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-accent-green">Avg Win</span>
                    <span className="text-accent-green">{fmt$(risk.avgWin)}</span>
                  </div>
                  <div className="h-3 bg-dark-bg rounded-full overflow-hidden border border-dark-border/30">
                    <div className="h-full bg-accent-green/60 rounded-full" style={{ width: `${Math.min(100, risk.avgWin / Math.max(risk.avgWin, risk.avgLoss, 0.01) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-accent-red">Avg Loss</span>
                    <span className="text-accent-red">-${risk.avgLoss.toFixed(4)}</span>
                  </div>
                  <div className="h-3 bg-dark-bg rounded-full overflow-hidden border border-dark-border/30">
                    <div className="h-full bg-accent-red/60 rounded-full" style={{ width: `${Math.min(100, risk.avgLoss / Math.max(risk.avgWin, risk.avgLoss, 0.01) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
