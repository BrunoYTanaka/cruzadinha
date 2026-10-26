# Feature Specification: Correções dos achados da auditoria

**Feature Branch**: `fix/corrigir-achados-da-auditoria` (a pasta da especificação é `034-correcoes-da-auditoria`)

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/78" ([Bug]: corrigir achados da auditoria (limite de login, PROXY_SECRET, sessões e outros))

## Contexto

Uma auditoria do repositório (API, autenticação, limites de tentativas, coleta de puzzles, progresso, implantação) deixou oito achados, em ordem de importância. Esta especificação os trata como um conjunto, em histórias independentes: cada uma pode ser entregue e verificada sozinha. A parte do site (`apps/web`) não foi auditada e fica fora do escopo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O limite de tentativas de login vale mesmo com pedidos simultâneos (Priority: P1)

O autor do projeto precisa que o limite de tentativas de login proteja as contas de adivinhação de senha. Hoje o limite é conferido antes da verificação da senha e a falha só é registrada depois dela. Uma rajada de pedidos simultâneos com senha errada para o mesmo e-mail vê, toda ela, "zero tentativas" e todos os pedidos passam pela verificação cara da senha. O limite não segura a rajada e a instância gratuita gasta processamento à toa.

**Why this priority**: É a única falha de segurança da lista: permite adivinhar senhas acima do limite prometido e custa processamento num servidor gratuito.

**Independent Test**: Disparar N pedidos simultâneos de login com senha errada para o mesmo e-mail, com limite menor que N, e contar quantos são recusados por excesso de tentativas e quantos chegam a verificar a senha.

**Acceptance Scenarios**:

1. **Given** um limite de 5 tentativas por e-mail, **When** 10 logins com senha errada chegam ao mesmo tempo para o mesmo e-mail, **Then** no máximo 5 verificam a senha e os demais recebem a recusa por excesso de tentativas.
2. **Given** um e-mail com tentativas já registradas, **When** o login é feito com a senha certa dentro do limite, **Then** o acesso é concedido e a contagem de tentativas daquele e-mail volta a zero.
3. **Given** um e-mail que atingiu o limite, **When** chega um pedido com a senha certa, **Then** ele é recusado por excesso de tentativas, como hoje.
4. **Given** um e-mail que não existe, **When** chegam pedidos simultâneos, **Then** o limite se comporta igual ao de um e-mail existente (a resposta não revela se a conta existe).

---

### User Story 2 - Produção não sobe sem o segredo do repasse (Priority: P1)

O autor do projeto precisa que um esquecimento de configuração não deixe a produção insegura em silêncio. Hoje, se o segredo do repasse faltar em produção, todos os usuários passam a compartilhar o endereço do balanceador (limites globais de login e de busca para todo mundo) e o endereço direto da API aceita pedidos que não passaram pelo repasse do site.

**Why this priority**: A falha é silenciosa e afeta todos os usuários e a proteção de rede; a correção é pequena e barata.

**Independent Test**: Iniciar a configuração com ambiente de produção e sem o segredo (deve recusar) e com o segredo (deve aceitar); fora de produção, iniciar sem o segredo continua funcionando.

**Acceptance Scenarios**:

1. **Given** ambiente de produção sem o segredo do repasse, **When** o servidor inicia, **Then** ele se recusa a subir e a mensagem de erro diz que o segredo é obrigatório em produção.
2. **Given** ambiente de produção com o segredo preenchido, **When** o servidor inicia, **Then** ele sobe normalmente.
3. **Given** ambiente de desenvolvimento ou de teste sem o segredo, **When** o servidor inicia, **Then** ele sobe como hoje.
4. **Given** o segredo definido como texto vazio em produção, **When** o servidor inicia, **Then** ele se recusa a subir, como se faltasse.

---

### User Story 3 - Sessões vencidas e encerradas são apagadas (Priority: P2)

O autor do projeto precisa que o banco gratuito (0,5 GB) não encha com sessões que nunca mais serão usadas. Cada login ou cadastro cria uma linha em `sessions` e nada remove as vencidas ou encerradas.

**Why this priority**: Não quebra nada hoje, mas a tabela só cresce num banco com espaço limitado.

**Independent Test**: Criar sessões vencidas, encerradas há mais de 7 dias, encerradas há menos de 7 dias e ativas; rodar a coleta agendada; conferir que só as duas primeiras categorias foram apagadas.

**Acceptance Scenarios**:

1. **Given** uma sessão vencida (por inatividade ou pelo limite absoluto de validade), **When** a coleta roda, **Then** ela é apagada.
2. **Given** uma sessão encerrada (logout) há mais de 7 dias, **When** a coleta roda, **Then** ela é apagada.
3. **Given** uma sessão encerrada há menos de 7 dias ou uma sessão ativa, **When** a coleta roda, **Then** ela permanece.
4. **Given** a limpeza falha, **When** a coleta roda, **Then** a coleta de puzzles não é prejudicada e o resumo da execução informa a falha.

---

### User Story 4 - Os limites da sandbox do Clube têm teste (Priority: P2)

O autor do projeto precisa de prova automática de que um script malicioso ou travado vindo do Clube não prende o servidor. A corrida do limite de login é coberta pela história 1; esta história cobre o outro buraco de teste apontado: a sandbox do adaptador Clube.

**Why this priority**: Protege uma fronteira de segurança (código de terceiros executado no servidor) contra regressões.

**Independent Test**: Executar o teste da sandbox com um script de laço infinito e conferir a falha rápida com a mensagem esperada.

**Acceptance Scenarios**:

1. **Given** um script com laço infinito, **When** a sandbox o executa, **Then** a execução termina dentro do tempo-limite com a falha `script: falha na sandbox`.
2. **Given** um script que consome memória sem parar, **When** a sandbox o executa, **Then** a execução termina com a mesma falha e sem derrubar o processo.

---

### User Story 5 - Remover o código morto de convites (Priority: P3)

O autor do projeto precisa tirar do projeto o que o cadastro aberto (feature 013) deixou sem uso: a tabela `invites`, o valor `INVITE_CREATE` da restrição de ações do limite de tentativas e o campo `inviteCode` ignorado nos esquemas compartilhados. Hoje o valor morto ainda precisa ser carregado em toda nova migração da restrição.

**Why this priority**: É limpeza sem efeito visível, mas toca o banco e a compatibilidade entre versões, então vai depois das correções de segurança.

**Independent Test**: Aplicar a migração em um banco com dados e conferir que `invites` não existe mais, que a restrição não lista `INVITE_CREATE` e que as demais ações continuam aceitas; conferir que a versão anterior do site continua funcionando com a nova API.

**Acceptance Scenarios**:

1. **Given** um banco com a tabela `invites` e tentativas de limite antigas de convite, **When** a migração roda, **Then** a tabela é removida, as linhas de tentativas com a ação de convite são apagadas e a restrição aceita só as ações em uso.
2. **Given** a versão do site no ar (posterior à feature 013, que não envia `inviteCode`), **When** ela entra, cadastra e joga contra a nova API, **Then** tudo funciona sem erro. Um cadastro que ainda envie `inviteCode` (só abas de antes da feature 013) é recusado como pedido inválido, e essa é a única quebra aceita.
3. **Given** a documentação de definição de dados e o diagrama entidade-relacionamento, **When** a migração é entregue, **Then** ambos deixam de listar `invites` e `INVITE_CREATE`.

---

### User Story 6 - Salvar o progresso não lê o puzzle inteiro (Priority: P3)

A cada salvamento de progresso a API lê do banco o puzzle inteiro, com a solução, só para saber o tamanho da grade. O jogador não percebe, mas é leitura e tráfego desnecessários num banco gratuito.

**Why this priority**: Otimização sem defeito funcional; só se sobrar tempo.

**Independent Test**: Salvar progresso e conferir que a validação de formato continua igual e que a leitura não traz a solução nem o restante dos dados do puzzle.

**Acceptance Scenarios**:

1. **Given** um puzzle salvo, **When** o progresso é salvo, **Then** o resultado (aceito ou rejeitado por formato) é idêntico ao de hoje.
2. **Given** um puzzle inexistente, **When** o progresso é salvo, **Then** a resposta é a mesma de hoje.

---

### User Story 7 - Os adaptadores não dependem uns dos outros (Priority: P3)

O adaptador Clube importa de `cruzadaonline/` a leitura de XML e a limpeza de texto de dica. A constituição manda isolar cada fonte; o código comum deve ficar num lugar neutro, sem mudar comportamento.

**Why this priority**: Manutenção; sem efeito para o usuário.

**Independent Test**: Os testes existentes dos dois adaptadores passam sem alteração de expectativas, e nenhum adaptador importa de outro.

**Acceptance Scenarios**:

1. **Given** o código comum movido, **When** os testes dos adaptadores rodam, **Then** todos passam com as mesmas expectativas.
2. **Given** o código-fonte da API, **When** se procuram importações entre pastas de adaptadores, **Then** não existe nenhuma.

---

### User Story 8 - O limite de tamanho do corpo vale também em respostas em pedaços (Priority: P3)

O adaptador Clube só confere o limite de 1 MB depois de ler a resposta inteira quando a fonte não informa o tamanho. Uma fonte com defeito poderia fazer o servidor gastar memória lendo um corpo enorme.

**Why this priority**: Defesa em profundidade contra uma fonte que hoje se comporta bem.

**Independent Test**: Simular uma resposta em pedaços, sem tamanho informado, maior que o limite, e conferir que a leitura para ao passar do limite e a coleta daquela edição falha como "corpo grande demais".

**Acceptance Scenarios**:

1. **Given** uma resposta sem tamanho informado que passa de 1 MB, **When** o adaptador a lê, **Then** a leitura é interrompida ao passar do limite e o resultado é a mesma falha de hoje para corpo grande demais.
2. **Given** uma resposta normal dentro do limite, **When** o adaptador a lê, **Then** o resultado é idêntico ao de hoje.

---

### Edge Cases

- Dois logins simultâneos para o mesmo e-mail, um certo e um errado, com a contagem já perto do limite: o errado conta uma tentativa e o certo só é recusado se, no instante em que conta, o limite já estiver estourado. Os pedidos são decididos um a um por chave (research R1), então o resultado não depende da ordem de chegada além de quem chega primeiro.
- O registro da tentativa antes da verificação não pode contar duas vezes uma mesma falha, nem deixar uma tentativa certa contada contra o usuário depois do sucesso.
- Os mesmos padrões de "conferir e depois registrar" em ajustes (`settings`) e busca de puzzles (`puzzles`) existem; a decisão sobre tratá-los junto ou não está nas suposições.
- Remover `invites` com migração: reverter exige recriar a tabela; a migração é de ida e a compatibilidade com a versão anterior vem da ordem de lançamento.
- Limpeza de sessões em banco vazio ou sem nada a apagar não pode falhar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST registrar a tentativa de login antes de verificar a senha, de modo que pedidos simultâneos para o mesmo e-mail sejam contados em conjunto e nunca excedam o limite configurado de verificações.
- **FR-002**: O sistema MUST zerar a contagem de tentativas do e-mail quando o login tem sucesso.
- **FR-003**: O sistema MUST manter a resposta idêntica para e-mail existente e inexistente, sem revelar se a conta existe.
- **FR-004**: O sistema MUST recusar iniciar em produção sem o segredo do repasse (ausente ou vazio), com mensagem de configuração que nomeia a variável.
- **FR-005**: O sistema MUST continuar iniciando em desenvolvimento e teste sem o segredo do repasse.
- **FR-006**: A coleta agendada MUST apagar as sessões vencidas (por inatividade ou pelo limite absoluto) e as encerradas há mais de 7 dias, sem tocar nas demais.
- **FR-007**: Uma falha na limpeza de sessões MUST NOT impedir a coleta de puzzles e MUST aparecer no resumo da execução.
- **FR-008**: A suíte de testes MUST cobrir a corrida do limite de login (pedidos simultâneos) com teste de integração contra um banco real.
- **FR-009**: A suíte de testes MUST cobrir os limites de tempo e de memória da sandbox do Clube, confirmando antes se algum já existe e acrescentando só o que faltar.
- **FR-010**: Uma migração MUST remover a tabela `invites` e o valor `INVITE_CREATE` da restrição de ações do limite de tentativas, apagando antes as linhas com essa ação.
- **FR-011**: O campo `inviteCode` ignorado MUST ser removido dos esquemas compartilhados. A remoção só pode ocorrer depois de confirmado que o site no ar não o envia (a feature 013 já parou de usá-lo), conforme a regra de dois lançamentos do §8 de `docs/versionamento.md`.
- **FR-012**: A documentação de definição de dados e o diagrama entidade-relacionamento MUST ser atualizados junto com a migração.
- **FR-013**: O salvamento de progresso MUST obter apenas o tamanho da grade do puzzle, sem ler a solução, mantendo as mesmas respostas.
- **FR-014**: O código comum de leitura de XML e de limpeza de texto de dica MUST ficar num local neutro dos adaptadores, sem mudar comportamento, e nenhum adaptador MUST importar de outro.
- **FR-015**: O adaptador Clube MUST interromper a leitura da resposta ao ultrapassar o limite de tamanho, mesmo sem tamanho informado, mantendo a falha atual de corpo grande demais.

### Key Entities *(include if feature involves data)*

- **Tentativa de limite**: contagem de tentativas por ação e chave (e-mail ou endereço) numa janela; passa a ser registrada antes da verificação no login.
- **Sessão**: sessão de um usuário com validade deslizante e limite absoluto; ganha limpeza periódica das vencidas e encerradas.
- **Convite**: tabela e ação de limite sem uso desde a feature 013; removidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Numa rajada de 10 logins simultâneos com senha errada e limite 5, no máximo 5 chegam a verificar a senha, em 100% das execuções do teste.
- **SC-002**: Em 100% das tentativas de iniciar em produção sem o segredo do repasse, o servidor se recusa a subir antes de aceitar qualquer pedido.
- **SC-003**: Depois de uma execução da coleta, nenhuma sessão vencida ou encerrada há mais de 7 dias permanece na tabela, e nenhuma sessão ativa é apagada.
- **SC-004**: Um script de laço infinito na sandbox do Clube termina em até 2 segundos com a falha esperada.
- **SC-005**: Depois da migração de convites, a versão do site no ar continua conseguindo entrar, cadastrar e jogar contra a nova API, sem erro (verificado pelo E2E existente e pela conferência da versão no ar).
- **SC-006**: Salvar progresso deixa de ler a solução do puzzle e as respostas aceitas e recusadas não mudam em nenhum teste existente.
- **SC-007**: Todos os testes unitários e de integração existentes passam, sem alterar expectativas fora do que esta especificação descreve.

## Assumptions

- O escopo são os oito achados da issue; o `apps/web` e os itens "não verificados na auditoria" ficam fora.
- A recusa por excesso de tentativas, o limite padrão e as janelas de tempo continuam como hoje; só a ordem de registro muda.
- O mesmo padrão "conferir e depois registrar" em ajustes e busca de puzzles é menos grave (sem senha, sem segurança de conta); entra neste escopo só se a correção do login produzir uma peça reutilizável sem custo extra, senão fica como acompanhamento registrado.
- A remoção de convites segue o plano em duas versões: primeiro a API deixa de usar tudo (já feito), depois a migração e a remoção do campo ignorado; a ordem de lançamento é definida no plano e no `docs/versionamento.md`.
- A branch é `fix/corrigir-achados-da-auditoria` (renomeada para passar em `npm run check:branch`); a pasta `034-correcoes-da-auditoria` é independente do nome da branch.
- Itens 1, 2, 3 e 4 mudam comportamento da API (`fix`); item 5 é migração de banco e exige atualizar a documentação de dados; itens 6 a 8 são `refactor`/`perf` sem mudança visível.
- Os testes de laço infinito e de memória da sandbox já existem (`sandbox.test.ts`); a história 4 se reduz a confirmá-los (plano, R5).
