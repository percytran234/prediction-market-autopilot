import { useState, useCallback } from 'react';

const POLYGON_AMOY = {
  chainId: '0x13882',
  chainName: 'Polygon Amoy Testnet',
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
};

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not detected. Please install MetaMask.');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setAccount(accounts[0]);

      const currentChainId = await window.ethereum.request({
        method: 'eth_chainId',
      });
      setChainId(currentChainId);

      // Switch to Polygon Amoy if not already on it
      if (currentChainId !== POLYGON_AMOY.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_AMOY.chainId }],
          });
          setChainId(POLYGON_AMOY.chainId);
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [POLYGON_AMOY],
            });
            setChainId(POLYGON_AMOY.chainId);
          }
        }
      }

      // Listen for changes
      window.ethereum.on('accountsChanged', (accs) => {
        setAccount(accs[0] || null);
      });
      window.ethereum.on('chainChanged', (chain) => {
        setChainId(chain);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
  }, []);

  return {
    account,
    chainId,
    connecting,
    error,
    connect,
    disconnect,
    isCorrectChain: chainId === POLYGON_AMOY.chainId,
  };
}
