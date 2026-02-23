// Client-side signal engine (ported from server/signals/signalEngine.js)

import { fetchBTCKlines } from './priceService.js';
import { calculateEMA, calculateRSI, calculateVolumeRatio } from './indicators.js';

export async function computeSignals(klines) {
  if (!klines) {
    klines = await fetchBTCKlines('1m', 60);
  }

  const closes = klines.map(k => parseFloat(k[4]));
  const volumes = klines.map(k => parseFloat(k[5]));

  const ema5 = calculateEMA(closes, 5);
  const ema15 = calculateEMA(closes, 15);
  const rsi = calculateRSI(closes, 14);
  const volumeRatio = calculateVolumeRatio(volumes, 15);

  const emaSignal = ema5 > ema15 ? 'BULLISH' : 'BEARISH';
  const rsiSignal = rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL';
  const volumeSignal = volumeRatio > 1.5 ? 'SPIKE' : 'NORMAL';

  let score = 0;
  if (emaSignal === 'BULLISH') score += 30; else score -= 30;
  if (rsiSignal === 'OVERSOLD') score += 25;
  else if (rsiSignal === 'OVERBOUGHT') score -= 25;
  else score += ((50 - rsi) / 50) * 25;
  if (volumeSignal === 'SPIKE') score += 20 * (emaSignal === 'BULLISH' ? 1 : -1);
  else if (volumeRatio > 1.2) score += 10 * (emaSignal === 'BULLISH' ? 1 : -1);
  const recentAvg = closes.slice(-15).reduce((a, b) => a + b, 0) / 15;
  const currentPrice = closes[closes.length - 1];
  if (currentPrice > recentAvg) score += 25; else score -= 25;

  const confidence = Math.min(100, Math.abs(score));
  const direction = score >= 0 ? 'UP' : 'DOWN';

  const parts = [];
  if (rsiSignal !== 'NEUTRAL') parts.push(`RSI ${rsi.toFixed(0)} (${rsiSignal.toLowerCase()})`);
  else parts.push(`RSI ${rsi.toFixed(0)}`);
  parts.push(`EMA ${emaSignal.toLowerCase()} crossover`);
  if (volumeSignal === 'SPIKE') parts.push(`volume spike ${volumeRatio.toFixed(1)}x`);
  const action = confidence >= 60 ? `BET ${direction}` : 'SKIP';
  const reasoning = `${parts.join(' + ')} → ${action}`;

  return {
    confidence,
    direction,
    signals: {
      ema5: parseFloat(ema5.toFixed(2)),
      ema15: parseFloat(ema15.toFixed(2)),
      emaSignal,
      rsi: parseFloat(rsi.toFixed(2)),
      rsiSignal,
      volumeRatio: parseFloat(volumeRatio.toFixed(2)),
      volumeSignal,
    },
    reasoning,
    currentPrice,
  };
}
