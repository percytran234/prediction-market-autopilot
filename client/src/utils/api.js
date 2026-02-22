const BASE_URL = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Health
  health: () => request('/health'),

  // Wallet
  getWallet: () => request('/wallet'),
  withdraw: (userAddress) => request('/withdraw', {
    method: 'POST',
    body: JSON.stringify({ userAddress }),
  }),

  // Agent
  startAgent: (userAddress, bankroll) => request('/agent/start', {
    method: 'POST',
    body: JSON.stringify({ userAddress, bankroll }),
  }),
  stopAgent: () => request('/agent/stop', { method: 'POST' }),
  getAgentStatus: () => request('/agent/status'),

  // Dashboard
  getDashboard: () => request('/dashboard'),
  getBetHistory: () => request('/bets/history'),
  getCurrentSignals: () => request('/signals/current'),
};
