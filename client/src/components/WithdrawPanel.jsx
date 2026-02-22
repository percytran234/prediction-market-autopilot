import React, { useState } from 'react';
import { api } from '../utils/api.js';

export default function WithdrawPanel({ account, dashboard }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleWithdraw() {
    if (!account) {
      alert('Connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const res = await api.withdraw(account);
      setResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isActive = dashboard?.status === 'active';

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <h3 className="text-lg font-semibold mb-4">Withdraw</h3>
      {result ? (
        <div className="space-y-2">
          <p className="text-accent-green text-sm">Withdrawal successful!</p>
          <p className="text-xs text-dark-muted">Amount: {result.amount} POL</p>
          <p className="text-xs text-dark-muted font-mono break-all">TX: {result.txHash}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-dark-muted mb-4">
            Withdraw agent wallet balance back to your connected wallet.
          </p>
          <button
            onClick={handleWithdraw}
            disabled={loading || isActive || !account}
            className="w-full px-4 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isActive ? 'Stop agent first' : 'Withdraw All'}
          </button>
        </>
      )}
    </div>
  );
}
