# Tasks: Copiar a dica com tamanho e letras e fechar os ajustes ao clicar fora

**Input**: `/specs/033-copiar-dica/` (plan.md, spec.md, research.md, data-model.md, contracts/settings.md, quickstart.md)

**Tests**: incluídos (constituição II e V: lógica de jogo pura testada, e2e e axe).

**Format**: `- [ ] T### [P?] [US?] descrição com caminho`

## Phase 1: Setup

Sem dependência nova, sem migração, sem diretório novo.

- [X] T001a Consultar a documentação atual via Context7 MCP (constituição, Fluxo de Desenvolvimento): React (`onDoubleClick`, eventos de mouse), Zod (`extend`, `optional`) e Playwright (`grantPermissions` para `clipboard-read`/`clipboard-write`); anotar no `research.md` qualquer diferença de API encontrada.

## Phase 2: Foundational (campo `copyClue` no registro de ajustes)

**Bloqueia US1 e US2.**

- [X] T001 Em `packages/shared/src/settings/schema.ts`, adicionar `copyClue: z.boolean()` a `fields` e `copyClue: false` em `defaultSettings`; em `saveSettingsRequestSchema` trocar `settings: settingsSchema` por `settingsSchema.extend({ copyClue: z.boolean().optional() })` (um site anterior não envia o campo e não pode levar 400). Atualizar o comentário "os oito campos" para nove.
- [X] T002 [P] Em `packages/shared/src/settings/schema.test.ts`, atualizar `full` e o teste de `defaultSettings` e cobrir: `copyClue` inválido vira `false` em `parseSettings`, `parseStoredSettings({ copyClue: true })` o mantém, `saveSettingsRequestSchema` aceita o pedido sem `copyClue`.
- [X] T003 [P] Corrigir testes/fixtures que montam `Settings` completos e quebram com o campo novo (`grep -rn "libraryWidth" apps packages --include=*.ts --include=*.tsx`, ex.: `apps/api/src/modules/settings/*.test.ts`, `apps/api/src/test/*settings*.int.test.ts`, `apps/web/src/features/settings/*.test.ts*`, `apps/web/src/test/`); o teste de integração da API ganha um caso de PUT sem `copyClue` respondendo 200.
- [X] T004 [P] Atualizar `docs/data-definitions/DDE-004-configuracoes-usuario.md` (campo `copyClue`, boolean, padrão `false`, inválido omitido na leitura) e `docs/entity-relationship-diagrams/ERD-004-configuracoes-usuario.md` (acrescentar `copyClue` à lista do `json settings`).

**Checkpoint**: `npm run typecheck && npm test` verdes.

## Phase 3: User Story 2 - Ligar e desligar a opção nos ajustes (P1)

**Goal**: opção "Copiar a dica" nos ajustes, desligada por padrão, guardada e sincronizada.

**Independent Test**: ajustes de instalação nova mostram a opção desligada; ligar, recarregar, continua ligada; "Restaurar padrões" desliga.

- [X] T005 [US2] Em `apps/web/src/features/settings/SettingsDialog.tsx`, acrescentar uma `Row` com `Switch` (`checked={settings.copyClue}`, `onChange={(next) => updateSettings({ copyClue: next })}`), título "Copiar a dica" e hint "Dois cliques numa dica copiam o texto, o tamanho da palavra e as letras já preenchidas.", ao lado das ajudas do jogo (antes do separador da cruzada padrão).
- [X] T006 [US2] Em `apps/web/src/features/settings/SettingsDialog.test.tsx`, testar: opção desligada em ajustes novos, ligar grava `copyClue: true` em `cruzadinha:settings`, "Restaurar padrões" volta a `false`, a opção tem nome acessível e estado (`role="switch"`, `aria-checked`).
- [X] T007 [P] [US2] Em `apps/web/src/features/settings/settings-store.test.ts` e `settings-sync.test.ts`, cobrir `copyClue` migrando de registro antigo sem o campo (vale `false`) e indo no corpo do PUT.

**Checkpoint**: US2 funciona sozinha (opção persiste), ainda sem efeito no jogo.

## Phase 4: User Story 1 - Copiar a dica com tamanho e letras (P1) 🎯 MVP

**Goal**: com a opção ligada, duplo clique na dica copia `dica (n): letras` e avisa.

**Independent Test**: opção ligada, palavra de 5 letras "Ter opinião" com A e R nas pontas, duplo clique na dica, texto copiado `Ter opinião (5): A___R`.

- [X] T008 [P] [US1] Criar `apps/web/src/game-logic/clue-text.ts` com `clueCopyText(index: PuzzleIndex, cells: (string | null)[][], word: Word): string` = `${word.clue} (${word.length}): ${letras}`, uma posição por `index.cellsOf(word)`, a letra da célula ou `_`, sem espaços; lê só `cells`, nunca a solução. Teste em `clue-text.test.ts`: `A___R`, letra errada copiada como digitada, tudo vazio `_____`, tudo preenchido, letra acentuada intacta, palavra vertical, letra de cruzamento, posições sempre = `length`.
- [X] T009 [US1] Criar `apps/web/src/features/game/useCopyClue.ts` (hook): lê `useSettings().copyClue`; devolve `copyClue(word)` ou `undefined` com a opção desligada (assim nada dispara, FR-003); recebe `paused` e não copia nem avisa com o jogo pausado (R7); chama `navigator.clipboard?.writeText(texto)` em `try/catch`; guarda `notice: 'copied' | 'failed' | null` com timer de ~2500 ms reiniciado a cada cópia; limpa o timer ao desmontar. Não despacha ação no reducer, não toca no relógio nem nas ajudas (FR-008).
- [X] T010 [US1] Criar `apps/web/src/features/game/CopyToast.tsx` + `CopyToast.module.css`: `role="status"` `aria-live="polite"`, `position: fixed` embaixo e centralizado, fora do fluxo (sem salto, FR-014), texto "Dica copiada" / "Não foi possível copiar", cores por tokens com contraste nos dois temas, `prefers-reduced-motion` sem animação; a região viva existe sempre e só o conteúdo muda.
- [X] T011 [US1] Ligar o duplo clique (a folha de dicas fica de fora: ela fecha ao primeiro clique): `ClueList.tsx` recebe `onCopy?: (word: Word) => void` e põem `onDoubleClick` no botão da dica quando definido; `ClueBar.tsx` recebe `onCopy` e o põe no texto da dica (`.live`), não nos botões anterior/próxima. Evitar a seleção de texto do duplo clique: `onMouseDown` com `event.detail > 1` chama `preventDefault()` (R4), ligado só quando `onCopy` está definido (com a opção desligada nada muda, SC-002); se atrapalhar o foco, usar `getSelection()?.removeAllRanges()` depois.
- [X] T012 [US1] Em `apps/web/src/features/game/GamePage.tsx`, chamar `useCopyClue`, passar `clock.paused` ao hook, `onCopy` a `ClueBar` e `ClueList` e renderizar `CopyToast`; funciona para visitante e conta e no modo leitura.
- [X] T013 [P] [US1] Testes: `ClueList.test.tsx`, `ClueSheet.test.tsx`, `ClueBar.test.tsx` (duplo clique chama `onCopy` com a palavra, clique simples não, botões anterior/próxima não) e `useCopyClue`/`GamePage.test.tsx` com `navigator.clipboard.writeText` simulado: opção ligada copia `Ter opinião (5): A___R` e mostra o aviso; opção desligada não copia nem avisa; duplo clique numa célula não copia; com o jogo pausado o duplo clique não copia nem avisa; mudar a opção com os ajustes abertos vale já para o jogo ao fundo; clipboard ausente ou rejeitado mostra "Não foi possível copiar" e o jogo segue; grade, relógio, contagem de ajudas e fila de salvamento intactos. Uma `vitest-axe` do toast nos dois temas.
- [X] T014 [US1] Criar `apps/web/e2e/copiar-dica.spec.ts` (conceder `clipboard-read`/`clipboard-write`): ligar nos ajustes, preencher a 1ª e a última letra, duplo clique na dica da lista e na barra, ler o clipboard; sem seleção de texto restante; o toast não move barra de ferramentas nem tabuleiro (`expectNear`, helpers de `e2e/support.ts`); dois temas; axe; visitante.

**Checkpoint**: US1 + US2 entregam a ajuda completa.

## Phase 5: User Story 3 - Fechar os ajustes ao clicar fora (P2)

**Goal**: clicar fora do painel fecha a janela de ajustes.

**Independent Test**: abrir ajustes, clicar fora fecha e o foco volta à engrenagem; clicar dentro não fecha.

- [X] T015 [US3] Em `apps/web/src/features/settings/SettingsDialog.tsx`, passar `closeOnBackdrop` ao `<Dialog>` (R6); não mexer no padrão `false` do `Dialog` (FR-012).
- [X] T016 [P] [US3] Em `SettingsDialog.test.tsx`, testar: `pointerdown` fora do painel fecha e devolve o foco; dentro (texto, controle, espaço vazio) não fecha; `pointerdown` dentro seguido de soltar fora não fecha; Esc e o botão de fechar continuam valendo. Verificar que um portal fora do painel (tooltip) não conta como clique fora; se contar, tratar no `Dialog` sem mudar os outros diálogos.
- [X] T017 [P] [US3] Em `apps/web/e2e/ajustes-configuracoes.spec.ts`, acrescentar um bloco `F033-US3`: clicar na área escurecida fecha; arrastar de dentro para fora não fecha; o diálogo de conclusão e as confirmações não fecham ao clicar fora.

## Phase 6: Polish & cross-cutting

- [X] T018 [P] Atualizar `CLAUDE.md` com um item "Feature 033" curto (campo `copyClue`, `clueCopyText`, `useCopyClue`/`CopyToast`, `closeOnBackdrop` nos ajustes, pedido de salvar tolerante).
- [X] T019 Rodar `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int` e o e2e (quickstart.md), e conferir a compatibilidade: site novo com API antiga (sem o campo) e site anterior com API nova (PUT sem `copyClue`).
- [ ] T020 Commits em Conventional Commits em inglês, sem atribuição de IA (regra do CLAUDE.md): `feat(shared): add copyClue setting`, `feat(web): copy clue on double click`, `feat(web): close settings on outside click`. Renomear a branch para `feat/033-copiar-dica` antes do push (`npm run check:branch`).

## Dependencies & Execution Order

- T001a (Context7) antes de qualquer código; Phase 2 (T001) bloqueia tudo; T002, T003 e T004 rodam em paralelo depois dela.
- US2 (T005–T007) depende da Phase 2. US1 (T008–T014) depende da Phase 2; T008 é independente de US2, mas T009 lê `copyClue` da store, e só dá para ligar a opção na tela depois de T005 (os testes de T013 podem gravar a store direto).
- US3 (T015–T017) é independente das outras e pode ir em paralelo; T015 e T005 mexem no mesmo arquivo, então ficam em sequência.
- Release: `shared` + API primeiro (A), site depois (B).

## Parallel example

T002, T003, T004 juntos após T001. T008 e T016 em paralelo com qualquer tarefa de outro arquivo.

## Implementation Strategy

MVP = Phase 2 + US2 + US1 (a ajuda ligável e funcionando). US3 pode ir no mesmo PR ou antes, por ser independente e pequena.
