import React, { useState } from 'react';

export default function ControlPanel({ engine, account, dashboard }) {
  const [depositAmount, setDepositAmount] = useState('100');
  const [loading, setLoading] = useState(null);

  const agentStatus = dashboard?.agentStatus || 'idle';
  const isActive = agentStatus === 'active';
  const hasBalance = (dashboard?.bankroll || 0) > 0;

  function handleDeposit() {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    setLoading('deposit');
    engine.deposit(amt);
    setDepositAmount('100');
    setLoading(null);
  }

  function handleStart() {
    setLoading('start');
    engine.start();
    setLoading(null);
  }

  function handleStop() {
    setLoading('stop');
    engine.stop();
    setLoading(null);
  }

  function handleWithdraw() {
    if (!confirm('Withdraw all funds and stop the agent?')) return;
    setLoading('withdraw');
    engine.withdraw();
    setLoading(null);
  }

  function handleReset() {
    if (!confirm('Reset all data? This clears bet history and bankroll.')) return;
    engine.reset();
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!hasBalance && !isActive ? (
            /* Initial deposit form */
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="100"
                className="w-24 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:border-accent-blue"
              />
              <button
                onClick={handleDeposit}
                disabled={loading === 'deposit'}
                className="px-4 py-1.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-40"
              >
                {loading === 'deposit' ? '...' : '💰 Deposit (Demo)'}
              </button>
            </div>
          ) : isActive ? (
            <button
              onClick={handleStop}
              disabled={loading === 'stop'}
              className="px-4 py-1.5 bg-accent-red/10 text-accent-red text-sm font-medium rounded-lg border border-accent-red/30 hover:bg-accent-red/20 transition-colors disabled:opacity-40"
            >
              {loading === 'stop' ? 'Stopping...' : '⏹️ Stop Agent'}
            </button>
          ) : (
            <>
              <button
                onClick={handleStart}
                disabled={loading === 'start' || !hasBalance}
                className="px-4 py-1.5 bg-accent-green/10 text-accent-green text-sm font-medium rounded-lg border border-accent-green/30 hover:bg-accent-green/20 transition-colors disabled:opacity-40"
              >
                {loading === 'start' ? 'Starting...' : '▶️ Start Agent'}
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading === 'withdraw' || !hasBalance}
                className="px-4 py-1.5 bg-transparent text-accent-blue text-sm font-medium rounded-lg border border-accent-blue/30 hover:bg-accent-blue/10 transition-colors disabled:opacity-40"
              >
                {loading === 'withdraw' ? '...' : '💸 Withdraw All'}
              </button>
              {/* Additional deposit */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:border-accent-blue"
                />
                <button
                  onClick={handleDeposit}
                  disabled={loading === 'deposit'}
                  className="px-3 py-1.5 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-[#1e2130] transition-colors disabled:opacity-40"
                >
                  +Deposit
                </button>
              </div>
            </>
          )}

          {/* Reset button */}
          {!isActive && (dashboard?.bankroll === 0 || agentStatus === 'withdrawn') && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/30 transition-colors"
            >
              Reset Demo
            </button>
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
