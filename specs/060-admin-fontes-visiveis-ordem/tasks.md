# Tasks: Painel de admin para esconder e reordenar fontes

**Input**: Design documents from `/specs/060-admin-fontes-visiveis-ordem/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: incluídos: a constituição (II e VII) e o `CLAUDE.md` exigem testes; a regra pura e as rotas têm teste escrito antes da implementação.

**Organization**: tarefas agrupadas por história de usuário. Todas as quatro são independentes depois da Fase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 esconder, US2 reordenar, US3 só admin acessa, US4 designar admin
- Caminhos relativos à raiz do repositório

## Phase 1: Setup

- [x] T001 Confirmar a base limpa: `npm ci`, `npm run typecheck`, `npm test` e `npm run check:deps` passam antes de começar (sem alteração de arquivo)

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: contratos compartilhados, banco, papel de admin e a leitura da configuração.

- [x] T046 Consultar via Context7 (constitution, Fluxo de Desenvolvimento) Drizzle v atual: índices únicos, `references(..., { onDelete: 'set null' })`, `db.transaction`, `delete`/`insert` em transação; registrar a conclusão em `research.md` (R11); bloqueia T005, T006 e T010
- [x] T002 [P] Criar `packages/shared/src/sources/schema.ts`: `sourcesResponseSchema` (`{ sources: PuzzleSourceId[] }`, tolerante), `adminSourceSchema` (`{ id, visible: boolean, position: inteiro >= 0 }`), `adminSourcesResponseSchema`, `updateSourcesRequestSchema` (estrito: `{ sources: [{ id, visible }] }`, cada fonte conhecida exatamente uma vez) e a função pura `resolveVisibleSources(rows)` (ids visíveis por `position`; fonte do código sem linha entra visível no fim, na ordem de `puzzleSourceIdSchema.options`; linha de fonte desconhecida é ignorada); exportar em `packages/shared/src/index.ts`
- [x] T003 [P] Teste unitário de T002 em `packages/shared/src/sources/schema.test.ts`: sem linhas devolve todas na ordem padrão; ordem por `position`; escondida some; fonte nova sem linha vai ao fim; id desconhecido ignorado; pedido com fonte repetida, faltando ou desconhecida é recusado
- [x] T004 [P] Em `packages/shared/src/auth/schema.ts`, `userSchema` ganha `isAdmin: z.boolean().default(false)` (lido como `false` se faltar, para API anterior); atualizar `packages/shared/src/auth/schema.test.ts` e `apps/web/src/test/fixtures.ts`
- [x] T005 Em `apps/api/src/platform/db/schema.ts`: coluna `users.isAdmin` (`is_admin`, boolean, not null, default false) e tabelas `sourceSettings` (`source_setting_id` uuid PK; `source_id` text not null com `source_settings_source_check IN ('oglobo','cruzadaonline','cruzadasbrasil','clube')` e índice único `source_settings_source_unique`; `visible` boolean not null default true; `position` integer not null `>= 0` com índice único `source_settings_position_unique`; `...timestamps`) e `sourceSettingChanges` (`source_setting_change_id` uuid PK; `user_id` uuid FK → users `ON DELETE SET NULL`; `before` e `after` jsonb not null; `...timestamps`)
- [x] T006 Gerar a migração com `npm run db:generate -w @cruzadinha/api -- --name admin-fontes` e acrescentar a mão os gatilhos `source_settings_set_updated_at` e `source_setting_changes_set_updated_at` (como nas demais tabelas; `conventions.int.test.ts` cobra); conferir com `npm run test:int -w @cruzadinha/api`
- [x] T007 Em `apps/api/src/modules/identity/sessions/`: `AuthUser` ganha `isAdmin`, a consulta de `sessions.repository.ts` seleciona `users.is_admin`, `authResponse` em `sessions.routes.ts` e a documentação em `sessions.schemas.ts` incluem `isAdmin`; ajustar testes de sessions e de `identity` que comparam o usuário
- [x] T008 (Fastify já confirmado, ver R11: `callNotFound` em `onRequest`, corpo ainda não lido) Em `apps/api/src/modules/identity/sessions/session.plugin.ts`, criar `createRequireAdmin(auth, config, clock)`: um hook `onRequest` que resolve a sessão (apagando cookie inválido como hoje) e, se não houver usuário com `isAdmin`, chama `reply.callNotFound()`; nunca `401` nem `403`; exportar tipo `RequireAdmin` e função em `modules/identity/index.ts`
- [x] T009 [P] Teste de T008 em `apps/api/src/modules/identity/sessions/session.plugin.test.ts`: sem cookie, cookie inválido e conta comum recebem o mesmo corpo e status de `GET /api/rota-que-nao-existe`; admin passa; corpo JSON inválido (`{`) em rota protegida de teste também dá `404`, não `400`
- [x] T010 Criar `apps/api/src/modules/sources/`: `sources.rules.ts` (`decideSources(current, request)` pura: valida que cada fonte conhecida aparece uma vez, devolve `no-visible-source` se nenhuma visível, `unchanged` se igual ao estado atual, senão as linhas novas com `position` igual ao índice), `sources.repository.ts` (`listSourceRows(db)`, `replaceSourceRows(tx, rows)` apagando e reinserindo as linhas na transação, `insertChange(tx, { userId, before, after })`), `sources.service.ts` (`listVisible()`, `listAll()`, `isVisible(source)`, `save(userId, request)` numa transação), `sources.schemas.ts` (documentação das 3 rotas, `404` documentado), e `index.ts` exportando só `createSourcesService`, `sourcesRoutes` e tipos (`SourcesService` com `isVisible`, injetado nos services de puzzles, library e duels; nenhuma rota recebe `db`, R14); `listAll` devolve para fonte sem linha `visible: true` e posição depois das gravadas
- [x] T011 [P] Teste unitário de `decideSources` em `apps/api/src/modules/sources/sources.rules.test.ts`: ordem vira posição, última visível recusada (`no-visible-source`), lista incompleta ou repetida recusada, igual ao atual = `unchanged`
- [x] T012 Implementar `GET /api/sources` (público, sem sessão, `Cache-Control: no-cache`, resposta `sourcesResponseSchema`) em `apps/api/src/modules/sources/sources.routes.ts` e registrar `sourcesService` e a rota em `apps/api/src/app.ts`
- [x] T013 Nos services de `apps/api/src/modules/puzzles/` (`getByDate`) e `apps/api/src/modules/library/` (`list`/`listPublic`), receber `sourcesService` e recusar fonte escondida com erro de domínio que as rotas (`puzzles.routes.ts`, `library.routes.ts`) traduzem em `400 invalid-input` e `fields: ['source']` (mesma resposta de fonte fora do enum); `GET /api/puzzles/:id` fica como está; ligar `sourcesService` aos dois services em `apps/api/src/app.ts`; atualizar a documentação em `puzzles.schemas.ts` e `library.schemas.ts` e os testes dos dois módulos
- [x] T014 Em `apps/api/src/modules/duels/duels.service.ts` (com `sourcesService.isVisible` injetado), localizar onde o fluxo de `create` (rota `POST /api/duels/create` em `duels.routes.ts`, que já responde `puzzle-unavailable` com `404`) obtém a fonte do puzzle e recusar puzzle de fonte escondida com a resposta de puzzle inexistente já usada por `create`; só `create`, nunca `lookup`/`start`/`state` de duelo existente; teste em `apps/api/src/modules/duels/duels.service.test.ts`
- [x] T043 Apoio de teste para conta admin: em `apps/api/src/test/app.ts`, `signUpForTest` ganha a opção `isAdmin` (grava `users.is_admin` depois de criar a conta); em `apps/web/e2e/support.ts` (e `conta-por-email.support.ts` se for ele quem cria contas), uma função que cria a conta já como admin, usando o banco local do e2e; depende de T005
- [x] T047 Consultar via Context7 TanStack Query (`staleTime`, `refetchOnWindowFocus`, `ensureQueryData`, `invalidateQueries`) e React Router (`loader`) nas versões do projeto; registrar em `research.md` (R11); bloqueia T015 e T028
- [x] T015 [P] Site: cliente público em `apps/web/src/shared/services/api/sources/sources.ts` (`fetchSources`, validado por `sourcesResponseSchema`) com teste ao lado, e o hook `apps/web/src/shared/hooks/useVisibleSources/useVisibleSources.ts` (consulta com `staleTime` de 30 s e `refetchOnWindowFocus`; expõe `isPending`, `sources`, `defaultSource` = primeira; enquanto `isPending` não há lista e os consumidores esperam; só erro ou `404` devolve todas as fontes de `puzzleSourceIdSchema.options`) e a versão sem hook `fetchVisibleSources(queryClient)` (R12) com teste ao lado, que inclui: com tempo simulado, a lista é pedida de novo depois de 30 s (FR-015), enquanto carrega expõe `isPending` sem lista, erro ou `404` cai em todas as fontes e `fetchVisibleSources` usa a mesma chave e o mesmo fallback

**Checkpoint**: banco migrado, `/api/sources` no ar, fonte escondida recusada na API, hook pronto.

---

## Phase 3: User Story 1 - Admin esconde uma fonte (Priority: P1) 🎯 MVP

**Goal**: o admin marca uma fonte como escondida e ela some do site; reativa e volta; a última visível não pode ser escondida.

**Independent Test**: como admin, esconder uma fonte e abrir o site como visitante: sem aba, sem cartão em "Hoje", sem opção em x1/estatísticas/configurações; `GET /api/library?source=<id>` dá `400`; reativar traz tudo de volta.

### Tests for User Story 1

- [x] T016 [P] [US1] Teste de integração em `apps/api/src/test/admin-sources-hide.int.test.ts`: `PUT /api/admin/sources` como admin esconde uma fonte; `GET /api/sources` deixa de listá-la; `GET /api/library?source=` e `GET /api/puzzles?source=&date=` dão `400 invalid-input`; `GET /api/puzzles/:id` de puzzle dessa fonte continua `200` para visitante e conta, sem sessão e sem progresso prévio (R6); reativar restaura; esconder todas dá `400 no-visible-source` e nada muda; dois `PUT` seguidos com estados diferentes: vale o último, sem erro, e o registro tem duas linhas; salvamento sem mudança não cria linha em `source_setting_changes`
- [x] T017 [P] [US1] Teste de integração do registro em `apps/api/src/test/admin-sources-log.int.test.ts`: cada salvamento que muda grava `before` e `after` com o `user_id` do admin; apagar a conta do admin deixa `user_id` nulo e mantém a linha; `auth cleanup` não apaga `source_settings` nem `source_setting_changes`
- [x] T018 [P] [US1] Testes do site: `apps/web/src/features/library/hooks/useSourceLibraries.test.tsx` (abas e cartões só das visíveis, nada enquanto `isPending`), `apps/web/src/features/library/components/DayPicker/DayPicker.test.tsx`, `apps/web/src/features/stats/components/StatsView/StatsView.test.tsx` (linhas só das visíveis) e `apps/web/src/features/settings/components/SettingsDialog/SettingsDialog.test.tsx` ("cruzada padrão" só com as visíveis); cada um simula `GET /api/sources` com uma fonte a menos e confirma que, enquanto a lista carrega, nenhuma aba é desenhada nem `GET /api/library` é pedido para fonte alguma

- [x] T044 [P] [US1] Teste de integração em `apps/api/src/test/collect-hidden-sources.int.test.ts`: com uma fonte escondida, `puzzles collect` continua coletando e salvando as cruzadas dela (FR-014)
- [x] T045 [P] [US1] Teste de integração em `apps/api/src/test/hidden-source-data.int.test.ts`: com a fonte escondida, o progresso salvo continua lido por `GET /api/progress`, `POST /api/progress/import` aceita itens dela, `GET /api/stats` continua contando as concluídas e um duelo já criado com ela continua em `state`, e um convite ainda não aberto (duelo `open`) continua aceitando `lookup`, `start`, jogo e `finish` pelo convidado (FR-013, edge cases)

### Implementation for User Story 1

- [x] T019 [US1] Implementar `GET /api/admin/sources` e `PUT /api/admin/sources` em `apps/api/src/modules/sources/sources.routes.ts` com `onRequest: requireAdmin`: corpo validado por `updateSourcesRequestSchema.safeParse` (`400 invalid-input`, `fields: ['sources']`), `decideSources`, transação com `replaceSourceRows` e `insertChange` só se mudou, resposta `adminSourcesResponseSchema`; `400 no-visible-source` para nenhuma visível; passar `requireAdmin` às rotas em `apps/api/src/app.ts`
- [x] T020 [US1] Em `apps/web/src/features/library/hooks/useSourceLibraries.ts`, trocar `puzzleSourceIdSchema.options` por `useVisibleSources().sources` (abas e cartões de "Hoje" seguem a lista); em `apps/web/src/features/library/helpers/today-cards.ts` e na página do calendário, nada de fonte fora da lista; e criar em `apps/web/src/features/library/services/source-choice.ts` a função pura `resolveSource(choice, visible)` (escolha ausente ou escondida → primeira visível; é a única regra de "fonte que sumiu", com teste ao lado); a fonte aberta por padrão usa `resolveSource`
- [x] T021 [P] [US1] `apps/web/src/features/library/components/DayPicker/DayPicker.tsx`: fonte inicial e seletor só com as visíveis
- [x] T022 [P] [US1] `apps/web/src/features/stats/components/StatsView/StatsView.tsx`: mostrar só as linhas das fontes visíveis (a API e `computeStats` ficam como estão)
- [x] T023 [P] [US1] `apps/web/src/features/settings/components/SettingsDialog/SettingsDialog.tsx`: `SOURCE_OPTIONS` só com as visíveis; `defaultSource` guardado e escondido vale como a primeira visível, sem aviso e sem apagar a escolha (ela volta a valer se a fonte reaparecer) (a regra é `resolveSource` de T020; o padrão do schema em `packages/shared/src/settings/schema.ts` continua a primeira fonte do código e o site resolve a visível; `downloadToday` fica fora de escopo: sem UI desde a feature 051)
- [x] T024 [US1] Cliente e página de edição: `apps/web/src/shared/services/api/sources/admin-sources.ts` (`fetchAdminSources`, `saveAdminSources`) e `apps/web/src/features/admin/` (`components/SourcesAdmin/SourcesAdmin.tsx` + `.module.css` + teste: lista todas as fontes com caixa "Visível" por fonte, botão Salvar, `Notice` de erro e de sucesso, mensagem clara para `no-visible-source`, nada desloca o layout ao salvar; `hooks/useAdminSources.ts`; `index.ts` exportando só `SourcesAdmin`); ao salvar invalidar a consulta de `useVisibleSources`

**Checkpoint**: esconder e reativar funciona de ponta a ponta pela API e pelo componente de edição.

---

## Phase 4: User Story 2 - Admin reordena as abas (Priority: P1)

**Goal**: o admin define a ordem das fontes; calendário e "Hoje" a seguem e a primeira visível é a padrão.

**Independent Test**: mudar a ordem, recarregar o calendário como visitante: abas na nova ordem, primeira aba aberta por padrão; sem configuração, ordem de hoje.

### Tests for User Story 2

- [x] T025 [P] [US2] Em `apps/api/src/test/admin-sources-order.int.test.ts`: `PUT` com a ordem trocada (inclusive trocar duas fontes de lugar, que exercita os índices únicos) é refletido em `GET /api/sources` e `GET /api/admin/sources`; sem linhas gravadas, `GET /api/sources` devolve a ordem padrão com as quatro
- [x] T026 [P] [US2] Em `apps/web/src/pages/library/LibraryPage.test.tsx`: abas na ordem da API e a primeira visível aberta por padrão quando não há escolha nem `defaultSource` guardado; em `apps/web/src/features/admin/components/SourcesAdmin/SourcesAdmin.test.tsx`: botões "Subir" e "Descer" mudam a ordem, o primeiro não sobe, o último não desce

### Implementation for User Story 2

- [x] T027 [US2] `apps/web/src/features/admin/components/SourcesAdmin/SourcesAdmin.tsx`: botões "Subir" e "Descer" (ícone com `aria-label` por fonte, acessíveis por teclado, anunciar a nova posição em região `aria-live`), ordem enviada no `PUT` como a ordem do vetor
- [x] T028 [US2] `apps/web/src/features/library/services/source-choice.ts`: `DEFAULT_SOURCE` deixa de ser a primeira de `puzzleSourceIdSchema.options`; os loaders obtêm a lista com `fetchVisibleSources(queryClient)` (R12, sem hook) e aplicam `resolveSource` (T020). `playTodayLoader` (`/jogar`) e `directPlayLoader` ("Ir direto ao jogo") a usam sempre depois de `whenServerReady`; o hook só serve a componentes. Testes: `directToGame` ligado com `defaultSource` escondido abre a primeira visível e a configuração guardada fica igual; o loader não pede `/api/sources` antes de o servidor estar pronto

**Checkpoint**: ordem e visibilidade editáveis; público vê a nova ordem em até 1 minuto.

---

## Phase 5: User Story 3 - Só admin acessa a página (Priority: P1)

**Goal**: `/admin` e as rotas existem só para admin; os demais recebem o `404` de qualquer endereço inexistente.

**Independent Test**: como visitante e como conta comum, abrir `/admin` e chamar `GET`/`PUT /api/admin/sources`: página "não encontrada" e `404` idêntico ao de rota inexistente, sem link no site; retirar o admin tem efeito no pedido seguinte.

### Tests for User Story 3

- [x] T029 [P] [US3] Em `apps/api/src/test/admin-sources-access.int.test.ts`: visitante, cookie inválido e conta comum, em `GET` e em `PUT` (inclusive com corpo `{` e com `content-type` errado), recebem status e corpo iguais aos de `GET /api/rota-inexistente`; nada muda no banco; conta que deixa de ser admin recebe `404` no pedido seguinte com a mesma sessão; `/api/auth/me` de admin traz `isAdmin: true`, de conta comum `false`; nenhuma resposta `/api/*` (inclusive `GET /api/admin/sources` e `/api/sources`) traz o conteúdo de `source_setting_changes` (FR-016)
- [x] T030 [P] [US3] `apps/web/src/pages/admin/AdminPage.test.tsx`: visitante e conta comum veem a mesma página de `NotFoundPage`; admin vê `SourcesAdmin`; sem rede (viewer vindo de `readLastUser()`, sem `isAdmin`) vê `RequiresConnection`, nunca `NotFoundPage`; `apps/web/src/features/account/components/AccountSection/AccountSection.test.tsx`: link "Administração" só para admin e nunca no cabeçalho (`apps/web/src/app/AppLayout.test.tsx`); `vitest-axe` sem violações em `AdminPage` e `SourcesAdmin`, e `SourcesAdmin` operável só pelo teclado (FR-017)
- [x] T031 [P] [US3] `apps/web/e2e/admin.spec.ts`: admin esconde uma fonte, outra janela anônima não a vê, reativa; conta comum em `/admin` vê a página "não encontrada"; mede que salvar não desloca o layout e que `/admin` sai com `noindex`, como `apps/web/e2e/sem-saltos.spec.ts` (FR-017)

### Implementation for User Story 3

- [x] T032 [US3] Criar `apps/web/src/pages/admin/AdminPage.tsx` (um `h1`, compõe `features/admin`; se o viewer não é admin, renderiza `NotFoundPage` de `apps/web/src/shared/components/NotFoundPage/NotFoundPage`; sem rede mostra `RequiresConnection` ANTES de decidir o papel; `NotFoundPage` só com `isAdmin` confirmado pela API, R13) e a rota `{ path: '/admin', element: <AdminPage /> }` no grupo com `viewerLoader` em `apps/web/src/app/router.tsx`
- [x] T033 [US3] `apps/web/src/features/account/components/AccountSection/AccountSection.tsx`: link "Administração" para `/admin` quando `user.isAdmin`; sem rede, o usuário vem de `readLastUser()` sem `isAdmin`, então conta como não admin
- [x] T034 [US3] `.dependency-cruiser.cjs`: `features/admin` e `pages/admin` seguem a regra `web-account-status-only-session`: incluir `admin` no `from` (`features/(account|status|admin)/`) e na lista do `to` da regra (`features/(guest|library|settings|game|duel|account|status|admin)/`), de modo que `admin` importa só `session`; nenhuma outra feature importa `admin` e `admin` fica fora de `FEATURE_ORDER` (como `account`); `pages/admin` compõe só `features/admin`; `npm run check:deps` passa

**Checkpoint**: ninguém além do admin enxerga ou usa a administração.

---

## Phase 6: User Story 4 - Designar quem é admin (Priority: P2)

**Goal**: o dono promove, retira e cria admins pela CLI do autor.

**Independent Test**: promover uma conta e ver `/api/auth/me` com `isAdmin: true` no pedido seguinte; retirar e ver o acesso sumir; e-mail sem conta falha sem criar nada.

### Tests for User Story 4

- [x] T035 [P] [US4] `apps/api/src/cli/run-cli.test.ts` (e/ou teste de integração): `users set-admin --email e` promove (exit 0), `--remove` retira, e-mail sem conta dá exit 1 com mensagem clara e não cria conta, e-mail inválido dá exit 2; `users create --email e --admin` cria já como admin; sem `--admin` a conta nasce comum; nenhuma rota pública altera `is_admin` (cadastro, `change-email`, `PUT /api/settings` não aceitam o campo)

### Implementation for User Story 4

- [x] T036 [US4] `apps/api/src/modules/identity/registration/create-account.ts`: opção `isAdmin` (padrão `false`); `apps/api/src/modules/identity/` : função `setAdmin(db, email, isAdmin)` exportada por `index.ts` que devolve `not-found` quando não há conta
- [x] T037 [US4] `apps/api/src/cli/run-cli.ts`: subcomando `users set-admin --email <email> [--remove]`, flag `--admin` em `users create`, texto de ajuda atualizado (exit 0, 1 sem conta, 2 entrada inválida); sem senha em argumento

**Checkpoint**: fluxo completo, do primeiro admin à retirada do acesso.

---

## Phase 7: Polish & Cross-Cutting

- [x] T038 [P] Corrigir `docs/data-definitions/DDE-008-admin-fontes.md` (`before`/`after` como documento JSON `jsonb`, nota de que `isAdmin` aparece na resposta de `/api/auth/me` só para a própria conta) e criar `docs/entity-relationship-diagrams/ERD-008-admin-fontes.md` com a skill `entity-relationship-diagram`; acrescentar `is_admin` ao `User` em `docs/data-definitions/DDE-001-banco-auth-convites.md` e `ERD-001`; linkar o ERD na DDE-008
- [x] T039 [P] Atualizar `CLAUDE.md` (feature 060: `modules/sources`, `GET /api/sources`, rotas `/api/admin/sources`, `users.is_admin`, `callNotFound` em `onRequest`, `features/admin`, `useVisibleSources`, landing estática, `GET /api/puzzles/:id` sem bloqueio) e `docs/deploy.md` (comandos da CLI `users set-admin`)
- [x] T040 [P] Teste de documentação: confirmar que `apps/api/src/platform/docs/docs.test.ts` passa com as 3 rotas novas (todas com `schema` e resposta `404`)
- [x] T041 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int`, `npm run build` e `npm run test:e2e -w @cruzadinha/web`; corrigir o que falhar
- [x] T042 Validar o `quickstart.md` à mão (passos 1 a 9) com o servidor local e anotar o resultado em `specs/060-admin-fontes-visiveis-ordem/checklists/validacao.md`, incluindo o tempo medido do login até esconder uma fonte (SC-001, meta de 30 s)

---

## Dependencies & Execution Order

- **Fase 1 → Fase 2**: Fase 2 bloqueia todas as histórias.
- Dentro da Fase 2: T046 antes de T005 e T010; T047 antes de T015; T002 → T003; T005 → T006 → T007 → T008 → T009; T010 depende de T002, T005; T012 depende de T010; T013 e T014 dependem de T010 (`sourcesService.isVisible`); T015 depende de T002 e T012; T043 depende de T005 e T007, e T016, T029 e T031 dependem de T043.
- **US1 (Fase 3)**: depende da Fase 2. **US2 (Fase 4)**: depende de T019 e T024 (mesma página e rota) e, para T028, de T015 e T020 (`fetchVisibleSources`, `resolveSource`). **US3 (Fase 5)**: depende de T024 (a página) para a composição; os testes de API (T029) só dependem da Fase 2 e T019. **US4 (Fase 6)**: depende de T005 e T007; independe das demais, então pode rodar em paralelo com a US1.
- **Polish (Fase 7)**: depois das histórias desejadas.

### Parallel Opportunities

- Fase 2: T002, T004 e T015 (depois de T002) em paralelo; T003 e T011 em paralelo; T043 depois de T005 (T016, T029 e o e2e dependem dele).
- US1: T016, T017, T018, T044 e T045 juntos (cada um em arquivo próprio); T021, T022 e T023 juntos.
- US1 e US4 podem ser feitas por pessoas diferentes ao mesmo tempo.
- Polish: T038, T039 e T040 juntos.

## Implementation Strategy

- **MVP**: Fase 1, Fase 2 e US1 mais a parte de acesso já feita em T008/T019 (esconder fonte funciona e só admin chama). Para ter um admin de verdade, fazer T036 e T037 junto (US4 é pequena).
- **Entrega incremental**: Fase 2 → US1 + US4 (esconder e designar) → US2 (ordem) → US3 (página, link e e2e) → Polish.
- **Compatibilidade**: nada remove campo nem rota; a ordem de deploy é livre (API nova com site antigo mostra todas as fontes pelas rotas antigas; site novo com API antiga cai em todas as fontes e a página `/admin` diz que está indisponível).
