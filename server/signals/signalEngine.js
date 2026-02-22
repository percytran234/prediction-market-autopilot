import { fetchBTCKlines } from './priceService.js';
import { calculateEMA, calculateRSI, calculateVolumeRatio } from './indicators.js';

export async function computeSignals() {
  const klines = await fetchBTCKlines('1m', 60);

  const closes = klines.map(k => parseFloat(k[4]));
  const volumes = klines.map(k => parseFloat(k[5]));
  const currentPrice = closes[closes.length - 1];

  const ema5 = calculateEMA(closes, 5);
  const ema15 = calculateEMA(closes, 15);
  const rsi = calculateRSI(closes, 14);
  const volumeRatio = calculateVolumeRatio(volumes);

  // Weighted scoring
  let score = 0;

  // Momentum (30%) — EMA crossover
  if (ema5 > ema15) score += 30;
  else score -= 30;

  // RSI (25%)
  if (rsi < 30) score += 25;       // oversold → bounce UP
  else if (rsi > 70) score -= 25;  // overbought → pullback DOWN
  else {
    // Partial score based on distance from 50
    score += ((50 - rsi) / 50) * 25;
  }

  // Volume (20%) — amplifies momentum direction
  if (volumeRatio > 1.5) {
    score += 20 * (ema5 > ema15 ? 1 : -1);
  } else if (volumeRatio > 1.2) {
    score += 10 * (ema5 > ema15 ? 1 : -1);
  }

  // Market momentum (25%) — price vs recent average
  const recentAvg = closes.slice(-15).reduce((a, b) => a + b, 0) / 15;
  if (currentPrice > recentAvg) score += 25;
  else score -= 25;

  // Normalize
  const confidence = Math.min(100, Math.abs(score));
  const direction = score >= 0 ? 'UP' : 'DOWN';

  return {
    confidence,
    direction,
    currentPrice,
    signals: {
      ema5: parseFloat(ema5.toFixed(2)),
      ema15: parseFloat(ema15.toFixed(2)),
      rsi: parseFloat(rsi.toFixed(2)),
      volumeRatio: parseFloat(volumeRatio.toFixed(2)),
      momentum: ema5 > ema15 ? 'BULLISH' : 'BEARISH',
    },
    timestamp: new Date().toISOString(),
  };
}
