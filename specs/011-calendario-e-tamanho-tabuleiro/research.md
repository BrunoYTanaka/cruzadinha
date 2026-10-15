# Research: Calendário mais largo e tamanho ajustável do tabuleiro

Decisões de design da feature 011, já com as respostas de 2026-10-15: tabuleiro e calendário são redimensionados por uma alça de arrastar, e o tabuleiro mantém o botão "Tamanho padrão".

Documentação consultada via Context7:

- React: `useLayoutEffect` para medir antes da pintura; `onPointerDown`/`onPointerMove`/`onPointerUp`/`onPointerCancel`/`onLostPointerCapture` e `setPointerCapture` para arrastar.
- Playwright: `test.use({ viewport })` por bloco, `locator.boundingBox()` e `page.mouse` para arrastar.

No ambiente de teste, o jsdom 30.1 do repositório tem `PointerEvent`, mas não tem `setPointerCapture`.

## R1. Quando vale o "layout de computador"

- **Decision**: o novo layout, as alças e as preferências guardadas valem quando `!useOnScreenKeyboard() && useMediaQuery('(min-width: 861px)')`. A combinação fica no hook `useDesktopLayout()`. Na tela de jogo, o resultado vira uma classe (`styles.desktop`), e o CSS novo fica todo sob essa classe. A biblioteca não tem teclado na tela, então usa só `(min-width: 861px)`, tanto no CSS quanto para mostrar a alça.
- **Rationale**: hoje há duas regras que não coincidem. O CSS troca para uma coluna em 860 px, e o JS (`ON_SCREEN_KEYBOARD_QUERY`, `(pointer: coarse), (max-width: 720px)`) decide se a dica vai acima do tabuleiro e se aparece o teclado. Uma condição só, calculada em JS e aplicada por classe, evita que um tablet receba metade do layout novo. Celular, tablet e janelas de até 860 px mantêm o layout da feature 010 (FR-013, SC-006); só os ajustes visuais de FR-023 a FR-027, que não dependem de `useDesktopLayout`, valem também neles.
- **Alternatives considered**: só uma media query CSS (a alça, que é JS, sairia de sincronia com o layout); usar 720 px como limite (contraria o limite de 860 px da feature 010 fixado na spec).

## R2. Tamanho padrão do tabuleiro (FR-004)

- **Decision**: medir o espaço em JS e passar o tamanho da célula ao tabuleiro por uma variável CSS inline (`--cell-size: Npx`). As contas ficam em funções puras em `apps/web/src/features/game/board-size.ts`:
  - `cellFor(space, count)`: o maior inteiro `c` com `count·c + (count−1)·1 + 4 ≤ space`. O 1 é o `gap` entre células e o 4 é o `padding` de 2 px da grade.
  - `fitCellSize({ width, height, cols, rows })`: `clamp(30, min(cellFor(width, cols), cellFor(height, rows)), 110)`.
  - `maxCellSize({ width, cols })`: `clamp(30, cellFor(width, cols), 110)`, o limite pela largura.
  - `resolveCellSize({ fit, max, chosen })`: sem escolha, `fit`; com escolha, `clamp(30, chosen, max)` (FR-011).

  A medida fica num hook próprio, `useMeasuredSpace`. O `useBoardSize` usa essa medida para as contas e cuida da escolha. A separação deixa os testes de componente simularem só a medida e exercitarem a escolha de verdade. O `useMeasuredSpace` mede, com `useLayoutEffect`, um `ResizeObserver` no corpo da tela de jogo e o evento `resize` da janela:
  - **Largura disponível**: largura interna do corpo − `--clues-width` − `gap`.
  - **Altura disponível**: `window.innerHeight` − topo do corpo − margens − 56 px (altura de uma linha da barra da dica ativa) − `gap` da coluna.

  O cálculo usa a altura mínima da barra, e não a medida. Assim o tabuleiro não muda de tamanho cada vez que a dica ativa muda de comprimento.
- **Rationale**: o JS precisa do padrão e do máximo para limitar o arraste e anunciar "N de M". Com `useLayoutEffect`, a medida acontece antes da pintura, então o tabuleiro não aparece num tamanho e pula para outro. Medir o corpo, em vez de usar os 200 px fixos de hoje, inclui os avisos de altura variável.
- **Fallback**: no jsdom e em qualquer medida zerada, o hook devolve `null` e a grade não recebe o estilo inline. Nesse caso vale a fórmula CSS atual de `Board.module.css`, e os testes de componente existentes continuam iguais.
- **Alternatives considered**: CSS puro com `min()` (o JS não saberia os limites do arraste); `container queries` (resolvem a largura, mas não a altura da janela menos o que fica acima do tabuleiro).

## R3. Layout do bloco centralizado (FR-001 a FR-003)

- **Decision**: sob `.desktop`, o corpo vira `display: flex; justify-content: center; align-items: stretch; gap: 24px`:
  - A coluna do tabuleiro tem `flex: none`. A largura vem da grade, e a barra da dica ativa já se estica a ela (`.board > :first-child { align-self: stretch }`).
  - A coluna de dicas tem `flex: 0 1 var(--clues-width)`, com `--clues-width: 560px`, que é 29% de 1920 px (SC-001). Ela se estica à altura da coluna do tabuleiro.
  - Dentro da coluna de dicas, um invólucro com `position: sticky; top: 16px; height: min(100%, calc(100dvh - 32px))` mantém as dicas visíveis quando a página rola (FR-007).
  - As listas usam `grid-template-columns: 1fr 1fr`, e cada grupo tem `overflow-y: auto` e `min-height: 0`. O `max-height: 600px` atual sai no computador.
- **Rationale**: é o arranjo do mockup aprovado. Com `stretch`, as colunas acompanham a altura do tabuleiro sem medida em JS.
- **Alternatives considered**: grid `minmax(0, 1fr) 560px` (deixa espaço vazio entre o tabuleiro e as dicas, que é justamente a queixa); calcular a altura das listas em JS (desnecessário).

## R4. Barra da dica ativa acima do tabuleiro, com anterior e próxima (FR-002)

- **Decision**: no computador, `GamePage` renderiza a barra (`ClueBar` ou `ReadModeBanner`) dentro da coluna do tabuleiro, como já faz no celular. `ClueBar` ganha as props opcionais `onPrevious` e `onNext`. Quando presentes, a barra mostra os botões de 44 px "Dica anterior" e "Próxima dica", que despacham `previousWord`/`nextWord`, ações que o reducer já tem, e devolvem o foco ao tabuleiro. A barra continua com `aria-live="polite"`. No celular as props não são passadas.
- **Rationale**: reaproveita a navegação entre palavras do `game-logic`, sem regra nova (princípio V).
- **Alternatives considered**: uma barra nova só para o computador (duplicaria o anúncio do leitor de tela).

## R5. Rolagem: célula selecionada e dica ativa (FR-003, FR-007)

- **Decision**:
  - **Célula selecionada**: quando a seleção muda no layout de computador, a tela chama `scrollIntoView({ block: 'nearest', inline: 'nearest' })` na célula, que rola a página só o necessário.
  - **Dica ativa**: quando a palavra ativa muda, a lista ajusta só o `scrollTop` do próprio grupo, sem `scrollIntoView`.
  - **Movimento**: sempre `behavior: 'auto'`, sem rolagem suave, o que respeita a preferência de reduzir movimento.
- **Rationale**: o `scrollIntoView` num elemento de dentro de uma lista também rolaria a página. O tabuleiro tem uma só parada de tabulação, com `aria-activedescendant`, então o foco não muda de elemento e o navegador não rola sozinho.

## R6. Alça de redimensionar compartilhada (FR-005, FR-006, FR-014, FR-019 a FR-022)

- **Decision**: um componente genérico `apps/web/src/components/ResizeHandle.tsx`, sem conhecer tabuleiro nem calendário.
  - **Props**: `value`, `min`, `max`, `step`, `label` (nome acessível), `valueText(value)`, `fromDrag({ startValue, dx, dy })` (converte o deslocamento do ponteiro em valor), `onChange(value)` (durante o arraste e no teclado), `onCommit(value)` (ao soltar o mouse e a cada tecla), `onReset()` (clique duplo), `variant: 'corner' | 'edge'` (só o desenho) e `decorative?: boolean`. Com `decorative`, a alça fica só visual e de ponteiro: sem `role`, sem `aria-value*`, com `aria-hidden="true"` e `tabIndex={-1}` e sem teclado. É o caso da pegada de canto do calendário, que repete a alça da borda. Assim o leitor de tela e o Tab veem uma alça só, e o `axe` não acusa um elemento escondido que recebe foco.
  - **Semântica**: um elemento focável (`tabIndex={0}`) com `role="slider"`, `aria-orientation="horizontal"`, `aria-valuemin`/`aria-valuemax`/`aria-valuenow`, `aria-valuetext` e `aria-label`.
  - **Teclado**: seta para a esquerda ou para baixo diminui `step`, seta para a direita ou para cima aumenta `step`, e Home e End vão ao mínimo e ao máximo. Cada tecla chama `onChange` e `onCommit` e usa `preventDefault`.
  - **Mouse e caneta**:
    - `onPointerDown` (só o botão principal) guarda o ponto e o valor inicial e chama `setPointerCapture?.(pointerId)` (opcional porque o jsdom não tem);
    - `onPointerMove` calcula `fromDrag` e chama `onChange`, limitado a `min`..`max` e agrupado num `requestAnimationFrame`;
    - `onPointerUp`, `onPointerCancel` e `onLostPointerCapture` encerram o arraste e chamam `onCommit` com o último valor válido (FR-006, caso de arraste interrompido);
    - `onDoubleClick` chama `onReset`.
  - **Visual**: alvo de 44 × 44 px (`variant="corner"`) ou faixa de 44 px de largura na borda (`variant="edge"`), com cursor `nwse-resize` ou `ew-resize`, desenho por token (`--mute` em repouso e `--accent` no hover e no foco), foco visível e `touch-action: none`.
- **Rationale**: `role="slider"` é o papel ARIA de um controle de valor contínuo com setas, Home e End, e o `eslint-plugin-jsx-a11y` exige os atributos `aria-value*`, que já são o anúncio pedido ("Tamanho do tabuleiro 80 de 110"). Um componente só garante o mesmo gesto e o mesmo teclado nas duas telas (SC-009). A lógica de limite e conversão fica em funções puras, testáveis sem ponteiro real.
- **Alternatives considered**: `role="separator"` focável (padrão "window splitter"), que descreve uma divisão entre painéis, não o tamanho de um elemento; `resize: horizontal` do CSS, sem teclado, sem limite dinâmico e sem evento para guardar; `<input type="range">` escondido atrás da alça, que duplicaria o foco.

## R7. Arraste do tabuleiro (FR-005, FR-006)

- **Decision**:
  - **Posição**: alça `variant="corner"` no canto inferior direito da grade, posicionada em `.boardWrap` (já `position: relative`), metade para fora da grade, para não cobrir a última célula.
  - **Conversão**: `cellFromDrag({ startCell, dx, dy, cols, rows })` em `board-size.ts` (pura). Como o bloco é centralizado, a borda direita anda metade do que a grade cresce. A largura conta em dobro, e vale o eixo em que a pessoa mexeu mais:
    - candidato horizontal: `startCell + 2·dx / cols`;
    - candidato vertical: `startCell + dy / rows`;
    - o resultado é arredondado para inteiro.

    Assim o canto acompanha o ponteiro (FR-005).
  - **Limites**: `min = 30` e `max = maxCellSize(...)`.
  - **Teclado**: `step = 10`.
  - **`valueText`**: "Tamanho do tabuleiro N de M", acrescido de ", padrão" quando não há escolha.
  - **Guardar**: `onCommit` grava com `saveBoardSize`.
  - **Restaurar**: `onReset` e o botão "Tamanho padrão" chamam `clearBoardSize`.
  - **Foco**: depois de um arraste com mouse, o foco volta ao tabuleiro (`#board`), para a pessoa seguir digitando. Pelo teclado, o foco fica na alça.
  - **Visibilidade**: a alça some durante a pausa, junto com o tabuleiro coberto, e aparece no modo leitura.
- **Rationale**: o tamanho guardado é por célula (spec, Assumptions), então a conversão trabalha em células. Arredondar para inteiro mantém a grade nítida.
- **Alternatives considered**: usar só o eixo horizontal (num tabuleiro limitado pela altura, a pessoa tende a arrastar para baixo); não dobrar `dx` (o canto andaria à frente do ponteiro).

## R8. Botão "Tamanho padrão" do tabuleiro (FR-005, FR-010)

- **Decision**: componente `BoardSizeReset` (botão de texto "Tamanho padrão", alvo de 44 px), passado em `Toolbar` pela prop opcional `sizeReset?: ReactNode`, no primeiro grupo, depois do link do calendário e de um separador. Fica `disabled` quando não há escolha e só aparece no layout de computador. Não há botões de aumentar e diminuir.
- **Rationale**: é o que a pessoa pediu ("deixa o botão de resetar"). Deixar o botão sempre visível, desativado no padrão, mostra que existe um tamanho padrão para onde voltar.

## R9. Preferências guardadas (FR-009 a FR-012, FR-021)

- **Decision**: duas chaves no `localStorage`, lidas e gravadas por `lib/storage.ts`, que já engole as exceções. O valor bruto entra como `unknown` e passa por Zod.

  | Chave | Valor | Schema | Dono |
  |---|---|---|---|
  | `cruzadinha:board-size` | `{"cellSize": N}` | `z.object({ cellSize: z.number().int().min(30).max(110) })` | `features/game/board-size.ts` |
  | `cruzadinha:library-width` | `{"width": N}` | `z.object({ width: z.number().int().min(720).max(1600) })` | `features/library/library-width.ts` |

  - **Leitura inválida**: qualquer falha devolve `null`, que significa padrão ou ajuste automático.
  - **Escrita**: no `onCommit`, ou seja, ao soltar o mouse e a cada tecla, nunca a cada movimento.
  - **Restaurar**: remove a chave.
  - **Abas**: a escolha é lida quando a tela monta, sem ouvir o evento `storage`.
  - **Troca de layout**: a escolha também é lida de novo toda vez que a condição de computador passa de falsa para verdadeira, por exemplo numa janela que abriu estreita e depois foi alargada. Sem isso, a escolha guardada não voltaria a valer, ao contrário do que pede o caso-limite "mudança do tamanho da janela". Enquanto a condição é falsa, a escolha é ignorada, mas nunca apagada.
- **Rationale**: segue `theme.ts` e `help-storage.ts` (princípio I). Gravar só ao soltar evita escrever no armazenamento a cada quadro do arraste. Um objeto, em vez de um número solto, deixa espaço para versões futuras.

## R10. Calendário redimensionável (FR-015 a FR-022)

- **Decision**:
  - **Largura padrão**: `LibraryPage.module.css` passa a usar, sob `@media (min-width: 861px)`, `max-width: var(--library-width, var(--library-max))`, com `--library-max: 1632px` (1600 + margens). Com escolha, `LibraryPage` define `--library-width` inline como `escolha + 2·gutter`. O título, o botão "Jogar a de hoje", o aviso e a legenda acompanham a mesma largura, então o conteúdo da biblioteca é uma coluna só, centralizada.
  - **Alça**: `ResizeHandle variant="edge"` na borda direita do `section` do mês (`position: relative`), com a altura toda. Um segundo desenho no canto inferior direito, só visual, com `aria-hidden` e os mesmos manipuladores de ponteiro, é a "pegada" de canto. Só o primeiro é focável.
  - **Conversão**: `widthFromDrag({ startWidth, dx }) = round(startWidth + 2·dx)`, também dobrado por causa da centralização.
  - **Limites**: `min = 720`; `max = min(1600, largura disponível)`, medida pelo pai do `.page` com `ResizeObserver`.
  - **Teclado**: `step = 40`.
  - **`valueText`**: "Largura do calendário N de M", acrescido de ", automático" sem escolha.
  - **Restaurar**: só o clique duplo (FR-021), que apaga a escolha.
  - **Proporção dos dias**: o `section` do mês ganha `container-type: inline-size`. Dentro de `@media (min-width: 861px)`:
    - `.day` com `min-height: clamp(56px, min(calc(100cqi / 14), calc((100dvh - 400px) / 6)), 112px)`;
    - `.number` com `font-size: clamp(14px, 1.25cqi, 20px)`;
    - `.status` com `font-size: clamp(10.5px, 0.95cqi, 15px)`.

    Assim os dias acompanham a largura do calendário, e não a da janela (FR-019), e a altura continua limitada para um mês de seis semanas caber em 1080 px (FR-016).
  - **Sem medida** (jsdom): a alça usa `max = 1600` e o CSS resolve o resto.
- **Rationale**: as unidades de contêiner (`cqi`) fazem a proporção sem JS. Valem nas duas últimas versões dos navegadores-alvo do projeto. Aplicar a largura à coluna inteira evita um calendário estreito sob um título largo.
- **Alternatives considered**: largura só no `section` do mês (título e legenda desalinhados); unidades `vw` (os dias não acompanhariam o arraste).

## R11. Testes

- **Decision**:
  - **Unitário** (Vitest, sem layout):
    - `board-size.test.ts`: `cellFor`, `fitCellSize`, `maxCellSize`, `resolveCellSize`, `cellFromDrag` (dobro no eixo horizontal, eixo dominante, arredondamento, limites) e a leitura da preferência com valores inválidos;
    - `library-width.test.ts`: `widthFromDrag`, limites e preferência.
  - **Componente**:
    - `ResizeHandle.test.tsx`: atributos `aria-value*`, setas, Home e End, clique duplo e um arraste simulado com `fireEvent.pointerDown/Move/Up` e `clientX`/`clientY`. Como o jsdom tem `PointerEvent` mas não `setPointerCapture`, o componente chama a captura de forma opcional. Também passa no `vitest-axe`;
    - `GamePage.test.tsx`: layout de computador e celular, alça e "Tamanho padrão" só no computador, e a preferência aplicada e apagada;
    - `LibraryPage.test.tsx`: alça só com `(min-width: 861px)` e preferência aplicada como `--library-width`.
  - **Ponta a ponta** (Playwright, `test.use({ viewport })`):
    - em 1920 × 1080, mede o layout (SC-001, SC-002);
    - arrasta as duas alças com `page.mouse.move/down/move/up` até os limites, recarrega e confere a largura e o tamanho com tolerância de 1 px (SC-003, SC-008);
    - usa só o teclado nas alças (SC-009);
    - confere que não há rolagem horizontal em 861 e 2560 px (SC-004);
    - mede a biblioteca (SC-005);
    - em 360 × 740 com toque, confere que nada mudou (SC-006).
- **Rationale**: o jsdom não calcula layout, então as medidas reais ficam no Playwright, e as regras de cálculo ficam em funções puras testadas sem navegador (princípio VII).
