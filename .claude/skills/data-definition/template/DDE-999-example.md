# DDE-999 — Convites e Cadastro

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| `0.0.1` | 2026-10-12 | - Versão inicial derivada da spec de exemplo 999 |

## Scope

Cobre o modelo de dados de contas, sessões e convites do Cruzadinha. Suporta o cadastro mediante convite de uso único, o login com sessão no servidor e a cota de convites por usuário.

## Source Artifacts

| Source | Type | Description |
|--------|------|-------------|
| [specs/999-convites-e-cadastro/spec.md](../../specs/999-convites-e-cadastro/spec.md) (FR-001 a FR-010) | Spec | Cadastro com convite, login e geração de convites |

## Entity Summary

| Entity | Description | Source |
|--------|-------------|--------|
| [User](#user) | Pessoa convidada que joga e tem progresso próprio | FR-001, FR-002 |
| [Invite](#invite) | Convite de uso único que autoriza um cadastro | FR-003 a FR-008 |
| [Session](#session) | Sessão de login guardada no servidor | FR-009, FR-010 |

## Entity Definitions

### User

| Field | Description | Data Type | Mandatory | Notes |
|-------|-------------|-----------|-----------|-------|
| user_id | Identificador único do usuário | UUID | Yes | PK |
| email | E-mail usado no login | Text | Yes | Unique |
| password_hash | Hash argon2 da senha; a senha nunca é guardada | Text | Yes | Senha com no mínimo 8 caracteres antes do hash |
| theme_preference | Preferência de tema do usuário | Text | Yes | Valores permitidos: AUTO, LIGHT, DARK |
| created_at | Data e hora do cadastro | Date | Yes | |

### Invite

| Field | Description | Data Type | Mandatory | Notes |
|-------|-------------|-----------|-----------|-------|
| invite_id | Identificador único do convite | UUID | Yes | PK |
| code_hash | Hash do código do convite; o código aparece uma só vez, na criação | Text | Yes | Unique |
| created_by_user_id | Usuário que gerou o convite | UUID | No | FK → User; vazio quando criado pela CLI |
| used_by_user_id | Usuário criado com este convite | UUID | No | FK → User; vazio enquanto não usado |
| created_at | Data e hora da criação | Date | Yes | |
| expires_at | Data e hora em que o convite expira | Date | Yes | 7 dias após a criação por padrão |
| used_at | Data e hora do uso | Date | No | |
| revoked_at | Data e hora da revogação | Date | No | |

### Session

| Field | Description | Data Type | Mandatory | Notes |
|-------|-------------|-----------|-----------|-------|
| session_id | Identificador único da sessão | UUID | Yes | PK |
| token_hash | Hash do token enviado no cookie | Text | Yes | Unique; o token nunca é guardado |
| user_id | Dono da sessão | UUID | Yes | FK → User |
| expires_at | Data e hora em que a sessão expira | Date | Yes | 30 dias após o login |

## Relationships

| From Entity | Cardinality | To Entity | Description |
|-------------|-------------|-----------|-------------|
| [User](#user) | one-to-many | [Session](#session) | Um usuário pode ter várias sessões; cada sessão pertence a um usuário |
| [User](#user) | one-to-many | [Invite](#invite) | Um usuário gera vários convites (no máximo 3 ativos); cada convite tem no máximo um criador |
| [User](#user) | one-to-one | [Invite](#invite) | Um usuário nasce de no máximo um convite; cada convite é usado por no máximo um usuário |

## Entity Relationship Diagrams

| ID |
|----|
| [ERD-999](../../entity-relationship-diagram/template/ERD-999-example.md) |
