# Collie Monitor - Paper Trading Frontend

Complete frontend implementation for the Collie Monitor paper trading simulator.

## 🎨 Design System

### Theme
- **Background**: `#0a1628` (dark navy blue)
- **Primary Accent**: `#00e5ff` (cyan/teal)
- **Typography**: 
  - Body: Space Grotesk
  - Monospace (prices/numbers): JetBrains Mono
- **Visual Identity**: Cyan hexagon with robotic wolf/collie concept
- **Decorative**: Subtle candlestick patterns in background

### Custom Components
- `DirectionBadge` - Shows LONG/SHORT with appropriate colors
- `ResultBadge` - Shows Win/Loss with appropriate colors
- `MarketBiasBadge` - Shows BULLISH/BEARISH/NEUTRAL
- `Sparkline` - Simple line chart for trend visualization
- `Layout` - Main layout with sidebar navigation

## 📁 Project Structure

```
src/frontend/src/
├── components/
│   ├── ui/                    # shadcn/ui components (read-only)
│   ├── DirectionBadge.tsx
│   ├── ResultBadge.tsx
│   ├── MarketBiasBadge.tsx
│   ├── Sparkline.tsx
│   └── Layout.tsx
├── hooks/
│   ├── useBinanceApi.ts       # Public Binance API integration
│   ├── useQueries.ts          # Backend canister queries
│   └── useInitializeApp.ts    # App initialization
├── pages/
│   ├── MarketsOverview.tsx    # Main markets table
│   ├── CategoriesDashboard.tsx # Category grid
│   ├── CategoryDetail.tsx     # Single category view
│   ├── AssetDetail.tsx        # Asset analysis
│   ├── StrategyModules.tsx    # Strategy cards
│   └── TradeHistory.tsx       # Trade history table
├── utils/
│   ├── formatters.ts          # Number/date formatting
│   ├── calculations.ts        # Trading calculations
│   └── categories.ts          # Symbol categorization
└── App.tsx                    # Router setup
```

## 🌐 Pages

### 1. Markets Overview (`/`)
- Full table of all USDT-M perpetual symbols
- Real-time price, 24h change, funding rate, volume, OI
- Momentum score calculation
- Searchable and sortable by any column
- Click row to navigate to asset detail

### 2. Categories Dashboard (`/categories`)
- Grid of 7 category cards: L1, L2, AI, DeFi, Meme, Gaming, Infrastructure
- Each card shows:
  - Average 24h change
  - Top performer
  - Average funding rate
  - Momentum sparkline
- Click card to navigate to category detail

### 3. Category Detail (`/category/:categoryName`)
- Top 3 picks highlighted
- All symbols in category ordered by momentum
- Shows price, 24h change, funding rate
- Click symbol to navigate to asset detail

### 4. Asset Detail (`/asset/:symbol`)
- Large price display with 24h high/low
- Market bias badge (BULLISH/BEARISH/NEUTRAL)
- Funding rate, open interest, volume
- Long/Short ratio visualization
- Suggested entry zone (±2%)
- Take profit levels (TP1/TP2/TP3)
- Stop loss level

### 5. Strategy Modules (`/strategies`)
- 5 strategy cards:
  1. **Trend Following** - Enters based on 24h change + funding rate
  2. **Breakout** - Enters when price near 24h high/low with high volume
  3. **Mean Reversion** - Counter-trades extreme moves
  4. **Funding Rate Arbitrage** - Trades anomalous funding rates
  5. **Momentum Scalp** - Selects top 3 assets by absolute change
- Each card shows:
  - Strategy status (Scanning/Trade Open/Closing)
  - Active trade details (if any)
  - Entry/current price, PnL, direction
  - Progress bar to TP1
  - TP1/TP2/SL levels
  - Manual close button

### 6. Trade History (`/history`)
- Complete table of all closed trades
- Filters by module and result (Win/Loss)
- Performance summary:
  - Total trades
  - Win rate percentage
  - Total PnL
  - Best trade per module
- Sortable by date/time

## 🔌 API Integration

### Binance Public API
Base URL: `https://fapi.binance.com`

**Endpoints Used:**
- `/fapi/v1/exchangeInfo` - Get all perpetual symbols
- `/fapi/v1/ticker/24hr` - Get 24h ticker data
- `/fapi/v1/premiumIndex` - Get funding rates
- `/fapi/v1/openInterest` - Get open interest

**Refresh Interval:** 60 seconds (auto-refresh via React Query)

### Backend Canister
All backend queries/mutations via `useQueries.ts`:
- `useAllSymbols()` - Get symbols with categories
- `useAllMarketData()` - Get cached market data
- `useStrategyModules()` - Get strategy status
- `useActiveTrades()` - Get active trades
- `useTradeHistory()` - Get closed trades
- `useOpenTrade()` - Open new trade
- `useCloseTrade()` - Close active trade
- `useUpdateMarketData()` - Update cache

## 🧮 Calculations

### Momentum Score
```typescript
momentumScore = (Math.abs(change24h) * 0.4) + 
                (volume / 1_000_000 * 0.3) + 
                (Math.abs(fundingRate) * 1000 * 0.3)
```

### Entry Zone
±2% from current price

### Take Profit Levels (LONG)
- TP1: entry + 3%
- TP2: entry + 6%
- TP3: entry + 10%

### Stop Loss (LONG)
entry - 2%

### Market Bias
- BULLISH: change > 5%
- BEARISH: change < -5%
- NEUTRAL: between -5% and 5%

### Long/Short Ratio
Simulated based on funding rate:
- Higher funding = more longs
- Negative funding = more shorts

## 🎯 Key Features

- **Real-time Data**: Auto-refresh every 60 seconds
- **Responsive Design**: Mobile-first, works on all screen sizes
- **Loading States**: Skeleton loaders during data fetch
- **Empty States**: Friendly messages when no data
- **Error Handling**: Toast notifications for errors
- **Accessible**: Proper contrast ratios, keyboard navigation
- **Type-Safe**: Full TypeScript coverage
- **Performance**: React Query caching, useMemo for expensive calculations

## 🚀 Development

### Install Dependencies
```bash
cd src/frontend
pnpm install
```

### Run Checks
```bash
# TypeScript
pnpm typescript-check

# Lint
pnpm lint

# Build
pnpm build:skip-bindings
```

### Local Development
```bash
pnpm dev
```

## 📝 Notes

- All market data is fetched client-side from Binance public API (no auth required)
- Backend stores symbols, strategy modules, active trades, and trade history
- Initial 20 symbols are populated on first app load
- Paper trading logic is simulated (no real money involved)
- One trade per strategy module at a time
- Trades auto-close when TP or SL is hit (backend logic)

## 🔮 Future Enhancements

- Real-time WebSocket connection for live prices
- Advanced charting (TradingView integration)
- More strategy modules (user-defined strategies)
- Backtesting capabilities
- Performance analytics dashboard
- Export trade history to CSV
- Mobile app (React Native)
