import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';

export default function DepositPanel({ account }) {
  const [walletInfo, setWalletInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWallet()
      .then(setWalletInfo)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
        <h3 className="text-lg font-semibold mb-4">Agent Wallet</h3>
        <p className="text-dark-muted text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <h3 className="text-lg font-semibold mb-4">Agent Wallet</h3>
      {walletInfo && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-dark-muted uppercase tracking-wide">Agent Address</label>
            <p className="text-sm font-mono mt-1 break-all">{walletInfo.address}</p>
          </div>
          <div>
            <label className="text-xs text-dark-muted uppercase tracking-wide">Balance</label>
            <p className="text-sm mt-1">{parseFloat(walletInfo.balanceMatic).toFixed(4)} POL</p>
          </div>
          {account && (
            <div>
              <label className="text-xs text-dark-muted uppercase tracking-wide">Your Address</label>
              <p className="text-sm font-mono mt-1">{account}</p>
            </div>
          )}
          <p className="text-xs text-dark-muted mt-2">
            Send test POL to the agent address above to fund the agent. Use Polygon Amoy faucet for test tokens.
          </p>
        </div>
      )}
    </div>
  );
}
