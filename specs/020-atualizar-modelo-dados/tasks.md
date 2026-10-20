---

description: "Task list for feature 020: data definitions e diagramas entidade-relacionamento em dia com o sistema"
---

# Tasks: Data definitions e diagramas entidade-relacionamento em dia com o sistema

**Input**: Design documents from `/specs/020-atualizar-modelo-dados/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: não pedidos. A feature é só documentação; a conferência é a do [quickstart.md](./quickstart.md), feita na fase final.

**Organization**: uma fase por história da spec. US1 (texto das DDEs em dia) é P1; US2 (ERDs coerentes com as DDEs) é P2 e depende da US1, porque cada ERD é derivado da sua DDE; US3 (changelog) é P3 e toca os mesmos arquivos da US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (DDEs), US2 (ERDs), US3 (changelogs).
- Caminhos relativos à raiz do repositório. Só `docs/data-definitions/` e `docs/entity-relationship-diagrams/` mudam; banco, API, site e `packages/shared` não mudam.

## Regras que valem para todas as tarefas

- Seguir `.claude/skills/data-definition/SKILL.md` e `.claude/skills/entity-relationship-diagram/SKILL.md`:
  - só as seções do template `.claude/skills/data-definition/template/DDE-999-template.md`, sem seção nova;
  - textos em português; entidades no singular em inglês (`User`); campos em `lower_snake_case`;
  - tipos lógicos das DDEs só `Text`, `Number`, `Date`, `Boolean`, `UUID`;
  - arquivo de ERD com só o bloco ```` ```mermaid ````, sem texto fora dele; entidades em `UPPER_SNAKE_CASE`.
- Não mudar ID nem nome de arquivo (research R1). Não remover `Invite` nem `INVITE_CREATE`: eles existem no banco até o lançamento B da feature 013.
- Toda frase nova que afirma uma regra cita a `spec.md` de origem (FR-NNN ou história), conforme a tabela R5 de [research.md](./research.md). `plan.md` de outra feature pode explicar, nunca ser a única origem (R4).
- A referência de verdade para campos e valores é `apps/api/src/db/schema.ts`. Não editar esse arquivo.
- Nenhum valor de exemplo de senha, token ou código de convite (constitution, princípio VI).
- Commits em inglês, Conventional Commits, tipo `docs`, sem linha de coautoria nem atribuição a IA (CLAUDE.md).

---

## Phase 1: Setup

**Purpose**: branch e ponto de partida.

- [X] T001 Criar a branch `docs/020-atualizar-modelo-dados` a partir de `main` atualizada e rodar `npm run format:check` para confirmar que está verde antes de qualquer mudança em `docs/`

---

## Phase 2: Foundational (Blocking Prerequisites)

Nenhuma. Cada história trabalha sobre arquivos que já existem.

---

## Phase 3: User Story 1 - Ler o modelo de dados atual sem precisar abrir o código (Priority: P1) 🎯 MVP

**Goal**: as três DDEs descrevem o que está no ar depois do lançamento A da feature 013 e da feature 014.

**Independent Test**: comparar cada entidade, campo, valor permitido e relacionamento das DDEs com `apps/api/src/db/schema.ts` e com as specs 004 a 014 (quickstart, passos 1 e 2); nenhuma divergência sobra, e `Invite`/`INVITE_CREATE` aparecem marcados como sem uso.

- [X] T002 [P] [US1] Atualizar `docs/data-definitions/DDE-001-banco-auth-convites.md` (alvo em [data-model.md](./data-model.md), seção DDE-001):
  - **Scope**: trocar o cadastro mediante convite e a cota de 3 por: cadastro só com e-mail e senha, atrás de uma chave de configuração desligada por padrão; contas criadas também pelo autor na linha de comando; convites guardados sem uso desde a feature 013, a descartar no lançamento B.
  - **Source Artifacts**: manter as linhas da spec 004 e acrescentar `specs/013-jogo-sem-login/spec.md` (FR-014 a FR-019: cadastro aberto atrás de chave e criação de conta pelo autor), `specs/013-jogo-sem-login/spec.md` (FR-020 a FR-022: convites fora de uso e descarte em dois lançamentos), `specs/013-jogo-sem-login/spec.md` (FR-003: limite de busca de puzzle por endereço também para visitante) e `specs/006-coleta-puzzles/spec.md` (US1: busca sob demanda de dia passado). Links relativos `../../specs/...`.
  - **Entity Summary**: `User` passa a "Conta de uma pessoa" com origem `FR-005 a FR-009 (004); FR-014 a FR-019 (013)`; `Invite` passa a "Código de uso único do cadastro antigo; sem uso desde a feature 013" com origem `FR-017 a FR-026 (004); FR-020 a FR-022 (013)`; `RateLimitAttempt` passa a ter origem `FR-027 a FR-029 (004); US1 (006); FR-003, FR-014 (013)`.
  - **User**: campos sem mudança (`user_id`, `email`, `password_hash`, `created_at`, `updated_at`).
  - **Session**: sem mudança.
  - **Invite**: manter os nove campos; acrescentar antes da tabela a frase "Sem uso desde a feature 013: nada mais lê nem grava convites, e a entidade é descartada por migração no lançamento B (spec 013, FR-020 a FR-022)."; reescrever o parágrafo de situação derivada e cota no passado ("No cadastro antigo, a situação ... era derivada ...; a cota de 3 contava ...").
  - **RateLimitAttempt**: `action` com "Valores permitidos: LOGIN, REGISTER, PUZZLE_FETCH, INVITE_CREATE; INVITE_CREATE sem uso desde a feature 013, sai no lançamento B"; o parágrafo de registro passa a: no login só as falhas (uma por e-mail e uma por endereço de rede); no cadastro, toda tentativa por endereço de rede (spec 013, FR-014); na busca de puzzle na fonte, toda busca por endereço de rede, também para o visitante (spec 013, FR-003). Manter a frase de que não há vínculo com `User`.
  - **Relationships**: manter as três linhas; nas duas de `Invite`, começar a descrição com "Cadastro antigo, sem uso desde a feature 013:".
- [X] T003 [P] [US1] Atualizar `docs/data-definitions/DDE-002-coleta-puzzles.md` (alvo em [data-model.md](./data-model.md), seção DDE-002):
  - **Scope**: "entregá-la ao jogador com a solução (spec 007)" passa a "entregá-la, com a solução, a quem tem sessão e ao visitante (specs 007 e 013)"; mencionar as duas fontes (O Globo e Cruzada Online).
  - **Source Artifacts**: acrescentar `specs/008-progresso-usuario-puzzle/spec.md` (FR-001, FR-014: progresso referencia o puzzle, que não pode ser removido com progresso), `specs/013-jogo-sem-login/spec.md` (FR-002, FR-003: entrega e busca também sem sessão) e `specs/014-adaptador-publico/spec.md` (FR-002: fonte `cruzadaonline`).
  - **Entity Summary**: acrescentar `FR-002 (013); FR-002 (014)` à origem de `Puzzle` e uma linha `[Progress](#progress) | Progresso de um usuário no puzzle (definido na DDE-003) | FR-001, FR-014 (008)`.
  - **Entity Definitions**: acrescentar, depois de `Puzzle`, a subseção `### Progress` só com as chaves, como a DDE-003 faz com `User` e `Puzzle`: `user_id | Usuário dono do progresso | UUID | Yes | PK (junto com puzzle_id); FK → User; demais campos na [DDE-003](./DDE-003-progresso-usuario-puzzle.md)` e `puzzle_id | Puzzle ao qual o progresso se refere | UUID | Yes | PK (junto com user_id); FK → Puzzle`. O template exige que as duas pontas de cada relacionamento estejam em Entity Definitions.
  - **source**: "Valores permitidos: oglobo, cruzadaonline (014, FR-002); único junto com level e date (FR-003); o mesmo dia em fontes diferentes são registros diferentes".
  - **data**: acrescentar à nota que é entregue a quem tem sessão e ao visitante (013, FR-002).
  - **solution**: trocar "entregue ao navegador junto de data só a usuário com sessão" por "entregue ao navegador junto de data a quem tem sessão e ao visitante (013, FR-002)", mantendo "nunca em erro nem log" e "validada contra a grade antes de sair (007, FR-003)".
  - **Relationships**: trocar o parágrafo por uma tabela no formato do template com a linha `[Puzzle](#puzzle) | one-to-many | [Progress](#progress) | Um puzzle pode ter o progresso de vários usuários; um puzzle com progresso não pode ser removido`, seguida da frase de que o limite de buscas usa `RateLimitAttempt` da DDE-001 sem chave estrangeira.
  - Tipos lógicos inalterados: `data` e `solution` continuam `Text` com "Documento JSON" (R3).
- [X] T004 [P] [US1] Atualizar `docs/data-definitions/DDE-003-progresso-usuario-puzzle.md` (alvo em [data-model.md](./data-model.md), seção DDE-003):
  - **Scope**: acrescentar ao fim: "O progresso do visitante (feature 013) não faz parte deste modelo: fica só no navegador do aparelho, nunca é enviado ao servidor e nunca é lido, gravado ou mostrado como o progresso de uma conta. Seus campos estão na spec 013."
  - **Source Artifacts**: acrescentar `specs/013-jogo-sem-login/spec.md` (FR-004, FR-011, FR-012: progresso do visitante só no aparelho e separado do da conta).
  - Entidades `Progress`, `User`, `Puzzle` e relacionamentos sem mudança. Não criar entidade para o visitante (clarificação de 2026-10-20, FR-007).

**Checkpoint**: as três DDEs batem com `schema.ts` e com as specs; os ERDs ainda podem divergir.

---

## Phase 4: User Story 2 - Diagramas coerentes com as data definitions (Priority: P2)

**Goal**: cada ERD tem as mesmas entidades, campos, chaves e relacionamentos da sua DDE, e um campo repetido tem o mesmo tipo em todos os ERDs.

**Independent Test**: para cada par DDE/ERD, todo campo e relacionamento de um aparece no outro; `data`, `solution` e `cells` são `json` em todos os ERDs; os três renderizam sem erro (quickstart, passos 3 e 4).

- [X] T005 [P] [US2] Atualizar `docs/entity-relationship-diagrams/ERD-001-banco-auth-convites.md` a partir da DDE-001 de T002 (research R2):
  - `INVITE` com alias: `INVITE["INVITE (sem uso)"] {`, mesmos campos de hoje; `invite_id` com comentário `"sem uso desde a feature 013; sai no lançamento B"`.
  - `RATE_LIMIT_ATTEMPT.action` com comentário `"LOGIN, REGISTER, PUZZLE_FETCH, INVITE_CREATE (sem uso)"`.
  - Relacionamentos: `USER |o--o{ INVITE : "gera (antigo)"` e `USER |o--o| INVITE : "consome (antigo)"`; `USER ||--o{ SESSION : "abre"` sem mudança.
  - Comentários sem aspas duplas internas.
- [X] T006 [P] [US2] Atualizar `docs/entity-relationship-diagrams/ERD-002-coleta-puzzles.md` a partir da DDE-002 de T003 (research R3):
  - `data` e `solution` de `string` para `json`, mantendo os comentários; o de `solution` passa a `"JSON, entregue a quem tem sessão e ao visitante"`.
  - `source` com comentário `"oglobo ou cruzadaonline; UK composta com level e date"`.
  - Acrescentar `PROGRESS` só com as chaves (`uuid user_id PK, FK "FK para USER, ver ERD-003"` e `uuid puzzle_id PK, FK`), sem acrescentar `USER` ao diagrama, e `PUZZLE ||--o{ PROGRESS : "recebe"`, para mostrar o relacionamento da DDE-002, como a DDE-003 faz com `User` e `Puzzle`.
- [X] T007 [P] [US2] Conferir `docs/entity-relationship-diagrams/ERD-003-progresso-usuario-puzzle.md` contra a DDE-003 de T004: campos de `USER`, `PUZZLE` e `PROGRESS` e os dois relacionamentos. Mudar só o que divergir; hoje `data`, `solution` e `cells` já são `json` e nada mais é esperado mudar

**Checkpoint**: cada ERD bate com a sua DDE.

---

## Phase 5: User Story 3 - Saber o que mudou em cada documento (Priority: P3)

**Goal**: cada DDE alterada tem uma linha nova no topo do changelog.

**Independent Test**: as linhas novas têm a versão de patch seguinte, a data 2026-10-20 e as features de origem; as anteriores ficam intactas (quickstart, passo 5).

- [X] T008 [US3] Em `docs/data-definitions/DDE-001-banco-auth-convites.md` (depois de T002), acrescentar no topo do changelog `0.0.2 | 2026-10-20 | - Cadastro só com e-mail e senha, atrás de chave, e conta criada pelo autor (013). - Convites e INVITE_CREATE sem uso até o lançamento B (013). - Ação PUZZLE_FETCH (006, 013).`
- [X] T009 [US3] Em `docs/data-definitions/DDE-002-coleta-puzzles.md` (depois de T003), acrescentar no topo do changelog `0.0.3 | 2026-10-20 | - Fonte cruzadaonline (014). - Puzzle e solução entregues também ao visitante (013). - Relacionamento com Progress da DDE-003 (008).`
- [X] T010 [US3] Em `docs/data-definitions/DDE-003-progresso-usuario-puzzle.md` (depois de T004), acrescentar no topo do changelog `0.0.2 | 2026-10-20 | - Nota sobre o progresso do visitante, guardado só no aparelho e fora deste modelo (013).`

**Checkpoint**: os três changelogs mostram a mudança em uma linha.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 Rodar `npx prettier --write docs/data-definitions/ docs/entity-relationship-diagrams/` e depois `npm run format:check` (research R6)
- [X] T012 Rodar os passos 1 a 5 de `specs/020-atualizar-modelo-dados/quickstart.md` e corrigir o que falhar; no passo 4, se o Mermaid CLI não rodar, registrar isso e conferir os ERDs na pré-visualização do GitHub depois do push
- [X] T013 Commitar em `docs/020-atualizar-modelo-dados` com `docs: bring data definitions and erds up to date` (corpo curto citando as features 006, 008, 013 e 014) e, se o autor pedir, abrir o PR para `main` com título no mesmo formato, resumo e plano de teste (`.claude/rules/git-conventions.md`)

---

## Dependencies & Execution Order

- **Setup (T001)** → tudo.
- **US1 (T002, T003, T004)**: independentes entre si, [P].
- **US2**: T005 depende de T002; T006 de T003; T007 de T004. Entre si, [P].
- **US3**: T008 depende de T002; T009 de T003; T010 de T004 (mesmo arquivo, então sem [P] com a tarefa da US1 correspondente). Entre si, podem rodar em paralelo.
- **Polish**: T011 depois de todas; T012 depois de T011; T013 por último.

### Parallel Example

```text
# US1, três arquivos diferentes:
T002 DDE-001  |  T003 DDE-002  |  T004 DDE-003

# Depois, por par de documento:
T005 ERD-001 + T008 changelog DDE-001
T006 ERD-002 + T009 changelog DDE-002
T007 ERD-003 + T010 changelog DDE-003
```

## Implementation Strategy

- **MVP**: Setup + US1 (T001 a T004). As DDEs já ficam corretas para quem planeja uma feature nova.
- **Incremento 2**: US2 (T005 a T007), ERDs alinhados.
- **Incremento 3**: US3 (T008 a T010), changelogs.
- **Fechamento**: T011 a T013, num único commit `docs` (não gera versão, `docs/versionamento.md`).
