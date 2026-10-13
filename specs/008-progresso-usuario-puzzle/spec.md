# Feature Specification: Progresso do usuário em cada puzzle

**Feature Branch**: `feat/008-progresso-usuario-puzzle`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Fazer a relação do banco do usuário com o puzzle"

## Clarifications

### Session 2026-10-13

- Q: Depois que o jogador reinicia um puzzle já concluído, o sistema deve continuar guardando a data e o tempo da última conclusão, além do melhor tempo? → A: Guarda só o melhor tempo e a data em que ele foi obtido; a última conclusão (data e tempo) é limpa no reinício.

## User Scenarios & Testing *(mandatory)*

O ator é o **jogador** (usuário logado que resolve cruzadas) e, indiretamente, o **front-end**, que desenha o tabuleiro e envia o que o jogador digitou. Hoje o sistema guarda usuários e puzzles, mas nada liga um ao outro: o puzzle é o mesmo para todos e não há onde registrar o que cada pessoa preencheu, quanto tempo levou ou se terminou. Esta feature cria essa ligação: o **progresso** de um usuário em um puzzle, guardado de forma que o jogador retome de onde parou em qualquer dispositivo. O puzzle continua compartilhado e guardado uma só vez; só o progresso é individual.

### User Story 1 - Salvar e retomar o progresso de um puzzle (Priority: P1)

Um jogador logado preenche parte de um puzzle e o sistema guarda as letras e o tempo gasto. Ao voltar ao mesmo puzzle, inclusive de outro dispositivo, ele recebe o que já tinha preenchido e o tempo acumulado.

**Why this priority**: É o núcleo da relação usuário-puzzle e a promessa do produto ("o progresso fica salvo entre dispositivos"). Sem isso nenhuma outra função individual (concluídos, melhor tempo, biblioteca) é possível.

**Independent Test**: Com um usuário logado e um puzzle guardado, salvar um progresso parcial, lê-lo de volta e conferir que letras, tempo e situação "em andamento" são iguais ao enviado; salvar de novo e conferir que o valor mais recente prevalece.

**Acceptance Scenarios**:

1. **Given** um jogador logado e um puzzle guardado sem progresso dele, **When** ele consulta o progresso, **Then** o sistema informa que ainda não há progresso, sem tratar como erro.
2. **Given** um jogador logado, **When** ele salva letras e tempo gasto em um puzzle, **Then** o sistema guarda o progresso com situação "em andamento" e a hora da última alteração.
3. **Given** um progresso já salvo, **When** o jogador salva de novo o mesmo puzzle, **Then** o progresso anterior é substituído (um único registro por usuário e puzzle), sem criar duplicatas.
4. **Given** um progresso salvo em um dispositivo, **When** o jogador consulta o mesmo puzzle em outro dispositivo logado na mesma conta, **Then** recebe as mesmas letras e o mesmo tempo.
5. **Given** letras que não correspondem à grade do puzzle (célula de bloco preenchida, célula inexistente, mais de uma letra por célula, caractere que não é letra), **When** o jogador tenta salvar, **Then** o pedido é recusado com erro de validação e o progresso anterior permanece intacto.
6. **Given** um identificador de puzzle que não existe, **When** o jogador tenta salvar ou consultar progresso, **Then** o sistema responde que o puzzle não foi encontrado.

---

### User Story 2 - Concluir um puzzle e guardar o melhor tempo (Priority: P2)

Ao terminar um puzzle com a grade completa e correta, o jogador o marca como concluído; o sistema guarda a hora da conclusão e o tempo final, e mantém o melhor tempo dele naquele puzzle, com a data em que o obteve. Se o jogador jogar de novo do zero, o melhor tempo e a data dele não se perdem; os dados da conclusão anterior (data e tempo daquela partida) são descartados.

**Why this priority**: Dá sentido de fim à partida e sustenta a biblioteca (concluídos) e o recorde pessoal. Depende de salvar progresso (história 1), por isso vem depois.

**Independent Test**: Salvar um progresso com situação "concluído" e tempo final, conferir que a conclusão e o melhor tempo ficam registrados; reiniciar o puzzle e concluir de novo com tempo pior e depois com tempo melhor, conferindo que o melhor tempo só muda quando melhora.

**Acceptance Scenarios**:

1. **Given** um progresso em andamento, **When** o jogador salva a situação "concluído" com o tempo final, **Then** o sistema registra a hora de conclusão e define o melhor tempo como o tempo final.
2. **Given** um puzzle concluído com melhor tempo registrado, **When** o jogador reinicia o puzzle do zero, **Then** as letras e o tempo da partida atual são zerados, a situação volta a "em andamento", a data e o tempo da conclusão anterior são limpos, e o melhor tempo e a data em que foi obtido são mantidos.
3. **Given** um melhor tempo registrado, **When** o jogador conclui de novo com um tempo maior, **Then** o melhor tempo e a data dele não mudam (inclusive em empate); com um tempo menor, o novo tempo e a data de agora passam a ser o melhor.
4. **Given** um puzzle concluído, **When** o jogador consulta o progresso, **Then** recebe as letras finais, a situação "concluído", o tempo final, a hora de conclusão, o melhor tempo e a data em que ele foi obtido.
5. **Given** um progresso concluído, **When** um pedido tenta voltá-lo a "em andamento" ou alterar as letras sem reiniciar o puzzle, **Then** o pedido é recusado, para que um salvamento atrasado não desfaça a conclusão; repetir a conclusão com as mesmas letras é aceito sem alteração.

---

### User Story 3 - Cada jogador enxerga somente o próprio progresso (Priority: P1)

O progresso de um usuário nunca é lido nem alterado por outro. Pedidos sem sessão válida são recusados.

**Why this priority**: É requisito de privacidade da constituição ("cada usuário acessa somente o próprio progresso") e não pode ser deixado para depois de a funcionalidade existir.

**Independent Test**: Com dois usuários e o mesmo puzzle, salvar progresso diferente para cada um e conferir que cada um lê e altera apenas o seu; sem sessão, qualquer leitura ou escrita é recusada.

**Acceptance Scenarios**:

1. **Given** dois jogadores com progresso no mesmo puzzle, **When** cada um consulta o progresso, **Then** cada um recebe apenas o seu.
2. **Given** o progresso do jogador A, **When** o jogador B salva progresso no mesmo puzzle, **Then** o progresso de A não muda.
3. **Given** um visitante sem sessão, **When** tenta ler ou salvar progresso, **Then** o pedido é recusado como não autenticado e nada é lido nem gravado.
4. **Given** qualquer resposta de progresso, **When** o jogador a recebe, **Then** ela não contém dados de outros usuários.

---

### Edge Cases

- Salvamentos que chegam fora de ordem (o front repete o envio após falha): um salvamento mais antigo não deve sobrescrever um mais novo nem desfazer uma conclusão.
- Salvamento com grade totalmente vazia: aceito, e equivale a "sem letras preenchidas" (útil para reiniciar).
- Tempo gasto negativo ou absurdamente grande: recusado como erro de validação.
- Conta removida: o progresso dela desaparece junto, sem deixar registros órfãos.
- Puzzle removido do cache: o progresso dele não pode ficar órfão; a remoção de um puzzle com progresso não deve apagar o progresso dos jogadores silenciosamente.
- Dois dispositivos salvando ao mesmo tempo no mesmo puzzle: vale o salvamento mais recente, e o resultado é sempre um único registro consistente.
- Letras em minúsculas, com acento fora do formato da solução ou que não sejam uma única letra: recusadas como erro de validação, sem normalização; o front envia as letras já no formato da solução (maiúsculas).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST guardar, para cada par (usuário, puzzle), no máximo um registro de progresso.
- **FR-002**: O progresso MUST conter as letras preenchidas na grade, o tempo gasto na partida atual, a situação ("em andamento" ou "concluído"), a hora da última alteração, a hora de conclusão e o tempo total da conclusão (ambos quando concluído) e o melhor tempo do usuário naquele puzzle com a data em que foi obtido (quando já concluiu alguma vez).
- **FR-003**: Um jogador logado MUST poder salvar o progresso de um puzzle existente; salvar de novo substitui o progresso anterior do mesmo puzzle.
- **FR-004**: Um jogador logado MUST poder consultar o próprio progresso de um puzzle; quando não há progresso, a resposta MUST indicar isso sem ser um erro.
- **FR-005**: O sistema MUST validar as letras recebidas contra a grade do puzzle: só células abertas podem ter letra, uma letra por célula, apenas caracteres válidos para o puzzle; qualquer violação MUST recusar o pedido sem alterar o progresso guardado.
- **FR-006**: O sistema MUST recusar tempos gastos inválidos (negativos ou acima de 7 dias).
- **FR-007**: Ao salvar a situação "concluído", o sistema MUST guardar o tempo de término (o tempo total gasto para solucionar o puzzle e o momento em que foi solucionado) e devolvê-los na consulta do progresso concluído; MUST também atualizar o melhor tempo e a data dele somente quando não houver melhor tempo anterior ou o novo tempo for estritamente menor.
- **FR-008**: O jogador MUST poder reiniciar um puzzle do zero: letras e tempo da partida atual são zerados, a situação volta a "em andamento", e o melhor tempo e a data em que foi obtido são preservados; a hora e o tempo da conclusão anterior são limpos (o sistema não guarda a última conclusão, só o recorde).
- **FR-009**: Um progresso "concluído" MUST NOT voltar a "em andamento" nem ter suas letras alteradas por um salvamento comum (fica em modo leitura); apenas o reinício explícito (FR-008) pode fazê-lo. Repetir o salvamento de conclusão com as mesmas letras é aceito e não muda nada.
- **FR-010**: Um salvamento mais antigo que o já guardado MUST NOT sobrescrever o mais novo.
- **FR-011**: O sistema MUST permitir apenas ao próprio usuário ler e alterar o seu progresso; nenhuma resposta de progresso pode conter dados de outro usuário.
- **FR-012**: Todos os pedidos de progresso MUST exigir sessão válida; sem sessão, a resposta é de não autenticado.
- **FR-013**: Pedir ou salvar progresso de um puzzle inexistente MUST resultar em "não encontrado".
- **FR-014**: Ao remover um usuário, o sistema MUST remover também o progresso dele; um puzzle com progresso associado MUST NOT poder ser removido silenciosamente.
- **FR-015**: A ligação entre usuários e puzzles MUST ser criada por migração versionada do banco, seguindo as convenções de colunas e gatilhos já usadas nas demais tabelas.
- **FR-016**: Os endpoints novos MUST ser documentados na documentação da API, como os demais.

### Key Entities *(include if feature involves data)*

- **Progresso**: o que um usuário fez em um puzzle. Liga exatamente um usuário a exatamente um puzzle (único por par). Atributos: letras preenchidas, tempo gasto na partida atual, situação (em andamento ou concluído), hora da última alteração, hora de conclusão, melhor tempo e a data em que o melhor tempo foi obtido.
- **Usuário** (existente): dono do progresso; um usuário tem vários progressos, um por puzzle jogado.
- **Puzzle** (existente): compartilhado por todos e guardado uma só vez; um puzzle pode ter progresso de vários usuários, cada um independente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador que salva parte de um puzzle e o reabre em outro dispositivo recupera 100% das letras e do tempo salvos.
- **SC-002**: Em testes com dois ou mais usuários no mesmo puzzle, 0 leituras ou alterações cruzam a fronteira entre usuários.
- **SC-003**: Salvar ou retomar o progresso responde em menos de 1 segundo em uso normal.
- **SC-004**: Em 100% dos testes de concluir, reiniciar e concluir de novo, o melhor tempo nunca piora.
- **SC-005**: Salvamentos repetidos ou fora de ordem nunca deixam mais de um registro por usuário e puzzle nem desfazem uma conclusão.
- **SC-006**: 100% dos pedidos de progresso sem sessão válida são recusados sem ler nem gravar dados.

## Assumptions

- O puzzle continua sendo uma linha compartilhada; a única novidade no banco é o progresso por usuário (modelo já previsto no `docs/design.md`).
- A conferência de que a grade está completa e correta fica no front-end (a solução já é entregue a ele, conforme a constituição 3.0.0); o servidor guarda a situação e o tempo informados e valida apenas o formato das letras. Não há placar competitivo, então confiar no tempo informado é aceitável.
- O cronômetro, o salvamento automático com atraso (debounce), a pausa ao trocar de aba e a guarda local em caso de falha pertencem ao front-end e ficam fora desta feature.
- A tela de biblioteca (lista de datas com o status do usuário) é uma feature própria e fica fora do escopo; esta feature apenas deixa o progresso consultável por puzzle.
- Preferência de tema do usuário também fica fora do escopo.
- Dados de progresso são pessoais: não aparecem em logs nem em mensagens de erro (constituição VI).
- A ordem dos salvamentos (FR-010) é decidida pelo horário que o dispositivo informa em cada salvamento; um horário mais de 5 minutos à frente do relógio do servidor é recusado. Um relógio de dispositivo adiantado pode fazer salvamentos de outro dispositivo serem ignorados por alguns minutos, o que é aceitável aqui.
- O progresso é mantido enquanto a conta existir; não há expiração.
