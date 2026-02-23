import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AgentEngine } from './engine/agentEngine.js';
import Sidebar from './components/Sidebar.jsx';
import ToastContainer, { addToast } from './components/ToastContainer.jsx';
import TickerTape from './components/TickerTape.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

const POLYGON_AMOY_CHAIN_ID = '0x13882';
const SOUND_KEY = 'prediction_agent_sound';

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.1;
    if (type === 'win') { osc.frequency.value = 800; osc.type = 'sine'; }
    else { osc.frequency.value = 300; osc.type = 'sawtooth'; }
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

// Inner component to use router hooks
function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [account, setAccount] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [, setTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'false'; } catch { return true; }
  });
  const engineRef = useRef(null);
  const prevBetsLenRef = useRef(0);
  const prevStatusRef = useRef(null);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new AgentEngine(() => { setTick(t => t + 1); });
  }
  const engine = engineRef.current;

  // Play sounds + fire toasts on bet results and status changes
  useEffect(() => {
    const bets = engine.getBets();
    const resolved = bets.filter(b => b.result === 'WIN' || b.result === 'LOSS');
    const dashboard = engine.getDashboard();

    // New bet result
    if (resolved.length > prevBetsLenRef.current && prevBetsLenRef.current > 0) {
      const latest = resolved[0];
      const pnlStr = (latest.pnl >= 0 ? '+$' : '-$') + Math.abs(latest.pnl || 0).toFixed(2);
      if (latest.result === 'WIN') {
        addToast(`WIN ${pnlStr}`, 'win');
        if (soundEnabled) playSound('win');
      } else {
        addToast(`LOSS ${pnlStr}`, 'loss');
        if (soundEnabled) playSound('loss');
      }
    }
    prevBetsLenRef.current = resolved.length;

    // Status changes
    const curStatus = dashboard.agentStatus;
    if (prevStatusRef.current && curStatus !== prevStatusRef.current) {
      if (curStatus === 'active') addToast('Agent started', 'info');
      else if (curStatus === 'stopped') {
        if (dashboard.stopReason === 'DAILY_LOSS_LIMIT') addToast('Daily loss limit reached (-10%)', 'warning');
        else if (dashboard.stopReason === 'CONSECUTIVE_LOSSES') addToast('4 consecutive losses — paused', 'warning');
        else if (dashboard.stopReason === 'DAILY_PROFIT_TARGET') addToast('Profit target reached (+5%)', 'win');
        else addToast('Agent stopped', 'info');
      } else if (curStatus === 'withdrawn') addToast('Funds withdrawn', 'info');
    }
    prevStatusRef.current = curStatus;
  });

  useEffect(() => {
    return () => { if (engineRef.current) engineRef.current.destroy(); };
  }, []);

  function toggleSound() {
    setSoundEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(SOUND_KEY, String(next)); } catch {}
      return next;
    });
  }

  // Wallet connect
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      addToast('Please install MetaMask', 'warning');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        addToast('Wallet connected', 'info');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: POLYGON_AMOY_CHAIN_ID,
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                blockExplorerUrls: ['https://amoy.polygonscan.com/'],
              }],
            });
          }
        }
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      addToast('Connection failed', 'loss');
    }
    setConnecting(false);
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    addToast('Wallet disconnected', 'info');
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (accounts) => {
      setAccount(accounts.length > 0 ? accounts[0] : null);
    };
    window.ethereum.on('accountsChanged', handleAccounts);
    window.ethereum.request({ method: 'eth_accounts' }).then(handleAccounts);
    return () => window.ethereum.removeListener('accountsChanged', handleAccounts);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      // Ignore if focused on input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === 'd') navigate('/');
      else if (key === 'h') navigate('/history');
      else if (key === 'a') navigate('/analytics');
      else if (key === 'p') navigate('/profile');
      else if (key === 's') {
        const dashboard = engine.getDashboard();
        if (dashboard.agentStatus === 'active') engine.stop();
        else if (dashboard.bankroll > 0 && account) engine.start();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, account, engine]);

  const dashboard = engine.getDashboard();
  const bets = engine.getBets();

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text grid-bg">
      <Sidebar soundEnabled={soundEnabled} onToggleSound={toggleSound} />
      <ToastContainer />

      <div className="ml-[220px] min-h-screen flex flex-col">
        {/* Ticker tape */}
        <TickerTape />

        {/* Top bar with wallet */}
        <header className="sticky top-0 z-30 bg-dark-bg/80 backdrop-blur-sm border-b border-dark-border">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-dark-muted uppercase tracking-widest">Prediction Market Auto-Pilot</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/20 font-mono font-bold">
                TESTNET
              </span>
              <div className="hidden sm:flex items-center gap-1 ml-4">
                <span className="kbd">D</span><span className="kbd">H</span><span className="kbd">A</span><span className="kbd">P</span>
                <span className="text-[8px] text-dark-muted/40 ml-1">navigate</span>
                <span className="kbd ml-2">S</span>
                <span className="text-[8px] text-dark-muted/40 ml-1">start/stop</span>
              </div>
            </div>
            {account ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-card rounded-lg border border-dark-border">
                  <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  <span className="text-xs font-mono text-dark-muted">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </div>
                <button onClick={disconnectWallet}
                  className="px-3 py-1.5 text-[11px] text-dark-muted border border-dark-border rounded-lg hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/30 transition font-mono">
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} disabled={connecting}
                className="px-4 py-1.5 bg-accent-orange text-dark-bg text-xs font-bold rounded-lg hover:brightness-110 transition disabled:opacity-50 font-mono">
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Page content with transition */}
        <main className="px-6 py-5 flex-1">
          <div key={location.pathname} className="animate-page-enter">
            <Routes>
              <Route path="/" element={
                <DashboardPage engine={engine} account={account} dashboard={dashboard} bets={bets} onConnect={connectWallet} connecting={connecting} />
              } />
              <Route path="/history" element={
                <HistoryPage bets={bets} />
              } />
              <Route path="/analytics" element={
                <AnalyticsPage bets={bets} />
              } />
              <Route path="/profile" element={
                <ProfilePage account={account} dashboard={dashboard} bets={bets} />
              } />
            </Routes>
          </div>
        </main>

        <footer className="border-t border-dark-border px-6 py-4">
          <p className="text-center text-[10px] text-dark-muted font-mono">
            Past results do not predict future performance. Only use funds you can afford to lose. Demo mode — Testnet only.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
