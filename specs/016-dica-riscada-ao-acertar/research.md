# Research: Dica riscada só ao acertar a palavra

Nenhum item ficou como NEEDS CLARIFICATION no contexto técnico. As decisões abaixo saem da leitura do código atual (`GamePage.tsx`, `ClueList.tsx`, `ClueSheet.tsx`, `useGame.ts`, `game-logic/completion.ts` e `letters.ts`).

## R1. Onde fica a regra

- **Decision**: módulo puro novo `apps/web/src/game-logic/clue-strike.ts`, com `isWordSolved` e `struckWords`.
- **Rationale**: o princípio V pede regras de jogo em `game-logic`, sem React e com teste. Hoje o cálculo `filled` está dentro de `GamePage.tsx` e não tem teste próprio.
- **Alternatives considered**: deixar o `useMemo` em `GamePage` só trocando a condição (mantém a regra sem teste unitário e misturada com a tela); pôr no reducer como estado (seria dado redundante, recalculado a cada ação e sujeito a ficar fora de sincronia).

## R2. Modo de riscar preparado para a preferência futura (FR-006)

- **Decision**: `type StrikeMode = 'solved'` e `struckWords(index, cells, solution, mode)`. Uma constante `STRIKE_MODE: StrikeMode = 'solved'` em `useGame` é o único lugar que escolhe o modo.
- **Rationale**: a preferência futura ("ao preencher", "ao acertar", "nunca") só acrescenta valores à união e troca a constante por uma leitura da preferência; as telas recebem sempre um conjunto e não mudam. O `switch` com checagem exaustiva faz o TypeScript apontar o caso novo.
- **Alternatives considered**: já implementar `'filled'` e `'never'` sem tela para escolher (código morto, fora do escopo); booleano `onlySolved` (não comporta três modos).

## R3. Comparação das letras

- **Decision**: célula a célula, `cells[row][col] === plainLetter(solution.cells[row][col])`; uma célula vazia ou sem solução torna a palavra não resolvida.
- **Rationale**: é exatamente a comparação de `isSolved` (feature 010), então "É" na solução aceita "E" do jogador e a dica riscada nunca discorda da conclusão (FR-001, cenário 5). Letras reveladas por ajuda já vêm de `plainLetter` da solução, logo contam como certas (cenário 6).
- **Alternatives considered**: comparar a palavra inteira como texto (mesmo resultado, mas duplicaria a normalização por outro caminho).

## R4. Onde calcular e quem passa às telas

- **Decision**: `useGame` devolve `struck: ReadonlySet<string>`, com `useMemo` dependente de `game.index`, `solution` e `state.cells`. `GamePage` repassa para `ClueList` e `ClueSheet`.
- **Rationale**: `useGame` é quem tem a solução (`response.solution`) e já devolve `solved`. `GamePage` não precisa conhecer a solução. O memo por `state.cells` mantém o custo atual: recalcula só quando uma letra muda (SC-002). Retomar progresso de outro aparelho ou do visitante passa por `hydrate`, que troca `state.cells`, então o risco já sai certo ao abrir o jogo.
- **Alternatives considered**: expor `solution` em `Game` e calcular em `GamePage` (espalha a solução por mais um componente).

## R5. Texto para leitor de tela e estilo

- **Decision**: o texto oculto da dica riscada passa de ", preenchida" para ", resolvida" (FR-004). Uma dica completa mas errada não tem texto extra (cenário 8). A classe `.done` (cor `--mute`, `line-through` de 1 px, número incluído) continua igual. A barra da dica ativa (`ClueBar`/`WordBar`) não recebe risco.
- **Rationale**: a spec só muda quando o risco aparece; o estilo da feature 011 já foi aprovado nos dois temas.
- **Ajuste na implementação**: dica ativa e riscada ao mesmo tempo usa `--ink` em vez de `--mute` (`.active.done`). O axe no tema escuro mediu 4,44:1 para `--mute` sobre `--word`; o risco continua marcando a dica.
- **Alternatives considered**: `aria-description` ou `aria-label` completo no botão (o padrão atual com texto oculto já funciona com o nome acessível do botão e é testado por nome).

## R6. `wordKey`

- **Decision**: mover `wordKey(word)` (`"6across"`) de `features/game/ClueList.tsx` para `game-logic/clue-strike.ts`; `ClueList` e `GamePage` passam a importar de lá.
- **Rationale**: a regra pura devolve chaves no mesmo formato que as telas consultam; `game-logic` não pode importar de `features`.
- **Alternatives considered**: devolver `Set<Word>` (identidade de objeto frágil entre renders).

## R7. Modo leitura e casos de borda

- **Decision**: sem caso especial. No modo leitura a grade está certa (só se chega a ele por `isSolved`, ou por `viewCompleted`, que hidrata as letras da conclusão), então todas as palavras saem resolvidas pela própria regra (cenário 7). A ajuda "verificar" e as marcas (`marks`) não entram no cálculo.
- **Rationale**: uma única fonte de verdade (letras + solução), como pede a spec.
- **Alternatives considered**: forçar tudo riscado quando `mode === 'completed'` (mascara uma eventual grade inconsistente e cria um segundo caminho).

## R8. Cobertura de testes

- **Decision**:
  - Unitários de `struckWords`/`isWordSolved` para cada cenário da US1 e das bordas.
  - Componentes com `vitest-axe`: `ClueList` (riscada com ", resolvida"; completa e errada sem marca), `ClueSheet` (texto novo), a tela do jogo no computador e no celular (digita, apaga, corrige um cruzamento, "revelar palavra", "verificar", barra ativa sem risco), o visitante retomando e um concluído em modo leitura.
  - Um caso Playwright em `ajudas-e-retomada.spec.ts` com axe nos dois temas (SC-003), sem novo arquivo de spec (princípio VII: poucos caminhos ponta a ponta).
- **Rationale**: SC-001 pede 100% dos casos testados; o jsdom não avalia contraste, então os temas ficam no Playwright.
