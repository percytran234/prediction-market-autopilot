import React, { useState } from 'react';

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="flex items-center gap-1.5 text-xs text-accent-yellow/60 hover:text-accent-yellow/90 transition-colors"
        title="Show disclaimer"
      >
        <span>⚠️</span>
        <span className="underline underline-offset-2">Show disclaimer</span>
      </button>
    );
  }

  return (
    <div className="bg-[#1a1700] border border-accent-yellow/20 rounded-lg px-4 py-2.5 flex items-start gap-2">
      <span className="text-sm mt-0.5">⚠️</span>
      <p className="text-xs text-accent-yellow/80 leading-relaxed flex-1">
        This is a demo MVP. Signal engine is an untested hypothesis. Not financial advice. Testnet only.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-accent-yellow/40 hover:text-accent-yellow/80 transition-colors text-sm leading-none mt-0.5 ml-2 shrink-0"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
