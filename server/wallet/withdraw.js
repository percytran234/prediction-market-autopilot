import { ethers } from 'ethers';
import { loadAgentWallet } from './agentWallet.js';

export async function withdrawToUser(userAddress) {
  const wallet = loadAgentWallet();
  if (!wallet) throw new Error('Agent wallet not initialized');

  const balance = await wallet.provider.getBalance(wallet.address);
  if (balance === BigInt(0)) throw new Error('No balance to withdraw');

  // Estimate gas and subtract from balance
  const gasPrice = await wallet.provider.getFeeData();
  const gasLimit = BigInt(21000);
  const gasCost = gasLimit * (gasPrice.gasPrice || BigInt(0));
  const sendAmount = balance - gasCost;

  if (sendAmount <= BigInt(0)) throw new Error('Balance too low to cover gas');

  const tx = await wallet.sendTransaction({
    to: userAddress,
    value: sendAmount,
    gasLimit,
  });

  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    amount: ethers.formatEther(sendAmount),
  };
}
