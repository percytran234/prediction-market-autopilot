import { Router } from 'express';
import { getWalletBalance } from '../wallet/agentWallet.js';
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

    if (existing && existing.status !== 'stopped') {
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

export default router;
