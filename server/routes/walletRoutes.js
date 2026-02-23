import { Router } from 'express';
import { getWalletBalance } from '../wallet/agentWallet.js';
import { withdrawToUser } from '../wallet/withdraw.js';
import { createSession, getLatestSession, updateSession } from '../db/models.js';

const router = Router();

router.get('/api/wallet', async (req, res) => {
  try {
    const info = await getWalletBalance();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/wallet/deposit', (req, res) => {
  try {
    const { userAddress, amount } = req.body;
    if (!userAddress || !amount) {
      return res.status(400).json({ error: 'userAddress and amount required' });
    }

    const depositAmount = parseFloat(amount);
    const existing = getLatestSession();

    if (existing && existing.status !== 'stopped' && existing.status !== 'withdrawn') {
      const newBankroll = existing.bankroll + depositAmount;
      updateSession(existing.id, {
        deposit_amount: existing.deposit_amount + depositAmount,
        bankroll: newBankroll,
      });
      res.json({ sessionId: existing.id, bankroll: newBankroll });
    } else {
      const sessionId = createSession(userAddress, depositAmount);
      res.json({ sessionId, bankroll: depositAmount });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/wallet/withdraw', async (req, res) => {
  try {
    const { userAddress, amount } = req.body;
    if (!userAddress) {
      return res.status(400).json({ error: 'userAddress required' });
    }
    const result = await withdrawToUser(userAddress, amount ? parseFloat(amount) : undefined);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/wallet/mock-deposit', (req, res) => {
  try {
    const { userAddress, amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: 'amount required' });
    }

    const depositAmount = parseFloat(amount);
    const addr = userAddress || '0x0000000000000000000000000000000000000000';
    const sessionId = createSession(addr, depositAmount);
    res.json({ sessionId, bankroll: depositAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
