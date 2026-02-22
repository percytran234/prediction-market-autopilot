import React from 'react';
import { useWallet } from './hooks/useWallet.js';
import { useDashboard } from './hooks/useDashboard.js';
import ConnectWallet from './components/ConnectWallet.jsx';
import DepositPanel from './components/DepositPanel.jsx';
import StrategySelector from './components/StrategySelector.jsx';
import AgentControl from './components/AgentControl.jsx';
import DashboardCards from './components/DashboardCards.jsx';
import BetHistoryTable from './components/BetHistoryTable.jsx';
import WithdrawPanel from './components/WithdrawPanel.jsx';

export default function App() {
  const wallet = useWallet();
  const { dashboard, bets, agentStatus, loading, refetch } = useDashboard(5000);

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      {/* Header */}
      <header className="border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Prediction Auto-Pilot</h1>
            <span className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded-full">
              DEMO
            </span>
          </div>
          <ConnectWallet
            account={wallet.account}
            connecting={wallet.connecting}
            error={wallet.error}
            onConnect={wallet.connect}
            isCorrectChain={wallet.isCorrectChain}
          />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <div className="text-center py-12 text-dark-muted">Loading dashboard...</div>
        ) : (
          <>
            {/* Dashboard Cards */}
            <DashboardCards dashboard={dashboard} />

            {/* Controls Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <AgentControl
                agentStatus={agentStatus}
                dashboard={dashboard}
                account={wallet.account}
                onAction={refetch}
              />
              <StrategySelector />
              <div className="space-y-4">
                <DepositPanel account={wallet.account} />
                <WithdrawPanel account={wallet.account} dashboard={dashboard} />
              </div>
            </div>

            {/* Bet History */}
            <BetHistoryTable bets={bets} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-dark-muted">
          This is a demo tool. Not financial advice. Only use funds you can afford to lose.
          <br />
          Mock mode — uses real BTC price data, simulated bets.
        </div>
      </footer>
    </div>
  );
}
