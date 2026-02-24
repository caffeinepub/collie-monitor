# Collie Monitor

## Current State

O projeto já possui:

**Frontend**:
- 6 telas completas: Markets Overview, Categories Dashboard, Category Detail, Asset Detail, Strategy Modules, Trade History
- Layout com navegação lateral
- Componentes UI (badges, sparklines, tabelas)
- Roteamento com TanStack Router
- Tema visual azul marinho (#0a1628) + ciano (#00e5ff)

**Backend**:
- Arquivo `main.mo` com tipos definidos mas **com erros de compilação**:
  - Uso incorreto de APIs imutáveis (`List.empty`, `Map.empty`)
  - Chamadas de métodos inexistentes (`.add()`, `.any()`, `.get()`, `.remove()`)
  - Função `compare` sem retorno explícito
  - `.sort()` sem função de comparação

**Status**: Backend não compila. Frontend está pronto mas sem integração funcional com backend.

## Requested Changes (Diff)

### Add
- Componente Caffeine `http-outcalls` para chamadas à API da Binance
- Integração real com API pública da Binance (fapi.binance.com)
- Lógica de refresh automático a cada 60 segundos no frontend

### Modify
- **Backend Motoko**: Reescrever completamente usando estruturas de dados corretas e mutáveis
  - Substituir `List.empty<>()` por `var` com array mutável ou estruturas adequadas
  - Substituir `Map.empty<>()` por implementação funcional correta
  - Corrigir todas as funções para usar APIs válidas do Motoko
  - Simplificar persistência para evitar erros de upgrade
- **Frontend**: Integrar chamadas à API da Binance via hooks React Query
- **Frontend**: Conectar dados do backend com as telas existentes

### Remove
- Código Motoko com erros de compilação

## Implementation Plan

1. **Selecionar componente `http-outcalls`** para permitir chamadas à Binance
2. **Regenerar backend Motoko** com:
   - Estruturas de dados mutáveis corretas
   - Persistência simplificada (apenas trades ativos e histórico)
   - APIs públicas: `getActiveTrades`, `getTradeHistory`, `openTrade`, `closeTrade`
   - Sem cache de símbolos ou market data (tudo vem direto da Binance no frontend)
3. **Desenvolver integração frontend**:
   - Hooks React Query para Binance API (símbolos, tickers 24h, funding rates)
   - Conectar Strategy Modules com backend para ler/escrever trades
   - Implementar lógica de paper trading no frontend (verifica condições, chama backend)
   - Refresh automático a cada 60 segundos
4. **Validar build** (typecheck, lint, build)
5. **Deploy**

## UX Notes

- **Markets Overview**: Busca e ordenação de símbolos deve ser instantânea (dados vêm da Binance, sem paginação backend)
- **Strategy Modules**: Cards mostram status em tempo real (Scanning, Trade Open, Closing)
- **Asset Detail**: Todas as métricas (preço, funding, OI, volume) atualizam a cada 60s
- **Trade History**: Persiste no backend, sobrevive a reloads
- **Loading states**: Mostrar skeleton ou spinner durante fetch inicial
- **Error handling**: Mensagem amigável se Binance API falhar
