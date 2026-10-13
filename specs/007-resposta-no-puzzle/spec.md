# Feature Specification: Resposta no puzzle entregue ao front-end

**Feature Branch**: `feat/007-resposta-no-puzzle`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Na api do puzzle ele não retorna a resposta, igual ao da globo, faz retornar para o front poder controlar as formas das dicas."

## User Scenarios & Testing *(mandatory)*

Os atores são o **jogador** (usuário logado que resolve a cruzada) e o **front-end** (consumidor que desenha o tabuleiro e decide como as dicas funcionam). Hoje a entrega do puzzle traz grade, dicas de texto e atribuição, mas nenhuma letra de resposta (feature 006, FR-002). Com isso o front-end não consegue oferecer ajudas que dependem da resposta, como revelar uma letra, revelar uma palavra, destacar erros ou indicar quantas letras estão certas. A fonte original (O Globo) entrega a resposta junto do puzzle; esta feature faz o sistema entregá-la também.

### User Story 1 - Receber a resposta junto do puzzle (Priority: P1)

Um jogador logado pede o puzzle de uma data (ou de um identificador) e, além de grade, dicas e atribuição, a resposta vem na mesma resposta, no mesmo formato interno em que o sistema a guarda, de modo que o front-end possa consultá-la durante a partida.

**Why this priority**: É o pedido inteiro: sem a resposta no que chega ao navegador, o front-end não tem como controlar as formas de dica.

**Independent Test**: Com um puzzle guardado e um usuário logado, pedir o puzzle por data e por identificador e conferir que a resposta recebida cobre exatamente todas as células abertas da grade, com uma letra por célula, e confere com a solução guardada.

**Acceptance Scenarios**:

1. **Given** um puzzle guardado, **When** um jogador logado o pede por data, **Then** a resposta traz grade, dicas, atribuição e a solução completa.
2. **Given** um puzzle guardado, **When** um jogador logado o pede por identificador, **Then** a resposta traz os mesmos dados, com a mesma solução.
3. **Given** um puzzle ainda não guardado cuja data a fonte publica, **When** o jogador o pede, **Then** ele é buscado, validado, guardado e entregue já com a solução, como qualquer puzzle guardado.
4. **Given** a solução recebida, **When** o front-end a compara com a grade, **Then** cada célula aberta tem exatamente uma letra e cada bloco não tem letra.
5. **Given** um visitante sem sessão, **When** pede um puzzle, **Then** o pedido continua recusado como não autenticado e nenhuma resposta é entregue.

---

### User Story 2 - Puzzle de exemplo também com resposta (Priority: P2)

Quem usa o ambiente de desenvolvimento pede o puzzle de exemplo do seed e recebe a resposta como em qualquer outro puzzle, podendo desenvolver e testar as ajudas do front-end sem depender da rede nem da fonte.

**Why this priority**: Não muda a entrega em produção, mas é o que permite desenvolver e demonstrar as dicas localmente.

**Independent Test**: Rodar o seed, pedir o puzzle de hoje como usuário logado e conferir que a solução do exemplo vem junto e é coerente com a grade.

**Acceptance Scenarios**:

1. **Given** o puzzle de exemplo guardado pelo seed, **When** o usuário logado o pede, **Then** recebe a solução do exemplo junto do puzzle.

---

### Edge Cases

- Puzzle guardado cuja solução não confere com a grade (dado antigo ou corrompido): o sistema não entrega uma resposta inconsistente; responde com falha genérica e registra o problema, em vez de entregar dados quebrados.
- Pedido sem sessão válida, de data futura, de data sem puzzle publicado ou com parâmetros inválidos: mesmas respostas de antes; a resposta nunca é revelada em nenhuma resposta de erro.
- Falha da fonte no momento do pedido: puzzles já guardados continuam sendo entregues, agora também com a solução.
- Dois pedidos simultâneos da mesma data ainda não guardada: ambos recebem o mesmo puzzle e a mesma solução.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A entrega de um puzzle (por data e por identificador) MUST incluir, além de grade, dicas e atribuição, a solução completa do puzzle.
- **FR-002**: A solução entregue MUST usar o mesmo formato interno em que é guardada, com uma letra por célula aberta e nenhuma letra nos blocos, e MUST ser coerente com a grade e as palavras do puzzle.
- **FR-003**: O sistema MUST validar a coerência entre puzzle e solução antes de entregar; se um puzzle guardado estiver inconsistente, MUST NOT entregar a solução inconsistente e MUST responder com falha genérica, sem detalhes internos.
- **FR-004**: O acesso MUST continuar restrito a usuários com sessão válida (feature 006, FR-014); sem sessão, nenhum puzzle nem solução é entregue.
- **FR-005**: Nenhuma resposta de erro (não autenticado, indisponível, parâmetro inválido, falha de busca) MUST conter a solução ou fragmentos dela.
- **FR-006**: Logs e mensagens do sistema MUST NOT registrar o conteúdo da solução.
- **FR-007**: A mudança MUST valer para todos os puzzles guardados, inclusive os coletados antes desta feature e o puzzle de exemplo do seed, sem reprocessar nem alterar o que está guardado.
- **FR-008**: O contrato de resposta compartilhado entre API e front-end MUST passar a descrever a solução como parte da resposta, e a documentação interativa da API MUST refletir o novo formato.
- **FR-009**: Esta feature MUST NOT adicionar verificação de respostas, progresso ou dicas no servidor; apenas entrega os dados para o front-end controlar as ajudas.
- **FR-010**: A regra de segurança que hoje proíbe enviar a solução ao navegador (constituição, princípio VI, e `docs/design.md`) foi emendada de forma justificada e registrada antes de a entrega mudar (constituição 3.0.0, PR #9), e as especificações afetadas (feature 006) MUST ser atualizadas para refletir a nova regra.

### Key Entities *(include if feature involves data)*

- **Puzzle entregue**: o que o front-end recebe ao pedir um puzzle: identificador, parte pública (grade, dicas, atribuição) e, agora, a solução. Antes, só os dois primeiros.
- **Solução**: as letras de resposta de cada célula aberta do puzzle, no formato interno já guardado; continua sendo guardada à parte da parte pública.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das entregas bem-sucedidas de puzzle a um usuário logado, a solução vem junto e cobre todas as células abertas, sem letras nos blocos.
- **SC-002**: Em 100% das respostas a pedidos sem sessão válida e das respostas de erro, nenhuma letra de resposta está presente.
- **SC-003**: O front-end consegue oferecer, sem nova ida ao servidor, ajudas que dependem da resposta (por exemplo revelar uma letra, revelar uma palavra ou destacar uma letra errada), usando apenas o que recebeu ao abrir o puzzle.
- **SC-004**: O tempo para o jogador receber um puzzle já guardado continua dentro de 1 segundo em condições normais, como antes.
- **SC-005**: Todos os puzzles já guardados antes da mudança passam a ser entregues com solução, sem nenhuma intervenção nos dados.

## Assumptions

- A decisão de entregar a resposta ao navegador é do usuário, para que o front-end controle as formas de dica; reverte a regra "a resposta nunca vai ao navegador na v1" (constituição VI, `docs/design.md`), emendada na constituição 3.0.0 (PR #9, versão MAJOR por redefinir um princípio).
- A solução vai para qualquer usuário logado, sem distinguir perfis; o site continua privado e restrito a convidados (constituição VIII).
- Entregar a resposta significa que um jogador técnico consegue lê-la na rede; isso é aceito, já que a fonte original também a entrega e o jogo não tem placar competitivo nem prêmio. Qualquer verificação autoritativa no servidor fica para outra feature, se um dia for necessária.
- O formato da solução entregue é o formato interno já existente (sem nova conversão nem nova coluna).
- Fora do escopo: telas e lógica das dicas no front-end, verificação de respostas no servidor, progresso por usuário, ofuscação ou entrega parcial da resposta.
- Dependências: formato interno de puzzle e solução (feature 003); puzzles guardados e entrega (feature 006); sessão (feature 004); documentação da API (feature 005).
