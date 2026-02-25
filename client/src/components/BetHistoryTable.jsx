import React, { useState, useEffect } from 'react';

export default function BetHistoryTable({ bets }) {
  if (!bets || bets.length === 0) {
    return (
      <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
        <h3 className="text-lg font-semibold mb-4">Bet History</h3>
        <p className="text-dark-muted text-sm text-center py-8">
          No bets yet — start the agent to begin trading!
        </p>
      </div>
    );
  }

  const rowColors = {
    WIN: 'bg-green-500/5 hover:bg-green-500/10',
    LOSS: 'bg-red-500/5 hover:bg-red-500/10',
    SKIP: 'bg-dark-bg hover:bg-dark-border/30',
    PENDING: 'bg-yellow-500/5 hover:bg-yellow-500/10',
  };

  const resultColors = {
    WIN: 'text-accent-green',
    LOSS: 'text-accent-red',
    SKIP: 'text-dark-muted',
    PENDING: 'text-accent-yellow',
  };

  const dirColors = {
    UP: 'text-accent-green',
    DOWN: 'text-accent-red',
    SKIP: 'text-dark-muted',
  };

  const modeColors = {
    mock: 'text-accent-green',
    paper: 'text-[#ffd740]',
    live: 'text-accent-red',
  };

  // Fetch execution log for extra columns (paper/live)
  const [execLog, setExecLog] = useState([]);
  useEffect(() => {
    fetch('/api/execution-mode')
      .then(r => r.json())
      .then(d => {
        if (d.mode !== 'mock') {
          // Fetch recent execution logs for enrichment
          fetch('/api/dashboard/stats')
            .then(r2 => r2.json())
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Check mode from first exec log or default
  const [mode, setMode] = useState('mock');
  useEffect(() => {
    fetch('/api/execution-mode')
      .then(r => r.json())
      .then(d => setMode(d.mode || 'mock'))
      .catch(() => {});
  }, []);

  const showExtraColumns = mode === 'paper' || mode === 'live';

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Bet History</h3>
        {mode !== 'mock' && (
          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border ${
            mode === 'paper' ? 'text-[#ffd740] border-[#ffd740]/30 bg-[#ffd740]/10' : 'text-accent-red border-accent-red/30 bg-accent-red/10'
          }`}>
            {mode.toUpperCase()} MODE
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-muted text-xs uppercase tracking-wider border-b border-dark-border">
              <th className="pb-3 text-left">Time</th>
              {showExtraColumns && <th className="pb-3 text-center">Mode</th>}
              <th className="pb-3 text-left">Direction</th>
              <th className="pb-3 text-right">Confidence</th>
              <th className="pb-3 text-right">Amount</th>
              <th className="pb-3 text-right">BTC Price</th>
              {showExtraColumns && <th className="pb-3 text-right">Mkt Price</th>}
              {showExtraColumns && <th className="pb-3 text-right">Spread</th>}
              <th className="pb-3 text-center">Result</th>
              <th className="pb-3 text-right">P&L</th>
              <th className="pb-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => (
              <tr key={bet.id} className={`${rowColors[bet.result] || ''} border-b border-dark-border/50`}>
                <td className="py-2.5 text-dark-muted">
                  {new Date(bet.round_time).toLocaleTimeString()}
                </td>
                {showExtraColumns && (
                  <td className="py-2.5 text-center">
                    <span className={`text-[10px] font-bold font-mono ${modeColors[bet.execution_mode || mode]}`}>
                      {(bet.execution_mode || mode).toUpperCase()}
                    </span>
                  </td>
                )}
                <td className={`py-2.5 font-medium ${dirColors[bet.direction] || ''}`}>
                  {bet.direction === 'UP' ? '▲ UP' : bet.direction === 'DOWN' ? '▼ DOWN' : '— SKIP'}
                </td>
                <td className="py-2.5 text-right">
                  {bet.confidence?.toFixed(0)}%
                </td>
                <td className="py-2.5 text-right">
                  {bet.amount > 0 ? `$${bet.amount.toFixed(2)}` : '—'}
                </td>
                <td className="py-2.5 text-right font-mono text-xs">
                  ${bet.btc_price_start?.toFixed(0)}
                  {bet.btc_price_end && (
                    <span className="text-dark-muted"> → ${bet.btc_price_end.toFixed(0)}</span>
                  )}
                </td>
                {showExtraColumns && (
                  <td className="py-2.5 text-right font-mono text-xs text-dark-muted">
                    {bet.polymarket_midpoint ? `$${Number(bet.polymarket_midpoint).toFixed(4)}` : '—'}
                  </td>
                )}
                {showExtraColumns && (
                  <td className="py-2.5 text-right font-mono text-xs text-dark-muted">
                    {bet.polymarket_spread ? Number(bet.polymarket_spread).toFixed(4) : '—'}
                  </td>
                )}
                <td className={`py-2.5 text-center font-medium ${resultColors[bet.result] || ''}`}>
                  {bet.result}
                </td>
                <td className={`py-2.5 text-right ${bet.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {bet.pnl !== 0 ? `${bet.pnl >= 0 ? '+' : ''}$${bet.pnl.toFixed(2)}` : '—'}
                </td>
                <td className="py-2.5 text-right">
                  {bet.bankroll_after ? `$${bet.bankroll_after.toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
