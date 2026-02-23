import React, { useRef, useEffect, useState } from 'react';

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatPrice(val) {
  if (val == null) return '—';
  return `$${parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPnl(val) {
  if (val == null) return '—';
  const sign = val > 0 ? '+' : val < 0 ? '' : '';
  return `${sign}$${Number(val).toFixed(2)}`;
}

export default function BetHistory({ bets }) {
  // Track which bet IDs are "new" for fade-in animation
  const knownIds = useRef(new Set());
  const [newIds, setNewIds] = useState(new Set());

  useEffect(() => {
    if (!bets || bets.length === 0) return;
    const incoming = new Set();
    for (const bet of bets) {
      if (!knownIds.current.has(bet.id)) {
        incoming.add(bet.id);
      }
    }
    // On first load, mark all as known (no animation)
    if (knownIds.current.size === 0) {
      for (const bet of bets) knownIds.current.add(bet.id);
      return;
    }
    if (incoming.size > 0) {
      setNewIds(incoming);
      for (const id of incoming) knownIds.current.add(id);
      // Clear animation class after it finishes
      const timer = setTimeout(() => setNewIds(new Set()), 400);
      return () => clearTimeout(timer);
    }
  }, [bets]);

  if (!bets || bets.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-dark-muted uppercase tracking-wider mb-4">Bet History</h3>
        <p className="text-sm text-dark-muted text-center py-8">No bets yet. Start the agent to begin trading.</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-dark-muted uppercase tracking-wider">Bet History</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border text-xs text-dark-muted uppercase tracking-wider">
              <th className="text-left px-4 py-2.5 font-medium">Time</th>
              <th className="text-left px-4 py-2.5 font-medium">Direction</th>
              <th className="text-right px-4 py-2.5 font-medium">Confidence</th>
              <th className="text-right px-4 py-2.5 font-medium">Amount</th>
              <th className="text-right px-4 py-2.5 font-medium">BTC Entry</th>
              <th className="text-right px-4 py-2.5 font-medium">BTC Exit</th>
              <th className="text-center px-4 py-2.5 font-medium">Result</th>
              <th className="text-right px-4 py-2.5 font-medium">P&L</th>
              <th className="text-right px-4 py-2.5 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => {
              const isWin = bet.result === 'WIN';
              const isLoss = bet.result === 'LOSS';
              const isSkip = bet.result === 'SKIP';
              const isPending = bet.result === 'PENDING';
              const isNew = newIds.has(bet.id);

              const rowBg = isWin
                ? 'bg-accent-green/[0.04] hover:bg-accent-green/10'
                : isLoss
                ? 'bg-accent-red/[0.04] hover:bg-accent-red/10'
                : isPending
                ? 'bg-accent-blue/[0.03] hover:bg-accent-blue/[0.07]'
                : 'hover:bg-[#1e2130]';

              const dirIcon = bet.direction === 'UP' ? '🟢'
                : bet.direction === 'DOWN' ? '🔴'
                : '⚪';

              const resultBadge = isWin
                ? 'bg-accent-green/15 text-accent-green'
                : isLoss
                ? 'bg-accent-red/15 text-accent-red'
                : isPending
                ? 'bg-accent-blue/15 text-accent-blue'
                : 'bg-dark-border text-dark-muted';

              const pnlColor = bet.pnl > 0 ? 'text-accent-green' : bet.pnl < 0 ? 'text-accent-red' : 'text-dark-muted';

              return (
                <tr
                  key={bet.id}
                  className={`border-b border-dark-border/50 transition-colors duration-150 ${rowBg} ${isNew ? 'bet-row-enter' : ''}`}
                >
                  <td className="px-4 py-2.5 text-dark-muted tabular-nums whitespace-nowrap">
                    {formatTime(bet.round_time)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {dirIcon} {bet.direction}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-dark-muted">
                    {bet.confidence != null ? `${Number(bet.confidence).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {isSkip ? '—' : `$${Number(bet.amount || 0).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-dark-muted">
                    {isSkip ? '—' : formatPrice(bet.btc_price_start)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-dark-muted">
                    {isSkip || isPending ? '—' : formatPrice(bet.btc_price_end)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${resultBadge}`}>
                      {bet.result}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${pnlColor}`}>
                    {isSkip ? '—' : formatPnl(bet.pnl)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    ${Number(bet.bankroll_after || 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
