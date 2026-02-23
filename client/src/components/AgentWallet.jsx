import React from 'react';

export default function AgentWallet({ account, dashboard }) {
  const {
    bankroll = 0,
    agentStatus = 'idle',
    totalDeposited = 0,
    pnl = 0,
  } = dashboard || {};

  const statusLabel = {
    active: 'Running',
    stopped: 'Stopped',
    idle: 'Idle',
    withdrawn: 'Withdrawn',
  }[agentStatus] || agentStatus;

  const statusColor = {
    active: 'text-accent-green',
    stopped: 'text-accent-red',
    idle: 'text-dark-muted',
    withdrawn: 'text-dark-muted',
  }[agentStatus] || 'text-dark-muted';

  const truncatedAddr = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : 'Not connected';

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-dark-muted uppercase tracking-wider mb-3">Agent Wallet</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-muted">Connected Address</span>
          <span className="text-xs font-mono text-dark-text">{truncatedAddr}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-muted">Agent Status</span>
          <div className="flex items-center gap-1.5">
            {agentStatus === 'active' && <span className="status-dot-active" />}
            <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>

        <div className="border-t border-dark-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Bankroll</span>
            <span className="text-sm font-bold tabular-nums">${Number(bankroll).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Total Deposited</span>
            <span className="text-xs tabular-nums text-dark-muted">${Number(totalDeposited).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Unrealized P&L</span>
            <span className={`text-xs font-medium tabular-nums ${pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {pnl >= 0 ? '+' : ''}${Number(pnl).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="border-t border-dark-border pt-3">
          <p className="text-[10px] text-dark-muted leading-relaxed">
            Funds are managed client-side in demo mode. Connect MetaMask on Polygon Amoy for testnet integration.
          </p>
        </div>
      </div>
    </div>
  );
}
