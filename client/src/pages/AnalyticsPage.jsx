import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }

// ─── Win Rate Heatmap by Hour ───
function HourlyHeatmap({ bets }) {
  const hourData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, wins: 0, total: 0 }));
    const resolved = (bets || []).filter(b => b.result === 'WIN' || b.result === 'LOSS');
    for (const b of resolved) {
      const h = new Date(b.round_time).getHours();
      hours[h].total++;
      if (b.result === 'WIN') hours[h].wins++;
    }
    return hours;
  }, [bets]);

  function getCellColor(wins, total) {
    if (total === 0) return '#1e1e2e';
    const rate = wins / total;
    if (rate >= 0.7) return '#00ff88';
    if (rate >= 0.5) return '#22c55e';
    if (rate >= 0.4) return '#ff6600';
    return '#ff3333';
  }

  function getCellOpacity(total) {
    if (total === 0) return 0.3;
    return Math.min(1, 0.4 + total * 0.15);
  }

  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Win Rate by Hour of Day</h3>
      <div className="grid grid-cols-12 gap-1">
        {hourData.map(h => {
          const rate = h.total > 0 ? ((h.wins / h.total) * 100).toFixed(0) : '—';
          return (
            <div key={h.hour} className="flex flex-col items-center gap-1">
              <div
                className="heatmap-cell w-full aspect-square flex items-center justify-center relative group"
                style={{
                  backgroundColor: getCellColor(h.wins, h.total),
                  opacity: getCellOpacity(h.total),
                }}
                title={`${h.hour}:00 — ${h.wins}W/${h.total} trades (${rate}%)`}
              >
                <span className="text-[8px] font-mono font-bold text-dark-bg">{h.total > 0 ? rate : ''}</span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border rounded px-2 py-1 text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                  <span className="text-dark-muted">{h.hour}:00</span>
                  <span className="text-dark-text ml-1">{h.wins}W/{h.total - h.wins}L</span>
                </div>
              </div>
              <span className="text-[8px] text-dark-muted font-mono">{String(h.hour).padStart(2, '0')}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ff3333', opacity: 0.7 }} />
          <span className="text-[9px] text-dark-muted font-mono">&lt;40%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ff6600', opacity: 0.7 }} />
          <span className="text-[9px] text-dark-muted font-mono">40-50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#22c55e', opacity: 0.7 }} />
          <span className="text-[9px] text-dark-muted font-mono">50-70%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#00ff88', opacity: 0.9 }} />
          <span className="text-[9px] text-dark-muted font-mono">&gt;70%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Confidence vs Win Rate Bar Chart ───
function ConfidenceChart({ bets }) {
  const data = useMemo(() => {
    const buckets = [
      { range: '60-65%', min: 60, max: 65, wins: 0, total: 0 },
      { range: '65-70%', min: 65, max: 70, wins: 0, total: 0 },
      { range: '70-75%', min: 70, max: 75, wins: 0, total: 0 },
      { range: '75-80%', min: 75, max: 80, wins: 0, total: 0 },
      { range: '80-85%', min: 80, max: 85, wins: 0, total: 0 },
      { range: '85-90%', min: 85, max: 90, wins: 0, total: 0 },
      { range: '90%+', min: 90, max: 101, wins: 0, total: 0 },
    ];
    const resolved = (bets || []).filter(b => b.result === 'WIN' || b.result === 'LOSS');
    for (const b of resolved) {
      const c = b.confidence || 0;
      for (const bucket of buckets) {
        if (c >= bucket.min && c < bucket.max) {
          bucket.total++;
          if (b.result === 'WIN') bucket.wins++;
          break;
        }
      }
    }
    return buckets.map(b => ({
      range: b.range,
      winRate: b.total > 0 ? parseFloat(((b.wins / b.total) * 100).toFixed(1)) : 0,
      trades: b.total,
    }));
  }, [bets]);

  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Confidence Level vs Win Rate</h3>
      {data.every(d => d.trades === 0) ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-dark-muted font-mono">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              labelStyle={{ color: '#6b7280' }}
              formatter={(v, name) => [`${v}%`, 'Win Rate']}
            />
            <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.winRate >= 50 ? '#00ff88' : '#ff3333'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── UP vs DOWN Pie Chart ───
function DirectionPie({ bets }) {
  const data = useMemo(() => {
    const resolved = (bets || []).filter(b => (b.result === 'WIN' || b.result === 'LOSS') && b.direction !== 'SKIP');
    const up = resolved.filter(b => b.direction === 'UP').length;
    const down = resolved.filter(b => b.direction === 'DOWN').length;
    return [
      { name: 'UP', value: up, color: '#00ff88' },
      { name: 'DOWN', value: down, color: '#ff3333' },
    ];
  }, [bets]);

  const total = data[0].value + data[1].value;

  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Direction Distribution</h3>
      {total === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-dark-muted font-mono">No data yet</div>
      ) : (
        <div className="flex items-center justify-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {data.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-xs font-mono text-dark-text">{d.name}</span>
                <span className="text-xs font-mono text-dark-muted">
                  {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Strategy Comparison Table ───
function StrategyTable({ bets }) {
  const stats = useMemo(() => {
    const resolved = (bets || []).filter(b => b.result === 'WIN' || b.result === 'LOSS');
    const up = resolved.filter(b => b.direction === 'UP');
    const down = resolved.filter(b => b.direction === 'DOWN');

    function calcStats(list) {
      const w = list.filter(b => b.result === 'WIN').length;
      const pnl = list.reduce((s, b) => s + (b.pnl || 0), 0);
      const avgConf = list.length > 0 ? list.reduce((s, b) => s + (b.confidence || 0), 0) / list.length : 0;
      return {
        trades: list.length,
        wins: w,
        losses: list.length - w,
        winRate: list.length > 0 ? (w / list.length) * 100 : 0,
        pnl,
        avgConfidence: avgConf,
      };
    }

    return [
      { strategy: 'LONG (UP)', ...calcStats(up) },
      { strategy: 'SHORT (DOWN)', ...calcStats(down) },
      { strategy: 'ALL TRADES', ...calcStats(resolved) },
    ];
  }, [bets]);

  return (
    <div className="terminal-card overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-border">
        <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Strategy Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full trade-table">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left">Strategy</th>
              <th className="text-right">Trades</th>
              <th className="text-right">Wins</th>
              <th className="text-right">Losses</th>
              <th className="text-right">Win Rate</th>
              <th className="text-right">Avg Conf</th>
              <th className="text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.strategy} className="border-b border-dark-border/30 hover:bg-dark-hover transition-colors">
                <td className="font-bold text-dark-text">{s.strategy}</td>
                <td className="text-right text-dark-muted">{s.trades}</td>
                <td className="text-right text-accent-green">{s.wins}</td>
                <td className="text-right text-accent-red">{s.losses}</td>
                <td className={`text-right font-bold ${s.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {fmt(s.winRate, 1)}%
                </td>
                <td className="text-right text-dark-muted">{fmt(s.avgConfidence, 1)}%</td>
                <td className={`text-right font-bold ${s.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {s.pnl >= 0 ? '+' : ''}${fmt(s.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsPage({ bets }) {
  return (
    <div className="space-y-4 animate-slide-in">
      <h2 className="text-lg font-bold text-dark-text">Analytics</h2>

      {/* Heatmap */}
      <HourlyHeatmap bets={bets} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfidenceChart bets={bets} />
        <DirectionPie bets={bets} />
      </div>

      {/* Strategy table */}
      <StrategyTable bets={bets} />
    </div>
  );
}
