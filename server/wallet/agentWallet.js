import { ethers } from 'ethers';
import crypto from 'crypto';
import { config } from '../config.js';
import { getWallet, saveWallet } from '../db/models.js';

let cachedWallet = null;

function getProvider() {
  return new ethers.JsonRpcProvider(config.polygonRpcUrl);
}

function encrypt(text, password) {
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(data, password) {
  const key = crypto.scryptSync(password, 'salt', 32);
  const [ivHex, encrypted] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function getOrCreateWallet() {
  if (cachedWallet) return cachedWallet;

  const stored = getWallet();
  if (stored) {
    const privateKey = decrypt(stored.encrypted_key, config.walletPassword);
    const provider = getProvider();
    cachedWallet = new ethers.Wallet(privateKey, provider);
    return cachedWallet;
  }

  const provider = getProvider();
  const wallet = ethers.Wallet.createRandom().connect(provider);
  const encryptedKey = encrypt(wallet.privateKey, config.walletPassword);
  saveWallet(wallet.address, encryptedKey);
  cachedWallet = wallet;
  console.log(`New agent wallet created: ${wallet.address}`);
  return wallet;
}

export function getWalletAddress() {
  return getOrCreateWallet().address;
}

export async function getWalletBalance() {
  const wallet = getOrCreateWallet();
  try {
    const balance = await wallet.provider.getBalance(wallet.address);
    return {
      address: wallet.address,
      balance: ethers.formatEther(balance),
    };
  } catch {
    return {
      address: wallet.address,
      balance: '0.0',
    };
  }
}
