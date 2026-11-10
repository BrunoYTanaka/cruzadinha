# Tasks: Ajustes de layout e comportamento (landing, cabeçalho, balões, jogo)

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Prerequisites**: `npm ci`; para e2e, API e Postgres locais (ver `CLAUDE.md`).

**Tests**: pedidos pelo CLAUDE.md (testes verdes; correção começa por teste que falha). Gate de cada grupo: `npm run lint && npm run typecheck && npm test`.

Caminhos relativos a `apps/web/src/`, salvo `e2e/` (em `apps/web/`). Sem mudanças em `apps/api` nem `packages/shared`. Commits em inglês, sem atribuição de IA (CLAUDE.md do projeto).

## Phase 1: Setup

- [X] T001 Criar a branch `feat/063-landing-sem-atalhos` a partir de `main` (`npm run check:branch`), levando `specs/063-landing-sem-atalhos/`, `docs/design.md` e `docs/mockups/design-system.html`, e a mudança já feita em `shared/components/Tooltip/Tooltip.tsx`

## Phase 2: User Story 3 — Balão só com foco de teclado (P1, `fix`)

**Independent Test**: clicar num botão de ícone e tirar o mouse: sem balão; Tab: balão.

- [X] T002 [US3] Escrever em `shared/components/Tooltip/Tooltip.test.tsx` os testes que falham sem a correção: clique (foco com `:focus-visible` falso) não abre; Tab (`:focus-visible` verdadeiro) abre na hora; foco devolvido ao botão ao fechar um diálogo não abre; toque não abre; Esc fecha. Mockar `Element.prototype.matches` para `:focus-visible` (jsdom não o implementa)
- [X] T003 [US3] Conferir que `isKeyboardFocus` em `shared/components/Tooltip/Tooltip.tsx` faz T002 passar (já escrito); se o seletor lançar erro, cai no comportamento antigo (`shortcut:` já comentado)
- [X] T004 [US3] Commit `fix(web): open tooltips only on keyboard focus`

**Checkpoint**: balão corrigido, independente dos demais.

## Phase 3: User Story 1 — Cabeçalho da landing enxuto (P1)

**Independent Test**: `/` em 1280 e 390 px sem Calendário, Estatísticas, x1, configurações nem Menu; `/calendario` mantém tudo.

- [X] T005 [P] [US1] Testes que falham em `app/AppLayout.test.tsx`: em `/` não há links "Calendário", "Estatísticas", "x1", botão "Menu", "Configurações" nem contador de x1 (nem com x1 aguardando); "Entrar" (visitante) e o círculo da conta (logado) existem; em `/calendario` todos continuam
- [X] T006 [P] [US1] Testes que falham em `app/LandingShell.test.tsx`: o cabeçalho pré-gerado tem só a marca, sem "Calendário" (FR-002: mesmo começo; as ações da direita entram ao montar)
- [X] T007 [US1] `app/HeaderStart.tsx`: nova prop `landing?: boolean`; com ela omite o link "Calendário" (mantém marca e `.spacer`)
- [X] T008 [US1] `app/AppLayout.tsx`: `const isLanding = pathname === '/'`; `HeaderStart landing={isLanding}`; na landing omitir Estatísticas, x1, `Menu` e `SettingsButton`; manter `InstallButton`, "Entrar" e círculo; não montar `SettingsDialog` na landing
- [X] T009 [US1] `app/LandingShell.tsx`: usar `<HeaderStart landing />`
- [X] T010 [US1] Teste de HTML pré-gerado: estender `npm run check:build-output -w @cruzadinha/web` (script de verificação do `dist/`) para falhar se `dist/index.html` tiver "Calendário" no cabeçalho
- [X] T011 [US1] `e2e/landing.spec.ts`: em 1280 e 390 px o cabeçalho da landing tem só marca e "Entrar"; sem salto de conteúdo entre HTML pré-gerado e montado (mesma medida de antes)
- [X] T012 [US1] Rodar `npm test -w @cruzadinha/web -- AppLayout LandingShell` e `vitest-axe` da landing

**Checkpoint**: landing enxuta.

## Phase 4: User Story 4 — Landing espera o servidor com a tela de espera (P1)

**Independent Test**: com a API lenta, "Jogar agora" mostra a tela de espera e abre `/dia/<hoje>` quando ela responde; "Entrar" idem para o login.

- [X] T013 [US4] Testes que falham em `features/landing/components/PlayLink/PlayLink.test.tsx`: servidor pronto (`isServerReady()` verdadeiro) navega na hora, sem tela de espera; servidor dormindo mostra `LoadingState` e só navega quando `whenServerReady` resolve; `ServerWakeTimeoutError` mostra a mensagem de erro de conexão existente com "Tentar de novo"; `popstate` durante a espera volta à landing sem erro; não há mais texto "Abrindo…" nem balão `SLOW_MESSAGE` no botão
- [X] T014 [US4] `features/landing/components/PlayLink/PlayLink.tsx`: no clique, se `!isServerReady()` impedir a navegação, mostrar `LoadingState level={1}` no lugar do conteúdo da landing (estado local ao clique, pois o prerender usa `StaticRouter`) e navegar com `navigate(to)` depois de `whenServerReady`; tratar `ServerWakeTimeoutError` e `AbortError` (voltar); remover `pendingLabel`, `useSlowAfter`, "Abrindo…", o balão (FR-013) e o que ficar sem uso em `PlayLink.module.css`
- [X] T015 [US4] Fazer o link "Entrar" do cabeçalho na landing (`app/AppLayout.tsx`) usar o mesmo caminho de espera da T014 (por exemplo, o mesmo hook extraído para `features/landing`, exportado por `features/landing/index.ts`; checar `check:deps`: `app` pode importar `features`)
- [X] T016 [US4] Revisar usos de `PlayLink` em `features/landing/components/*` (Hero, FinalBand, FeatureCards) para conferir que nenhum passa `pendingLabel`; ajustar testes que dependiam de "Abrindo…"
- [X] T017 [US4] `e2e/espera-servidor.spec.ts`: com `/api/health` atrasado, clicar "Jogar agora", "Ver o calendário" e "Entrar" mostra a tela de espera e termina no destino certo; com falha de 90 s simulada aparece o erro de conexão
- [X] T018 [US4] Conferir `LoadingState` na landing: um único `h1` na página e sem violação de acessibilidade

**Checkpoint**: nenhum botão da landing fica sem retorno.

## Phase 5: User Story 2 — Estatísticas e x1 junto das configurações (P2)

**Independent Test**: em `/calendario`, Estatísticas, x1 e engrenagem formam um grupo à direita; Calendário junto da marca; Tab na ordem visual.

- [X] T019 [US2] Teste de proteção em `app/AppLayout.test.tsx` (já passa; impede regressão): fora da landing, a ordem do DOM do cabeçalho é marca, Calendário, Estatísticas, x1, Menu, Instalar, Configurações, conta/Entrar
- [X] T019a [US2] Teste de CSS que falha em `app/AppLayout.test.tsx` com `readCss('AppLayout.css')`: `.statsLink`, `.duelLink` e `.menu` têm o mesmo `order` de `.tail` (2), depois do `.spacer` (1)
- [X] T020 [US2] Só `app/AppLayout.module.css` (D2): dar a `.statsLink`, `.duelLink` e `.menu` `order: 2`, para ficarem depois do `.spacer` (`order: 1`) e junto de `.tail`; `HeaderStart.tsx` não muda (o DOM já está na ordem certa). Faz T019a passar
- [X] T021 [US2] Conferir até 560 px: Calendário, Estatísticas e x1 viram o `Menu` como antes; 390 px com marca, Menu, configurações e Entrar numa linha; 320 px sem quebra
- [X] T022 [US2] Criar `e2e/cabecalho.spec.ts`: em 1280 px, Estatísticas, x1 e engrenagem são contíguos (mesma `y` e vizinhos), Calendário ao lado da marca; Tab percorre na ordem visual

## Phase 6: User Story 5 — Entrar pela landing e cair no calendário (P2)

**Independent Test**: da landing, "Entrar", login, tela final `/calendario`.

- [X] T023 [US5] Testes em `features/session/helpers/redirect.test.ts` (existe): `buildLoginPath('/')` é `/login` e `safeNext(null)` é `/calendario`; criar `features/account/components/LoginForm/LoginForm.test.tsx` (não existe): login sem `next` navega a `/calendario`
- [X] T024 [US5] `e2e/landing.spec.ts`: da landing, clicar "Entrar" (esperando a tela de espera da US4 se houver), entrar com a conta de teste e conferir `/calendario`; visitante vê "Entrar" em 390 px também (FR-007)

## Phase 7: User Story 6 — Jogo sem aviso de progresso do visitante (P2)

**Independent Test**: visitante no jogo sem os três textos.

- [X] T025 [US6] Testes que falham em `features/game/components/controls/SaveStatus/SaveStatus.test.tsx`: não existem "Progresso só neste aparelho", "Entrar para salvar na sua conta" nem o anúncio "Seu progresso fica salvo só neste aparelho."; os avisos de problema (offline, concluída em outro aparelho, só nesta aba) seguem; `SaveStatus` não recebe mais `guest`
- [X] T026 [US6] `features/game/components/controls/SaveStatus/SaveStatus.tsx`: remover `GUEST_TEXT`, `GUEST_ANNOUNCEMENT`, a prop `guest`, o `Link` "Entrar para salvar na sua conta" e o `announcement` inicial do visitante; limpar `SaveStatus.module.css` (`.login`) se sobrar sem uso
- [X] T026a [US6] `vitest-axe` na tela do jogo do visitante em `pages/game/GamePage.test.tsx` (SC-006)
- [X] T027 [US6] `features/game/components/GameScreen/GameScreen.tsx:253`: deixar de passar `guest`; remover o `buildLoginPath` se ficar sem uso no arquivo; ajustar `pages/game/GamePage.test.tsx` e e2e que buscavam esses textos
- [X] T028 [US6] `e2e/sem-saltos.spec.ts`: a faixa de ferramentas do visitante não se desloca ao digitar sem o bloco

## Phase 8: User Story 7 — Títulos das dicas legíveis ao rolar (P2)

**Independent Test**: rolar Horizontais e Verticais sem linhas cortadas nítidas sob o título.

- [X] T029 [US7] Teste de CSS que falha em `features/game/components/clues/ClueList/ClueList.test.tsx` (`readCss('ClueList.css')`): `.heading::after` tem `linear-gradient(var(--bg), transparent)`, `top: 100%`, altura de 12 px e `pointer-events: none`; `.heading` continua `position: sticky` com `z-index`
- [X] T030 [US7] `features/game/components/clues/ClueList/ClueList.module.css`: adicionar o `::after` de `.heading` e `z-index` acima da lista; sem mudar `margin`/`padding` (não ocupa espaço)
- [X] T031 [US7] Ler `features/game/components/clues/ClueSheet/ClueSheet.tsx`: se ela renderiza a `ClueList`, só confirmar por teste; senão, em `ClueSheet.module.css` dar o mesmo tratamento na folha de dicas do celular (reusa `.heading` ou replica a regra); teste de CSS equivalente
- [ ] T032 [US7] `e2e/`: com muitas dicas, rolar a lista e conferir que a dica ativa que muda a rolagem não desloca o layout (`sem-saltos.spec.ts`); tema claro e escuro

## Phase 9: User Story 8 — "Tamanho padrão" como ícone (P3)

**Independent Test**: arrastar a alça, o botão de ícone fica ativo; acionar restaura e o desativa.

- [X] T033 [US8] Testes que falham em `pages/game/GamePage.test.tsx` (blocos de `Tamanho padrão`, linhas ~389 a ~486): o botão tem `aria-label` "Tamanho padrão", é botão de ícone (sem texto visível), indisponível no padrão, ativo após mudar, restaura e some no celular; balão "Tamanho padrão" no foco de teclado
- [X] T034 [US8] `features/game/components/board/BoardSizeReset/BoardSizeReset.tsx`: `Button variant="icon" size="small"` com `aria-label="Tamanho padrão"`, `disabled={isDefault}` e `Tooltip label="Tamanho padrão"`; SVG de quatro cantos (`M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5`, igual ao mockup); atualizar o comentário do arquivo e de `Toolbar.tsx:16`
- [X] T034a [US8] `vitest-axe` na faixa de ferramentas com o botão de ícone em `pages/game/GamePage.test.tsx` (SC-006)
- [X] T035 [US8] Conferir `shared/components/button-states.test.ts` e `e2e/tamanhos.spec.ts` (busca pelo nome "Tamanho padrão"); ajustar o que dependia de texto visível

## Phase 10: Polish & Cross-Cutting

- [X] T036 Regressão do FR-010: `features/account/components/SlowSubmitNotice/SlowSubmitNotice.test.tsx` e os formulários de conta seguem verdes, com o aviso sob o botão intacto
- [X] T036a Rodar `npm run format:check && npm run lint && npm run typecheck && npm test` na raiz; corrigir
- [X] T037 `npm run build && npm run check:build-output -w @cruzadinha/web`
- [X] T038 `npm run test:e2e -w @cruzadinha/web -- landing espera-servidor sem-saltos tamanhos botoes` com API e Postgres locais
- [X] T039 Revisar `CLAUDE.md`: atualizar as linhas de Landing (048, 050), Design system (062; cabeçalho) e Game screen se algo ficar falso (cabeçalho da landing sem atalhos; espera pelo `PlayLink`; sem aviso do visitante; títulos das dicas; "Tamanho padrão" em ícone)
- [ ] T040 Percorrer o [quickstart.md](quickstart.md) à mão em desktop e celular, claro e escuro; registrar divergências em `research.md`
- [ ] T041 Abrir o PR `feat(web): refine landing header, wake screen and game controls` para `main` (descrição com resumo e plano de teste, sem atribuição de IA)

## Dependencies

- T001 antes de tudo. US3 (T002–T004) é independente e vai primeiro, como `fix` em commit próprio.
- US1 (T005–T012) antes de US2 (ambas mexem em `AppLayout.tsx`/`HeaderStart.tsx`) e de US4 T015.
- US4 T014 antes de T015. US5 depende de US1 (botão "Entrar" na landing) e de US4 (espera).
- US6, US7, US8 não dependem de nenhuma outra e podem andar em paralelo (arquivos diferentes).
- Polish por último.

## Parallel Opportunities

- T005 e T006 (testes do cabeçalho em arquivos diferentes).
- US6 (T025–T028), US7 (T029–T032) e US8 (T033–T035) em paralelo entre si, depois do T001.
- US3 em paralelo com US1.

## Implementation Strategy

- **MVP**: US3 (correção do balão) + US1 (cabeçalho da landing); entrega sozinha.
- Depois US4 e US5 (landing completa), US2 (layout interno) e por fim US6, US7, US8.
- Cada história termina com `lint`, `typecheck` e testes verdes antes da seguinte; um único PR.
