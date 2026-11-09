# Tasks: Design system aplicado ao site

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md)

**Prerequisites**: branch `feat/062-design-system`, `npm ci`, ambiente do [quickstart.md](quickstart.md).

**Tests**: pedidos pelo CLAUDE.md (testes verdes por fatia). Cada fatia é um PR; o gate de cada PR é `npm run lint && npm run typecheck && npm test` (e `npm run test:e2e -w @cruzadinha/web` nas fatias 4 a 6).

Caminhos abaixo são relativos a `apps/web/src/`. Cada componente fica em pasta própria com `.module.css` e testes.

## Phase 1: Setup

- [X] T001 Fazer commit de `specs/062-design-system/` (brief, artefato, spec, plan, tasks) em `feat/062-design-system` (vai junto no PR 1; as fatias 2 a 6 saem de `main` em `feat/062-<slug>`, ver plan.md) com `docs: add spec, plan and tasks for the design system (feature 062)`
- [X] T002 [P] Capturar o estado atual das telas (claro e escuro, 390/768/1280 px) com Playwright em `apps/web/e2e/` para servir de base de regressão da landing e do tabuleiro (FR-019; comparadas em T037), guardando as capturas no diretório de rascunho da sessão, fora do git

## Phase 2: User Story 1 — Tokens (P1, PR 1)

- [X] T003 [US1] Escrever teste que falha em `shared/themes/tokens.test.ts`: `--edge` existe em `light.css` e `dark.css` e `--focus` mantém o valor atual (use `readCss`)
- [X] T004 [US1] Acrescentar `--edge: var(--ink)` em `shared/themes/light.css` e `--edge: #868d99` nos dois blocos de `shared/themes/dark.css`; listar `--edge` no comentário de `shared/themes/tokens.css`
- [X] T005 [US1] Conferir `--hover-overlay`, `--press-overlay`, `--radius-sm/md/lg` (6/10/16) e `--tap: 44px` contra `docs/mockups/design-system.html` e alinhar só o que faltar, registrando diferenças em `research.md`
- [X] T006 [US1] Teste de contraste de `--edge` e `--focus` contra `--bg`/`--surface` nos dois temas (mínimo 3:1) em `shared/themes/tokens.test.ts`
- [X] T007 [US1] Abrir PR 1 `feat(web): add the edge token for the design system`

**Checkpoint**: tokens existem; nada visual mudou.

## Phase 3: User Story 2 — Componentes de base (P1, PR 2)

- [X] T008 [P] [US2] Teste e componente `shared/components/Link/Link.tsx` + `Link.module.css` + `Link.test.tsx`: negrito em repouso; sublinhado amarelo (`--sel`) por `background-size` de 3 px em 280 ms só em `@media (hover: hover)`, 5 px em `:active`, sem transição em `prefers-reduced-motion`; `box-decoration-break: clone`
- [X] T009 [P] [US2] Conferir `shared/components/Button/*` contra a aba Componentes (4 variantes, `small`, `block`, `pending`): sem sombra nem movimento, overlay sobre `background-image`; ajustar `Button.module.css` e `shared/components/button-states.test.ts`
- [X] T010 [P] [US2] `shared/components/Tooltip/Tooltip.tsx` e `.module.css`: sombra suave, nome de botão de ícone e aviso de espera pelo mesmo componente; manter `tooltip-position.ts`
- [X] T011 [P] [US2] `shared/components/Notice/Notice.tsx`: variante `ok` (`role="status"`, símbolo "✓", `--ok`/`--ok-tint`), estado por símbolo e borda; atualizar `Notice.test.tsx` (inclui axe)
- [X] T012 [P] [US2] `shared/components/Dialog/Dialog.tsx`: botão de fechar em ícone no canto superior direito (`--tap`), `aria-label="Fechar"`, centralizado; manter `closeOnBackdrop` e foco; atualizar `Dialog.test.tsx`
- [X] T013 [P] [US2] Conferir `shared/components/Menu/Menu.tsx`: popover sem teclado na tela, folha com itens de 48 px com teclado na tela, `--edge` e overlay; atualizar `Menu.test.tsx`
- [X] T014 [US2] Atualizar `shared/components/touch-targets.test.tsx` para cobrir `Link`, fechar do `Dialog` e demais componentes
- [X] T015 [US2] Abrir PR 2 `feat(web): align the base components with the design system`

**Checkpoint**: componentes prontos e testados; telas ainda usam os atuais onde não foram trocadas.

## Phase 4: User Story 3 — Cabeçalho (P2, PR 3)

- [X] T016 [P] [US3] Função pura `shared/helpers/initials/initials.ts` + teste (e-mail de 1 caractere, pontos, maiúsculas; nunca vazio)
- [X] T017 [US3] `app/AppLayout.tsx` e `AppLayout.module.css`: círculo de 38 px com `initials(email)` que leva a `/conta`, botão de configurações de 44 px, `Link` nos links de texto, `Tooltip` com o nome nos botões de ícone (configurações, tema)
- [X] T018 [US3] Mover "Sair" para `features/account/components/AccountSection` (ícone de sair fica na US5); remover o botão do cabeçalho; atualizar `app/AppLayout.test.tsx`
- [X] T019 [US3] Até 560 px (`@media (max-width: 560px)`): esconder os links, mostrar botão de menu que abre `Menu` como folha embaixo com os mesmos destinos (inclui contador do x1 com largura reservada)
- [X] T020 [US3] Atualizar `e2e/sem-saltos.spec.ts` para o cabeçalho novo e conferir visitante (sem círculo, acesso a entrar)
- [X] T021 [US3] Abrir PR 3 `feat(web): rework the header with the account circle and menu sheet`

## Phase 5: User Story 4 — Calendário (P2, PR 4)

- [X] T022 [US4] Decidir e registrar em `research.md` D5 o ponto de quebra (599 do código vs 560/480/860 do artefato) antes de editar CSS
- [X] T023 [P] [US4] `features/library/components/SourceTabs/SourceTabs.module.css` e `SourceBar`: linha única com `overflow-x: auto`, `scrollbar-width: none`, última aba cortada, botão de data fixo à direita; teste de CSS com `readCss`
- [X] T024 [P] [US4] `features/library/components/DayCell` e `Calendar/Calendar.module.css`: abaixo de 480 px (container query) mostrar "✓" e "◐" no lugar do texto, `aria-label` por extenso intacto
- [X] T025 [P] [US4] `features/library/components/LibraryLegend`: mesmos símbolos na legenda abaixo de 480 px
- [X] T026 [US4] Mesmo tratamento em `features/library/components/DayPicker` (x1); testes de `Calendar`, `DayCell`, `LibraryLegend` e axe
- [X] T027 [US4] E2E em `e2e/` do calendário em 390 px e computador, nos dois temas
- [X] T028 [US4] Abrir PR 4 `feat(web): make the calendar tabs and cells compact on small screens`

## Phase 6: User Story 5 — Demais telas (P2, PR 5)

- [X] T029 [P] [US5] `features/account/components/*` (LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, VerifyEmailForm, ChangeEmailForm, ChangePasswordForm, ConfirmEmailChange, ResendLink, DeleteAccountDialog, LogoutOthersButton, AccountSection) e `pages/confirm-email`: usar `Button`, `Link`, `Notice`, `Dialog` novos; ícone de sair no botão Sair
- [X] T030 [P] [US5] `features/stats/components/StatsView` conforme a aba Telas
- [X] T031 [P] [US5] `features/duel/components/*` (CreateForm, DuelList, DuelScreen, JoinByCode, ShareLinkPanel, ResultPanel, RulesDialog, ForfeitConfirm) conforme as telas do x1; `DuelBoard` só no que cerca o tabuleiro
- [X] T032 [P] [US5] `features/admin/components/SourcesAdmin/SourcesAdmin.tsx`: estilo novo e trocar o texto da linha 96 para não citar os cartões de "Hoje"; atualizar `SourcesAdmin.test.tsx`
- [X] T033 [P] [US5] `shared/components/ErrorState`, `app/RouteError.tsx`, `shared/components/LoadingState`, `NotFoundPage`, `RequiresConnection` e `pages/status` (`StatusPage`): estilo novo, um `h1` por página
- [X] T034 [P] [US5] `features/settings` (diálogo de configurações), `features/import` (`ImportOffer`) e avisos de `features/offline`: `Dialog`, `Button`, `Notice` e `Link` novos, sem mudar comportamento
- [X] T035 [US5] Trocar os textos de link das telas alteradas pelo `Link` (`shared/components/Link/Link`) e conferir com `grep` que nenhum `<a>` de texto ficou fora, exceto na landing; conferir com `grep` que o CSS alterado não tem cor hexadecimal fora de `shared/themes/` (SC-002)
- [X] T036 [US5] Conferência tela a tela com Playwright contra `docs/mockups/design-system.html` (claro/escuro; 390/768/1280) e registrar divergências resolvidas em `research.md`
- [X] T037 [US5] Rodar axe nas telas alteradas e `e2e/sem-saltos.spec.ts`; comparar landing e tabuleiro com as capturas de T002 e confirmar que não há diferença (FR-019, SC-007)
- [X] T038 [US5] Abrir PR 5 `feat(web): apply the design system to the remaining screens`

## Phase 7: User Story 6 — Arrastar para ordenar (P3, PR 6)

- [X] T039 [US6] Confirmar no Context7 e instalar com versão fixa `@dnd-kit/react`, `@dnd-kit/dom` e `@dnd-kit/helpers` em `apps/web/package.json` (React 19 nos `peerDependencies`); rodar `npm run check:deps`, `build` e registrar o peso adicionado em `research.md` D1; se pesar no pacote principal, carregar `SourcesAdmin` por `lazy`
- [X] T040 [P] [US6] Função pura `features/admin/helpers/sortable-announcements.ts` + teste: textos de instrução e de anúncio em português ("Arrastar O Globo", pegou, moveu para a posição N de M, soltou, cancelou)
- [X] T041 [US6] `features/admin/components/SourcesAdmin`: `DragDropProvider` com `PointerSensor` iniciado só pela alça (sem `Accessibility` nem `KeyboardSensor` do dnd-kit: o teclado é código próprio, ver research.md D1), `onDragEnd` com `move` de `@dnd-kit/helpers` e restauração da ordem quando `event.canceled`; teste de teclado em jsdom (Espaço pega, seta move, Espaço solta, Esc cancela, anúncio na região viva)
- [X] T042 [US6] `SortableRow` e `DragHandle`, cada um em pasta própria com `.module.css` e teste (`features/admin/components/SortableRow/SortableRow.tsx`, `features/admin/components/DragHandle/DragHandle.tsx`): `useSortable` com `handleRef`, alça de seis pontos 44 px com `touch-action: none`, `aria-label="Arrastar <fonte>"`, texto fixo de instruções ligado por `aria-describedby`; linha levantada com contorno `--edge` e sombra suave; faixa amarela de 4 px no destino; remover as setas
- [X] T043 [US6] Garantir que o `PUT /api/admin/sources` e as regras da 060 (todas as fontes, ao menos uma visível, sem mudança não grava) seguem iguais; atualizar `SourcesAdmin.test.tsx`
- [X] T044 [US6] E2E em `e2e/` da Administração: reordenar com mouse, com teclado (mover uma fonte de uma ponta à outra em no máximo N+2 teclas, SC-004) e com toque emulado sem a página rolar (SC-005); recarregar e conferir a ordem
- [X] T045 [US6] Abrir PR 6 `feat(web): reorder sources by dragging in the admin screen`

## Phase 8: Polish

- [X] T046 Atualizar `CLAUDE.md` ("Where things stand") com a feature 062 e remover do brief os pontos em aberto resolvidos
- [X] T047 Rodar `npm run check:deps`, `lint`, `typecheck`, `test`, `test:e2e` e fechar o `quickstart.md` fatia a fatia (as seis fatias foram num só PR, #159: T007, T015, T021, T028, T038 e T045 ficam cumpridas por ele)

## Dependencies & Order

- Fatias na ordem: PR 1 → 2 → 3 → 4 → 5 → 6. Cada PR parte de `main` já com o anterior mesclado.
- PR 3, 4 e 5 dependem do 2; PR 6 depende do 5 (usa `SourcesAdmin`).
- Dentro de cada fatia, tarefas `[P]` tocam arquivos diferentes e rodam juntas.

## Parallel Example (PR 2)

T008, T009, T010, T011, T012 e T013 ao mesmo tempo; T014 e T015 depois.

## Implementation Strategy

MVP = PR 1 e PR 2 (tokens e componentes): já dão base visual consistente. Depois entregar PR 3 a PR 6 incrementalmente, cada um mergeável sozinho.
