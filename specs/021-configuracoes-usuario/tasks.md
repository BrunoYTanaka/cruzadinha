---

description: "Task list for feature 021: configurações do usuário"
---

# Tasks: Configurações do usuário

**Input**: Design documents from `/specs/021-configuracoes-usuario/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settings-api.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios.
- A constitution exige teste unitário de toda regra de jogo (V) e testes de integração com Postgres real para dados de conta (VII).
- A spec pede acessibilidade sem violações nos dois temas (SC-006).
- Os testes vêm antes da implementação de cada parte e precisam falhar primeiro.

**Organization**: uma fase por história da spec.
- **US1 (P1):** engrenagem, modal, tema, ajudas e riscar, só no aparelho.
- **US2 (P2):** cruzada padrão e ir direto ao jogo.
- **US3 (P3):** configurações salvas na conta.

A base (fase 2) entrega o contrato em `shared` e o armazenamento local que as três histórias usam.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1, US2 ou US3.
- Caminhos relativos à raiz do repositório.

## Regras que valem para todas as tarefas

- **Bibliotecas:** antes de escrever código que usa uma biblioteca (Fastify, Drizzle, Zod, React Router, TanStack Query, Testing Library, Vitest, Playwright), consultar a documentação atual pelo Context7 (constitution, Fluxo de Desenvolvimento).
- **Tipos e estilos:** sem `any`. Dado externo (`localStorage`, `jsonb`, corpo de pedido) entra como `unknown` e passa por Zod. Componentes só leem tokens de tema, sem cor fixa.
- **Nada bloqueia o jogo:** falha de rede ou de servidor vira aviso (FR-023; FR-032 da feature 010).
- **Visitante não envia nada ao servidor** (FR-021).
- **Código:** comentários em português, no tom e densidade do código ao redor. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- **Commits:** em inglês, Conventional Commits, sem linha de coautoria. Escopos `shared`, `api`, `web`, `game-logic`.
- **Documentação da API:** toda rota nova `/api/*` declara `schema` (`docs.test.ts`).

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:int` na branch `feat/021-configuracoes-usuario` e anotar que estão verdes antes de qualquer mudança

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o contrato das configurações em `shared` e o armazenamento local no site, usados pelas três histórias.

### Tests ⚠️

- [X] T002 [P] Criar `packages/shared/src/settings/schema.test.ts`. Cobrir:
  - `defaultSettings({ letters: 4, words: 2 })` devolve `theme: 'auto'`, `helpLetters: 4`, `helpWords: 2`, `strikeMode: 'solved'`, `defaultSource` igual à primeira de `puzzleSourceIdSchema.options`, `directToGame: false`, `boardCellSize: null` e `libraryWidth: null`.
  - `parseSettings(unknown, defaults)`:
    - aceita o objeto completo;
    - troca só o campo inválido pelo padrão (por exemplo `helpLetters: 120`, `theme: 'roxo'`, `boardCellSize: 20`);
    - aceita `helpLetters: null` e `helpWords: null`, que significam sem limite;
    - aceita `defaultSource: 'nova-fonte'` (formato `^[a-z0-9-]{1,40}$`) e recusa `'Nova Fonte!'`, que vira o padrão;
    - descarta chaves desconhecidas;
    - devolve os padrões para `null`, string ou array, sem lançar exceção.
  - `saveSettingsRequestSchema`:
    - recusa um campo conhecido inválido, informando o caminho do campo;
    - recusa `savedAt` ausente ou fora do formato ISO;
    - aceita e descarta chaves desconhecidas em `settings` (research R3).
  - `settingsEnvelopeSchema` aceita `{ settings: null, savedAt: null }` e um `settings` parcial.
  - `parseStoredSettings(unknown)` devolve só os campos válidos, omite os inválidos e não acrescenta padrões. Para `null`, string ou array, devolve `{}`.

### Implementation

- [X] T003 Criar `packages/shared/src/settings/schema.ts`:
  - **Tipos e padrões:**
    - `themeSettingSchema` (`'auto' | 'light' | 'dark'`), `strikeModeSchema` (`'solved' | 'filled'`), `helpLimitSchema` (`z.number().int().min(0).max(99).nullable()`) e `sourceIdFormatSchema` (`z.string().regex(/^[a-z0-9-]{1,40}$/)`);
    - `settingsSchema` (`z.object` com os oito campos de `data-model.md`, mais `boardCellSize` `int 30..110 | null` e `libraryWidth` `int 720..1600 | null`) e o tipo `Settings`;
    - `defaultSettings(helpLimits)`.
  - **Leitura tolerante:** `parseSettings(value: unknown, defaults: Settings): Settings`, campo a campo com `.catch(defaults.<campo>)`.
  - **Leitura no servidor:** `parseStoredSettings(value: unknown): Partial<Settings>`, que fica só com os campos válidos, sem padrões.
  - **Pedido e envelope:** `saveSettingsRequestSchema` (`z.object({ settings: settingsSchema, savedAt: z.iso.datetime() })`, sem `strict`), `settingsEnvelopeSchema` (`{ settings: settingsSchema.partial().nullable(), savedAt: z.iso.datetime().nullable() }`, tolerante como as respostas da feature 012) e os tipos correspondentes.
  - Exportar tudo em `packages/shared/src/index.ts`. Fazer T002 passar.
- [X] T004 [P] Criar `apps/web/src/features/settings/settings-store.test.ts`, com `localStorage` limpo antes de cada caso. Cobrir:
  - **Primeira leitura:** sem `cruzadinha:settings`, monta das chaves antigas (`cruzadinha:theme = 'dark'`, `cruzadinha:source = 'cruzadaonline'`, `cruzadinha:board-size = {"cellSize":72}`, `cruzadinha:library-width = {"width":1200}`, formato de `library-width.ts`) e grava a chave nova `{ v: 1, settings, savedAt }`, sem apagar as antigas (FR-017). Sem nada guardado, valem os padrões (`config.helpLimits`).
  - **Registro existente:** com `v` desconhecido ou JSON inválido, valem os padrões e as chaves antigas.
  - **Mudanças:** `updateSettings(patch)` grava, troca `savedAt` e avisa os inscritos. `restoreDefaults()` volta aos padrões com `savedAt` novo (FR-005).
  - **Sem armazenamento:** com `localStorage` que lança exceção, as mudanças valem em memória e nada quebra (FR-018).
  - **Outras abas:** um evento `storage` na chave substitui o estado e avisa os inscritos com a origem `'external'`; eventos de outras chaves são ignorados (FR-019).
  - **Registro de fora:** `replaceSettings(settings, savedAt, origin)` só aplica se o `savedAt` for mais novo.
- [X] T005 Criar `apps/web/src/features/settings/settings-store.ts`:
  - armazenamento em módulo com `subscribe`/`getSnapshot` e o hook `useSettings()` via `useSyncExternalStore`;
  - leitura e escrita por `readStorage`/`writeStorage` de `apps/web/src/lib/storage.ts`;
  - `updateSettings`, `restoreDefaults`, `replaceSettings`;
  - ouvinte de `storage` instalado uma vez;
  - os inscritos recebem a origem da mudança (`'user' | 'external' | 'account'`), usada para decidir a animação de tema.

  Fazer T004 passar.
- [X] T006 Ligar as preferências existentes ao armazenamento:
  - `apps/web/src/themes/theme.ts`: `readTheme`/`saveTheme` leem e gravam `theme` pelo `settings-store`;
  - `apps/web/src/features/game/board-size.ts` (`loadBoardSize`/`saveBoardSize`/reset): `boardCellSize`;
  - `apps/web/src/features/library/library-width.ts`: `libraryWidth`;
  - `apps/web/index.html`: o script inline que aplica o tema antes do React passa a ler `cruzadinha:settings` (`JSON.parse(...).settings.theme`, dentro de `try`). Se não houver chave nova ou ela for inválida, lê a antiga `cruzadinha:theme`. Assim o tema guardado aparece no primeiro quadro, sem trocar depois (FR-017, SC-005).

  Ajustar os testes existentes desses módulos para o novo armazenamento, sem mudar o comportamento das alças da feature 011 (FR-015).
- [X] T007 Rodar `npm test` e `npm run typecheck`; corrigir o que quebrou

**Checkpoint**: as configurações têm contrato e armazenamento local; tema, tamanho do tabuleiro e largura do calendário continuam iguais para o usuário.

---

## Phase 3: User Story 1 - Abrir as configurações e mudar o jogo (Priority: P1) 🎯 MVP

**Goal**: engrenagem com tooltip no cabeçalho, modal com tema (botão único animado), limites de ajuda com "sem limite", modo de riscar e "Restaurar padrões", tudo valendo na hora e guardado no aparelho.

**Independent Test**:
1. Como visitante, abrir a engrenagem, levar o tema a escuro, pôr o limite de letras em 6 e desligar "riscar só quando acerta".
2. Jogar uma palavra errada: a dica fica só riscada.
3. Recarregar: tudo continua.

### Tests for User Story 1 ⚠️

- [X] T008 [P] [US1] Em `apps/web/src/game-logic/help.test.ts` (criar se não existir):
  - `canRevealLetter`/`canRevealWord` com limite `null` sempre `true`;
  - com limite numérico, `usage < limite`;
  - `revealLetter`/`revealWord` usam os limites recebidos no pedido;
  - baixar o limite abaixo do uso não altera `usage`, `marks` nem `locked`, e a ajuda passa a responder `letter-limit`/`word-limit` (FR-008a, FR-009).

  Ajustar `apps/web/src/game-logic/reducer.test.ts` para as ações de ajuda com `limits` no pedido.
- [X] T009 [P] [US1] Em `apps/web/src/game-logic/clue-strike.test.ts`:
  - `isWordFilled` (completa com qualquer letra);
  - `struckWords(..., 'filled')` inclui palavras completas certas e erradas e exclui incompletas;
  - `struckWords(..., 'solved')` continua igual (FR-010).
- [X] T010 [P] [US1] Em `apps/web/src/themes/theme.test.ts`:
  - `nextTheme` na ordem `light → dark → auto → light`;
  - o rótulo do tema `auto` é "Automático".

  Criar `apps/web/src/themes/theme-transition.test.ts` para `startThemeTransition(theme, origin)`:
  - sem `document.startViewTransition`, aplica o tema na hora;
  - com `matchMedia('(prefers-reduced-motion: reduce)')` verdadeiro, aplica na hora sem chamar a transição;
  - com suporte, chama `startViewTransition`, aplica o tema dentro do callback e define as variáveis CSS da origem (`--theme-x`, `--theme-y`);
  - uma segunda chamada durante a primeira chama `skipTransition()` na anterior (sem animações empilhadas).
- [X] T011 [P] [US1] Criar `apps/web/src/components/Tooltip.test.tsx`:
  - aparece no foco do alvo e no `pointerenter`, e some ao sair;
  - Esc fecha o tooltip e o evento continua chegando ao `document`;
  - tem `aria-hidden="true"`;
  - não aparece com toque;
  - `vitest-axe` sem violações.
- [X] T012 [P] [US1] Criar `apps/web/src/themes/ThemeButton.test.tsx`:
  - o clique avança claro → escuro → automático → claro;
  - Enter e Espaço também avançam;
  - o nome acessível é `Tema: claro. Mudar para escuro`;
  - a região viva anuncia o novo tema;
  - chama `startThemeTransition` com a origem do botão;
  - grava `theme` no `settings-store`;
  - a classe de animação do ícone existe e vem coberta por `prefers-reduced-motion` no CSS.
- [X] T013 [P] [US1] Criar `apps/web/src/features/settings/SettingsDialog.test.tsx`:
  - **Engrenagem:** abre pela engrenagem do `AppLayout`, que tem nome "Configurações", tooltip e `aria-haspopup="dialog"`. Esc e o botão Fechar fecham e devolvem o foco à engrenagem.
  - **Ajudas:** − e + mudam letras e palavras dentro de 0 a 99. "Sem limite" desliga − e + e grava `null`; desmarcar volta ao último número.
  - **Riscar:** o switch muda `aria-checked` e a descrição.
  - **Restaurar padrões:** volta tudo.
  - **Rodapé:** o visitante vê "As configurações ficam só neste aparelho" e o link "Entrar" com `?next=` (FR-027).
  - **Sem salvar:** não existe botão "Salvar".
  - **Acessibilidade:** `vitest-axe` sem violações com o tema claro e com o escuro.
  - **Cabeçalho:** o `ThemeToggle` não existe mais no cabeçalho.
- [X] T014 [P] [US1] Em `apps/web/src/features/game/HelpButtons.test.tsx`:
  - com limite `null`, mostra `N/∞` (por exemplo `50/∞ Letra`);
  - o nome é "Revelar letra: sem limite, N usadas";
  - nunca fica desativado por limite.

  Em `ClueList.test.tsx` e `ClueSheet.test.tsx`:
  - no modo `filled`, uma palavra errada completa tem a classe `.struck`, sem `.done` e sem visto;
  - o nome termina com ", preenchida";
  - no modo `solved`, o comportamento continua o das features 016 a 019.
- [X] T015 [P] [US1] Em `apps/web/src/features/game/GamePage.test.tsx`:
  - **Ajudas ao vivo:** mudar o limite de letras pelo `settings-store` com a partida aberta muda os botões de ajuda na hora (FR-008); reduzir abaixo do usado mantém as letras reveladas (FR-009).
  - **Riscar ao vivo:** trocar o modo de riscar muda a lista na hora, inclusive no modo leitura.
  - **Relógio:** abrir a modal pausa o relógio sem mostrar a capa de pausa, e fechar retoma (FR-006). Se o jogador já tinha pausado antes de abrir, o relógio continua pausado depois de fechar, com a capa de pausa.
  - **Layout:** a lista de dicas não muda de altura ao trocar o modo (FR-011).

### Implementation for User Story 1

- [X] T016 [US1] Em `apps/web/src/game-logic/help.ts` e `reducer.ts`:
  - `GameLimits = { letters: number | null; words: number | null }`, com `null` = sem limite;
  - `canRevealLetter`/`canRevealWord` tratam `null`;
  - as ações de ajuda do reducer recebem `limits` no pedido e deixam de usar o `GameContext` (research R12).

  Fazer T008 passar.
- [X] T017 [US1] Em `apps/web/src/game-logic/clue-strike.ts`: `StrikeMode = 'solved' | 'filled'`, `isWordFilled` e o caso `'filled'` em `struckWords`. Fazer T009 passar.
- [X] T018 [P] [US1] Em `apps/web/src/themes/theme.ts`: `nextTheme` na ordem claro → escuro → automático e `themeLabel('auto') = 'Automático'`. Criar `apps/web/src/themes/theme-transition.ts`:
  - `startThemeTransition(theme, origin)`;
  - View Transition com `clip-path: circle()` a partir da origem, 450 ms;
  - sem suporte ou com movimento reduzido, aplica na hora;
  - `skipTransition()` da anterior antes de começar outra.

  Pôr as regras `::view-transition-old(root)`/`::view-transition-new(root)` e o `@media (prefers-reduced-motion: reduce)` em `apps/web/src/themes/global.css`. Fazer T010 passar.
- [X] T019 [P] [US1] Criar `apps/web/src/components/Tooltip.tsx` e `Tooltip.module.css`:
  - envolve o alvo; posição absoluta, sem mudar o layout;
  - tokens `--ink`/`--surface`, com variante acima ou abaixo;
  - Esc sem `stopPropagation`.

  Fazer T011 passar.
- [X] T020 [US1] Criar `apps/web/src/themes/ThemeButton.tsx` e `ThemeButton.module.css`:
  - ícones sol, lua e automático em SVG `aria-hidden`, com `key` por tema para remontar e animar;
  - `@keyframes` de giro e escala de 450 ms, desligado em `prefers-reduced-motion`;
  - nome acessível e `Tooltip` com o próximo tema;
  - região viva;
  - ao clicar, `updateSettings({ theme })` e `startThemeTransition` com o centro do botão.

  O tema aplicado por mudanças de origem `'external'`/`'account'`, por "Restaurar padrões" e pela abertura usa `applyTheme` direto, sem animação (FR-007c): instalar isso num assinante do `settings-store` em `apps/web/src/themes/theme.ts`. Fazer T012 passar.
- [X] T021 [US1] Criar `apps/web/src/features/settings/settings-open.ts`, um estado de módulo com `useSettingsOpen()` e `setSettingsOpen()`. Criar `SettingsButton.tsx`: a engrenagem em SVG `aria-hidden` dentro de um `<button>` de 44 px, com `aria-label="Configurações"`, `aria-haspopup="dialog"` e `Tooltip`.
- [X] T022 [US1] Criar `apps/web/src/features/settings/SettingsDialog.tsx` e `SettingsDialog.module.css` com o `Dialog` existente, seguindo `contracts/ui.md`. O `Dialog` (`apps/web/src/components/Dialog.tsx`) não tem botão de fechar próprio, só Esc e clique no fundo opcional. A modal acrescenta no topo um `<button>` de 44 px com ícone X `aria-hidden` e `aria-label="Fechar"`, que chama `onClose`.
  - **Tema:** `ThemeButton`.
  - **Ajudas:** − e + de 44 px, valor e caixa "Sem limite", para letras e para palavras.
  - **Riscar:** switch "Riscar a dica só quando acerta" (`button role="switch"`).
  - **Rodapé:** texto de visitante ou de conta, e "Restaurar padrões".
  - **Aparelho:** em 360 px ocupa a largura e rola por dentro.

  Nesta história as seções de cruzada padrão e "Ir direto ao jogo" ainda não existem (US2). Fazer T013 passar.
- [X] T023 [US1] Em `apps/web/src/app/AppLayout.tsx` e `AppLayout.module.css`:
  - trocar `ThemeToggle` por `SettingsButton` e montar `SettingsDialog`, ligado a `settings-open`;
  - apagar `apps/web/src/themes/ThemeToggle.tsx` e `ThemeToggle.test.tsx`;
  - conferir que o cabeçalho não salta no celular (a regra `max-width: 560px` existente).
- [X] T024 [US1] Em `apps/web/src/features/game/useGame.ts`:
  - ler `helpLetters`/`helpWords` de `useSettings()`, usando `config.helpLimits` só como padrão, e passar `limits` às ações de ajuda;
  - ler `strikeMode` (sai a constante `STRIKE_MODE`) e devolver `struck` e `strikeMode`.

  Em `HelpButtons.tsx`, tratar o limite `null` ("Sem limite"). Em `ClueList.tsx`/`ClueSheet.tsx` e `ClueList.module.css`:
  - a classe `.struck`, só com `line-through` de 1 px e texto `--ink`, para o modo `filled`;
  - `.done` continua para o modo `solved`;
  - texto oculto ", preenchida" ou ", resolvida";
  - o `padding-right` do visto reservado nos dois modos.

  Em `GamePage.tsx`, passar `strikeMode` às listas e pausar o relógio com `useSettingsOpen()` sem `PauseCover`.
  - Em `apps/web/src/features/game/clock.ts`, uma flag nova `suspended` (`setSuspended`), separada de `hidden` (aba escondida) e de `manual` (pausa do jogador), com teste em `clock.test.ts`.
  - O relógio corre só sem nenhuma das três flags.
  - `useClock` recebe `suspended` como terceiro argumento.
  - Não usar `pause()`/`resume()`: eles mostram a `PauseCover` e, ao fechar a modal, desfariam uma pausa do jogador. Fazer T014 e T015 passar.
- [X] T025 [US1] Criar `apps/web/e2e/configuracoes.spec.ts` com os casos da história 1:
  - **Engrenagem:** o tooltip aparece com Tab; abrir e fechar a modal devolve o foco.
  - **Tema:**
    - três cliques no tema (claro → escuro → automático) mudam `data-theme`;
    - sem redução de movimento, a animação da view transition existe e dura no máximo 700 ms (`document.getAnimations()`, `effect.getTiming().duration`; SC-009);
    - com `page.emulateMedia({ reducedMotion: 'reduce' })` não há `document.getAnimations()` de view transition;
    - o tema persiste após recarregar, e já está no `data-theme` do `<html>` no `DOMContentLoaded` (script inline do `index.html`, sem trocar de tema depois).
  - **Ajudas:** letras em 6 mostram `0/6` no jogo; "Sem limite" em palavras.
  - **Riscar:** desligado, uma palavra errada fica `.struck` sem visto.
  - **Restaurar padrões.**
  - **Celular:** em 360 px, `document.documentElement.scrollWidth <= 360`.
  - **Acessibilidade:** axe na modal com tema claro e escuro.

  Ajustar `apps/web/e2e/visitante.spec.ts` e `sem-saltos.spec.ts` onde usavam o botão de tema do cabeçalho.

**Checkpoint**: US1 completa e testável sozinha: um visitante ajusta tema, ajudas e riscar, e tudo fica no aparelho.

---

## Phase 4: User Story 2 - Cruzada padrão e ir direto ao jogo (Priority: P2)

**Goal**:
- A cruzada padrão define a aba com que o calendário abre.
- Com "Ir direto ao jogo", abrir `/` leva à cruzada de hoje dessa fonte, ou ao calendário com um aviso que cita o nome da cruzada.

**Independent Test**:
1. Escolher Cruzada Online e ligar "Ir direto ao jogo".
2. Abrir `/`: cai no jogo de hoje da Cruzada Online, sem o calendário aparecer antes.
3. Voltar ao calendário: a aba Cruzada Online está selecionada.

### Tests for User Story 2 ⚠️

- [X] T026 [P] [US2] Em `apps/web/src/features/library/source-choice.test.ts`:
  - `loadSourceChoice()` lê `defaultSource` do `settings-store`;
  - um valor que não está em `puzzleSourceIdSchema` vale como `DEFAULT_SOURCE` sem regravar o valor (FR-012b).

  Em `SourceTabs.test.tsx`/`LibraryPage.test.tsx`:
  - trocar de aba não grava preferência;
  - ao remontar a página, a aba volta à cruzada padrão (research R15).

  Em `DayRoute.test.tsx`: `?fonte=` válido é usado na busca, mas não grava a cruzada padrão.
- [X] T027 [P] [US2] Criar `apps/web/src/app/direct-play.test.ts` para a decisão pura `decideDirectPlay({ card, today, source })` e para `directPlayLoader`:
  - **Desligado ou não é a primeira navegação:** não faz nada.
  - **Não iniciada ou em andamento:** `replace('/jogo/<id>')`.
  - **Ainda não salva, com a fonte no ar:** `replace('/dia/<hoje>?fonte=<fonte>')`.
  - **Concluída:** volta o motivo `completed` com o nome da cruzada.
  - **Sem cruzada hoje:** volta `no-puzzle`.
  - **Fonte marcada como fora do ar** (`source-down.ts`): volta `source-down`.
  - **Erro ao ler a biblioteca:** sem redirecionar e sem motivo.
  - **Cruzada padrão desconhecida:** usa a primeira fonte.

  Depois da primeira navegação, outra ida a `/` não faz nada (FR-014).
- [X] T028 [P] [US2] Em `SettingsDialog.test.tsx`:
  - com as 2 fontes reais, aparecem botões lado a lado com `aria-pressed`;
  - com uma lista simulada de 4 fontes, aparece um `fieldset` com rádios (FR-012a);
  - o switch "Ir direto ao jogo" cita o nome da cruzada padrão na descrição.

  Em `LibraryPage.test.tsx`: o `Notice` do motivo devolvido pelo loader cita o nome da fonte (por exemplo "Cruzada Online: a cruzada de hoje já foi concluída.") e pode ser fechado.

### Implementation for User Story 2

- [X] T029 [US2] Em `apps/web/src/features/library/source-choice.ts`:
  - `loadSourceChoice`/`saveSourceChoice` passam a usar `defaultSource` do `settings-store`, resolvido por `puzzleSourceIdSchema` com volta para `DEFAULT_SOURCE` sem regravar;
  - `useSourceChoice` vira a aba em memória, iniciada pela cruzada padrão.

  Em `apps/web/src/features/library/DayRoute.tsx`, deixar de chamar `saveSourceChoice` para `?fonte=`. Fazer T026 passar.
- [X] T030 [US2] Criar `apps/web/src/app/direct-play.ts` com `decideDirectPlay` (pura, usando `todayCard` de `features/library/today-cards.ts`, `todayInBrasilia` e `puzzleSourceNames`) e `directPlayLoader(queryClient)`:
  - marca de módulo para a primeira navegação;
  - `ensureQueryData` da biblioteca com a mesma chave e função de `useSourceLibraries.ts`;
  - `replace` do React Router.

  Em `apps/web/src/app/router.tsx`, pôr o loader na rota `/` (dentro do `viewerLoader`). Fazer T027 passar.
- [X] T031 [US2] Em `SettingsDialog.tsx`, acrescentar as seções seguindo `contracts/ui.md`:
  - **Cruzada padrão:** botões até 3 fontes e `fieldset` com rádios acima disso, a partir de `puzzleSourceIdSchema.options` e `puzzleSourceNames`;
  - **Ir direto ao jogo:** switch com descrição.

  Em `LibraryPage.tsx`, ler o motivo do loader (`useLoaderData`) e mostrar o `Notice` informativo que dá para fechar. Fazer T028 passar.
- [X] T032 [US2] Em `apps/web/e2e/configuracoes.spec.ts`:
  - cruzada padrão Cruzada Online abre a aba certa; trocar a aba e recarregar volta para a padrão;
  - "Ir direto ao jogo" ligado leva de `/` ao jogo de hoje (com a fixture do seed), sem `getByRole('tabpanel')` visível antes da URL `/jogo/`;
  - concluída, mostra o calendário com o aviso.

  Ajustar `apps/web/e2e/fontes.spec.ts`, que esperava a aba lembrada.

**Checkpoint**: US1 e US2 funcionam sozinhas no aparelho, com ou sem conta.

---

## Phase 5: User Story 3 - Configurações salvas na conta (Priority: P3)

**Goal**:
- Quem tem conta encontra as mesmas configurações em outro aparelho.
- Vence a mudança mais recente.
- No primeiro login, as configurações do aparelho sobem se a conta não tem nenhuma.
- Ao sair, as configurações continuam no aparelho.

**Independent Test**:
1. Logado no navegador A, mudar o tema e o limite de ajudas.
2. Entrar com a mesma conta no navegador B, sem dados locais: as mesmas configurações aparecem.

### Tests for User Story 3 ⚠️

- [X] T033 [P] [US3] Criar `apps/api/src/modules/settings/settings.service.test.ts` para `decideSettingsSave(current, request, now)`:
  - sem registro, grava;
  - `savedAt` mais novo grava;
  - `savedAt` igual ou mais antigo devolve `unchanged` (FR-022);
  - `savedAt` mais de 5 minutos no futuro devolve `invalid-saved-at`.

  Ajustar `progress.service.test.ts` se `savedAtTooFar` mudar de lugar.
- [X] T034 [P] [US3] Criar os testes de rota com `app.inject()` (feito em `apps/api/src/test/settings.int.test.ts`, junto da T035, porque os testes de rota do projeto rodam contra o Postgres real):
  - `GET` sem sessão responde `401`;
  - `GET` de conta sem registro responde `{ settings: null, savedAt: null }`;
  - `PUT` válido responde `200` com o envelope;
  - campo inválido responde `400 invalid-input` com `fields: ['settings']`, nunca valores;
  - corpo acima de 4096 bytes responde `400 invalid-input`;
  - chave desconhecida é descartada;
  - `defaultSource: 'nova-fonte'` é aceito;
  - acima do limite responde `429 too-many-attempts` com `retry-after`.

  Confirmar que `apps/api/src/docs/docs.test.ts` passa com o `schema` das duas rotas.
- [X] T035 [P] [US3] Criar `apps/api/src/test/settings.int.test.ts` (Postgres real):
  - a tabela `user_settings` tem o gatilho `user_settings_set_updated_at` (já coberto por `conventions.int.test.ts`);
  - excluir o usuário apaga a linha (FR-026);
  - `upsert` com `savedAt` mais antigo não sobrescreve, inclusive com dois pedidos em paralelo (`setWhere`);
  - o `jsonb` gravado direto no banco com um campo inválido volta do `GET` sem esse campo (`parseStoredSettings`), e com os outros intactos;
  - o limite `SETTINGS_SAVE` é contado por endereço e respeita o check ampliado;
  - um usuário nunca lê as configurações de outro.
- [X] T036 [P] [US3] Criar `apps/web/src/features/settings/settings-sync.test.ts` com `http` de `src/test/` e timers falsos:
  - **Agrupamento:** várias mudanças em 800 ms viram um `PUT` só, com a última versão e o `savedAt` corrigido pelo relógio do servidor (`getServerClockOffsetMs`).
  - **Falhas:**
    - rede e 5xx tentam de novo com espera crescente e marcam o aviso; o sucesso limpa o aviso;
    - `429` espera o `retry-after`;
    - `404` (API antiga) para de tentar sem aviso (FR-025);
    - `401` segue o tratador de sessão existente.
  - **Visitante:** nunca chama a API (FR-021).
  - **Primeiro login:**
    - `GET` com `settings: null` envia o local (FR-020a);
    - `GET` com configurações substitui o local com a origem `'account'`, o que faz o tema não animar;
    - um `settings` parcial é completado com os padrões do site.
  - **Abertura já logado (FR-020c):**
    - conta mais nova substitui o local;
    - local mais novo é enviado com `PUT` e não é sobrescrito.
  - **Logout:** mantém o local (FR-020b).
- [X] T037 [P] [US3] Em `SettingsDialog.test.tsx`:
  - logado, o rodapé diz "Salvo automaticamente neste aparelho e na sua conta";
  - com falha de envio, aparece um `Notice` de aviso, e a modal continua usável.

### Implementation for User Story 3

- [X] T038 [US3] Em `apps/api/src/db/schema.ts`:
  - tabela `userSettings` (`user_settings`): `user_id` `uuid` como chave primária e FK para `users.user_id` com `onDelete: 'cascade'`, `settings` `jsonb` not null (`$type<unknown>()`), `saved_at` `timestamptz` not null e `...timestamps`;
  - `'SETTINGS_SAVE'` em `rateLimitActions` e no check `rate_limit_attempts_action_check`.

  Gerar a migração com `npm run db:generate -w @cruzadinha/api -- --name user_settings`. Acrescentar à mão em `apps/api/drizzle/0005_user_settings.sql` o gatilho `user_settings_set_updated_at`, no mesmo formato de `0003_progress.sql`. Rodar `npm run db:migrate -w @cruzadinha/api` localmente.
- [X] T039 [US3] Mover `savedAtTooFar` e `MAX_CLOCK_SKEW_MS` de `apps/api/src/modules/progress/progress.service.ts` para `apps/api/src/lib/saved-at.ts`, importando de lá nos dois serviços. Em `apps/api/src/modules/rate-limit/limits.ts`, acrescentar `settingsSave: { max: 120, windowMinutes: 60 }`.
- [X] T040 [US3] Criar `apps/api/src/modules/settings/settings.repository.ts`:
  - `findSettings(db, userId)`;
  - `upsertSettings(db, userId, settings, savedAt)` com `onConflictDoUpdate({ target: userSettings.userId, set: { settings, savedAt }, setWhere: lt(userSettings.savedAt, sql.raw('excluded.saved_at')) })`, devolvendo a linha resultante.

  Criar `settings.service.ts`:
  - `decideSettingsSave`;
  - `get(userId)`, que relê o `jsonb` com `parseStoredSettings` (objeto parcial, sem padrões);
  - `save(userId, request, clientAddress)`, que consulta o limitador `SETTINGS_SAVE` com `NETWORK_ADDRESS`.

  Fazer T033 passar.
- [X] T041 [US3] Criar `apps/api/src/modules/settings/settings.schemas.ts`, com tag `settings`, `security` de sessão, exemplos e respostas 200/400/401/429, montados com `toDocSchema`. Criar `settings.routes.ts`:
  - `GET` e `PUT /api/settings` com `requireSession`;
  - `PUT` com `bodyLimit: 4096`;
  - `safeParse` de `saveSettingsRequestSchema` com campos do primeiro nível;
  - `sendTooManyAttempts`.

  Registrar em `apps/api/src/app.ts`. Fazer T034 e T035 passar.
- [X] T042 [US3] Criar `apps/web/src/api/settings.ts` (`getSettings`, `saveSettings` por `apiRequest` com `settingsEnvelopeSchema`) e `queryKeys.settings(userId)` em `apps/web/src/api/query-keys.ts`.
- [X] T043 [US3] Criar `apps/web/src/features/settings/settings-sync.ts`:
  - fila de envio com agrupamento de 800 ms, espera crescente, `retry-after` e parada em 404;
  - estado de aviso observável;
  - `useSettingsSync()` montado no `AppLayout`, que no início da sessão e após o login faz o `GET` por TanStack Query. Logo após o login, aplica a regra do primeiro login (a conta vence, ou o local sobe se a conta não tem nada). Ao abrir já logado, vence o `savedAt` mais recente (FR-020c). Um `settings` parcial é completado com `defaultSettings(config.helpLimits)`;
  - assina as mudanças de origem `'user'` do `settings-store` só quando há sessão.

  O `useLogoutMutation` não precisa mudar, mas conferir que o `queryClient.clear()` não apaga o `settings-store`. Fazer T036 passar.
- [X] T044 [US3] Em `SettingsDialog.tsx`, mostrar o rodapé da conta e o `Notice` de falha de envio, ligados ao estado de `settings-sync`. Fazer T037 passar.
- [X] T045 [US3] Em `apps/web/e2e/configuracoes.spec.ts`:
  - entrar com a conta do seed num contexto, mudar o tema e as ajudas, e esperar o `PUT`;
  - abrir um segundo `browser.newContext()`, entrar com a mesma conta e ver as mesmas configurações em até 5 s após o login (`expect(...).toHaveAttribute(..., { timeout: 5000 })`; SC-004);
  - fechar a aba antes do envio de uma mudança (fila em memória) e reabrir já logado: a mudança local é enviada à conta, não descartada (FR-020c);
  - sair da conta: as configurações continuam;
  - com `page.route('**/api/settings', abort)`, a mudança vale e o aviso aparece.

**Checkpoint**: as três histórias funcionam; o site novo também roda contra a API anterior (404 tratado).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T046 [P] Atualizar `docs/design.md`: engrenagem e modal de configurações, botão de tema único com animação, modo de riscar "ao preencher", ajudas sem limite, cruzada padrão e ir direto ao jogo. Remover o botão de tema do cabeçalho.
- [X] T047 [P] Atualizar `docs/data-definitions/` e `docs/entity-relationship-diagrams/` com a tabela `user_settings` e o novo valor `SETTINGS_SAVE`, seguindo o formato existente.
- [X] T048 [P] Acrescentar notas apontando para a feature 021:
  - em `specs/015-escolha-fonte/spec.md`, a aba não é mais lembrada;
  - em `specs/016-dica-riscada-ao-acertar/spec.md`, FR-006 ganha o modo `filled`;
  - em `specs/010-front-basico/spec.md`, os limites de ajuda passam a ser configuráveis.
- [X] T049 Acrescentar o parágrafo da feature 021 em `CLAUDE.md` (seção Current state), no estilo das anteriores, e mencionar `user_settings` e `/api/settings` na seção Architecture.
- [X] T050 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int` e `npm run test:e2e -w @cruzadinha/web`. Seguir o roteiro manual de `specs/021-configuracoes-usuario/quickstart.md` e anotar o resultado de cada passo.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependência.
- **Foundational (T002–T007)**: depende do Setup; bloqueia todas as histórias. T003 depende de T002; T005 de T004 e T003; T006 de T005.
- **US1 (T008–T025)**: depende da base.
- **US2 (T026–T032)**: depende da base. Na modal, depende de T022 (o arquivo `SettingsDialog.tsx` existe). As regras (`direct-play`, `source-choice`) não dependem da US1.
- **US3 (T033–T045)**: a API (T033–T035 e T038–T041) depende só de T003. O site (T036, T037, T042–T044) depende de T005 e de T022.
- **Polish (T046–T050)**: depois das histórias desejadas.

### Within Each User Story

- Testes primeiro, falhando.
- Regras puras (`game-logic`, `decide*`) antes de componentes e rotas.
- Repositório → serviço → rota na API.
- e2e por último.

### Parallel Opportunities

- **Base:** T002 e T004.
- **US1:**
  - testes: T008 a T015;
  - implementação: T018 e T019 em paralelo com T016 e T017.
- **US2:** T026, T027 e T028.
- **US3:** T033, T034, T035, T036 e T037. A API inteira (T038 a T041) pode correr em paralelo com o trabalho do site em US1 e US2.
- **Polish:** T046, T047 e T048.

---

## Parallel Example: User Story 1

```text
Testes juntos:
  T008 help.test.ts · T009 clue-strike.test.ts · T010 theme/theme-transition tests
  T011 Tooltip.test.tsx · T012 ThemeButton.test.tsx · T013 SettingsDialog.test.tsx
  T014 HelpButtons/ClueList/ClueSheet tests · T015 GamePage.test.tsx
Depois, em paralelo:
  T016 limites null no game-logic   |  T018 tema e transição  |  T019 Tooltip
  T017 modo filled                  |
```

## Parallel Example: User Story 3

```text
API:  T033 → T038 → T039 → T040 → T041 (T034, T035 escritos antes)
Site: T036, T037 → T042 → T043 → T044
e2e:  T045 quando as duas pontas estiverem prontas
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fazer a fase 1 (setup) e a fase 2 (base).
2. Fazer a US1: engrenagem, modal, tema animado, ajudas e riscar, só no aparelho.
3. **Parar e validar** pelos passos 1 a 4 do quickstart. Já dá para publicar: é uma `feat(web)`, e o site novo não depende de API nova.

### Incremental Delivery

1. Base + US1: publicar o site.
2. US2 (cruzada padrão e ir direto): publicar o site.
3. US3: publicar primeiro a API, com a migração `0005` e as rotas novas, e depois o site com a sincronização.
   - Isso segue a ordem do deploy (feature 012).
   - O site já tolera a API antiga (404), então a ordem inversa também funciona.

### Notes

- **Commits:**
  - um commit por tarefa ou grupo lógico, com o teste junto do código;
  - escopos `shared`, `api`, `web`, `game-logic`;
  - mensagens em inglês, sem coautoria.
- **Releases:** mudanças em `packages/shared` sobem as duas partes como patch (`docs/versionamento.md`). As `feat` em `apps/api` e `apps/web` sobem cada parte como minor.
