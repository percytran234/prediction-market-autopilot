import { getCurrentBTCPrice } from '../signals/priceService.js';
import { config } from '../config.js';

export async function resolveBet(direction, btcPriceAtBet) {
  const currentPrice = await getCurrentBTCPrice();

  let result;
  if (direction === 'UP') {
    result = currentPrice > btcPriceAtBet ? 'WIN' : 'LOSS';
  } else {
    result = currentPrice < btcPriceAtBet ? 'WIN' : 'LOSS';
  }

  // If price hasn't changed, count as loss
  if (currentPrice === btcPriceAtBet) {
    result = 'LOSS';
  }

  return {
    result,
    btcPriceEnd: currentPrice,
    priceChange: currentPrice - btcPriceAtBet,
    priceChangePercent: ((currentPrice - btcPriceAtBet) / btcPriceAtBet) * 100,
  };
}
