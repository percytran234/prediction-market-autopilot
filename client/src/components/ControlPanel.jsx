import React, { useState } from 'react';

export default function ControlPanel({ account, dashboard, onRefresh }) {
  const [depositAmount, setDepositAmount] = useState('100');
  const [loading, setLoading] = useState(null);

  const agentStatus = dashboard?.agentStatus || 'idle';
  const isActive = agentStatus === 'active';
  const hasSession = dashboard?.bankroll > 0;
  const disabled = !account;

  async function handleStart() {
    setLoading('start');
    try {
      await fetch('/api/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account, bankroll: dashboard?.bankroll }),
      });
      onRefresh();
    } catch (err) {
      console.error('Start failed:', err);
    }
    setLoading(null);
  }

  async function handleStop() {
    setLoading('stop');
    try {
      await fetch('/api/agent/stop', { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error('Stop failed:', err);
    }
    setLoading(null);
  }

  async function handleWithdraw() {
    if (!confirm('Withdraw all funds and stop the agent?')) return;
    setLoading('withdraw');
    try {
      await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account }),
      });
      onRefresh();
    } catch (err) {
      console.error('Withdraw failed:', err);
    }
    setLoading(null);
  }

  async function handleDeposit() {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    setLoading('deposit');
    try {
      await fetch('/api/wallet/mock-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, userAddress: account || '0x0' }),
      });
      setDepositAmount('100');
      onRefresh();
    } catch (err) {
      console.error('Deposit failed:', err);
    }
    setLoading(null);
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!hasSession && !isActive ? (
            /* Deposit form when no session */
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="100"
                disabled={disabled}
                className="w-24 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:border-accent-blue disabled:opacity-40"
              />
              <button
                onClick={handleDeposit}
                disabled={disabled || loading === 'deposit'}
                className="px-4 py-1.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-40"
              >
                {loading === 'deposit' ? '...' : '💰 Deposit'}
              </button>
            </div>
          ) : isActive ? (
            <button
              onClick={handleStop}
              disabled={disabled || loading === 'stop'}
              className="px-4 py-1.5 bg-accent-red/10 text-accent-red text-sm font-medium rounded-lg border border-accent-red/30 hover:bg-accent-red/20 transition-colors disabled:opacity-40"
            >
              {loading === 'stop' ? 'Stopping...' : '⏹️ Stop Agent'}
            </button>
          ) : (
            <>
              <button
                onClick={handleStart}
                disabled={disabled || loading === 'start' || !hasSession}
                className="px-4 py-1.5 bg-accent-green/10 text-accent-green text-sm font-medium rounded-lg border border-accent-green/30 hover:bg-accent-green/20 transition-colors disabled:opacity-40"
              >
                {loading === 'start' ? 'Starting...' : '▶️ Start Agent'}
              </button>
              <button
                onClick={handleWithdraw}
                disabled={disabled || loading === 'withdraw' || !hasSession}
                className="px-4 py-1.5 bg-transparent text-accent-blue text-sm font-medium rounded-lg border border-accent-blue/30 hover:bg-accent-blue/10 transition-colors disabled:opacity-40"
              >
                {loading === 'withdraw' ? '...' : '💰 Withdraw'}
              </button>
              {/* Allow additional deposit */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:border-accent-blue"
                />
                <button
                  onClick={handleDeposit}
                  disabled={disabled || loading === 'deposit'}
                  className="px-3 py-1.5 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-dark-hover transition-colors disabled:opacity-40"
                >
                  +Deposit
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Strategy summary */}
        <p className="text-xs text-dark-muted whitespace-nowrap">
          Safe Mode: 2% bet size &middot; -10% loss limit &middot; +5% profit target
        </p>
      </div>
    </div>
  );
}
