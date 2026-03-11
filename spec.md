# Collie Monitor

## Current State
A app tem uma aba de Markets Overview com tabela de todos os pares USD-M perpétuos da Binance, exibindo preço, variação 24h, funding rate, volume e score de momentum. Os dados são atualizados a cada 60 segundos via React Query. Não existe scanner de sinais nem análise de RSI multi-timeframe.

## Requested Changes (Diff)

### Add
- Aba "Signal Scanner" dentro da página MarketsOverview (tabs: All Markets | Signal Scanner)
- Utilitário `utils/rsi.ts` para cálculo de RSI a partir de klines
- Hook `useSignalScanner.ts` que:
  - Varre todos os pares a cada 15 minutos (full scan)
  - Remonitoriza os top 50 (por score) a cada 30 segundos
  - Busca klines da Binance nos timeframes 3m, 5m, 15m, 1h, 4h, 1d para cada ativo
  - Calcula os 6 sinais de pré-alta:
    1. Beta/correlação com BTC aumentando (comparar klines do ativo vs BTCUSDT)
    2. Open Interest aumentando (endpoint /fapi/v1/openInterestHist)
    3. Volume de trades aumentando (comparar volume atual vs média)
    4. Funding rate negativo ou negativando (já disponível)
    5. Confluência com shorts sendo abertos (long/short ratio via /fapi/v1/globalLongShortAccountRatio)
    6. RSI acima de 40 ou cruzando 40 de baixo para cima em todos os timeframes
  - Atribui um score de 0-6 por ativo (quantos sinais estão ativos)
  - Ordena por score decrescente
- Componente `pages/SignalScanner.tsx` com:
  - Cabeçalho com status ("Última varredura completa: X min atrás", "Próximo refresh: Xs")
  - Indicador de quantos ativos passaram em cada critério
  - Tabela ranqueada com: posição, símbolo, score (X/6), badge por sinal ativo (BTC↑ OI↑ VOL↑ FR- SHORT RSI), RSI médio, funding rate, link para detalhe
  - Badge visual colorido para cada sinal: verde = ativo, cinza = inativo
  - Destaque visual (borda ciano) para ativos com score >= 5

### Modify
- `pages/MarketsOverview.tsx`: adicionar Tabs (shadcn) com duas abas — "All Markets" (tabela existente) e "Signal Scanner" (novo componente)

### Remove
- Nada

## Implementation Plan
1. Criar `src/frontend/src/utils/rsi.ts` com função `calculateRSI(closes: number[], period = 14): number`
2. Criar `src/frontend/src/hooks/useSignalScanner.ts`:
   - Estado local com lista de resultados e timestamps
   - Full scan a cada 15min: pega todos os símbolos, calcula score rápido (funding + volume) para priorizar
   - Deep scan top 50 a cada 30s: busca klines multi-timeframe, calcula RSI, OI history, long/short ratio
   - Retorna `{ results, lastFullScan, nextRefreshIn, isScanning }`
3. Criar `src/frontend/src/pages/SignalScanner.tsx` com UI da lista ranqueada
4. Modificar `src/frontend/src/pages/MarketsOverview.tsx` para usar Tabs e incluir SignalScanner
