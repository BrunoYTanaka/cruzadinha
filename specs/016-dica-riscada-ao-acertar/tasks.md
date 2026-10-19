---

description: "Task list for feature 016: dica riscada só ao acertar a palavra"
---

# Tasks: Dica riscada só ao acertar a palavra

**Input**: Design documents from `/specs/016-dica-riscada-ao-acertar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios. A constitution exige teste unitário de toda regra de jogo (V), a spec pede 100% dos casos testados (SC-001) e acessibilidade sem violações nos dois temas (SC-003). Os testes vêm antes da implementação e precisam falhar primeiro.

**Organization**: a spec tem uma única história (US1). As fases seguem o template: setup, base, US1 e acabamento.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (riscar a dica só quando a palavra está certa).
- Caminhos relativos à raiz do repositório. Só `apps/web` muda; API, banco e `packages/shared` não mudam (SC-004).

## Regras que valem para todas as tarefas

- Antes de escrever código que usa uma biblioteca (Testing Library, Vitest, Playwright), consultar a documentação atual pelo Context7 (constitution, Fluxo de Desenvolvimento).
- Sem `any`. Sem cor ou medida fixa: o estilo `.done` de `ClueList.module.css` não muda.
- O risco é derivado só de `state.cells` e da solução: nunca salvo, enviado, nem ligado a `marks`, `locked`, `usage`, relógio ou conclusão (FR-005, FR-007).
- Comentários em português, no tom e densidade do código ao redor. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- Commits em inglês, Conventional Commits, sem linha de coautoria. Escopo `web` ou `game-logic`.

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Rodar `npm test -w @cruzadinha/web` e `npm run typecheck` na branch `feat/016-dica-riscada-ao-acertar` e anotar que estão verdes antes de qualquer mudança

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: mover `wordKey` para `game-logic`, porque a regra pura e as telas precisam da mesma chave (research R6). Sem mudança de comportamento.

- [X] T002 Criar `apps/web/src/game-logic/clue-strike.ts` com `export function wordKey(word: Word): string` (`` `${word.number}${word.direction}` ``, por exemplo `"6across"`), movido de `apps/web/src/features/game/ClueList.tsx`; em `ClueList.tsx` e `apps/web/src/features/game/GamePage.tsx` importar `wordKey` de `../../game-logic/clue-strike` e apagar a definição antiga; rodar os testes de `features/game` para confirmar que nada mudou

**Checkpoint**: `wordKey` vem de `game-logic`; testes verdes.

---

## Phase 3: User Story 1 - Riscar a dica só quando a palavra está certa (Priority: P1) 🎯 MVP

**Goal**: a dica da lista (computador e celular) fica riscada e apagada se e somente se a palavra está completa e certa, e o leitor de tela ouve "resolvida".

**Independent Test**: num puzzle de teste, preencher uma palavra com as letras certas e outra com uma letra errada; só a primeira dica fica riscada, na lista do computador e na lista "Dicas" do celular.

### Tests for User Story 1 ⚠️

> Escrever primeiro e confirmar que falham.

- [X] T003 [P] [US1] Criar `apps/web/src/game-logic/clue-strike.test.ts` usando `makePuzzle`/`makeSolution` de `apps/web/src/test/fixtures.ts` e `buildIndex` de `navigation.ts`, cobrindo `isWordSolved(index, cells, solution, word)` e `struckWords(index, cells, solution, 'solved')`: palavra vazia e incompleta não resolvidas; completa e certa resolvida; completa com uma letra errada não resolvida (FR-002); solução com letra acentuada ("É") e jogador com "E" resolvida (FR-001, cenário 5); duas palavras que se cruzam, uma certa e outra errada, só a certa no conjunto; trocar a letra do cruzamento muda as duas (cenários 3 e 4); grade inteira certa põe todas as chaves no conjunto (cenário 7); uma grade 15 x 15 toda certa devolve todas as chaves (correção em tamanho grande, SC-002); as chaves seguem `wordKey` (`"1across"`)
- [X] T004 [P] [US1] Atualizar `apps/web/src/features/game/ClueList.test.tsx`: renomear a prop `filled` para `struck` em todos os `render`; caso novo com `struck={new Set(['1across'])}` em que o botão da dica 1 horizontal tem nome acessível terminando em ", resolvida" e a classe de riscado, e as outras dicas não têm texto extra; `expectNoA11yViolations`
- [X] T005 [P] [US1] Atualizar `apps/web/src/features/game/ClueSheet.test.tsx`: o caso "destaca a dica ativa e marca as preenchidas" passa a se chamar "destaca a dica ativa e marca as resolvidas", usa a prop `struck` no harness e espera `/Dica 1 horizontal.*resolvida/`
- [X] T006 [US1] Em `apps/web/src/features/game/GamePage.test.tsx` (com conta, usando o harness `apps/web/src/test/game-harness.tsx`), casos de tela com `mockMatchMedia(desktop)` (lista ao lado do tabuleiro): digitar as letras certas da palavra 1 horizontal risca a dica na lista ("…, resolvida") ao digitar a última letra; com essa palavra ativa e riscada, a barra da dica ativa não tem a classe de riscado nem o texto "resolvida" (borda da spec); trocar uma letra tira o risco na hora; preencher outra palavra com uma letra errada deixa a dica sem risco e sem texto extra; corrigir a letra errada pela palavra vertical que cruza risca a dica; "revelar palavra" numa palavra vazia risca a dica e os contadores de ajuda só mudam pela ajuda (FR-007); "verificar" não muda nenhum risco; abrir com progresso salvo da conta já mostra os riscos certos (`hydrate`). Um caso com `mockMatchMedia(phone)`: digitar a última letra certa, abrir "Dicas" e ver ", resolvida" na lista do celular (FR-003). `expectNoA11yViolations`
- [X] T007 [P] [US1] Em `apps/web/src/features/game/GuestGame.test.tsx`, caso novo: visitante com progresso guardado no IndexedDB (uma palavra certa e uma completa e errada) abre o jogo e só a dica certa aparece riscada; nenhum pedido novo é feito por causa do risco (FR-005)
- [X] T008 [P] [US1] Em `apps/web/src/features/game/ReadMode.test.tsx`, caso novo: um puzzle concluído aberto em modo leitura mostra todas as dicas de Horizontais e Verticais riscadas (cenário 7)

### Implementation for User Story 1

- [X] T009 [US1] Em `apps/web/src/game-logic/clue-strike.ts`, implementar `export type StrikeMode = 'solved'`, `isWordSolved(index: PuzzleIndex, cells: (string | null)[][], solution: Solution, word: Word): boolean` (verdadeiro só se toda célula de `index.cellsOf(word)` tem letra e `cells[r][c] === plainLetter(solution.cells[r][c])`; célula vazia ou sem solução torna a palavra não resolvida) e `struckWords(index, cells, solution, mode: StrikeMode): ReadonlySet<string>` com `switch (mode)` exaustivo (`'solved'`: chaves `wordKey` das palavras resolvidas). Comentário curto dizendo que a preferência futura acrescenta `'filled'` e `'never'` à união (FR-006). T003 passa
- [X] T010 [US1] Em `apps/web/src/features/game/useGame.ts`, declarar `const STRIKE_MODE: StrikeMode = 'solved'` (único lugar que escolhe o modo) e devolver `struck` calculado com `useMemo(() => struckWords(game.index, state.cells, solution, STRIKE_MODE), [game.index, state.cells, solution])`
- [X] T011 [US1] Em `apps/web/src/features/game/ClueList.tsx`, trocar a prop `filled` por `struck: ReadonlySet<string>` (comentário: "Palavras resolvidas (completas e certas), no formato \"6across\"."), `done = struck.has(wordKey(word))` e o texto oculto ", preenchida" por ", resolvida" (FR-004); em `apps/web/src/features/game/ClueSheet.tsx`, trocar `filled` por `struck` na prop e no repasse
- [X] T012 [US1] Em `apps/web/src/features/game/GamePage.tsx`, apagar o `useMemo` `filled` (e o import de `wordKey` se ficar sem uso), pegar `struck` de `useGame` e passá-lo a `ClueList` e `ClueSheet`. T004 a T008 passam
- [X] T013 [US1] End to end:
  - Em `apps/web/e2e/support.ts`, ao lado de `todaySolution` e sem repetir a URL: extrair o pedido de hoje para `todayPuzzle(request)`, que devolve `{ puzzle, solution }` do corpo de `/api/puzzles?level=daily&date=${brasiliaToday()}` (o contexto já tem o cookie da sessão, ou nenhum para visitante), e fazer `todaySolution` usá-lo. Criar `typeWord(page, word, letters)`, que para cada célula da palavra (a partir de `word.row`/`word.col`, avançando `length` células na `direction`) clica na célula pelo nome (`^Linha ${row + 1}, coluna ${col + 1},`, como `fillSolution`) e digita com `pressLetter`, para que a direção selecionada não importe. Criar `solveFirstAcrossWord(page)`: pega a primeira palavra com `direction === 'across'` de `puzzle.words` e digita `typedLetter` das letras da solução nas células dela; devolve `{ puzzle, solution }`. O layout vem sempre da resposta, nunca escrito à mão (o puzzle do seed sai da fixture do adaptador).
  - Em `apps/web/e2e/ajudas-e-retomada.spec.ts`, caso novo como visitante (com `resetAndSeed`, como os outros, e sem `login`; o teste de acessibilidade abaixo já cobre quem tem conta): abrir `/` e a cruzada de hoje do O Globo pelo cartão (`/^O Globo: /`), chamar `solveFirstAcrossWord(page)` e, com `typeWord`, preencher a segunda palavra horizontal de `puzzle.words` com, em cada célula, uma letra diferente da `typedLetter` da solução (as horizontais não se cruzam entre si); conferir que a dica certa tem nome acessível com "resolvida" e a errada não.
  - No teste `acessibilidade nas telas principais, tema ${theme}`, chamar `solveFirstAcrossWord(page)` depois de abrir a grade e antes do `audit` da tela do jogo, para o axe rodar com o riscado nos temas claro e escuro (SC-003).

**Checkpoint**: US1 completa e testável sozinha; a lista mostra só as palavras certas como resolvidas.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T014 [P] Atualizar `docs/design.md` (seção da lista de dicas): a dica fica riscada só quando a palavra está certa, com "resolvida" para leitor de tela; mencionar que a regra fica em `game-logic/clue-strike.ts` com o modo pronto para uma preferência futura
- [X] T015 [P] Acrescentar a feature 016 em "Current state" do `CLAUDE.md` (só `apps/web`; `struckWords`/`StrikeMode` em `game-logic/clue-strike.ts`; `useGame` devolve `struck`; ", resolvida"; substitui a regra "preenchida = riscada" das features 010 e 011)
- [X] T016 [P] Deixar o rastro nas specs antigas, sem reescrever os requisitos: em `specs/010-front-basico/spec.md` FR-012, acrescentar no fim a nota em itálico _Nota (feature 016): a dica só fica distinta (riscada) quando a palavra está certa; ver `specs/016-dica-riscada-ao-acertar/spec.md`._; em `specs/011-calendario-e-tamanho-tabuleiro/spec.md` FR-023, acrescentar _Nota (feature 016): a última frase foi substituída; a dica só fica riscada quando a palavra está certa (`specs/016-dica-riscada-ao-acertar/spec.md`, FR-001)._
- [X] T017 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` na raiz, e o e2e completo contra o banco `cruzadinha_e2e` (API própria na porta 3001, `E2E_WEB_PORT=4174`); corrigir o que falhar
- [X] T018 Seguir o roteiro manual de `specs/016-dica-riscada-ao-acertar/quickstart.md` em 1280 x 800 e 360 x 640, temas claro e escuro, como visitante e com conta; confirmar na aba Rede que o risco não gera pedido

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependência.
- **Foundational (T002)**: depois de T001; bloqueia a US1, porque `clue-strike.ts` nasce aqui.
- **US1 (T003–T013)**: depois de T002.
- **Polish (T014–T018)**: T014, T015 e T016 podem começar depois de T009; T017 e T018 depois de toda a US1.

### Within User Story 1

- Testes T003–T008 antes da implementação, falhando.
- T009 (regra) → T010 (`useGame`) → T011 (listas) → T012 (`GamePage`).
- T013 (e2e) depois de T012.

### Parallel Opportunities

- T003, T004, T005, T007 e T008 tocam arquivos diferentes e podem ser escritos juntos; T006 também é de outro arquivo, mas é o maior e depende de entender o harness, então fica em sequência.
- T014, T015 e T016 em paralelo entre si.

---

## Parallel Example: User Story 1

```text
Task: "T003 clue-strike.test.ts (regra pura)"
Task: "T004 ClueList.test.tsx (prop struck, ', resolvida')"
Task: "T005 ClueSheet.test.tsx (texto 'resolvida')"
Task: "T007 GuestGame.test.tsx (visitante retomando)"
Task: "T008 ReadMode.test.tsx (tudo riscado no modo leitura)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 e T002.
2. Testes T003–T008, falhando.
3. T009–T012 até os testes passarem.
4. T013 e validação; a US1 sozinha já é a feature inteira.

### Incremental Delivery

- Um commit para a mudança de `wordKey` (`refactor(web): …`), um para a regra e as telas com seus testes (`feat(web): strike a clue only when its word is right`), um para o e2e (`test(web): …`) e um para os docs e as notas nas specs antigas (`docs: …`).
