
[Uploading spec-en.md…]()
# SPEC — Prediction Market Auto-Pilot Agent

> **Track:** Agent Wallet  
> **MVP Angle:** Prediction Market Agent — BTC 15-min Up/Down on Polymarket  
> **Blockchain:** Polygon PoS (Polymarket native chain)  
> **Implementation Window:** 3 days (Day 2–4)  
> **Spec Submission:** Day 1

---

## 1. Track: Agent Wallet

An AI Agent with its own wallet on Polygon. Users deposit USDC, the agent autonomously places bets on Polymarket's BTC 15-minute Up/Down markets using a capital-preservation strategy designed so that even users with zero trading knowledge can **break even to win small**.

---

## 2. Target User

**Persona:** Crypto-curious individuals who lack trading knowledge or technical analysis skills.

**Profile:**

- Holds a small amount of crypto ($50–$500 in USDC)
- Has heard about Polymarket but doesn't know where to start
- Cannot read charts, doesn't understand technical indicators
- Wants to try for fun but **fears losing money** — mindset: "Losing a little is OK, losing a lot is not"
- Does not have time to monitor every 15-minute round

**Explicitly NOT targeting:**

- Professional traders (they do their own analysis)
- High-risk gamblers seeking fast returns

---

## 3. Problem Statement

### Core Pain Points

Polymarket BTC 15-min markets are appealing (fast, simple, binary up/down) but:

1. **Knowledge barrier:** Users don't know when to bet UP or DOWN — guessing = losing
2. **Execution friction:** Must open Polymarket, select market, set amount, confirm — repeat every 15 minutes
3. **No bankroll management:** Users tend to FOMO all-in on a single round → wipe out
4. **No exit discipline:** Winners get greedy, losers chase losses — both paths lead to ruin

### Key Insight

BTC 15-min prediction markets **do not require 100% accuracy to be profitable**. The requirements are:

- Win rate > 52-53% (odds are typically near 50/50)
- Strict bankroll management (fixed fraction betting)
- Disciplined exit rules (daily profit target + daily loss limit)

→ **AI Agent has an absolute edge:** faster analysis than humans, zero emotion, 100% rule compliance.

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

## 5. Strategy: Break Even to Win Small

### 5.1 — Signal Engine

| Signal | Description | Weight |
|--------|------------|--------|
| **Price Momentum** | BTC trend over last 1h (EMA 5 vs EMA 15 crossover) | 30% |
| **Volume Spike** | Abnormal volume → higher continuation probability | 20% |
| **RSI (14)** | Oversold (<30) → likely bounce UP. Overbought (>70) → likely pullback DOWN | 25% |
| **Market Odds** | Polymarket odds skewed >65/35 → value bet on the opposite side | 25% |

**Critical Rules:**

- Confidence ≥ 60% → BET. Below 60% → **SKIP**
- Skipping 30-50% of rounds is **normal and strategically correct**
- Target win rate: 53-58% on rounds where bets are placed

### 5.2 — Money Management

| Rule | Default Value | Purpose |
|------|--------------|---------|
| **Bet size** | 2% of bankroll per round | Single loss = $2 on $100. Never blows up the account |
| **Daily loss limit** | -10% → auto-stop | Worst day capped at 10% loss |
| **Daily profit target** | +5% → auto-stop | Lock in gains, prevent greed |
| **Max consecutive losses** | 4 in a row → pause 1 hour | Avoid bad streaks |
| **Streak bonus** | 3 consecutive wins → increase to 3% | Lightly capitalize on hot streaks |

### 5.3 — Mathematical Model

```
Bankroll: $100 | Bet: $2/round (2%) | ~20 rounds/day (skip ~50%)

Win rate 50% (random guessing) → +$20 - $20 = BREAK EVEN
Win rate 55% (signal engine)   → +$22 - $18 = +$4/day (+4%)
Win rate 45% (bad day)         → +$18 - $22 = -$4 → daily loss limit stops early

Best case:   +3-5%/day
Normal case: +1-2%/day or break even
Worst case:  -10%/day (daily loss limit protects)
```

→ Positive expected value over multiple days. Not get-rich-quick, but account preservation guaranteed.

---

## 6. Scope Definition (3-Day Constraint)

### ✅ In Scope

- Single market: BTC 15-min Up/Down on Polymarket
- Single strategy: Safe Mode
- Single chain: Polygon PoS
- Agent wallet on Polygon (ethers.js / viem)
- Signal engine: Binance API → EMA + RSI + Volume computation
- Polymarket CLOB API integration (fallback: Mock mode with real BTC price)
- Web dashboard: bankroll, P&L, win rate, bet history, agent status
- Hard limits: daily loss, daily profit, consecutive loss, auto-stop
- Withdraw flow

### ❌ Out of Scope

- Multi-market (ETH, SOL, non-crypto predictions)
- Multiple strategy modes
- Custom signal configuration
- Backtesting engine
- Mainnet real money deployment
- Mobile app / Authentication system
- Telegram/Discord bot integration
- Advanced charting
- Social features (leaderboard, copy trading)

---

## 7. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Blockchain** | **Polygon PoS** | Polymarket runs natively on Polygon. Gas ~$0.01/tx. High USDC liquidity |
| Frontend | React + Vite + TailwindCSS | Fast setup, responsive UI |
| Backend | Node.js + Express | Lightweight, real-time capable |
| Wallet | ethers.js + Polygon RPC | Generate agent wallet, sign transactions on Polygon |
| Price Data | Binance WebSocket API (free) | Real-time BTC price + volume + kline, low latency |
| Prediction Market | Polymarket CLOB API | Programmatic bet placement on Polygon |
| AI Layer | Claude API / OpenAI API | Signal analysis, bet explanation for users |
| Scheduler | node-cron | 15-minute loop execution |

### Why Polygon?

- **Polymarket native:** Polymarket is deployed on Polygon → zero bridging complexity
- **Ultra-low gas:** ~$0.01/tx → 20 rounds/day costs ~$0.20 in gas
- **Native USDC:** High liquidity on Polygon, no wrapped token required
- **Testnet ready:** Polygon Amoy testnet with faucet for development
- **Free RPC:** Alchemy, Infura, QuickNode all support Polygon free tier

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
- Click "Start Agent" → status changes to ACTIVE

### US-02: Autonomous Betting

> **As a** user,  
> **I want** the Agent to analyze and place bets every 15 minutes autonomously,  
> **So that** I don't need to monitor or make any decisions.

**Acceptance Criteria:**
- Every 15 minutes: Agent fetches data → computes signals → BET UP/DOWN or SKIP
- Dashboard updates: decision, brief reasoning (e.g., "RSI oversold + momentum UP → BET UP"), amount, result
- SKIP displayed clearly: "Confidence 48% — skipping this round"

### US-03: Real-Time Dashboard

> **As a** user,  
> **I want to** see my performance in real-time,  
> **So that** I feel informed and can stop early if desired.

**Acceptance Criteria:**
- Current bankroll (USDC)
- Today's P&L ($ and %)
- Win rate (X wins / Y total bets)
- Bet history table: each row = 1 round (time, direction, amount, result, balance after)
- Agent status badge: 🟢 ACTIVE / 🔴 STOPPED (with reason)

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
| Polymarket API error | SKIP, never force a bet under uncertainty |
| Insufficient gas (MATIC) | Dashboard warning, halt agent |
| Bankroll < $1 (min bet) | Agent stops → "Bankroll depleted. Deposit more or withdraw" |
| User disconnects | Agent continues server-side; user reconnects to see updated dashboard |
| Round not yet settled | Wait for settlement before placing next bet |
| All signals neutral | SKIP — correct behavior, not a bug |
| Polygon RPC timeout | Retry twice, then SKIP round if still failing |

---

## 10. Business Model

| Model | Description |
|-------|------------|
| **Performance fee** | 15% of realized profit. Zero profit = zero fee |
| **Subscription** | Free: $100 max bankroll, 10 rounds/day. Pro ($4.99/mo): $5k bankroll, unlimited |
| **Incentive alignment** | Platform earns only when users earn → strong motivation to optimize strategy |

---

## 11. Implementation Plan (3 Days)

### Day 2 — Foundation

**Morning:**
- Project setup: React + Vite + Express + ethers.js
- Polygon configuration: RPC endpoint (Alchemy), chain ID (137/80002), USDC contract
- Agent wallet module: generate Polygon wallet, store encrypted private key server-side
- Frontend: MetaMask connection (auto-switch to Polygon), display USDC balance

**Afternoon:**
- Deposit flow: user wallet → agent wallet (Polygon USDC transfer)
- BTC price feed: Binance WebSocket (1m kline real-time)
- Signal engine v1: compute EMA(5), EMA(15), RSI(14), volume delta
- Unit tests for signal computation

**Push to GitHub ✅**

### Day 3 — Agent Core + Dashboard

**Morning:**
- Polymarket CLOB API integration: place order, query result
- Fallback: Mock mode — real BTC price data, simulated bet outcomes
- Agent loop: node-cron every 15 min → fetch signals → decide → bet/skip → log

**Afternoon:**
- Money management engine: bet sizing, daily limits, consecutive loss tracking
- Auto-stop logic implementation
- Dashboard UI: bankroll card, P&L card, win rate display, bet history table, status badge
- Real-time updates via WebSocket or polling

**Push to GitHub ✅**

### Day 4 — Polish + Demo Ready

**Morning:**
- Withdraw flow (agent wallet → user wallet on Polygon)
- AI explanation: each bet includes brief reasoning from Claude/OpenAI
- End-to-end test: deposit → start → 5-10 rounds → auto-stop → withdraw

**Afternoon:**
- UI polish: loading states, error toasts, empty states, responsive design
- Seed demo data: run agent for 15-20 simulated rounds to populate history
- Capture AI prompt screenshots for showcase
- Final push to GitHub ✅

---

## 12. Demo Script (Day 5 Presentation)

| Section | Duration | Content |
|---------|----------|---------|
| Problem & User | 2 min | "Prediction markets are hot, but average users guess randomly and lose" |
| Live Demo | 5 min | Connect wallet → Deposit $100 → Safe Mode → Start → Show 2-3 rounds (bet + skip) → Dashboard → Auto-stop trigger → Withdraw |
| AI Showcase | 3 min | Prompts used for strategy design, code generation, debugging |
| Roadmap | 2 min | Multi-market, backtesting, Telegram bot, mainnet |
| Q&A | 5-8 min | "Why this strategy?", "What if it keeps losing?", "Biggest risk?" |

---

## 13. Roadmap

| Phase | Feature |
|-------|---------|
| V1.1 | Additional markets: ETH, SOL 15-min |
| V1.2 | Backtesting engine: validate win rate on historical data |
| V1.3 | Telegram bot: notifications + start/stop via Telegram |
| V2.0 | Multiple modes: Aggressive (5% bet), Custom (user-defined indicators) |
| V2.1 | Social layer: leaderboard, copy strategy from top agents |
| V3.0 | Mainnet production deployment + MPC key management |

---
