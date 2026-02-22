import { getOrCreateAgentWallet } from './agentWallet.js';

export async function checkDeposits() {
  const wallet = getOrCreateAgentWallet();
  try {
    const balance = await wallet.provider.getBalance(wallet.address);
    return balance;
  } catch {
    return BigInt(0);
  }
}
