import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

export function useDashboard(pollInterval = 5000) {
  const [dashboard, setDashboard] = useState(null);
  const [bets, setBets] = useState([]);
  const [agentStatus, setAgentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashData, betsData, statusData] = await Promise.all([
        api.getDashboard(),
        api.getBetHistory(),
        api.getAgentStatus(),
      ]);
      setDashboard(dashData);
      setBets(betsData);
      setAgentStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchData, pollInterval]);

  return { dashboard, bets, agentStatus, loading, error, refetch: fetchData };
}
