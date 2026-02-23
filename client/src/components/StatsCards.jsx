import React from 'react';

function Card({ label, children }) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <p className="text-xs font-medium text-dark-muted uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}

export default function StatsCards({ dashboard }) {
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
  } = dashboard || {};

  const pnlColor = pnl >= 0 ? 'text-accent-green' : 'text-accent-red';
  const pnlSign = pnl >= 0 ? '+' : '';

  const statusConfig = {
    active: { icon: '🟢', label: 'ACTIVE', color: 'text-accent-green' },
    stopped: { icon: '🔴', label: 'STOPPED', color: 'text-accent-red' },
    paused: { icon: '⏸️', label: 'PAUSED', color: 'text-accent-yellow' },
    idle: { icon: '⚪', label: 'IDLE', color: 'text-dark-muted' },
    withdrawn: { icon: '🔴', label: 'WITHDRAWN', color: 'text-dark-muted' },
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
      <Card label="Bankroll">
        <p className="text-2xl font-bold tabular-nums">${bankroll.toFixed(2)}</p>
      </Card>

      <Card label="Today's P&L">
        <p className={`text-2xl font-bold tabular-nums ${pnlColor}`}>
          {pnlSign}${Math.abs(pnl).toFixed(2)}
        </p>
        <p className={`text-xs mt-0.5 ${pnlColor}`}>
          {pnlSign}{pnlPercent.toFixed(2)}%
        </p>
      </Card>

      <Card label="Win Rate">
        <p className="text-2xl font-bold tabular-nums">{winRate.toFixed(0)}%</p>
        <p className="text-xs text-dark-muted mt-0.5">
          {wins}W / {losses}L of {totalBets} bets
        </p>
      </Card>

      <Card label="Agent Status">
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.icon}</span>
          <span className={`text-lg font-bold ${status.color}`}>{status.label}</span>
        </div>
        {stopReason && (
          <p className="text-xs text-dark-muted mt-1">
            {reasonLabels[stopReason] || stopReason}
          </p>
        )}
      </Card>
    </div>
  );
}
