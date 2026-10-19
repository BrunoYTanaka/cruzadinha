# Research: Escolha da fonte mais visível

Feature 015. Decisões tomadas antes do desenho. Não há [NEEDS CLARIFICATION] no contexto técnico: a feature só mexe em `apps/web` e reaproveita a API da feature 014.

## R1. Carregar a biblioteca de todas as fontes

- **Decision**: um hook `useSourceLibraries(viewer)` com `useQueries` do TanStack Query 5 (5.104.2 instalado; API conferida no Context7 `/tanstack/query`), uma consulta por fonte de `puzzleSourceIdSchema.options`, com a mesma chave de hoje (`queryKeys.library(viewerKey, source)`) e a mesma função (`libraryFor`, que junta o progresso do visitante). Sem `combine`: cada fonte fica com o próprio `isPending`, `isError` e `refetch`, para que a falha de uma não esconda a outra (FR-014).
- **Rationale**: a chave igual faz o calendário, os cartões e o diálogo de conclusão dividirem o mesmo cache; trocar de aba não refaz pedido. A invalidação existente (`queryKeys.libraryAll`) continua valendo para todas as fontes.
- **Alternatives considered**: um pedido novo na API com todas as fontes (muda a API, contra SC-006); `combine` num único estado (uma falha derrubaria a página inteira); pedir só a fonte ativa e "hoje" das outras por `GET /api/puzzles?date=` (busca na fonte e gasta o limite `PUZZLE_FETCH`, além de não trazer o progresso).

## R2. Custo de N pedidos

- **Decision**: aceitar um pedido de biblioteca por fonte (2 hoje, até 3 pelo FR-016), em paralelo.
- **Rationale**: a biblioteca só lê o banco (feature 009), tem teto de 366 itens por fonte e não tem limite de pedidos. Em paralelo, o tempo é o do mais lento, o que cumpre SC-005.
- **Alternatives considered**: carregar as outras fontes depois da ativa (os cartões apareceriam depois do calendário, contra SC-005).

## R3. Estado de "hoje" e contagem do mês: funções puras

- **Decision**: extrair de `calendar.ts` a função `dayState(date, today, byDate, noPuzzleDates)` (hoje `stateFor`, privada) e escrever em `features/library/today-cards.ts` as funções puras `todayCard(...)`, `completedInMonth(items, month)` e `otherSourceShortcut(...)`. Os componentes só desenham.
- **Rationale**: o cartão, o dia do calendário e o atalho precisam da mesma regra de estado; uma função só evita divergência e é testável sem React, no estilo de `calendar.ts` e `source-down.ts`.
- **Alternatives considered**: calcular dentro dos componentes (duplicaria a regra e dificultaria o teste).

## R4. Abas de fonte

- **Decision**: componente `SourceTabs` no padrão de abas do WAI-ARIA APG: `role="tablist"` com `aria-label="Fonte do calendário"`, cada aba um `<button role="tab">` com `aria-selected` e `aria-controls`, `tabindex` móvel (só a aba selecionada no Tab), setas esquerda/direita com volta, Home/End, **ativação automática** (a seta já troca o calendário). O calendário é o `role="tabpanel"` com `aria-labelledby` da aba. Substitui `SourcePicker` (removido com o teste).
- **Rationale**: o conteúdo do painel já está em cache (R1), então ativar na seta não custa pedido; é o padrão recomendado quando o painel aparece sem atraso. Cumpre FR-007 e SC-004.
- **Alternatives considered**: manter os botões com `aria-pressed` (não comunica que o calendário é da aba escolhida); ativação manual com Enter (mais passos sem ganho).

## R5. Cartão de hoje

- **Decision**: cada cartão é um único `<Link>` (destino `/jogo/:puzzleId` para puzzle guardado, `/dia/:today?fonte=<source>` para buscável). O estado "sem cruzada" é um `<div>` sem link. Erro de carga mostra uma mensagem curta e um `<Button>` "Tentar de novo" (então o cartão com erro não é link). Carregando mostra um esqueleto com o nome da fonte e "Carregando…". O nome acessível do link junta fonte, estado falado (`spokenElapsed`) e ação, por exemplo "O Globo: em andamento, 8 minutos e 42 segundos. Continuar".
- **Rationale**: FR-004 pede um alvo único; o texto da ação vem do estado (FR-003, texto além da cor). Fonte fora do ar (`isSourceDown`) troca a ação "Buscar" por um aviso no cartão, mas um puzzle guardado continua link.
- **Alternatives considered**: botão dentro do cartão além do link (dois alvos com o mesmo destino).

## R6. Layout de 1 a 3 fontes (FR-016)

- **Decision**: a seção "Hoje" usa `display: grid` com `grid-template-columns: repeat(var(--source-count), minmax(0, 1fr))` a partir de 600 px e uma coluna abaixo disso. As abas usam `grid-auto-flow: column; grid-auto-columns: 1fr` abaixo de 600 px (dividem a largura) e largura pelo conteúdo acima. `--source-count` vem do número de fontes no estilo inline da seção.
- **Rationale**: atende o limite de 3 decidido na clarificação sem regra por fonte; uma quarta fonte exige rever o layout, como diz a spec.
- **Alternatives considered**: `auto-fit` com `minmax(280px, 1fr)` (quebra de linha imprevisível entre 600 e 900 px, fora do que a spec descreve).

## R7. Remoção de "Jogar a de hoje" e títulos

- **Decision**: o `h1` da biblioteca passa a ser "Hoje" (seção dos cartões); o título do mês continua `h2`. O título do documento continua "Escolha um dia". O botão "Jogar a de hoje" sai (FR-006). Os testes e2e que usam o botão ou o `h1` antigo são atualizados para o cartão e para o novo `h1` (`e2e/support.ts`, `fluxo-principal`, `visitante`, `tamanhos`, `fontes`, `espera-servidor`).
- **Rationale**: a hierarquia de títulos segue a ordem visual do mockup; manter o título do documento evita mudança sem valor.

## R8. Fonte no topo do jogo (FR-010)

- **Decision**: o `h1` do jogo passa a ter o nome da fonte num `<span>` com aparência de pílula (classe `.source` em `GamePage.module.css`, fundo `--pill`) antes da data: "O Globo · Cruzada de 18 de outubro" (leitor de tela lê nessa ordem); o nome vem de `puzzleSourceNames[puzzle.source]`. O título do documento ganha a fonte: "Cruzada de 18 de outubro · O Globo". A linha de atribuição não muda.
- **Rationale**: nome a partir da lista de fontes (FR-013); o componente `Pill` é um `<button>` e não serve dentro do `h1`, por isso o `<span>` com tokens.

## R9. Atalho para outra fonte na conclusão (FR-011)

- **Decision**: `otherSourceShortcut(current, date, today, librariesBySource, noPuzzleDates)` percorre as fontes na ordem da lista, ignora a atual e as que ainda carregam ou falharam, e devolve a primeira cujo estado no dia é `not_started`, `in_progress` ou `fetchable` (e não está fora do ar quando `fetchable`). O diálogo recebe `{ label, href }` opcional e, quando existe, mostra a frase "Também há cruzada deste dia em {nome}." e o botão primário "Jogar {nome} deste dia" (com foco inicial); "Voltar à biblioteca" vira secundário. Sem atalho, o diálogo fica como hoje.
- **Rationale**: texto sem artigo por fonte ("a do", "a da") mantém FR-013. A spec foi ajustada para "uma ação para jogar a cruzada dessa fonte desse dia". Na tela do jogo, `useSourceLibraries({ enabled })` só liga as consultas quando a cruzada é concluída, para não pedir a biblioteca de todas as fontes a cada jogo aberto; em geral o cache da biblioteca já as tem. Nada de novo é buscado só para o atalho além dessa biblioteca; se ela falhar, o atalho não aparece e o jogo não é bloqueado (FR-032 da feature 010).
- **Alternatives considered**: consultar `GET /api/puzzles?date=&source=` ao concluir (busca na fonte só para decidir um botão).

## R10. Fonte padrão a partir da lista (FR-008)

- **Decision**: `DEFAULT_SOURCE` passa a ser `puzzleSourceIdSchema.options[0]`. `loadSourceChoice` já cai no padrão quando o valor guardado não passa no schema, o que cobre fonte retirada.
- **Rationale**: nenhuma regra fixa por fonte; com a lista atual o comportamento é o mesmo (O Globo).

## R11. Compatibilidade com uma API anterior à feature 014

- **Decision**: manter o filtro `item.source === source` (feature 014): uma API anterior à feature 014 ignora `source` e devolve só O Globo, então a Cruzada Online aparece sem itens (cartão "Buscar" e calendário buscável), nunca com dias do O Globo.
- **Rationale**: SC-006 e `docs/versionamento.md`.
