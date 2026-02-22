import React from 'react';

function Card({ title, value, subtitle, color }) {
  return (
    <div className="bg-dark-card rounded-xl p-5 border border-dark-border">
      <p className="text-xs text-dark-muted uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color || 'text-dark-text'}`}>{value}</p>
      {subtitle && <p className="text-xs text-dark-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export default function DashboardCards({ dashboard }) {
  if (!dashboard) return null;

  const pnlColor = dashboard.dailyPnl >= 0 ? 'text-accent-green' : 'text-accent-red';
  const pnlSign = dashboard.dailyPnl >= 0 ? '+' : '';

  const statusColors = {
    active: 'text-accent-green',
    stopped: 'text-accent-red',
    idle: 'text-dark-muted',
    paused: 'text-accent-yellow',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        title="Bankroll"
        value={`$${dashboard.bankroll.toFixed(2)}`}
        subtitle={`Deposited: $${(dashboard.deposit || 0).toFixed(2)}`}
      />
      <Card
        title="Today's P&L"
        value={`${pnlSign}$${dashboard.dailyPnl.toFixed(2)}`}
        subtitle={`${pnlSign}${dashboard.dailyPnlPercent.toFixed(1)}%`}
        color={pnlColor}
      />
      <Card
        title="Win Rate"
        value={`${dashboard.winRate.toFixed(0)}%`}
        subtitle={`${dashboard.wins}W / ${dashboard.losses}L / ${dashboard.skips}S`}
      />
      <Card
        title="Agent Status"
        value={(dashboard.status || 'IDLE').toUpperCase()}
        subtitle={dashboard.stopReason ? dashboard.stopReason.replace(/_/g, ' ') : `${dashboard.totalBets} bets today`}
        color={statusColors[dashboard.status] || 'text-dark-muted'}
      />
    </div>
  );
}
