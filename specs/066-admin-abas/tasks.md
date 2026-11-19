# Tasks: Administração em abas seguindo o design system

**Input**: Design documents from `specs/066-admin-abas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos. O issue #179 exige os testes de `AdminPage`, `SourcesAdmin` e `GeneratedSourcesAdmin` atualizados e sem violações do axe; a constituição (II, VII) exige testes unitários sem rede e integração com Postgres para a API.

**Organization**: por história da spec (US1 abas, US2 aba Fontes, US3 configuração da fonte gerada, US4 cruzada de hoje e descarte). Uma release só: o campo novo da API é opcional nos dois sentidos (research R7, R11).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 a US4 da spec

Caminhos do site relativos a `apps/web/src/` quando começam por `shared/`, `features/` ou `pages/`.

---

## Phase 1: Setup (contrato visual)

**Purpose**: o mockup é o contrato (FR-001); entra antes de qualquer código.

- [X] T001 Aplicar em `docs/mockups/design-system.html` exatamente o diff do issue #179 (já presente no working tree; conferir com `git diff docs/mockups/design-system.html` contra o bloco `diff` de `gh issue view 179`) e commitar sozinho: `docs: add tabbed admin screens to the design system mockup`
- [X] T002 Em `docs/mockups/design-system.html`, trocar `'Média'` por `'Médio'` na lista de dificuldades de `gen` e `<dd>Média</dd>` por `<dd>Médio</dd>` no resumo (Clarifications da spec, research R8); commit `docs: use the shared difficulty label in the admin mockup`

---

## Phase 2: Foundational (componente de abas compartilhado)

**Purpose**: `admin` não pode importar `features/library` (`check:deps`); as abas vão para `shared` antes da US1 (research R1).

- [X] T003 [P] Teste `shared/components/Tabs/Tabs.test.tsx`: renderiza `tablist` com `aria-label`, uma `tab` por item com `name` e `caption`, `aria-selected` e `tabIndex` 0 só na escolhida, `id = tabId(id)` e `aria-controls = panelId(id)`; ArrowRight/ArrowLeft com volta, Home e End chamam `onChange` e movem o foco; clique chama `onChange`; ao montar, chama `scrollIntoView({ block: 'nearest', inline: 'nearest' })` na aba escolhida (simular o método no jsdom); sem violações do axe (`expectNoA11yViolations` de `src/test/axe`)
- [X] T004 Criar `shared/components/Tabs/Tabs.tsx` e `Tabs.module.css`: `Tabs<T extends string>({ label, tabs: readonly { id: T; name: string; caption?: ReactNode }[], value, onChange, tabId: (id: T) => string, panelId: (id: T) => string })`, com o teclado e o `refs` movidos de `features/library/components/SourceTabs/SourceTabs.tsx` sem mudança de comportamento, mais um efeito só na montagem que rola a aba escolhida para a vista (`refs.current.get(value)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })`, edge case "muitas fontes geradas" da spec); CSS movido de `SourceTabs.module.css` (mantendo o `{' '}` entre o nome e a legenda, para o nome acessível continuar "Cruzadas Brasil 2 concluídas"; classe `.count` vira `.caption`, inclusive o `@media (max-width: 599px)`, a rolagem lateral sem barra e o `padding-bottom`/`margin-bottom` de 2 px)
- [X] T005 Reescrever `features/library/components/SourceTabs/SourceTabs.tsx` como invólucro de `Tabs` (`label="Fonte do calendário"`, `caption` = `completedLabel(count)` ou nada quando `count === null`, `tabId = source => \`source-tab-${source}\``, `panelId = () => 'source-panel'`), mantendo os tipos exportados `SourceTab` e `SourceTabsProps` (usados por `SourceBar`), apagar `SourceTabs.module.css`; `SourceTabs.test.tsx`, `SourceBar.test.tsx` e `Calendar` continuam passando sem mudança de expectativa (SC-007)
- [X] T006 Em `shared/components/button-states.test.ts`, trocar as duas entradas `'SourceTabs.module.css'` (`['SourceTabs.module.css', '.tab']` e a chave `'SourceTabs.module.css .tab'`) por `'Tabs.module.css'`; o teste lê o CSS por `readCss` de `src/test/css-file.ts`, que acha o arquivo pelo nome
- [X] T007 Rodar `npm run check:deps` e `npx vitest run src/shared/components src/features/library` em `apps/web`

**Checkpoint**: calendário igual; `Tabs` disponível para o admin.

---

## Phase 3: User Story 1 - Abas na Administração (Priority: P1) 🎯 MVP

**Goal**: `/admin` com `h1`, abas "Fontes" e uma por fonte gerada, aba em `?aba=`, rascunhos preservados.

**Independent Test**: admin abre `/admin`, troca abas por mouse e teclado, confere `?aba=`, recarrega `/admin?aba=casa` e `/admin?aba=xyz` (quickstart 1 a 4).

### Tests for User Story 1

- [ ] T008 [P] [US1] Teste `features/admin/hooks/useAdminTab/useAdminTab.test.ts` para `resolveAdminTab(param: string | null, generatedIds: readonly GeneratedSourceId[])`: `null` → `'fontes'`; `'fontes'` → `'fontes'`; `'casa'` com `['casa']` → `'casa'`; `'casa'` com `[]` → `'fontes'`; `'xyz'` → `'fontes'`
- [ ] T009 [P] [US1] Teste `features/admin/components/AdminTabs/AdminTabs.test.tsx` (padrão de `renderRoutes`/`mockApi` de `pages/admin/AdminPage.test.tsx`): abas "Fontes" (legenda "ordem e visibilidade") e "Casa" (legenda "fonte gerada") em `tablist` "Seções da administração"; "Fontes" escolhida em `/admin`; `/admin?aba=casa` escolhe "Casa"; `/admin?aba=xyz` escolhe "Fontes"; clicar "Casa" deixa `router.state.location.search === '?aba=casa'` e `router.state.historyAction === 'REPLACE'` (`router` devolvido por `renderRoutes` de `src/test/render.tsx`); painel inativo tem `hidden`; desmarcar uma fonte em "Fontes", ir a "Casa", apertar "Aumentar a grade", voltar a "Fontes": a caixa continua desmarcada e "Salvar" ligado; voltar a "Casa": `12 × 12` continua; com `GET /api/admin/generated` em 500 e endereço `/admin?aba=casa`, só a aba "Fontes", escolhida, e o `ErrorState` "Não foi possível carregar as fontes geradas agora." com tentar de novo; enquanto a lista carrega, nenhuma aba aparece (`LoadingState`); sem violações do axe
- [ ] T010 [P] [US1] Atualizar `pages/admin/AdminPage.test.tsx`: admin vê um único `h1` "Administração" e o `tablist`; sai a expectativa do `h2` "Fontes geradas"; conta comum e visitante em `/admin?aba=casa` veem `NotFoundPage`; sem rede, `RequiresConnection`; axe sem violações

### Implementation for User Story 1

- [ ] T011 [US1] Criar `features/admin/hooks/useAdminTab/useAdminTab.ts`: `export type AdminTabId = 'fontes' | GeneratedSourceId`; `resolveAdminTab` puro (research R2); `useAdminTab(generatedIds)` com `useSearchParams` de `react-router` que devolve `[tab, setTab]`, e `setTab(id)` chama `setSearchParams(prev => { prev.set('aba', id); return prev }, { replace: true })`; um valor desconhecido não reescreve a URL
- [ ] T012 [US1] Em `features/admin/components/GeneratedSourcesAdmin/GeneratedSourcesAdmin.tsx`, renomear `SourceBlock` para `GeneratedSourcePanel` e exportá-lo (`{ view: GeneratedSourceView }`); apagar a função `GeneratedSourcesAdmin` (carregamento e erro passam para `AdminTabs`, T013); em `GeneratedSourcesAdmin.test.tsx`, trocar o render da lista por `GeneratedSourcePanel` com uma `view` fixa (mesmo `mockApi` para `PUT`/`POST`), mantendo as expectativas atuais até T021/T027
- [ ] T013 [US1] Criar `features/admin/components/AdminTabs/AdminTabs.tsx` e `AdminTabs.module.css`: usa `useGeneratedSources()`; pendente → `LoadingState screen="library" level={2}`; monta `Tabs` (`label="Seções da administração"`, itens `{ id: 'fontes', name: 'Fontes', caption: 'ordem e visibilidade' }` e, para cada `view`, `{ id: view.source, name: puzzleSourceNames[view.source], caption: 'fonte gerada' }`; `tabId = id => \`admin-tab-${id}\``, `panelId = id => \`admin-panel-${id}\``); um `div role="tabpanel"` por aba com `id`, `aria-labelledby` e `hidden={id !== tab}`, todos montados (FR-007): "Fontes" com `<SourcesAdmin />`, cada fonte com `<GeneratedSourcePanel view={view} />`; com a lista em erro, só "Fontes" e o `ErrorState level={2}` com `onRetry` abaixo do painel; CSS do painel colado às abas no padrão "tabs-attached" do mockup (borda `2px solid var(--edge)`, `border-radius` sem o canto de cima à esquerda, `background: var(--surface)`, `padding`, `display: grid; gap`)
- [ ] T014 [US1] Em `features/admin/index.ts`, exportar só `AdminTabs` (a página não usa mais `SourcesAdmin` nem `GeneratedSourcesAdmin`)
- [ ] T015 [US1] Em `pages/admin/AdminPage.tsx`, trocar os `h2` e os dois componentes por `<AdminTabs />` depois do `h1`; em `AdminPage.module.css`, `max-width: 688px` e manter `grid-template-columns: minmax(0, 1fr)`; apagar `.subtitle`
- [ ] T016 [US1] Rodar `npx vitest run src/features/admin src/pages/admin` e `npm run check:deps`

**Checkpoint**: tela com abas funcionando; as partes internas ainda com o visual antigo.

---

## Phase 4: User Story 2 - Aba Fontes no padrão do design system (Priority: P1)

**Goal**: título, texto, selos e botões com texto do mockup `adm(...)`.

**Independent Test**: aba "Fontes": selos, botões, salvar e descartar, arrasto e teclado como em 060 (quickstart 4).

### Tests for User Story 2

- [ ] T017 [P] [US2] Atualizar `features/admin/components/SourcesAdmin/SourcesAdmin.test.tsx`: `h2` "Fontes de cruzadas"; texto inicial exatamente "A ordem vale para as abas do calendário; a primeira fonte visível abre por padrão. Uma fonte escondida some das listas para todos, mas guarda tudo e pode voltar."; selo "Visível" numa fonte visível e "Escondida" numa escondida; `button` "Salvar" com texto visível, desligado sem alterações; "Descartar alterações" ausente sem alterações e presente (com texto) depois de desmarcar uma fonte, e volta ao salvo ao ser apertado; os testes de teclado, anúncios e `no-visible-source` continuam; axe sem violações

### Implementation for User Story 2

- [ ] T018 [US2] Em `features/admin/components/SourcesAdmin/SourcesAdmin.tsx`: `h2` "Fontes de cruzadas" e o texto inicial renderizados antes dos retornos de carregamento e erro (o painel tem título mesmo carregando); texto inicial do mockup (sem "cartões de Hoje" e sem "Arraste pela alça para reordenar."); no `label`, trocar o `VisuallyHidden` e o `span aria-hidden` pelo selo visível `<span className={styles.chip} data-state={row.visible ? 'ok' : 'none'}><span aria-hidden="true">✓ </span>Visível</span>` ou `...>Escondida</span>` (o `✓` só no visível); botões `Button variant="primary"` com texto "Salvar" e `Button variant="secondary"` com texto "Descartar alterações", sem SVG nem `aria-label`; manter a área de altura fixa do aviso (`.status`, mockup `min-height: 64px`) e todo o arrasto/teclado/anúncios
- [ ] T019 [US2] Em `features/admin/components/SourcesAdmin/SourcesAdmin.module.css`: classe `.chip` de selo (nome diferente de `.status`, a área do aviso que continua; pílula com `border-radius: 999px`, `padding: 2px 10px`, `font-size: 13px`, `font-weight: 700`; `border: 1.5px solid currentColor`; `[data-state='ok']` com `background: var(--ok-tint); color: var(--ok)` e `[data-state='none']` com `color: var(--mute)`, como `pages/status/StatusPage.module.css` `.chip`); remover `.state`; só tokens de tema (constituição: sem cores fixas)
- [ ] T020 [US2] Rodar `npx vitest run src/features/admin/components/SourcesAdmin`

**Checkpoint**: aba "Fontes" igual às telas `admin*` do mockup.

---

## Phase 5: User Story 3 - Configuração da fonte gerada (Priority: P1)

**Goal**: cabeçalho do painel e seção "Configuração" do mockup `gen(...)`.

**Independent Test**: aba "Casa": Contador nos limites, dificuldade, salvar com aviso na linha, descartar alterações (quickstart 5).

### Tests for User Story 3

- [ ] T021 [P] [US3] Reescrever a parte de configuração de `features/admin/components/GeneratedSourcesAdmin/GeneratedSourcesAdmin.test.tsx` para `GeneratedSourcePanel` (sem `spinbutton`): `h2` "Casa" e o texto "Fonte gerada. O jogador vê só o nome da fonte e a dificuldade."; `h3` "Configuração"; `group` "Tamanho da grade" com `button` "Diminuir a grade" e "Aumentar a grade" e o valor `11 × 11`; em 9 "Diminuir a grade" desligado, em 15 "Aumentar a grade" desligado; `radio` "Fácil", "Médio" (marcado com `difficulty: 'medium'`), "Difícil"; "Salvar configuração" desligado sem alterações; após "+", `12 × 12`, "Salvar configuração" ligado e "Descartar alterações" presente, que volta a `11 × 11`; salvar envia `PUT` com `{ gridSize: 12, difficulty }` e mostra "Salvo. Vale a partir da próxima cruzada gerada." dentro da mesma linha dos botões (mesmo elemento pai); erro mostra o aviso de erro no mesmo lugar e mantém o rascunho; sem resultado, nenhum elemento de aviso vazio existe; axe sem violações

### Implementation for User Story 3

- [ ] T022 [US3] Em `GeneratedSourcesAdmin.tsx` (`GeneratedSourcePanel`): `h2` com `puzzleSourceNames[view.source]` e o texto do mockup; `section` com `h3` "Configuração"; `size` vira `number` (`useState(view.gridSize)`), sai o `input type="number"`, `validSize` e `aria-invalid`; Contador local `role="group"` `aria-labelledby` no rótulo "Tamanho da grade" (dica "9 a 15, quadrada (N × N)" com `GENERATED_GRID_SIZE_MIN`/`MAX`), dois `button type="button"` com `buttonClass()` de `shared/components/Button/Button` (como em `SettingsDialog` `LimitControl`), `aria-label` "Diminuir a grade"/"Aumentar a grade", desligados em `GENERATED_GRID_SIZE_MIN`/`GENERATED_GRID_SIZE_MAX`, e `<output aria-live="polite">{size} × {size}</output>`; dificuldade continua em `fieldset`/`legend` "Dificuldade" com `difficultyLabels`; ações `Button variant="primary"` "Salvar configuração" (`type="submit"`, desligado sem `dirty`, sem `aria-label`) e, só com `dirty`, `Button variant="secondary"` "Descartar alterações" (`disabled={save.isPending}`, como em `SourcesAdmin`) que repõe `view.gridSize`/`view.difficulty`; `result` vira `saveResult`, renderizado como `Notice` dentro da mesma linha dos botões só quando existe
- [ ] T023 [US3] Em `GeneratedSourcesAdmin.module.css`: linha de ações `display: flex; flex-wrap: wrap; align-items: center; gap: 12px` com o aviso em `flex: 1; min-width: 220px`; Contador (`.stepper`, `.step` 36 px, `.value` `min-width: 84px`, `tabular-nums`) copiando `SettingsDialog.module.css`; `.section` (`display: grid; gap: 12px`) e `.section + .section` com `padding-top: 16px; border-top: 1px solid var(--line)` (mockup `.admsec`); remover `.status` de altura reservada, `.size`, `.hint` sem uso
- [ ] T024 [US3] Rodar `npx vitest run src/features/admin/components/GeneratedSourcesAdmin`

**Checkpoint**: telas `admin-casa`, `admin-casa-editando`, `admin-casa-salvo` na parte de configuração.

---

## Phase 6: User Story 4 - Cruzada de hoje e descarte (Priority: P2)

**Goal**: resumo, tabelas, zona de perigo, aviso com Copiar e dificuldade da geração vinda da API.

**Independent Test**: com cruzada de hoje: resumo, tabelas, bloqueio, descartar e copiar; sem cruzada: só chamadas (quickstart 6).

### Tests for User Story 4

- [ ] T025 [P] [US4] Em `packages/shared/src/sources/generated-settings.test.ts`: `parseDifficultyTitle(difficultyTitle(d)) === d` para `easy`, `medium`, `hard`; `difficultyTitle('medium') === 'Dificuldade: Médio'`; `parseDifficultyTitle(null)`, `('')`, `('Dificuldade: Média')` e `('Outro')` → `null`; `generatedSourceViewSchema` aceita `today` sem `difficulty`, com `null` e com `'hard'`, e recusa `'x'`
- [ ] T026 [P] [US4] Em `apps/api/src/test/admin-generated.int.test.ts`: depois de gravar a cruzada de hoje gerada com `difficulty: 'easy'` (o `toPuzzle(..., { difficulty: 'easy' })` já existente) e mudar a configuração para `hard`, `GET /api/admin/generated` devolve `today.difficulty === 'easy'` e `difficulty === 'hard'` na raiz
- [ ] T027 [P] [US4] Em `GeneratedSourcesAdmin.test.tsx`, casos da cruzada de hoje: com `today` (`size: 11`, `difficulty: 'medium'`, 2 palavras em cada direção, `callsLeft: 2`): `h3` "Cruzada de hoje"; termos `Grade` `11 × 11`, `Dificuldade` `Médio`, `Palavras` `4`, `Chamadas restantes` `2 de 3`; `table` "Horizontais" e "Verticais" com `columnheader` Nº, Resposta, Dica e as linhas; `today` sem `difficulty` → `Dificuldade` `—`; `h3` "Descartar a cruzada de hoje" com "Ela sai do site para todos. A próxima coleta gera outra." (e com `callsLeft: 0`, "Ela sai do site para todos. As chamadas de hoje acabaram: o dia ficará sem cruzada."); `blockedBy: 'duel'` → "Um x1 usa esta cruzada." e "Descartar" desligado; `blockedBy: 'progress'` → "Uma conta já começou esta cruzada."; "Descartar" abre o `dialog` "Descartar a cruzada de hoje?" e cancelar não pede nada; confirmar com sucesso mostra "Cruzada descartada. A próxima coleta gera outra. Para gerar agora:", o `textbox` só de leitura "Comando para gerar agora" com valor `gh workflow run collect.yml` e o `button` "Copiar"; nenhum texto da tela contém crase; "Copiar" chama `navigator.clipboard.writeText('gh workflow run collect.yml')` (simulado) e mostra "Comando copiado." num `status`; com o clipboard rejeitando, "Não foi possível copiar. Selecione o comando."; com `callsLeft: 0`, confirmar com sucesso mostra só "Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada." e nenhum `textbox`; descarte com `409 in-use` mostra "A cruzada passou a ser usada por uma conta ou um x1. Nada foi descartado."; sem `today`: só `Chamadas restantes` e "Sem cruzada hoje.", sem tabelas nem "Descartar"; axe sem violações nos estados com e sem cruzada

### Implementation for User Story 4

- [ ] T028 [US4] Em `packages/shared/src/sources/generated-settings.ts`: `export function difficultyTitle(d: Difficulty): string` (`` `Dificuldade: ${difficultyLabels[d]}` ``) e `export function parseDifficultyTitle(title: string | null): Difficulty | null` (procura entre as chaves de `difficultyLabels` a que dá exatamente `title`); em `generatedSourceViewSchema.today`, `difficulty: difficultySchema.nullable().optional()` ("Dificuldade com que a cruzada de hoje foi gerada; null se não der para saber; ausente numa API anterior"); exportar as duas funções em `packages/shared/src/index.ts`
- [ ] T029 [US4] Em `apps/api/src/sources/generated/layout.ts`, trocar o template do `title` por `difficultyTitle(options.difficulty)` (remover o import de `difficultyLabels` se ficar sem uso)
- [ ] T030 [US4] Em `apps/api/src/modules/sources/sources.service.ts` (`generatedView`), acrescentar `difficulty: parseDifficultyTitle(stored.puzzle.attribution.title)` ao objeto `today`; conferir que `sources.schemas.ts` documenta o campo pelo `toDocSchema` e que `platform/docs/docs.test.ts` passa
- [ ] T031 [US4] Em `GeneratedSourcePanel` (`GeneratedSourcesAdmin.tsx`): segunda `section` com `h3` "Cruzada de hoje"; com `view.today`, `dl` de cartões Grade (`{size} × {size}` de `today.size`), Dificuldade (`difficultyLabels[today.difficulty]` ou `—` quando `null`/ausente), Palavras (`today.words.length`), Chamadas restantes (`{callsLeft} de {GENERATION_DAILY_CALLS}`, constante de `@cruzadinha/shared`); duas `table` com `caption` "Horizontais"/"Verticais", `th scope="col"` Nº, Resposta, Dica, uma linha por palavra; zona de perigo `div` com `h3` "Descartar a cruzada de hoje", `p` com o texto conforme `callsLeft`, selo de alerta com `BLOCKED_TEXT[blockedBy]` (prefixo `!` em `aria-hidden`) quando houver, e `Button variant="secondary"` "Descartar" (`disabled={!today.discardable}`, `pending={discard.isPending}`) que abre o `Dialog` atual sem mudança; sem `view.today`, só o cartão de chamadas e `p` "Sem cruzada hoje."; `discardResult` separado de `saveResult`, no fim da seção, só quando existe: sucesso com chamadas → `Notice variant="info"` "Cruzada descartada. A próxima coleta gera outra. Para gerar agora:" seguido da linha `input readonly` sem rótulo visível (mockup; classe local `.command` copiando `.input` de `shared/components/Field/Field.module.css`, `aria-label="Comando para gerar agora"`, valor `gh workflow run collect.yml`) + `Button variant="secondary"` "Copiar" (`navigator.clipboard.writeText` em `try/catch` como em `features/duel/components/ShareLinkPanel/ShareLinkPanel.tsx`; resultado num `p role="status"`); sucesso sem chamadas → "Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada."; erro → `failureText` atual
- [ ] T032 [US4] Em `GeneratedSourcesAdmin.module.css`: cartões (`.cards` `repeat(auto-fit, minmax(140px, 1fr))` e `.card` como `features/stats/components/StatsView/StatsView.module.css`); `.words` `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px`; tabela como `StatsView` `.table` com texto à esquerda, primeira coluna `width: 3ch; text-align: right; font-family: var(--font-mono)` e resposta em `700 14px var(--font-mono)` (o mockup chama o token de `--mono`; no site é `--font-mono`, `shared/themes/tokens.css`) com `letter-spacing: .06em` (mockup `.admwords`); zona de perigo como `pages/account/AccountPage.module.css` `.danger` com `padding: 14px; gap: 10px` e `h3` em `var(--bad)`; selo de alerta (`.chip` com `background: var(--warn-tint); color: var(--warn)`, `justify-self: start`); linha de cópia `display: flex; gap: 8px` com o campo em `flex: 1; min-width: 0`; remover `.words`/`.list`/`.direction`/`.today`/`.discard` antigos sem uso
- [ ] T033 [US4] Rodar `npx vitest run src/sources` em `packages/shared`, `npx vitest run src/features/admin` em `apps/web` e, com Docker, `npx vitest run --config vitest.int.config.ts src/test/admin-generated.int.test.ts` em `apps/api`

**Checkpoint**: telas `admin-casa`, `admin-casa-bloqueada`, `admin-casa-descartada` completas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T034 Atualizar `apps/web/e2e/admin.spec.ts`: depois de abrir a Administração, conferir o `tablist` e que a aba "Fontes" está escolhida; o fluxo de esconder/reativar continua; no fim, clicar a aba "Casa" e conferir `?aba=casa` na URL e o `h2` "Casa" visível (a lista de `GET /api/admin/generated` traz `casa` mesmo sem cruzada gerada)
- [ ] T035 [P] Atualizar `CLAUDE.md`: no item Site "Admin (060)", citar as abas (`AdminTabs`, `shared/components/Tabs` usado também por `SourceTabs`), `?aba=` (`fontes` ou id da fonte gerada, valor desconhecido abre Fontes, `replace`) e painéis montados com `hidden`; no item API "Generated source `casa` (064)", citar `today.difficulty` (opcional, lido do título por `parseDifficultyTitle`)
- [ ] T036 Rodar na raiz `npm run format && npm run lint && npm run typecheck && npm test && npm run build`
- [ ] T037 Validação manual do quickstart (`specs/066-admin-abas/quickstart.md`, passos 1 a 9) nos temas claro e escuro, no computador e a 390 px, comparando lado a lado com o grupo "Administração" do mockup; registrar divergência mudando o mockup antes (FR-001)
- [ ] T038 Commits por parte (research R11): `feat(shared)`/`feat(api)` para T025 a T030 (campo opcional), `refactor(web): extract shared tabs component` para a Phase 2, `feat(web): ...` para as US1 a US4; sem linha de atribuição de IA

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001, T002)**: primeiro; T001 é o primeiro commit do PR.
- **Foundational (T003 a T007)**: depois do Setup; bloqueia a US1.
- **US1 (T008 a T016)**: depois da Phase 2. US2, US3 e US4 alteram o conteúdo dos painéis e podem ser feitas antes ou depois, mas a verificação na tela pede a US1.
- **US2 (T017 a T020)**: só `SourcesAdmin`; independente de US3/US4.
- **US3 (T021 a T024)**: depende de T012 (painel exportado).
- **US4 (T025 a T033)**: a parte de API/shared (T025, T026, T028 a T030) é independente de tudo; a parte do site (T027, T031, T032) depende de T022 (mesmo arquivo).
- **Polish (T034 a T038)**: no fim.

### Within Each User Story

- Testes escritos antes e falhando, depois a implementação.
- Mesmo arquivo nunca em paralelo: `GeneratedSourcesAdmin.tsx`/`.module.css`/`.test.tsx` passam em sequência por T012 → T021/T022/T023 → T027/T031/T032.

### Parallel Opportunities

- T003 em paralelo com T025/T026/T028 a T030 (API e shared).
- T008, T009, T010 em paralelo.
- US2 inteira em paralelo com US3.
- T035 em paralelo com T034.

## Parallel Example: User Story 4

```text
Task: "T025 [US4] testes de difficultyTitle/parseDifficultyTitle em packages/shared/src/sources/generated-settings.test.ts"
Task: "T026 [US4] today.difficulty em apps/api/src/test/admin-generated.int.test.ts"
Task: "T027 [US4] casos da cruzada de hoje em GeneratedSourcesAdmin.test.tsx"
```

## Implementation Strategy

### MVP First (User Story 1)

1. T001, T002 (mockup).
2. Phase 2 (abas compartilhadas; calendário igual).
3. US1: tela com abas, URL e rascunhos. Parar e validar (quickstart 1 a 4).

### Incremental Delivery

1. + US2 (aba Fontes no design system).
2. + US3 (configuração com Contador).
3. + US4 (cruzada de hoje, perigo, copiar; campo da API).
4. Polish e um PR só para `main`, título `feat(web): rebuild the admin page with tabs`.
