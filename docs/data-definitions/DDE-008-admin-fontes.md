# DDE-008 — Administração das fontes (visibilidade e ordem)

## Changelog

| Version | Date       | Changes                                                                                                                               |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `0.0.2` | 2026-11-03 | - `before` e `after` como documento JSON (`jsonb`); `isAdmin` na resposta de `/api/auth/me` só para a própria conta; link do ERD-008. |
| `0.0.1` | 2026-11-03 | - Versão inicial derivada da spec 060 (papel de admin, fontes, registro).                                                             |

## Scope

Cobre o papel de admin na conta, a configuração global de cada fonte de cruzadas (visível ou escondida e a posição na ordem das abas) e o registro das alterações feitas pelos admins. `User` já é definido na [DDE-001](./DDE-001-banco-auth-convites.md) e aparece aqui só no campo novo. Esconder uma fonte não apaga cruzadas, progresso nem duelos: só muda o que as telas e rotas públicas mostram.

## Source Artifacts

| Source                                                                                                                           | Type | Description                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [specs/060-admin-fontes-visiveis-ordem/spec.md](../../specs/060-admin-fontes-visiveis-ordem/spec.md) (FR-001, FR-004 a FR-007)   | Spec | Visibilidade, última fonte visível, ordem e padrão |
| [specs/060-admin-fontes-visiveis-ordem/spec.md](../../specs/060-admin-fontes-visiveis-ordem/spec.md) (FR-008 a FR-011, US3, US4) | Spec | Papel de admin e quem o designa                    |
| [specs/060-admin-fontes-visiveis-ordem/spec.md](../../specs/060-admin-fontes-visiveis-ordem/spec.md) (FR-016, Clarifications)    | Spec | Registro persistente de alterações                 |

## Entity Summary

| Entity                                      | Description                                             | Source                  |
| ------------------------------------------- | ------------------------------------------------------- | ----------------------- |
| [User](#user)                               | A conta; ganha o indicador de admin (DDE-001)           | FR-008, FR-010, FR-011  |
| [SourceSetting](#sourcesetting)             | Visibilidade e posição de uma fonte, valendo para todos | FR-001, FR-004 a FR-007 |
| [SourceSettingChange](#sourcesettingchange) | Uma alteração salva da configuração das fontes          | FR-016                  |

## Entity Definitions

### User

| Field    | Description                    | Data Type | Mandatory | Notes                                                                                                                                                                                                                        |
| -------- | ------------------------------ | --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user_id  | Identificador único do usuário | UUID      | Yes       | PK; demais campos na [DDE-001](./DDE-001-banco-auth-convites.md)                                                                                                                                                             |
| is_admin | A conta é de administração     | Boolean   | Yes       | Novo; padrão falso; só o meio do dono fora do site altera (FR-011); lido do banco a cada pedido, nunca da sessão (FR-008); nunca na resposta a outras contas; `/api/auth/me` e o login devolvem `isAdmin` só à própria conta |

### SourceSetting

| Field             | Description                              | Data Type | Mandatory | Notes                                                                                                                                         |
| ----------------- | ---------------------------------------- | --------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| source_setting_id | Identificador único da configuração      | UUID      | Yes       | PK; gerado pelo banco                                                                                                                         |
| source_id         | Fonte configurada                        | Text      | Yes       | Único; identificador de fonte do `shared` (`oglobo`, `cruzadaonline`, `cruzadasbrasil`, `clube`); valor desconhecido não é aceito na gravação |
| visible           | A fonte aparece para o público           | Boolean   | Yes       | Padrão verdadeiro; pelo menos uma linha visível sempre (FR-004)                                                                               |
| position          | Posição na ordem das abas e de "Hoje"    | Number    | Yes       | Inteiro a partir de 0; a de menor posição entre as visíveis é a padrão (FR-006); sem posições repetidas                                       |
| created_at        | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC                                                                                                                    |
| updated_at        | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco; UTC                                                                                                         |

Regras:

- Sem linhas, vale o padrão de hoje: todas as fontes visíveis na ordem padrão (FR-007). Fonte do código sem linha conta como visível, no fim da ordem.
- A mudança vale para todas as pessoas e aparece ao público em até 1 minuto (FR-015).
- Esconder não apaga nada em `Puzzle`, `Progress` nem `Duel` (FR-013).

### SourceSettingChange

| Field                    | Description                              | Data Type | Mandatory | Notes                                                                                    |
| ------------------------ | ---------------------------------------- | --------- | --------- | ---------------------------------------------------------------------------------------- |
| source_setting_change_id | Identificador único da alteração         | UUID      | Yes       | PK; gerado pelo banco                                                                    |
| user_id                  | Admin que salvou a alteração             | UUID      | No        | FK → User (`ON DELETE SET NULL`): o registro sobrevive à exclusão da conta (FR-016)      |
| before                   | Configuração das fontes antes            | JSON      | Yes       | Documento JSON com `source_id`, `visible` e `position` de cada fonte; sem dados pessoais |
| after                    | Configuração das fontes depois           | JSON      | Yes       | Mesmo formato de `before`                                                                |
| created_at               | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC; é o instante da alteração                                    |
| updated_at               | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco; UTC                                                    |

Regras:

- Uma linha por salvamento (não uma por fonte). O registro só é lido pelo dono e nunca é devolvido a visitantes nem a contas comuns.
- Nunca é apagado pelo `auth cleanup`.

## Relationships

| From Entity   | Cardinality | To Entity                                   | Description                                                                                      |
| ------------- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [User](#user) | one-to-many | [SourceSettingChange](#sourcesettingchange) | Um admin salva zero ou mais alterações; apagar a conta deixa `user_id` vazio e mantém o registro |

`SourceSetting` não tem relacionamento com outra entidade: `source_id` é um identificador de fonte do código, não uma chave estrangeira.

## Entity Relationship Diagrams

| ID                                                                 |
| ------------------------------------------------------------------ |
| [ERD-008](../entity-relationship-diagrams/ERD-008-admin-fontes.md) |
