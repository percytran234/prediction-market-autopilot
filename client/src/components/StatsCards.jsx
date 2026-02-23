import React from 'react';

function Card({ label, children, glow }) {
  return (
    <div className={`bg-dark-card border border-dark-border rounded-xl p-4 relative overflow-hidden ${glow ? 'stats-glow' : ''}`}>
      <p className="text-xs font-medium text-dark-muted uppercase tracking-wider mb-2 relative z-10">{label}</p>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Sparkline({ bets }) {
  const resolved = (bets || [])
    .filter(b => b.result === 'WIN' || b.result === 'LOSS')
    .slice(0, 10)
    .reverse();
  if (resolved.length < 2) return null;

  let cumulative = 0;
  const points = resolved.map(b => {
    cumulative += (b.pnl || 0);
    return cumulative;
  });

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100, h = 28, pad = 2;

  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const pathD = coords.map((c, i) => (i === 0 ? `M${c}` : `L${c}`)).join(' ');
  const isPositive = points[points.length - 1] >= 0;
  const stroke = isPositive ? '#22c55e' : '#ef4444';
  const fill = isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
  const areaD = `${pathD} L${pad + (w - pad * 2)},${h} L${pad},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 mt-1.5" preserveAspectRatio="none">
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WinRateBar({ winRate }) {
  return (
    <div className="w-full h-1.5 bg-dark-border rounded-full mt-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, winRate))}%`,
          background: winRate >= 50
            ? `linear-gradient(90deg, #22c55e, #4ade80)`
            : `linear-gradient(90deg, #ef4444, #f87171)`,
        }}
      />
    </div>
  );
}

export default function StatsCards({ dashboard, bets }) {
  const {
    bankroll = 0,
    pnl = 0,
    pnlPercent = 0,
    winRate = 0,
    totalBets = 0,
    wins = 0,
    losses = 0,
    agentStatus = 'idle',
    stopReason,
    activeBets = 0,
    successRate = 0,
  } = dashboard || {};

  const pnlColor = pnl >= 0 ? 'text-accent-green' : 'text-accent-red';
  const pnlSign = pnl >= 0 ? '+' : '';

  const statusConfig = {
    active: { label: 'ACTIVE', color: 'text-accent-green', dot: true },
    stopped: { label: 'STOPPED', color: 'text-accent-red', icon: '🔴' },
    paused: { label: 'PAUSED', color: 'text-accent-yellow', icon: '⏸️' },
    idle: { label: 'IDLE', color: 'text-dark-muted', icon: '⚪' },
    withdrawn: { label: 'WITHDRAWN', color: 'text-dark-muted', icon: '🔴' },
  };
  const status = statusConfig[agentStatus] || statusConfig.idle;

  const reasonLabels = {
    DAILY_LOSS_LIMIT: 'Hit -10% daily loss limit',
    DAILY_PROFIT_TARGET: 'Hit +5% profit target',
    CONSECUTIVE_LOSSES: '4 consecutive losses — paused 1hr',
    USER_STOPPED: 'Stopped by user',
    WITHDRAWN: 'Funds withdrawn',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card label="Bankroll" glow>
        <p className="text-2xl font-bold tabular-nums stat-value">
          ${Number(bankroll).toFixed(2)}
        </p>
      </Card>

      <Card label="Total P&L" glow>
        <p className={`text-2xl font-bold tabular-nums stat-value ${pnlColor}`}>
          {pnlSign}${Math.abs(pnl).toFixed(2)}
        </p>
        <p className={`text-xs mt-0.5 stat-value ${pnlColor}`}>
          {pnlSign}{Number(pnlPercent).toFixed(2)}%
        </p>
        <Sparkline bets={bets} />
      </Card>

      <Card label="Win Rate">
        <p className="text-2xl font-bold tabular-nums">{Number(winRate).toFixed(0)}%</p>
        <p className="text-xs text-dark-muted mt-0.5">
          {wins}W / {losses}L of {totalBets} bets
        </p>
        <WinRateBar winRate={winRate} />
      </Card>

      <Card label="Agent Status">
        <div className="flex items-center gap-2">
          {status.dot ? (
            <span className="status-dot-active" />
          ) : (
            <span className="text-lg">{status.icon}</span>
          )}
          <span className={`text-lg font-bold stat-value ${status.color}`}>{status.label}</span>
        </div>
        {stopReason && (
          <p className="text-xs text-dark-muted mt-1">
            {reasonLabels[stopReason] || stopReason}
          </p>
        )}
        {activeBets > 0 && (
          <p className="text-xs text-accent-blue mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse inline-block" />
            {activeBets} bet{activeBets !== 1 ? 's' : ''} pending
          </p>
        )}
      </Card>
    </div>
  );
}
