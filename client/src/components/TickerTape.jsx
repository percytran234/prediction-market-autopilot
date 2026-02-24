import React, { useState, useEffect, useRef } from 'react';
import { getCurrentBTCPrice } from '../engine/priceService.js';

export default function TickerTape() {
  const [price, setPrice] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function tick() {
      try {
        const p = await getCurrentBTCPrice();
        if (mounted) {
          setPrevPrice(prev => prev || p);
          setPrice(p);
        }
      } catch {}
    }
    tick();
    intervalRef.current = setInterval(tick, 5000);
    return () => { mounted = false; clearInterval(intervalRef.current); };
  }, []);

  const change = price && prevPrice ? price - prevPrice : 0;
  const isUp = change >= 0;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="h-6 bg-[#050f05] border-b border-dark-border overflow-hidden flex items-center">
      <div className="ticker-scroll flex items-center gap-8 px-4 whitespace-nowrap text-[10px] font-mono">
        <span className="text-dark-muted">BTC/USDT</span>
        {price ? (
          <>
            <span className={isUp ? 'neon-green' : 'neon-red'}>
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`${isUp ? 'text-accent-green' : 'text-accent-red'}`}>
              {isUp ? '\u25B2' : '\u25BC'} {Math.abs(change).toFixed(2)}
            </span>
          </>
        ) : (
          <span className="text-dark-muted">Loading...</span>
        )}
        <span className="text-dark-muted/50">{timeStr} UTC</span>
        <span className="text-[#1e3320]">|</span>
        <span className="text-dark-muted">ETH/USDT</span>
        <span className="text-dark-muted/50">—</span>
        <span className="text-[#1e3320]">|</span>
        <span className="text-dark-muted">SOL/USDT</span>
        <span className="text-dark-muted/50">—</span>
        <span className="text-[#1e3320]">|</span>
        <span className="text-[#00e676]/60">PREDICTION AGENT PRO</span>
        <span className="text-[#1e3320]">|</span>
        <span className="text-dark-muted">BTC/USDT</span>
        {price ? (
          <>
            <span className={isUp ? 'neon-green' : 'neon-red'}>
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
