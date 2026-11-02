# Research: Carregamento padronizado e amigável

## R1. Quem sabe que está "lento"

- **Achado**: `useSlowServer()` olha só os pedidos feitos pelo cliente da API (`getOldestPendingStartedAt`).
  `waitForServer()` usa `fetch` cru, então a espera do loader do servidor (`serverReadyLoader`,
  `directPlayLoader`) **não** a aciona. O `ServerWake` de hoje conta o próprio tempo desde que monta.
- **Decisão**: o `LoadingState` fica lento quando `useSlowServer().slow` **ou** quando o próprio
  componente está montado há 2 s (`useSlowAfter(true)`, atraso padrão `WAKE_NOTICE_DELAY_MS`). O contador conta desde a
  montagem. O `PlayLink` e o botão `pending` usam só `useSlowAfter`, contado desde o clique/ativação.
- **Alternativas**: fazer `waitForServer` marcar pendência no cliente (mexe em `server-wake.ts`, fora do
  escopo); contar só a partir de `useSlowServer` (não cobre o loader, que é o caso da landing).

## R2. Absorver o `ServerWake`

- **Decisão**: remover a pasta `ServerWake`; `router.tsx` (dois `hydrateFallbackElement`),
  `LandingPage` (modo "Ir direto ao jogo") e `RouteError` ("Tentar de novo", com `immediate` e
  `focusOnMount`) passam a usar `LoadingState`. `immediate` mostra a mensagem na hora; `focusOnMount`
  leva o foco ao título (o `h1`). O `e2e` e os testes que procuram "Acordando o servidor" são ajustados.
- **Heading**: a tela inteira de entrada tem `h1` (regra de um `h1` por página); `LoadingState` dentro
  de uma página que já tem `h1` usa `h2` ou só um `p` (`level`, como `ErrorState`).

## R3. Palavras e títulos

- **Decisão**: uma tabela tipada `LOADING_SCREENS: Record<LoadingScreen, { title, word }>` com as cinco
  telas do spec (`entry`, `game`, `day`, `library`, `stats`); a tela sem entrada usa `entry`. Texto fixo,
  sem sorteio. Palavras com acento (CALENDÁRIO) ficam como estão: as casas são só decoração.
- **Largura**: as casas usam `flex-wrap` e encolhem em telas estreitas (como na prévia aprovada).

## R4. Animação e acessibilidade

- **Decisão**: onda só com `transform`/`background-color`, atraso por casa (`--i`); barra com
  `translateX`; `@media (prefers-reduced-motion: reduce)` pára tudo. Casas `aria-hidden`; título é o
  nome da região; a mensagem tem `role="status"` e **já está no DOM com `visibility: hidden`** antes de
  2 s (espaço reservado, sem deslocar). Para o leitor anunciar, o `role="status"` fica num contêiner que
  recebe o texto só quando `slow` vira `true` (conteúdo, não visibilidade).
- **Contraste**: só tokens (`--ink`, `--mute`, `--accent`, `--sel`, `--sel-ink`, `--surface`).

## R5. Botão em espera

- **Decisão**: `Button` ganha `pending?: boolean`: `aria-busy`, `disabled`, spinner CSS antes do texto,
  e largura travada medindo o botão ao entrar em `pending` (`min-width` em px pelo `ref`, removido ao
  sair) para o texto trocado ("Entrando…") não mudar a largura. `SlowNotice` fica abaixo do botão com
  `min-height` fixo.
- **Alternativa rejeitada**: reservar a largura do texto mais longo por CSS (frágil entre formulários).

## R6. `PlayLink` na landing

- **Decisão**: `Link` com `pending` em estado local ligado no `onClick`, sem `useNavigation` (quebra no
  `StaticRouter`). `aria-busy`, texto "Abrindo…", cliques repetidos ignorados. O aviso aparece 2 s depois
  do clique em `SlowNotice` com altura reservada. Se a navegação termina, a landing desmonta; se falha,
  o `RouteError` assume.
- **Estado preso**: se a navegação for cancelada (Voltar durante a espera), a landing continuaria em
  "Abrindo…". **Decisão**: limpar o `pending` ao receber `popstate`, coberto por teste. Uma navegação
  cancelada por outro meio não tem evento simples; fica como risco conhecido.

## R7. Documentação consultada (Context7)

Consultada em T001 (2026-11-02):

- **react-router** (`/remix-run/react-router`): `Link` chama o `onClick` do usuário e só navega se `!event.defaultPrevented`; logo o `PlayLink` ignora cliques repetidos com `event.preventDefault()`. `StaticRouter` renderiza `Link` como `<a href>` normal.
- **vitest** (`/vitest-dev/vitest`): `vi.useFakeTimers()`, `vi.advanceTimersByTime(ms)` e `vi.useRealTimers()` confirmados; `Date` também é simulado.
- Nenhuma diferença de API que mude o plano.
