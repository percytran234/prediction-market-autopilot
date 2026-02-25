import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }

// ─── Polymarket Integration Settings ───
const MODE_LABELS = { mock: 'Mock', paper: 'Paper', live: 'Live' };
const MODE_COLORS = {
  mock:  'text-accent-green',
  paper: 'text-[#ffd740]',
  live:  'text-accent-red',
};

function PolymarketSettings() {
  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSetup = useCallback(() => {
    fetch('/api/setup-status')
      .then(r => r.json())
      .then(d => { setSetup(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSetup(); }, [fetchSetup]);

  if (loading) {
    return (
      <div className="terminal-card p-4">
        <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">Polymarket Integration</h3>
        <p className="text-xs text-dark-muted font-mono">Loading...</p>
      </div>
    );
  }

  const mode = setup?.execution_mode || 'mock';
  const cliInstalled = setup?.cli_installed || false;
  const walletOk = setup?.wallet_connected || false;
  const paperDays = setup?.paper_trading_days || 0;
  const requiredDays = setup?.required_paper_days || 7;
  const liveGates = setup?.live_gates || {};

  return (
    <div className="terminal-card p-4 space-y-4">
      <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Polymarket Integration</h3>

      {/* Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
          <p className="text-[9px] text-dark-muted uppercase tracking-widest mb-1">Mode</p>
          <p className={`text-sm font-bold font-mono ${MODE_COLORS[mode]}`}>{MODE_LABELS[mode] || mode}</p>
        </div>
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
          <p className="text-[9px] text-dark-muted uppercase tracking-widest mb-1">CLI Status</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cliInstalled ? 'bg-accent-green' : 'bg-accent-red'}`} />
            <span className={`text-sm font-bold font-mono ${cliInstalled ? 'text-accent-green' : 'text-accent-red'}`}>
              {cliInstalled ? 'Connected' : 'Not Found'}
            </span>
          </div>
        </div>
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
          <p className="text-[9px] text-dark-muted uppercase tracking-widest mb-1">Wallet</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${walletOk ? 'bg-accent-green' : 'bg-dark-muted'}`} />
            <span className={`text-sm font-bold font-mono ${walletOk ? 'text-accent-green' : 'text-dark-muted'}`}>
              {walletOk ? 'Linked' : 'None'}
            </span>
          </div>
        </div>
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
          <p className="text-[9px] text-dark-muted uppercase tracking-widest mb-1">Paper Days</p>
          <p className="text-sm font-bold font-mono text-[#ffd740]">{paperDays} / {requiredDays}</p>
        </div>
      </div>

      {/* Live Mode Gates */}
      <div>
        <p className="text-[10px] text-dark-muted uppercase tracking-wider font-semibold mb-2">Live Mode Requirements</p>
        <div className="space-y-1.5">
          {[
            { key: 'live_confirmed', label: 'LIVE_MODE_CONFIRMED env set', ok: liveGates.live_confirmed },
            { key: 'paper_days_met', label: `${requiredDays}+ paper trading days`, ok: liveGates.paper_days_met },
            { key: 'cli_healthy', label: 'CLI installed & healthy', ok: liveGates.cli_healthy },
            { key: 'wallet_has_funds', label: 'Wallet has USDC balance', ok: liveGates.wallet_has_funds },
          ].map(g => (
            <div key={g.key} className="flex items-center gap-2">
              <span className={`text-xs ${g.ok ? 'text-accent-green' : 'text-dark-muted'}`}>
                {g.ok ? '✓' : '○'}
              </span>
              <span className={`text-[11px] font-mono ${g.ok ? 'text-dark-text' : 'text-dark-muted'}`}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Guide */}
      <div className="border-t border-dark-border pt-3">
        <p className="text-[10px] text-dark-muted font-mono leading-relaxed">
          <span className="text-dark-text font-bold">Setup:</span> Install the Polymarket CLI
          (<span className="text-accent-green">cargo install polymarket-cli</span>), set{' '}
          <span className="text-accent-green">EXECUTION_MODE=paper</span> in .env, then trade for{' '}
          {requiredDays}+ days to unlock live mode.
        </p>
      </div>
    </div>
  );
}

const USERNAME_KEY = 'prediction_agent_username';
const JOURNAL_KEY  = 'prediction_agent_journal';

// ─── Rank System ───
const RANKS = [
  { name: 'Bronze',   min: -Infinity, max: 0,   color: '#cd7f32', icon: '✦', gradient: 'from-[#cd7f32] to-[#8b4513]' },
  { name: 'Silver',   min: 0,         max: 50,  color: '#c0c0c0', icon: '✧', gradient: 'from-[#c0c0c0] to-[#808080]' },
  { name: 'Gold',     min: 50,        max: 200, color: '#ffd700', icon: '★', gradient: 'from-[#ffd700] to-[#ff8c00]' },
  { name: 'Platinum', min: 200,       max: 500, color: '#00e5ff', icon: '◆', gradient: 'from-[#00e5ff] to-[#0097a7]' },
  { name: 'Diamond',  min: 500,       max: Infinity, color: '#00e676', icon: '❖', gradient: 'from-[#00e676] to-[#69f0ae]' },
];

function getRank(pnl) {
  for (const r of [...RANKS].reverse()) { if (pnl >= r.min) return r; }
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
  { id: 'first_win',    name: 'First Blood',      desc: 'Win your first trade',                     icon: '⚔', check: s => s.wins >= 1 },
  { id: 'ten_trades',   name: 'Getting Started',  desc: 'Complete 10 trades',                       icon: '⚡', check: s => s.totalTrades >= 10 },
  { id: 'fifty_trades', name: 'Seasoned Trader',  desc: 'Complete 50 trades',                       icon: '⚓', check: s => s.totalTrades >= 50 },
  { id: 'hundred_bets', name: 'Century Club',     desc: 'Complete 100 trades',                      icon: '♛', check: s => s.totalTrades >= 100 },
  { id: 'win_streak_3', name: 'Hot Streak',       desc: '3 wins in a row',                          icon: '✳', check: s => s.bestWinStreak >= 3 },
  { id: 'win_streak_5', name: 'On Fire',          desc: '5 wins in a row',                          icon: '✴', check: s => s.bestWinStreak >= 5 },
  { id: 'win_streak_10',name: '10-Win Streak',    desc: '10 consecutive wins',                      icon: '✧', check: s => s.bestWinStreak >= 10 },
  { id: 'profit_10',    name: 'In the Green',     desc: 'Earn $10+ total profit',                   icon: '✿', check: s => s.totalPnl >= 10 },
  { id: 'profit_50',    name: 'Profit Master',    desc: 'Earn $50+ total profit',                   icon: '❁', check: s => s.totalPnl >= 50 },
  { id: 'profit_100',   name: 'Big Baller',       desc: 'Earn $100+ total profit',                  icon: '✯', check: s => s.totalPnl >= 100 },
  { id: 'win_rate_60',  name: 'Consistent',       desc: 'Maintain 60%+ win rate (10+ trades)',      icon: '✪', check: s => s.winRate >= 60 && s.totalTrades >= 10 },
  { id: 'survivor',     name: 'Survivor',         desc: 'Recover from a 3-loss streak',             icon: '✣', check: s => s.recoveredFromStreak },
];

// ─── Share Card Modal ───
function ShareModal({ stats, rank, username, account, onClose }) {
  const truncAddr = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '0x????...????';
  const pnlSign   = stats.totalPnl >= 0 ? '+' : '';
  const pnlColor  = stats.totalPnl >= 0 ? '#00e676' : '#ff1744';

  function copyText() {
    const text =
      `🏆 ${username} — ${rank.name} Trader\n` +
      `📊 ${stats.totalTrades} trades | ${fmt(stats.winRate, 1)}% win rate\n` +
      `💰 P&L: ${pnlSign}$${fmt(stats.totalPnl)}\n` +
      `🔥 Best streak: ${stats.bestWinStreak}W\n` +
      `Prediction Market Auto-Pilot — Polygon Amoy Testnet`;
    navigator.clipboard.writeText(text).catch(() => {});
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-backdrop"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="animate-modal-content w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        {/* Shareable card preview */}
        <div className="rounded-xl border border-dark-border overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#0a0f0a 0%,#111a12 60%,#0a1a0a 100%)' }}>
          {/* Header stripe */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#00e676,#69f0ae,#00e676)' }} />

          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-accent-green/50 flex items-center justify-center text-2xl"
                style={{ color: rank.color }}>
                {rank.icon}
              </div>
              <div>
                <p className="text-base font-bold text-dark-text">{username}</p>
                <p className="text-[10px] font-mono text-dark-muted">{truncAddr}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-bold font-mono" style={{ color: rank.color }}>{rank.name}</p>
                <p className="text-[10px] text-dark-muted">Rank</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid #1e3320' }}>
                <p className="text-[9px] text-dark-muted uppercase tracking-widest">Trades</p>
                <p className="text-xl font-bold font-mono text-dark-text">{stats.totalTrades}</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid #1e3320' }}>
                <p className="text-[9px] text-dark-muted uppercase tracking-widest">Win Rate</p>
                <p className="text-xl font-bold font-mono" style={{ color: stats.winRate >= 50 ? '#00e676' : '#ff1744' }}>
                  {fmt(stats.winRate, 1)}%
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid #1e3320' }}>
                <p className="text-[9px] text-dark-muted uppercase tracking-widest">Total P&L</p>
                <p className="text-xl font-bold font-mono" style={{ color: pnlColor }}>
                  {pnlSign}${fmt(stats.totalPnl)}
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid #1e3320' }}>
                <p className="text-[9px] text-dark-muted uppercase tracking-widest">Best Streak</p>
                <p className="text-xl font-bold font-mono" style={{ color:'#00e676' }}>{stats.bestWinStreak}W</p>
              </div>
            </div>

            <p className="text-center text-[9px] font-mono text-dark-muted/50">
              Prediction Market Auto-Pilot · Polygon Amoy Testnet
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={copyText}
            className="flex-1 py-2 bg-accent-green text-black text-xs font-bold rounded-lg hover:brightness-110 transition font-mono">
            Copy to Clipboard
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-dark-hover transition font-mono">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trading Journal ───
function TradingJournal() {
  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [journal, setJournal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}'); } catch { return {}; }
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [editText, setEditText] = useState('');
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  // Load text for selected date
  useEffect(() => {
    setEditText(journal[selectedDate] || '');
  }, [selectedDate, journal]);

  function handleChange(e) {
    const val = e.target.value;
    setEditText(val);
    setSaved(false);
    // Auto-save after 800ms debounce
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setJournal(prev => {
        const next = { ...prev, [selectedDate]: val };
        try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      setSaved(true);
    }, 800);
  }

  // Dates with entries
  const datesWithEntries = Object.keys(journal).filter(k => journal[k]?.trim()).sort().reverse();

  return (
    <div className="terminal-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Trading Journal</h3>
        <span className={`text-[10px] font-mono transition-opacity duration-300 ${saved ? 'text-accent-green opacity-100' : 'opacity-0'}`}>
          Saved ✓
        </span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-[11px] text-dark-muted font-mono">Date:</label>
        <input type="date" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs font-mono text-dark-text focus:outline-none focus:border-accent-green/50" />
        {datesWithEntries.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {datesWithEntries.slice(0, 5).map(d => (
              <button key={d} onClick={() => setSelectedDate(d)}
                className={`text-[9px] font-mono px-2 py-0.5 rounded border transition ${
                  d === selectedDate
                    ? 'border-accent-green/40 bg-accent-green/10 text-accent-green'
                    : 'border-dark-border text-dark-muted hover:border-dark-muted'
                }`}>
                {d.slice(5)} {/* MM-DD */}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        value={editText}
        onChange={handleChange}
        placeholder={`Notes for ${selectedDate}...\n\nWhat did the market do today? How did the agent perform? Any observations about strategy or conditions?`}
        rows={7}
        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2.5 text-xs font-mono text-dark-text placeholder-dark-muted/40 focus:outline-none focus:border-accent-green/40 resize-none scrollbar-thin"
      />

      <div className="flex justify-between items-center text-[10px] text-dark-muted font-mono">
        <span>{datesWithEntries.length} journal {datesWithEntries.length === 1 ? 'entry' : 'entries'}</span>
        <span>{editText.length} chars</span>
      </div>
    </div>
  );
}

export default function ProfilePage({ account, dashboard, bets }) {
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem(USERNAME_KEY) || 'Prediction Trader'; } catch { return 'Prediction Trader'; }
  });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showShare, setShowShare] = useState(false);
  const nameInputRef = useRef(null);

  function startEditName() {
    setNameInput(username);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setUsername(trimmed);
      try { localStorage.setItem(USERNAME_KEY, trimmed); } catch {}
    }
    setEditingName(false);
  }

  function handleNameKey(e) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') setEditingName(false);
  }

  const stats = useMemo(() => {
    const resolved = (bets || []).filter(b => b.result === 'WIN' || b.result === 'LOSS');
    const wins = resolved.filter(b => b.result === 'WIN').length;
    const totalPnl = resolved.reduce((s, b) => s + (b.pnl || 0), 0);
    const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 0;
    const totalTrades = resolved.length;

    let bestWinStreak = 0, tempWin = 0;
    const chrono = [...resolved].reverse();
    for (const b of chrono) {
      if (b.result === 'WIN') { tempWin++; if (tempWin > bestWinStreak) bestWinStreak = tempWin; }
      else { tempWin = 0; }
    }

    let recoveredFromStreak = false, consLosses = 0, hadThree = false;
    for (const b of chrono) {
      if (b.result === 'LOSS') { consLosses++; if (consLosses >= 3) hadThree = true; }
      else { if (hadThree) recoveredFromStreak = true; consLosses = 0; }
    }

    return { wins, totalPnl, winRate, totalTrades, bestWinStreak, recoveredFromStreak };
  }, [bets]);

  const rank = getRank(stats.totalPnl);
  const nextRank = getNextRank(stats.totalPnl);
  const progressToNext = nextRank
    ? Math.max(0, Math.min(100, ((stats.totalPnl - rank.min) / (nextRank.min - rank.min)) * 100))
    : 100;

  const unlockedCount = ACHIEVEMENTS.filter(a => a.check(stats)).length;

  const allBets = bets || [];
  const joinDate = allBets.length > 0 ? new Date([...allBets].reverse()[0].round_time) : new Date();
  const joinStr  = joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const truncAddr = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '0x0000...0000';

  return (
    <div className="space-y-6 animate-slide-in">
      <h2 className="text-lg font-bold text-dark-text">Profile</h2>

      {/* ─── Profile Card ─── */}
      <div className="terminal-card p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="avatar-gradient shrink-0">
            <div className="w-24 h-24 rounded-full bg-dark-bg flex items-center justify-center text-3xl"
              style={{ color: rank.color }}>
              {rank.icon}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {/* Editable username */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={handleNameKey}
                  onBlur={saveName}
                  maxLength={30}
                  className="bg-dark-bg border border-accent-green/50 rounded px-2 py-1 text-lg font-bold text-dark-text focus:outline-none focus:border-accent-green font-mono"
                />
                <button onClick={saveName}
                  className="text-[11px] px-2 py-1 bg-accent-green/20 text-accent-green border border-accent-green/30 rounded hover:bg-accent-green/30 transition font-mono">
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={startEditName}>
                <h3 className="text-xl font-bold text-dark-text group-hover:text-accent-green transition">{username}</h3>
                <span className="text-[10px] text-dark-muted/50 group-hover:text-dark-muted transition font-mono">[edit]</span>
              </div>
            )}

            <p className="text-xs font-mono text-dark-muted mt-1">{truncAddr}</p>
            <p className="text-[11px] text-dark-muted mt-1">Joined {joinStr}</p>

            {/* Rank */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-2xl" style={{ color: rank.color }}>{rank.icon}</span>
              <div>
                <p className="font-bold font-mono text-sm" style={{ color: rank.color }}>{rank.name}</p>
                {nextRank && (
                  <p className="text-[10px] text-dark-muted font-mono">
                    ${fmt(Math.max(0, nextRank.min - stats.totalPnl))} P&amp;L to {nextRank.name}
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {nextRank && (
              <div className="mt-2 w-full max-w-xs">
                <div className="w-full h-2 bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressToNext}%`,
                      background: `linear-gradient(90deg,${rank.color},${nextRank.color})`,
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

            {/* Share button */}
            <button onClick={() => setShowShare(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold text-accent-green border border-accent-green/30 bg-accent-green/5 rounded-lg hover:bg-accent-green/15 transition">
              ↗ Share Stats
            </button>
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
              <p className="text-[10px] text-dark-muted uppercase">Total P&amp;L</p>
              <p className={`text-lg font-bold font-mono ${stats.totalPnl >= 0 ? 'neon-green' : 'neon-red'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${fmt(stats.totalPnl)}
              </p>
            </div>
            <div className="terminal-card p-3 min-w-[90px]">
              <p className="text-[10px] text-dark-muted uppercase">Best Streak</p>
              <p className="text-lg font-bold font-mono neon-green">{stats.bestWinStreak}W</p>
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
            const isPast   = RANKS.indexOf(rank) > i;
            return (
              <div key={r.name} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                  isActive ? 'border-accent-green scale-110' : isPast ? 'border-dark-muted/30' : 'border-dark-border'
                } ${isActive ? 'badge-glow' : isPast ? '' : 'opacity-40'}`}
                  style={{ backgroundColor: isActive||isPast ? `${r.color}20` : '#111a12', color: r.color }}>
                  {r.icon}
                </div>
                <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-accent-green' : isPast ? 'text-dark-muted' : 'text-dark-muted/40'}`}>
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
          <span className="text-[11px] font-mono text-accent-green">{unlockedCount}/{ACHIEVEMENTS.length} Unlocked</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map(a => {
            const unlocked = a.check(stats);
            return (
              <div key={a.id}
                className={`rounded-lg p-3 border transition-all ${
                  unlocked ? 'border-accent-green/30 bg-accent-green/5 badge-glow' : 'border-dark-border bg-dark-bg badge-locked'
                }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{a.icon}</span>
                  <span className={`text-[11px] font-bold ${unlocked ? 'text-accent-green' : 'text-dark-muted'}`}>{a.name}</span>
                </div>
                <p className="text-[10px] text-dark-muted leading-relaxed">{a.desc}</p>
                {unlocked && <span className="mt-1.5 block text-[9px] font-mono text-accent-green">UNLOCKED</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Polymarket Integration ─── */}
      <PolymarketSettings />

      {/* ─── Trading Journal ─── */}
      <TradingJournal />

      {/* ─── Share Modal ─── */}
      {showShare && (
        <ShareModal stats={stats} rank={rank} username={username} account={account} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
