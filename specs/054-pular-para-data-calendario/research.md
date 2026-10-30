# Research: Pular para uma data no calendário

## D1 — Controle do mês

- **Decision**: `<select>` com os meses navegáveis (até 13 opções).
- **Rationale**: nativo, acessível, funciona só pelo teclado, tem teclado próprio no celular e não depende do suporte a `type="month"` (ausente no Firefox desktop e no Safari desktop).
- **Alternatives**: `<input type="month">` (suporte irregular); menu próprio com `shared/components/Menu` (mais código, sem ganho); campo de texto livre (validação de formato à toa).

## D2 — Controle da data completa

- **Decision**: `<input type="date">` com `min`/`max`, mais validação própria em `resolveJump`.
- **Rationale**: nativo, localizado em pt-BR, seletor visual e digitação. `min`/`max` não impedem digitar fora do período em todos os navegadores, então a regra mora no helper puro e é testada.
- **Alternatives**: campo de texto `dd/mm/aaaa` com máscara (reinventa o nativo); biblioteca de datepicker (dependência nova, contraria o plano).

## D3 — Foco no dia

- **Decision**: o `Calendar` foca o link do dia (`a[data-date]`) após o salto, uma vez, e limpa o pedido.
- **Rationale**: atende FR-004 e SC-002; limpar evita roubar o foco quando a fonte muda.
- **Alternatives**: `scrollIntoView` sem foco (teclado fica no campo, mais passos); abrir o jogo direto (viola FR-005).

## D4 — Onde mora o estado

- **Decision**: continua em `LibraryPage` (`month`), com o pedido de foco ao lado.
- **Rationale**: o mês já é estado da página; fonte e filtro são irmãos, então persistem sem código (FR-008, FR-009).
- **Alternatives**: estado dentro do `Calendar` (perde o mês ao trocar de ramo de erro; duplica `canGoPrevious`).

## D5 — Dias sem cruzada

- **Decision**: data válida de dia sem link só mostra o mês, sem foco e sem erro.
- **Rationale**: a spec (US2.2) quer o dia aparecendo como a grade já o mostra; dar erro puniria uma data legítima.
