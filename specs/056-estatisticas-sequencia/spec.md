# Feature Specification: Estatísticas e sequência de dias

**Feature Branch**: `feat/056-estatisticas-sequencia`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/95 — "Tela com dias seguidos, total concluído, tempo médio e recordes por fonte, calculados a partir de `progress` (`finished_ms`, `best_ms`, `completed_at`). Só para contas; visitante pode ver o que está no IndexedDB." (origem: #90)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver minhas estatísticas e a sequência (Priority: P1)

Uma pessoa com conta abre a tela "Estatísticas" e vê: a sequência atual de dias seguidos (e a maior sequência já feita), o total de cruzadas concluídas e o tempo médio de conclusão. Os números cobrem todas as fontes juntas.

**Why this priority**: É o pedido central e funciona sozinho: dá à pessoa um motivo para voltar todo dia.

**Independent Test**: Com uma conta que concluiu cruzadas em três dias seguidos, abrir a tela e conferir sequência 3, total e tempo médio corretos.

**Acceptance Scenarios**:

1. **Given** uma conta com conclusões em hoje, ontem e anteontem, **When** a pessoa abre a tela, **Then** a sequência atual é 3.
2. **Given** uma conta que concluiu algo ontem mas ainda nada hoje, **When** abre a tela, **Then** a sequência atual continua contando até ontem (o dia de hoje ainda não acabou).
3. **Given** uma conta cuja última conclusão foi há dois dias ou mais, **When** abre a tela, **Then** a sequência atual é 0 e a maior sequência continua mostrada.
4. **Given** várias cruzadas concluídas no mesmo dia, **When** a sequência é contada, **Then** o dia conta uma vez só.
5. **Given** uma conta sem nenhuma conclusão, **When** abre a tela, **Then** vê zeros e um texto que convida a jogar, sem erro nem tempo médio inventado.

---

### User Story 2 - Recordes e números por fonte (Priority: P2)

Na mesma tela, para cada fonte, a pessoa vê o total concluído, o tempo médio e o melhor tempo (recorde). Fontes sem conclusão mostram "—" no lugar dos tempos.

**Why this priority**: Acrescenta detalhe ao P1; a tela já é útil sem ele.

**Independent Test**: Concluir cruzadas em duas fontes com tempos conhecidos e conferir total, média e recorde de cada uma.

**Acceptance Scenarios**:

1. **Given** conclusões em duas fontes, **When** a pessoa abre a tela, **Then** cada fonte mostra seus próprios total, média e recorde.
2. **Given** uma cruzada reiniciada depois de concluída, **When** a tela é aberta, **Then** o recorde dela continua contado, mas ela não entra no total nem na média enquanto não for concluída de novo.
3. **Given** uma fonte nova ou sem conclusões, **When** a tela é aberta, **Then** ela aparece com total 0 e "—".

---

### User Story 3 - Visitante vê o que está no aparelho (Priority: P3)

Quem joga sem conta abre a mesma tela e vê as estatísticas calculadas só com o progresso guardado no aparelho, com um aviso de que valem só para este aparelho e de que a conta guarda no servidor.

**Why this priority**: Amplia o alcance, mas depende do P1/P2 e não é o público principal.

**Independent Test**: Como visitante, concluir uma cruzada e conferir que a tela mostra total 1 e o aviso; entrar numa conta e conferir que os números do visitante não aparecem nela.

**Acceptance Scenarios**:

1. **Given** um visitante com cruzadas concluídas no aparelho, **When** abre a tela, **Then** vê os mesmos tipos de número, só dos dados do aparelho, e o aviso.
2. **Given** um visitante sem nada concluído, **When** abre a tela, **Then** vê zeros e o convite para jogar.
3. **Given** uma pessoa que entra numa conta, **When** abre a tela, **Then** os números são só os da conta (dados de visitante e de conta nunca se misturam).

---

### Edge Cases

- Sem rede ou com o servidor fora: a tela de conta mostra o aviso de sempre ("Esta tela precisa de conexão." ou erro com nova tentativa); nunca bloqueia o resto do site.
- Sessão que termina na tela: a pessoa passa a ser visitante e vê os números do aparelho.
- Dia da conclusão conta no fuso de Brasília, como o resto do site (virada à meia-noite de Brasília).
- Tempo médio sem conclusões: "—", nunca 0 nem divisão inválida.
- Tempos longos (acima de uma hora) aparecem em horas, minutos e segundos.
- Cruzada concluída com ajuda: conta como concluída como em qualquer outro lugar do site; a tela não distingue.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O site MUST ter uma tela "Estatísticas", acessível pelo menu do cabeçalho, para conta e visitante.
- **FR-002**: Para uma conta, a tela MUST mostrar sequência atual, maior sequência, total concluído e tempo médio, calculados no servidor a partir do progresso da própria conta.
- **FR-003**: Um dia conta para a sequência quando há ao menos uma cruzada concluída naquele dia (data da conclusão, fuso de Brasília), não a data da cruzada.
- **FR-004**: A sequência atual MUST incluir ontem quando hoje ainda não tem conclusão, e MUST ser 0 quando o último dia com conclusão for anterior a ontem.
- **FR-005**: A tela MUST mostrar, por fonte, total concluído, tempo médio e melhor tempo; fontes sem dado mostram total 0 e "—".
- **FR-006**: Total e média usam só as cruzadas atualmente concluídas; o melhor tempo usa também recordes de cruzadas reiniciadas.
- **FR-007**: A tela MUST listar todas as fontes conhecidas, na ordem do site, incluindo as futuras sem mudança de texto por fonte.
- **FR-008**: Para visitante, os mesmos números MUST ser calculados só com o progresso do IndexedDB, com aviso de que valem só neste aparelho; dados de visitante e de conta nunca se misturam.
- **FR-009**: O servidor MUST responder estatísticas só da pessoa da sessão e MUST NOT expor dados de outra conta, solução, letras ou grade.
- **FR-010**: A consulta de estatísticas MUST ser de leitura apenas e seguir o mesmo tratamento de erro da biblioteca (sem consumir limites de busca na fonte).
- **FR-011**: A tela MUST seguir as regras do site: um `h1`, tema claro/escuro, acessível por teclado e leitor de tela, sem salto de layout ao carregar, e uma mudança só no site deve funcionar com a API anterior (visitante) sem quebrar.
- **FR-012**: A mudança MUST ser compatível com a versão anterior da outra parte (um site novo com API antiga mostra "indisponível" para conta e continua mostrando o visitante).

### Key Entities

- **Progresso**: registro por pessoa e cruzada, com situação, momento e tempo da conclusão atual e melhor tempo; é a única fonte dos números.
- **Estatísticas**: resumo derivado (sequência atual, maior sequência, total, tempo médio, e a lista por fonte com total, média e recorde); não é guardado, é calculado a cada consulta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos casos de teste de sequência (dias seguidos, falha de um dia, vários no mesmo dia, hoje sem conclusão, virada de dia em Brasília), o número mostrado é o esperado.
- **SC-002**: A pessoa vê todas as estatísticas em até 2 segundos após abrir a tela em conexão normal, sem salto de layout.
- **SC-003**: Uma pessoa chega à tela em no máximo 2 toques a partir de qualquer página.
- **SC-004**: Nenhum dado de solução, letra ou grade aparece na resposta nem na tela; nenhum número de visitante aparece numa conta e vice-versa.
- **SC-005**: A tela passa nas verificações de acessibilidade automáticas do projeto nos temas claro e escuro.

## Assumptions

- A "maior sequência" é incluída por ser barata e dar contexto à sequência atual; o pedido pedia apenas "dias seguidos".
- Cruzadas reiniciadas perdem a conclusão (regra existente de `progress`); por isso a sequência histórica pode diminuir ao reiniciar um dia concluído. Aceito.
- Não há ranking, comparação entre pessoas nem compartilhamento nesta feature.
- A tela fica fora do jogo; nada muda no tabuleiro, nos salvamentos nem nas filas existentes.
- Sem mudança de esquema do banco: tudo é calculado das colunas existentes.
