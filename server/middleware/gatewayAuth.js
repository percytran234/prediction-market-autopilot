import crypto from 'crypto';
import { getDb } from '../db/database.js';

// In-memory rate limit store: { [agentId]: { count, windowStart } }
const rateLimits = {};
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60000;

export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function gatewayAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  const keyHash = hashApiKey(apiKey);
  const agent = getDb().prepare('SELECT * FROM agents WHERE api_key_hash = ?').get(keyHash);
  if (!agent) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Rate limiting
  const now = Date.now();
  if (!rateLimits[agent.agent_id]) {
    rateLimits[agent.agent_id] = { count: 0, windowStart: now };
  }
  const bucket = rateLimits[agent.agent_id];
  if (now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count++;
  if (bucket.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 60 requests per minute.' });
  }

  req.agent = agent;
  req.agent.parsedConfig = JSON.parse(agent.config || '{}');
  next();
}
