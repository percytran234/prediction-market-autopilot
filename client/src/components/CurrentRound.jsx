import React from 'react';

export default function CurrentRound({ bets }) {
  const pendingBet = bets?.find(b => b.result === 'PENDING');
  if (!pendingBet) return null;

  const dirIcon = pendingBet.direction === 'UP' ? '🟢' : '🔴';

  return (
    <div className="bg-dark-card border border-accent-blue/30 rounded-xl p-4 relative overflow-hidden">
      {/* Animated border glow */}
      <div className="absolute inset-0 border border-accent-blue/20 rounded-xl animate-pulse-glow pointer-events-none" />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
        <span className="text-sm font-medium text-accent-blue">Round in progress...</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-dark-muted mb-1">Direction</p>
          <p className="font-semibold">{dirIcon} {pendingBet.direction}</p>
        </div>
        <div>
          <p className="text-xs text-dark-muted mb-1">Amount</p>
          <p className="font-semibold">${Number(pendingBet.amount || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-dark-muted mb-1">Confidence</p>
          <p className="font-semibold">{Number(pendingBet.confidence || 0).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-dark-muted mb-1">BTC Entry</p>
          <p className="font-semibold tabular-nums">${Number(pendingBet.btc_price_start || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
}
