# Collie Monitor

## Current State

O Collie Monitor é um simulador de paper trading funcional com 6 telas principais (Markets Overview, Categories Dashboard, Category Detail, Asset Detail, Strategy Modules, Trade History), integração em tempo real com a Binance API, e tema visual azul marinho (#0a1628) + ciano (#00e5ff).

Atualmente o aplicativo funciona apenas como webapp tradicional, sem capacidades de PWA ou instalação nativa.

## Requested Changes (Diff)

### Add
- PWA manifest.json com identidade do app, ícones e configurações de instalação
- Conjunto completo de ícones PWA (192x192, 512x512, maskable icons)
- Service worker para suporte offline e cache estratégico
- Componente de UI para prompt de instalação (install banner)
- Meta tags para otimização mobile (theme-color, apple-touch-icon, etc)
- Splash screens para iOS

### Modify
- index.html: adicionar meta tags PWA e link para manifest
- Vite config: registrar service worker

### Remove
- N/A

## Implementation Plan

1. **Gerar ícones PWA profissionais** com o mascote robótico lobo/collie em hexágono ciano
   - Ícone 192x192px (standard)
   - Ícone 512x512px (high-res)
   - Ícone maskable 512x512px (adaptive icon com safe zone)
   - Apple touch icon 180x180px

2. **Criar manifest.json** em `/src/frontend/public/` com:
   - name: "Collie Monitor"
   - short_name: "Collie"
   - description: "Simulador de Paper Trading com Dados Reais da Binance"
   - theme_color: "#00e5ff" (ciano)
   - background_color: "#0a1628" (azul marinho)
   - display: "standalone"
   - orientation: "portrait-primary"
   - icons array com todos os tamanhos e purposes

3. **Implementar service worker** (`/src/frontend/public/sw.js`):
   - Cache-first para assets estáticos (CSS, JS, imagens)
   - Network-first para API calls da Binance
   - Offline fallback page
   - Estratégia de cache com versionamento

4. **Criar componente InstallPrompt** (`/src/frontend/src/components/InstallPrompt.tsx`):
   - Detecta evento `beforeinstallprompt`
   - Mostra banner fixo no topo quando instalação está disponível
   - Botão "Instalar App" com ícone de download
   - Fecha após instalação ou dismiss pelo usuário
   - Estilo consistente com tema (azul marinho + ciano)

5. **Atualizar index.html** com meta tags PWA:
   - `<meta name="theme-color" content="#00e5ff">`
   - `<link rel="manifest" href="/manifest.json">`
   - `<link rel="apple-touch-icon" href="/icon-180.png">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
   - Atualizar title para "Collie Monitor"

6. **Registrar service worker** no main.tsx ou App.tsx com:
   ```typescript
   if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
       navigator.serviceWorker.register('/sw.js')
     })
   }
   ```

7. **Adicionar InstallPrompt ao layout principal** (App.tsx) para exibir automaticamente quando disponível

## UX Notes

- O banner de instalação deve ser discreto mas visível (fixo no topo, acima do header)
- Usar cores do tema: fundo azul marinho escuro com borda ciana e texto ciano
- Ícone de download/add ao lado do botão "Instalar"
- Após instalação, o app deve abrir em tela cheia sem chrome do browser
- Splash screen deve usar fundo azul marinho com logo ciano centralizado
- Service worker deve cachear assets críticos para funcionamento offline básico
- Dados da API podem falhar offline, mas a UI deve continuar navegável
