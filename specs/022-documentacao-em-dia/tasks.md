---

description: "Task list for feature 022: documentação em dia com o sistema"
---

# Tasks: Documentação em dia com o sistema

**Input**: Design documents from `/specs/022-documentacao-em-dia/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: não pedidos. A feature é só documentação; a conferência é a do [quickstart.md](./quickstart.md), feita na fase final.

**Organization**: uma fase por história da spec, na ordem de prioridade. US1 (limite de tentativas na DDE-001) e US2 (design) são P1; US3 (README) é P2; US4 (remoção da conta e links entre DDEs) e US5 (DDE-004) são P3; US6 (changelogs) é P4. US1, US4 e US6 tocam a DDE-001, então rodam em sequência nesse arquivo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 a US6, como na spec.
- Caminhos relativos à raiz do repositório. Mudam só `docs/data-definitions/DDE-001-banco-auth-convites.md`, `docs/data-definitions/DDE-003-progresso-usuario-puzzle.md`, `docs/data-definitions/DDE-004-configuracoes-usuario.md`, `docs/design.md` e `README.md`.

## Regras que valem para todas as tarefas

- Nas DDEs, seguir `.claude/skills/data-definition/SKILL.md`: só as seções do template `.claude/skills/data-definition/template/DDE-999-template.md`, textos em português, entidades no singular em inglês, campos em `lower_snake_case`, tipos lógicos só `Text`, `Number`, `Date`, `Boolean`, `UUID`. Campos e relacionamentos não mudam.
- Não tocar a DDE-002 nem os quatro ERDs em `docs/entity-relationship-diagrams/` (research R2).
- Não mudar ID nem nome de arquivo. Não remover `Invite` nem `INVITE_CREATE` das DDEs (existem no banco até o lançamento B da feature 013).
- Toda frase nova numa DDE que afirma uma regra cita a origem conforme a tabela R6 de [research.md](./research.md).
- No design e no README, manter o tom, a estrutura de seções e a formatação de cada documento; mexer só nos trechos listados em [data-model.md](./data-model.md). No design, a seção 10 e "Fora do escopo da v1" ficam como estão.
- Referências de verdade, que não são editadas: `apps/api/src/db/schema.ts`, `apps/api/src/modules/*/*.routes.ts`, `apps/api/src/cli/run-cli.ts`.
- Nenhum valor de exemplo de senha, token ou código (constitution, princípio VI).
- Commits em inglês, Conventional Commits, tipo `docs`, sem linha de coautoria nem atribuição a IA (CLAUDE.md).

---

## Phase 1: Setup

**Purpose**: branch e ponto de partida.

- [X] T001 Criar a branch `docs/022-documentacao-em-dia` a partir de `main` atualizada, levando junto `specs/022-documentacao-em-dia/` (ainda não commitada), e rodar `npm run format:check` para confirmar que está verde antes de qualquer mudança

---

## Phase 2: Foundational (Blocking Prerequisites)

Nenhuma. Cada história trabalha sobre arquivos que já existem.

---

## Phase 3: User Story 1 - Saber tudo o que o limite de tentativas cobre (Priority: P1) 🎯 MVP

**Goal**: cada uma das 4 ações em uso de `action` na DDE-001 tem regra de registro e spec de origem; `INVITE_CREATE` continua só como sem uso (SC-001).

**Independent Test**: quickstart, passo 1.

- [X] T002 [US1] Em `docs/data-definitions/DDE-001-banco-auth-convites.md`:
  - **Source Artifacts**: acrescentar, depois da última linha da spec 013, `[specs/021-configuracoes-usuario/spec.md](../../specs/021-configuracoes-usuario/spec.md) (FR-024) | Spec | Limite de tamanho e de frequência por endereço ao salvar configurações na conta`.
  - **Entity Summary**: origem de `RateLimitAttempt` passa a `FR-027 a FR-029 (004); US1 (006); FR-003, FR-014 (013); FR-024 (021)`.
  - **Nota de `RateLimitAttempt`** (parágrafo depois da tabela): depois da frase da busca de puzzle, acrescentar "Na gravação de configurações na conta, toda gravação é registrada por endereço de rede (spec 021, FR-024)." Manter as frases de janela e de ausência de vínculo com `User`.

**Checkpoint**: as 4 ações em uso têm regra; `INVITE_CREATE` continua marcada como sem uso.

---

## Phase 4: User Story 2 - Ler o design sem tropeçar em regra antiga (Priority: P1)

**Goal**: a seção 4 do `docs/design.md` e o critério de sucesso batem com a API de hoje.

**Independent Test**: quickstart, passos 4 e 5 (parte do design).

- [X] T003 [US2] Em `docs/design.md`, seção 1, linha "**Sucesso:**": trocar "escolhe uma data do O Globo" por "escolhe uma cruzada e uma data" (FR-015). O resto da frase fica.
- [X] T004 [US2] Em `docs/design.md`, seção 4, bloco da árvore de `apps/api/src/` (FR-015a, R4): dentro de `modules/`, manter `auth/`, `puzzles/` e `progress/` e acrescentar, depois deles e no mesmo alinhamento:
  - `health/` — "saúde, versão e commit no ar";
  - `library/` — "biblioteca: puzzles guardados com a situação de quem pede";
  - `rate-limit/` — "limites de tentativas guardados no banco";
  - `settings/` — "configurações da conta".
  
  Corrigir a descrição de `auth/` para "cadastro, login, logout, sessão" (o limite de tentativas passa a `rate-limit/`; FR-015a pede que nenhuma descrição atribua a um módulo o que é de outro). Acrescentar, no nível de `modules/`: `docs/` — "documentação OpenAPI, só fora de produção"; `http/` — "guarda do repasse (segredo e endereço de quem acessa)".
- [X] T005 [US2] Em `docs/design.md`, "Formato interno", último item: "vai ao navegador junto do puzzle, só para usuário logado, para o front controlar as dicas (feature 007, constituição 3.0.0)" passa a "vai ao navegador junto do puzzle, para quem tem sessão e para o visitante, para o front controlar as dicas (features 007 e 013)" (FR-012).
- [X] T006 [US2] Em `docs/design.md`, "Modelo de dados (Postgres)": trocar a tabela de colunas por uma tabela `| Tabela | Para que serve |` (FR-011, R3), uma linha por tabela, com link para a DDE (caminho relativo `data-definitions/DDE-00N-....md`):
  - `users`: contas ([DDE-001](data-definitions/DDE-001-banco-auth-convites.md));
  - `sessions`: sessões abertas no login, guardadas só como hash (DDE-001);
  - `invites`: convites do cadastro antigo, sem uso desde a feature 013 e removidos no lançamento B (DDE-001);
  - `rate_limit_attempts`: tentativas sujeitas a limite (login, cadastro, busca na fonte, gravação de configurações) (DDE-001);
  - `puzzles`: um puzzle por fonte, nível e data, parte pública e solução separadas ([DDE-002](data-definitions/DDE-002-coleta-puzzles.md));
  - `progress`: progresso de cada conta em cada puzzle ([DDE-003](data-definitions/DDE-003-progresso-usuario-puzzle.md));
  - `user_settings`: configurações da conta ([DDE-004](data-definitions/DDE-004-configuracoes-usuario.md)).
  
  Antes da tabela, uma frase: "As colunas, os valores permitidos e os relacionamentos de cada tabela estão nas data definitions, com um diagrama por data definition em `entity-relationship-diagrams/`." Manter o parágrafo que vem depois da tabela (configurações no aparelho e em `user_settings`).
- [X] T007 [US2] Em `docs/design.md`, "Busca sob demanda", última frase: "Cada ida à fonte conta num limite persistido por endereço (30 por hora), para um usuário logado não martelar a fonte." passa a "Cada ida à fonte conta num limite persistido por endereço (30 por hora), com ou sem conta, para ninguém martelar a fonte (feature 013)." (FR-013).
- [X] T008 [US2] Em `docs/design.md`, "Endpoints (visão geral)" (FR-014, R4 e mapa de acesso de [data-model.md](./data-model.md)): reescrever a lista com as 14 rotas, agrupadas como hoje, cada grupo ou rota com o acesso entre parênteses:
  - `GET /api/health` (aberta; versão e commit no ar)
  - `POST /api/auth/register` (aberta, só com o cadastro ligado), `GET /api/auth/registration` (aberta; diz se o cadastro está aberto), `POST /api/auth/login` (aberta), `POST /api/auth/logout` (aberta; sem sessão também responde 204), `GET /api/auth/me` (sessão)
  - `GET /api/puzzles?source=&level=&date=`, `GET /api/puzzles/:id` (visitante ou conta)
  - `GET /api/library?source=` (visitante ou conta) com a descrição atual; acrescentar que, sem conta, todos vêm não iniciados
  - `GET /api/progress/:puzzleId`, `PUT /api/progress/:puzzleId`, `POST /api/progress/:puzzleId/reset` (sessão), com as descrições atuais
  - `GET /api/settings`, `PUT /api/settings` (sessão), com a descrição atual
  
  Remover a linha `POST /api/invites`, `GET /api/invites`. Fechar com: "Fora de produção, a API também serve a documentação OpenAPI em `/api/docs/`."

**Checkpoint**: endpoints e módulos do design coincidem com o código; nenhuma regra antiga na seção 4.

---

## Phase 5: User Story 3 - Entrar no projeto pelo README (Priority: P2)

**Goal**: o `README.md` descreve o site de hoje e só lista comandos que existem.

**Independent Test**: quickstart, passos 5 (parte do README) e 6.

- [X] T009 [P] [US3] Em `README.md`, apresentação e estado atual (FR-016, FR-018, R5):
  - Primeiro parágrafo: "com o progresso salvo entre dispositivos" passa a "com o progresso salvo no aparelho ou, com conta, entre dispositivos".
  - Segundo parágrafo: "A primeira fonte é o jogo de palavras cruzadas do **O Globo**, com escolha de nível e de data. É um projeto de portfólio, pequeno e privado, com foco ..." passa a "As fontes são as palavras cruzadas do **O Globo** e a **Cruzada Online**, do jornal Público, com escolha de data. É um projeto de portfólio, pequeno, aberto a quem tem o endereço e fora dos buscadores, com foco ...".
  - Estado atual: "o jogo está completo (login por convite, calendário, tabuleiro, ajudas e progresso entre aparelhos)" passa a "o jogo está completo: joga-se sem conta, com o progresso no aparelho, ou com conta, com progresso e configurações entre aparelhos; o cadastro fica fechado por padrão e o autor cria contas pela linha de comando. Há calendário por fonte, tabuleiro, ajudas e configurações". Manter o fim da frase com o link para `docs/deploy.md`.
- [X] T010 [US3] Em `README.md`, tabela de comandos (FR-017, R5): trocar a linha `invites create` por duas linhas, `npm run cli -w @cruzadinha/api -- users create --email <email>` | "Cria uma conta, mesmo com o cadastro fechado (a senha é pedida sem eco)." e `npm run cli -w @cruzadinha/api -- puzzles collect` | "Guarda o puzzle do dia de cada fonte e o histórico que faltar.". Na linha do seed, "Cria o usuário de teste do `.env` (só em desenvolvimento)." passa a "Cria o usuário de teste do `.env` e um puzzle de exemplo (só em desenvolvimento)." (FR-017: descrições batem com o que cada comando faz; CLAUDE.md, `db:seed`).
- [X] T011 [US3] Em `README.md`, última linha de "Licença": "este projeto não é afiliado ao O Globo." passa a "este projeto não é afiliado ao O Globo nem ao Público." (FR-018).

**Checkpoint**: nenhuma menção a convite ou "privado"; os comandos listados existem.

---

## Phase 6: User Story 4 - Seguir o modelo de uma conta de ponta a ponta (Priority: P3)

**Goal**: a DDE-001 leva às outras DDEs e diz o que some com a conta; a DDE-003 aponta para as configurações.

**Independent Test**: quickstart, passo 2.

- [X] T012 [US4] Em `docs/data-definitions/DDE-001-banco-auth-convites.md` (depois de T002, mesmo arquivo):
  - **Scope**: a última frase "Puzzles e progresso ficam nas [DDE-002](./DDE-002-coleta-puzzles.md) e [DDE-003](./DDE-003-progresso-usuario-puzzle.md)." passa a "Puzzles, progresso e configurações ficam nas [DDE-002](./DDE-002-coleta-puzzles.md), [DDE-003](./DDE-003-progresso-usuario-puzzle.md) e [DDE-004](./DDE-004-configuracoes-usuario.md)." (FR-003).
  - **Source Artifacts**: acrescentar `[specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-014) | Spec | Remover o usuário remove o progresso dele` antes das linhas da 013, e completar a linha da spec 021 de T002 para `(FR-024, FR-026)` com a descrição "Limite ao salvar configurações na conta; remover a conta remove as configurações".
  - **Entity Summary**: origem de `User` passa a `FR-005 a FR-009 (004); FR-014 (008); FR-014 a FR-019 (013); FR-026 (021)`.
  - **Nota de `User`**: acrescentar ao fim do parágrafo "Remover a conta remove as sessões dela, o progresso ([DDE-003](./DDE-003-progresso-usuario-puzzle.md); spec 008, FR-014) e as configurações ([DDE-004](./DDE-004-configuracoes-usuario.md); spec 021, FR-026)." (FR-004).
- [X] T013 [P] [US4] Em `docs/data-definitions/DDE-003-progresso-usuario-puzzle.md`:
  - **Scope**: acrescentar ao fim "As configurações da pessoa, inclusive os limites de ajuda, não fazem parte do progresso: ficam na [DDE-004](./DDE-004-configuracoes-usuario.md)." (FR-006).
  - **Source Artifacts**: acrescentar `[specs/021-configuracoes-usuario/spec.md](../../specs/021-configuracoes-usuario/spec.md) (FR-008, FR-020) | Spec | Limites de ajuda e demais configurações guardados à parte do progresso`.
  - Entidades e relacionamentos sem mudança.

**Checkpoint**: a partir da DDE-001 chega-se às outras três e lê-se o que some com a conta.

---

## Phase 7: User Story 5 - Regras de gravação das configurações num só lugar (Priority: P3)

**Goal**: a DDE-004 traz os limites da gravação e a regra do visitante.

**Independent Test**: ler a nota de `UserSettings` e achar 4 KB, 120 por hora por endereço e "visitante nunca envia", cada um com a FR.

- [X] T014 [P] [US5] Em `docs/data-definitions/DDE-004-configuracoes-usuario.md` (FR-005):
  - **Source Artifacts**: acrescentar `[specs/021-configuracoes-usuario/research.md](../../specs/021-configuracoes-usuario/research.md) (R6) | Plan | Valores dos limites de tamanho e de frequência`.
  - **Nota de `UserSettings`**: depois de "A chave é o próprio `user_id`: um registro por usuário, sem coluna a mais.", acrescentar "Cada gravação na conta tem corpo de até 4 KB e conta no limite de 120 gravações por hora por endereço de rede, registradas como `SETTINGS_SAVE` em `RateLimitAttempt` ([DDE-001](./DDE-001-banco-auth-convites.md)) (FR-024). O visitante nunca envia configurações ao servidor: as dele ficam só no aparelho (FR-021)."
  - Campos e relacionamento sem mudança.

**Checkpoint**: a DDE-004 tem as regras de gravação.

---

## Phase 8: User Story 6 - Saber o que mudou nas data definitions (Priority: P4)

**Goal**: cada DDE alterada tem uma linha nova no topo do changelog; as outras não.

**Independent Test**: quickstart, passo 7.

- [X] T015 [US6] Em `docs/data-definitions/DDE-001-banco-auth-convites.md` (depois de T012), acrescentar no topo do changelog `` `0.0.4` | 2026-10-21 | - Gravação de configurações no limite de tentativas (021). - O que some com a conta (008, 021). - Links para a DDE-004. ``
- [X] T016 [P] [US6] Em `docs/data-definitions/DDE-003-progresso-usuario-puzzle.md` (depois de T013), acrescentar no topo do changelog `` `0.0.3` | 2026-10-21 | - Configurações fora do progresso, na DDE-004 (021). ``
- [X] T017 [P] [US6] Em `docs/data-definitions/DDE-004-configuracoes-usuario.md` (depois de T014), acrescentar no topo do changelog `` `0.0.2` | 2026-10-21 | - Limites da gravação na conta e regra do visitante (021). ``

**Checkpoint**: DDE-001 `0.0.4`, DDE-003 `0.0.3`, DDE-004 `0.0.2`; DDE-002 continua `0.0.3`.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T018 Rodar `npx prettier --write README.md docs/design.md docs/data-definitions/` e depois `npm run format:check` (research R7)
- [X] T019 Rodar os passos 1 a 7 de `specs/022-documentacao-em-dia/quickstart.md` e corrigir o que falhar
- [X] T020 Commitar em `docs/022-documentacao-em-dia` com `docs: bring design, readme and data definitions up to date` (corpo curto citando as features 013, 014 e 021 e a spec 022) e, se o autor pedir, abrir o PR para `main` com título no mesmo formato, resumo e plano de teste (`.claude/rules/git-conventions.md`)

- [X] T021 Em `docs/entity-relationship-diagrams/ERD-004-configuracoes-usuario.md` (achado na revisão do PR): o atributo `settings` de `USER_SETTINGS` ganha o comentário com os campos do documento JSON da DDE-004 (`theme, helpLetters, helpWords, strikeMode, defaultSource, directToGame, boardCellSize, libraryWidth`) e `saved_at` ganha o comentário "momento da mudança no aparelho; vale o mais recente", no padrão dos comentários do ERD-001; entidades, colunas e relacionamento sem mudança

---

## Dependencies & Execution Order

- **Setup (T001)** → tudo.
- **DDE-001**: T002 (US1) → T012 (US4) → T015 (US6), em sequência (mesmo arquivo).
- **DDE-003**: T013 (US4) → T016 (US6).
- **DDE-004**: T014 (US5) → T017 (US6).
- **Design**: T003 a T008 no mesmo arquivo, em sequência; independentes das DDEs e do README.
- **README**: T009 → T010 → T011, em sequência; independentes do resto.
- **Polish**: T018 depois de todas; T019 depois de T018; T020 por último.

### Parallel Example

```text
# Depois de T001, cinco arquivos diferentes ao mesmo tempo:
T002 DDE-001  |  T003..T008 design  |  T009..T011 README  |  T013 DDE-003  |  T014 DDE-004

# Changelogs, cada um depois do seu arquivo:
T015 DDE-001 (depois de T012)  |  T016 DDE-003  |  T017 DDE-004
```

## Implementation Strategy

- **MVP**: Setup + US1 + US2 (T001 a T008). A DDE-001 e o design, os dois documentos lidos antes de planejar uma feature, deixam de levar a planos errados.
- **Incremento 2**: US3 (T009 a T011), README.
- **Incremento 3**: US4 e US5 (T012 a T014), links e regras de remoção e gravação.
- **Incremento 4**: US6 (T015 a T017), changelogs.
- **Fechamento**: T018 a T020, num único commit `docs` (não gera versão, `docs/versionamento.md`).
