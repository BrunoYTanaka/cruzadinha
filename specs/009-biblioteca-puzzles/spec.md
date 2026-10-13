# Feature Specification: Biblioteca de puzzles

**Feature Branch**: `feat/009-biblioteca-puzzles`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Biblioteca de puzzles: listar as datas disponíveis para o usuário logado com o status dele em cada uma (não iniciado, em andamento, concluído, melhor tempo), sem acionar a busca na fonte"

## User Scenarios & Testing *(mandatory)*

O ator é o **jogador** (usuário logado) e, indiretamente, o **front-end**, que monta a tela de escolha de data. Hoje o jogador só consegue abrir um puzzle se já souber a data: não existe uma lista do que está disponível, e tentar datas "no escuro" pode acionar a busca na fonte externa, que tem limite de uso. Esta feature cria a **biblioteca**: a lista dos puzzles que o sistema já tem guardados, cada um com a situação do próprio jogador (não iniciado, em andamento ou concluído) e o melhor tempo dele. Ela só lê o que já está guardado; nunca consulta a fonte.

### User Story 1 - Ver os puzzles disponíveis com a minha situação (Priority: P1)

Um jogador logado abre a biblioteca e vê, do mais recente ao mais antigo, todas as datas que têm puzzle guardado. Para cada data ele vê se ainda não começou, se está em andamento ou se já concluiu, e, quando existir, o melhor tempo dele.

**Why this priority**: É o objetivo da feature e o que destrava a tela de escolha de data. Sem ela o jogador não descobre o que pode jogar.

**Independent Test**: Com um usuário logado, três puzzles guardados e progressos de cada tipo (nenhum, parcial, concluído com melhor tempo), pedir a biblioteca e conferir a ordem, as datas e a situação de cada item.

**Acceptance Scenarios**:

1. **Given** puzzles guardados para várias datas, **When** o jogador pede a biblioteca, **Then** recebe um item por puzzle, ordenado da data mais recente para a mais antiga, cada um com o identificador do puzzle e a data.
2. **Given** um puzzle sem nenhum progresso do jogador, **When** ele pede a biblioteca, **Then** o item aparece como "não iniciado" e sem melhor tempo.
3. **Given** um puzzle com letras preenchidas e ainda não concluído, **When** ele pede a biblioteca, **Then** o item aparece como "em andamento" com o tempo acumulado da partida.
4. **Given** um puzzle concluído, **When** ele pede a biblioteca, **Then** o item aparece como "concluído" com o tempo final da conclusão e o melhor tempo dele.
5. **Given** um puzzle concluído que o jogador reiniciou, **When** ele pede a biblioteca, **Then** o item aparece como "não iniciado" ou "em andamento" (conforme haja letras) e continua mostrando o melhor tempo e a data em que foi obtido.
6. **Given** dois jogadores com progressos diferentes nos mesmos puzzles, **When** cada um pede a biblioteca, **Then** cada um recebe apenas a própria situação e os próprios tempos.

---

### User Story 2 - Listar sem acionar a fonte e sem expor a resposta (Priority: P1)

A biblioteca é uma leitura barata e segura: nunca dispara busca na fonte externa, não conta no limite de busca por endereço e não carrega a grade, as dicas nem a solução dos puzzles.

**Why this priority**: É a razão de a feature existir como rota própria (evitar sondar datas no endpoint de puzzles) e protege o limite da fonte e o tamanho das respostas.

**Independent Test**: Pedir a biblioteca com a fonte indisponível e confirmar que responde normalmente; conferir que nenhuma chamada à fonte foi feita, que o contador de busca não muda e que o corpo da resposta não contém grade, dicas nem letras da solução.

**Acceptance Scenarios**:

1. **Given** a fonte externa fora do ar, **When** o jogador pede a biblioteca, **Then** a resposta é a mesma de quando ela está no ar, sem erro e sem tentativa de acesso à fonte.
2. **Given** qualquer número de pedidos à biblioteca, **When** o limite de busca na fonte por endereço é consultado, **Then** ele não foi consumido por esses pedidos.
3. **Given** a resposta da biblioteca, **When** ela é inspecionada, **Then** não há grade, dicas, solução nem letras do jogador, só metadados do puzzle e a situação/tempos do jogador.

---

### User Story 3 - Só quem está logado acessa a biblioteca (Priority: P1)

Pedidos sem sessão válida são recusados, como nas demais rotas de puzzles e de progresso.

**Why this priority**: Mantém a regra do produto de que o conteúdo só é entregue a usuário logado e que o progresso é individual.

**Independent Test**: Pedir a biblioteca sem sessão e com sessão expirada e conferir a recusa de autenticação; com sessão válida, conferir sucesso.

**Acceptance Scenarios**:

1. **Given** um visitante sem sessão, **When** ele pede a biblioteca, **Then** recebe a recusa padrão de não autenticado e nenhum dado.
2. **Given** um jogador logado sem nenhum puzzle guardado no sistema, **When** ele pede a biblioteca, **Then** recebe uma lista vazia, sem erro.

---

### Edge Cases

- Não há nenhum puzzle guardado: a lista vem vazia e a resposta é de sucesso.
- O jogador nunca jogou nada: todos os itens vêm "não iniciado" e sem melhor tempo.
- Existe um registro de progresso sem nenhuma letra e sem melhor tempo (criado internamente ao salvar/reiniciar): conta como "não iniciado", não como "em andamento".
- Puzzle reiniciado depois de concluído e ainda sem letras: aparece como "não iniciado", mas com o melhor tempo preservado.
- Datas futuras ou sem puzzle na fonte não aparecem, porque só existem na lista puzzles já guardados.
- Muitos puzzles acumulados ao longo do tempo: a resposta continua limitada a um tamanho previsível (veja FR-007).
- Hoje só existe o nível diário e uma única fonte, então há no máximo um puzzle por data; quando houver outros níveis, cada puzzle será um item distinto, com o nível indicado, e o desempate da ordem (FR-002) existe só para esse caso futuro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer ao jogador logado a lista dos puzzles já guardados, um item por puzzle, com identificador do puzzle, data e nível.
- **FR-002**: A lista MUST vir ordenada da data mais recente para a mais antiga, com desempate estável (por nível e, depois, pelo identificador).
- **FR-003**: Cada item MUST trazer a situação do jogador naquele puzzle: "não iniciado" (sem progresso, ou progresso sem nenhuma letra), "em andamento" (há letras e não está concluído) ou "concluído".
- **FR-004**: Cada item MUST trazer o tempo acumulado da partida atual (quando "em andamento"), o tempo final e a hora da conclusão (quando "concluído") e o melhor tempo com a data em que foi obtido (quando existir, mesmo após reinício).
- **FR-005**: O sistema MUST NOT consultar a fonte externa nem consumir o limite de busca por endereço ao montar a biblioteca; ela só lê o que está guardado.
- **FR-006**: A resposta MUST NOT conter grade, dicas, solução nem as letras digitadas pelo jogador; só metadados do puzzle e a situação e os tempos do jogador.
- **FR-007**: A lista MUST ter um tamanho máximo previsível: até 366 puzzles mais recentes por resposta, sem paginação nesta versão.
- **FR-008**: Cada jogador MUST receber somente a própria situação e os próprios tempos; o usuário vem sempre da sessão e nunca de um parâmetro do pedido.
- **FR-009**: Pedidos sem sessão válida MUST ser recusados com o erro de autenticação padrão do sistema.
- **FR-010**: Sem nenhum puzzle guardado, o sistema MUST responder sucesso com lista vazia.
- **FR-011**: A rota MUST estar documentada na documentação interativa da API (fora de produção) com exemplo de resposta.

### Key Entities *(include if feature involves data)*

- **Item da biblioteca**: visão de leitura de um puzzle para um jogador. Reúne o identificador do puzzle, a data, o nível, a situação do jogador (não iniciado, em andamento, concluído) e os tempos (tempo da partida, tempo final, melhor tempo e data do melhor tempo). Não é guardado: é montado a cada pedido a partir do puzzle e do progresso do usuário.
- **Puzzle** (já existe): um por fonte, nível e data; só a parte de metadados é usada aqui.
- **Progresso** (já existe, feature 008): um por usuário e puzzle; origem da situação e dos tempos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos casos de teste (nenhum, parcial, concluído, reiniciado com melhor tempo), a situação e os tempos de cada item coincidem com o progresso real do jogador.
- **SC-002**: Em 100% dos pedidos de teste a biblioteca responde sem qualquer acesso à fonte externa e sem consumir o limite de busca por endereço, mesmo com a fonte indisponível.
- **SC-003**: Com 366 puzzles guardados, o jogador recebe a lista completa em menos de 1 segundo.
- **SC-004**: Em 100% das respostas verificadas não há grade, dicas, solução nem letras do jogador.
- **SC-005**: Em 100% dos testes com dois usuários, nenhum vê situação ou tempo do outro; pedidos sem sessão são todos recusados.

## Assumptions

- "Disponível" significa "puzzle já guardado no sistema"; a coleta diária e a busca por data continuam sendo responsabilidade da feature 006.
- Hoje só existe o nível diário e uma única fonte; o item já traz o nível para não quebrar o contrato quando houver outros.
- Sem paginação nem filtros nesta versão (limite fixo de 366 itens, cerca de um ano de diários); filtros por nível, mês ou situação podem vir depois sem quebrar o contrato.
- Usa a tabela de progresso da feature 008 como está, sem mudança de esquema; a feature 008 precisa estar integrada antes (PR #11).
- Autenticação, sessão e formato de erro seguem o que já existe; o tema do usuário (preferências) fica fora desta feature.
- A tela de biblioteca no front-end é outra feature; aqui entrega-se só o contrato de leitura.
