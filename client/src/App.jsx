import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import StatsCards from './components/StatsCards.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import CurrentRound from './components/CurrentRound.jsx';
import BetHistory from './components/BetHistory.jsx';
import Footer from './components/Footer.jsx';

const POLYGON_AMOY_CHAIN_ID = '0x13882';
const POLL_INTERVAL = 3000;

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
  const [dashboard, setDashboard] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const dashRef = useRef(null);
  const betsRef = useRef(null);

  // Connect wallet via MetaMask
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

  // Fetch dashboard + bets (only update state when data actually changes to prevent flicker)
  const fetchData = useCallback(async () => {
    try {
      const [dashRes, betsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/bets/history'),
      ]);
      let updated = false;
      if (dashRes.ok) {
        const text = await dashRes.text();
        try {
          const dashData = JSON.parse(text);
          const dashJson = JSON.stringify(dashData);
          if (dashJson !== dashRef.current) {
            dashRef.current = dashJson;
            setDashboard(dashData);
            updated = true;
          }
        } catch { /* non-JSON response, skip */ }
      }
      if (betsRes.ok) {
        const text = await betsRes.text();
        try {
          const betsData = JSON.parse(text);
          const betsJson = JSON.stringify(betsData);
          if (betsJson !== betsRef.current) {
            betsRef.current = betsJson;
            setBets(betsData);
            updated = true;
          }
        } catch { /* non-JSON response, skip */ }
      }
      // Always update timestamp so "X seconds ago" resets
      setLastFetched(Date.now());
    } catch {
      // Retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 3s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isActive = dashboard?.agentStatus === 'active';

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-dark-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <Header account={account} onConnect={connectWallet} connecting={connecting} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <DisclaimerBanner />
        <LastUpdated timestamp={lastFetched} />
        <StatsCards dashboard={dashboard} bets={bets} />
        <ControlPanel account={account} dashboard={dashboard} onRefresh={fetchData} />
        {isActive && <CurrentRound bets={bets} />}
        <BetHistory bets={bets} />
      </main>

      <Footer />
    </div>
  );
}
