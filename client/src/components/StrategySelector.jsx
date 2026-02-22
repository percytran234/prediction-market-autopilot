import React from 'react';

export default function StrategySelector() {
  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <h3 className="text-lg font-semibold mb-4">Strategy: Safe Mode</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-dark-muted">Bet Size</span>
          <span>2% of bankroll</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dark-muted">Confidence Threshold</span>
          <span>60%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dark-muted">Daily Loss Limit</span>
          <span className="text-accent-red">-10%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dark-muted">Daily Profit Target</span>
          <span className="text-accent-green">+5%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dark-muted">Max Consecutive Losses</span>
          <span>4 (pause 1h)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dark-muted">Win Streak Bonus</span>
          <span>3 wins = 3% bet</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-dark-border">
        <h4 className="text-sm font-medium mb-2">Signal Weights</h4>
        <div className="space-y-1.5">
          {[
            { label: 'Price Momentum (EMA)', weight: 30, color: 'bg-accent-blue' },
            { label: 'RSI (14)', weight: 25, color: 'bg-purple-500' },
            { label: 'Market Momentum', weight: 25, color: 'bg-accent-yellow' },
            { label: 'Volume Spike', weight: 20, color: 'bg-accent-green' },
          ].map(({ label, weight, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-24 text-xs text-dark-muted truncate">{label}</div>
              <div className="flex-1 bg-dark-bg rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${weight}%` }} />
              </div>
              <span className="text-xs w-8 text-right">{weight}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
