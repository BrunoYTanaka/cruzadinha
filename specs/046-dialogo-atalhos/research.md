# Research: Diálogo com atalhos de teclado

Não havia NEEDS CLARIFICATION no contexto técnico; as decisões abaixo saem da leitura do código atual.

## R1. Uma só definição para a lista e o tabuleiro (FR-009, SC-002)

- **Decision**: `features/game/helpers/shortcuts.ts` guarda a tabela `SHORTCUT_GROUPS` (grupo → atalhos, cada um com teclas, ação e descrição) e a função pura `resolveBoardKey(key, shiftKey)`, que acha a ação percorrendo a mesma tabela. O `onKeyDown` do `Board` troca a cadeia de `if` por `resolveBoardKey`; o que fica no `Board` é só o que depende de estado do componente (o `releaseTab` do Esc e o `preventDefault`). O diálogo renderiza `SHORTCUT_GROUPS`.
- **Rationale**: se o tabuleiro só reage ao que está na tabela, não há como um atalho existir num lado e faltar no outro; o teste da SC-002 vira "para cada tecla da tabela, `resolveBoardKey` dá a ação dela; para teclas fora da tabela, dá `null`".
- **Alternatives considered**: manter o `Board` como está e escrever só um teste comparando os dois lados: mais simples, mas são duas fontes, contrário à FR-009. Gerar a dica escondida da grade (`hintId`) da tabela: fora do escopo; a dica continua como texto fixo.

## R2. Onde mora `BoardKey`

- **Decision**: o tipo `BoardKey` sai de `Board.tsx` para `shortcuts.ts`; `Board.tsx` faz `export type { BoardKey } from ...` para os importadores atuais (`board-keys.ts`, testes) não mudarem.
- **Rationale**: `.dependency-cruiser.cjs` usa `tsPreCompilationDeps: true`, então `shortcuts.ts → Board.tsx → shortcuts.ts` seria um ciclo mesmo com import de tipo. Não vai para `domain/game` porque `BoardKey` descreve o evento de teclado do componente, não uma regra do jogo (o reducer recebe `GameAction`, via `boardKeyToAction`).
- **Alternatives considered**: `domain/game/shortcuts.ts`: possível (é dado puro), mas mistura textos de interface no domínio.

## R3. Como o `?` é capturado (FR-004, FR-008)

- **Decision**: `onKeyDown` no elemento raiz do `GameScreen`, ligado só quando `!onScreenKeyboard`. Abre quando `event.key === '?'`, sem Ctrl/Alt/Meta, o alvo não é campo de texto (`input, textarea, select, [contenteditable]`) e o alvo está no DOM da página (`event.currentTarget.contains(event.target)`). Chama `preventDefault`. A tabela traz `?` como atalho do grupo "Ajuda" com ação `openShortcuts`, e `resolveBoardKey('?')` devolve `null` para o tabuleiro (quem abre é a página).
- **Rationale**: o evento do tabuleiro sobe até a página, então funciona com o foco no tabuleiro e nos botões da faixa. O `contains` é necessário porque eventos de portais do React sobem pela árvore do React: sem ele, `?` dentro do `CompletionDialog` (portal, mas filho do `GameScreen`) abriria o de atalhos por cima (caso "dois diálogos"). Com o diálogo de ajustes aberto, o `#root` fica `inert`, nada da página recebe foco, então o `?` não chega. Hoje `?` já cai no `Board` como `letter` e o reducer o ignora (`normalizeLetter` → `null`); com a tabela, nem é enviado.
- **Alternatives considered**: `keydown` em `document`: pegaria teclas de qualquer lugar e precisaria checar `inert` e diálogos à mão. Tratar `?` dentro do `Board`: não funcionaria com o foco nos botões da faixa.

## R4. Fechar sem mexer no tabuleiro (FR-005, FR-006, FR-007)

- **Decision**: nada novo; o `Dialog` já cumpre. Ele põe `inert` em `#root` (o tabuleiro não recebe teclas), escuta `keydown` em captura no `document` e faz `stopPropagation` no Esc (o Esc não chega ao `Board`, então `releaseTab` não liga), e devolve o foco ao elemento de origem ao fechar. Usar `closeButton` e `closeOnBackdrop`.
- **Rationale**: é o comportamento que os ajustes já têm; só precisa de testes que o fixem para este diálogo (Esc seguido de Tab continua mudando de palavra).

## R5. Relógio (FR-006)

- **Decision**: `useGame` recebe `dialogOpen?: boolean` e chama `useClock(..., settingsOpen || dialogOpen)`. O estado `shortcutsOpen` fica no `GameScreen`, declarado antes da chamada de `useGame`.
- **Rationale**: `helpers/clock.ts` já tem `suspended` independente de `manual` (pausa): suspender e liberar não toca na pausa, então fechar o diálogo com a partida pausada não a retoma.
- **Alternatives considered**: um store como `settings-open.ts`: desnecessário, o estado é local à tela do jogo.

## R6. Botão na faixa

- **Decision**: `ShortcutsButton`, botão de ícone (`buttonClass({ variant: 'icon' })`, ícone de teclado em SVG) com `aria-label="Atalhos de teclado"` e `Tooltip` com o mesmo texto, passado ao `Toolbar` por uma prop `shortcuts` posicionada como `sizeReset` (com separador). Aparece também em modo leitura (jogo concluído) e com a partida pausada.
- **Rationale**: o padrão de ícone + `Tooltip` já existe (`SettingsButton`); ícone não alarga a faixa. Não reaproveita o `LegendButton` ("?" redondo da legenda de cores): é outro assunto e existe também no celular.

## R7. Nomes das teclas (clarificação 4)

- **Decision**: cada tecla da tabela tem `label` (o que aparece, dentro de `<kbd>`) e, quando o rótulo é símbolo, `spoken` (o nome lido): `↑` "seta para cima", `↓` "seta para baixo", `←` "seta para a esquerda", `→` "seta para a direita". O símbolo fica `aria-hidden` e o nome em `VisuallyHidden`. Letras aparecem como "A a Z" (sem tecla real; `resolveBoardKey` trata qualquer caractere único que não seja `?` como `letter`, como hoje).
- **Rationale**: o leitor de tela anuncia o nome; quem enxerga vê o símbolo do teclado.
