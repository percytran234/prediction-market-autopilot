import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(n, d = 2) { return Number(n || 0).toFixed(d); }

const AGENT_TYPES = ['openclaw', 'polymarket', 'custom'];
const TYPE_LABELS = { openclaw: 'OpenClaw', polymarket: 'Polymarket', custom: 'Custom' };
const TYPE_COLORS = { openclaw: '#69f0ae', polymarket: '#7c4dff', custom: '#ffd740' };

// ─── Register Modal ───

function RegisterModal({ open, onClose, onRegistered }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('custom');
  const [betPct, setBetPct] = useState(2);
  const [stopLoss, setStopLoss] = useState(10);
  const [profitTarget, setProfitTarget] = useState(5);
  const [skipThreshold, setSkipThreshold] = useState(60);
  const [cooldown, setCooldown] = useState(60);
  const [startingBankroll, setStartingBankroll] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  async function handleRegister() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gateway/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: name.trim(),
          agent_type: type,
          config: {
            max_bet_percent: betPct,
            daily_stop_loss: stopLoss,
            daily_profit_target: profitTarget,
            skip_threshold: skipThreshold,
            cooldown_seconds: cooldown,
            starting_bankroll: startingBankroll,
            markets: ['BTC', 'ETH', 'SOL'],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(result.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDone() {
    onRegistered();
    setResult(null);
    setName('');
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="terminal-card w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {!result ? (
          <>
            <h3 className="text-sm font-bold text-dark-text mb-4">Register New Agent</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold block mb-1">Agent Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My Trading Agent"
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-mono text-dark-text focus:outline-none focus:border-accent-green/50" />
              </div>

              <div>
                <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold block mb-2">Agent Type</label>
                <div className="flex gap-2">
                  {AGENT_TYPES.map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={`flex-1 px-3 py-2 text-xs font-bold font-mono rounded-lg border transition ${
                        type === t
                          ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                          : 'text-dark-muted border-dark-border hover:bg-dark-hover'
                      }`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold block mb-1">Starting Bankroll</label>
                <div className="flex items-center gap-2">
                  <span className="text-dark-muted text-sm">$</span>
                  <input type="number" min={1} max={100000} value={startingBankroll}
                    onChange={e => setStartingBankroll(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-mono text-dark-text focus:outline-none focus:border-accent-green/50" />
                </div>
              </div>

              {/* Risk Sliders */}
              {[
                { label: 'Max Bet %', value: betPct, set: setBetPct, min: 1, max: 10 },
                { label: 'Daily Stop Loss %', value: stopLoss, set: setStopLoss, min: 5, max: 25 },
                { label: 'Daily Profit Target %', value: profitTarget, set: setProfitTarget, min: 3, max: 20 },
                { label: 'Skip Threshold', value: skipThreshold, set: setSkipThreshold, min: 40, max: 90 },
                { label: 'Cooldown (sec)', value: cooldown, set: setCooldown, min: 10, max: 300 },
              ].map(({ label, value, set, min, max }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold">{label}</label>
                    <span className="text-sm font-bold font-mono text-accent-green">{value}</span>
                  </div>
                  <input type="range" min={min} max={max} value={value}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full h-1.5 bg-dark-border rounded-full appearance-none cursor-pointer accent-[#00e676]" />
                </div>
              ))}
            </div>

            {error && <p className="text-xs font-mono text-accent-red mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-dark-muted border border-dark-border rounded-xl hover:bg-dark-hover transition font-mono">
                Cancel
              </button>
              <button onClick={handleRegister} disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2.5 bg-accent-green text-black text-xs font-extrabold rounded-xl hover:brightness-110 transition disabled:opacity-50 font-mono">
                {loading ? 'Registering...' : 'Register Agent'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-sm font-bold text-accent-green mb-4">Agent Registered</h3>

            <div className="space-y-3">
              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-[10px] text-dark-muted uppercase mb-1">Agent ID</p>
                <p className="text-xs font-mono text-dark-text">{result.agent_id}</p>
              </div>

              <div className="p-3 bg-dark-bg rounded-lg border border-accent-green/30">
                <p className="text-[10px] text-accent-green uppercase mb-1 font-bold">API Key (save this now!)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-dark-text break-all">{result.api_key}</code>
                  <button onClick={handleCopy}
                    className="px-3 py-1.5 text-[10px] font-bold bg-accent-green/15 text-accent-green border border-accent-green/30 rounded-lg hover:bg-accent-green/25 transition font-mono shrink-0">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-[10px] text-dark-muted uppercase mb-1">Wallet Address</p>
                <p className="text-xs font-mono text-dark-text">{result.wallet_address}</p>
              </div>

              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-[10px] text-dark-muted uppercase mb-2">Quick Test</p>
                <pre className="text-[10px] font-mono text-dark-muted overflow-x-auto whitespace-pre-wrap">{`curl -X POST ${window.location.origin}/api/gateway/submit-signal \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${result.api_key}" \\
  -d '{"market":"BTC","direction":"UP","confidence":75,"reasoning":"Test signal"}'`}</pre>
              </div>
            </div>

            <button onClick={handleDone}
              className="w-full mt-4 px-4 py-2.5 bg-accent-green text-black text-xs font-extrabold rounded-xl hover:brightness-110 transition font-mono">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Agent Card ───

function AgentCard({ agent, onExpand, expanded }) {
  const pnlColor = agent.today_pnl >= 0 ? 'text-accent-green' : 'text-accent-red';
  const typeColor = TYPE_COLORS[agent.agent_type] || '#ffd740';

  return (
    <div className="terminal-card overflow-hidden">
      <button onClick={onExpand} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-dark-hover transition">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: agent.status === 'active' ? '#00e676' : '#ff1744' }} />
          <div>
            <p className="text-sm font-bold text-dark-text">{agent.agent_name}</p>
            <p className="text-[10px] font-mono" style={{ color: typeColor }}>{TYPE_LABELS[agent.agent_type] || agent.agent_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[10px] text-dark-muted uppercase">Today</p>
            <p className={`text-sm font-bold font-mono ${pnlColor}`}>
              {agent.today_pnl >= 0 ? '+' : ''}${fmt(agent.today_pnl)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-dark-muted uppercase">Bankroll</p>
            <p className="text-sm font-bold font-mono text-dark-text">${fmt(agent.bankroll)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-dark-muted uppercase">Win Rate</p>
            <p className="text-sm font-bold font-mono text-dark-text">{fmt(agent.win_rate, 1)}%</p>
          </div>
          <span className="text-dark-muted text-xs font-mono">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && <AgentDetail agent={agent} />}
    </div>
  );
}

// ─── Agent Detail Panel ───

function AgentDetail({ agent }) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/gateway/agent/${agent.agent_id}/signals?limit=20`)
      .then(r => r.json())
      .then(data => { setSignals(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agent.agent_id]);

  const decisionPie = useMemo(() => {
    const counts = { EXECUTE: 0, SKIP: 0, BLOCK: 0 };
    signals.forEach(s => { if (counts[s.decision] !== undefined) counts[s.decision]++; });
    return [
      { name: 'Execute', value: counts.EXECUTE, color: '#00e676' },
      { name: 'Skip', value: counts.SKIP, color: '#ffd740' },
      { name: 'Block', value: counts.BLOCK, color: '#ff1744' },
    ].filter(d => d.value > 0);
  }, [signals]);

  const blockedWouldHaveLost = useMemo(() => {
    return signals.filter(s => s.decision === 'BLOCK').length;
  }, [signals]);

  const equityCurve = useMemo(() => {
    const executed = signals.filter(s => s.decision === 'EXECUTE').reverse();
    return executed.map((s, i) => ({ round: i + 1, bankroll: s.bankroll_after }));
  }, [signals]);

  return (
    <div className="border-t border-dark-border px-4 py-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Decision Distribution */}
        <div className="terminal-card p-3">
          <h4 className="text-[10px] text-dark-muted uppercase tracking-wider mb-2 font-semibold">Decision Distribution</h4>
          {decisionPie.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={decisionPie} cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                    dataKey="value" startAngle={90} endAngle={-270} paddingAngle={2}>
                    {decisionPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="#111a12" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111a12', border: '1px solid #1e3320', borderRadius: '8px', fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 text-[10px] font-mono mt-1">
                {decisionPie.map(d => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.name} {d.value}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-dark-muted text-center py-4 font-mono">No signals yet</p>
          )}
        </div>

        {/* Stats */}
        <div className="terminal-card p-3">
          <h4 className="text-[10px] text-dark-muted uppercase tracking-wider mb-2 font-semibold">Discipline Stats</h4>
          <div className="space-y-2">
            {[
              { label: 'Blocked signals', value: blockedWouldHaveLost, color: 'text-accent-red' },
              { label: 'Lifetime P&L', value: `${agent.lifetime_pnl >= 0 ? '+' : ''}$${fmt(agent.lifetime_pnl)}`, color: agent.lifetime_pnl >= 0 ? 'text-accent-green' : 'text-accent-red' },
              { label: 'Total signals', value: agent.lifetime_signals },
              { label: 'Agent ID', value: agent.agent_id, small: true },
            ].map(({ label, value, color, small }) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <span className="text-[10px] text-dark-muted">{label}</span>
                <span className={`${small ? 'text-[9px]' : 'text-xs'} font-bold font-mono ${color || 'text-dark-text'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Equity Curve */}
        <div className="terminal-card p-3">
          <h4 className="text-[10px] text-dark-muted uppercase tracking-wider mb-2 font-semibold">Bankroll</h4>
          {equityCurve.length > 1 ? (
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id={`eqGrad_${agent.agent_id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e676" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00e676" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="round" tick={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#4a7a4e', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v.toFixed(0)}`} width={40} />
                <Area type="monotone" dataKey="bankroll" stroke="#00e676" strokeWidth={1.5} fill={`url(#eqGrad_${agent.agent_id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-dark-muted text-center py-4 font-mono">Awaiting trades</p>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div>
        <h4 className="text-[10px] text-dark-muted uppercase tracking-wider mb-2 font-semibold">Recent Activity</h4>
        {loading ? (
          <p className="text-xs text-dark-muted font-mono">Loading...</p>
        ) : signals.length > 0 ? (
          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            <table className="w-full trade-table">
              <thead>
                <tr className="border-b border-dark-border bg-[#0d1410] sticky top-0">
                  <th className="text-left">Time</th>
                  <th className="text-center">Market</th>
                  <th className="text-center">Dir</th>
                  <th className="text-right">Conf</th>
                  <th className="text-center">Decision</th>
                  <th className="text-left">Reason</th>
                  <th className="text-right">P&L</th>
                  <th className="text-right">Bankroll</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s, i) => (
                  <tr key={i} className={`border-b border-dark-border/30 ${
                    s.decision === 'EXECUTE' ? (s.result === 'WIN' ? 'bg-[#0a2a0a]' : 'bg-[#2a0a0a]') : ''
                  }`}>
                    <td className="text-dark-muted">{(s.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                    <td className="text-center text-dark-muted">{s.market}</td>
                    <td className="text-center">
                      <span className={s.direction === 'UP' ? 'text-accent-green' : 'text-accent-red'}>
                        {s.direction === 'UP' ? '▲' : '▼'}
                      </span>
                    </td>
                    <td className="text-right text-dark-muted">{s.confidence}%</td>
                    <td className="text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.decision === 'EXECUTE' ? 'bg-accent-green/15 text-accent-green' :
                        s.decision === 'SKIP' ? 'bg-[#ffd740]/15 text-[#ffd740]' :
                        'bg-accent-red/15 text-accent-red'
                      }`}>{s.decision}</span>
                    </td>
                    <td className="text-dark-muted text-[10px] max-w-[200px] truncate">{s.decision_reason || (s.result || '—')}</td>
                    <td className={`text-right font-bold ${(s.pnl || 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {s.decision === 'EXECUTE' ? `${s.pnl >= 0 ? '+' : ''}$${fmt(s.pnl)}` : '—'}
                    </td>
                    <td className="text-right text-dark-muted">{s.decision === 'EXECUTE' ? `$${fmt(s.bankroll_after)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-dark-muted font-mono">No signals recorded yet</p>
        )}
      </div>
    </div>
  );
}

// ─── API Docs Section ───

function ApiDocs() {
  const [open, setOpen] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com';

  return (
    <div className="terminal-card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-dark-hover transition">
        <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">API Documentation</h3>
        <span className="text-dark-muted text-xs font-mono">{open ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {open && (
        <div className="border-t border-dark-border px-4 py-4 space-y-5">
          {/* Endpoints */}
          {[
            {
              method: 'POST', path: '/api/gateway/register', auth: false,
              desc: 'Register a new agent. Returns agent_id and api_key.',
              body: `{ "agent_name": "My Bot", "agent_type": "custom",
  "config": { "max_bet_percent": 2, "daily_stop_loss": 10,
    "daily_profit_target": 5, "skip_threshold": 60,
    "cooldown_seconds": 60, "markets": ["BTC"] } }`,
            },
            {
              method: 'POST', path: '/api/gateway/submit-signal', auth: true,
              desc: 'Submit a trading signal. Runs through discipline engine.',
              body: `{ "market": "BTC", "direction": "UP",
  "confidence": 75, "reasoning": "EMA crossover",
  "source": "my-strategy", "metadata": {} }`,
            },
            {
              method: 'GET', path: '/api/gateway/status', auth: true,
              desc: 'Get agent status, today\'s stats, and limit usage.',
            },
            {
              method: 'GET', path: '/api/gateway/logs?limit=50', auth: true,
              desc: 'Get recent signal decisions with full details.',
            },
            {
              method: 'POST', path: '/api/gateway/stop', auth: true,
              desc: 'Stop the agent. No further signals accepted.',
            },
          ].map(ep => (
            <div key={ep.path} className="p-3 bg-dark-bg rounded-lg border border-dark-border">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  ep.method === 'POST' ? 'bg-accent-green/15 text-accent-green' : 'bg-[#42a5f5]/15 text-[#42a5f5]'
                }`}>{ep.method}</span>
                <code className="text-xs font-mono text-dark-text">{ep.path}</code>
                {ep.auth && <span className="text-[9px] text-dark-muted font-mono">X-API-Key required</span>}
              </div>
              <p className="text-[11px] text-dark-muted mb-2">{ep.desc}</p>
              {ep.body && <pre className="text-[10px] font-mono text-dark-muted/70 overflow-x-auto">{ep.body}</pre>}
            </div>
          ))}

          {/* Code Snippets */}
          <div>
            <h4 className="text-[11px] text-dark-muted uppercase tracking-wider font-semibold mb-3">Code Snippets</h4>

            <div className="space-y-3">
              {/* Python */}
              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-[10px] text-[#ffd740] font-bold mb-2">Python</p>
                <pre className="text-[10px] font-mono text-dark-muted overflow-x-auto whitespace-pre-wrap">{`import requests

API_KEY = "pk_your_key_here"
BASE = "${origin}"

# Submit a signal
resp = requests.post(f"{BASE}/api/gateway/submit-signal",
    headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
    json={"market": "BTC", "direction": "UP", "confidence": 75,
          "reasoning": "EMA bullish crossover"})
print(resp.json())  # {"decision":"EXECUTE","pnl":1.50,...}`}</pre>
              </div>

              {/* JavaScript */}
              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-[10px] text-[#ffd740] font-bold mb-2">JavaScript</p>
                <pre className="text-[10px] font-mono text-dark-muted overflow-x-auto whitespace-pre-wrap">{`const res = await fetch("${origin}/api/gateway/submit-signal", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
  body: JSON.stringify({
    market: "BTC", direction: "UP", confidence: 75,
    reasoning: "EMA bullish crossover"
  })
});
const data = await res.json();`}</pre>
              </div>

              {/* curl */}
              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-[10px] text-[#ffd740] font-bold mb-2">curl</p>
                <pre className="text-[10px] font-mono text-dark-muted overflow-x-auto whitespace-pre-wrap">{`curl -X POST ${origin}/api/gateway/submit-signal \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pk_your_key_here" \\
  -d '{"market":"BTC","direction":"UP","confidence":75,"reasoning":"Test"}'`}</pre>
              </div>
            </div>
          </div>

          {/* OpenClaw YAML */}
          <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[#69f0ae] font-bold">OpenClaw Skill</p>
              <a href="/openclaw-skill.yaml" download
                className="text-[10px] font-mono text-accent-green hover:underline">
                Download YAML
              </a>
            </div>
            <p className="text-[10px] text-dark-muted">Download the OpenClaw skill definition to integrate your OpenClaw agent with this platform.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Gateway Page ───

export default function GatewayPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState(null);

  function loadAgents() {
    fetch('/api/gateway/agents')
      .then(r => r.json())
      .then(data => { setAgents(data.agents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-dark-text">Agent Gateway</h2>
          {activeCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/20 font-mono font-bold">
              {activeCount} active
            </span>
          )}
        </div>
        <button onClick={() => setShowRegister(true)}
          className="px-5 py-2.5 bg-accent-green text-black text-xs font-extrabold rounded-xl hover:brightness-110 transition font-mono tracking-wide">
          + Register Agent
        </button>
      </div>

      <RegisterModal open={showRegister} onClose={() => setShowRegister(false)} onRegistered={loadAgents} />

      {/* Agent Cards */}
      {loading ? (
        <div className="terminal-card p-8 text-center">
          <p className="text-sm text-dark-muted font-mono">Loading agents...</p>
        </div>
      ) : agents.length > 0 ? (
        <div className="space-y-3">
          {agents.map(agent => (
            <AgentCard
              key={agent.agent_id}
              agent={agent}
              expanded={expandedAgent === agent.agent_id}
              onExpand={() => setExpandedAgent(expandedAgent === agent.agent_id ? null : agent.agent_id)}
            />
          ))}
        </div>
      ) : (
        <div className="terminal-card p-12 text-center">
          <div className="text-4xl mb-3 opacity-30">&#x1F50C;</div>
          <p className="text-sm text-dark-muted font-mono">No agents connected yet.</p>
          <p className="text-[10px] text-dark-muted/50 font-mono mt-2">Register an agent to expose the discipline engine via API.</p>
        </div>
      )}

      {/* API Docs */}
      <ApiDocs />
    </div>
  );
}
