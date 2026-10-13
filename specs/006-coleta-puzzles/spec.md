# Feature Specification: Coleta e cache de puzzles

**Feature Branch**: `feat/006-coleta-puzzles`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Implementar a requisição que chama a Globo para obter a cruzada, salvar no banco e retornar para o frontend. Ter cache, já que uma vez salva quase nunca vai ser alterada. Todo dia, em um horário específico, chamar a API para salvar no banco, ou, se alguém solicitar antes, já fazer isso. Agendamento por GitHub Actions + CLI; primeira execução com hoje + datas passadas listadas; API só para usuários logados."

## Clarifications

### Session 2026-10-13

- Q: Qual data o puzzle de exemplo do seed deve ter? → A: A data de hoje (fuso de Brasília). Em desenvolvimento, o exemplo ocupa o puzzle do dia e a coleta pula essa data enquanto o exemplo existir.

## User Scenarios & Testing *(mandatory)*

Os atores são o **jogador** (usuário logado que quer abrir a cruzada de uma data), o **autor/operador** (quem mantém o projeto e quer que o puzzle do dia já esteja guardado sem intervenção manual) e o **front-end** (consumidor que recebe o puzzle para desenhar o tabuleiro). Hoje o sistema sabe buscar e converter um puzzle da fonte, mas não guarda nem entrega nada: cada consulta dependeria da fonte externa.

### User Story 1 - Abrir o puzzle de uma data (Priority: P1)

Um jogador logado pede o puzzle de uma data (por exemplo, o de hoje). Se o sistema já o tem guardado, devolve na hora. Se não tem e a fonte ainda o publica, busca na fonte, guarda e devolve. A partir daí, qualquer outro pedido da mesma data é atendido pelo que está guardado, sem nova ida à fonte.

**Why this priority**: É o valor central: sem isso o front-end não tem o que mostrar. Também funciona sozinho, mesmo sem a coleta agendada.

**Independent Test**: Com o banco vazio e uma fonte simulada, pedir o puzzle de uma data e confirmar que ele é devolvido e fica guardado; pedir de novo e confirmar que a fonte não foi consultada outra vez.

**Acceptance Scenarios**:

1. **Given** um puzzle já guardado para a data, **When** o jogador logado o pede, **Then** recebe o puzzle sem que a fonte seja consultada.
2. **Given** nenhum puzzle guardado para a data e a fonte com ele disponível, **When** o jogador o pede, **Then** o sistema busca na fonte, guarda e devolve o puzzle.
3. **Given** o puzzle acabou de ser guardado por um pedido, **When** outro jogador pede a mesma data, **Then** recebe o puzzle guardado sem nova consulta à fonte.
4. **Given** um puzzle devolvido, **When** o front-end o inspeciona, **Then** ele contém grade, dicas e atribuição à fonte, mas nenhuma letra de resposta.
5. **Given** um visitante sem sessão, **When** pede um puzzle, **Then** o pedido é recusado como não autenticado e nada é buscado nem devolvido.

---

### User Story 2 - Puzzle do dia guardado automaticamente (Priority: P2)

Todos os dias, em horário definido, uma rotina automática busca o puzzle do dia na fonte e o guarda, sem depender de nenhum usuário ou de o servidor da API estar ativo. Se a rotina rodar mais de uma vez no dia, nada é duplicado nem pedido de novo desnecessariamente.

**Why this priority**: Garante que o puzzle esteja pronto antes de alguém pedir e que nenhum puzzle se perca (a fonte só lista uma janela de datas). A US1 já cobre o caso em que ninguém rodou a rotina.

**Independent Test**: Executar o comando de coleta com banco vazio e fonte simulada e conferir que o puzzle do dia é guardado; executar de novo e conferir que nada muda e a fonte não é consultada.

**Acceptance Scenarios**:

1. **Given** o puzzle do dia ainda não guardado, **When** a coleta roda, **Then** o puzzle do dia fica guardado.
2. **Given** o puzzle do dia já guardado, **When** a coleta roda de novo, **Then** nenhum dado muda e a fonte não é consultada para essa data.
3. **Given** a fonte fora do ar durante a coleta, **When** a rotina roda, **Then** ela termina sinalizando falha ao operador e o que já estava guardado permanece intacto.
4. **Given** a rotina agendada configurada, **When** chega o horário, **Then** a coleta é disparada automaticamente, e o operador também pode disparar manualmente.

---

### User Story 3 - Preencher o histórico dentro da janela (Priority: P3)

Além do dia, a coleta guarda as datas passadas ausentes dentro de uma janela de dias configurável (padrão 31), com pausa entre os pedidos e interrompendo se a fonte sinalizar limite de uso. Nas execuções seguintes, só busca o que falta.

**Why this priority**: Forma a biblioteca de puzzles passados, mas o jogo funciona sem ela.

**Independent Test**: Com fonte simulada que lista N datas passadas e banco vazio, rodar a coleta e conferir que as N datas e o dia ficam guardados; rodar de novo e conferir zero consultas novas.

**Acceptance Scenarios**:

1. **Given** banco vazio e uma janela de N dias, **When** a coleta roda, **Then** o puzzle do dia e cada data passada disponível dentro da janela ficam guardados.
2. **Given** algumas datas já guardadas, **When** a coleta roda, **Then** só as datas ausentes são buscadas.
3. **Given** a fonte sinalizando limite de uso no meio do preenchimento, **When** isso acontece, **Then** a coleta para, informa o que foi guardado e o que ficou pendente, e termina sinalizando falha parcial; o restante é tentado na próxima execução.

---

### User Story 4 - Puzzle de exemplo no ambiente de desenvolvimento (Priority: P4)

Quem prepara o ambiente local roda o seed de desenvolvimento e, além da conta de teste, já encontra um puzzle de exemplo guardado na data de hoje, para jogar e testar sem depender da rede nem da fonte.

**Why this priority**: Conveniência de desenvolvimento; nada em produção depende dela.

**Independent Test**: Com banco local vazio, rodar o seed e pedir o puzzle de hoje como usuário logado; rodar o seed de novo e conferir que nada muda.

**Acceptance Scenarios**:

1. **Given** banco local sem puzzle de hoje, **When** o seed roda, **Then** o puzzle de exemplo fica guardado na data de hoje, sem nenhuma consulta à fonte.
2. **Given** o puzzle de exemplo ou o puzzle real já guardado para hoje, **When** o seed roda de novo, **Then** nada é alterado e a saída informa que o exemplo não foi gravado.
3. **Given** ambiente de produção, **When** o seed é executado, **Then** ele recusa rodar.

---

### Edge Cases

- Data no futuro, ou sem puzzle publicado pela fonte: o pedido é respondido como "indisponível", sem guardar nada.
- Data em formato inválido ou nível não suportado: recusado como pedido inválido, sem consultar a fonte.
- Fonte fora do ar, lenta ou com formato inesperado no momento do pedido: o jogador recebe um aviso de que não foi possível buscar; puzzles já guardados continuam sendo servidos normalmente.
- Dois pedidos simultâneos da mesma data ainda não guardada: no fim há um único puzzle guardado para ela e ambos recebem o puzzle.
- Coleta e pedido de jogador ao mesmo tempo para a mesma data: sem duplicidade nem erro para nenhum dos dois.
- Fonte devolve um puzzle inconsistente (ex.: solução que não confere com a grade): não é guardado e a falha é sinalizada.
- Puzzle já guardado e depois alterado pela fonte: o guardado é mantido (ver Assumptions).
- Seed rodado quando a coleta já guardou o puzzle real de hoje: o seed não mexe nele e informa que o exemplo não foi gravado.
- Coleta rodada depois do seed, no mesmo dia: o exemplo continua ocupando hoje e a coleta o conta como já existente; para obter o puzzle real de hoje em desenvolvimento, é preciso recriar o banco local.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que um usuário logado peça o puzzle de uma data (nível diário) e receba grade, dicas e atribuição à fonte.
- **FR-002**: O puzzle entregue ao navegador MUST NOT conter as letras de resposta; a solução fica guardada apenas no servidor.
- **FR-003**: O sistema MUST guardar cada puzzle uma única vez por fonte, nível e data, compartilhado por todos os usuários.
- **FR-004**: Um puzzle já guardado MUST ser entregue sem consultar a fonte.
- **FR-005**: Quando o puzzle pedido não estiver guardado, a data não for futura e a fonte o publicar, o sistema MUST buscá-lo, validá-lo, guardá-lo e entregá-lo na mesma resposta.
- **FR-006**: Um puzzle só MUST ser guardado se for consistente (grade, dicas e solução coerentes); caso contrário, a falha é registrada e nada é gravado.
- **FR-007**: O sistema MUST guardar apenas o necessário para jogar (formato interno e solução), não a resposta bruta da fonte.
- **FR-008**: O sistema MUST oferecer um comando de coleta que guarda o puzzle do dia (data de hoje no fuso de Brasília) e é idempotente: rodar várias vezes não duplica nem altera o que já está guardado.
- **FR-009**: Na coleta, datas já guardadas MUST NOT ser consultadas na fonte.
- **FR-010**: A coleta MUST também guardar as datas passadas ausentes dentro de uma janela de dias configurável pelo operador (padrão 31 dias antes de hoje; 0 desliga o histórico e coleta só o dia), com pausa entre pedidos; datas já guardadas ficam de fora. Como o limite real de histórico da fonte é desconhecido, a janela MUST poder ser ajustada sem alterar código, e um valor inválido MUST impedir a coleta com mensagem clara.
- **FR-011**: A coleta MUST fazer no máximo um pedido por nível e data e MUST parar ao receber sinal de limite de uso da fonte, informando o que foi guardado e o que ficou pendente.
- **FR-012**: A coleta MUST terminar com sucesso quando tudo o que devia ser guardado foi guardado, e com falha sinalizada ao operador quando a fonte falhar ou limitar o uso.
- **FR-013**: Uma rotina agendada MUST executar a coleta duas vezes por dia em horários definidos, sem depender de a API estar no ar, e MUST poder ser disparada manualmente.
- **FR-014**: Todos os pedidos de puzzle MUST exigir sessão válida; sem sessão, a resposta é de não autenticado e nenhuma consulta à fonte ocorre.
- **FR-015**: Datas futuras ou sem puzzle publicado MUST ser respondidas como indisponíveis; falhas da fonte MUST ser respondidas como falha de busca, distinguível de "indisponível", com mensagem genérica e sem expor detalhes da fonte, tokens ou conteúdo bruto.
- **FR-016**: Falha da fonte MUST NOT impedir a entrega de puzzles já guardados.
- **FR-017**: Cada puzzle entregue MUST trazer a atribuição à sua fonte.
- **FR-018**: A nova operação MUST constar na documentação interativa da API.
- **FR-019**: Segredos (como a string de conexão do banco usada pela rotina agendada) MUST ficar nos cofres da CI e MUST NOT aparecer em código, logs ou saída da coleta.
- **FR-020**: O seed de desenvolvimento MUST, além da conta de teste, deixar guardado um puzzle de exemplo (cruzada pequena de conteúdo inventado, nunca um puzzle real da fonte) na data de hoje (fuso de Brasília), sem consultar a fonte.
- **FR-021**: O seed MUST ser idempotente e MUST NOT alterar nem substituir um puzzle já guardado para a data de hoje; MUST recusar rodar em produção e MUST NOT existir na imagem de produção, como o seed de conta.
- **FR-022**: O puzzle de exemplo MUST seguir as mesmas regras de qualquer puzzle guardado (consistência da grade e da solução, atribuição à fonte, sem resposta no que vai ao navegador) e MUST identificar-se claramente como exemplo na atribuição, sem aparecer atribuído ao nome da fonte real (nome da fonte, título, autor e direitos próprios do exemplo).

### Key Entities *(include if feature involves data)*

- **Puzzle guardado**: uma cruzada de uma fonte, nível e data. Tem identificador próprio, a parte pública (grade, dicas, atribuição) e a solução (só no servidor). Único por fonte, nível e data; criado uma vez e, em geral, nunca alterado.
- **Execução de coleta**: uma rodada da rotina (agendada ou manual); resulta em quantidades guardadas, puladas e pendentes, e num estado de sucesso ou falha. Não precisa ser persistida; o resultado aparece na saída e no estado da execução agendada.
- **Fonte de puzzles**: origem externa (hoje, O Globo/Agilmente).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após a primeira consulta de uma data, 100% das consultas seguintes da mesma data são atendidas sem nova ida à fonte.
- **SC-002**: Com o puzzle do dia já guardado pela coleta, o jogador o recebe em até 1 segundo em condições normais.
- **SC-003**: Rodar a coleta N vezes seguidas no mesmo dia resulta em exatamente um puzzle guardado por data e zero consultas à fonte após a primeira execução bem-sucedida.
- **SC-004**: Em 100% das respostas de puzzle ao navegador, nenhuma letra de resposta está presente.
- **SC-005**: Em 100% dos pedidos sem sessão válida, nenhum puzzle é entregue nem consultado na fonte.
- **SC-006**: Com a fonte fora do ar, 100% dos puzzles já guardados continuam acessíveis e o jogador recebe um aviso claro para os não guardados.
- **SC-007**: Após uma semana de operação normal, existe um puzzle guardado para cada dia da semana, sem intervenção manual.
- **SC-008**: Uma falha da rotina agendada fica visível ao operador sem que ele precise inspecionar o banco.

## Assumptions

- Só existe a fonte O Globo e o nível diário (único publicado); o desenho não impede outras fontes no futuro.
- "Hoje" usa o fuso de Brasília.
- Um puzzle guardado não é atualizado automaticamente se a fonte mudá-lo; uma recoleta forçada manual fica fora desta feature.
- Rotina agendada = GitHub Actions executando o comando de coleta e gravando direto no banco (decisão do usuário, alinhada ao `docs/design.md`).
- A coleta preenche hoje + as datas passadas ausentes dentro de uma janela em dias, configurável por variável de ambiente (padrão 31, a janela observada na feature 003; decisão do usuário por não se conhecer o limite real da fonte). Datas que a fonte não publica contam como indisponíveis e são tentadas de novo em cada execução, então janelas grandes custam pedidos a cada rodada.
- Acesso restrito a usuários logados (decisão do usuário; mantém o site privado, constituição VIII). Perfis ou permissões além de "logado" estão fora do escopo.
- O seed de exemplo serve só para desenvolvimento local e testes manuais (jogar sem depender da rede); o conteúdo vem de material de teste já versionado, com texto inventado, em respeito à regra de não versionar puzzles reais.
- Fora do escopo: biblioteca com status por usuário, progresso, verificação de respostas, telas do front-end, notificações além da falha visível da execução agendada.
- Horários da rotina agendada (decisão inicial, ajustável): 00:01 e 08:00 em Brasília (03:01 e 11:00 UTC; o Brasil não tem horário de verão, então o deslocamento é fixo). O horário exato em que a fonte publica o puzzle do dia não é conhecido; se a coleta das 00:01 vier vazia com frequência, a das 08:00 a recupera; se as duas falharem, os horários devem ser movidos. Como a coleta é idempotente, rodar mais vezes não causa dano.
- Dependências: adaptador `oglobo` e formato interno (feature 003); banco, autenticação e CLI do autor (feature 004); documentação da API (feature 005).
- Em repositório público, o GitHub desativa agendamentos após 60 dias sem commits; isso deve ser acompanhado pelo operador.
