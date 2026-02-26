> 🌐 **[Landing Page](https://prediction-agent-landing.vercel.app)** | 💻 **[View Code](https://github.com/percytran234/prediction-market-autopilot)** | 📄 **[Read Spec](#spec--prediction-market-auto-pilot-agent)**

# SPEC v5 — Prediction Market Auto-Pilot Agent

> **Track:** Agent Wallet  
> **MVP Angle:** Prediction Market Agent — BTC 15-min Up/Down on Polymarket  
> **Blockchain:** Polygon PoS (Polymarket native chain)  
> **Implementation Window:** 5 days  
> **Author:** Tran Thanh Binh  
> **GitHub:** https://github.com/percytran234/prediction-market-autopilot  
> **Landing Page:** https://prediction-agent-landing.vercel.app  
> **Live App:** https://prediction-market-autopilot.vercel.app  
> **Version:** v5 (post-build update — reflects what was actually built)

---

## Changelog v4 → v5

| Area | v4 (Planned) | v5 (Built) |
|------|-------------|------------|
| Execution | Mock mode only | **3 modes: Mock → Paper → Live** via Polymarket CLI |
| Backtesting | Out of scope | **Built** — configurable params, equity curve, comparison mode |
| Portfolio | Out of scope | **Built** — 8-section dashboard with calendar heatmap |
| Agent Gateway | Not conceived | **Designed** — API for external AI agents (OpenClaw, etc.) |
| Signal Engine | Binance only | **Enhanced** — Binance (80%) + Polymarket data (20%) |
| Landing Page | None | **3 versions deployed** at Vercel |
| App | Local only | **Deployed** at Vercel |
| Business Model | Free + $4.99 Pro | **4 tiers** ($0 → $99/mo) + dual revenue streams |
| Pricing | 2 tiers | **4 tiers**: Free, Pro $9.99, Trader $29.99, Quant $99 |

---

## 1. Track: Agent Wallet

An AI Agent with its own wallet on Polygon that autonomously participates in Polymarket's BTC 15-minute Up/Down prediction markets. The agent provides **automated risk management and disciplined execution** — replacing human emotion with code-enforced rules.

**What this agent IS:** A disciplined co-pilot that manages bet sizing, stop-losses, and skip logic so users don't blow up their accounts through impulsive decisions.

**What this agent is NOT:** A guaranteed profit machine. The signal engine is an untested hypothesis. The real value is automated discipline, not prediction accuracy.

### Dual User Base (NEW in v5)

- **70% Individual traders** — retail users who need discipline
- **30% AI Agents** — external bots (OpenClaw, LuckyLobster, custom) that need risk management via our Gateway API

---

## 2. Target User

### Primary: Retail Users

**Persona:** Crypto-curious retail users entering prediction markets without trading experience.

**Profile:**

- Holds $50–$500 in USDC on Polygon
- Attracted to Polymarket's BTC 15-min markets (simple, fast, binary)
- Cannot read charts or understand technical indicators
- Wants to participate but **fears losing money due to emotional decisions**
- Does not have time to monitor every 15-minute round

**NOT targeting:** Professional traders, quant firms, or high-risk gamblers.

### Secondary: AI Agent Developers (NEW in v5)

**Persona:** Developers and teams building AI trading agents that need a discipline layer.

**Profile:**

- Building on top of OpenClaw (300K+ users), LuckyLobster, or custom agents
- Their agents can execute trades — but have no bankroll management
- Need risk controls, position sizing, and kill-switch capabilities
- Willing to pay for infrastructure that prevents their agents from blowing up accounts

### Market Context

Polymarket surpassed **$1B+ monthly volume in 2024**. As political markets cool, the platform is pivoting into **crypto price prediction markets** (BTC/ETH, various timeframes).

**Key market timing (Feb 2026):**

| Event | Date | Relevance |
|-------|------|-----------|
| OpenClaw goes viral | Early Feb 2026 | 300K+ GitHub stars, AI agent explosion |
| LuckyLobster launches | Feb 23, 2026 | First AI Polymarket execution platform |
| Polymarket CLI releases | Feb 24, 2026 | Official CLI for programmatic trading |
| **Our product** | Feb 22-26, 2026 | Discipline layer — fills the gap |

**Market gap:** All existing tools help agents **trade faster**. No one helps agents **trade correctly**. We are the discipline layer.

---

## 3. Problem Statement

### Core Pain Points (Retail Users)

1. **Knowledge barrier:** Users guess randomly → negative expected value
2. **Execution friction:** Manual interaction every 15 minutes → fatigue → worse decisions
3. **No bankroll management:** FOMO all-in on one round → account wipeout
4. **No exit discipline:** Greed after wins, loss-chasing after losses → both destructive

### Core Pain Points (AI Agents — NEW in v5)

1. **No position sizing:** Most agents bet fixed amounts regardless of confidence
2. **No stop-loss:** Agents run indefinitely until bankroll hits zero
3. **No cooldown logic:** Agents don't pause after consecutive losses
4. **No cross-agent risk limits:** Running 5 agents on 1 bankroll with no coordination

### Core Value Proposition

The agent's primary value is **NOT** market prediction. It is:

1. **Automated discipline** — bet sizing, stop-loss, take-profit enforced by code
2. **Signal filtering** — skip low-confidence rounds instead of betting on every one
3. **Emotion elimination** — no FOMO, no revenge trading, no greed
4. **Agent risk management** (v5) — external agents pass through our discipline engine

Whether the signal engine achieves 51% or 55% win rate, the money management layer ensures **users lose slowly on bad days and capitalize on good days** — a structural advantage over undisciplined manual betting.

### Competitive Landscape (Updated v5)

| Solution | Limitation | Our Approach |
|----------|-----------|--------------|
| Manual Polymarket trading | Requires discipline humans don't have | Automated execution + hard risk limits |
| LuckyLobster (Feb 2026) | Execution layer only — no discipline | We are the discipline layer that wraps execution |
| OpenClaw (300K users) | AI agent framework — no risk management | Our Gateway gives OpenClaw agents bankroll protection |
| Polymarket CLI (Official) | Raw CLI — no strategy, no limits | We wrap CLI with signal engine + money management |
| Generic trading bots | Built for CEX, not prediction markets | Purpose-built for binary outcomes |

**Positioning: "LuckyLobster = execution layer. Prediction Agent = discipline layer."**

---

## 4. Core Flow

### 4.1 — Retail User Flow

```
[User] → Open dashboard → Connect wallet (Polygon)
              ↓
[User] → Deposit USDC into Agent Wallet (e.g., $100)
              ↓
[User] → Select execution mode:
         ├─ MOCK (default): Simulated bets, real BTC prices
         ├─ PAPER: Real Polymarket data, no real execution
         └─ LIVE: Real trades via Polymarket CLI (gated)
              ↓
[User] → Review "Safe Mode" defaults:
         + Bet size: 2% of bankroll per round
         + Stop-loss: halt at -10% daily loss
         + Take-profit: halt at +5% daily profit
         + Skip threshold: 60% confidence minimum
         + Acknowledge risk disclaimer
              ↓
[User] → Click "Start Agent"
              ↓
[Agent] → Every 15-minute round:
         1. Fetch BTC data from Binance API
         2. Fetch Polymarket data via CLI (Paper/Live modes)
         3. Compute enhanced signals:
            ├─ Binance (80%): EMA 24% + RSI 20% + Volume 16% + Baseline 20%
            └─ Polymarket (20%): Market odds 10% + Liquidity 5% + Spread 5%
         4. Liquidity check: skip if spread > 5¢ or book < $50/side
         5. Confidence ≥ 60% → BET (2% bankroll) | < 60% → SKIP
              ↓
[Agent] → Execute based on mode:
         ├─ MOCK: Write to SQLite only
         ├─ PAPER: Log "would have bet $X" + track P&L
         └─ LIVE: polymarket clob market-order → real trade
              ↓
[Agent] → After each round:
         - Update P&L, bankroll, win rate on dashboard
         - Check daily limits → hit threshold → AUTO-STOP
              ↓
[User] → Dashboard: bankroll, P&L, win rate, full bet history
         Portfolio: equity curve, calendar heatmap, streak analysis
         Backtest: historical strategy validation
              ↓
[User] → At any time: "Stop Agent" or "Withdraw"
         Emergency: 🛑 KILL SWITCH (cancel all orders + stop)
```

### 4.2 — AI Agent Gateway Flow (NEW in v5)

```
[External Agent] → POST /api/gateway/evaluate
                   {
                     agent_id: "openclaw-btc-01",
                     direction: "UP",
                     confidence: 72,
                     amount: 50,
                     market: "btc-15min"
                   }
                        ↓
[Discipline Engine] → 8 checks:
                      ✓ Bankroll sufficient?
                      ✓ Bet size within limits? (max 2% bankroll)
                      ✓ Daily loss limit not hit?
                      ✓ Consecutive loss count OK?
                      ✓ Confidence above threshold?
                      ✓ Market liquidity sufficient?
                      ✓ Spread acceptable?
                      ✓ Cool-down period expired?
                        ↓
[Response] → EXECUTE (adjusted amount) | SKIP (reason) | BLOCK (violation)
```

---

## 5. Strategy Design

### 5.1 — Enhanced Signal Engine (Updated v5)

| Signal | Description | Weight | Source |
|--------|------------|--------|--------|
| **EMA Momentum** | EMA(5) vs EMA(15) crossover direction | 24% | Binance klines |
| **RSI (14)** | <30 → oversold (UP). >70 → overbought (DOWN) | 20% | Binance klines |
| **Volume Ratio** | Current vs 1h average → spike detection | 16% | Binance klines |
| **Baseline** | Flat contribution to score | 20% | Stabilizer |
| **Market Odds** | Polymarket odds skew → contrarian signal | 10% | Polymarket CLI |
| **Liquidity** | Order book depth check | 5% | Polymarket CLI |
| **Spread** | Bid-ask spread quality | 5% | Polymarket CLI |

**Note:** Polymarket signals (20%) only active in Paper/Live modes when CLI is connected. In Mock mode, Binance signals carry 100% weight.

**Decision Logic:**

```
Composite score = weighted sum → normalize to 0-100
Direction = net signal direction (UP or DOWN)

Score ≥ 60 → PLACE BET (direction, 2% of bankroll)
Score < 60 → SKIP round

Additional guard (Paper/Live):
  Spread > 5¢ → SKIP regardless of score
  Order book < $50 each side → SKIP regardless of score
```

### 5.2 — Honest Assessment of Signal Edge

**The win rate of this signal engine is a hypothesis, not a proven fact.**

| Claim Status | Statement |
|-------------|-----------|
| ❌ NOT claimed | Guaranteed 53-58% win rate |
| ❌ NOT claimed | Agent will always be profitable |
| ❌ NOT claimed | Outperforms professional quant strategies |
| ✅ Claimed | Better risk management than manual human betting |
| ✅ Claimed | SKIP mechanism reduces exposure to low-quality rounds |
| ✅ Claimed | Money management limits downside regardless of win rate |
| ✅ Claimed | Even at 50% win rate, user loses only fees — not the account |
| ✅ NEW | Backtesting engine allows users to validate before risking capital |
| ✅ NEW | Paper trading mode proves strategy with real data, zero risk |

**The real edge is discipline, not prediction.**

### 5.3 — Money Management (The Actual Edge)

| Rule | Value | Purpose |
|------|-------|---------|
| **Bet size** | 2% of bankroll | Single loss = $2 on $100. No account blowup possible |
| **Daily loss limit** | -10% → auto-stop | Worst day capped at $10 loss on $100 |
| **Daily profit target** | +5% → auto-stop | Lock gains, prevent greed |
| **Consecutive loss limit** | 4 → pause 1 hour | Break bad streaks, force cooldown |
| **Streak bonus** | 3 wins → bet increases to 3% | Light momentum capture |

### 5.4 — Scenario Analysis

```
Bankroll: $100 | Bet: $2/round (2%) | ~20 rounds/day

SCENARIO A — Signal works (55% WR):
  11W × $2 - 9L × $2 = +$4/day. Optimistic, unproven.

SCENARIO B — Random (50% WR):
  10W × $2 - 10L × $2 = $0. Break even minus small fees.
  → Money management protects capital.

SCENARIO C — Bad day (45% WR):
  9W × $2 - 11L × $2 = -$4.
  → Daily loss limit (-10%) stops agent before -$10.

SCENARIO D — Signal fails (<40% WR):
  → Agent stops within hours (daily limit + consecutive loss pause).
  → Max damage: -$10. User keeps $90. Bankroll survives.
  → User can then BACKTEST to see what went wrong.
```

**Product promise: "You won't blow up your account, and you'll have a better process than emotional manual betting."**

### 5.5 — Validation Path (Updated v5 — partially completed)

| Step | Description | Status |
|------|------------|--------|
| 1. Backtest | Run signals against historical BTC data | ✅ **BUILT** — configurable params, equity curve, comparison vs random |
| 2. Paper trade | Real Polymarket data, simulated execution | ✅ **BUILT** — Paper mode via CLI integration |
| 3. Validate | Publish results, analyze win rate | ⏳ Requires 7+ days of paper trading data |
| 4. Live deploy | Real-fund deployment | 🔒 Gated: requires backtest + paper validation + legal review |

---

## 6. Execution Modes (NEW in v5)

### 6.1 — Three Modes

```
┌─────────────────────────────────────────────────────────┐
│                    EXECUTION ENGINE                      │
│                                                          │
│  Mode 1: MOCK (default)                                  │
│  ├─ Real BTC prices from Binance                         │
│  ├─ Simulated outcomes written to SQLite                 │
│  ├─ No wallet, no CLI required                           │
│  └─ For: demo, testing, new users                        │
│                                                          │
│  Mode 2: PAPER (requires Polymarket CLI)                 │
│  ├─ Real data from Polymarket (prices, orderbook, odds)  │
│  ├─ Enhanced signal engine (Binance 80% + Polymarket 20%)│
│  ├─ Decisions logged but NOT executed                    │
│  └─ For: strategy validation before going live           │
│                                                          │
│  Mode 3: LIVE (requires CLI + funded wallet + gates)     │
│  ├─ Real data + real execution via Polymarket CLI        │
│  ├─ On-chain order tracking                              │
│  ├─ Kill switch: cancel all orders + stop agent          │
│  └─ For: production trading with real USDC               │
│                                                          │
│  Gate: MOCK → PAPER → LIVE (sequential, no skipping)     │
└─────────────────────────────────────────────────────────┘
```

### 6.2 — Live Mode Safety Gates (Mandatory)

| Gate | Requirement |
|------|------------|
| 1. Explicit opt-in | `LIVE_MODE_CONFIRMED=true` in .env |
| 2. Paper validation | Minimum 7 days of paper trading completed |
| 3. CLI health check | Polymarket CLI installed, wallet connected |
| 4. Wallet funded | USDC balance > 0 on Polygon |
| 5. Bankroll cap | `MAX_BANKROLL_LIVE` default $100 |
| 6. Disclaimer | Full-screen risk warning requiring typed confirmation |
| 7. Kill switch | Emergency stop button visible at all times |

### 6.3 — Polymarket CLI Wrapper

Built: `server/polymarket-cli.js` — Node.js wrapper around official Polymarket CLI (Rust, v0.1.4)

| Method | CLI Command | Purpose |
|--------|------------|---------|
| `searchMarkets(query)` | `polymarket search` | Find markets |
| `getMarket(slug)` | `polymarket market` | Market details |
| `getMidpoint(tokenId)` | `polymarket mid` | Current price |
| `getSpread(tokenId)` | `polymarket spread` | Bid-ask spread |
| `getOrderBook(tokenId)` | `polymarket book` | Depth check |
| `getPriceHistory(tokenId)` | `polymarket history` | Historical data |
| `marketOrder(tokenId, side, amount)` | `polymarket clob market-order` | Execute trade |
| `getPositions()` | `polymarket positions` | Portfolio |
| `cancelOrder(orderId)` | `polymarket cancel` | Cancel order |

Rate limit: 2-second cooldown between calls. Timeout: 30 seconds per call.

---

## 7. Features Built (NEW section in v5)

### 7.1 — Backtesting Engine ✅

**Endpoint:** `POST /api/backtest`

**Parameters:**

| Param | Default | Range |
|-------|---------|-------|
| market | BTC | BTC, ETH, SOL |
| days | 7 | 1-90 |
| betPercent | 2 | 1-10 |
| skipThreshold | 60 | 50-80 |
| stopLoss | 10 | 5-30 |
| takeProfit | 5 | 3-20 |
| startingBankroll | 100 | 10-100000 |
| dataSource | binance | binance, polymarket |

**Output:**

- Total rounds, wins, losses, skips
- Win rate, skip rate
- Net P&L, ROI percentage
- Max drawdown, Sharpe ratio, Sortino ratio
- Longest win/loss streaks
- Daily returns array
- Equity curve data points
- **Comparison overlay: strategy vs random 50/50 betting** (visual proof of value)

**Frontend:** `/backtest` page with config panel, 4 summary cards, equity curve chart, daily returns bar chart, bet distribution donut, full stats table.

### 7.2 — Portfolio Dashboard ✅

**8 sections, 8 API endpoints:**

| Section | Endpoint | Content |
|---------|----------|---------|
| Header | `/api/portfolio/summary` | 5 stat cards (value, P&L, today, win rate, rounds) |
| Equity Curve | `/api/portfolio/equity` | Line chart with period toggles + BTC buy-hold comparison |
| Calendar | `/api/portfolio/calendar` | GitHub-style heatmap, 90 days, color-coded by daily P&L |
| Market Breakdown | `/api/portfolio/markets` | Donut chart + table by market |
| Time-of-Day | `/api/portfolio/hourly` | Bar chart + auto-generated insight |
| Streaks | `/api/portfolio/streaks` | Current streak badge, longest win/loss, visual bars |
| Risk Metrics | `/api/portfolio/risk` | Max drawdown, Sharpe, Sortino, avg win vs avg loss |
| Export | `/api/portfolio/export/csv` | CSV download of all bet history |

### 7.3 — AI Agent Gateway (Designed, Frontend Built)

**Architecture:**

```
[External Agent] → POST /api/gateway/evaluate → [Discipline Engine]
                                                        ↓
                                              8 safety checks
                                                        ↓
                                              EXECUTE / SKIP / BLOCK
```

**Use case:** OpenClaw agents, LuckyLobster bots, or custom AI agents route their trades through our discipline engine. We add bankroll management, position sizing, and kill-switch to any agent.

---

## 8. Tech Stack (Updated v5)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Blockchain** | **Polygon PoS** | Polymarket native. Gas ~$0.01/tx |
| Frontend | React 18 + Vite + TailwindCSS | Fast, dark trading theme |
| Backend | Node.js + Express | Lightweight, handles cron + API |
| Wallet | ethers.js v6 + Polygon RPC (Alchemy) | Agent wallet generation |
| Price Data | Binance REST API (free) | BTC 1-min klines |
| **Polymarket Data** | **Polymarket CLI v0.1.4 (Rust)** | Market prices, orderbook, execution |
| Scheduler | node-cron | 1-min (demo) / 15-min (prod) |
| Database | SQLite (better-sqlite3) | Zero-config, embedded |
| **Deployment** | **Vercel** | Landing page + app hosted |
| AI (optional) | Claude API / OpenAI API | Per-bet reasoning |

### Database Schema (Updated v5)

| Table | Purpose | New in v5? |
|-------|---------|-----------|
| `bets` | All bet history (wins, losses, skips) | v4 |
| `config` | Agent settings (mode, limits, wallet) | v4 |
| `execution_log` | CLI commands, responses, slippage tracking | ✅ NEW |
| `paper_trading_days` | Paper mode daily summary for gate validation | ✅ NEW |

---

## 9. User Stories

### US-01: Deposit & Setup

> **As a** user with no trading experience,  
> **I want to** deposit funds and start the agent with one click,  
> **So that** I participate in prediction markets without manual effort.

**Acceptance Criteria:**
- Connect MetaMask (Polygon) → display address + balance
- Deposit to agent wallet (or mock-deposit for demo) → dashboard updates
- **Select execution mode: Mock (default) / Paper / Live**
- Review Safe Mode summary: 2% bet, -10% loss limit, +5% profit target
- Risk disclaimer visible and acknowledged before starting
- "Start Agent" → status changes to ACTIVE
- **CLI status badge shows connection state** (v5)

### US-02: Autonomous Betting

> **As a** user,  
> **I want** the Agent to analyze and act every round without my input,  
> **So that** I don't make emotional decisions.

**Acceptance Criteria:**
- Each round: fetch data → compute signals → BET or SKIP
- Dashboard shows: direction, confidence %, amount, reasoning, result
- SKIP displays clearly: "Confidence 48% — skipping this round"
- **Paper/Live: shows Polymarket midpoint, spread, order ID** (v5)

### US-03: Real-Time Dashboard + Portfolio

> **As a** user,  
> **I want** to see honest, real-time performance data with historical analysis,  
> **So that** I can evaluate if the strategy is working over time.

**Acceptance Criteria:**
- Dashboard: Bankroll, P&L today, win rate, bet history, agent status
- **Portfolio page (v5):** equity curve, calendar heatmap, market breakdown, streaks, risk metrics
- **CSV export** of all bet history
- Footer: "Past results do not predict future performance"

### US-04: Backtest Before Risking Capital (NEW in v5)

> **As a** user,  
> **I want** to test the strategy on historical data before betting real money,  
> **So that** I can see expected performance and make an informed decision.

**Acceptance Criteria:**
- Configure: market (BTC/ETH/SOL), days (1-90), bet size, skip threshold
- See results: win rate, P&L, max drawdown, Sharpe ratio
- **Visual comparison: strategy vs random 50/50 betting**
- Data source toggle: Binance (default) or Polymarket (when CLI connected)

### US-05: Auto-Stop on Limits

> **As a** user who lacks exit discipline,  
> **I want** hard-coded stop rules enforced automatically,  
> **So that** I'm protected from my own impulses.

**Acceptance Criteria:**
- -10% daily loss → stop → "⛔ Daily loss limit reached"
- +5% daily profit → stop → "✅ Daily profit target reached"
- 4 consecutive losses → pause 1h → "⏸️ Cooling off"
- **🛑 Kill switch: cancel all orders + stop agent immediately** (v5)

### US-06: Progressive Mode Upgrade (NEW in v5)

> **As a** user who has tested in mock mode,  
> **I want** to graduate to paper trading then live trading,  
> **So that** I can validate the strategy with increasing realism.

**Acceptance Criteria:**
- Mode selector: Mock → Paper → Live (sequential gates)
- Paper requires: CLI installed + connected
- Live requires: 7 days paper + explicit confirmation + funded wallet
- Mode displayed prominently on dashboard

### US-07: Withdraw

> **As a** user,  
> **I want** to withdraw to my wallet at any time,  
> **So that** I always control my funds.

**Acceptance Criteria:**
- "Stop Agent" → immediate halt
- "Withdraw" → funds return to user wallet
- Cannot withdraw during pending round → "Waiting for settlement"

---

## 10. Edge Cases

| Case | Handling |
|------|---------|
| Binance API down | SKIP, log error, retry next round |
| Polymarket CLI not installed | Gracefully disable Paper/Live modes. Mock works without CLI |
| CLI timeout (>30s) | Kill process, SKIP round, log error |
| Spread > 5¢ (Paper/Live) | SKIP regardless of signal confidence |
| Order book thin (<$50/side) | SKIP — insufficient liquidity |
| BTC price unchanged (flat) | Count as SKIP (no clear signal) |
| Insufficient gas (MATIC) | Dashboard warning, halt agent |
| Bankroll < $1 | Agent stops → "Bankroll depleted" |
| User disconnects | Agent continues server-side |
| CLI execution fails (Live) | Pause agent, notify user, require manual resume |
| Pending round at stop request | Complete current round, then stop |
| All signals neutral | SKIP — correct behavior |

---

## 11. Business Model (Updated v5)

### Revenue Streams

| Stream | Description |
|--------|------------|
| **Subscription** | Monthly SaaS tiers for individuals |
| **Performance fee** | 10% of realized profit (aligned incentives) |
| **Gateway API** | Per-agent pricing for AI agent developers |

### Individual Pricing Tiers

| Tier | Price | Bankroll Cap | Features |
|------|-------|-------------|----------|
| **Free** | $0 | $100 | 10 rounds/day, BTC only, basic dashboard |
| **Pro** | $9.99/mo | $5,000 | Unlimited rounds, 3 markets, portfolio dashboard |
| **Trader** | $29.99/mo | $50,000 | Paper + Live modes, backtesting, all markets |
| **Quant** | $99/mo | Unlimited | API access, custom strategies, priority support |

### Gateway API Pricing (for AI Agent Developers)

| Tier | Price | Agents | Features |
|------|-------|--------|----------|
| **Starter** | $0 | 1 agent, $1K bankroll | Basic discipline checks |
| **Builder** | $49/mo | 10 agents, $50K bankroll | Full discipline engine + analytics |
| **Platform** | $199/mo | Unlimited agents | Custom rules, webhooks, white-label |

All tiers: **10% performance fee on profit** (5% for Platform tier).

### Unit Economics

```
Conservative (Year 1):
  1,000 Pro users × $9.99/mo = $9,990/mo = $120K ARR

Optimistic (Year 1):
  800 Pro × $9.99 + 150 Trader × $29.99 + 50 Quant × $99 = $17,435/mo
  + 50 Builder agents × $49 = $2,450/mo
  + Performance fees: ~$5,000/mo (estimated)
  Total: ~$25K/mo = ~$300K ARR

Gross margin: ~98% (SaaS, minimal server costs)
```

### Regulatory Considerations

Automated betting with user funds in prediction markets is a **legal grey area**:

- May be classified as: gambling service, investment advice, or automated trading
- Jurisdiction-dependent: US, EU, UAE each have different frameworks
- **MVP operates on testnet / mock mode — no real funds, no regulatory trigger**
- Live mode (V3.0) requires: validated backtest + legal review + security audit
- **This is acknowledged as a significant business risk**

---

## 12. Implementation Summary

### What Was Built (5 days)

| Day | Built | Status |
|-----|-------|--------|
| Day 1 | Spec v1-v4, market research, GitHub repo | ✅ |
| Day 2 | Core app: React + Express + SQLite, signal engine, mock betting, dashboard | ✅ |
| Day 3 | Polymarket CLI integration (3 modes), enhanced signal engine | ✅ |
| Day 4 | Backtesting engine, portfolio dashboard, landing page (3 versions) | ✅ |
| Day 5 | Bug fixes, deployment to Vercel, presentation prep, AI showcase | ✅ |

### Pages Built

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Main trading view — stats, agent control, recent bets |
| Bet History | `/history` | Full bet log with filters |
| Analytics | `/analytics` | Signal performance breakdown |
| **Backtest** | `/backtest` | Historical strategy validation with visual charts |
| **Portfolio** | `/portfolio` | 8-section performance analysis |
| **Gateway** | `/gateway` | AI Agent Gateway management |
| Settings | `/profile` | Agent configuration, mode selection |

### API Endpoints

| Category | Endpoints | Count |
|----------|----------|-------|
| Health | `/api/health`, `/api/setup-status` | 2 |
| Dashboard | `/api/dashboard` | 1 |
| Bets | `/api/bets/history` | 1 |
| Backtest | `POST /api/backtest` | 1 |
| Portfolio | `/api/portfolio/*` (summary, equity, calendar, hourly, markets, streaks, risk, export/csv) | 8 |
| Polymarket | `/api/polymarket/*` (markets, market/:id, price/:tokenId) | 3 |
| **Total** | | **16** |

---

## 13. Roadmap (Updated v5)

| Phase | Feature | Time | Status |
|-------|---------|------|--------|
| ~~V1.0~~ | ~~Mock mode MVP~~ | ~~3 days~~ | ✅ **Done** |
| ~~V1.1~~ | ~~Polymarket CLI integration (3 modes)~~ | ~~1 day~~ | ✅ **Done** |
| ~~V1.2~~ | ~~Backtesting engine~~ | ~~1 day~~ | ✅ **Done** |
| ~~V1.3~~ | ~~Portfolio dashboard~~ | ~~1 day~~ | ✅ **Done** |
| ~~V1.4~~ | ~~Landing page + deployment~~ | ~~1 day~~ | ✅ **Done** |
| **V1.5** | Telegram bot: alerts + start/stop | 3 days | 🔜 Next |
| **V2.0** | Paper trading validation (7+ days live data) | 2 weeks | ⏳ |
| V2.1 | Multiple strategies: Aggressive, Custom | 2 weeks | — |
| V2.2 | Additional markets: ETH, SOL live | 1 week | — |
| V2.5 | Agent Gateway production + OpenClaw plugin | 2 weeks | — |
| V2.6 | Social: leaderboard, copy trading | 2 weeks | — |
| **V3.0** | **Mainnet deployment** | 1 month | 🔒 **Requires: backtest data + legal review + audit** |

---

## 15. Risk Disclosure

This product is a **hackathon MVP demonstration**.

- The signal engine's win rate is an **untested hypothesis**
- Past simulated results do **not** predict future performance
- Prediction markets involve **significant risk of loss**
- This is **not** investment advice, financial advice, or a profit guarantee
- Users should **never** deposit funds they cannot afford to lose
- Automated prediction market trading occupies a **regulatory grey area**
- The core product value is **automated risk management**, not profit generation
- Mock and Paper modes involve **zero real funds** — no financial risk

---
