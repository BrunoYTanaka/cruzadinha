# DDE-004 — Configurações do usuário

## Changelog

| Version | Date       | Changes                                |
| ------- | ---------- | -------------------------------------- |
| `0.0.1` | 2026-10-21 | - Versão inicial derivada da spec 021. |

## Scope

Cobre as configurações da pessoa no Cruzadinha guardadas na conta: tema, limites de ajuda, modo de riscar a dica, cruzada padrão, ir direto ao jogo, tamanho do tabuleiro e largura do calendário. Para todos (visitante e conta), as mesmas configurações ficam no aparelho (`localStorage`, chave `cruzadinha:settings`), fora deste modelo; para quem tem conta, uma cópia fica aqui e vale em outros aparelhos. `User` já é definido na [DDE-001](./DDE-001-banco-auth-convites.md) e aparece só com a chave, para fechar o relacionamento.

## Source Artifacts

| Source                                                                                                          | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [specs/021-configuracoes-usuario/spec.md](../../specs/021-configuracoes-usuario/spec.md) (FR-007 a FR-015)      | Spec | As configurações e seus valores                                      |
| [specs/021-configuracoes-usuario/spec.md](../../specs/021-configuracoes-usuario/spec.md) (FR-020 a FR-026, US3) | Spec | Guarda na conta, mudança mais recente, isolamento, limites e remoção |
| [specs/021-configuracoes-usuario/data-model.md](../../specs/021-configuracoes-usuario/data-model.md)            | Plan | Campos, validação campo a campo e transições                         |

## Entity Summary

| Entity                        | Description                                     | Source          |
| ----------------------------- | ----------------------------------------------- | --------------- |
| [UserSettings](#usersettings) | Configurações de um usuário, guardadas na conta | FR-020 a FR-026 |
| [User](#user)                 | Dono das configurações (definido na DDE-001)    | FR-021, FR-026  |

## Entity Definitions

### UserSettings

| Field      | Description                              | Data Type | Mandatory | Notes                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------- | --------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user_id    | Usuário dono das configurações           | UUID      | Yes       | PK; FK → User; vem sempre da sessão, nunca do pedido (FR-021); remover o usuário remove as configurações (FR-026)                                                                                                                                                                                                                                                                 |
| settings   | As configurações                         | Text      | Yes       | Documento JSON com `theme` (auto, light, dark), `helpLetters` e `helpWords` (0 a 99 ou nulo = sem limite), `strikeMode` (solved, filled), `defaultSource` (formato de identificador de fonte, mesmo desconhecida, FR-012b), `directToGame`, `boardCellSize` (30 a 110 ou nulo), `libraryWidth` (720 a 1600 ou nulo); relido campo a campo: um campo inválido é omitido na leitura |
| saved_at   | Momento da mudança no aparelho           | Date      | Yes       | Define qual versão vale: um pedido com saved_at igual ou mais antigo não sobrescreve (FR-022); até 5 minutos no futuro do servidor                                                                                                                                                                                                                                                |
| created_at | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC                                                                                                                                                                                                                                                                                                                                                        |
| updated_at | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC                                                                                                                                                                                                                                                                                                                            |

A chave é o próprio `user_id`: um registro por usuário, sem coluna a mais.

### User

| Field   | Description                    | Data Type | Mandatory | Notes                                                            |
| ------- | ------------------------------ | --------- | --------- | ---------------------------------------------------------------- |
| user_id | Identificador único do usuário | UUID      | Yes       | PK; demais campos na [DDE-001](./DDE-001-banco-auth-convites.md) |

## Relationships

| From Entity   | Cardinality | To Entity                     | Description                                                                         |
| ------------- | ----------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| [User](#user) | one-to-one  | [UserSettings](#usersettings) | Um usuário tem no máximo um registro de configurações, que some junto com o usuário |

## Entity Relationship Diagrams

| ID                                                                          |
| --------------------------------------------------------------------------- |
| [ERD-004](../entity-relationship-diagrams/ERD-004-configuracoes-usuario.md) |
