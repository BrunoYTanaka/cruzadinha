# Feature Specification: Filtros no calendário por status

**Feature Branch**: `feat/053-filtros-calendario-status`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/107 — "Filtrar os dias por não iniciadas, em andamento e concluídas. O status já vem de `GET /api/library`; só site." (origem: #90)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver só os dias de um status (Priority: P1)

No calendário, acima da grade, há filtros de status: "Todas", "Não iniciadas", "Em andamento" e "Concluídas". Ao escolher um deles, os dias que não têm esse status ficam apagados e não podem ser abertos, e os dias do status escolhido continuam normais. A pessoa acha de relance o que falta jogar, o que deixou pela metade ou o que já fez.

**Why this priority**: É o pedido todo. Sem ele não há o que entregar. Funciona para visitante e para quem tem conta, sem pedir nada novo à API.

**Independent Test**: Abrir o calendário de um mês com dias nos três estados, escolher "Em andamento" e conferir que só esses dias ficam ativos; escolher "Todas" e conferir que tudo volta.

**Acceptance Scenarios**:

1. **Given** o calendário aberto sem filtro, **When** a pessoa vê a barra de filtros, **Then** "Todas" está marcado.
2. **Given** um mês com dias concluídos, em andamento e não iniciados, **When** a pessoa escolhe "Concluídas", **Then** só os dias concluídos ficam em destaque e os demais ficam apagados e sem ação.
3. **Given** o mesmo mês, **When** a pessoa escolhe "Não iniciadas", **Then** só os dias guardados que ela ainda não começou ficam em destaque.
4. **Given** um filtro de status ativo, **When** a pessoa escolhe "Todas", **Then** todos os dias voltam ao normal.
5. **Given** um filtro ativo, **When** a pessoa usa só o teclado, **Then** consegue trocar de filtro e os dias apagados saem da ordem de tabulação.
6. **Given** um filtro ativo, **When** a pessoa lê a tela com leitor de tela, **Then** o filtro marcado é anunciado e cada dia apagado é anunciado como fora do filtro, nunca só por cor.

---

### User Story 2 - Saber quantos dias há em cada status (Priority: P2)

Cada filtro mostra a contagem de dias do mês exibido naquele status, por exemplo "Concluídas (12)". Assim a pessoa vê o tamanho do que falta antes de escolher, e sabe que um filtro sem dias não levará a uma grade vazia por engano.

**Why this priority**: Ajuda a escolher, mas o filtro (US1) já entrega valor sozinho.

**Independent Test**: Num mês com 3 dias em andamento, ver "Em andamento (3)"; trocar de mês e ver a contagem mudar.

**Acceptance Scenarios**:

1. **Given** um mês exibido, **When** a pessoa vê os filtros, **Then** cada um mostra quantos dias daquele mês têm o status.
2. **Given** um filtro de status ("Não iniciadas", "Em andamento" ou "Concluídas") com zero dias no mês, **When** a pessoa o escolhe, **Then** a grade fica toda apagada e aparece a mensagem "Nenhum dia neste mês com esse status." (nunca com "Todas").
3. **Given** a pessoa muda de mês, **When** o novo mês carrega, **Then** as contagens mostram o novo mês e o filtro escolhido continua marcado.

---

### User Story 3 - Filtro vale por fonte e some ao sair (Priority: P3)

O filtro vale para a fonte exibida. Ao trocar de fonte, o filtro continua marcado e se aplica ao status daquela fonte. Ao sair do calendário e voltar, ou recarregar a página, o filtro volta para "Todas".

**Why this priority**: Define o comportamento previsível nos cantos, mas não muda o valor principal.

**Independent Test**: Escolher "Concluídas", trocar de fonte e conferir o filtro aplicado nela; recarregar a página e conferir "Todas".

**Acceptance Scenarios**:

1. **Given** o filtro "Concluídas" ativo, **When** a pessoa troca de fonte, **Then** o filtro segue marcado e apaga os dias não concluídos da nova fonte.
2. **Given** um filtro ativo, **When** a pessoa recarrega a página, **Then** o calendário abre com "Todas".

---

### Edge Cases

- Dias futuros, dias sem cruzada e dias ainda não guardados que podem ser buscados na fonte não têm status de jogo: ficam apagados com qualquer filtro que não seja "Todas" e não entram nas contagens.
- Fonte que a API recusa ("Esta fonte não está disponível agora"): os filtros não aparecem.
- Biblioteca ainda carregando ou com erro: os filtros ficam desativados e o estado de carregamento ou de erro existente continua igual.
- O dia de hoje segue marcado como hoje mesmo apagado; os cartões da seção "Hoje" não mudam com o filtro.
- Visitante: o status vem do progresso guardado no aparelho, igual ao que a grade já mostra hoje; nada novo é guardado.
- Quem volta de um jogo ao calendário vê o status atualizado e o filtro "Todas".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O calendário MUST mostrar, acima da grade, os filtros "Todas", "Não iniciadas", "Em andamento" e "Concluídas", com exatamente um marcado por vez.
- **FR-002**: O filtro inicial MUST ser "Todas", sem mudar nada do que o calendário mostra hoje.
- **FR-003**: Com um filtro de status ativo, o sistema MUST apagar e tornar inoperantes os dias do mês que não têm esse status, e manter normais os que têm.
- **FR-004**: O status de cada dia MUST ser o mesmo que a grade já mostra (concluído, em andamento, não iniciado), sem nova chamada à API.
- **FR-005**: Cada filtro MUST mostrar a contagem de dias do mês exibido com aquele status; "Todas" mostra o total de dias com cruzada guardada (concluídos, em andamento e não iniciados), sem contar os dias que ainda podem ser buscados na fonte, embora estes continuem abríveis com "Todas".
- **FR-006**: Dias sem status de jogo (futuro, sem cruzada, a buscar na fonte) MUST ficar apagados com qualquer filtro de status e MUST NOT entrar nas contagens.
- **FR-007**: Um filtro de status sem dias no mês (nunca "Todas") MUST mostrar a mensagem "Nenhum dia neste mês com esse status." sem esconder a grade.
- **FR-008**: O filtro MUST ser operável só pelo teclado e anunciado por leitores de tela; o estado "fora do filtro" de cada dia MUST aparecer por texto, nunca só por cor. Ao trocar de filtro, o leitor de tela MUST ouvir quantos dias ficaram em destaque (por exemplo, "3 dias em andamento"); dias apagados MUST NOT receber foco.
- **FR-009**: O filtro MUST persistir ao trocar de mês e de fonte dentro do calendário e MUST voltar para "Todas" ao recarregar ou ao reabrir o calendário.
- **FR-010**: O filtro MUST NOT mudar a seção "Hoje", a legenda nem o modo offline das cruzadas já guardadas.
- **FR-011**: A mudança MUST ser só no site: nenhuma rota, esquema ou contrato da API muda, e o site continua aceito por uma API anterior.

### Key Entities *(include if feature involves data)*

- **Filtro de status**: escolha da pessoa entre "Todas", "Não iniciadas", "Em andamento" e "Concluídas". Vive só na tela, não é salvo.
- **Dia do calendário**: já existente; tem um estado (concluído, em andamento, não iniciado, a buscar, sem cruzada, futuro). O filtro apenas lê esse estado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em até 2 toques, a pessoa vê só os dias de um status no mês exibido.
- **SC-002**: 100% dos dias fora do filtro ficam inoperantes e sinalizados por texto, e 100% dos dias do filtro seguem abríveis.
- **SC-003**: As contagens dos filtros batem com o número de dias em destaque quando o filtro é escolhido, em todo mês testado.
- **SC-004**: Com filtro "Todas", o calendário é idêntico ao de antes da mudança (sem regressão visual ou de comportamento).
- **SC-005**: Os filtros passam na verificação de acessibilidade automatizada e são usáveis só pelo teclado.

## Assumptions

- O status vem do que `GET /api/library` já devolve (e do progresso do visitante, já combinado pela tela); não há campo novo.
- A contagem e o apagado valem para o mês exibido, o mesmo recorte da grade.
- "Apagar" significa reduzir o destaque e desativar a ação, mantendo a grade e o tamanho da tela estáveis; não se escondem dias.
- Filtros múltiplos ao mesmo tempo (por exemplo, "Em andamento" e "Concluídas") ficam fora desta versão.
- O filtro não é guardado nas configurações nem no aparelho.
- Os nomes e a aparência dos filtros seguem os componentes e tokens existentes (sem nova biblioteca).
