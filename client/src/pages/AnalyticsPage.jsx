import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }

// ─── Best Hour highlight card ───
function BestHourCard({ bets }) {
  const best = useMemo(() => {
    const hours = Array.from({length:24}, (_,i) => ({hour:i, wins:0, total:0}));
    const resolved = (bets||[]).filter(b=>b.result==='WIN'||b.result==='LOSS');
    for (const b of resolved) { const h=new Date(b.round_time).getHours(); hours[h].total++; if(b.result==='WIN') hours[h].wins++; }
    const withData = hours.filter(h=>h.total>=3);
    if (!withData.length) return null;
    return withData.reduce((a,b) => (b.wins/b.total > a.wins/a.total ? b : a));
  }, [bets]);

  return (
    <div className="terminal-card p-4 border border-accent-orange/20">
      <p className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider mb-2">Best Hour to Trade</p>
      {best ? (
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold font-mono neon-orange">{String(best.hour).padStart(2,'0')}:00</span>
          <div>
            <p className="text-sm font-bold neon-green">{((best.wins/best.total)*100).toFixed(0)}% win rate</p>
            <p className="text-[11px] text-dark-muted font-mono">{best.wins}W / {best.total-best.wins}L ({best.total} trades)</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-dark-muted font-mono">Need 3+ trades per hour for analysis</p>
      )}
    </div>
  );
}

// ─── Hourly Heatmap ───
function HourlyHeatmap({ bets }) {
  const hourData = useMemo(() => {
    const hours = Array.from({length:24}, (_,i) => ({hour:i, wins:0, total:0}));
    const resolved = (bets||[]).filter(b=>b.result==='WIN'||b.result==='LOSS');
    for (const b of resolved) { const h=new Date(b.round_time).getHours(); hours[h].total++; if(b.result==='WIN') hours[h].wins++; }
    return hours;
  }, [bets]);

  function getCellColor(wins, total) {
    if (!total) return '#1e1e2e';
    const r = wins/total;
    return r>=0.7?'#00ff88':r>=0.5?'#22c55e':r>=0.4?'#ff6600':'#ff3333';
  }

  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Win Rate by Hour of Day</h3>
      <div className="grid grid-cols-12 gap-1">
        {hourData.map(h => {
          const rate = h.total>0 ? ((h.wins/h.total)*100).toFixed(0) : '—';
          const opacity = h.total===0?0.3:Math.min(1, 0.4+h.total*0.15);
          return (
            <div key={h.hour} className="flex flex-col items-center gap-1">
              <div className="heatmap-cell w-full aspect-square flex items-center justify-center relative group cursor-default"
                style={{backgroundColor:getCellColor(h.wins,h.total), opacity}}>
                <span className="text-[8px] font-mono font-bold text-dark-bg">{h.total>0?rate:''}</span>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border rounded px-2 py-1 text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                  <span className="text-dark-muted">{h.hour}:00</span>
                  <span className="text-dark-text ml-1">{h.wins}W/{h.total-h.wins}L</span>
                </div>
              </div>
              <span className="text-[8px] text-dark-muted font-mono">{String(h.hour).padStart(2,'0')}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 justify-center">
        {[['#ff3333','<40%'],['#ff6600','40-50%'],['#22c55e','50-70%'],['#00ff88','>70%']].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{backgroundColor:c,opacity:0.7}}/>
            <span className="text-[9px] text-dark-muted font-mono">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confidence vs Win Rate ───
function ConfidenceChart({ bets }) {
  const data = useMemo(() => {
    const buckets = [
      {range:'60-65%',min:60,max:65,wins:0,total:0},
      {range:'65-70%',min:65,max:70,wins:0,total:0},
      {range:'70-75%',min:70,max:75,wins:0,total:0},
      {range:'75-80%',min:75,max:80,wins:0,total:0},
      {range:'80-85%',min:80,max:85,wins:0,total:0},
      {range:'85-90%',min:85,max:90,wins:0,total:0},
      {range:'90%+',  min:90,max:101,wins:0,total:0},
    ];
    for (const b of (bets||[]).filter(b=>b.result==='WIN'||b.result==='LOSS')) {
      const c = b.confidence||0;
      for (const bkt of buckets) { if(c>=bkt.min&&c<bkt.max) { bkt.total++; if(b.result==='WIN') bkt.wins++; break; } }
    }
    return buckets.map(b=>({range:b.range, winRate:b.total>0?parseFloat(((b.wins/b.total)*100).toFixed(1)):0, trades:b.total}));
  }, [bets]);

  const empty = data.every(d=>d.trades===0);
  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Confidence vs Win Rate</h3>
      {empty ? <div className="h-[220px] flex items-center justify-center text-xs text-dark-muted font-mono">No data yet</div> : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{top:4,right:4,bottom:0,left:4}}>
            <XAxis dataKey="range" tick={{fontSize:9,fill:'#6b7280',fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:'#6b7280',fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} domain={[0,100]}/>
            <Tooltip contentStyle={{background:'#111118',border:'1px solid #1e1e2e',borderRadius:8,fontSize:11,fontFamily:'JetBrains Mono'}} labelStyle={{color:'#6b7280'}} formatter={(v)=>[`${v}%`,'Win Rate']}/>
            <Bar dataKey="winRate" radius={[4,4,0,0]}>
              {data.map((e,i)=><Cell key={i} fill={e.winRate>=50?'#00ff88':'#ff3333'} fillOpacity={0.8}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Direction Pie ───
function DirectionPie({ bets }) {
  const data = useMemo(() => {
    const resolved = (bets||[]).filter(b=>(b.result==='WIN'||b.result==='LOSS')&&b.direction!=='SKIP');
    const up = resolved.filter(b=>b.direction==='UP').length;
    const down = resolved.filter(b=>b.direction==='DOWN').length;
    return [{name:'UP',value:up,color:'#00ff88'},{name:'DOWN',value:down,color:'#ff3333'}];
  }, [bets]);
  const total = data[0].value+data[1].value;
  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Direction Distribution</h3>
      {total===0 ? <div className="h-[220px] flex items-center justify-center text-xs text-dark-muted font-mono">No data yet</div> : (
        <div className="flex items-center justify-center gap-6 h-[220px]">
          <ResponsiveContainer width={160} height={160}>
            <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
              {data.map((e,i)=><Cell key={i} fill={e.color} fillOpacity={0.85}/>)}
            </Pie></PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {data.map(d=>(
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{backgroundColor:d.color}}/>
                <span className="text-xs font-mono text-dark-text">{d.name}</span>
                <span className="text-xs font-mono text-dark-muted">{d.value} ({total>0?((d.value/total)*100).toFixed(1):0}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rolling 7-Day Performance ───
function SevenDayChart({ bets }) {
  const data = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
      const next = new Date(d); next.setDate(next.getDate()+1);
      const label = `${d.getMonth()+1}/${d.getDate()}`;
      const dayBets = (bets||[]).filter(b=>{
        const t=new Date(b.round_time).getTime(); return t>=d.getTime()&&t<next.getTime()&&(b.result==='WIN'||b.result==='LOSS');
      });
      const pnl = dayBets.reduce((s,b)=>s+(b.pnl||0),0);
      const wins = dayBets.filter(b=>b.result==='WIN').length;
      days.push({label, pnl, trades:dayBets.length, wins});
    }
    return days;
  }, [bets]);

  const hasData = data.some(d=>d.trades>0);
  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Rolling 7-Day Performance</h3>
      {!hasData ? <div className="h-[160px] flex items-center justify-center text-xs text-dark-muted font-mono">No recent data</div> : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{top:4,right:4,bottom:0,left:4}}>
            <XAxis dataKey="label" tick={{fontSize:9,fill:'#6b7280',fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:'#6b7280',fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}`} width={42}/>
            <Tooltip contentStyle={{background:'#111118',border:'1px solid #1e1e2e',borderRadius:8,fontSize:11,fontFamily:'JetBrains Mono'}} labelStyle={{color:'#6b7280'}} formatter={(v)=>[`$${v.toFixed(2)}`,'P&L']}/>
            <Bar dataKey="pnl" radius={[3,3,0,0]}>
              {data.map((e,i)=><Cell key={i} fill={e.pnl>=0?'#00ff88':'#ff3333'} fillOpacity={0.8}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Streaks Section ───
function StreaksSection({ bets }) {
  const stats = useMemo(() => {
    const resolved = (bets||[]).filter(b=>b.result==='WIN'||b.result==='LOSS');
    const chron = [...resolved].reverse();
    let bestWin=0, bestLoss=0, curWin=0, curLoss=0, curWinFinal=0, curLossFinal=0;
    let tmpW=0, tmpL=0;
    for (const b of chron) {
      if (b.result==='WIN') { tmpW++; tmpL=0; if(tmpW>bestWin) bestWin=tmpW; }
      else { tmpL++; tmpW=0; if(tmpL>bestLoss) bestLoss=tmpL; }
    }
    // Current streak (from newest)
    for (const b of resolved) {
      if (b.result==='WIN') { if(curLossFinal>0) break; curWinFinal++; }
      else { if(curWinFinal>0) break; curLossFinal++; }
    }
    return { bestWin, bestLoss, curWin: curWinFinal, curLoss: curLossFinal };
  }, [bets]);

  const curStreak = stats.curWin > 0 ? stats.curWin : -stats.curLoss;
  const curLabel = curStreak > 0 ? `${curStreak}W Streak` : curStreak < 0 ? `${Math.abs(curStreak)}L Streak` : 'No streak';
  const curColor = curStreak > 0 ? 'neon-green' : curStreak < 0 ? 'neon-red' : 'text-dark-muted';

  return (
    <div className="terminal-card p-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Streak Analysis</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[10px] text-dark-muted uppercase mb-2">Longest Win Streak</p>
          <p className="text-2xl font-bold font-mono neon-green">{stats.bestWin}</p>
          <div className="mt-2 flex justify-center gap-0.5">
            {Array.from({length:Math.min(stats.bestWin,15)}).map((_,i)=>(
              <div key={i} className="w-1.5 h-4 rounded-sm bg-accent-green" style={{opacity:0.5+i/Math.max(stats.bestWin,1)*0.5}}/>
            ))}
          </div>
        </div>
        <div className="text-center border-x border-dark-border">
          <p className="text-[10px] text-dark-muted uppercase mb-2">Current Streak</p>
          <p className={`text-2xl font-bold font-mono ${curColor}`}>{curLabel}</p>
          <div className="mt-2 flex justify-center gap-0.5">
            {Array.from({length:Math.min(Math.abs(curStreak),15)}).map((_,i)=>(
              <div key={i} className="w-1.5 h-4 rounded-sm animate-pulse"
                style={{background:curStreak>0?'#00ff88':'#ff3333', opacity:0.6}}/>
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-dark-muted uppercase mb-2">Longest Loss Streak</p>
          <p className="text-2xl font-bold font-mono neon-red">{stats.bestLoss}</p>
          <div className="mt-2 flex justify-center gap-0.5">
            {Array.from({length:Math.min(stats.bestLoss,15)}).map((_,i)=>(
              <div key={i} className="w-1.5 h-4 rounded-sm bg-accent-red" style={{opacity:0.5+i/Math.max(stats.bestLoss,1)*0.5}}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Strategy Table ───
function StrategyTable({ bets }) {
  const stats = useMemo(() => {
    const resolved = (bets||[]).filter(b=>b.result==='WIN'||b.result==='LOSS');
    const calc = list => {
      const w = list.filter(b=>b.result==='WIN').length;
      const pnl = list.reduce((s,b)=>s+(b.pnl||0),0);
      const avgConf = list.length>0 ? list.reduce((s,b)=>s+(b.confidence||0),0)/list.length : 0;
      return {trades:list.length,wins:w,losses:list.length-w,winRate:list.length>0?(w/list.length)*100:0,pnl,avgConf};
    };
    return [
      {strategy:'LONG (UP)',   ...calc(resolved.filter(b=>b.direction==='UP'))},
      {strategy:'SHORT (DOWN)',...calc(resolved.filter(b=>b.direction==='DOWN'))},
      {strategy:'ALL TRADES',  ...calc(resolved)},
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
              <th className="text-left">Strategy</th><th className="text-right">Trades</th>
              <th className="text-right">Wins</th><th className="text-right">Losses</th>
              <th className="text-right">Win Rate</th><th className="text-right">Avg Conf</th><th className="text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s=>(
              <tr key={s.strategy} className="border-b border-dark-border/30 hover:bg-dark-hover transition-colors">
                <td className="font-bold text-dark-text">{s.strategy}</td>
                <td className="text-right text-dark-muted">{s.trades}</td>
                <td className="text-right text-accent-green">{s.wins}</td>
                <td className="text-right text-accent-red">{s.losses}</td>
                <td className={`text-right font-bold ${s.winRate>=50?'text-accent-green':'text-accent-red'}`}>{fmt(s.winRate,1)}%</td>
                <td className="text-right text-dark-muted">{fmt(s.avgConf,1)}%</td>
                <td className={`text-right font-bold ${s.pnl>=0?'text-accent-green':'text-accent-red'}`}>{s.pnl>=0?'+':''}${fmt(s.pnl)}</td>
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
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-dark-text">Analytics</h2>
      {/* Top row: best hour + 7-day */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BestHourCard bets={bets}/>
        <div className="lg:col-span-2"><SevenDayChart bets={bets}/></div>
      </div>
      <HourlyHeatmap bets={bets}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfidenceChart bets={bets}/>
        <DirectionPie bets={bets}/>
      </div>
      <StreaksSection bets={bets}/>
      <StrategyTable bets={bets}/>
    </div>
  );
}
