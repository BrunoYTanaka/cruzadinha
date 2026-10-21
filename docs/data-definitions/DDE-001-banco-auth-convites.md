# DDE-001 — Banco, autenticação e convites

## Changelog

| Version | Date       | Changes                                                                                                                                                                         |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0.0.3` | 2026-10-21 | - Ação SETTINGS_SAVE (021).                                                                                                                                                     |
| `0.0.2` | 2026-10-20 | - Cadastro só com e-mail e senha, atrás de chave, e conta criada pelo autor (013). - Convites e INVITE_CREATE sem uso até o lançamento B (013). - Ação PUZZLE_FETCH (006, 013). |
| `0.0.1` | 2026-10-13 | - Versão inicial derivada da spec 004 (com as clarificações de 2026-10-13)                                                                                                      |

## Scope

Cobre o modelo de dados de contas, sessões, convites e tentativas sujeitas a limite do Cruzadinha. Suporta o cadastro só com e-mail e senha, atrás de uma chave de configuração desligada por padrão, a criação de contas pelo autor na linha de comando, o login com sessão no servidor e expiração deslizante e os limites de tentativas persistidos no banco. Os convites do cadastro antigo continuam guardados, sem uso desde a feature 013, e são descartados no lançamento B dessa feature. Puzzles e progresso ficam nas [DDE-002](./DDE-002-coleta-puzzles.md) e [DDE-003](./DDE-003-progresso-usuario-puzzle.md).

## Source Artifacts

| Source                                                                                                           | Type | Description                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| [specs/004-banco-auth-convites/spec.md](../../specs/004-banco-auth-convites/spec.md) (FR-001 a FR-003)           | Spec | Estrutura versionada e convenção `created_at`/`updated_at` em toda tabela      |
| [specs/004-banco-auth-convites/spec.md](../../specs/004-banco-auth-convites/spec.md) (FR-005 a FR-009, US2)      | Spec | Cadastro com convite, e-mail normalizado e único, senha em hash argon2         |
| [specs/004-banco-auth-convites/spec.md](../../specs/004-banco-auth-convites/spec.md) (FR-010 a FR-016, US3)      | Spec | Sessão no servidor, expiração deslizante de 30 dias e limite absoluto de 1 ano |
| [specs/004-banco-auth-convites/spec.md](../../specs/004-banco-auth-convites/spec.md) (FR-017 a FR-026, US4, US5) | Spec | Convites de uso único, cota, listagem e revogação                              |
| [specs/004-banco-auth-convites/spec.md](../../specs/004-banco-auth-convites/spec.md) (FR-027 a FR-029)           | Spec | Limites de tentativas guardados no banco                                       |
| [specs/006-coleta-puzzles/spec.md](../../specs/006-coleta-puzzles/spec.md) (US1)                                 | Spec | Busca sob demanda de dia passado ainda não guardado                            |
| [specs/013-jogo-sem-login/spec.md](../../specs/013-jogo-sem-login/spec.md) (FR-003)                              | Spec | Limite de busca de puzzle por endereço de rede, também para visitante          |
| [specs/013-jogo-sem-login/spec.md](../../specs/013-jogo-sem-login/spec.md) (FR-014 a FR-019)                     | Spec | Cadastro aberto atrás de chave e criação de conta pelo autor                   |
| [specs/013-jogo-sem-login/spec.md](../../specs/013-jogo-sem-login/spec.md) (FR-020 a FR-022)                     | Spec | Convites fora de uso e descarte em dois lançamentos                            |

## Entity Summary

| Entity                                | Description                                                         | Source                                                 |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| [User](#user)                         | Conta de uma pessoa                                                 | FR-005 a FR-009 (004); FR-014 a FR-019 (013)           |
| [Session](#session)                   | Acesso aberto por uma conta, guardado no servidor                   | FR-010 a FR-016                                        |
| [Invite](#invite)                     | Código de uso único do cadastro antigo; sem uso desde a feature 013 | FR-017 a FR-026 (004); FR-020 a FR-022 (013)           |
| [RateLimitAttempt](#ratelimitattempt) | Registro de uma tentativa sujeita a limite                          | FR-027 a FR-029 (004); US1 (006); FR-003, FR-014 (013) |

## Entity Definitions

### User

| Field         | Description                                    | Data Type | Mandatory | Notes                                                                     |
| ------------- | ---------------------------------------------- | --------- | --------- | ------------------------------------------------------------------------- |
| user_id       | Identificador único do usuário                 | UUID      | Yes       | PK; não revela ordem nem quantidade de registros                          |
| email         | E-mail usado no login                          | Text      | Yes       | Unique; guardado normalizado (minúsculas, sem espaços nas pontas)         |
| password_hash | Hash argon2 da senha; a senha nunca é guardada | Text      | Yes       | Senha de 8 a 128 caracteres antes do hash; nunca sai em respostas ou logs |
| created_at    | Data e hora do cadastro                        | Date      | Yes       | Preenchido pelo banco; UTC                                                |
| updated_at    | Data e hora da última alteração                | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC                    |

A conta nasce pelo cadastro (só e-mail e senha, aceito só com a chave de configuração ligada; desligada por padrão) ou pela linha de comando do autor, com ou sem a chave e com as mesmas regras de e-mail e senha (spec 013, FR-014 a FR-019). As contas criadas com convite continuam válidas.

### Session

| Field               | Description                                           | Data Type | Mandatory | Notes                                                                                                |
| ------------------- | ----------------------------------------------------- | --------- | --------- | ---------------------------------------------------------------------------------------------------- |
| session_id          | Identificador único da sessão                         | UUID      | Yes       | PK                                                                                                   |
| token_hash          | Hash do valor aleatório enviado no cookie             | Text      | Yes       | Unique; o valor do cookie nunca é guardado                                                           |
| user_id             | Dono da sessão                                        | UUID      | Yes       | FK → User                                                                                            |
| expires_at          | Data e hora em que a sessão expira por inatividade    | Date      | Yes       | 30 dias após o último uso; regravado no máximo uma vez por dia; nunca passa de `absolute_expires_at` |
| absolute_expires_at | Limite absoluto da sessão, mesmo com uso contínuo     | Date      | Yes       | 1 ano após a abertura; não muda depois de criado                                                     |
| ended_at            | Data e hora em que o usuário saiu                     | Date      | No        | Vazio enquanto a sessão não foi encerrada pelo logout                                                |
| created_at          | Data e hora da abertura (login ou cadastro)           | Date      | Yes       | Preenchido pelo banco; UTC                                                                           |
| updated_at          | Data e hora da última alteração (renovação ou logout) | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC                                               |

### Invite

Sem uso desde a feature 013: nada mais lê nem grava convites, e a entidade é descartada por migração no lançamento B (spec 013, FR-020 a FR-022).

| Field              | Description                                                        | Data Type | Mandatory | Notes                                                                                          |
| ------------------ | ------------------------------------------------------------------ | --------- | --------- | ---------------------------------------------------------------------------------------------- |
| invite_id          | Identificador único do convite                                     | UUID      | Yes       | PK; usado pela linha de comando para revogar                                                   |
| code_hash          | Hash do código do convite; o código aparece uma só vez, na criação | Text      | Yes       | Unique; código de 16 caracteres normalizado (maiúsculas, sem espaços nem hífens) antes do hash |
| created_by_user_id | Usuário que gerou o convite                                        | UUID      | No        | FK → User; vazio quando criado pela linha de comando                                           |
| used_by_user_id    | Usuário criado com este convite                                    | UUID      | No        | FK → User; Unique; vazio enquanto não usado                                                    |
| expires_at         | Data e hora em que o convite expira                                | Date      | Yes       | 7 dias após a criação por padrão; a linha de comando aceita outra validade em dias             |
| used_at            | Data e hora do uso                                                 | Date      | No        | Preenchido junto com `used_by_user_id`, na mesma operação do cadastro                          |
| revoked_at         | Data e hora da revogação                                           | Date      | No        | Só para convites não usados                                                                    |
| created_at         | Data e hora da criação                                             | Date      | Yes       | Preenchido pelo banco; UTC                                                                     |
| updated_at         | Data e hora da última alteração                                    | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC                                         |

No cadastro antigo, a situação do convite não era guardada: era derivada dos campos. Usado se `used_at` está preenchido; senão revogado se `revoked_at` está preenchido; senão expirado se `expires_at` já passou; senão ativo. A cota de 3 contava os convites ativos por `created_by_user_id`.

### RateLimitAttempt

| Field                 | Description                      | Data Type | Mandatory | Notes                                                                                                                                                                              |
| --------------------- | -------------------------------- | --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rate_limit_attempt_id | Identificador único da tentativa | UUID      | Yes       | PK                                                                                                                                                                                 |
| action                | Ação limitada                    | Text      | Yes       | Valores permitidos: LOGIN, REGISTER, PUZZLE_FETCH, SETTINGS_SAVE, INVITE_CREATE; SETTINGS_SAVE desde a feature 021; INVITE_CREATE sem uso desde a feature 013, sai no lançamento B |
| key_type              | Tipo da chave limitada           | Text      | Yes       | Valores permitidos: EMAIL, NETWORK_ADDRESS                                                                                                                                         |
| key_value             | Valor da chave limitada          | Text      | Yes       | E-mail normalizado ou endereço de rede; nunca guarda senha nem código de convite                                                                                                   |
| created_at            | Instante da tentativa            | Date      | Yes       | Preenchido pelo banco; UTC; base da janela do limite                                                                                                                               |
| updated_at            | Data e hora da última alteração  | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC                                                                                                                             |

No login só as tentativas falhas são registradas (uma por e-mail e uma por endereço de rede). No cadastro, toda tentativa é registrada por endereço de rede (spec 013, FR-014). Na busca de um puzzle na fonte, toda busca é registrada por endereço de rede, também para o visitante (spec 013, FR-003). Registros fora da janela são ignorados na contagem. Não há vínculo com `User`, porque o e-mail tentado pode não ter conta.

## Relationships

| From Entity   | Cardinality | To Entity           | Description                                                                                                                                                                          |
| ------------- | ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [User](#user) | one-to-many | [Session](#session) | Um usuário pode ter várias sessões; cada sessão pertence a um usuário                                                                                                                |
| [User](#user) | one-to-many | [Invite](#invite)   | Cadastro antigo, sem uso desde a feature 013: um usuário gerava vários convites (no máximo 3 ativos); cada convite tem no máximo um criador (nenhum quando veio da linha de comando) |
| [User](#user) | one-to-one  | [Invite](#invite)   | Cadastro antigo, sem uso desde a feature 013: um usuário nasceu de no máximo um convite; cada convite foi usado por no máximo um usuário                                             |

## Entity Relationship Diagrams

| ID                                                                        |
| ------------------------------------------------------------------------- |
| [ERD-001](../entity-relationship-diagrams/ERD-001-banco-auth-convites.md) |
