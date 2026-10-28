# UI Contract: botão, tecla `?` e diálogo de atalhos

## Presença

- Botão e tecla existem se e só se `useOnScreenKeyboard()` é falso (`ON_SCREEN_KEYBOARD_QUERY` não casa), em qualquer largura, jogando, pausado ou concluído.

## Botão (`ShortcutsButton`)

- `<button type="button">`, classe `buttonClass({ variant: 'icon' })`, `aria-label="Atalhos de teclado"`, dentro de `Tooltip label="Atalhos de teclado"`.
- Fica no grupo de tempo da faixa (`role="toolbar"`, "Ferramentas do jogo"), via prop `shortcuts` do `Toolbar`.
- Clique: abre o diálogo.

## Tecla `?`

- Abre o diálogo quando: `event.key === '?'`; sem `ctrlKey`, `altKey`, `metaKey` (Shift livre); alvo dentro do DOM do `GameScreen`; alvo não é `input`, `textarea`, `select` nem `[contenteditable]`.
- Chama `preventDefault`; nada é digitado no tabuleiro.
- Com o diálogo já aberto, ou outro diálogo aberto (ajustes, conclusão), não faz nada.

## Diálogo (`ShortcutsDialog`)

- `Dialog` com `title="Atalhos de teclado"` (vira `h2`), `closeButton`, `closeOnBackdrop`, `size="wide"`.
- Conteúdo: para cada grupo, um `h3` com o título e uma `<dl>` (ou `<ul>`) com, por atalho, as teclas em `<kbd>` (símbolos `aria-hidden` + `VisuallyHidden` com o nome falado) e a descrição.
- Fecha com Esc, botão "Fechar" e clique fora; o foco volta ao elemento de origem (tabuleiro ou botão).
- Esc que fecha não chega ao tabuleiro: Esc, depois Tab, ainda muda de palavra.
- Aberto: relógio suspenso; fechado: relógio volta ao estado de antes (pausado continua pausado).
- Abrir/fechar não muda `selected`, `direction`, `cells`, `draft`, `usage` nem dispara salvamento.
- Sem rede, sem gravação.
