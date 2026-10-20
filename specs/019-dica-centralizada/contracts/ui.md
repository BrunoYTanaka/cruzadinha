# UI Contract: Dica no meio da altura da barra, balão acima da barra e dica resolvida riscada

A API não muda. Este contrato descreve o que a tela de jogo garante e como os testes o verificam. As props de `ClueBar` (`word`, `onPrevious?`, `onNext?`) e de `ClueList` (`puzzle`, `activeWord`, `struck`, `onSelect`, `fill?`) não mudam.

## 1. Texto da barra no computador (`ClueBar` com anterior e próxima)

| Garantia | Spec | Verificação |
| --- | --- | --- |
| O meio das minúsculas do número e da dica fica a no máximo 1 px do meio da barra (o teste usa 0,5 px) | FR-001, SC-001 | e2e: `xHeightCenter` em todas as palavras (`walkWords`), com `lengthenClues`, nos dois temas |
| O meio das minúsculas fica a no máximo 1 px do centro das setas anterior e próxima | FR-001, SC-001 | e2e: mesmo teste, contra o centro do `svg` dos dois botões |
| Mesma posição vertical em todas as dicas, com acento, descendente ou corte | FR-002, SC-004 | e2e: compara a linha de base da dica entre todas as palavras (±0,1 px, ou seja, sem variação de pixel) |
| Texto alinhado à esquerda, começando no mesmo `x` em todas as dicas | FR-003, SC-002 | e2e: `x` do número igual em todas as palavras (±0,1 px) |
| Número e dica na mesma linha de base | FR-004, SC-001 | e2e: diferença das linhas de base ≤ 0,1 px |
| Dica longa cortada com reticências, número inteiro | FR-005, SC-003 | e2e da feature 017, mantido |
| "Escolha uma célula para começar." segue a mesma regra | FR-006 | por construção: a frase fica dentro da mesma região viva `.live` (`ClueBar.tsx`) que recebe a regra; o jogo sempre abre numa palavra, então o e2e não chega a esse estado. Conferido na revisão do T004 |
| Barra, grade e `aside` "Dicas" com as mesmas caixas de antes da feature, em todas as palavras | FR-007, SC-004 | e2e da feature 018 (`walkWords`, `expectBarFollowsGrid`), mantidos |
| Região viva com a dica inteira; axe sem violações | FR-008, SC-005 | unitário existente em `ClueBar.test.tsx` + axe existente no e2e |

## 2. Balão com a dica completa (`ClueBar`)

| Garantia | Spec | Verificação |
| --- | --- | --- |
| No computador, abre acima da barra: `balloon.y + balloon.height` a 4 px de `bar.y` (±1), mesma largura da barra | FR-015, SC-009 | e2e `018 US3`, adaptado |
| Não cobre nenhuma célula: a base do balão fica acima do topo da grade | FR-015, SC-009 | e2e: `balloon.y + balloon.height <= grid.y` |
| Subir o mouse da dica até o balão, atravessando o vão, não o fecha (ponte `.full::before` embaixo do balão) | FR-017 | e2e: `mouse.move` em passos da dica até o meio do balão |
| Abrir e fechar não move grade, barra, barra de ferramentas nem `aside` | FR-017, SC-009 | e2e: caixas antes, com o balão aberto e depois, incluindo o `h1` da barra de ferramentas |
| Sem espaço acima na janela: abre abaixo, como na feature 018 | FR-016 | unitário (`getBoundingClientRect` simulado com `top < 0` → classe `below`) + e2e (1280 × 800 com espaço extra no fim da página só no teste, rolada até a barra ficar no topo) |
| Janela estreita sem teclado na tela (800 px): o balão abre abaixo da barra, que fica abaixo do tabuleiro, e não cobre nenhuma célula | FR-018, SC-010 | e2e `018 US3` da janela estreita, com `balloon.y >= bar.y + bar.height` e `balloon.y >= grid.y + grid.height` |
| Volta a abrir acima quando há espaço de novo | FR-016 | unitário: fechar, simular `top >= 0`, abrir de novo |
| Intervalo, só dica cortada, sem toque, Esc, troca de palavra, `aria-hidden`, cores do tema | FR-017 | unitários e e2e da feature 018, mantidos |

## 3. Dica resolvida nas colunas de dicas (`ClueList`, também dentro de `ClueSheet`)

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Dica resolvida com `text-decoration-line: line-through`, fundo `--ok-tint` e visto | FR-010, SC-007 | e2e da feature 017 (US3), com a asserção trocada de `none` para `line-through` |
| Texto na cor `--ink`, inclusive ativa (`--word`) | FR-011 | e2e: `color` igual a `--ink` nos dois temas, resolvida e também ativa e resolvida, + axe |
| Desfeita: sem risco, sem fundo e sem visto | FR-010, SC-007 | e2e: `none` depois de `Delete` |
| Altura da dica e das colunas igual antes e depois de riscar | FR-012, SC-008 | e2e: `heights()` existente |
| ", resolvida" oculto e visto `aria-hidden` como hoje | FR-013 | unitários existentes em `ClueList.test.tsx` |
| Modo leitura: todas riscadas | FR-010 | e2e "no modo leitura", com `line-through` em todas |
| Barra da dica acima do tabuleiro sem risco, mesmo com a palavra ativa resolvida | FR-014 | e2e: `text-decoration-line` de `clueBar` igual a `none` |

## 4. Fora do computador

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Barra sem botões e barra de letras sem deslocamento nem risco | FR-009, FR-014 | e2e da feature 017 (celular e janela estreita), mantidos |
| Painel de dicas do celular com a dica resolvida riscada | FR-010 | coberto pelo mesmo `ClueList`; conferência manual no quickstart |
| Nenhuma mudança na API, em `packages/shared` nem nos dados | SC-006 | diff restrito a `apps/web` e docs |
