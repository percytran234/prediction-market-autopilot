import { Router } from 'express';
import { computeSignals } from '../signals/signalEngine.js';

const router = Router();

router.get('/api/signals/current', async (req, res) => {
  try {
    const result = await computeSignals();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
