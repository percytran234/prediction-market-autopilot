import express from 'express';
import cors from 'cors';
import { getDb } from '../server/db/database.js';
import walletRoutes from '../server/routes/walletRoutes.js';
import agentRoutes from '../server/routes/agentRoutes.js';
import dashboardRoutes from '../server/routes/dashboardRoutes.js';
import signalRoutes from '../server/routes/signalRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database
getDb();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use(walletRoutes);
app.use(agentRoutes);
app.use(dashboardRoutes);
app.use(signalRoutes);

export default app;
