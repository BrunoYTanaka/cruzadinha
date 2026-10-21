# Feature Specification: Documentação em dia com o sistema

**Feature Branch**: `docs/022-documentacao-em-dia`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Atualizar o data-definitions e entity" (ampliado na mesma sessão para o `docs/design.md` e o `README.md`)

## Contexto

A feature 020 alinhou as data definitions (DDE-001 a DDE-003) e os diagramas (ERD-001 a ERD-003) com o sistema até a feature 014. A feature 021 criou a DDE-004 e o ERD-004 (configurações do usuário) e acrescentou a ação `SETTINGS_SAVE` à DDE-001 e ao ERD-001. Uma conferência com o schema versionado do banco, as rotas da API, os comandos da linha de comando e as specs até a 021 mostra o seguinte.

**Data definitions e ERDs**: campos, valores permitidos e chaves batem; sobraram lacunas de texto e de rastreio.

- **DDE-001 (contas, sessões, convites, tentativas)**:
  - a nota sobre quais tentativas são registradas fala de login, cadastro e busca de puzzle, mas não da gravação de configurações na conta, que é registrada por endereço de rede (spec 021, FR-024);
  - os artefatos de origem e o resumo de `RateLimitAttempt` não citam a spec 021;
  - o escopo aponta só para a DDE-002 e a DDE-003 como continuação do modelo, sem a DDE-004;
  - `User` não diz o que some junto com a conta: sessões, progresso (spec 008, FR-014) e configurações (spec 021, FR-026).
- **DDE-004 (configurações)**: não registra o limite de tamanho da gravação na conta (spec 021, FR-024) nem que o visitante nunca envia configurações ao servidor (FR-021), dito só no escopo de forma indireta.
- **DDE-003 (progresso)**: o escopo aponta para DDE-001 e DDE-002, sem dizer que as configurações (inclusive os limites de ajuda que afetam a partida) ficam na DDE-004 e não no progresso.

**`docs/design.md`**: a seção da API (seção 4) ficou para trás.

- A tabela "Modelo de dados" diverge do banco: `users` sem `updated_at`; `sessions` como `id_hash`, `user_id`, `expires_at` (o banco tem `session_id`, `token_hash`, `absolute_expires_at`, `ended_at`); `invites` com nomes antigos (`id`, `created_by`, `used_by`) e sem dizer que está sem uso; `rate_limit_attempts` ausente. É uma segunda cópia do modelo que as DDEs já mantêm.
- "Formato interno" diz que a solução vai ao navegador "só para usuário logado"; desde a feature 013 vai também ao visitante (a seção 6, item 30, já diz isso).
- "Busca sob demanda" fala do limite "para um usuário logado"; desde a feature 013 o visitante também busca, e o limite é por endereço para todos (spec 013, FR-003).
- "Endpoints" lista `POST /api/invites` e `GET /api/invites`, que não existem desde a feature 013, e não lista `GET /api/auth/registration` (spec 013) nem `GET /api/health` (feature 002).
- "Sucesso" (seção 1) fala em escolher "uma data do O Globo"; desde a feature 014 há duas fontes.
- A árvore de `apps/api/src/` lista só `auth`, `puzzles` e `progress` em `modules/`; faltam `health`, `library`, `rate-limit` e `settings`, e as pastas `docs/` (documentação da API) e `http/` (guarda do repasse).

**`README.md`**:

- O estado atual diz "login por convite"; desde a feature 013 joga-se sem conta e o cadastro fica atrás de uma chave, fechado por padrão.
- A tabela de comandos lista `invites create` (e `list`, `revoke`), que não existem; faltam `users create --email` e `puzzles collect`.
- A apresentação diz que a primeira fonte é o O Globo, sem citar a Cruzada Online (feature 014), e chama o site de "privado", quando ele é aberto a quem tem o endereço e fica fora dos buscadores (feature 013). A nota de afiliação no fim cita só o O Globo.

Esta feature corrige essas lacunas. É trabalho de documentação: nada muda no banco, na API ou no site.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber tudo o que o limite de tentativas cobre (Priority: P1)

Quem vai planejar uma feature que grava algo por endereço de rede abre a DDE-001 para ver quais ações já são limitadas e como cada uma é contada. Precisa encontrar todas as ações em uso, cada uma com a regra de registro e a spec de origem.

**Why this priority**: Quem não vê que a gravação de configurações já gera tentativas pode subestimar o volume da tabela ou duplicar a regra num plano novo.

**Independent Test**: Para cada ação em uso de `action` na DDE-001, achar na nota da entidade a regra de registro (o que conta, por qual chave) e a spec de origem nos artefatos; `INVITE_CREATE` aparece só como sem uso.

**Acceptance Scenarios**:

1. **Given** a DDE-001 atualizada, **When** alguém lê a nota de `RateLimitAttempt`, **Then** encontra que toda gravação de configurações na conta é registrada por endereço de rede (spec 021, FR-024).
2. **Given** a DDE-001 atualizada, **When** alguém consulta os artefatos de origem e o resumo de `RateLimitAttempt`, **Then** a spec 021 aparece citada com FR-024.

---

### User Story 2 - Ler o design sem tropeçar em regra antiga (Priority: P1)

Quem abre o `docs/design.md` (a fonte de design do projeto, segundo o CLAUDE.md) para entender a API encontra o modelo de dados, os endpoints e as regras de entrega e busca como estão no ar.

**Why this priority**: O design é lido antes de cada feature; uma rota de convite listada ou a solução "só para logado" levam a planos errados, como na US1.

**Independent Test**: Comparar a seção 4 do design com as rotas registradas na API, as pastas de `apps/api/src/` e as DDEs; nenhuma rota ou módulo inexistente, nenhum faltando e nenhuma regra que uma feature posterior trocou.

**Acceptance Scenarios**:

1. **Given** o design atualizado, **When** alguém procura o modelo de dados, **Then** encontra um resumo das tabelas com link para a DDE de cada uma, sem lista de colunas que possa divergir do banco.
2. **Given** o design atualizado, **When** alguém lê os endpoints, **Then** não encontra rotas de convite e encontra `GET /api/auth/registration` e `GET /api/health`.
3. **Given** o design atualizado, **When** alguém lê "Formato interno" e "Busca sob demanda", **Then** vê que a solução vai a quem tem sessão e ao visitante e que o limite de busca é por endereço para todos.
4. **Given** o design atualizado, **When** alguém lê o critério de sucesso da seção 1, **Then** ele vale para qualquer das fontes, não só o O Globo.

---

### User Story 3 - Entrar no projeto pelo README (Priority: P2)

Quem chega ao repositório lê o `README.md` para saber o que o site faz e quais comandos usar. Tudo o que está lá precisa funcionar e descrever o site de hoje.

**Why this priority**: É a porta de entrada, mas quem trabalha no projeto usa o CLAUDE.md e o design; por isso vem depois das US1 e US2.

**Independent Test**: Rodar (ou conferir na ajuda da linha de comando) cada comando da tabela do README e conferir que a descrição do site bate com o comportamento atual.

**Acceptance Scenarios**:

1. **Given** o README atualizado, **When** alguém lê o estado atual, **Then** vê que se joga sem conta, que a conta guarda o progresso entre aparelhos e que o cadastro fica fechado por padrão, sem menção a convite.
2. **Given** o README atualizado, **When** alguém procura um comando da linha de comando, **Then** encontra `users create --email` e `puzzles collect`, e nenhum comando de convite.
3. **Given** o README atualizado, **When** alguém lê a apresentação e a nota de afiliação, **Then** encontra as duas fontes (O Globo e Cruzada Online) e não encontra "privado".

---

### User Story 4 - Seguir o modelo de uma conta de ponta a ponta (Priority: P3)

Quem lê a DDE-001 quer saber onde estão os outros dados ligados à conta e o que acontece com eles quando a conta é removida.

**Why this priority**: Evita procurar em quatro documentos para responder "o que some junto com a conta?"; cada DDE já descreve a sua própria remoção.

**Independent Test**: A partir só da DDE-001, chegar às DDE-002, DDE-003 e DDE-004 pelo escopo e listar o que é removido com a conta.

**Acceptance Scenarios**:

1. **Given** a DDE-001 atualizada, **When** alguém lê o escopo, **Then** encontra links para DDE-002 (puzzles), DDE-003 (progresso) e DDE-004 (configurações).
2. **Given** a DDE-001 atualizada, **When** alguém lê a nota de `User`, **Then** vê que remover a conta remove as sessões, o progresso e as configurações dela.
3. **Given** a DDE-003 atualizada, **When** alguém lê o escopo, **Then** vê que as configurações da pessoa (inclusive os limites de ajuda) ficam na DDE-004 e não no progresso.

---

### User Story 5 - Regras de gravação das configurações num só lugar (Priority: P3)

Quem consulta a DDE-004 encontra, além dos campos, os limites da gravação na conta e quem pode gravar.

**Why this priority**: Completa um documento novo e correto nos campos; é a lacuna de menor impacto.

**Independent Test**: Conferir na DDE-004 que o limite de tamanho, o limite de frequência por endereço e a regra de que o visitante não envia configurações aparecem, cada um com a FR de origem.

**Acceptance Scenarios**:

1. **Given** a DDE-004 atualizada, **When** alguém lê a nota de `UserSettings`, **Then** encontra o limite de tamanho da gravação e o limite de frequência por endereço, citando FR-024 e a ação da DDE-001.
2. **Given** a DDE-004 atualizada, **When** alguém lê a nota de `UserSettings`, **Then** encontra que o visitante nunca envia configurações ao servidor (FR-021).

---

### User Story 6 - Saber o que mudou nas data definitions (Priority: P4)

Quem já conhecia a versão anterior abre o changelog de cada data definition alterada e vê, numa linha, o que mudou e por qual feature.

**Why this priority**: Ajuda a revisar; o conteúdo correto vale mesmo sem ele.

**Independent Test**: Cada DDE alterada tem uma linha nova no topo do changelog, com a versão de patch seguinte, data 2026-10-21 e a feature de origem.

**Acceptance Scenarios**:

1. **Given** a DDE-001 na versão `0.0.3`, **When** é atualizada, **Then** o changelog ganha a linha `0.0.4` no topo citando as features 008 e 021.
2. **Given** a DDE-003 na versão `0.0.2`, **When** é atualizada, **Then** o changelog ganha a linha `0.0.3` no topo citando a feature 021.
3. **Given** a DDE-004 na versão `0.0.1`, **When** é atualizada, **Then** o changelog ganha a linha `0.0.2` no topo citando a feature 021.

### Edge Cases

- **Documento sem mudança**: a DDE-002, os quatro ERDs, o `docs/deploy.md` e o `docs/versionamento.md` já batem com o sistema e não mudam. Se a conferência mostrar um campo ou relacionamento que precisa mudar num ERD, o ERD muda junto com a sua DDE (FR-007).
- **Trechos históricos do design**: a seção 10 ("Ordem sugerida da implementação") e o "Fora do escopo da v1" registram decisões da época; ficam como estão, porque não descrevem o sistema atual como regra.
- **Seção a completar do `deploy.md`** (tarefa T060 da feature 012): depende de medições em produção e fica fora desta feature.
- **Relacionamentos entre documentos**: a ligação `User` → `UserSettings` continua só na DDE-004 e no ERD-004; a DDE-001 aponta para ela no escopo, sem repetir a entidade nem ganhar relacionamento novo (um diagrama por data definition).
- **Valores só do plano**: o tamanho máximo do corpo e a quantidade de gravações por hora vêm da `research.md` da feature 021 (R6), que a spec cita em FR-024; podem entrar porque a spec os referencia, citando a `research.md` nos artefatos de origem.
- **Convites**: continuam documentados nas DDEs como sem uso até o lançamento B da feature 013; no design e no README somem as rotas e os comandos, que já não existem, e a tabela guardada aparece só como "sem uso" no resumo do modelo.
- **IDs de documento**: nenhum ID muda nem é reaproveitado; os arquivos mantêm o nome.

## Requirements *(mandatory)*

### Functional Requirements

**Data definitions e ERDs**

- **FR-001**: A nota de `RateLimitAttempt` na DDE-001 MUST dizer, citando a spec 021 (FR-024), que toda gravação de configurações na conta é registrada por endereço de rede, ao lado das regras de login, cadastro e busca de puzzle.
- **FR-002**: As tabelas de artefatos de origem e de resumo de entidades da DDE-001 MUST listar as specs citadas pelas notas novas de FR-001 e FR-004.
- **FR-003**: O escopo da DDE-001 MUST apontar para DDE-002, DDE-003 e DDE-004 como continuação do modelo.
- **FR-004**: A nota de `User` na DDE-001 MUST dizer que remover a conta remove as sessões, o progresso (spec 008, FR-014) e as configurações dela (spec 021, FR-026).
- **FR-005**: A DDE-004 MUST registrar, na nota de `UserSettings`, o limite de tamanho da gravação e o limite de frequência por endereço (FR-024, com os valores de R6 da `research.md` da feature 021 citada nos artefatos de origem) e que o visitante nunca envia configurações ao servidor (FR-021).
- **FR-006**: O escopo da DDE-003 MUST dizer que as configurações da pessoa, inclusive os limites de ajuda, ficam na DDE-004 e não fazem parte do progresso.
- **FR-007**: Cada ERD MUST continuar com as mesmas entidades, campos, chaves e relacionamentos da sua data definition; um ERD só muda se a sua DDE mudar algum desses itens.
- **FR-008**: Cada data definition alterada MUST ganhar uma linha no topo do changelog com a versão de patch seguinte, a data 2026-10-21 e as features de origem; versões anteriores MUST ficar intactas. Documentos não alterados MUST NOT ganhar linha.
- **FR-009**: As DDEs e os ERDs MUST seguir as skills `data-definition` e `entity-relationship-diagram`: seções do template e nada além delas, textos em português, entidades no singular em inglês, campos em `lower_snake_case`.
- **FR-010**: Toda informação nova nas DDEs MUST ser rastreável a uma `spec.md` (FR-NNN ou história de usuário), ou à `research.md` que a spec cita, listada nos artefatos de origem.

**Design**

- **FR-011**: A tabela "Modelo de dados" do `docs/design.md` MUST ser trocada por um resumo das tabelas do banco (`users`, `sessions`, `invites` sem uso, `rate_limit_attempts`, `puzzles`, `progress`, `user_settings`), cada uma com uma frase e o link para a DDE que a define; a lista de colunas MUST ficar só nas DDEs.
- **FR-012**: "Formato interno" MUST dizer que a solução vai ao navegador junto do puzzle para quem tem sessão e para o visitante (features 007 e 013), como já diz a seção 6.
- **FR-013**: "Busca sob demanda" MUST dizer que o limite de idas à fonte é por endereço e vale para todos, com ou sem conta (spec 013, FR-003).
- **FR-014**: "Endpoints" MUST listar todas as rotas que a API registra hoje, e só elas: incluir `GET /api/auth/registration` e `GET /api/health`, remover as rotas de convite.
- **FR-015**: O critério de sucesso da seção 1 MUST falar em escolher uma cruzada e uma data, sem limitar ao O Globo.
- **FR-015a**: A árvore de `apps/api/src/` na seção 4 MUST listar todos os módulos de hoje (`auth`, `health`, `library`, `progress`, `puzzles`, `rate-limit`, `settings`) e as pastas `docs/` e `http/`, cada um com uma descrição curta, e nenhuma descrição MUST atribuir a um módulo o que é de outro (por exemplo, o limite de tentativas fica em `rate-limit`, não em `auth`). (Achado no planejamento, 2026-10-21.)

**README**

- **FR-016**: O estado atual do `README.md` MUST descrever o site de hoje: joga-se sem conta (progresso no aparelho), a conta guarda progresso e configurações entre aparelhos, o cadastro fica fechado por padrão e o autor cria contas pela linha de comando; MUST NOT mencionar convite.
- **FR-017**: A tabela de comandos MUST trocar `invites create` por `users create --email <email>` e `puzzles collect`, com descrição de uma linha cada; todos os comandos listados MUST existir e as descrições MUST bater com o que cada um faz hoje (por exemplo, o seed também guarda um puzzle de exemplo).
- **FR-018**: A apresentação MUST citar as duas fontes (O Globo e Cruzada Online) e descrever o site como aberto a quem tem o endereço e fora dos buscadores, em vez de "privado"; a nota de afiliação MUST citar as duas fontes.

**Geral**

- **FR-019**: Textos em português, seguindo o tom e a formatação de cada documento; o Prettier do repositório MUST passar nos arquivos alterados.
- **FR-020**: Nenhum segredo pode virar valor de exemplo (constitution, princípio VI).

### Key Entities *(include if feature involves data)*

- **User**: conta de uma pessoa; a nota passa a dizer o que some junto com ela.
- **RateLimitAttempt**: tentativa sujeita a limite; a nota passa a cobrir a gravação de configurações.
- **UserSettings**: configurações guardadas na conta; a nota passa a trazer os limites da gravação e a regra do visitante.
- **Progress**: sem mudança de campo; o escopo da DDE-003 passa a apontar para as configurações.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cada uma das 4 ações em uso (`LOGIN`, `REGISTER`, `PUZZLE_FETCH`, `SETTINGS_SAVE`) tem, na DDE-001, a regra de registro e a spec de origem, e `INVITE_CREATE` aparece como sem uso (hoje 3 de 4 têm regra).
- **SC-002**: A partir da DDE-001, uma pessoa chega às outras 3 data definitions em 1 clique e responde "o que some junto com a conta" sem abrir outro documento.
- **SC-003**: Numa conferência campo a campo entre as 4 data definitions, os 4 ERDs e o schema versionado, 100% das entidades, campos, valores permitidos e relacionamentos coincidem.
- **SC-004**: A lista de endpoints do design e a lista de rotas registradas na API coincidem 100%, nos dois sentidos; a documentação OpenAPI (`/api/docs/`, só fora de produção) aparece apenas como nota e não conta como endpoint.
- **SC-005**: Todos os comandos da tabela do README existem, e zero trechos do README e do design descrevem como regra em vigor algo que uma feature posterior removeu (convite, solução só com sessão, busca só de logado, fonte única, site privado).
- **SC-006**: Cada data definition alterada tem exatamente uma linha nova no changelog, e as não alteradas nenhuma.

## Assumptions

- A conferência foi feita contra o schema do banco depois da migração `0005`, as rotas registradas na API, os comandos da linha de comando e as specs até a 021.
- As preferências guardadas só no aparelho continuam fora do modelo de dados, como decidido na feature 020 e repetido no escopo da DDE-004.
- O lançamento B da feature 013 (descarte dos convites) ainda não saiu; quando sair, uma atualização futura remove `Invite` e `INVITE_CREATE` das DDEs e `invites` do resumo do design.
- O `docs/deploy.md` e o `docs/versionamento.md` foram conferidos e já descrevem o sistema atual (o deploy já trata o cadastro sem convite).
- O CLAUDE.md fica fora: ele é atualizado a cada feature e já descreve tudo o que esta spec corrige nos outros documentos.
- Por ser trabalho de documentação, o CLAUDE.md permite fazê-lo direto, sem o ciclo completo do Spec Kit; esta spec existe porque o autor pediu `/speckit-specify`.
