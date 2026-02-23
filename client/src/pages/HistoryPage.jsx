import React, { useState, useMemo } from 'react';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }
function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateTime(iso) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}
function formatPrice(val) {
  if (val == null) return '—';
  return `$${parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ROWS_PER_PAGE = 10;

export default function HistoryPage({ bets }) {
  const [filter, setFilter] = useState('ALL'); // ALL, WIN, LOSS, SKIP
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  // Filter bets
  const filtered = useMemo(() => {
    let list = bets || [];
    if (filter !== 'ALL') {
      list = list.filter(b => b.result === filter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter(b => new Date(b.round_time).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000; // end of day
      list = list.filter(b => new Date(b.round_time).getTime() < to);
    }
    return list;
  }, [bets, filter, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * ROWS_PER_PAGE, (currentPage + 1) * ROWS_PER_PAGE);

  // Stats for filtered set
  const resolved = filtered.filter(b => b.result === 'WIN' || b.result === 'LOSS');
  const totalPnl = resolved.reduce((sum, b) => sum + (b.pnl || 0), 0);
  const winCount = resolved.filter(b => b.result === 'WIN').length;
  const winRate = resolved.length > 0 ? (winCount / resolved.length) * 100 : 0;

  // Export CSV
  function exportCSV() {
    const headers = ['Timestamp', 'Direction', 'Confidence %', 'Bet Size', 'BTC Entry', 'BTC Exit', 'Result', 'P&L', 'Balance After'];
    const rows = filtered.map(b => [
      b.round_time,
      b.direction,
      fmt(b.confidence, 1),
      fmt(b.amount),
      b.btc_price_start || '',
      b.btc_price_end || '',
      b.result,
      fmt(b.pnl),
      fmt(b.bankroll_after),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-dark-text">Trade History</h2>
        <button onClick={exportCSV}
          className="px-4 py-1.5 text-xs font-bold text-accent-orange border border-accent-orange/30 rounded-lg hover:bg-accent-orange/10 transition font-mono">
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="terminal-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-dark-muted uppercase tracking-wider font-semibold">Filter:</span>
          {['ALL', 'WIN', 'LOSS', 'SKIP'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }}
              className={`px-3 py-1 text-[11px] font-bold font-mono rounded-md transition ${
                filter === f
                  ? f === 'WIN' ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                    : f === 'LOSS' ? 'bg-accent-red/15 text-accent-red border border-accent-red/30'
                    : f === 'SKIP' ? 'bg-dark-border text-dark-muted border border-dark-border'
                    : 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30'
                  : 'text-dark-muted border border-dark-border hover:bg-dark-hover'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-dark-muted uppercase tracking-wider font-semibold">Date:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-[11px] font-mono text-dark-text focus:outline-none focus:border-accent-orange" />
          <span className="text-dark-muted text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
            className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-[11px] font-mono text-dark-text focus:outline-none focus:border-accent-orange" />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="terminal-card p-3 text-center">
          <p className="text-[10px] text-dark-muted uppercase">Total Trades</p>
          <p className="text-lg font-bold font-mono text-dark-text">{filtered.length}</p>
        </div>
        <div className="terminal-card p-3 text-center">
          <p className="text-[10px] text-dark-muted uppercase">Win Rate</p>
          <p className={`text-lg font-bold font-mono ${winRate >= 50 ? 'neon-green' : 'neon-red'}`}>{fmt(winRate, 1)}%</p>
        </div>
        <div className="terminal-card p-3 text-center">
          <p className="text-[10px] text-dark-muted uppercase">Net P&L</p>
          <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? 'neon-green' : 'neon-red'}`}>
            {totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}
          </p>
        </div>
        <div className="terminal-card p-3 text-center">
          <p className="text-[10px] text-dark-muted uppercase">W / L</p>
          <p className="text-lg font-bold font-mono text-dark-text">
            <span className="text-accent-green">{winCount}</span>
            <span className="text-dark-muted"> / </span>
            <span className="text-accent-red">{resolved.length - winCount}</span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="terminal-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-dark-muted text-center py-12 font-mono">No trades match the current filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full trade-table">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left">Timestamp</th>
                    <th className="text-center">Direction</th>
                    <th className="text-right">Confidence</th>
                    <th className="text-right">Bet Size</th>
                    <th className="text-right">BTC Entry</th>
                    <th className="text-right">BTC Exit</th>
                    <th className="text-center">Result</th>
                    <th className="text-right">P&L</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(bet => {
                    const isWin = bet.result === 'WIN';
                    const isLoss = bet.result === 'LOSS';
                    const isPending = bet.result === 'PENDING';
                    const isSkip = bet.result === 'SKIP';
                    const rowBg = isWin ? 'bg-accent-green/[0.03]' : isLoss ? 'bg-accent-red/[0.03]' : isPending ? 'bg-accent-blue/[0.03]' : '';

                    return (
                      <tr key={bet.id} className={`border-b border-dark-border/30 hover:bg-dark-hover transition-colors ${rowBg}`}>
                        <td className="text-dark-muted">{formatDateTime(bet.round_time)}</td>
                        <td className="text-center">
                          {bet.direction === 'SKIP' ? (
                            <span className="text-dark-muted">—</span>
                          ) : (
                            <span className={bet.direction === 'UP' ? 'text-accent-green' : 'text-accent-red'}>
                              {bet.direction === 'UP' ? '\u25B2' : '\u25BC'} {bet.direction}
                            </span>
                          )}
                        </td>
                        <td className="text-right text-dark-muted">{bet.confidence != null ? `${fmt(bet.confidence, 1)}%` : '—'}</td>
                        <td className="text-right">{isSkip ? '—' : `$${fmt(bet.amount)}`}</td>
                        <td className="text-right text-dark-muted">{isSkip ? '—' : formatPrice(bet.btc_price_start)}</td>
                        <td className="text-right text-dark-muted">{isSkip || isPending ? '—' : formatPrice(bet.btc_price_end)}</td>
                        <td className="text-center">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isWin ? 'bg-accent-green/15 text-accent-green'
                            : isLoss ? 'bg-accent-red/15 text-accent-red'
                            : isPending ? 'bg-accent-blue/15 text-accent-blue'
                            : 'bg-dark-border text-dark-muted'
                          }`}>
                            {bet.result}
                          </span>
                        </td>
                        <td className={`text-right font-bold ${bet.pnl > 0 ? 'text-accent-green' : bet.pnl < 0 ? 'text-accent-red' : 'text-dark-muted'}`}>
                          {isSkip ? '—' : (bet.pnl >= 0 ? '+$' : '-$') + Math.abs(bet.pnl || 0).toFixed(2)}
                        </td>
                        <td className="text-right text-dark-muted">${fmt(bet.bankroll_after)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between">
              <span className="text-[11px] text-dark-muted font-mono">
                Showing {currentPage * ROWS_PER_PAGE + 1}–{Math.min((currentPage + 1) * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(0)} disabled={currentPage === 0}
                  className="px-2 py-1 text-[11px] text-dark-muted border border-dark-border rounded hover:bg-dark-hover transition disabled:opacity-30 font-mono">
                  &laquo;
                </button>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                  className="px-2 py-1 text-[11px] text-dark-muted border border-dark-border rounded hover:bg-dark-hover transition disabled:opacity-30 font-mono">
                  &lsaquo;
                </button>
                <span className="px-3 py-1 text-[11px] font-mono text-accent-orange">
                  {currentPage + 1} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
                  className="px-2 py-1 text-[11px] text-dark-muted border border-dark-border rounded hover:bg-dark-hover transition disabled:opacity-30 font-mono">
                  &rsaquo;
                </button>
                <button onClick={() => setPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}
                  className="px-2 py-1 text-[11px] text-dark-muted border border-dark-border rounded hover:bg-dark-hover transition disabled:opacity-30 font-mono">
                  &raquo;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
