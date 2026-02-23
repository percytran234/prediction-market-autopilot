import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import StatsCards from './components/StatsCards.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import CurrentRound from './components/CurrentRound.jsx';
import BetHistory from './components/BetHistory.jsx';
import Footer from './components/Footer.jsx';

const POLYGON_AMOY_CHAIN_ID = '0x13882';
const POLL_INTERVAL = 3000;

export default function App() {
  const [account, setAccount] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [bets, setBets] = useState([]);

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

  // Fetch dashboard + bets
  const fetchData = useCallback(async () => {
    try {
      const [dashRes, betsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/bets/history'),
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (betsRes.ok) setBets(await betsRes.json());
    } catch {
      // Retry on next poll
    }
  }, []);

  // Poll every 3s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isActive = dashboard?.agentStatus === 'active';

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <Header account={account} onConnect={connectWallet} connecting={connecting} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <DisclaimerBanner />
        <StatsCards dashboard={dashboard} />
        <ControlPanel account={account} dashboard={dashboard} onRefresh={fetchData} />
        {isActive && <CurrentRound bets={bets} />}
        <BetHistory bets={bets} />
      </main>

      <Footer />
    </div>
  );
}
