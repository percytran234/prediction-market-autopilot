import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentEngine } from './engine/agentEngine.js';
import Header from './components/Header.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import StatsCards from './components/StatsCards.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import CurrentRound from './components/CurrentRound.jsx';
import BetHistory from './components/BetHistory.jsx';
import PriceChart from './components/PriceChart.jsx';
import ActivityFeed from './components/ActivityFeed.jsx';
import AgentWallet from './components/AgentWallet.jsx';
import Footer from './components/Footer.jsx';

const POLYGON_AMOY_CHAIN_ID = '0x13882';

function LastUpdated({ timestamp }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!timestamp) return;
    setSeconds(0);
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - timestamp) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <div className="flex items-center justify-end gap-1.5 text-[11px] text-dark-muted tabular-nums">
      <span className="inline-block w-3 h-3 opacity-60">&#x1F504;</span>
      <span>Updated {seconds < 2 ? 'just now' : `${seconds}s ago`}</span>
    </div>
  );
}

export default function App() {
  const [account, setAccount] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [, setTick] = useState(0); // force re-render on engine changes
  const [lastFetched, setLastFetched] = useState(null);
  const engineRef = useRef(null);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new AgentEngine(() => {
      setTick(t => t + 1);
      setLastFetched(Date.now());
    });
    setLastFetched(Date.now());
  }
  const engine = engineRef.current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) engineRef.current.destroy();
    };
  }, []);

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
  const disconnectWallet = useCallback(() => {
    setAccount(null);
  }, []);

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
  const activityLog = engine.getActivityLog();
  const priceHistory = engine.getPriceHistory();
  const isActive = dashboard.agentStatus === 'active';

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <Header
        account={account}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        connecting={connecting}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <DisclaimerBanner />
        <LastUpdated timestamp={lastFetched} />
        <StatsCards dashboard={dashboard} bets={bets} />
        <ControlPanel engine={engine} account={account} dashboard={dashboard} />

        {/* Two-column layout: chart + wallet/activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PriceChart priceHistory={priceHistory} />
          </div>
          <div className="space-y-4">
            <AgentWallet account={account} dashboard={dashboard} />
            <ActivityFeed log={activityLog} />
          </div>
        </div>

        {isActive && <CurrentRound bets={bets} />}
        <BetHistory bets={bets} />
      </main>

      <Footer />
    </div>
  );
}
