import React, { useMemo } from 'react';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }

// ─── Rank System ───
const RANKS = [
  { name: 'Bronze', min: -Infinity, max: 0, color: '#cd7f32', icon: '\u2726', gradient: 'from-[#cd7f32] to-[#8b4513]' },
  { name: 'Silver', min: 0, max: 50, color: '#c0c0c0', icon: '\u2727', gradient: 'from-[#c0c0c0] to-[#808080]' },
  { name: 'Gold', min: 50, max: 200, color: '#ffd700', icon: '\u2605', gradient: 'from-[#ffd700] to-[#ff8c00]' },
  { name: 'Platinum', min: 200, max: 500, color: '#e5e4e2', icon: '\u2666', gradient: 'from-[#e5e4e2] to-[#a0a0a0]' },
  { name: 'Diamond', min: 500, max: Infinity, color: '#b9f2ff', icon: '\u2756', gradient: 'from-[#b9f2ff] to-[#00bfff]' },
];

function getRank(pnl) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (pnl >= RANKS[i].min && (i === RANKS.length - 1 || pnl < RANKS[i + 1].min)) {
      // Check from highest to lowest
    }
  }
  for (const r of [...RANKS].reverse()) {
    if (pnl >= r.min) return r;
  }
  return RANKS[0];
}

function getNextRank(pnl) {
  for (const r of RANKS) {
    if (pnl < r.max) {
      const idx = RANKS.indexOf(r);
      return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
    }
  }
  return null;
}

// ─── Achievement Definitions ───
const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Blood', desc: 'Win your first trade', icon: '\u2694', check: (s) => s.wins >= 1 },
  { id: 'ten_trades', name: 'Getting Started', desc: 'Complete 10 trades', icon: '\u26A1', check: (s) => s.totalTrades >= 10 },
  { id: 'fifty_trades', name: 'Seasoned Trader', desc: 'Complete 50 trades', icon: '\u2693', check: (s) => s.totalTrades >= 50 },
  { id: 'hundred_bets', name: 'Century Club', desc: 'Complete 100 trades', icon: '\u265B', check: (s) => s.totalTrades >= 100 },
  { id: 'win_streak_3', name: 'Hot Streak', desc: '3 wins in a row', icon: '\u2733', check: (s) => s.bestWinStreak >= 3 },
  { id: 'win_streak_5', name: 'On Fire', desc: '5 wins in a row', icon: '\u2734', check: (s) => s.bestWinStreak >= 5 },
  { id: 'win_streak_10', name: '10-Win Streak', desc: '10 consecutive wins', icon: '\u2747', check: (s) => s.bestWinStreak >= 10 },
  { id: 'profit_10', name: 'In the Green', desc: 'Earn $10+ total profit', icon: '\u2740', check: (s) => s.totalPnl >= 10 },
  { id: 'profit_50', name: 'Profit Master', desc: 'Earn $50+ total profit', icon: '\u2741', check: (s) => s.totalPnl >= 50 },
  { id: 'profit_100', name: 'Big Baller', desc: 'Earn $100+ total profit', icon: '\u273F', check: (s) => s.totalPnl >= 100 },
  { id: 'win_rate_60', name: 'Consistent', desc: 'Maintain 60%+ win rate (10+ trades)', icon: '\u2742', check: (s) => s.winRate >= 60 && s.totalTrades >= 10 },
  { id: 'survivor', name: 'Survivor', desc: 'Recover from a 3-loss streak', icon: '\u2743', check: (s) => s.recoveredFromStreak },
];

export default function ProfilePage({ account, dashboard, bets }) {
  const stats = useMemo(() => {
    const resolved = (bets || []).filter(b => b.result === 'WIN' || b.result === 'LOSS');
    const wins = resolved.filter(b => b.result === 'WIN').length;
    const totalPnl = resolved.reduce((s, b) => s + (b.pnl || 0), 0);
    const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 0;
    const totalTrades = resolved.length;

    // Best win streak
    let bestWinStreak = 0, tempWin = 0;
    const chronological = [...resolved].reverse();
    for (const b of chronological) {
      if (b.result === 'WIN') { tempWin++; if (tempWin > bestWinStreak) bestWinStreak = tempWin; }
      else { tempWin = 0; }
    }

    // Check if recovered from 3-loss streak
    let recoveredFromStreak = false;
    let consLosses = 0;
    let hadThreeLossStreak = false;
    for (const b of chronological) {
      if (b.result === 'LOSS') { consLosses++; if (consLosses >= 3) hadThreeLossStreak = true; }
      else {
        if (hadThreeLossStreak) recoveredFromStreak = true;
        consLosses = 0;
      }
    }

    return { wins, totalPnl, winRate, totalTrades, bestWinStreak, recoveredFromStreak };
  }, [bets]);

  const rank = getRank(stats.totalPnl);
  const nextRank = getNextRank(stats.totalPnl);
  const progressToNext = nextRank
    ? Math.max(0, Math.min(100, ((stats.totalPnl - rank.min) / (nextRank.min - rank.min)) * 100))
    : 100;

  const unlockedCount = ACHIEVEMENTS.filter(a => a.check(stats)).length;

  // Join date: find earliest bet
  const allBets = bets || [];
  const chronoBets = [...allBets].reverse();
  const joinDate = chronoBets.length > 0 ? new Date(chronoBets[0].round_time) : new Date();
  const joinStr = joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const truncatedAddr = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '0x0000...0000';

  return (
    <div className="space-y-6 animate-slide-in">
      <h2 className="text-lg font-bold text-dark-text">Profile</h2>

      {/* ─── Profile Card ─── */}
      <div className="terminal-card p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="avatar-gradient shrink-0">
            <div className="w-24 h-24 rounded-full bg-dark-bg flex items-center justify-center text-3xl" style={{ color: rank.color }}>
              {rank.icon}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-bold text-dark-text">Prediction Trader</h3>
            <p className="text-xs font-mono text-dark-muted mt-1">{truncatedAddr}</p>
            <p className="text-[11px] text-dark-muted mt-1">Joined {joinStr}</p>

            {/* Rank */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-2xl" style={{ color: rank.color }}>{rank.icon}</span>
              <div>
                <p className="font-bold font-mono text-sm" style={{ color: rank.color }}>{rank.name}</p>
                {nextRank && (
                  <p className="text-[10px] text-dark-muted font-mono">
                    ${fmt(Math.max(0, nextRank.min - stats.totalPnl))} P&L to {nextRank.name}
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar to next rank */}
            {nextRank && (
              <div className="mt-2 w-full max-w-xs">
                <div className="w-full h-2 bg-dark-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressToNext}%`,
                      background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})`,
                      boxShadow: `0 0 8px ${rank.color}`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono" style={{ color: rank.color }}>{rank.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: nextRank.color }}>{nextRank.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 text-center shrink-0">
            <div className="terminal-card p-3 min-w-[90px]">
              <p className="text-[10px] text-dark-muted uppercase">Trades</p>
              <p className="text-lg font-bold font-mono text-dark-text">{stats.totalTrades}</p>
            </div>
            <div className="terminal-card p-3 min-w-[90px]">
              <p className="text-[10px] text-dark-muted uppercase">Win Rate</p>
              <p className={`text-lg font-bold font-mono ${stats.winRate >= 50 ? 'neon-green' : 'neon-red'}`}>
                {fmt(stats.winRate, 1)}%
              </p>
            </div>
            <div className="terminal-card p-3 min-w-[90px]">
              <p className="text-[10px] text-dark-muted uppercase">Total P&L</p>
              <p className={`text-lg font-bold font-mono ${stats.totalPnl >= 0 ? 'neon-green' : 'neon-red'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${fmt(stats.totalPnl)}
              </p>
            </div>
            <div className="terminal-card p-3 min-w-[90px]">
              <p className="text-[10px] text-dark-muted uppercase">Best Streak</p>
              <p className="text-lg font-bold font-mono neon-orange">{stats.bestWinStreak}W</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Rank Ladder ─── */}
      <div className="terminal-card p-4">
        <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-4">Rank Ladder</h3>
        <div className="flex items-center gap-2">
          {RANKS.map((r, i) => {
            const isActive = r.name === rank.name;
            const isPast = RANKS.indexOf(rank) > i;
            return (
              <div key={r.name} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                  isActive ? 'border-accent-orange scale-110' : isPast ? 'border-dark-muted/30' : 'border-dark-border'
                } ${isActive ? 'badge-glow' : isPast ? '' : 'opacity-40'}`}
                  style={{ backgroundColor: isActive || isPast ? `${r.color}20` : '#111118', color: r.color }}>
                  {r.icon}
                </div>
                <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-accent-orange' : isPast ? 'text-dark-muted' : 'text-dark-muted/40'}`}>
                  {r.name}
                </span>
                <span className="text-[8px] font-mono text-dark-muted/50">
                  {r.min === -Infinity ? '<$0' : `$${r.min}+`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Achievements ─── */}
      <div className="terminal-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Achievements</h3>
          <span className="text-[11px] font-mono text-accent-orange">{unlockedCount}/{ACHIEVEMENTS.length} Unlocked</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map(a => {
            const unlocked = a.check(stats);
            return (
              <div key={a.id}
                className={`rounded-lg p-3 border transition-all ${
                  unlocked
                    ? 'border-accent-orange/30 bg-accent-orange/5 badge-glow'
                    : 'border-dark-border bg-dark-bg badge-locked'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{a.icon}</span>
                  <span className={`text-[11px] font-bold ${unlocked ? 'text-accent-orange' : 'text-dark-muted'}`}>
                    {a.name}
                  </span>
                </div>
                <p className="text-[10px] text-dark-muted leading-relaxed">{a.desc}</p>
                {unlocked && (
                  <div className="mt-1.5">
                    <span className="text-[9px] font-mono text-accent-green">UNLOCKED</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
