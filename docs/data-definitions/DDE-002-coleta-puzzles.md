# DDE-002 — Coleta e cache de puzzles

## Changelog

| Version | Date       | Changes                                                            |
| ------- | ---------- | ------------------------------------------------------------------ |
| `0.0.1` | 2026-10-13 | - Versão inicial derivada da spec 006 (com a clarificação do seed) |

## Scope

Cobre o modelo de dados do cache compartilhado de puzzles do Cruzadinha. Suporta guardar cada cruzada uma única vez por fonte, nível e data, entregá-la ao jogador sem a solução, preenchê-la por busca sob demanda, pela coleta agendada ou pelo seed de desenvolvimento. A "execução de coleta" e a "fonte de puzzles" da spec não viram entidades: a primeira é só um relatório de uma rodada (não persistido) e a segunda é um serviço externo. As tentativas sujeitas a limite de busca reaproveitam a entidade `RateLimitAttempt` da [DDE-001](./DDE-001-banco-auth-convites.md).

## Source Artifacts

| Source                                                                                                 | Type | Description                                                                      |
| ------------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------- |
| [specs/006-coleta-puzzles/spec.md](../../specs/006-coleta-puzzles/spec.md) (FR-001 a FR-007, US1)      | Spec | Puzzle guardado uma vez por fonte, nível e data; entregue sem a solução          |
| [specs/006-coleta-puzzles/spec.md](../../specs/006-coleta-puzzles/spec.md) (FR-008 a FR-012, US2, US3) | Spec | Coleta idempotente do dia e do histórico, sem duplicar o que já está guardado    |
| [specs/006-coleta-puzzles/spec.md](../../specs/006-coleta-puzzles/spec.md) (FR-020 a FR-022, US4)      | Spec | Puzzle de exemplo do seed, com atribuição própria e as mesmas regras de validade |

## Entity Summary

| Entity            | Description                                                                    | Source                                   |
| ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| [Puzzle](#puzzle) | Cruzada de uma fonte, nível e data, guardada uma vez e compartilhada por todos | FR-001 a FR-012, FR-017, FR-020 a FR-022 |

## Entity Definitions

### Puzzle

| Field      | Description                                                         | Data Type | Mandatory | Notes                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| puzzle_id  | Identificador único do puzzle guardado                              | UUID      | Yes       | PK; usado pelo front-end para pedir o puzzle e, no futuro, para o progresso                                                                             |
| source     | Fonte de onde veio o puzzle                                         | Text      | Yes       | Valores permitidos: oglobo; único junto com level e date (FR-003)                                                                                       |
| level      | Nível do puzzle                                                     | Text      | Yes       | Valores permitidos: daily; único junto com source e date                                                                                                |
| date       | Dia do puzzle, no formato AAAA-MM-DD, sem hora nem fuso             | Date      | Yes       | Único junto com source e level; no fuso de Brasília, nunca no futuro quando buscado da fonte                                                            |
| data       | Parte pública do puzzle: grade, dicas e atribuição à fonte (FR-017) | Text      | Yes       | Documento JSON no formato interno; consistente com a solução (FR-006); sem nenhuma letra de resposta (FR-002); nunca a resposta bruta da fonte (FR-007) |
| solution   | Letras de resposta de cada célula                                   | Text      | Yes       | Documento JSON; só no servidor, nunca enviado ao navegador (FR-002)                                                                                     |
| created_at | Data e hora em que o puzzle foi guardado                            | Date      | Yes       | Preenchido pelo banco; UTC                                                                                                                              |
| updated_at | Data e hora da última alteração                                     | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC; o puzzle guardado não é reescrito pelo sistema                                                  |

## Relationships

Nenhum relacionamento com outras entidades nesta feature. O progresso por usuário (feature futura) referenciará `puzzle_id`; o limite de buscas sob demanda usa `RateLimitAttempt` da DDE-001 sem chave estrangeira.

## Entity Relationship Diagrams

| ID                                                                   |
| -------------------------------------------------------------------- |
| [ERD-002](../entity-relationship-diagrams/ERD-002-coleta-puzzles.md) |
