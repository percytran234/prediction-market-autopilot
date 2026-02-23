import React from 'react';

export default function Header({ account, onConnect, onDisconnect, connecting }) {
  function handleConnect() {
    if (!window.ethereum) {
      alert('Please install MetaMask to connect your wallet.');
      return;
    }
    onConnect();
  }

  const truncated = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <h1 className="text-lg font-semibold tracking-tight">Prediction Agent</h1>
          <span className="text-[10px] font-medium px-2 py-0.5 bg-accent-blue/15 text-accent-blue rounded-full border border-accent-blue/20">
            MVP
          </span>
        </div>

        {account ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg rounded-lg border border-dark-border">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-sm font-mono text-dark-muted">{truncated}</span>
            </div>
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/30 transition-colors"
              title="Disconnect wallet"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-4 py-1.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}
