# Research: Barra da dica com a largura do tabuleiro

## R1. Por que a barra alarga a coluna do tabuleiro hoje

**Finding**: No computador, `.desktop .board` (`GamePage.module.css`) é `flex: none`, então a coluna do tabuleiro tem a largura `max-content` dos filhos: a barra (ou a faixa de modo leitura) e o `boardWrap`. `.board > :first-child` tem `align-self: stretch`, por isso a barra ocupa a coluna toda. Antes da feature 017, a dica quebrava em várias linhas e a largura `max-content` da barra era a da dica inteira numa linha: uma dica longa deixava a coluna mais larga que o tabuleiro e empurrava `.clues` para a direita. É o que mostra a captura do autor, ainda com o "Salvo" da versão publicada.

A feature 017 (ainda não commitada) pôs `contain: inline-size` em `.bar` (`ClueBar.module.css`). Com contenção de tamanho na inline, a contribuição intrínseca da barra é calculada como se ela não tivesse conteúdo (só padding e borda), então a coluna passa a ter a largura do `boardWrap`, que é a da grade. Isso já atende FR-001 e FR-002 para a barra da dica.

**O que falta**:

1. **Tabuleiro estreito (FR-004)**: com a barra contida, a coluna pode ficar mais estreita que botões + número. Um 5 × 5 no mínimo da alça (30 px por célula) mede 5 × 30 + 4 de gap + 4 de padding = 158 px. Os dois botões (2 × 44 px), o padding de 4 px, os gaps e o número "1 Horizontal" (`flex: none`, ~110 px em 17 px bold) somam mais que isso. O número vazaria para fora da barra.
2. **Faixa de modo leitura (FR-006)**: `ReadModeBanner` também é o primeiro filho da coluna no computador e não tem contenção. O texto com o tempo e o botão "Jogar de novo" podem alargar a coluna num tabuleiro estreito.
3. **Nenhum teste prende a regra**: o e2e da 017 confere a altura da barra, a posição vertical da grade e a ausência de rolagem horizontal, mas não a largura da barra nem a posição das dicas.

## R2. Onde aplicar a regra de largura

**Decision**: Uma regra só em `GamePage.module.css`, no primeiro filho da coluna do tabuleiro no layout de computador (`.desktop .board > :first-child`): `contain: inline-size` e `min-width: var(--clue-bar-min)`. Ela vale para a barra e para a faixa de modo leitura, que se revezam nesse lugar. O `contain: inline-size` de `.bar` (017) fica como está, porque também protege os outros layouts.

**Rationale**: A largura é uma regra de disposição da página, não do componente: quem decide que a coluna mede o tabuleiro é a página. Uma regra só cobre os dois componentes, sem props novas.

**Alternatives considered**:

- Medir a grade em JS e passar a largura para a barra: mais código, um quadro com a largura antiga a cada redimensionamento, e o CSS já resolve.
- `width: 0; min-width: 100%` na barra: mesmo efeito do `contain`, menos legível e sem lugar para o mínimo.
- Grid com `grid-template-columns: min-content` na coluna: mudaria a estrutura de layout da feature 011 por um ganho que a contenção já dá.

## R3. Largura mínima (FR-004)

**Decision**: Token `--clue-bar-min: 320px` no próprio `GamePage.module.css` (escopo de `.desktop`), aplicado como `min-width` do primeiro filho. Com a contenção, `min-width` continua valendo e entra na contribuição intrínseca: a coluna fica com `max(grade, 320 px)`, a grade fica centralizada (`.board` tem `align-items: center`) e a barra ocupa a coluna.

**Rationale**: 320 px comporta 4 px + 44 + 4 + "99 Horizontal" (~115 px) + 10 + ~90 px de dica + 4 + 44 + 4. O tabuleiro 11 × 11 do Cruzada Online no mínimo (11 × 30 + 10 + 4 = 344 px) já passa disso, então o mínimo só aparece em grades pequenas (o 5 × 5 de amostra, por exemplo) com a alça perto do mínimo. O valor é confirmado no e2e (o número da direção nunca cortado com o 5 × 5 no mínimo).

**Alternatives considered**: `min-width: max-content` só no número: a barra acompanharia o comprimento de "1 Horizontal" contra "12 Vertical", e a largura voltaria a variar com a dica (contra FR-002).

## R4. Medição em teste

**Decision**: Ampliar `apps/web/e2e/sem-saltos.spec.ts` (feature 017), que já tem `lengthenClues`, `walkWords` e `box`. `walkWords` passa a conferir, no computador, que `x` e `width` da barra são iguais aos da grade (`getByRole('grid')`) e que `x` da região de dicas (`getByRole('complementary', { name: 'Dicas' })`) não muda. Um teste novo reduz o tabuleiro ao mínimo (alça com `Home`, como em `tamanhos.spec.ts`) e confere a largura mínima, o número inteiro e a barra centralizada sobre a grade; outro confere a faixa de modo leitura.

**Rationale**: Largura e posição só existem num navegador de verdade; o jsdom não faz layout. `Locator.boundingBox()` (Playwright, confirmado no Context7) devolve `x`, `y`, `width` e `height` relativos à viewport. A comparação usa tolerância de 1 px (`toBeCloseTo(value, 0)`) por arredondamento subpixel, com a mesma régua em todas as palavras.

## R5. O que não muda

- Celular/tablet (teclado na tela) e janela estreita (721 a 860 px): `.body` é uma coluna `1fr`, a barra já mede a coluna e não empurra as dicas. Nenhum CSS novo fora de `.desktop`.
- `useMeasuredSpace` e `board-size.ts`: o espaço disponível para o tabuleiro não depende da barra, então o tamanho padrão e a regra de caber na janela (feature 011) não mudam.
- `ClueBar.tsx` e `ReadModeBanner.tsx`: nenhuma mudança de marcação nem de props.

## R6. Dica completa ao parar o mouse (US3, FR-010 a FR-015)

**Decision**: Um balão próprio dentro de `ClueBar`, sem biblioteca nova:

- **Abrir**: `onPointerEnter` e `onPointerMove` no texto da dica (`.text`) (re)iniciam um temporizador de 500 ms se `event.pointerType !== 'touch'` e o balão ainda não está aberto; `onPointerLeave` do texto cancela o temporizador pendente. Contar desde o último movimento é o "mouse parado" da spec. Também cobre o caso, visto no e2e, em que o jogo abre embaixo de um mouse parado: o primeiro temporizador dispara antes de a dica estar medida como cortada e só um movimento depois tenta de novo. Quando o temporizador dispara, o balão abre só se o texto estiver cortado naquele momento (`scrollWidth > clientWidth`). A medição acontece uma vez, na hora de abrir, sem `ResizeObserver`.
- **Estado**: guarda a chave da palavra para a qual o balão abriu (`openFor: string | null`, com `wordKey` de `game-logic/clue-strike.ts`) e o mostra só quando `openFor === wordKey(word)`. Uma troca de palavra fecha o balão sem `useEffect` (FR-012). A chave, em vez do objeto `Word`, não depende de a página entregar sempre o mesmo objeto (hoje `index.wordAt` entrega).
- **Fechar**: `onPointerLeave` da barra inteira. O balão é filho da barra, então levar o mouse da dica para o balão não o fecha (conteúdo "hoverable", WCAG 1.4.13). Esc fecha por um `keydown` no `document`, registrado só enquanto o balão está aberto, como em `LegendButton.tsx`. O evento não é interrompido, então o Esc do tabuleiro (feature 011) continua valendo.
- **Posição**: `position: absolute` logo abaixo da barra (`top: calc(100% + 4px)`, `left: 0`, `right: 0`), com `.bar` em `position: relative`. O vão visual de 4 px entre a barra e o balão é coberto por uma ponte invisível, `.full::before` (`content: ''`, `position: absolute`, `left: 0`, `right: 0`, `bottom: 100%`, `height: 5px`, os 4 px do vão mais 1 px da borda). Pseudoelementos entram no teste de acerto do ponteiro do elemento, então o mouse que desce da dica para o balão nunca sai da barra nem do balão e não dispara o `pointerleave` da barra (FR-012). Sem a ponte, o mouse passaria por 4 px que não são de nenhum dos dois e o balão fecharia no caminho. Assim o balão tem a largura da barra, quebra o texto em linhas e não entra no fluxo (FR-013). O `contain: inline-size` da barra não corta o conteúdo que transborda, porque não é contenção de pintura. `z-index: 4`: acima da alça de tamanho (1) e da capa de pausa (3), abaixo da legenda (5).
- **Aparência**: `--surface`, texto `--ink`, borda `--line`, `--radius-md` e a mesma sombra do painel da legenda. Isso o separa do tabuleiro, e `--ink` sobre `--surface` já passa de 4,5:1 nos dois temas (FR-015). Fonte de 15 px, a mesma da barra. O axe pode deixar de avaliar o contraste de conteúdo com `aria-hidden`, então o e2e confere também que `color` e `background-color` calculados do balão são os valores de `--ink` e `--surface` do tema ativo. A combinação `--ink` sobre `--surface` é a do texto principal do site e já passa pelo axe em outras telas.
- **Leitor de tela**: o balão tem `aria-hidden="true"` (FR-014). A região viva já anuncia a dica inteira.
- **Teste**: `data-testid="full-clue"`, como `WordBar.tsx`, porque o balão não tem papel acessível e o texto também aparece na barra e na lista.

**Rationale**: O balão nativo (`title`) não segue o tema escuro (restrição da constituição: componentes leem tokens), tem atraso decidido pelo navegador e sistema, e apareceria também para dicas inteiras. `role="tooltip"` com `aria-describedby` não serve: a dica não recebe foco, e a região viva já faz o anúncio. Mostrar o balão só quando a dica está cortada evita repetir o texto visível.

**Alternatives considered**:

- Popover API / `anchor-positioning`: o balão já fica preso à barra com `position: absolute`, então não precisa de nenhum dos dois.
- Medir o corte continuamente para mostrar um indicador: fora do escopo; a reticência já indica o corte.
- Abrir também no foco dos botões anterior/próxima: o foco já está ocupado pela navegação, e quem usa o teclado tem a lista e o anúncio.

**APIs confirmadas no Context7**: `onPointerEnter`/`onPointerLeave` e `pointerType` do React (`/websites/react_dev_reference`); `userEvent.setup({ advanceTimers })` com `user.hover`/`user.unhover` (`/testing-library/user-event`), para os testes unitários com `vi.useFakeTimers()`, como em `ServerWake.test.tsx`.

**Testes**: unitários em `ClueBar.test.tsx` (jsdom não faz layout: o corte é simulado com `scrollWidth`/`clientWidth` por `vi.spyOn` no protótipo de `HTMLElement`): abre aos 500 ms e não antes; não abre sem corte; fecha ao sair, com Esc e com outra palavra; `aria-hidden`; continua aberto ao passar para o balão. No e2e, no computador com `lengthenClues`: `page.hover` na dica longa, o balão visível com a dica inteira em até 1 s, as caixas da grade, da barra e do `aside` iguais antes e depois; o mouse descendo em passos da dica até o balão, atravessando o vão, sem fechá-lo (o jsdom não pega esse caso, por não ter geometria); nenhum balão numa dica curta; Esc fecha; cores calculadas iguais aos tokens nos dois temas. No celular com toque (`hasTouch`), um toque na dica não abre o balão.
