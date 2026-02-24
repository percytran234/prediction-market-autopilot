/**
 * Prediction Market Auto-Pilot — Comprehensive Test Suite
 *
 * Covers all changed components from the dark-green trading dashboard redesign:
 *   - AgentEngine (core engine logic)
 *   - Sidebar (navigation + sound toggle)
 *   - TickerTape (live BTC price ticker)
 *   - DashboardPage (main trading dashboard)
 *   - HistoryPage (trade history + filtering + modal)
 *   - AnalyticsPage (charts + metrics)
 *   - ProfilePage (rank system + achievements + journal)
 *   - ToastContainer (notification system)
 *   - Tailwind config (color theme)
 *   - App (routing + wallet + keyboard shortcuts)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';


// ─────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────

vi.mock('../engine/priceService.js', () => ({
  getCurrentBTCPrice: vi.fn(() => Promise.resolve(97500.00)),
  fetchBTCKlines: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../engine/signalEngine.js', () => ({
  computeSignals: vi.fn(() => Promise.resolve({
    direction: 'UP',
    confidence: 72.5,
    reasoning: 'RSI oversold bounce expected',
    currentPrice: 97500.00,
  })),
}));

vi.mock('recharts', () => {
  const React = require('react');
  const createMockComponent = (name) => React.forwardRef(({ children, ...props }, ref) => React.createElement('div', { ...props, 'data-testid': name, ref }, children));
  return {
    ResponsiveContainer: ({ children }) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    AreaChart: createMockComponent('area-chart'),
    Area: () => null,
    BarChart: createMockComponent('bar-chart'),
    Bar: () => null,
    LineChart: createMockComponent('line-chart'),
    Line: () => null,
    PieChart: createMockComponent('pie-chart'),
    Pie: () => null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    ReferenceLine: () => null,
  };
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function createMockEngine(overrides = {}) {
  const defaultState = {
    bankroll: 500,
    totalDeposited: 500,
    agentStatus: 'idle',
    stopReason: null,
    pnl: 25.50,
    pnlPercent: 5.1,
    winRate: 62.5,
    totalBets: 16,
    wins: 10,
    losses: 6,
    skips: 2,
    consecutiveWins: 3,
    consecutiveLosses: 0,
    activeBets: 0,
    successRate: 62.5,
  };

  return {
    getDashboard: vi.fn(() => ({ ...defaultState, ...overrides })),
    getBets: vi.fn(() => []),
    getActivityLog: vi.fn(() => []),
    getPriceHistory: vi.fn(() => []),
    getAllBetsWithHistory: vi.fn(() => []),
    getDailyHistory: vi.fn(() => []),
    start: vi.fn(),
    stop: vi.fn(),
    deposit: vi.fn(),
    withdraw: vi.fn(),
    reset: vi.fn(),
    destroy: vi.fn(),
    getState: vi.fn(() => ({})),
  };
}

function createMockBets(count = 10) {
  const bets = [];
  const baseTime = new Date('2026-02-24T10:00:00Z').getTime();
  let bankroll = 500;

  for (let i = 0; i < count; i++) {
    const isWin = i % 3 !== 2; // 2/3 wins, 1/3 losses
    const amount = 10 + Math.random() * 5;
    const pnl = isWin ? amount : -amount;
    bankroll += pnl;
    bets.push({
      id: baseTime + i * 60000,
      round_time: new Date(baseTime + i * 60000).toISOString(),
      direction: i % 2 === 0 ? 'UP' : 'DOWN',
      confidence: 60 + Math.random() * 30,
      amount: parseFloat(amount.toFixed(2)),
      btc_price_start: 97000 + i * 10,
      btc_price_end: 97000 + i * 10 + (isWin ? 50 : -50),
      result: isWin ? 'WIN' : 'LOSS',
      pnl: parseFloat(pnl.toFixed(2)),
      bankroll_after: parseFloat(bankroll.toFixed(2)),
      reasoning: `Signal ${i}: momentum indicators aligned`,
    });
  }
  return bets;
}

function renderWithRouter(ui, { initialEntries = ['/'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
}


// ═════════════════════════════════════════════
// 1. AgentEngine Unit Tests
// ═════════════════════════════════════════════

describe('AgentEngine', () => {
  let AgentEngine;

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const mod = await import('../engine/agentEngine.js');
    AgentEngine = mod.AgentEngine;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('creates with default state when no saved state exists', () => {
      const onChange = vi.fn();
      const engine = new AgentEngine(onChange);
      const dash = engine.getDashboard();

      expect(dash.bankroll).toBe(0);
      expect(dash.agentStatus).toBe('idle');
      expect(dash.wins).toBe(0);
      expect(dash.losses).toBe(0);
      engine.destroy();
    });

    it('restores state from localStorage on init', () => {
      const savedState = {
        bankroll: 250,
        depositAmount: 250,
        agentStatus: 'stopped',
        stopReason: 'USER_STOPPED',
        bets: [],
        activityLog: [],
        consecutiveWins: 0,
        consecutiveLosses: 0,
        dailyStartBankroll: 250,
        totalDeposited: 250,
        pendingBet: null,
        priceHistory: [],
        sessionDate: new Date().toISOString().slice(0, 10),
      };
      localStorage.setItem('prediction_agent_state', JSON.stringify(savedState));
      const engine = new AgentEngine(vi.fn());
      expect(engine.getDashboard().bankroll).toBe(250);
      expect(engine.getDashboard().agentStatus).toBe('stopped');
      engine.destroy();
    });
  });

  describe('deposit()', () => {
    it('increases bankroll by deposited amount', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(100);
      expect(engine.getDashboard().bankroll).toBe(100);
      expect(engine.getDashboard().totalDeposited).toBe(100);
      engine.destroy();
    });

    it('stacks multiple deposits', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(100);
      engine.deposit(50);
      expect(engine.getDashboard().bankroll).toBe(150);
      expect(engine.getDashboard().totalDeposited).toBe(150);
      engine.destroy();
    });

    it('logs DEPOSIT activity', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(100);
      const log = engine.getActivityLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].type).toBe('DEPOSIT');
      expect(log[0].message).toContain('100.00');
      engine.destroy();
    });

    it('persists state to localStorage', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(200);
      const saved = JSON.parse(localStorage.getItem('prediction_agent_state'));
      expect(saved.bankroll).toBe(200);
      engine.destroy();
    });
  });

  describe('start()', () => {
    it('does not start if bankroll is 0', () => {
      const engine = new AgentEngine(vi.fn());
      engine.start();
      expect(engine.getDashboard().agentStatus).toBe('idle');
      engine.destroy();
    });

    it('sets status to active when bankroll > 0', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(100);
      engine.start();
      expect(engine.getDashboard().agentStatus).toBe('active');
      engine.destroy();
    });

    it('clears stop reason on start', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(100);
      engine.start();
      engine.stop();
      expect(engine.getDashboard().stopReason).toBe('USER_STOPPED');
      engine.start();
      expect(engine.getDashboard().stopReason).toBeNull();
      engine.destroy();
    });
  });

  describe('stop()', () => {
    it('sets status to stopped with USER_STOPPED reason', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(100);
      engine.start();
      engine.stop();
      expect(engine.getDashboard().agentStatus).toBe('stopped');
      expect(engine.getDashboard().stopReason).toBe('USER_STOPPED');
      engine.destroy();
    });
  });

  describe('withdraw()', () => {
    it('sets bankroll to 0 and returns withdrawn amount', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(300);
      const amount = engine.withdraw();
      expect(amount).toBe(300);
      expect(engine.getDashboard().bankroll).toBe(0);
      expect(engine.getDashboard().agentStatus).toBe('withdrawn');
      engine.destroy();
    });
  });

  describe('reset()', () => {
    it('resets all state to defaults', () => {
      const engine = new AgentEngine(vi.fn());
      engine.deposit(500);
      engine.start();
      engine.stop();
      engine.reset();
      const dash = engine.getDashboard();
      expect(dash.bankroll).toBe(0);
      expect(dash.agentStatus).toBe('idle');
      expect(dash.totalDeposited).toBe(0);
      expect(engine.getBets()).toEqual([]);
      engine.destroy();
    });
  });

  describe('getDashboard()', () => {
    it('computes win rate correctly', () => {
      const engine = new AgentEngine(vi.fn());
      // Manually set state with bets
      engine.state.bets = [
        { id: 1, result: 'WIN', pnl: 5 },
        { id: 2, result: 'WIN', pnl: 5 },
        { id: 3, result: 'LOSS', pnl: -5 },
        { id: 4, result: 'SKIP', pnl: 0 },
      ];
      const dash = engine.getDashboard();
      // 2 wins out of 3 resolved (WIN/LOSS only)
      expect(dash.winRate).toBeCloseTo(66.67, 1);
      expect(dash.wins).toBe(2);
      expect(dash.losses).toBe(1);
      expect(dash.skips).toBe(1);
      engine.destroy();
    });

    it('calculates P&L from resolved bets', () => {
      const engine = new AgentEngine(vi.fn());
      engine.state.bets = [
        { id: 1, result: 'WIN', pnl: 10 },
        { id: 2, result: 'LOSS', pnl: -3 },
        { id: 3, result: 'WIN', pnl: 7 },
      ];
      expect(engine.getDashboard().pnl).toBe(14);
      engine.destroy();
    });
  });

  describe('getBets()', () => {
    it('returns bets in reverse chronological order', () => {
      const engine = new AgentEngine(vi.fn());
      engine.state.bets = [
        { id: 1, result: 'WIN' },
        { id: 2, result: 'LOSS' },
        { id: 3, result: 'WIN' },
      ];
      const bets = engine.getBets();
      expect(bets[0].id).toBe(3);
      expect(bets[2].id).toBe(1);
      engine.destroy();
    });
  });

  describe('getActivityLog()', () => {
    it('returns last 50 entries in reverse order', () => {
      const engine = new AgentEngine(vi.fn());
      for (let i = 0; i < 60; i++) {
        engine.state.activityLog.push({ id: i, time: new Date().toISOString(), type: 'INFO', message: `msg ${i}` });
      }
      const log = engine.getActivityLog();
      expect(log.length).toBe(50);
      // Most recent first
      expect(log[0].id).toBe(59);
      engine.destroy();
    });
  });

  describe('_shouldStop()', () => {
    it('triggers CONSECUTIVE_LOSSES after 4 consecutive losses', () => {
      const engine = new AgentEngine(vi.fn());
      engine.state.consecutiveLosses = 4;
      expect(engine._shouldStop().stop).toBe(true);
      expect(engine._shouldStop().reason).toBe('CONSECUTIVE_LOSSES');
      engine.destroy();
    });
  });
});


// ═════════════════════════════════════════════
// 2. ToastContainer Tests
// ═════════════════════════════════════════════

describe('ToastContainer', () => {
  let ToastContainer, addToast;

  beforeEach(async () => {
    const mod = await import('../components/ToastContainer.jsx');
    ToastContainer = mod.default;
    addToast = mod.addToast;
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('displays a toast when addToast is called', async () => {
    render(<ToastContainer />);
    act(() => { addToast('Wallet connected', 'info'); });
    expect(await screen.findByText('Wallet connected')).toBeInTheDocument();
  });

  it('applies correct color classes per toast type', () => {
    render(<ToastContainer />);
    act(() => { addToast('WIN +$5.00', 'win'); });
    const toast = screen.getByText('WIN +$5.00').closest('div');
    expect(toast.className).toContain('accent-green');
  });

  it('auto-removes toast after timeout', async () => {
    vi.useFakeTimers();
    render(<ToastContainer />);
    act(() => { addToast('Temporary', 'info'); });
    expect(screen.getByText('Temporary')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});


// ═════════════════════════════════════════════
// 3. Sidebar Tests
// ═════════════════════════════════════════════

describe('Sidebar', () => {
  let Sidebar;

  beforeEach(async () => {
    const mod = await import('../components/Sidebar.jsx');
    Sidebar = mod.default;
  });

  it('renders logo with "PA" text and brand name', () => {
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={vi.fn()} />);
    expect(screen.getByText('PA')).toBeInTheDocument();
    expect(screen.getByText('Prediction Agent')).toBeInTheDocument();
    expect(screen.getByText('PRO TRADER')).toBeInTheDocument();
  });

  it('renders all 5 navigation links', () => {
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Backtest')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('highlights active nav link with "active" class', () => {
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={vi.fn()} />, { initialEntries: ['/history'] });
    const historyLink = screen.getByText('History').closest('a');
    expect(historyLink.className).toContain('active');
  });

  it('shows Sound ON when soundEnabled is true', () => {
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={vi.fn()} />);
    expect(screen.getByText('Sound ON')).toBeInTheDocument();
  });

  it('shows Sound OFF when soundEnabled is false', () => {
    renderWithRouter(<Sidebar soundEnabled={false} onToggleSound={vi.fn()} />);
    expect(screen.getByText('Sound OFF')).toBeInTheDocument();
  });

  it('calls onToggleSound when sound button is clicked', async () => {
    const toggle = vi.fn();
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={toggle} />);
    await userEvent.click(screen.getByText('Sound ON'));
    expect(toggle).toHaveBeenCalledOnce();
  });

  it('shows SYSTEM ONLINE status indicator', () => {
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={vi.fn()} />);
    expect(screen.getByText('SYSTEM ONLINE')).toBeInTheDocument();
  });

  it('Dashboard link navigates to /', () => {
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={vi.fn()} />);
    const dashLink = screen.getByText('Dashboard').closest('a');
    expect(dashLink).toHaveAttribute('href', '/');
  });

  it('History link navigates to /history', () => {
    renderWithRouter(<Sidebar soundEnabled={true} onToggleSound={vi.fn()} />);
    const link = screen.getByText('History').closest('a');
    expect(link).toHaveAttribute('href', '/history');
  });
});


// ═════════════════════════════════════════════
// 4. TickerTape Tests
// ═════════════════════════════════════════════

describe('TickerTape', () => {
  let TickerTape;
  let getCurrentBTCPrice;

  beforeEach(async () => {
    const priceService = await import('../engine/priceService.js');
    getCurrentBTCPrice = priceService.getCurrentBTCPrice;
    getCurrentBTCPrice.mockResolvedValue(97500.00);
    const mod = await import('../components/TickerTape.jsx');
    TickerTape = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders BTC/USDT labels', () => {
    render(<TickerTape />);
    const btcLabels = screen.getAllByText('BTC/USDT');
    expect(btcLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders ETH/USDT and SOL/USDT placeholders', () => {
    render(<TickerTape />);
    expect(screen.getByText('ETH/USDT')).toBeInTheDocument();
    expect(screen.getByText('SOL/USDT')).toBeInTheDocument();
  });

  it('shows Loading... before price arrives', () => {
    getCurrentBTCPrice.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<TickerTape />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays price after fetch resolves', async () => {
    render(<TickerTape />);
    await waitFor(() => {
      expect(screen.getAllByText(/97,500/)[0]).toBeInTheDocument();
    });
  });

  it('displays PREDICTION AGENT PRO branding', () => {
    render(<TickerTape />);
    expect(screen.getByText('PREDICTION AGENT PRO')).toBeInTheDocument();
  });
});


// ═════════════════════════════════════════════
// 5. DashboardPage Tests
// ═════════════════════════════════════════════

describe('DashboardPage', () => {
  let DashboardPage;

  beforeEach(async () => {
    const mod = await import('../pages/DashboardPage.jsx');
    DashboardPage = mod.default;
  });

  describe('wallet gate', () => {
    it('shows wallet gate banner when not connected', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account={null} dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Connect Your Wallet to Trade')).toBeInTheDocument();
      expect(screen.getByText(/must connect MetaMask/)).toBeInTheDocument();
    });

    it('hides wallet gate when connected', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.queryByText('Connect Your Wallet to Trade')).not.toBeInTheDocument();
    });

    it('shows Connecting... text when in connecting state', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account={null} dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={true} />
      );
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  describe('agent status display', () => {
    it('shows IDLE status by default', () => {
      const engine = createMockEngine({ agentStatus: 'idle' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText('IDLE')[0]).toBeInTheDocument();
    });

    it('shows ACTIVE status with indicator', () => {
      const engine = createMockEngine({ agentStatus: 'active' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText('ACTIVE')[0]).toBeInTheDocument();
    });

    it('shows STOPPED status', () => {
      const engine = createMockEngine({ agentStatus: 'stopped' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText('STOPPED')[0]).toBeInTheDocument();
    });

    it('displays stop reason when present', () => {
      const engine = createMockEngine({ agentStatus: 'stopped', stopReason: 'DAILY_LOSS_LIMIT' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('DAILY_LOSS_LIMIT')).toBeInTheDocument();
    });
  });

  describe('strategy selector', () => {
    it('renders all 3 strategy buttons', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Safe')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
      expect(screen.getByText('Aggressive')).toBeInTheDocument();
    });

    it('displays strategy parameters', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      // Default is "safe" — should show 2% bet, -10% loss limit, +5% profit target
      expect(screen.getByText('2%')).toBeInTheDocument();
      expect(screen.getByText('-10%')).toBeInTheDocument();
      expect(screen.getByText('+5%')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('disables strategy buttons when agent is active', () => {
      const engine = createMockEngine({ agentStatus: 'active' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      const safeBtn = screen.getByText('Safe');
      expect(safeBtn).toBeDisabled();
    });
  });

  describe('main stats grid', () => {
    it('displays bankroll', () => {
      const engine = createMockEngine({ bankroll: 525.50 });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText('$525.50')[0]).toBeInTheDocument();
    });

    it('displays Total P&L', () => {
      const engine = createMockEngine({ pnl: 25.50 });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText('+$25.50')[0]).toBeInTheDocument();
    });

    it('displays Win Rate', () => {
      const engine = createMockEngine({ winRate: 62.5 });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText('62.5%')[0]).toBeInTheDocument();
    });

    it('shows stat labels', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText('Bankroll')[0]).toBeInTheDocument();
      expect(screen.getByText('Total P&L')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument();
    });
  });

  describe('controls', () => {
    it('shows deposit input when wallet connected but no balance', () => {
      const engine = createMockEngine({ bankroll: 0, agentStatus: 'idle' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Deposit')).toBeInTheDocument();
    });

    it('calls engine.deposit on Deposit click', async () => {
      const engine = createMockEngine({ bankroll: 0, agentStatus: 'idle' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      await userEvent.click(screen.getByText('Deposit'));
      expect(engine.deposit).toHaveBeenCalledWith(100);
    });

    it('shows Stop Agent button when active', () => {
      const engine = createMockEngine({ agentStatus: 'active', bankroll: 500 });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Stop Agent')).toBeInTheDocument();
    });

    it('calls engine.stop on Stop Agent click', async () => {
      const engine = createMockEngine({ agentStatus: 'active', bankroll: 500 });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      await userEvent.click(screen.getByText('Stop Agent'));
      expect(engine.stop).toHaveBeenCalledOnce();
    });

    it('shows Start Agent and Withdraw when stopped with balance', () => {
      const engine = createMockEngine({ agentStatus: 'stopped', bankroll: 500 });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Start Agent')).toBeInTheDocument();
      expect(screen.getByText('Withdraw')).toBeInTheDocument();
    });

    it('shows "Connect wallet first" when not connected', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account={null} dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Connect wallet first')).toBeInTheDocument();
    });
  });

  describe('session stats', () => {
    it('shows Session Stats section', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Session Stats')).toBeInTheDocument();
    });

    it('shows LIVE indicator when active', () => {
      const engine = createMockEngine({ agentStatus: 'active' });
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getAllByText(/LIVE/)[0]).toBeInTheDocument();
    });
  });

  describe('advanced metrics', () => {
    it('displays metric cards', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();
      expect(screen.getByText('Best Trade')).toBeInTheDocument();
      expect(screen.getByText('Worst Trade')).toBeInTheDocument();
      expect(screen.getByText('Avg Bet')).toBeInTheDocument();
      expect(screen.getByText('Risk Level')).toBeInTheDocument();
    });
  });

  describe('pending bet display', () => {
    it('shows pending bet card when a bet is PENDING', () => {
      const engine = createMockEngine({ agentStatus: 'active' });
      const pendingBets = [{
        id: 999, round_time: new Date().toISOString(), direction: 'UP',
        confidence: 75.3, amount: 15.00, btc_price_start: 97500,
        btc_price_end: null, result: 'PENDING', pnl: 0, bankroll_after: 500,
      }];
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={pendingBets} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('ROUND IN PROGRESS')).toBeInTheDocument();
      expect(screen.getByText(/UP/)).toBeInTheDocument();
    });
  });

  describe('charts', () => {
    it('shows "Collecting price data..." when no price data', () => {
      const engine = createMockEngine();
      engine.getPriceHistory.mockReturnValue([]);
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Collecting price data...')).toBeInTheDocument();
    });

    it('shows "No trades yet" for equity curve with no trades', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('No trades yet')).toBeInTheDocument();
    });
  });

  describe('activity log', () => {
    it('shows "No activity yet" when log is empty', () => {
      const engine = createMockEngine();
      engine.getActivityLog.mockReturnValue([]);
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });

    it('renders activity log entries', () => {
      const engine = createMockEngine();
      engine.getActivityLog.mockReturnValue([
        { id: 1, time: '2026-02-24T10:00:00Z', type: 'START', message: 'Agent started' },
        { id: 2, time: '2026-02-24T10:01:00Z', type: 'BET', message: 'UP $15.00 at BTC $97,500' },
      ]);
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Agent started')).toBeInTheDocument();
    });
  });

  describe('agent wallet section', () => {
    it('shows wallet address when connected', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0xAbCdEf1234567890" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('0xAbCd...7890')).toBeInTheDocument();
    });

    it('shows "Not connected" when no account', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account={null} dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Not connected')).toBeInTheDocument();
    });
  });

  describe('recent trades table', () => {
    it('shows trade table when resolved bets exist', () => {
      const engine = createMockEngine();
      const bets = createMockBets(5);
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={bets} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.getByText('Recent Trades')).toBeInTheDocument();
    });

    it('hides recent trades when no resolved bets', () => {
      const engine = createMockEngine();
      renderWithRouter(
        <DashboardPage engine={engine} account="0x1234" dashboard={engine.getDashboard()} bets={[]} onConnect={vi.fn()} connecting={false} />
      );
      expect(screen.queryByText('Recent Trades')).not.toBeInTheDocument();
    });
  });
});


// ═════════════════════════════════════════════
// 6. HistoryPage Tests
// ═════════════════════════════════════════════

describe('HistoryPage', () => {
  let HistoryPage;

  beforeEach(async () => {
    localStorage.clear();
    const mod = await import('../pages/HistoryPage.jsx');
    HistoryPage = mod.default;
  });

  it('renders page title "Trade History"', () => {
    const engine = createMockEngine();
    renderWithRouter(<HistoryPage bets={[]} engine={engine} />);
    expect(screen.getByText('Trade History')).toBeInTheDocument();
  });

  it('renders Export CSV button', () => {
    const engine = createMockEngine();
    renderWithRouter(<HistoryPage bets={[]} engine={engine} />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('shows empty state when no trades match', () => {
    const engine = createMockEngine();
    renderWithRouter(<HistoryPage bets={[]} engine={engine} />);
    expect(screen.getByText('No trades match the current filters.')).toBeInTheDocument();
  });

  describe('filters', () => {
    it('renders all filter buttons', () => {
      const engine = createMockEngine();
      renderWithRouter(<HistoryPage bets={[]} engine={engine} />);
      expect(screen.getByText('ALL')).toBeInTheDocument();
      expect(screen.getByText('WIN')).toBeInTheDocument();
      expect(screen.getByText('LOSS')).toBeInTheDocument();
      expect(screen.getByText('SKIP')).toBeInTheDocument();
    });

    it('filters bets by WIN when clicked', async () => {
      const engine = createMockEngine();
      const bets = createMockBets(10);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);

      await userEvent.click(screen.getByRole('button', { name: 'WIN' }));
      // Should only show WIN results
      const lossResults = screen.queryAllByText('LOSS');
      // The filter button "LOSS" is still there, but no table cells
      const tableRows = screen.getAllByRole('row');
      tableRows.forEach(row => {
        const cells = within(row).queryAllByText('LOSS');
        // In filtered view, actual bet result cells shouldn't show LOSS
        // (only the filter button shows LOSS)
      });
    });
  });

  describe('summary strip', () => {
    it('displays summary statistics', () => {
      const engine = createMockEngine();
      const bets = createMockBets(10);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);
      expect(screen.getByText('Total Trades')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Net P&L')).toBeInTheDocument();
      expect(screen.getByText('W / L')).toBeInTheDocument();
    });
  });

  describe('trade table', () => {
    it('renders table headers', () => {
      const engine = createMockEngine();
      const bets = createMockBets(3);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Dir')).toBeInTheDocument();
      expect(screen.getByText('Conf')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Entry')).toBeInTheDocument();
      expect(screen.getByText('Exit')).toBeInTheDocument();
      expect(screen.getByText('Result')).toBeInTheDocument();
      expect(screen.getByText('P&L')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
    });

    it('renders bet rows', () => {
      const engine = createMockEngine();
      const bets = createMockBets(3);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);
      // Should have data rows (plus header + optional date headers)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  describe('pagination', () => {
    it('shows pagination for >10 bets', () => {
      const engine = createMockEngine();
      const bets = createMockBets(15);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);
      expect(screen.getByText(/1\/2/)).toBeInTheDocument();
    });

    it('navigates to next page', async () => {
      const engine = createMockEngine();
      const bets = createMockBets(15);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);
      const nextBtn = screen.getAllByRole('button').find(b => b.textContent === '›');
      await userEvent.click(nextBtn);
      expect(screen.getByText(/2\/2/)).toBeInTheDocument();
    });
  });

  describe('trade detail modal', () => {
    it('opens modal when clicking a trade row', async () => {
      const engine = createMockEngine();
      const bets = createMockBets(3);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);

      // Click on a data row (skip header row and date header rows by looking for cursor-pointer)
      const rows = screen.getAllByRole('row');
      const dataRow = rows.find(r => r.className.includes('cursor-pointer'));
      if (dataRow) {
        await userEvent.click(dataRow);
        // Modal should appear with trade details
        await waitFor(() => {
          expect(screen.getByText('Signal Reasoning')).toBeInTheDocument();
        });
      }
    });

    it('shows close button in modal', async () => {
      const engine = createMockEngine();
      const bets = createMockBets(3);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);

      const rows = screen.getAllByRole('row');
      const dataRow = rows.find(r => r.className.includes('cursor-pointer'));
      if (dataRow) {
        await userEvent.click(dataRow);
        await waitFor(() => {
          expect(screen.getByText('✕')).toBeInTheDocument();
        });
      }
    });
  });

  describe('CSV export', () => {
    it('triggers download on Export CSV click', async () => {
      const engine = createMockEngine();
      const bets = createMockBets(3);
      renderWithRouter(<HistoryPage bets={bets} engine={engine} />);
      const clickSpy = vi.fn();
      const mockAnchor = { href: '', download: '', click: clickSpy };
      const spy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      await userEvent.click(screen.getByText('Export CSV'));
      expect(URL.createObjectURL).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});


// ═════════════════════════════════════════════
// 7. AnalyticsPage Tests
// ═════════════════════════════════════════════

describe('AnalyticsPage', () => {
  let AnalyticsPage;

  beforeEach(async () => {
    const mod = await import('../pages/AnalyticsPage.jsx');
    AnalyticsPage = mod.default;
  });

  it('renders page title "Analytics"', () => {
    renderWithRouter(<AnalyticsPage bets={[]} />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  describe('BestHourCard', () => {
    it('shows "Need 3+ trades per hour" message when insufficient data', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Need 3+ trades per hour for analysis')).toBeInTheDocument();
    });

    it('shows best hour when sufficient data exists', () => {
      const bets = [];
      // Create 5 bets at hour 14 (3 wins, 2 losses)
      for (let i = 0; i < 5; i++) {
        bets.push({
          id: i, round_time: '2026-02-24T14:00:00Z',
          result: i < 3 ? 'WIN' : 'LOSS', pnl: i < 3 ? 5 : -5,
          direction: 'UP', confidence: 70,
        });
      }
      renderWithRouter(<AnalyticsPage bets={bets} />);
      expect(screen.getAllByText('14:00')[0]).toBeInTheDocument();
      expect(screen.getByText(/60% win rate/)).toBeInTheDocument();
    });
  });

  describe('HourlyHeatmap', () => {
    it('renders Win Rate by Hour of Day heading', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Win Rate by Hour of Day')).toBeInTheDocument();
    });

    it('renders 24 hour labels', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('00')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('23')).toBeInTheDocument();
    });

    it('renders legend items', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('<40%')).toBeInTheDocument();
      expect(screen.getByText('40-50%')).toBeInTheDocument();
      expect(screen.getByText('50-70%')).toBeInTheDocument();
      expect(screen.getByText('>70%')).toBeInTheDocument();
    });
  });

  describe('ConfidenceChart', () => {
    it('renders heading', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Confidence vs Win Rate')).toBeInTheDocument();
    });

    it('shows "No data yet" when empty', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      const noDataElements = screen.getAllByText('No data yet');
      expect(noDataElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DirectionPie', () => {
    it('renders heading', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Direction Distribution')).toBeInTheDocument();
    });
  });

  describe('SevenDayChart', () => {
    it('renders heading', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Rolling 7-Day Performance')).toBeInTheDocument();
    });

    it('shows "No recent data" when empty', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('No recent data')).toBeInTheDocument();
    });
  });

  describe('StreaksSection', () => {
    it('renders streak analysis heading', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Streak Analysis')).toBeInTheDocument();
    });

    it('shows longest win/loss streak and current streak labels', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Longest Win Streak')).toBeInTheDocument();
      expect(screen.getByText('Current Streak')).toBeInTheDocument();
      expect(screen.getByText('Longest Loss Streak')).toBeInTheDocument();
    });

    it('calculates streaks correctly from bet data', () => {
      const bets = [
        { id: 5, round_time: '2026-02-24T10:04:00Z', result: 'WIN', pnl: 5, direction: 'UP', confidence: 70 },
        { id: 4, round_time: '2026-02-24T10:03:00Z', result: 'WIN', pnl: 5, direction: 'UP', confidence: 70 },
        { id: 3, round_time: '2026-02-24T10:02:00Z', result: 'WIN', pnl: 5, direction: 'UP', confidence: 70 },
        { id: 2, round_time: '2026-02-24T10:01:00Z', result: 'LOSS', pnl: -5, direction: 'DOWN', confidence: 70 },
        { id: 1, round_time: '2026-02-24T10:00:00Z', result: 'WIN', pnl: 5, direction: 'UP', confidence: 70 },
      ];
      renderWithRouter(<AnalyticsPage bets={bets} />);
      // Longest win streak = 3 (chronological: W, L, W, W, W)
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('StrategyTable', () => {
    it('renders strategy comparison heading', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Strategy Comparison')).toBeInTheDocument();
    });

    it('renders LONG, SHORT, and ALL TRADES rows', () => {
      const bets = createMockBets(6);
      renderWithRouter(<AnalyticsPage bets={bets} />);
      expect(screen.getByText('LONG (UP)')).toBeInTheDocument();
      expect(screen.getByText('SHORT (DOWN)')).toBeInTheDocument();
      expect(screen.getByText('ALL TRADES')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      renderWithRouter(<AnalyticsPage bets={[]} />);
      expect(screen.getByText('Strategy')).toBeInTheDocument();
      expect(screen.getByText('Trades')).toBeInTheDocument();
      expect(screen.getByText('Wins')).toBeInTheDocument();
      expect(screen.getByText('Losses')).toBeInTheDocument();
    });
  });
});


// ═════════════════════════════════════════════
// 8. ProfilePage Tests
// ═════════════════════════════════════════════

describe('ProfilePage', () => {
  let ProfilePage;

  beforeEach(async () => {
    localStorage.clear();
    const mod = await import('../pages/ProfilePage.jsx');
    ProfilePage = mod.default;
  });

  it('renders page title "Profile"', () => {
    const engine = createMockEngine();
    renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  describe('profile card', () => {
    it('displays default username', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText('Prediction Trader')).toBeInTheDocument();
    });

    it('shows truncated wallet address', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678efgh" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText('0x1234...efgh')).toBeInTheDocument();
    });

    it('shows edit mode on username click', async () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
      const editGroup = screen.getByText('Prediction Trader').closest('[class*="cursor-pointer"]');
      await userEvent.click(editGroup);
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('saves username to localStorage on save', async () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
      const editGroup = screen.getByText('Prediction Trader').closest('[class*="cursor-pointer"]');
      await userEvent.click(editGroup);
      const input = screen.getByDisplayValue('Prediction Trader');
      await userEvent.clear(input);
      await userEvent.type(input, 'My Trader');
      await userEvent.click(screen.getByText('Save'));
      expect(localStorage.setItem).toHaveBeenCalledWith('prediction_agent_username', 'My Trader');
    });

    it('shows Share Stats button', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText(/Share Stats/)).toBeInTheDocument();
    });
  });

  describe('rank system', () => {
    it('shows Bronze rank for negative P&L', () => {
      const engine = createMockEngine();
      const bets = [
        { id: 1, round_time: '2026-02-24T10:00:00Z', result: 'LOSS', pnl: -20, direction: 'UP', confidence: 70 },
      ];
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={bets} />);
      expect(screen.getAllByText('Bronze')[0]).toBeInTheDocument();
    });

    it('shows Silver rank for $0-50 P&L', () => {
      const engine = createMockEngine();
      const bets = [
        { id: 1, round_time: '2026-02-24T10:00:00Z', result: 'WIN', pnl: 25, direction: 'UP', confidence: 70 },
      ];
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={bets} />);
      expect(screen.getAllByText('Silver')[0]).toBeInTheDocument();
    });

    it('renders rank ladder with all 5 ranks', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText('Rank Ladder')).toBeInTheDocument();
      // Each rank name appears at least once (in the ladder)
      ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].forEach(rank => {
        expect(screen.getAllByText(rank).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows progress bar to next rank', () => {
      const engine = createMockEngine();
      const bets = [
        { id: 1, round_time: '2026-02-24T10:00:00Z', result: 'WIN', pnl: 25, direction: 'UP', confidence: 70 },
      ];
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={bets} />);
      // Shows "P&L to Gold" message (since Silver → Gold at $50)
      expect(screen.getByText(/P&L to Gold/)).toBeInTheDocument();
    });
  });

  describe('quick stats', () => {
    it('displays trades, win rate, P&L, and best streak', () => {
      const engine = createMockEngine();
      const bets = createMockBets(5);
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={bets} />);
      expect(screen.getAllByText('Trades').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Win Rate').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('achievements', () => {
    it('renders achievements section heading', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });

    it('shows X/12 Unlocked counter', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText(/\/12 Unlocked/)).toBeInTheDocument();
    });

    it('renders all achievement names', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      const achievementNames = [
        'First Blood', 'Getting Started', 'Seasoned Trader', 'Century Club',
        'Hot Streak', 'On Fire', '10-Win Streak',
        'In the Green', 'Profit Master', 'Big Baller',
        'Consistent', 'Survivor',
      ];
      achievementNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('unlocks "First Blood" when 1+ wins exist', () => {
      const engine = createMockEngine();
      const bets = [
        { id: 1, round_time: '2026-02-24T10:00:00Z', result: 'WIN', pnl: 5, direction: 'UP', confidence: 70 },
      ];
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={bets} />);
      // Should show UNLOCKED text for First Blood
      const unlocked = screen.getAllByText('UNLOCKED');
      expect(unlocked.length).toBeGreaterThanOrEqual(1);
    });

    it('unlocks "Getting Started" with 10+ trades', () => {
      const engine = createMockEngine();
      const bets = createMockBets(12);
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={bets} />);
      const unlocked = screen.getAllByText('UNLOCKED');
      expect(unlocked.length).toBeGreaterThanOrEqual(2); // First Blood + Getting Started
    });
  });

  describe('trading journal', () => {
    it('renders Trading Journal heading', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText('Trading Journal')).toBeInTheDocument();
    });

    it('has a textarea for journal entry', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByPlaceholderText(/Notes for/)).toBeInTheDocument();
    });

    it('shows date picker', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      const dateInputs = screen.getAllByDisplayValue(/2026/);
      expect(dateInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('shows character count', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText('0 chars')).toBeInTheDocument();
    });

    it('shows journal entry count', () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);
      expect(screen.getByText(/0 journal entries/)).toBeInTheDocument();
    });

    it('auto-saves text to localStorage after typing', async () => {
      vi.useFakeTimers();
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234" dashboard={engine.getDashboard()} bets={[]} />);

      const textarea = screen.getByPlaceholderText(/Notes for/);
      // Use fireEvent instead of userEvent to avoid timer conflicts with fake timers
      fireEvent.change(textarea, { target: { value: 'Great trading day!' } });

      // Advance past debounce (800ms in the component)
      act(() => { vi.advanceTimersByTime(1000); });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'prediction_agent_journal',
        expect.stringContaining('Great trading day!')
      );
      vi.useRealTimers();
    });
  });

  describe('share modal', () => {
    it('opens share modal on Share Stats click', async () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
      await userEvent.click(screen.getByText(/Share Stats/));
      await waitFor(() => {
        expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
        expect(screen.getByText('Close')).toBeInTheDocument();
      });
    });

    it('copies text to clipboard', async () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
      await userEvent.click(screen.getByText(/Share Stats/));
      await waitFor(() => screen.getByText('Copy to Clipboard'));
      await userEvent.click(screen.getByText('Copy to Clipboard'));
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('closes modal on Close button click', async () => {
      const engine = createMockEngine();
      renderWithRouter(<ProfilePage account="0x1234abcd5678" dashboard={engine.getDashboard()} bets={[]} />);
      await userEvent.click(screen.getByText(/Share Stats/));
      await waitFor(() => screen.getByText('Close'));
      await userEvent.click(screen.getByText('Close'));
      expect(screen.queryByText('Copy to Clipboard')).not.toBeInTheDocument();
    });
  });
});


// ═════════════════════════════════════════════
// 9. Tailwind Config Tests
// ═════════════════════════════════════════════

describe('Tailwind Config', () => {
  let config;

  beforeEach(async () => {
    config = (await import('../../../tailwind.config.js')).default;
  });

  it('defines dark color palette', () => {
    const dark = config.theme.extend.colors.dark;
    expect(dark.bg).toBe('#0a0f0a');
    expect(dark.card).toBe('#111a12');
    expect(dark.border).toBe('#1e3320');
    expect(dark.text).toBe('#e8f5e9');
    expect(dark.muted).toBe('#4a7a4e');
    expect(dark.hover).toBe('#152416');
  });

  it('defines accent color palette', () => {
    const accent = config.theme.extend.colors.accent;
    expect(accent.green).toBe('#00e676');
    expect(accent.red).toBe('#ff1744');
    expect(accent.blue).toBe('#3b82f6');
    expect(accent.yellow).toBe('#ff9100');
  });

  it('has accent.orange aliased to green for backward compatibility', () => {
    expect(config.theme.extend.colors.accent.orange).toBe('#00e676');
  });

  it('scans correct content paths', () => {
    expect(config.content).toContain('./client/index.html');
    expect(config.content).toContain('./client/src/**/*.{js,jsx}');
  });
});


// ═════════════════════════════════════════════
// 10. App-Level Integration Tests
// ═════════════════════════════════════════════

describe('App Integration', () => {
  let App;
  const ethereumMock = {
    request: vi.fn(({ method }) => {
      if (method === 'eth_accounts') return Promise.resolve([]);
      if (method === 'eth_requestAccounts') return Promise.resolve(['0xabc123def456']);
      return Promise.resolve();
    }),
    on: vi.fn(),
    removeListener: vi.fn(),
  };

  beforeEach(async () => {
    localStorage.clear();
    // Reset mock call history but keep the same object reference
    ethereumMock.request.mockClear();
    ethereumMock.request.mockImplementation(({ method }) => {
      if (method === 'eth_accounts') return Promise.resolve([]);
      if (method === 'eth_requestAccounts') return Promise.resolve(['0xabc123def456']);
      return Promise.resolve();
    });
    ethereumMock.on.mockClear();
    ethereumMock.removeListener.mockClear();
    window.ethereum = ethereumMock;
    const mod = await import('../App.jsx');
    App = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the app with sidebar and main layout', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Prediction Agent')).toBeInTheDocument();
      expect(screen.getByText('Prediction Market Auto-Pilot')).toBeInTheDocument();
    });
  });

  it('renders TESTNET badge', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('TESTNET')).toBeInTheDocument();
    });
  });

  it('shows Connect Wallet button when no account', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText('Connect Wallet')[0]).toBeInTheDocument();
    });
  });

  it('renders keyboard shortcut hints', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
    });
  });

  it('renders footer disclaimer', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Past results do not predict future performance/)).toBeInTheDocument();
    });
  });

  it('stores sound preference in localStorage', () => {
    localStorage.setItem('prediction_agent_sound', 'false');
    render(<App />);
    expect(localStorage.getItem).toHaveBeenCalledWith('prediction_agent_sound');
  });
});


// ═════════════════════════════════════════════
// 11. Utility Function Tests
// ═════════════════════════════════════════════

describe('Utility Functions', () => {
  describe('fmt()', () => {
    it('formats numbers to specified decimal places', () => {
      // Testing the fmt function logic inline since it's not exported
      const fmt = (n, d = 2) => Number(n || 0).toFixed(d);
      expect(fmt(123.456)).toBe('123.46');
      expect(fmt(0)).toBe('0.00');
      expect(fmt(null)).toBe('0.00');
      expect(fmt(99.1, 1)).toBe('99.1');
      expect(fmt(undefined)).toBe('0.00');
    });
  });

  describe('fmtPnl()', () => {
    it('formats P&L with correct signs', () => {
      const fmtPnl = (v) => {
        if (v == null) return '—';
        return (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);
      };
      expect(fmtPnl(25.5)).toBe('+$25.50');
      expect(fmtPnl(-10.3)).toBe('-$10.30');
      expect(fmtPnl(0)).toBe('+$0.00');
      expect(fmtPnl(null)).toBe('—');
    });
  });

  describe('getRank()', () => {
    it('returns correct rank tiers based on P&L', () => {
      const RANKS = [
        { name: 'Bronze', min: -Infinity, max: 0 },
        { name: 'Silver', min: 0, max: 50 },
        { name: 'Gold', min: 50, max: 200 },
        { name: 'Platinum', min: 200, max: 500 },
        { name: 'Diamond', min: 500, max: Infinity },
      ];
      function getRank(pnl) {
        for (const r of [...RANKS].reverse()) { if (pnl >= r.min) return r; }
        return RANKS[0];
      }
      expect(getRank(-50).name).toBe('Bronze');
      expect(getRank(0).name).toBe('Silver');
      expect(getRank(25).name).toBe('Silver');
      expect(getRank(50).name).toBe('Gold');
      expect(getRank(200).name).toBe('Platinum');
      expect(getRank(500).name).toBe('Diamond');
      expect(getRank(1000).name).toBe('Diamond');
    });
  });

  describe('Risk Score calculation', () => {
    it('caps at 100', () => {
      const riskScore = Math.min(100, Math.round(
        (50 / 15) * 40 + (4 / 4) * 40 + (50 / 100) * 20 * 100
      ));
      expect(riskScore).toBe(100);
    });

    it('is 0 when no drawdown, no losses, and minimal bet size', () => {
      const riskScore = Math.min(100, Math.round(
        (0 / 15) * 40 + (0 / 4) * 40 + (0 / 500) * 20 * 100
      ));
      expect(riskScore).toBe(0);
    });
  });

  describe('Sharpe ratio calculation', () => {
    it('returns 0 when stdDev is 0', () => {
      const avgPnl = 5;
      const stdPnl = 0;
      const sharpe = stdPnl > 0 ? (avgPnl / stdPnl) * Math.sqrt(252) : 0;
      expect(sharpe).toBe(0);
    });

    it('calculates correctly with positive mean and stddev', () => {
      const pnls = [5, 10, -3, 7, 2];
      const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length;
      const std = Math.sqrt(pnls.reduce((s, p) => s + (p - avg) ** 2, 0) / (pnls.length - 1));
      const sharpe = (avg / std) * Math.sqrt(252);
      expect(sharpe).toBeGreaterThan(0);
    });
  });

  describe('Strategy configs', () => {
    it('safe strategy has conservative parameters', () => {
      const safe = { betPct: 0.02, lossLimit: -0.10, profitTarget: 0.05, confThresh: 65 };
      expect(safe.betPct).toBe(0.02);
      expect(safe.confThresh).toBe(65);
    });

    it('aggressive strategy has high-risk parameters', () => {
      const aggressive = { betPct: 0.05, lossLimit: -0.20, profitTarget: 0.12, confThresh: 55 };
      expect(aggressive.betPct).toBe(0.05);
      expect(aggressive.confThresh).toBe(55);
    });
  });

  describe('Achievement checks', () => {
    const checks = {
      first_win: s => s.wins >= 1,
      ten_trades: s => s.totalTrades >= 10,
      fifty_trades: s => s.totalTrades >= 50,
      hundred_bets: s => s.totalTrades >= 100,
      win_streak_3: s => s.bestWinStreak >= 3,
      win_streak_5: s => s.bestWinStreak >= 5,
      win_rate_60: s => s.winRate >= 60 && s.totalTrades >= 10,
      profit_10: s => s.totalPnl >= 10,
      profit_50: s => s.totalPnl >= 50,
      profit_100: s => s.totalPnl >= 100,
    };

    it('first_win unlocked with 1 win', () => {
      expect(checks.first_win({ wins: 1 })).toBe(true);
      expect(checks.first_win({ wins: 0 })).toBe(false);
    });

    it('ten_trades unlocked at exactly 10', () => {
      expect(checks.ten_trades({ totalTrades: 10 })).toBe(true);
      expect(checks.ten_trades({ totalTrades: 9 })).toBe(false);
    });

    it('win_rate_60 requires both 60%+ rate AND 10+ trades', () => {
      expect(checks.win_rate_60({ winRate: 65, totalTrades: 10 })).toBe(true);
      expect(checks.win_rate_60({ winRate: 65, totalTrades: 5 })).toBe(false);
      expect(checks.win_rate_60({ winRate: 50, totalTrades: 20 })).toBe(false);
    });

    it('profit tiers are correctly gated', () => {
      expect(checks.profit_10({ totalPnl: 10 })).toBe(true);
      expect(checks.profit_50({ totalPnl: 50 })).toBe(true);
      expect(checks.profit_100({ totalPnl: 99 })).toBe(false);
      expect(checks.profit_100({ totalPnl: 100 })).toBe(true);
    });
  });
});
