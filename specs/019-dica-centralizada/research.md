# Research: Dica no meio da altura da barra, balão acima da barra e dica resolvida riscada

## R1. Onde o texto da barra está hoje (medição)

**Finding**: Medido no Chromium (Playwright MCP), janela de 1440 × 900, zoom 100%, tema claro, cruzada O Globo de 15/10 do banco local, palavra "1 Horizontal". A barra (`.bar.navigable`) mede 56 px de altura. As medições são relativas ao topo da barra, cujo meio fica em 28 px:

| Medida | Número (`b.number`, 15 px negrito) | Dica (`span.text`, 17 px) |
| --- | --- | --- |
| Linha de base | 32,75 | 33,25 |
| Meio das maiúsculas (topo do "H" até a base) | 0,75 px acima do meio | 0,75 px acima do meio |
| Meio das minúsculas (topo do "x" até a base) | 0,75 px abaixo do meio | 0,75 px abaixo do meio |
| Centro das setas (`svg`) | no meio | no meio |

Numa captura de tela da barra (escala do dispositivo), a tinta das maiúsculas vai das linhas 21 a 32 de 56 (centro 26,5), a das setas de 21 a 34 (centro 27,5), e a das descendentes até a 35.

**Conclusões**:

1. Pelas maiúsculas, a barra já está centrada (dentro de 1 px). O autor vê o texto "um pouco para baixo" porque a dica é quase toda em minúsculas, e o meio delas fica 0,75 px abaixo do meio da barra e das setas. Pelas descendentes e cedilhas, a mancha do texto pesa para baixo. O autor escolheu o centro ótico, o meio das minúsculas (sessão de esclarecimento da spec).
2. Número e dica não dividem a linha de base: há 0,5 px de diferença (32,75 contra 33,25), contra a FR-004. Os dois são itens de um `flex` com `align-items: center` e alturas de linha diferentes (22,5 e 25,5 px), então cada um é centrado pela própria caixa.

## R2. Como subir o texto até o centro ótico (FR-001 a FR-004)

**Decision**: Duas declarações em `.navigable .live` (`ClueBar.module.css`), só na barra do computador:

- `align-items: baseline`: número e dica passam a dividir a linha de base (33,25 px). Isso corrige a FR-004 e deixa um deslocamento só para os dois.
- `translate: 0 -1px`: sobe o conjunto 1 px. Medido no navegador com as duas declarações aplicadas pelo console: o meio das minúsculas fica 0,25 px acima do meio da barra na dica e 0,25 px abaixo no número. Os dois ficam dentro da tolerância de 1 px da SC-001.

**Rationale**:

- `translate` não muda o layout. A altura da barra, a caixa da região viva, o corte com reticências e o balão (que é filho de `.bar`, não de `.live`) continuam iguais (FR-007). O deslocamento de 1 px inteiro evita texto borrado por posição de subpixel. O valor é o mesmo para todas as dicas, porque depende só da fonte e do tamanho, não das letras (FR-002). O `overflow: hidden` do `.text` acompanha o deslocamento.
- O texto da barra usa tamanhos fixos (15 e 17 px, Roboto servida pelo próprio site), então um valor em px não depende do navegador ter outra fonte.

**Alternatives considered**:

- `text-box: trim-both ex alphabetic`, que corta a caixa do texto do topo do "x" à base e deixa o `align-items: center` centrar pelas minúsculas: o `overflow: hidden` do `.text` (que faz as reticências) passaria a cortar maiúsculas, acentos e descendentes. Além disso, o Firefox não tem `text-box`.
- `translate: 0 -0.05em`: mede 0 px de erro na dica, mas é um deslocamento de subpixel (0,75 px a 15 px), que pode borrar o texto. 1 px fica dentro da tolerância.
- `padding-bottom` na barra: mudaria a altura da caixa e o centro das setas, que já estão certos.
- Mudar `line-height`: mexe na região viva e no balão, sem ganho sobre o `translate`.

**Teste**: o jsdom não faz layout, então a medição fica no e2e, numa função `xHeightCenter` em `sem-saltos.spec.ts`. Ela calcula a linha de base de cada filho da região viva com uma sonda `inline-block` de altura 0 alinhada à base, e o topo do "x" com `CanvasRenderingContext2D.measureText('x').actualBoundingBoxAscent` na fonte calculada do elemento. O teste roda em todas as palavras (`walkWords`), nos dois temas e com dica cortada (`lengthenClues`), e confere:

- o meio das minúsculas a no máximo 0,5 px do meio da barra e do centro das setas;
- as duas linhas de base iguais, com tolerância de 0,1 px.

As tolerâncias são mais apertadas que a de 1 px da SC-001 de propósito: com o CSS de hoje, o meio das minúsculas fica a 0,75 px e as linhas de base diferem 0,5 px, então o teste falha antes do código. Depois dele, os valores medidos são 0,25 px e 0 px.

## R3. Balão acima da barra (FR-015 a FR-018)

**Decision**:

- **CSS** (`ClueBar.module.css`): só na barra do computador, `.navigable .full` passa a ser `top: auto; bottom: calc(100% + 4px)` (acima da barra). A ponte invisível `.navigable .full::before` passa para baixo do balão (`top: 100%; bottom: auto`), cobrindo o vão de 4 px mais 1 px da borda entre o balão e a barra. `.navigable .full.below` traz de volta a posição da feature 018 (`top: calc(100% + 4px)`, `bottom: auto`, ponte com `top: auto; bottom: 100%`), usada só no recuo da FR-016. O `.full` sem `.navigable` não muda: na janela estreita sem teclado na tela (721 a 860 px), a barra sem botões fica na coluna de dicas, logo abaixo do tabuleiro (`.body` vira uma coluna só em `max-width: 860px`), e um balão acima dela cobriria as últimas linhas da grade (achado do `/speckit-analyze`). A sombra continua a mesma.
- **Recuo para baixo** (`ClueBar.tsx`): estado `placement: 'above' | 'below'`, voltando a `'above'` toda vez que o balão abre (no mesmo `setState` do temporizador). Um `useLayoutEffect` que depende de `open` lê `getBoundingClientRect()` do balão. Se o topo dele ficar acima de 0 (fora da janela), muda para `'below'`. É o padrão do exemplo de tooltip da documentação do `useLayoutEffect` do React (Context7, `/websites/react_dev_reference`): a medição e a troca acontecem antes de o navegador pintar, então o balão nunca aparece no lugar errado. O mesmo padrão de medir e guardar estado num `useLayoutEffect` já existe em `useMeasuredSpace.ts` e passa no lint (`eslint-plugin-react-hooks` 7).
- **Camadas**: a barra de ferramentas (`Toolbar.module.css`) não tem posicionamento nem `z-index`, e nenhum ancestral entre a barra e a página tem `overflow` que corte. Com `z-index: 4`, o balão pinta por cima do título, do relógio e dos botões, sem mudar a ordem com a alça (1), a capa de pausa (3) e a legenda (5).
- **Espaço**: medido a 1440 × 900, o topo da barra fica 142 px abaixo do topo da janela. Um balão de três linhas a 15 px (3 × 22,5 + 16 de padding + 2 de borda ≈ 86 px, mais 4 de vão) cabe acima. O recuo só aparece com a página rolada ou numa janela muito baixa.

**Rationale**: O balão acima deixa as primeiras linhas do tabuleiro à vista. A barra de ferramentas não muda enquanto a pessoa lê a dica, e o relógio continua contando por baixo. O resto do comportamento (temporizador, `openFor`, Esc, `pointerleave` da barra, `aria-hidden`) não muda, porque o balão continua filho da barra.

**Alternatives considered**:

- CSS anchor positioning com `position-try-fallbacks: flip-block`: faria o recuo sem JS, mas o Firefox ainda não tem, e o balão já está preso à barra com `position: absolute`.
- Decidir a posição no temporizador, antes de abrir, com uma altura estimada: a altura depende do número de linhas da dica e da largura da barra, então só dá para saber depois de renderizar.
- Portal para o `document.body`, como no exemplo do React: tiraria o balão de dentro da barra, e o `pointerleave` da barra fecharia o balão quando o mouse passasse para ele.

**Testes**:

- Unitários em `ClueBar.test.tsx`, com temporizadores falsos e `fireEvent`, como na feature 018:
  - o balão abre sem a classe de recuo;
  - com `getBoundingClientRect` do balão simulado com `top < 0`, abre com a classe `below`;
  - ao fechar e abrir de novo com espaço, volta para cima.
- E2e em `sem-saltos.spec.ts` (`018 US3`):
  - o teste "abre sem mover nada" troca `balloon.y > bar.y + bar.height` por `balloon.y + balloon.height < bar.y` e sobe o mouse da dica até o balão em passos, atravessando o vão;
  - confere que o balão não cobre a grade (`balloon.y + balloon.height <= grid.y`);
  - um caso novo dá espaço extra no fim da página só no teste (`padding-bottom` no `body`), rola até a barra ficar no topo (1280 × 800) e confere que o balão abre abaixo, sem depender do tamanho da cruzada;
  - o teste da janela estreita (800 px) passa a conferir que o balão abre abaixo da barra e não cobre nenhuma célula.

## R4. Dica resolvida riscada nas colunas de dicas (FR-010 a FR-014)

**Decision**: Em `ClueList.module.css`, `.done` ganha `text-decoration: line-through` e `text-decoration-thickness: 1px`, a mesma espessura da feature 016 (removida pelo commit `46aae34` da feature 017). A cor fica `--ink` (sem `--mute`), e o fundo `--ok-tint`, o visto e `.active.done` continuam como estão.

**Rationale**:

- `text-decoration` num elemento de bloco se propaga para os filhos em fluxo: número, dica e todas as linhas quebradas (FR-010). Não se propaga para descendentes com `position: absolute`, então o visto (`.check`, absoluto) não é riscado, e o texto oculto ", resolvida" (`.hidden`, absoluto e recortado) também não. O risco não muda a altura da linha nem a quebra, porque é pintura sobre o texto (FR-012).
- Sem `--mute`, o contraste fica o da feature 017: `--ink` sobre `--ok-tint` e sobre `--word`, que já passam pelo axe nos dois temas (FR-011). A feature 016 tinha registrado que `--mute` sobre `--word` fica abaixo de 4,5:1 no tema escuro, e é por isso que o texto não fica apagado.
- `ClueSheet` (painel de dicas do celular) usa o próprio `ClueList`, então recebe o risco sem mudança (FR-010 em todos os layouts). `ClueBar` e `WordBar` (barra de letras acima do teclado) não usam `.done` (FR-014).
- Nenhuma mudança em `ClueList.tsx`, `clue-strike.ts`, `struckWords` nem `useGame`: a regra de quando a dica está resolvida (feature 016) não muda.

**Alternatives considered**: riscar só o texto da dica e não o número; a spec pede número e texto (US3, cenário 1), como na feature 016.

**Testes**: o e2e da feature 017 em `sem-saltos.spec.ts` (`US3: a dica resolvida ganha fundo de sucesso e visto`) troca `expect(text-decoration-line).toBe('none')` por `'line-through'` na dica resolvida, confere `'none'` depois de desfeita, confere `color` igual a `--ink` (não apagada), e confere que a barra da dica (`clueBar`) continua com `none` com a palavra ativa resolvida. A altura da dica e das colunas já é conferida ali (`heights()`). O teste do modo leitura confere `line-through` em todas as dicas. O unitário de `ClueList.test.tsx` não muda: o jsdom não aplica o CSS dos módulos, e a classe `done` já é testada.

## R5. O que não muda

- Barra sem botões (celular, tablet, janela estreita de 721 a 860 px): a regra da R2 fica em `.navigable .live`, então só a barra do computador sobe. A barra de letras (`WordBar`) não muda.
- `ReadModeBanner`, `GamePage.module.css`, `board-size.ts`, `useMeasuredSpace.ts`: nada muda. A largura da barra (feature 018) também não.
- API, `packages/shared`, dados salvos e preferências do aparelho: nada muda.

## Context7

- React (`/websites/react_dev_reference`): o `useLayoutEffect` mede e reposiciona um tooltip antes da pintura (exemplo "Measuring layout before the browser paints", que troca para baixo quando não cabe acima).
- Playwright (`/microsoft/playwright`): `Locator.boundingBox()` é relativo à viewport e pode ser negativo com a página rolada; `mouse.move(x, y, { steps })` emite movimentos intermediários.
