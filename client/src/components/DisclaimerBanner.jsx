import React from 'react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-[#1a1700] border border-accent-yellow/20 rounded-lg px-4 py-2.5 flex items-start gap-2">
      <span className="text-sm mt-0.5">⚠️</span>
      <p className="text-xs text-accent-yellow/80 leading-relaxed">
        This is a demo MVP. Signal engine is an untested hypothesis. Not financial advice. Testnet only.
      </p>
    </div>
  );
}
