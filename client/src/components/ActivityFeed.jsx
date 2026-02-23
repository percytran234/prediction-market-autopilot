import React, { useRef, useEffect } from 'react';

const TYPE_CONFIG = {
  START:     { color: 'text-accent-green', icon: '▶' },
  STOP:      { color: 'text-accent-red', icon: '⏹' },
  AUTO_STOP: { color: 'text-accent-red', icon: '🛑' },
  SCAN:      { color: 'text-accent-blue', icon: '🔍' },
  SIGNAL:    { color: 'text-accent-blue', icon: '📡' },
  BET:       { color: 'text-accent-yellow', icon: '🎯' },
  WIN:       { color: 'text-accent-green', icon: '✅' },
  LOSS:      { color: 'text-accent-red', icon: '❌' },
  SKIP:      { color: 'text-dark-muted', icon: '⏭' },
  DEPOSIT:   { color: 'text-accent-blue', icon: '💰' },
  WITHDRAW:  { color: 'text-accent-yellow', icon: '💸' },
  ERROR:     { color: 'text-accent-red', icon: '⚠️' },
};

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function ActivityFeed({ log }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [log?.length]);

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: 320 }}>
      <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-dark-muted uppercase tracking-wider">Activity Log</h3>
        {log && log.length > 0 && (
          <span className="text-[10px] text-dark-muted tabular-nums">{log.length} events</span>
        )}
      </div>

      <div ref={scrollRef} className="overflow-y-auto flex-1 scrollbar-thin">
        {(!log || log.length === 0) ? (
          <p className="text-sm text-dark-muted text-center py-8">No activity yet. Start the agent to see live events.</p>
        ) : (
          <div className="divide-y divide-dark-border/40">
            {log.map((entry) => {
              const cfg = TYPE_CONFIG[entry.type] || { color: 'text-dark-muted', icon: '•' };
              return (
                <div key={entry.id} className="px-4 py-2 flex items-start gap-2.5 hover:bg-[#1e2130] transition-colors duration-100">
                  <span className="text-xs mt-0.5 shrink-0 w-4 text-center">{cfg.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{entry.type}</span>
                      <span className="text-[10px] text-dark-muted tabular-nums">{formatTime(entry.time)}</span>
                    </div>
                    <p className="text-xs text-dark-text/80 leading-relaxed break-words mt-0.5">{entry.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
