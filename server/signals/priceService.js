export async function fetchBTCKlines(interval = '1m', limit = 60) {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  return await res.json();
}

export async function getCurrentBTCPrice() {
  const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const data = await res.json();
  return parseFloat(data.price);
}
