import { Router } from 'express';
import { startAgentLoop, stopAgentLoop, getAgentStatus } from '../agent/agentLoop.js';
import { createSession, getLatestSession, updateSession, getActiveSession } from '../db/models.js';

const router = Router();

router.post('/api/agent/start', (req, res) => {
  try {
    const { userAddress, bankroll } = req.body;

    // Check if already running
    const status = getAgentStatus();
    if (status.isActive) {
      return res.status(400).json({ error: 'Agent already running' });
    }

    // Create or reuse session
    let session = getLatestSession();
    if (!session || session.status === 'stopped') {
      const depositAmount = bankroll || 100;
      const sessionId = createSession(userAddress || '0x0', depositAmount);
      session = { id: sessionId };
    } else {
      updateSession(session.id, { status: 'active', stop_reason: null });
    }

    startAgentLoop(session.id);
    res.json({ success: true, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/agent/stop', (req, res) => {
  try {
    stopAgentLoop('USER_STOPPED');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/agent/status', (req, res) => {
  try {
    const status = getAgentStatus();
    const session = status.sessionId
      ? (() => { try { return getActiveSession() || getLatestSession(); } catch { return null; } })()
      : getLatestSession();

    res.json({
      ...status,
      session: session || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
