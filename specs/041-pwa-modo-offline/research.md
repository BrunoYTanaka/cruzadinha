# Research: PWA e modo offline (041)

Fontes: código atual de `apps/web` (lido em 2026-10-26) e documentação do `vite-plugin-pwa` via Context7
(`/websites/vite-pwa-org_netlify_app`); `npm view vite-plugin-pwa` confirmou a versão 2.0.0 com peer
`vite ^8.0.0`.

## R1. Service worker e precache

- **Decision**: `vite-plugin-pwa` 2.0.0 (devDependency de `apps/web`, traz `workbox-build` e
  `workbox-window`), estratégia `generateSW`. Precache só da casca do site (`**/*.{js,css,html,svg,png,woff2}`
  do `dist`); `navigateFallback: '/index.html'`; `navigateFallbackDenylist: [/^\/api\//]`. **Nenhum**
  `runtimeCaching` para `/api`: o service worker nunca guarda resposta da API.
- **Rationale**: o Vite gera nomes com hash; listar esses arquivos à mão num service worker próprio é
  justamente o que o plugin faz. Sem cache de `/api` no service worker, nada com sessão fica num cache
  que o site não controla (FR-017), e as cruzadas ficam num lugar que o código lê, limita e apaga (R3).
- **Alternatives**: service worker escrito à mão (precisaria gerar a lista de arquivos do build, mais
  código); `injectManifest` (só necessário com lógica própria no service worker, que não há);
  `runtimeCaching` `NetworkFirst` para `/api/puzzles` (cache opaco ao app, sem limite por "aberta por
  último", sem saber o que está guardado para marcar no calendário, e risco de guardar resposta com
  sessão).

## R2. Atualização só na próxima abertura (FR-007)

- **Decision**: `registerType: 'prompt'` e `registerSW({ immediate: true })` de `virtual:pwa-register`
  sem `onNeedRefresh` (nunca chama `updateSW`). O service worker novo fica em espera e só assume quando
  todas as abas do site fecham; a próxima abertura já usa a versão nova.
- **Rationale**: é o ciclo padrão do service worker sem `skipWaiting`; atende "sem aviso, sem botão,
  nunca no meio da partida" sem código. `autoUpdate` faz `skipWaiting` + recarga, o que interromperia a
  partida.
- **Interação com `reload-after-deploy.ts`**: com o precache, a aba antiga continua servindo os chunks
  antigos do próprio cache, então o `vite:preloadError` passa a ser raro; a recarga única continua
  como rede de segurança (primeira visita sem service worker). Nada muda nela.
- **Cabeçalhos**: `public/_headers` ganha `/sw.js` e `/manifest.webmanifest` com `Cache-Control:
  no-cache`, para o navegador sempre conferir a versão. O `noindex` em `/*` já cobre os arquivos novos.

## R3. Onde guardar as cruzadas

- **Decision**: IndexedDB próprio, banco `cruzadinha-offline` (via `idb`, já dependência), separado de
  `cruzadinha-visitante`. Store `puzzles` com o `PuzzleResponse` inteiro (`{ puzzleId, puzzle,
  solution }`, exatamente o que o jogo já recebe) mais `source`, `date`, `openedAt`. Tudo o que sai do
  banco passa por `puzzleResponseSchema` (mesmo padrão do `guest-store`).
- **Rationale**: separado do banco do visitante para não misturar conta e visitante; conteúdo público,
  igual para todos, então fica no logout (clarificação 5). Limite de 60 (Suposições), removendo por
  `openedAt` mais antigo; nunca remove a cruzada aberta agora, as com pendência na fila, nem as em
  andamento (visitante no `guestStore`, conta no progresso conhecido) (FR-013).
- **Alternatives**: Cache Storage (R1, rejeitado); `localStorage` (5 MB e síncrono; uma cruzada com
  solução tem dezenas de kB).
- **Falha de armazenamento** (cota, modo privado, dados apagados): a gravação falha em silêncio para
  o jogo, que segue com a cópia em memória; o download da História 4 relata a falha no resumo. Pedir
  `navigator.storage.persist()` uma vez ao guardar a primeira cruzada (o navegador pode recusar; sem
  aviso).

## R4. Abrir sem rede: portão do servidor e sessão

Hoje `serverReadyLoader` espera a API até 90 s e `viewerLoader` exige `GET /api/auth/me`; sem rede, a
pessoa ficaria na tela "acordando o servidor" e depois num erro.

- **Decision**:
  1. `waitForServer` e `whenServerReady` ganham uma saída "sem rede": quando `navigator.onLine` é
     `false` (ou passa a ser durante a espera), resolvem sem marcar o servidor pronto. O portão deixa
     passar; o servidor continua "não pronto" e é marcado pronto quando a rede volta e o health
     responde (o evento `online` reinicia a espera em segundo plano).
  2. A sessão conhecida: ao receber uma sessão (`getMe`, login), o site guarda só o `user` em
     `localStorage` `cruzadinha:last-user` (id e e-mail; apagado no logout e quando o servidor
     responde sem sessão). `viewerLoader`, sem rede, preenche a consulta de sessão com esse usuário
     (ou `null`, visitante). Quando o servidor fica pronto, a sessão é consultada de novo; se acabou,
     vale o fluxo de sessão encerrada que já existe (vira visitante, aviso não bloqueante).
  3. Uma cruzada guardada abre da cópia mesmo com rede (FR-019): `useGameData` lê primeiro o banco
     offline e só chama `getPuzzleById` quando não há cópia. A rota do jogo não espera o servidor
     acordar quando a cópia existe: `/jogo/:puzzleId` sai de dentro do portão do servidor e do
     `viewerLoader`, e usa um loader próprio que (a) com cópia guardada resolve na hora com o usuário
     conhecido, (b) sem cópia faz o mesmo que hoje (espera servidor e sessão).
- **Rationale**: muda o mínimo da feature 032 (o portão continua para tudo o que precisa do servidor);
  "rede instável" (online mas sem resposta) continua esperando o servidor, exceto para cruzada
  guardada, como pede o edge case.
- **Alternatives**: persistir todo o cache do TanStack Query (`persistQueryClient`): guardaria
  respostas com dados da conta sem controle fino de limpeza (FR-017) e nova dependência; detectar
  offline por tempo limite em todo pedido: mais lento e mais complexo.

## R5. Fila de salvamento offline para contas

O site já tem quase tudo: `createSaveQueue` guarda o corpo não confirmado em `localStorage`
`cruzadinha:outbox:<userId>:<puzzleId>` (uma entrada por conta e cruzada, só a mais recente; FR-009),
repete 429/5xx/rede com espera (`BACKOFF_MS`) e reenvia no evento `online`; `useGame` monta o
tabuleiro com o outbox quando ele é mais novo que o servidor. O servidor ignora `savedAt` mais velho
(`decideSave` → `unchanged`) e nunca apaga conclusão (`progress-completed`), então reenvio duplicado de
duas abas é inofensivo.

Falta:

- **Decision (envio fora do jogo)**: `drainOutboxes(userId)` em `features/offline`: lista as chaves
  `cruzadinha:outbox:<userId>:*`, envia cada uma com `saveProgress` (mesmo endpoint, mesmo corpo) em
  ordem de `savedAt`, apaga ao confirmar (`clearOutboxUpTo`, igual à fila), para em 401, espera e
  repete em 429/5xx/rede com o mesmo `BACKOFF_MS`. Roda quando o servidor fica pronto com uma conta e
  no evento `online`; pula a cruzada aberta na aba (a fila dela já cuida). Uma por vez por aba;
  entre abas, `navigator.locks.request('cruzadinha:outbox-drain', { ifAvailable: true })` evita duas
  drenagens simultâneas (sem `locks`, drena mesmo assim: o servidor já é idempotente).
- **Decision (reinício offline, US3)**: hoje "Jogar de novo" de conta exige o servidor
  (`resetProgress`) e responde `'offline'` sem rede. A spec pede reinício offline para contas
  (FR-003, FR-008; ver Complexity Tracking no plano), então o outbox ganha a
  forma `{ kind: 'save', body } | { kind: 'reset', at }` com leitura tolerante (o formato antigo, só o
  corpo, continua aceito como `save`). Ao drenar: `reset` primeiro chama `POST /api/progress/reset`, e
  um `save` posterior da mesma cruzada vai depois. Um `reset` substitui qualquer `save` anterior da
  mesma cruzada; um `save` posterior fica junto (duas entradas no máximo, na ordem). Ver data-model §3.
- **Decision (dono das pendências, FR-011)**: as chaves já levam o `userId`. Ao sair da conta: o botão
  "Sair", havendo outbox dessa conta, abre um `Dialog` de confirmação ("Há progresso ainda não enviado;
  sair descarta esse progresso"); confirmado, apaga outbox, progresso conhecido e `last-user`. Sessão
  que expira (401): nada é apagado; o aviso "Há progresso esperando você entrar" aparece enquanto
  houver outbox de uma conta diferente do visitante atual. Login de outra conta: apaga outboxes e
  progresso conhecido de qualquer outro `userId` e mostra aviso não bloqueante ("O progresso não
  enviado da conta anterior foi descartado").
- **Rationale**: reaproveita o formato, as regras de repetição e o servidor sem mudar contrato.
- **Alternatives**: Background Sync API (só Chromium e a spec exclui envio com o site fechado);
  mover o outbox para IndexedDB (sem ganho: uma entrada pequena por cruzada).

## R6. Progresso conhecido da conta (FR-018)

- **Decision**: store `known-progress` no banco `cruzadinha-offline`, chave `[userId, puzzleId]`,
  valor `Progress` (o mesmo de `GET /api/progress/:id`), validado com o schema de `shared` na leitura.
  Escrito quando `getProgress` responde e quando a fila confirma um envio (`onProgress`). Sem rede,
  `useGameData` usa esse valor como `progress` da conta; o outbox mais novo continua por cima (lógica
  atual de `useGame`). Só para cruzadas guardadas; apagado no logout e no login de outra conta.
- **Alternatives**: não guardar e abrir só com o outbox (perde o progresso confirmado; a clarificação 2
  pede os dois).

## R7. Estado de conexão (FR-004)

- **Decision**: `useOnline()` em `shared/hooks/useOnline/` com `useSyncExternalStore` sobre
  `online`/`offline` e `navigator.onLine`. `AppLayout` mostra um `Notice` discreto "Sem conexão" (região
  `role="status"`), que some sozinho. Telas que exigem servidor (login, cadastro, recuperar senha,
  verificar e-mail, status) mostram "Esta tela precisa de conexão" quando `useOnline()` é `false`.
- **Rationale**: `navigator.onLine === false` é confiável para "sem rede"; `true` não garante resposta,
  por isso a rede instável segue o caminho do tempo limite que já existe.

## R8. Instalação (FR-006)

- **Decision**: manifesto gerado pelo plugin (`name: 'Cruzadinha'`, `short_name`, `lang: 'pt-BR'`,
  `display: 'standalone'`, `start_url: '/'`, `theme_color`/`background_color` de `docs/design.md`,
  ícones PNG 192, 512 e 512 `maskable` em `public/`, gerados uma vez a partir de `favicon.svg` e
  versionados; `apple-touch-icon` 180 no `index.html`). Botão "Instalar" (`Button` variante `quiet`)
  no cabeçalho, alimentado por `beforeinstallprompt` capturado em `main.tsx` (`useInstallPrompt` em
  `features/offline`); some com `appinstalled` e quando `matchMedia('(display-mode: standalone)')`.
  Sem o evento (Safari/iOS, Firefox) o botão não aparece.
- **Alternatives**: `@vite-pwa/assets-generator` (dependência a mais para gerar três PNG uma vez);
  instruções "Adicionar à tela de início" para iOS (não pedido).

## R9. Baixar as cruzadas de hoje (US4)

- **Decision**: botão "Baixar as cruzadas de hoje" na seção "Hoje" do calendário. Para cada fonte de
  `puzzleSourceIdSchema.options`, `getPuzzleByDate(source, today)` com `Promise.allSettled`; cada
  sucesso vai para o banco offline; resumo "Guardadas: X. Falharam: Y." em `Notice`. Sem rede o botão
  fica desabilitado. Usa o limite `PUZZLE_FETCH` da API como qualquer pedido.
- **Marcação (FR-015)**: `useOfflinePuzzleIds()` (lista as chaves do store) marca o `DayCell` e o card
  de "Hoje" com um ícone + texto acessível "Disponível sem rede".
- **Sem rede**: o calendário lista só os dias guardados, montados a partir do banco offline (fonte,
  data e título), com a mensagem "Sem conexão: mostrando só as cruzadas guardadas". Um dia não guardado
  em `/dia/:date` responde "Esta cruzada só abre com conexão".

## R10. Testes

- Unidade (Vitest + `fake-indexeddb`, já configurado): banco offline (guardar, ler com schema, limite e
  proteção), outbox com `reset`, drenagem (ordem, 401 para, 429 repete, troca de conta descarta),
  `useOnline`, portão sem rede, `useGameData` com cópia guardada e sem rede.
- E2E (Playwright): um caminho `offline.spec.ts` com `context.setOffline(true)` sobre `vite preview`
  (o service worker é registrado no build de produção): abrir cruzada com rede, ficar offline,
  recarregar, jogar até concluir; conta: preencher offline, voltar a rede, conferir no banco.
- Sem mudança na API, então sem teste de integração novo.
