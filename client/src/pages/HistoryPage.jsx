import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
function formatPrice(val) {
  if (val == null) return '—';
  return '$' + parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function getDateStr(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

const ROWS_PER_PAGE = 10;
const DAILY_HISTORY_KEY = 'prediction_agent_daily_history';

// ─── Trade Detail Modal ───
function TradeModal({ bet, onClose }) {
  if (!bet) return null;
  const isWin = bet.result === 'WIN';
  const isLoss = bet.result === 'LOSS';
  const pnlColor = isWin ? 'neon-green' : isLoss ? 'neon-red' : 'text-dark-muted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="terminal-card w-full max-w-lg animate-modal-content border border-dark-border">
        {/* Header */}
        <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold font-mono ${pnlColor}`}>
              {isWin ? '✓ WIN' : isLoss ? '✗ LOSS' : bet.result}
            </span>
            {bet.result !== 'SKIP' && (
              <span className={`text-sm font-bold font-mono ${pnlColor}`}>{(bet.pnl||0)>=0?'+$':'-$'}{Math.abs(bet.pnl||0).toFixed(2)}</span>
            )}
          </div>
          <button onClick={onClose} className="text-dark-muted hover:text-dark-text text-xl leading-none transition">✕</button>
        </div>

        {/* Details grid */}
        <div className="p-5 grid grid-cols-2 gap-4">
          {[
            { label: 'Timestamp', value: formatDateTime(bet.round_time) },
            { label: 'Direction', value: bet.direction ? (
              <span className={bet.direction==='UP'?'neon-green':'text-accent-red'}>{bet.direction==='UP'?'▲':'▼'} {bet.direction}</span>
            ) : '—' },
            { label: 'Confidence', value: bet.confidence != null ? `${fmt(bet.confidence,1)}%` : '—' },
            { label: 'Bet Size', value: bet.amount ? `$${fmt(bet.amount)}` : '—' },
            { label: 'BTC Entry', value: formatPrice(bet.btc_price_start) },
            { label: 'BTC Exit', value: formatPrice(bet.btc_price_end) },
            { label: 'Price Move', value: bet.btc_price_start && bet.btc_price_end ? (() => {
              const move = bet.btc_price_end - bet.btc_price_start;
              return <span className={move>=0?'text-accent-green':'text-accent-red'}>{move>=0?'+':''}{move.toFixed(2)}</span>;
            })() : '—' },
            { label: 'Balance After', value: bet.bankroll_after != null ? `$${fmt(bet.bankroll_after)}` : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-dark-muted uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm font-mono text-dark-text">{value}</p>
            </div>
          ))}
        </div>

        {/* Reasoning */}
        {bet.reasoning && (
          <div className="px-5 pb-5">
            <p className="text-[10px] text-dark-muted uppercase tracking-wider mb-1">Signal Reasoning</p>
            <p className="text-xs font-mono text-dark-text/80 leading-relaxed bg-dark-bg rounded-lg p-3 border border-dark-border">{bet.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cumulative P&L tooltip ───
function PnlTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="terminal-card px-3 py-2 text-xs shadow-lg">
      <p className="text-dark-muted mb-0.5">Trade #{d.idx}</p>
      <p className={`font-bold font-mono ${d.cumPnl>=0?'text-accent-green':'text-accent-red'}`}>
        {d.cumPnl>=0?'+$':'-$'}{Math.abs(d.cumPnl).toFixed(2)}
      </p>
    </div>
  );
}

export default function HistoryPage({ bets, engine }) {
  const [filter, setFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [selectedBet, setSelectedBet] = useState(null);

  // Combine current session bets with daily history
  const allBets = useMemo(() => {
    const current = bets || [];
    const currentIds = new Set(current.map(b => b.id));
    let historical = [];
    try {
      const raw = localStorage.getItem(DAILY_HISTORY_KEY);
      if (raw) {
        const days = JSON.parse(raw);
        historical = days.flatMap(d => (d.trades || []).filter(b => !currentIds.has(b.id)));
      }
    } catch {}
    const combined = [...current, ...historical];
    combined.sort((a, b) => new Date(b.round_time).getTime() - new Date(a.round_time).getTime());
    return combined;
  }, [bets]);

  const filtered = useMemo(() => {
    let list = allBets;
    if (filter !== 'ALL') list = list.filter(b => b.result === filter);
    if (dateFrom) { const from = new Date(dateFrom).getTime(); list = list.filter(b => new Date(b.round_time).getTime() >= from); }
    if (dateTo)   { const to = new Date(dateTo).getTime()+86400000; list = list.filter(b => new Date(b.round_time).getTime() < to); }
    return list;
  }, [allBets, filter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * ROWS_PER_PAGE, (currentPage + 1) * ROWS_PER_PAGE);

  const resolved = useMemo(() => filtered.filter(b => b.result==='WIN'||b.result==='LOSS'), [filtered]);
  const totalPnl = resolved.reduce((s, b) => s + (b.pnl||0), 0);
  const winCount = resolved.filter(b => b.result==='WIN').length;
  const winRate = resolved.length > 0 ? (winCount / resolved.length) * 100 : 0;

  // Daily summaries for date headers
  const dailySummaries = useMemo(() => {
    const sums = {};
    filtered.forEach(bet => {
      const date = getDateStr(bet.round_time);
      if (!date) return;
      if (!sums[date]) sums[date] = { trades: 0, wins: 0, pnl: 0 };
      if (bet.result === 'WIN' || bet.result === 'LOSS') {
        sums[date].trades++;
        if (bet.result === 'WIN') sums[date].wins++;
        sums[date].pnl += (bet.pnl || 0);
      }
    });
    return sums;
  }, [filtered]);

  // Cumulative P&L chart data (all time)
  const cumPnlData = useMemo(() => {
    const chron = [...resolved].reverse();
    let cum = 0;
    return chron.map((b, i) => { cum += (b.pnl||0); return { idx: i+1, cumPnl: cum }; });
  }, [resolved]);

  function exportCSV() {
    const headers = ['Timestamp','Direction','Confidence %','Bet Size','BTC Entry','BTC Exit','Result','P&L','Balance After'];
    const rows = filtered.map(b => [
      b.round_time, b.direction, fmt(b.confidence,1), fmt(b.amount),
      b.btc_price_start||'', b.btc_price_end||'', b.result, fmt(b.pnl), fmt(b.bankroll_after),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `trades_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {selectedBet && <TradeModal bet={selectedBet} onClose={() => setSelectedBet(null)}/>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-dark-text">Trade History</h2>
        <button onClick={exportCSV}
          className="px-4 py-1.5 text-xs font-bold text-accent-orange border border-accent-orange/30 rounded-lg hover:bg-accent-orange/10 transition font-mono">
          Export CSV
        </button>
      </div>

      {/* Cumulative P&L Chart */}
      {cumPnlData.length >= 2 && (
        <div className="terminal-card p-4">
          <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Cumulative P&L</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={cumPnlData} margin={{top:4,right:4,bottom:0,left:4}}>
              <defs>
                <linearGradient id="pnlLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff6600"/>
                  <stop offset="100%" stopColor={totalPnl>=0?'#00ff88':'#ff3333'}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="idx" tick={{fontSize:9,fill:'#6b7280',fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:'#6b7280',fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}`} width={46}/>
              <Tooltip content={<PnlTooltip/>}/>
              <Line type="monotone" dataKey="cumPnl" stroke={totalPnl>=0?'#00ff88':'#ff3333'} strokeWidth={2} dot={false} activeDot={{r:3,fill:totalPnl>=0?'#00ff88':'#ff3333',stroke:'#111118',strokeWidth:2}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="terminal-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-dark-muted uppercase tracking-wider font-semibold">Filter:</span>
          {['ALL','WIN','LOSS','SKIP'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }}
              className={`px-3 py-1 text-[11px] font-bold font-mono rounded-md transition ${
                filter===f
                  ? f==='WIN'  ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                  : f==='LOSS' ? 'bg-accent-red/15 text-accent-red border border-accent-red/30'
                  : f==='SKIP' ? 'bg-dark-border text-dark-muted border border-dark-border'
                  : 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30'
                  : 'text-dark-muted border border-dark-border hover:bg-dark-hover'
              }`}>{f}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-dark-muted uppercase tracking-wider font-semibold">Date:</span>
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(0);}}
            className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-[11px] font-mono text-dark-text focus:outline-none focus:border-accent-orange"/>
          <span className="text-dark-muted text-xs">to</span>
          <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(0);}}
            className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-[11px] font-mono text-dark-text focus:outline-none focus:border-accent-orange"/>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total Trades', value: filtered.length, color:'text-dark-text' },
          { label:'Win Rate', value:`${fmt(winRate,1)}%`, color:winRate>=50?'neon-green':'neon-red' },
          { label:'Net P&L', value:`${totalPnl>=0?'+':''}$${fmt(totalPnl)}`, color:totalPnl>=0?'neon-green':'neon-red' },
          { label:'W / L', value:(<><span className="text-accent-green">{winCount}</span><span className="text-dark-muted"> / </span><span className="text-accent-red">{resolved.length-winCount}</span></>), color:'' },
        ].map(item => (
          <div key={item.label} className="terminal-card p-3 text-center">
            <p className="text-[10px] text-dark-muted uppercase">{item.label}</p>
            <p className={`text-lg font-bold font-mono ${item.color}`}>{item.value}</p>
          </div>
        ))}
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
                    <th className="text-center">Dir</th>
                    <th className="text-right">Conf</th>
                    <th className="text-right">Size</th>
                    <th className="text-right">Entry</th>
                    <th className="text-right">Exit</th>
                    <th className="text-center">Result</th>
                    <th className="text-right">P&L</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((bet, idx) => {
                    const betDate = getDateStr(bet.round_time);
                    const prevBet = idx > 0 ? paginated[idx - 1] : null;
                    const prevDate = prevBet ? getDateStr(prevBet.round_time) : null;
                    const showHeader = !prevDate || betDate !== prevDate;
                    const daySummary = dailySummaries[betDate];
                    const dayWinRate = daySummary && daySummary.trades > 0 ? (daySummary.wins / daySummary.trades) * 100 : 0;

                    const isWin = bet.result==='WIN', isLoss = bet.result==='LOSS';
                    const isPending = bet.result==='PENDING', isSkip = bet.result==='SKIP';
                    const rowBg = isWin ? 'bg-accent-green/[0.04]' : isLoss ? 'bg-accent-red/[0.04]' : '';
                    return (
                      <React.Fragment key={bet.id}>
                        {showHeader && (
                          <tr className="bg-dark-bg/80 border-b border-accent-orange/20">
                            <td colSpan={9} className="px-4 py-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-accent-orange">&#9632;</span>
                                  <span className="text-xs font-bold text-dark-text font-mono">
                                    {betDate === today ? `Today (${betDate})` : betDate}
                                  </span>
                                </div>
                                {daySummary && (
                                  <div className="flex items-center gap-4 text-[10px] font-mono">
                                    <span className="text-dark-muted">{daySummary.trades} trades</span>
                                    <span className={daySummary.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                                      {daySummary.pnl >= 0 ? '+' : ''}${daySummary.pnl.toFixed(2)}
                                    </span>
                                    <span className="text-dark-muted">WR: {dayWinRate.toFixed(1)}%</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`border-b border-dark-border/30 hover:bg-dark-hover transition-colors cursor-pointer ${rowBg}`}
                          onClick={() => setSelectedBet(bet)}>
                          <td className="text-dark-muted">{formatDateTime(bet.round_time)}</td>
                          <td className="text-center">
                            {bet.direction&&bet.direction!=='SKIP'
                              ? <span className={bet.direction==='UP'?'text-accent-green':'text-accent-red'}>{bet.direction==='UP'?'▲':'▼'} {bet.direction}</span>
                              : <span className="text-dark-muted">—</span>}
                          </td>
                          <td className="text-right text-dark-muted">{bet.confidence!=null?`${fmt(bet.confidence,1)}%`:'—'}</td>
                          <td className="text-right">{isSkip?'—':`$${fmt(bet.amount)}`}</td>
                          <td className="text-right text-dark-muted">{isSkip?'—':formatPrice(bet.btc_price_start)}</td>
                          <td className="text-right text-dark-muted">{isSkip||isPending?'—':formatPrice(bet.btc_price_end)}</td>
                          <td className="text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isWin?'bg-accent-green/15 text-accent-green'
                              :isLoss?'bg-accent-red/15 text-accent-red'
                              :isPending?'bg-accent-blue/15 text-accent-blue'
                              :'bg-dark-border text-dark-muted'}`}>{bet.result}</span>
                          </td>
                          <td className={`text-right font-bold ${(bet.pnl||0)>0?'text-accent-green':(bet.pnl||0)<0?'text-accent-red':'text-dark-muted'}`}>
                            {isSkip?'—':`${(bet.pnl||0)>=0?'+$':'-$'}${Math.abs(bet.pnl||0).toFixed(2)}`}
                          </td>
                          <td className="text-right text-dark-muted">${fmt(bet.bankroll_after)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between">
              <span className="text-[11px] text-dark-muted font-mono">
                {currentPage*ROWS_PER_PAGE+1}–{Math.min((currentPage+1)*ROWS_PER_PAGE,filtered.length)} of {filtered.length}
                <span className="ml-2 text-dark-muted/50">• click row for details</span>
              </span>
              <div className="flex items-center gap-1">
                {[['«',()=>setPage(0)],['‹',()=>setPage(p=>Math.max(0,p-1))]].map(([lbl,fn],i)=>(
                  <button key={i} onClick={fn} disabled={currentPage===0}
                    className="px-2 py-1 text-[11px] text-dark-muted border border-dark-border rounded hover:bg-dark-hover transition disabled:opacity-30 font-mono">{lbl}</button>
                ))}
                <span className="px-3 py-1 text-[11px] font-mono text-accent-orange">{currentPage+1}/{totalPages}</span>
                {[['›',()=>setPage(p=>Math.min(totalPages-1,p+1))],['»',()=>setPage(totalPages-1)]].map(([lbl,fn],i)=>(
                  <button key={i} onClick={fn} disabled={currentPage>=totalPages-1}
                    className="px-2 py-1 text-[11px] text-dark-muted border border-dark-border rounded hover:bg-dark-hover transition disabled:opacity-30 font-mono">{lbl}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
