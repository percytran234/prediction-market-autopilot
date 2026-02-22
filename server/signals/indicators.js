/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Relative Strength Index
 */
export function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50; // neutral if not enough data

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Initial average gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothed RSI
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] >= 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate volume ratio (current vs average)
 */
export function calculateVolumeRatio(volumes, lookback = 60) {
  if (volumes.length < 2) return 1;

  const recent = volumes.slice(-15);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

  const historical = volumes.slice(0, -15);
  if (historical.length === 0) return 1;
  const historicalAvg = historical.reduce((a, b) => a + b, 0) / historical.length;

  if (historicalAvg === 0) return 1;
  return recentAvg / historicalAvg;
}
