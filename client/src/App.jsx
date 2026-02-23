import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AgentEngine } from './engine/agentEngine.js';
import Sidebar from './components/Sidebar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

const POLYGON_AMOY_CHAIN_ID = '0x13882';
const SOUND_KEY = 'prediction_agent_sound';

// Simple beep sounds using Web Audio API
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.1;

    if (type === 'win') {
      osc.frequency.value = 800;
      osc.type = 'sine';
    } else {
      osc.frequency.value = 300;
      osc.type = 'sawtooth';
    }

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function App() {
  const [account, setAccount] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [, setTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'false'; } catch { return true; }
  });
  const engineRef = useRef(null);
  const prevBetsLenRef = useRef(0);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new AgentEngine(() => {
      setTick(t => t + 1);
    });
  }
  const engine = engineRef.current;

  // Play sounds on new bet results
  useEffect(() => {
    if (!soundEnabled) return;
    const bets = engine.getBets();
    const resolved = bets.filter(b => b.result === 'WIN' || b.result === 'LOSS');
    if (resolved.length > prevBetsLenRef.current && prevBetsLenRef.current > 0) {
      const latest = resolved[0]; // getBets returns reversed
      if (latest.result === 'WIN') playSound('win');
      else if (latest.result === 'LOSS') playSound('loss');
    }
    prevBetsLenRef.current = resolved.length;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (engineRef.current) engineRef.current.destroy(); };
  }, []);

  // Toggle sound
  function toggleSound() {
    setSoundEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(SOUND_KEY, String(next)); } catch {}
      return next;
    });
  }

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) return;
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
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
    }
    setConnecting(false);
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => { setAccount(null); }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (accounts) => {
      setAccount(accounts.length > 0 ? accounts[0] : null);
    };
    window.ethereum.on('accountsChanged', handleAccounts);
    window.ethereum.request({ method: 'eth_accounts' }).then(handleAccounts);
    return () => window.ethereum.removeListener('accountsChanged', handleAccounts);
  }, []);

  const dashboard = engine.getDashboard();
  const bets = engine.getBets();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-bg text-dark-text grid-bg">
        {/* Sidebar */}
        <Sidebar soundEnabled={soundEnabled} onToggleSound={toggleSound} />

        {/* Main content */}
        <div className="ml-[220px] min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-dark-bg/80 backdrop-blur-sm border-b border-dark-border">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-dark-muted uppercase tracking-widest">Prediction Market Auto-Pilot</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/20 font-mono font-bold">
                  TESTNET
                </span>
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

          {/* Page content */}
          <main className="px-6 py-5">
            <Routes>
              <Route path="/" element={
                <DashboardPage engine={engine} account={account} dashboard={dashboard} bets={bets} />
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
          </main>

          {/* Footer */}
          <footer className="border-t border-dark-border px-6 py-4">
            <p className="text-center text-[10px] text-dark-muted font-mono">
              Past results do not predict future performance. Only use funds you can afford to lose. Demo mode — Testnet only.
            </p>
          </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}
