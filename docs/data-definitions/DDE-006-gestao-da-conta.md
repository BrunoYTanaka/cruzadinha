# DDE-006 — Gestão da conta

## Changelog

| Version | Date       | Changes                                                                                             |
| ------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `0.0.2` | 2026-10-27 | - Revisada contra a spec 042: `User` na lista de entidades, seção de relacionamentos e link do ERD. |
| `0.0.1` | 2026-10-27 | - Versão inicial derivada da spec 042 (#90).                                                        |

## Scope

Cobre a tabela do pedido de troca de e-mail e os novos valores de ação em `RateLimitAttempt`. `User`, `Session` e `RateLimitAttempt` já são definidos na [DDE-001](./DDE-001-banco-auth-convites.md) e aparecem aqui só no que muda. O token do link nunca é guardado: só o SHA-256 (hex), como nas sessões e na [DDE-005](./DDE-005-verificacao-email-recuperacao-senha.md).

## Source Artifacts

| Source                                                                                   | Type | Description                            |
| ---------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [specs/042-gestao-da-conta/spec.md](../../specs/042-gestao-da-conta/spec.md)             | Spec | Requisitos e entidades                 |
| [specs/042-gestao-da-conta/data-model.md](../../specs/042-gestao-da-conta/data-model.md) | Plan | Colunas, restrições, estados e limpeza |

## Entity Summary

| Entity                                    | Description                                        | Source                  |
| ----------------------------------------- | -------------------------------------------------- | ----------------------- |
| [User](#user)                             | A conta; não muda (DDE-001)                        | FR-009, FR-010          |
| [EmailChangeRequest](#emailchangerequest) | Troca de e-mail aguardando o link no novo endereço | FR-003 a FR-005, FR-009 |
| [RateLimitAttempt](#ratelimitattempt)     | Novos valores de ação (DDE-001)                    | FR-007, FR-012          |

## Entity Definitions

### User

| Field   | Description                    | Data Type | Mandatory | Notes                                                            |
| ------- | ------------------------------ | --------- | --------- | ---------------------------------------------------------------- |
| user_id | Identificador único do usuário | UUID      | Yes       | PK; demais campos na [DDE-001](./DDE-001-banco-auth-convites.md) |

`User` não muda nesta feature.

### EmailChangeRequest

| Field      | Description                              | Data Type | Mandatory | Notes                                                                                            |
| ---------- | ---------------------------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------ |
| request_id | Identificador único do pedido            | UUID      | Yes       | PK; gerado pelo banco                                                                            |
| user_id    | Conta que pediu a troca                  | UUID      | Yes       | FK → User (`ON DELETE CASCADE`); índice único `email_change_requests_user_unique` (um por conta) |
| new_email  | Novo endereço, ainda não confirmado      | Text      | Yes       | Em minúsculas, sem espaços nas pontas; nunca em log nem em resposta da API                       |
| token_hash | SHA-256 do token do link                 | Text      | Yes       | Único; trocado a cada pedido novo (o link anterior deixa de valer)                               |
| expires_at | Validade do link                         | Date      | Yes       | Pedido + 60 minutos (`EMAIL_CHANGE_TTL_MINUTES`)                                                 |
| created_at | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC                                                                       |
| updated_at | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco (gatilho `email_change_requests_set_updated_at`); UTC           |

Regras:

- Estados: aberto (`expires_at > now`) → usado (apagado na confirmação) | substituído (hash trocado por pedido novo) | vencido (apagado pelo `auth cleanup` após 7 dias) | apagado com a conta.
- Confirmar = `DELETE ... WHERE token_hash = ? AND expires_at > now() RETURNING` e `UPDATE users SET email` na mesma transação. Se outra conta ocupou o endereço, o `UPDATE` falha em `users_email_unique` e o pedido fica apagado.
- Um endereço que já é de outra conta nunca é gravado.

### RateLimitAttempt

Valores novos de `action`: `PASSWORD_CONFIRM` (chave `USER`, 5 em 15 minutos, um balde para trocar senha, trocar e-mail e excluir) e `CHANGE_EMAIL` (chave `NETWORK_ADDRESS`, 10 em 60 minutos; chave `USER` como intervalo mínimo entre pedidos). A exclusão da conta apaga as tentativas de chave `USER` da conta.

## Relationships

| From Entity   | Cardinality | To Entity                                 | Description                                                                                |
| ------------- | ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| [User](#user) | one-to-one  | [EmailChangeRequest](#emailchangerequest) | No máximo um pedido por conta (zero ou um); some junto com o usuário (`ON DELETE CASCADE`) |

## Entity Relationship Diagrams

| ID                                                                    |
| --------------------------------------------------------------------- |
| [ERD-006](../entity-relationship-diagrams/ERD-006-gestao-da-conta.md) |
