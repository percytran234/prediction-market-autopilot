import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { getDb } from './db/database.js';
import walletRoutes from './routes/walletRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import signalRoutes from './routes/signalRoutes.js';
import backtestRoutes from './routes/backtest.js';
import gatewayRoutes from './routes/gateway.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
app.use(backtestRoutes);
app.use(gatewayRoutes);

// Serve static frontend files from dist/
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Catch-all error handler — always return JSON
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on port ${config.port}`);
});
