import { Router } from 'express';
import { getAgentWalletBalance } from '../wallet/agentWallet.js';
import { withdrawToUser } from '../wallet/withdraw.js';

const router = Router();

router.get('/api/wallet', async (req, res) => {
  try {
    const walletInfo = await getAgentWalletBalance();
    res.json(walletInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/withdraw', async (req, res) => {
  try {
    const { userAddress } = req.body;
    if (!userAddress) return res.status(400).json({ error: 'userAddress required' });
    const result = await withdrawToUser(userAddress);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
