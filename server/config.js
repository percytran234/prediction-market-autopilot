import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  polygonRpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/demo',
  walletPassword: process.env.WALLET_PASSWORD || 'dev-password',
  bettingMode: process.env.BETTING_MODE || 'mock',
  roundIntervalMinutes: parseInt(process.env.ROUND_INTERVAL_MINUTES || '1'),
  usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  polygonAmoyChainId: 80002,
};
