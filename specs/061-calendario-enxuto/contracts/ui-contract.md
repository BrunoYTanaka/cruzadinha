# UI Contract: calendário enxuto

## Página `/calendario`

- Um `h1` visualmente escondido: "Escolha um dia". Nenhum outro `h1`. Sem seção "Hoje".
- Ordem no DOM: aviso de "ir direto ao jogo" (se houver) → `SourceBar` → área do calendário.

## `SourceBar`

- Linha flex (`align-items: flex-end`): `SourceTabs` (`flex: 1`) e, na ponta direita, o botão do filtro (`buttonClass` variante `icon`).
- Props: as de `SourceTabs` (`value`, `tabs`, `onChange`) mais `today`, `month`, `onJumpMonth`, `onJumpDate`.
- A borda de baixo da linha vem da barra, não das abas.

## Botão do filtro

- `button`, `type="button"`, nome acessível "Ir para uma data", `aria-expanded`, `aria-controls` (só aberto), área 46 × 46 px, ícone 24 px, `aria-haspopup` ausente (não é menu).
- Reserva sempre 46 px de largura.

## Painel

- `role="group"`, `aria-label="Ir para uma data"`, `position: absolute`, alinhado à borda direita do botão, `min-width: 300px` (limitado pela janela), campos com `min-height: 44px`.
- Conteúdo: seletor de mês, campo de data, linha de erro (`role="alert"`, altura fixa), iguais à feature 054.
- Fecha: botão de novo; `Escape` (foco volta ao botão, o evento não sobe); `pointerdown` fora (um toque que começa dentro e termina fora não fecha, pois só o `pointerdown` conta).
- Abrir leva o foco ao seletor de mês. Tab percorre os campos e sai do painel sem fechá-lo.
- Fechar apaga a mensagem de erro (FR-016).

## `DayPicker` (x1)

- Mesma `SourceBar`; sem `h1`; o clique/Enter num dia só escolhe, nunca abre o jogo.
