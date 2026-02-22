import React, { useState } from 'react';
import { api } from '../utils/api.js';

export default function AgentControl({ agentStatus, dashboard, account, onAction }) {
  const [loading, setLoading] = useState(false);
  const [bankroll, setBankroll] = useState('100');

  const isActive = agentStatus?.isActive;
  const status = dashboard?.status || 'idle';

  async function handleStart() {
    setLoading(true);
    try {
      await api.startAgent(account, parseFloat(bankroll));
      onAction?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    try {
      await api.stopAgent();
      onAction?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusColors = {
    active: 'bg-accent-green',
    stopped: 'bg-accent-red',
    idle: 'bg-dark-muted',
    paused: 'bg-accent-yellow',
  };

  const statusLabels = {
    active: 'ACTIVE',
    stopped: 'STOPPED',
    idle: 'IDLE',
    paused: 'PAUSED',
  };

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Agent Control</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status] || statusColors.idle} ${isActive ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium">{statusLabels[status] || 'IDLE'}</span>
        </div>
      </div>

      {dashboard?.stopReason && status === 'stopped' && (
        <div className="mb-4 p-3 bg-dark-bg rounded-lg text-sm">
          <span className="text-dark-muted">Stopped: </span>
          <span className="text-accent-yellow">
            {dashboard.stopReason.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {!isActive && (
        <div className="mb-4">
          <label className="text-xs text-dark-muted uppercase tracking-wide">Starting Bankroll ($)</label>
          <input
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            className="mt-1 w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
            min="1"
          />
        </div>
      )}

      <div className="flex gap-3">
        {!isActive ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-accent-green hover:bg-green-600 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Agent'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-accent-red hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Stopping...' : 'Stop Agent'}
          </button>
        )}
      </div>
    </div>
  );
}
