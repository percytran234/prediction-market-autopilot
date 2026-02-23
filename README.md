[spec-en-v3.md](https://github.com/user-attachments/files/25475478/spec-en-v3.md)
# SPEC — Prediction Market Auto-Pilot Agent

> **Track:** Agent Wallet  
> **MVP Angle:** Prediction Market Agent — BTC 15-min Up/Down on Polymarket  
> **Blockchain:** Polygon PoS (Polymarket native chain)  
> **Implementation Window:** 3 days (Day 2–4)  
> **Spec Submission:** Day 1  
> **Author:** Trump666eth

---

## 1. Track: Agent Wallet

An AI Agent with its own wallet on Polygon. Users deposit USDC, the agent autonomously places bets on Polymarket's BTC 15-minute Up/Down markets using a **disciplined, rule-based strategy** focused on capital preservation and risk management.

The agent does not promise profits. It provides **automated discipline** — something most retail users lack — through strict bet sizing, signal filtering, and hard stop-loss limits.

---

## 2. Target User

**Persona:** Crypto-curious individuals who lack trading knowledge or technical analysis skills.

**Profile:**

- Holds a small amount of crypto ($50–$500 in USDC)
- Has heard about Polymarket but doesn't know where to start
- Cannot read charts, doesn't understand technical indicators
- Wants to try prediction markets but **fears losing money due to emotional/impulsive decisions**
- Does not have time to monitor every 15-minute round

**Explicitly NOT targeting:**

- Professional traders (they do their own analysis)
- High-risk gamblers seeking fast returns

### Why This User Matters (Market Context)

Polymarket surpassed **$1B+ in monthly trading volume in 2024**, driven largely by the US election cycle. As political markets cool, Polymarket is pivoting into **crypto price prediction markets** (BTC/ETH 1-min, 5-min, 15-min) to sustain engagement. This creates a massive influx of **new retail users** drawn by simplicity but lacking the discipline to manage risk.

Our agent targets exactly this gap: retail users who need **automated risk management** — not a crystal ball, but a disciplined co-pilot.

---

## 3. Problem Statement

### Core Pain Points

Polymarket BTC 15-min markets are appealing (fast, simple, binary up/down) but:

1. **Knowledge barrier:** Users don't know when to bet UP or DOWN — guessing = losing
2. **Execution friction:** Must open Polymarket, select market, set amount, confirm — repeat every 15 minutes
3. **No bankroll management:** Users tend to FOMO all-in on a single round → wipe out
4. **No exit discipline:** Winners get greedy, losers chase losses — both paths lead to ruin

### Core Value Proposition

The agent's primary value is NOT predicting the market. It is:

1. **Automated discipline** — bet sizing, stop-loss, take-profit enforced by code, not willpower
2. **Signal filtering** — skip low-confidence rounds instead of gambling on every one
3. **Emotion elimination** — no FOMO, no revenge trading, no greed

Whether the signal engine achieves 51% or 55% win rate, the money management layer ensures **the user loses slowly on bad days and capitalizes on good days** — a structural advantage over undisciplined manual trading.

### Competitive Landscape

| Existing Solution | Limitation | Our Advantage |
|-------------------|-----------|---------------|
| Manual trading on Polymarket | Requires knowledge, time, emotional discipline | Fully autonomous, emotion-free |
| Generic trading bots (3Commas, Pionex) | Built for CEX spot/futures, not prediction markets | Purpose-built for Polymarket binary outcomes |
| DeFi yield aggregators (Yearn, Beefy) | Passive yield, no active trading | Active participation with risk controls |
| Copy trading platforms | Following others blindly, no risk management | Own signal engine + strict money management |

**No existing product offers autonomous, risk-managed betting on Polymarket prediction markets.** This is a greenfield opportunity.

---

## 4. Core Flow

```
[User] → Open dashboard → Connect wallet (Polygon network)
              ↓
[User] → Deposit USDC into Agent Wallet on Polygon (e.g., $100)
              ↓
[User] → Select "Safe Mode" (default)
         + Daily budget: $20/day
         + Stop-loss: halt if daily loss exceeds 10% of bankroll
         + Take-profit: halt if daily profit reaches 5% of bankroll
              ↓
[User] → Click "Start Agent"
              ↓
[Agent] → Every 15-minute round:
         1. Fetch real-time BTC data (price, momentum, volume)
         2. Compute signals: EMA + RSI + Volume + Market Odds
         3. Confidence ≥ 60% → BET UP or BET DOWN (2% of bankroll)
         4. Confidence < 60% → SKIP this round
              ↓
[Agent] → After each round:
         - Update P&L on dashboard
         - Check limits → hit stop-loss or take-profit → AUTO-STOP
              ↓
[User] → Real-time dashboard: bankroll, win rate, P&L, bet history
              ↓
[User] → At any time: "Stop Agent" or "Withdraw" to personal wallet
```

---

## 5. Strategy Design

### 5.1 — Signal Engine

| Signal | Description | Weight | Data Source |
|--------|------------|--------|------------|
| **Price Momentum** | BTC trend over last 1h (EMA 5 vs EMA 15 crossover) | 30% | Binance REST — `/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60` |
| **Volume Spike** | Current 15-min volume vs 1h average → spike = continuation | 20% | Binance REST — same kline endpoint, volume field |
| **RSI (14)** | Oversold (<30) → likely bounce UP. Overbought (>70) → likely pullback DOWN | 25% | Computed from 14 close prices |
| **Market Odds** | Polymarket odds skewed >65/35 → contrarian value bet | 25% | Polymarket API `/prices` (mock: fixed 50/50) |

**Signal Computation Flow:**

```
Binance API (60 x 1-min candles)
       ↓
┌──────────────────────────────────┐
│ EMA(5) vs EMA(15)  → momentum   │ → score: +30 (bullish) or -30 (bearish)
│ RSI(14)            → reversal   │ → score: +25 (<30) or -25 (>70) or 0
│ Volume ratio       → conviction │ → score: ±20 (amplifies momentum direction)
│ Market odds        → value      │ → score: ±25 (contrarian when skewed)
└──────────────────────────────────┘
       ↓
Composite score → normalize to 0-100 confidence + direction
       ↓
Confidence ≥ 60% → BET (direction, 2% bankroll)
Confidence < 60% → SKIP
```

### 5.2 — Honest Assessment of Signal Edge

**Important caveat:** The win rate of this signal engine is a **hypothesis, not a proven fact.**

BTC 15-min markets on Polymarket are **highly efficient**. Institutional quant funds and sophisticated bots already compete in this space. Simple indicators like EMA + RSI may not consistently provide edge above 50%.

**What we know:**
- The signal engine will filter out clearly low-confidence rounds (SKIP ~40-50%)
- On rounds where signals align strongly, there is *some* statistical basis for directional bias
- The actual win rate could range anywhere from **48% to 56%** — we don't know until tested

**What we do NOT claim:**
- ❌ We do NOT claim guaranteed 53-58% win rate
- ❌ We do NOT claim the agent will always be profitable
- ❌ We do NOT claim this outperforms professional quant strategies

**What we DO claim:**
- ✅ The agent provides **better risk management** than any human manually betting
- ✅ The SKIP mechanism reduces exposure to low-quality rounds
- ✅ The money management layer **limits downside** regardless of win rate
- ✅ Even at 50% win rate (random), the user loses only fees — not the account

**The real edge is not prediction — it's discipline.**

### 5.3 — Money Management (The Actual Edge)

This is the core value of the product. Money management protects users **regardless of signal engine accuracy.**

| Rule | Default Value | Purpose |
|------|--------------|---------|
| **Bet size** | 2% of bankroll per round | Single loss = $2 on $100. Never blows up the account |
| **Daily loss limit** | -10% → auto-stop | Worst day capped at 10% loss |
| **Daily profit target** | +5% → auto-stop | Lock in gains, prevent greed |
| **Max consecutive losses** | 4 in a row → pause 1 hour | Avoid bad streaks, force cooldown |
| **Streak bonus** | 3 consecutive wins → increase to 3% | Lightly capitalize on hot streaks |

### 5.4 — Scenario Analysis (Honest Numbers)

```
Bankroll: $100 | Bet: $2/round (2%) | ~20 rounds/day (skip ~50%)

SCENARIO A — Signal engine works (55% win rate):
  → 11 win × $2 = +$22, 9 loss × $2 = -$18 → +$4/day (+4%)
  → This is the optimistic but unproven case

SCENARIO B — Signal engine is no better than random (50%):
  → 10 win × $2 = +$20, 10 loss × $2 = -$20 → BREAK EVEN (minus small fees)
  → User loses very little — money management protects capital

SCENARIO C — Bad day, signal engine underperforms (45%):
  → 9 win × $2 = +$18, 11 loss × $2 = -$22 → -$4/day
  → Daily loss limit (-10%) kicks in and STOPS the agent before reaching -$10

SCENARIO D — Worst case, everything goes wrong:
  → Agent hits 4 consecutive losses early → pauses 1 hour
  → Resumes, hits daily loss limit → stops completely
  → Maximum damage: -$10 (10% of $100). Agent refuses to continue.
  → User still has $90. No wipeout.
```

**Key takeaway:** The product's promise is NOT "you will make money." The promise is: **"You won't blow up your account, and you'll have a better chance than doing it yourself emotionally."**

### 5.5 — Path to Validation (Post-MVP)

The signal engine hypothesis MUST be validated before any real-money deployment:

1. **V1.2 — Backtesting engine:** Run signal engine against 30+ days of historical BTC 15-min data from Polymarket. Measure actual win rate, drawdown, Sharpe ratio.
2. **Paper trading phase:** Run agent with mock money for 2 weeks. Publish transparent results.
3. **Only after validated data** → Consider mainnet deployment with real funds.

This spec is for an **MVP/hackathon demo**. Any claim about profitability would be premature without backtest data.

---

## 6. Scope Definition (3-Day Constraint)

### ✅ In Scope

- Single market: BTC 15-min Up/Down on Polymarket
- Single strategy: Safe Mode
- Single chain: Polygon PoS
- Agent wallet on Polygon (ethers.js / viem)
- Signal engine: Binance API → EMA + RSI + Volume computation
- **Mock betting mode as primary implementation** (real BTC prices, simulated outcomes)
- Web dashboard: bankroll, P&L, win rate, bet history, agent status
- Hard limits: daily loss, daily profit, consecutive loss, auto-stop
- Withdraw flow
- Risk disclaimers prominently displayed in UI

### ❌ Out of Scope

- Multi-market (ETH, SOL, non-crypto predictions)
- Multiple strategy modes
- Custom signal configuration
- Backtesting engine (V1.2 roadmap)
- Mainnet real money deployment
- Mobile app / Authentication system
- Telegram/Discord bot integration
- Advanced charting
- Social features (leaderboard, copy trading)
- Polymarket CLOB API live integration (see section 7 — Fallback)

### Scope Decision Rationale

Every additional feature costs 0.5–1 day. With a 3-day implementation window, the MVP must prove **one thing only:** an AI agent can autonomously manage a prediction market wallet with disciplined risk controls. One working happy path > ten incomplete features.

---

## 7. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Blockchain** | **Polygon PoS** | Polymarket native. Gas ~$0.01/tx. High USDC liquidity |
| Frontend | React + Vite + TailwindCSS | Fast setup, responsive UI |
| Backend | Node.js + Express | Lightweight, real-time capable |
| Wallet | ethers.js v6 + Polygon RPC | Generate agent wallet, sign transactions |
| Price Data | Binance REST API (free, no key) | BTC 1-min klines for signal computation |
| Bet Execution | **Mock mode (primary)** | Real BTC price, simulated bet outcomes |
| AI Layer | Claude API / OpenAI API | Bet explanation (optional Day 4) |
| Scheduler | node-cron | Configurable interval (1-min for demo, 15-min for production) |
| Database | SQLite (better-sqlite3) | Zero-config, embedded, single-user MVP |

### Why Polygon?

- **Polymarket native:** deployed on Polygon → zero bridging complexity
- **Ultra-low gas:** ~$0.01/tx → 20 rounds/day costs ~$0.20
- **Native USDC:** High liquidity, no wrapped token required
- **Testnet ready:** Polygon Amoy (chain ID 80002) with faucet
- **Free RPC:** Alchemy/Infura/QuickNode Polygon free tier

### Implementation Strategy: Mock Mode First

**Polymarket CLOB API is significantly more complex than it appears.** Placing bets programmatically requires handling:

- CLOB order book matching (not simple REST calls)
- Order signing with EIP-712 typed data
- Slippage management and minimum order sizes
- Settlement timing and result resolution
- API rate limits and authentication

**For a 3-day MVP, this is out of scope.** Instead, the MVP uses **Mock Mode**:

- **Real data:** Agent uses live BTC price from Binance (not fake/random data)
- **Real signals:** EMA, RSI, Volume computed from actual market data
- **Simulated execution:** Agent records BTC price at bet time, compares with price after round interval. UP bet + price went up = WIN.
- **Full dashboard:** All UI, money management, and auto-stop work identically
- **Demo quality:** Indistinguishable from live betting in terms of user experience

**Polymarket CLOB integration is a V1.1 roadmap item** — to be built after the MVP is validated and the signal engine is backtested.

---

## 8. User Stories

### US-01: Deposit & Setup

> **As a** user with no trading knowledge,  
> **I want to** deposit USDC and select Safe Mode with one click,  
> **So that** the Agent starts working without me needing to understand anything else.

**Acceptance Criteria:**
- Connect MetaMask on Polygon → display address + USDC balance
- Transfer USDC to agent wallet → dashboard balance updates
- Select "Safe Mode" → display summary: 2% bet size, -10% loss limit, +5% profit target
- **Risk disclaimer visible before starting:** "This agent does not guarantee profits. Only use funds you can afford to lose."
- Click "Start Agent" → status changes to ACTIVE

### US-02: Autonomous Betting

> **As a** user,  
> **I want** the Agent to analyze and place bets every 15 minutes autonomously,  
> **So that** I don't need to monitor or make any decisions.

**Acceptance Criteria:**
- Every 15 minutes: Agent fetches data → computes signals → BET UP/DOWN or SKIP
- Dashboard updates: decision, brief reasoning (e.g., "RSI 28 oversold + EMA bullish → BET UP"), amount, result
- SKIP displayed clearly: "Confidence 48% — skipping this round"

### US-03: Real-Time Dashboard

> **As a** user,  
> **I want to** see my performance in real-time,  
> **So that** I feel informed and can stop early if desired.

**Acceptance Criteria:**
- Current bankroll (USDC)
- Today's P&L ($ and %, **red when negative — no sugar-coating**)
- Win rate (X wins / Y total bets)
- Bet history table: each row = 1 round (time, direction, amount, result, balance after)
- Agent status badge: 🟢 ACTIVE / 🔴 STOPPED (with reason)
- **Cumulative disclaimer footer:** "Past results do not predict future performance"

### US-04: Auto-Stop on Limits

> **As a** user who doesn't know when to stop,  
> **I want** the Agent to automatically halt when loss or profit limits are hit,  
> **So that** I neither lose too much nor get too greedy.

**Acceptance Criteria:**
- Loss hits -10% daily → Agent stops → "⛔ Stopped: daily loss limit reached (-$10)"
- Profit hits +5% daily → Agent stops → "✅ Stopped: daily profit target reached (+$5)"
- 4 consecutive losses → pause 1 hour → "⏸️ Paused: 4 consecutive losses, cooling off for 1h"

### US-05: Withdraw

> **As a** user,  
> **I want to** withdraw funds to my personal wallet at any time,  
> **So that** I always maintain control over my money.

**Acceptance Criteria:**
- "Stop Agent" → Agent immediately ceases betting
- "Withdraw All" → USDC transfers from agent wallet to user wallet on Polygon
- Cannot withdraw during unsettled bet → display: "Waiting for current round to settle"

---

## 9. Edge Cases

| Case | MVP Handling |
|------|-------------|
| BTC price API down | SKIP round, log error, retry next round |
| Mock mode bet result unclear (price unchanged) | Count as SKIP (no winner in flat market) |
| Insufficient gas (MATIC) | Dashboard warning, halt agent |
| Bankroll < $1 (min bet) | Agent stops → "Bankroll depleted. Deposit more or withdraw" |
| User disconnects | Agent continues server-side; user reconnects to see updated dashboard |
| Round not yet settled | Wait for settlement before placing next bet |
| All signals neutral | SKIP — correct behavior, not a bug |
| Polygon RPC timeout | Retry twice, then SKIP round |

---

## 10. Business Model

| Model | Description |
|-------|------------|
| **Performance fee** | 15% of realized profit. Zero profit = zero fee |
| **Subscription** | Free: $100 max bankroll, 10 rounds/day. Pro ($4.99/mo): $5k bankroll, unlimited |
| **Incentive alignment** | Platform earns only when users earn → strong motivation to optimize strategy |

### Unit Economics (Hypothetical — requires validation)

```
Assume 1,000 active Pro subscribers:
- Subscription revenue: 1,000 × $4.99 = $4,990/mo
- Performance fee: dependent on actual agent performance (unvalidated)
- Conservative estimate (subscription only): ~$5,000/mo at 1,000 users

Note: Performance fee projections require backtest data.
We do not project performance fee revenue without validated win rate data.
```

### Regulatory Considerations

Automated betting with user funds in prediction markets occupies a **legal grey area** in many jurisdictions. Before any mainnet/production deployment:

- Legal review required for relevant jurisdictions (US, EU, UAE)
- Potential classification as: investment advice, gambling service, or automated trading
- May require: gambling license, investment advisor registration, or terms-of-service shields
- MVP is testnet-only demo — no real funds, no regulatory trigger

**This is acknowledged as a significant business risk for V3.0 (mainnet).** The MVP intentionally operates on testnet with mock data to avoid triggering any regulatory requirements.

---

## 11. Implementation Plan (3 Days)

### Day 2 — Foundation

**Morning:**
- Project setup: React + Vite + Express + ethers.js
- Polygon configuration: RPC endpoint (Alchemy), chain ID (80002), USDC contract
- Agent wallet module: generate Polygon wallet, store encrypted private key server-side
- Frontend: MetaMask connection (auto-switch to Polygon Amoy), display balance

**Afternoon:**
- Deposit flow: user wallet → agent wallet (Polygon transfer)
- BTC price feed: Binance REST API (1-min klines)
- Signal engine v1: compute EMA(5), EMA(15), RSI(14), volume delta
- Unit tests for signal computation

**Push to GitHub ✅**

### Day 3 — Agent Core + Dashboard

**Morning:**
- Mock betting engine: record BTC price → wait interval → compare → WIN/LOSS
- Agent loop: node-cron → fetch signals → decide → mock bet → log
- Money management engine: bet sizing, daily limits, consecutive loss tracking

**Afternoon:**
- Auto-stop logic implementation
- Dashboard UI: bankroll card, P&L card, win rate, bet history table, status badge
- Risk disclaimers integrated into UI
- Polling-based updates (5-second interval)

**Push to GitHub ✅**

### Day 4 — Polish + Demo Ready

**Morning:**
- Withdraw flow (agent wallet → user wallet on Polygon)
- End-to-end test: deposit → start → 5-10 rounds → auto-stop → withdraw
- AI explanation per bet (optional Claude/OpenAI call)

**Afternoon:**
- UI polish: loading states, error toasts, empty states, responsive design
- Seed demo data: script generates 15-20 realistic rounds
- Capture AI prompt screenshots for AI Showcase
- Final push to GitHub ✅

---

## 12. Demo Script (Day 5 Presentation)

| Section | Duration | Content |
|---------|----------|---------|
| **Problem & User** | 2 min | "Polymarket is booming. Retail users are flooding in. They lose because they bet emotionally and can't manage risk." |
| **Solution** | 1 min | "An AI agent that doesn't predict better — it *manages* better. Automated discipline, not a crystal ball." |
| **Live Demo** | 5 min | Dashboard → Connect wallet → Bet history (wins, losses, skips) → Show auto-stop trigger → Show money management in action → Withdraw |
| **Honest Assessment** | 1 min | "Signal engine is a hypothesis. The real value is risk management. Here's why even at 50% win rate, users are protected." |
| **AI Showcase** | 3 min | Prompts: strategy design, code generation, debugging |
| **Roadmap** | 1 min | Backtest validation → Paper trading → Multi-market → Mainnet |
| **Q&A** | 5-8 min | See prepared answers below |

### Prepared Q&A

**Q: "Win rate 53-58% — how do you know?"**
A: We don't — that's a hypothesis, not a proven number. The signal engine uses standard technical indicators that have *some* statistical basis, but BTC 15-min prediction markets are highly efficient. The honest answer is we need backtesting on historical data before making any win rate claims. What we DO know is the money management layer protects capital even at 50% win rate.

**Q: "How is this different from gambling?"**
A: Three key differences. First, the agent SKIPS when signals are weak — a gambler never skips. Second, position sizing is fixed at 2% — a gambler goes all-in. Third, hard stop-losses are enforced by code — a gambler chases losses. The agent removes the emotional component that makes gambling destructive.

**Q: "What if the agent keeps losing?"**
A: Daily loss limit caps damage at 10%. Four consecutive losses triggers an automatic 1-hour pause. In the worst realistic scenario, the user loses $10 on a $100 bankroll and the agent stops. No wipeout is possible with these controls in place.

**Q: "Isn't this a regulatory risk?"**
A: Yes, and we take it seriously. The MVP is testnet-only — zero real funds. Before any mainnet deployment, legal review is required for gambling/investment regulations in target jurisdictions. This is explicitly in our roadmap as a V3.0 gate.

**Q: "Why not integrate Polymarket API directly?"**
A: Polymarket's CLOB API requires EIP-712 order signing, order book matching, slippage handling, and settlement timing — significantly more complex than a REST API call. For a 3-day MVP, mock mode with real BTC prices proves the concept equally well. CLOB integration is a V1.1 item with dedicated time.

---

## 13. Roadmap

| Phase | Feature | Estimated Time | Gate |
|-------|---------|---------------|------|
| V1.1 | Polymarket CLOB API live integration | 1 week | — |
| V1.2 | **Backtesting engine** — validate win rate on 30+ days historical data | 1 week | **Must complete before any real-money claims** |
| V1.3 | Paper trading: 2-week mock run with published results | 2 weeks | Must show positive or neutral EV |
| V1.4 | Telegram bot: notifications + start/stop | 3 days | — |
| V2.0 | Multiple modes: Aggressive, Custom indicators | 2 weeks | — |
| V2.1 | Additional markets: ETH, SOL 15-min | 1 week | — |
| V2.5 | Social: leaderboard, copy strategy from top agents | 2 weeks | — |
| V3.0 | **Mainnet deployment** | 1 month | **Requires: validated backtest + legal review + audit** |

---

## Risk Disclosure

**This product is a hackathon MVP demonstration.** It operates on testnet with mock betting and does not involve real funds.

- The signal engine's effectiveness is an untested hypothesis
- Past simulated results do not predict future performance
- Prediction markets involve significant risk of loss
- This is NOT investment advice, financial advice, or a guaranteed income tool
- Users should never deposit funds they cannot afford to lose
- Regulatory status of automated prediction market trading varies by jurisdiction

**The core product value is automated risk management, not profit generation.**

---

*This spec was generated using Claude AI — pending Lucas review on Day 1.*
