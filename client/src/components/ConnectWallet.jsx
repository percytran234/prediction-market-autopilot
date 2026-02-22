import React from 'react';

export default function ConnectWallet({ account, connecting, error, onConnect, isCorrectChain }) {
  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isCorrectChain ? 'bg-accent-green' : 'bg-accent-yellow'}`} />
        <span className="text-sm text-dark-muted">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        {!isCorrectChain && (
          <span className="text-xs text-accent-yellow">Wrong network</span>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onConnect}
        disabled={connecting}
        className="px-4 py-2 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p className="text-xs text-accent-red mt-1">{error}</p>}
    </div>
  );
}
