// Client-side BTC price service — fetches directly from Binance (CORS-friendly)

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
      timestamp, open.toFixed(2), high.toFixed(2), low.toFixed(2),
      close.toFixed(2), volume.toFixed(4), timestamp + 59999,
      '0', Math.floor(Math.random() * 100), '0', '0', '0',
    ]);
    price = close;
  }
  mockBasePrice = price;
  return klines;
}

export async function fetchBTCKlines(interval = '1m', limit = 60) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Binance API ${res.status}`);
    return await res.json();
  } catch {
    return generateMockKlines(limit);
  }
}

export async function getCurrentBTCPrice() {
  try {
    const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Binance API ${res.status}`);
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return getMockPrice();
  }
}
