import { ethers } from 'ethers';
import { config } from '../config.js';
import { getWallet, saveWallet } from '../db/models.js';

let cachedWallet = null;

function getProvider() {
  return new ethers.JsonRpcProvider(config.polygonRpcUrl);
}

export function createAgentWallet() {
  const provider = getProvider();
  const wallet = ethers.Wallet.createRandom().connect(provider);
  saveWallet(wallet.address, wallet.privateKey);
  cachedWallet = wallet;
  return wallet;
}

export function loadAgentWallet() {
  if (cachedWallet) return cachedWallet;

  const stored = getWallet();
  if (!stored) return null;

  const provider = getProvider();
  const wallet = new ethers.Wallet(stored.encrypted_key, provider);
  cachedWallet = wallet;
  return wallet;
}

export function getOrCreateAgentWallet() {
  const existing = loadAgentWallet();
  if (existing) return existing;
  return createAgentWallet();
}

export async function getAgentWalletBalance() {
  const wallet = getOrCreateAgentWallet();
  try {
    const balance = await wallet.provider.getBalance(wallet.address);
    return {
      address: wallet.address,
      balanceWei: balance.toString(),
      balanceMatic: ethers.formatEther(balance),
    };
  } catch {
    return {
      address: wallet.address,
      balanceWei: '0',
      balanceMatic: '0.0',
    };
  }
}
