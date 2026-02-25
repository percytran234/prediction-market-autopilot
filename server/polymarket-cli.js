import { execSync } from 'child_process';

let lastCallTime = 0;
const COOLDOWN_MS = 2000;

function rateLimitWait() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < COOLDOWN_MS) {
    const waitMs = COOLDOWN_MS - elapsed;
    execSync(`sleep ${waitMs / 1000}`);
  }
  lastCallTime = Date.now();
}

function runCli(args, timeoutMs = 30000) {
  rateLimitWait();
  try {
    const result = execSync(`polymarket ${args}`, {
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result.trim());
  } catch (err) {
    if (err.killed) {
      throw new Error(`CLI timeout after ${timeoutMs}ms: polymarket ${args}`);
    }
    // Try to parse stderr for CLI-specific errors
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    // CLI might output JSON even on non-zero exit
    if (stdout.trim()) {
      try { return JSON.parse(stdout.trim()); } catch {}
    }
    throw new Error(`CLI error: ${stderr || err.message}`);
  }
}

function runCliRaw(args, timeoutMs = 30000) {
  rateLimitWait();
  try {
    return execSync(`polymarket ${args}`, {
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    const stdout = err.stdout?.toString()?.trim() || '';
    if (stdout) return stdout;
    throw new Error(`CLI error: ${err.stderr?.toString() || err.message}`);
  }
}

// ─── Health Check ───

export function healthCheck() {
  try {
    const result = runCliRaw('clob ok');
    return { ok: true, response: result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function isCliInstalled() {
  try {
    execSync('which polymarket', { encoding: 'utf-8', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// ─── Wallet ───

export function walletInfo() {
  try {
    const result = runCliRaw('wallet show');
    return { ok: true, response: result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function checkApprovals() {
  try {
    const result = runCliRaw('approve check');
    return { ok: true, response: result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── DATA (no wallet needed) ───

export function searchMarkets(query, limit = 10) {
  return runCli(`-o json markets search "${query.replace(/"/g, '\\"')}" --limit ${limit}`);
}

export function getMarket(idOrSlug) {
  return runCli(`-o json markets get ${idOrSlug}`);
}

export function getMidpoint(tokenId) {
  return runCli(`-o json clob midpoint ${tokenId}`);
}

export function getSpread(tokenId) {
  return runCli(`-o json clob spread ${tokenId}`);
}

export function getOrderBook(tokenId) {
  return runCli(`-o json clob book ${tokenId}`);
}

export function getPriceHistory(tokenId, interval = '1m', fidelity = 30) {
  return runCli(`-o json clob price-history ${tokenId} --interval ${interval} --fidelity ${fidelity}`);
}

// ─── EXECUTION (wallet required) ───

export function marketOrder(tokenId, side, amount) {
  return runCli(`-o json clob market-order --token ${tokenId} --side ${side} --amount ${amount}`);
}

export function limitOrder(tokenId, side, price, size) {
  return runCli(`-o json clob create-order --token ${tokenId} --side ${side} --price ${price} --size ${size}`);
}

export function cancelOrder(orderId) {
  return runCli(`-o json clob cancel ${orderId}`);
}

export function cancelAll() {
  return runCli('-o json clob cancel-all');
}

// ─── PORTFOLIO (wallet required) ───

export function getBalance() {
  return runCli('-o json clob balance --asset-type collateral');
}

export function getOrders() {
  return runCli('-o json clob orders');
}

export function getTrades() {
  return runCli('-o json clob trades');
}

export function getPositions(walletAddress) {
  return runCli(`-o json data positions ${walletAddress}`);
}

export function getPortfolioValue(walletAddress) {
  return runCli(`-o json data value ${walletAddress}`);
}
