import { config } from '../config.js';

export async function fetchBTCKlines(interval = '1m', limit = 60) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (config.bettingMode === 'mock') {
      return generateMockKlines(limit);
    }
    throw err;
  }
}

export async function getCurrentBTCPrice() {
  try {
    const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = await res.json();
    return parseFloat(data.price);
  } catch (err) {
    if (config.bettingMode === 'mock') {
      return getMockPrice();
    }
    throw err;
  }
}

// Mock data for development / blocked environments
let mockBasePrice = 95000 + Math.random() * 5000;

function getMockPrice() {
  mockBasePrice += (Math.random() - 0.495) * 50;
  return parseFloat(mockBasePrice.toFixed(2));
}

function generateMockKlines(count) {
  const klines = [];
  let price = mockBasePrice - count * 10;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.495) * 80;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 30;
    const low = Math.min(open, close) - Math.random() * 30;
    const volume = 10 + Math.random() * 50;
    const timestamp = now - (count - i) * 60000;

    klines.push([
      timestamp,           // 0: open time
      open.toFixed(2),     // 1: open
      high.toFixed(2),     // 2: high
      low.toFixed(2),      // 3: low
      close.toFixed(2),    // 4: close
      volume.toFixed(4),   // 5: volume
      timestamp + 59999,   // 6: close time
      '0',                 // 7: quote asset volume
      Math.floor(Math.random() * 100), // 8: number of trades
      '0', '0', '0',      // 9-11: unused
    ]);

    price = close;
  }

  mockBasePrice = price;
  return klines;
}
