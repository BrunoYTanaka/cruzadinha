# Implementation Plan: PWA e modo offline

**Branch**: `feat/041-pwa-modo-offline` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/041-pwa-modo-offline/spec.md` (ref. issue #90)

## Summary

O site vira PWA instalável (`vite-plugin-pwa`, `generateSW`, manifesto e ícones) com precache só da
casca, sem nunca guardar respostas da API no service worker. As cruzadas abertas ou baixadas ficam
num IndexedDB próprio (`cruzadinha-offline`, limite de 60) e abrem dali mesmo com rede. Sem rede, o
portão do servidor deixa passar, a sessão vem do último usuário conhecido e a conta vê o progresso
conhecido mais o outbox. O outbox por conta e cruzada que já existe no `localStorage` passa a aceitar
reinícios e é drenado fora do jogo quando o servidor fica pronto ou a rede volta. A API não muda.
Detalhes e alternativas: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24 (build), navegadores atuais.

**Primary Dependencies**: React 19.3, Vite 8.3, React Router 7, TanStack Query 5, `idb` 8, Zod 4.6;
nova devDependency `vite-plugin-pwa` 2.0.0 (peer `vite ^8`, traz `workbox-build`/`workbox-window`).

**Storage**: IndexedDB `cruzadinha-offline` (stores `puzzles`, `known-progress`); `localStorage`
(outbox existente com formato estendido, `cruzadinha:last-user`); Cache Storage do Workbox só para a
casca. Sem mudança no Postgres.

**Testing**: Vitest 5 + jsdom + `fake-indexeddb` (unidade); Playwright com `context.setOffline` sobre
`vite preview` (um caminho e2e novo).

**Target Platform**: Chrome/Edge/Samsung Internet Android (instalação com botão), Safari iOS
(offline sim, botão não), Firefox, desktop. Cloudflare Pages.

**Project Type**: monorepo web (só `apps/web` muda; `apps/api` e `packages/shared` intocados).

**Performance Goals**: jogo pronto ≤ 2 s sem rede com cruzada guardada (SC-002); fila no servidor
≤ 2 min após a rede voltar, cobrindo os até 90 s de despertar do servidor (SC-003); download de hoje ≤ 30 s (SC-006).

**Constraints**: nada bloqueia a partida; nada com dados da conta sobrevive ao logout; noindex,
atribuição e "sem redistribuição" mantidos; compatível com a API publicada (contrato igual).

**Scale/Scope**: até 60 cruzadas guardadas por aparelho (dezenas de kB cada); 4 fontes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. TypeScript estrito | Tudo lido do IndexedDB/`localStorage` entra como `unknown` e passa por schemas de `shared` (`puzzleResponseSchema`, `progressSchema`, `saveProgressRequestSchema`, `userSchema`); sem `any` (o tipo `BeforeInstallPromptEvent` é declarado em `vite-env.d.ts`). ✅ |
| II. Qualidade | Sem mudança nos scripts; `vite-plugin-pwa` entra no `package-lock.json`. ✅ |
| III. Camadas no back | API não muda. ✅ |
| IV. Adaptadores | Fontes e coleta não mudam. ✅ |
| V. Lógica pura e TanStack Query | Regras do outbox (`decideOutbox`) e da remoção por limite são funções puras com testes; estado de servidor segue no TanStack Query; conexão e instalação via `useSyncExternalStore`, sem biblioteca de estado global. ✅ |
| VI. Segurança e privacidade | Solução guardada é a mesma já entregue ao navegador; service worker não guarda `/api`; pendências só enviadas com a sessão da conta dona; logout apaga outbox, progresso conhecido e `last-user`; visitante nunca envia progresso. ✅ |
| VII. Testes sem internet | Unidade com `fake-indexeddb`; e2e local com rede simulada. ✅ |
| VIII. Conteúdo de terceiros | `noindex` em `/*` cobre `sw.js`/manifesto; atribuição vem do mesmo `PuzzleResponse`; cópia local guarda só o necessário para jogar (`PuzzleResponse` + fonte, data, `openedAt`), com limite; nenhuma exportação. ✅ |
| IX. Migrações | Sem schema novo. ✅ |
| Fluxo: Context7 | `vite-plugin-pwa` consultado (`registerType`, `navigateFallbackDenylist`, `virtual:pwa-register`); versão e peer conferidos no npm. ✅ |

**Post-design re-check**: sem violações. O único ponto de atenção é o reinício offline de conta
(abaixo), aceito por estar dentro das regras do servidor.

## Project Structure

### Documentation (this feature)

```text
specs/041-pwa-modo-offline/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/site-offline.md
├── checklists/
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── vite.config.ts                       # + VitePWA({ registerType: 'prompt', manifest, workbox })
├── index.html                           # + apple-touch-icon, theme-color
├── public/
│   ├── _headers                         # + /sw.js e /manifest.webmanifest no-cache
│   └── pwa-192.png, pwa-512.png, pwa-maskable-512.png, apple-touch-icon.png
├── src/
│   ├── main.tsx                         # registerSW({ immediate: true }); captura beforeinstallprompt
│   ├── vite-env.d.ts                    # tipos de virtual:pwa-register e BeforeInstallPromptEvent
│   ├── app/
│   │   ├── router.tsx                   # /jogo/:puzzleId fora do portão quando há cópia guardada
│   │   └── AppLayout.tsx                # aviso "Sem conexão", pendência de outra conta, Instalar, Sair com confirmação
│   ├── shared/
│   │   ├── hooks/useOnline/             # novo
│   │   └── services/api/server-wake/    # saída "sem rede" em waitForServer/whenServerReady
│   ├── features/
│   │   ├── offline/                     # NOVA feature (index.ts público)
│   │   │   ├── services/offline-store/  # IndexedDB cruzadinha-offline (puzzles, known-progress)
│   │   │   ├── services/outbox/         # chave, leitura tolerante, decideOutbox (movidos de game/save-queue)
│   │   │   ├── services/drain/          # drainOutboxes(userId)
│   │   │   ├── hooks/                   # useInstallPrompt, useOfflinePuzzleIds, useOutboxDrain
│   │   │   └── components/              # InstallButton, OfflineNotice, PendingOwnerNotice, LogoutConfirm
│   │   ├── session/                     # services/last-user/ (cruzadinha:last-user); viewerLoader sem rede
│   │   ├── library/                     # marca "Disponível sem rede", calendário offline, Baixar as de hoje
│   │   └── game/                        # useGameData lê cópia primeiro e progresso conhecido; save-queue usa outbox de offline; playAgain offline enfileira reset
│   └── pages/                           # login/cadastro/etc.: "Esta tela precisa de conexão"
├── e2e/offline.spec.ts                  # novo
.dependency-cruiser.cjs                  # FEATURE_ORDER = session < guest < offline < library < settings < game
CLAUDE.md, docs/deploy.md                # registrar a feature e os cabeçalhos
```

**Structure Decision**: uma feature nova `features/offline` (regra da 037: cada unidade na própria
pasta, `index.ts` como entrada). Ela fica depois de `session` e `guest` (usa o `guestStore` para
proteger cruzadas em andamento e o usuário da sessão) e antes de `library` e `game`, que a usam.
Como `session` é a primeira da ordem e precisa escrever o último usuário ao ler a sessão, o
`last-user` fica em `features/session/services/last-user/`; a limpeza do logout (outbox, progresso
conhecido) é feita pelo `AppLayout` (camada `app`, que pode importar `offline`) antes de chamar o
logout.

## Complexity Tracking

| Ponto | Por que é preciso | Alternativa mais simples rejeitada porque |
|---|---|---|
| Reinício ("Jogar de novo") de conta na fila offline | FR-003/FR-008 pedem "Jogar de novo" sem rede para contas; hoje ele exige o servidor | Manter só online contraria a spec. Sem risco aceito: antes de enviar um `reset`, o `drainOutboxes` lê `GET /api/progress/:puzzleId` e descarta o reset se o `savedAt` do servidor for mais novo que o `at` do reset (progresso ou conclusão feitos em outro aparelho nunca são apagados); sem mudança na API |
| `/jogo/:puzzleId` fora do portão do servidor quando há cópia | FR-019 e SC-002 (jogo em ≤ 2 s sem esperar o servidor gratuito acordar) | Manter dentro do portão faria a cruzada guardada esperar até 90 s com rede instável |
