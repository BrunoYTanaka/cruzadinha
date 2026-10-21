# Feature Specification: Data definitions e diagramas entidade-relacionamento em dia com o sistema

**Feature Branch**: `docs/020-atualizar-modelo-dados`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Update data-definitions and entity-relationsship-diagrams"

## Contexto

O modelo lógico de dados do Cruzadinha está em `docs/data-definitions/` (DDE-001 a DDE-003) e os diagramas em `docs/entity-relationship-diagrams/` (ERD-001 a ERD-003). Os seis documentos foram escritos até a feature 008 e não acompanharam as features seguintes. Hoje eles divergem do sistema em vários pontos:

- **DDE-001 / ERD-001 (contas, sessões, convites, tentativas)**: descrevem o cadastro mediante convite, a cota de 3 convites e a administração de convites pela linha de comando. A feature 013 tirou os convites de uso: o cadastro pede só e-mail e senha, fica atrás de uma chave de configuração (fechado por padrão), e o autor cria contas pela linha de comando. A entidade `Invite` continua guardada, sem uso, até o lançamento B da feature 013, que a descarta. A lista de ações de `RateLimitAttempt` não traz `PUZZLE_FETCH` (feature 006) e ainda apresenta `INVITE_CREATE` como em uso. `User` ainda é descrito como "conta de uma pessoa convidada".
- **DDE-002 / ERD-002 (puzzles)**: `source` só admite `oglobo`, mas a feature 014 acrescentou `cruzadaonline`. A solução aparece como entregue "só a usuário com sessão", mas a feature 013 passou a entregá-la também ao visitante. A seção de relacionamentos ainda fala do progresso como "feature futura", que já existe (DDE-003). O ERD-002 dá a `data` e `solution` um tipo diferente do usado no ERD-003 para os mesmos campos.
- **DDE-003 / ERD-003 (progresso)**: continua correto para o progresso de quem tem conta. Não diz que o progresso do visitante (feature 013) existe e nunca chega ao servidor.

Esta feature atualiza os documentos para refletirem o que está no ar e registra cada mudança no changelog de cada data definition. É trabalho de documentação: nada muda no banco, na API ou no site.

## Clarifications

### Session 2026-10-20

- Q: O progresso do visitante (guardado só no aparelho, feature 013) entra no modelo de dados? → A: Só como nota na DDE-003, apontando para a spec 013. Não vira entidade nem ERD: repete quase todo o `Progress`, já está detalhado no `data-model.md` da feature 013 e não se relaciona com nenhuma entidade do servidor.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ler o modelo de dados atual sem precisar abrir o código (Priority: P1)

Quem vai planejar uma feature nova (o autor ou um agente) abre as data definitions para saber quais entidades, campos e valores existem hoje. Cada campo, valor permitido e relacionamento descrito precisa bater com o que o sistema guarda e faz agora.

**Why this priority**: É a razão de existir dos documentos. Um modelo desatualizado leva a planos errados, por exemplo uma feature que conte com convites ou que limite a fonte a O Globo.

**Independent Test**: Comparar cada entidade, campo, valor permitido e relacionamento das três data definitions com o schema versionado e com as specs 004 a 014; nenhuma divergência pode sobrar.

**Acceptance Scenarios**:

1. **Given** a DDE-002 atualizada, **When** alguém consulta os valores permitidos de `source`, **Then** encontra `oglobo` e `cruzadaonline`, com a spec 014 citada como origem.
2. **Given** a DDE-001 atualizada, **When** alguém lê a entidade `Invite`, **Then** vê que ela está sem uso desde a feature 013 e que será descartada no lançamento B, e não encontra o cadastro por convite descrito como regra atual.
3. **Given** a DDE-001 atualizada, **When** alguém consulta as ações de `RateLimitAttempt`, **Then** encontra `LOGIN`, `REGISTER`, `PUZZLE_FETCH` e `INVITE_CREATE`, com `INVITE_CREATE` marcado como sem uso.
4. **Given** a DDE-002 atualizada, **When** alguém lê a nota de `solution`, **Then** vê que ela é entregue a quem tem sessão e ao visitante, sempre validada contra a grade antes de sair.

---

### User Story 2 - Diagramas coerentes com as data definitions (Priority: P2)

Quem prefere a visão gráfica abre o ERD de uma data definition e vê as mesmas entidades, campos, chaves e relacionamentos, com os mesmos tipos para o mesmo campo em todos os diagramas.

**Why this priority**: Os ERDs são derivados das data definitions; só têm valor se acompanharem o texto.

**Independent Test**: Para cada par DDE/ERD, conferir que todo campo e relacionamento de um aparece no outro, e que um campo repetido em mais de um ERD tem o mesmo tipo em todos.

**Acceptance Scenarios**:

1. **Given** os ERDs atualizados, **When** alguém compara `data` e `solution` no ERD-002 e no ERD-003, **Then** os dois usam o mesmo tipo.
2. **Given** o ERD-001 atualizado, **When** alguém olha a entidade `INVITE` e seus relacionamentos, **Then** fica claro no diagrama que ela está sem uso.
3. **Given** qualquer ERD atualizado, **When** é exibido num leitor de Markdown com Mermaid, **Then** o diagrama renderiza sem erro de sintaxe.

---

### User Story 3 - Saber o que mudou em cada documento (Priority: P3)

Quem já conhecia a versão anterior abre o changelog da data definition e vê, em poucas linhas, o que mudou e por qual feature.

**Why this priority**: Ajuda a revisar a mudança, mas o modelo correto (US1) vale mesmo sem ele.

**Independent Test**: Cada DDE alterada tem uma nova linha no topo do changelog, com versão de patch seguinte, data 2026-10-20 e as features de origem citadas.

**Acceptance Scenarios**:

1. **Given** a DDE-001 na versão `0.0.1`, **When** é atualizada, **Then** o changelog ganha a linha `0.0.2` no topo citando as features 006 e 013.
2. **Given** a DDE-002 na versão `0.0.2`, **When** é atualizada, **Then** o changelog ganha a linha `0.0.3` no topo citando as features 008, 013 e 014.
3. **Given** a DDE-003 na versão `0.0.1`, **When** é atualizada, **Then** o changelog ganha a linha `0.0.2` no topo citando a feature 013.

### Edge Cases

- **Entidade guardada mas sem uso** (`Invite`, valor `INVITE_CREATE`): continua documentada enquanto existir no banco, marcada como sem uso e com o destino (lançamento B da feature 013). Quando o lançamento B sair, uma atualização futura a remove; esta feature não antecipa essa remoção.
- **Dado que nunca chega ao servidor** (progresso do visitante, guardado só no aparelho): não vira entidade nem ERD. A DDE-003 ganha uma nota dizendo que ele existe, fica só no aparelho, nunca é enviado ao servidor nem misturado ao progresso da conta, e que os campos estão na spec 013.
- **Valores identificados só no plano ou no código** (por exemplo, o nome da fonte exibido na atribuição): entram só se uma spec os definir, conforme a regra de entrada da skill de data definition.
- **IDs de documento**: nenhum ID existente muda nem é reaproveitado; os arquivos atualizados mantêm o nome.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A DDE-001 MUST descrever o cadastro atual: só e-mail e senha, controlado por uma chave de configuração fechada por padrão, e a criação de contas pelo autor na linha de comando (spec 013, FR-014 a FR-019). `User` MUST deixar de ser descrito como conta de pessoa convidada.
- **FR-002**: A DDE-001 MUST manter a entidade `Invite` e seus dois relacionamentos com `User`, marcados como sem uso desde a feature 013 e a descartar no lançamento B (spec 013, FR-020 a FR-022). As regras de convite (validade, cota, revogação) MUST aparecer como históricas, não como regras em vigor.
- **FR-003**: A DDE-001 MUST listar as ações de `RateLimitAttempt` que o sistema aceita hoje: `LOGIN`, `REGISTER`, `PUZZLE_FETCH` (spec 006, US1, e spec 013, FR-003) e `INVITE_CREATE` (sem uso, sai no lançamento B), e a nota de quais tentativas são registradas MUST incluir a busca de puzzle por endereço de rede, valendo também para o visitante (spec 013, FR-003).
- **FR-004**: A DDE-002 MUST listar `oglobo` e `cruzadaonline` como valores permitidos de `source`, citando a spec 014 nos artefatos de origem, e MUST manter a regra de um puzzle por fonte, nível e data, com fontes diferentes no mesmo dia como registros diferentes.
- **FR-005**: A DDE-002 MUST dizer que a parte pública e a solução são entregues a quem tem sessão e ao visitante (spec 013, FR-002), mantendo a validação contra a grade antes da entrega e a proibição de expor a solução em erro ou log.
- **FR-006**: A DDE-002 MUST trocar a menção ao progresso como "feature futura" pelo relacionamento com `Progress` já definido na DDE-003.
- **FR-007**: A DDE-003 MUST continuar descrevendo o progresso de quem tem conta e MUST ganhar uma nota sobre o progresso do visitante: guardado só no aparelho, nunca enviado ao servidor nem misturado ao progresso da conta, com os campos definidos na spec 013 (FR-004, FR-011, FR-012), citada nos artefatos de origem. O progresso do visitante MUST NOT virar entidade nem ganhar ERD próprio.
- **FR-008**: Cada ERD MUST conter as mesmas entidades, campos, chaves e relacionamentos da sua data definition, e um mesmo campo MUST ter o mesmo tipo em todos os ERDs.
- **FR-009**: Cada data definition alterada MUST ganhar uma linha no topo do changelog com a versão de patch seguinte, a data da mudança e as features de origem; versões anteriores MUST ficar intactas.
- **FR-010**: Os documentos MUST seguir as skills `data-definition` e `entity-relationship-diagram`: seções do template e nada além delas, textos em português, entidades no singular em inglês, campos em `lower_snake_case`, ERD só com o bloco Mermaid, um diagrama por data definition (nunca o sistema inteiro num só).
- **FR-011**: Toda informação nova nos documentos MUST ser rastreável a uma `spec.md` (FR-NNN ou história de usuário) listada nos artefatos de origem.
- **FR-012**: Nenhum segredo pode virar valor de exemplo: os documentos continuam guardando só hashes de senha, token e código (constitution, princípio VI).

### Key Entities *(include if feature involves data)*

- **User**: conta de uma pessoa; agora criada pelo cadastro aberto (quando a chave está ligada) ou pela linha de comando do autor.
- **Session**: acesso aberto por uma conta; sem mudança de regra.
- **Invite**: código de uso único do cadastro antigo; guardado sem uso até o lançamento B da feature 013.
- **RateLimitAttempt**: tentativa sujeita a limite; ganha `PUZZLE_FETCH` na lista de ações documentadas.
- **Puzzle**: cruzada de uma fonte, nível e data; ganha a fonte `cruzadaonline` e passa a ser entregue também ao visitante.
- **Progress**: progresso de quem tem conta em cada puzzle; sem mudança de regra.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Numa conferência campo a campo entre as data definitions e o schema versionado do banco, 100% das entidades, campos e valores permitidos coincidem (as entidades sem uso aparecem marcadas como tal).
- **SC-002**: Zero trechos dos documentos descrevem como regra em vigor algo que uma feature posterior removeu ou substituiu (cadastro por convite, cota de convites, fonte única, solução só com sessão, progresso "futuro").
- **SC-003**: Os 3 ERDs renderizam sem erro num leitor de Markdown com Mermaid, e cada campo repetido entre eles tem um único tipo.
- **SC-004**: Cada data definition alterada tem exatamente uma linha nova no changelog, e uma pessoa que leu a versão anterior identifica o que mudou lendo só essa linha.

## Assumptions

- O modelo reflete o que está no ar depois do lançamento A da feature 013 e da feature 014. O lançamento B (descarte dos convites) ainda não saiu e será refletido numa atualização futura.
- As features 015 a 019 mudaram só o site, sem dados novos; as preferências guardadas no aparelho (tema, tamanho do tabuleiro, largura do calendário, fonte escolhida, ajudas) são conveniências de tela e ficam fora do modelo de dados.
- A feature 009 (biblioteca) é só leitura e não cria entidade; a situação da biblioteca é derivada de `Progress` e não ganha documento próprio.
- Os documentos atualizados mantêm o nome de arquivo e o ID; só o conteúdo e o changelog mudam.
- Por ser trabalho de documentação, o CLAUDE.md permite fazê-lo direto, sem o ciclo completo do Spec Kit; esta spec existe porque o autor pediu `/speckit-specify`.
