import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getCurrentBTCPrice } from '../engine/priceService.js';

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-dark-muted mb-1">{formatTime(d.time)}</p>
      <p className="text-dark-text font-bold tabular-nums">${Number(d.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
}

export default function PriceChart({ priceHistory }) {
  const [livePrice, setLivePrice] = useState(null);
  const intervalRef = useRef(null);

  // Independent 5s price poll for the header display
  useEffect(() => {
    let mounted = true;
    async function tick() {
      try {
        const p = await getCurrentBTCPrice();
        if (mounted) setLivePrice(p);
      } catch { /* ignore */ }
    }
    tick();
    intervalRef.current = setInterval(tick, 5000);
    return () => { mounted = false; clearInterval(intervalRef.current); };
  }, []);

  const data = (priceHistory || []).map(p => ({
    time: p.time,
    price: p.price,
  }));

  const prices = data.map(d => d.price);
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;
  const range = max - min || 1;
  const domainMin = min - range * 0.1;
  const domainMax = max + range * 0.1;

  const isUp = data.length >= 2 && data[data.length - 1].price >= data[0].price;
  const color = isUp ? '#22c55e' : '#ef4444';

  const displayPrice = livePrice || (data.length > 0 ? data[data.length - 1].price : null);
  const priceChange = data.length >= 2 ? data[data.length - 1].price - data[0].price : 0;
  const priceChangePct = data.length >= 2 && data[0].price > 0
    ? (priceChange / data[0].price) * 100
    : 0;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-dark-muted uppercase tracking-wider">BTC/USDT</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">LIVE</span>
        </div>
        {displayPrice && (
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">
              ${Number(displayPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs tabular-nums ${priceChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(3)}%)
            </p>
          </div>
        )}
      </div>

      {data.length < 2 ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-dark-muted">
          <div className="flex flex-col items-center gap-2">
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            <span>Collecting price data...</span>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              tick={{ fontSize: 10, fill: '#8b8fa3' }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 10, fill: '#8b8fa3' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={1.5}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 3, fill: color, stroke: '#1a1d29', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
