# Research: Calendário mais enxuto

## R1. Onde mora o botão do filtro
- **Decision**: componente novo `SourceBar` (abas + botão), usado pela página e pelo `DayPicker`.
- **Rationale**: o `Calendar` renderiza abaixo das abas; o botão tem de ficar na linha delas. A barra evita duplicar o arranjo nas duas telas.
- **Alternatives**: posicionar o botão com `position: absolute` a partir do `Calendar` (frágil com a linha de abas e com o carregamento/erro); ícone dentro do `SourceTabs` (mistura o `tablist` com um botão que não é aba).

## R2. Padrão do painel
- **Decision**: o botão usa `buttonClass` (variante `icon`) e herda `:hover`/`:active`/desativado de `.button`, então `button-states.test.ts` e `touch-targets.test.tsx` não precisam de entrada nova. Painel: disclosure próprio: `<button aria-expanded aria-controls>` + `<div role="group" aria-label="Ir para uma data">`, `position: absolute` abaixo do botão, alinhado à direita. Fecha com o botão, Esc (foco volta ao botão, `stopPropagation` para não fechar o diálogo/página), `pointerdown` fora. Tab não fecha o painel (os campos são formulário, não menu); o erro de data é apagado ao fechar (FR-016). Foco vai ao seletor de mês ao abrir.
- **Rationale**: `Menu` é `role="menu"` com itens; um `<select>` e um `<input type="date">` dentro dele violam o padrão. A lógica de clique fora e de Esc é pequena e já existe no `Menu` como referência.
- **Alternatives**: reutilizar `Menu` (semântica errada); `Dialog` (modal, empurra foco e é pesado para dois campos); `popover` nativo do HTML (suporte e controle de foco menos previsíveis nos testes jsdom).

## R3. Ausência de salto de layout
- **Decision**: botão de 46 px sempre presente na barra (largura reservada); painel `absolute` com `z-index`, sem entrar no fluxo. A linha de erro mantém altura fixa (já tem, feature 054). O painel limita a largura à janela (`min-width: min(300px, 100vw - 16px)`) e usa o mesmo ajuste de `clampShift` do `Tooltip`/`Menu` para não vazar pela borda.
- **Rationale**: atende FR-006/007/SC-002. 
- **Alternatives**: painel no fluxo (empurra a grade, proibido).

## R4. `h1` e título da página
- **Decision**: `<h1>` com `VisuallyHidden` "Escolha um dia" em `LibraryPage` (já existe `useDocumentTitle('Escolha um dia')`). Os estados de carregamento/erro da página mantêm seus `level`: o `LoadingState level={1}` do início continua, e quando o calendário aparece há um só `h1`. No `DayPicker` não há `h1` (a página x1 já tem o seu).
- **Rationale**: o único `h1` hoje era "Hoje"; `erros-com-titulo.spec.ts` confere um `h1` só.
- **Alternatives**: `h1` visível (a issue pede escondido).

## R5. O que sai junto com `TodayCards`
- **Decision**: apagar só o componente `TodayCards` (tsx, css, teste) e o export dele. `today-cards.ts` fica inteiro: `todayCard`/`TodayCard` são usados por `pages/library/direct-play.ts` ("Ir direto ao jogo"), `otherSourceShortcut` por `GameScreen` e `completedInMonth`/`completedLabel` pelas abas (conferido com `grep`).
- **Rationale**: código morto atrapalha o `lint`/revisão. `downloadToday` (feature 051) não depende dos cartões.
- **Alternatives**: apagar os helpers (quebra o direct-play e o atalho de conclusão).

## R6. E2E que dependem de "Hoje"
- **Decision**: 18 specs clicam no link `/^O Globo: /`, que é o cartão de "Hoje". Trocar por um helper compartilhado que abre o link do dia de hoje na grade (`a[data-date=<hoje em Brasília>]`) e trocar `heading level 1 name 'Hoje'` por `'Escolha um dia'`. Os textos de `configuracoes.spec.ts:229` ("a cruzada de hoje já foi concluída") e `clube.spec.ts:153` vêm do cartão e passam a ser conferidos no rótulo do dia da grade ou removidos.
- **Rationale**: o cartão era o caminho curto para o jogo nos e2e; a grade tem o mesmo link.
- **Alternatives**: manter o cartão escondido (contradiz FR-001).
