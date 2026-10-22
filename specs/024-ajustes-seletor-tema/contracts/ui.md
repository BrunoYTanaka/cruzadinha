# UI Contracts: Ajustes de layout e animação nas configurações e no botão de tema

Sem rota, esquema nem formato de dado novo. Os contratos abaixo são os de interface que os testes conferem.

## Tooltip

- Props inalteradas: `label`, `placement` (`below` | `above`), `children`.
- Abre só com mouse parado ou foco do teclado, nunca com toque; fecha com Esc, saída do ponteiro e perda de foco (como hoje).
- Com o balão aberto: `left >= 8` e `right <= largura da janela - 8` para qualquer largura a partir de 320 px.
- Quando cabe centralizado, o centro do balão coincide com o centro do botão (tolerância de 1 px).
- Mantém `data-tooltip` e `aria-hidden="true"`.
- `clampShift(left, width, viewport, margin)` é pura e devolve o deslocamento em px (0 quando cabe).

## ThemeButton

- Nome acessível inalterado: `Tema: <estado>. Mudar para <próximo>`.
- Caixa (largura e altura) idêntica em `auto`, `light` e `dark`, nos dois temas e em qualquer largura.
- Nenhum vizinho muda de posição ao alternar (tolerância de 1 px).
- Só o rótulo do estado atual é visível; os outros ficam `aria-hidden` e fora da árvore de acessibilidade.

## Linha da ajuda (`LimitControl`)

- Estrutura e rótulos inalterados (`group` nomeado, `Menos`/`Mais`, caixa "Sem limite").
- Largura da modal ≥ 400 px de conteúdo: nome, passos, valor e caixa na mesma linha; a caixa encosta na borda direita (1 px) nas duas ajudas.
- Abaixo disso: a caixa em linha própria, à esquerda.
- Marcar ou desmarcar "Sem limite" não muda a posição de nenhum controle.

## SourcePicker (até 3 fontes)

- `role="group"` com `aria-pressed` em cada botão, como hoje.
- Botões com a mesma altura e a mesma largura; nomes longos quebram em linhas.
- O destaque desliza até a fonte marcada em 100 a 300 ms; com `prefers-reduced-motion: reduce`, a troca é imediata.
- Em cores forçadas, o destaque tem borda e a fonte marcada continua distinguível.
- Com 1 fonte, o destaque não anima; com mais de 3, continua a lista de rádios.

## Dialog

- Nova prop opcional `size?: 'default' | 'wide'` (padrão `'default'`). `'wide'` leva a largura máxima do painel a 460 px; sem a prop, nada muda (420 px). Só a modal de configurações usa `'wide'`.
