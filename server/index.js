import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { getDb } from './db/database.js';
import walletRoutes from './routes/walletRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import signalRoutes from './routes/signalRoutes.js';

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

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on port ${config.port}`);
});
