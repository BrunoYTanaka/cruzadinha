# DDE-002 — Coleta e cache de puzzles

## Changelog

| Version | Date       | Changes                                                                                                                              |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `0.0.5` | 2026-10-23 | - Fonte clube, Cruzadas Clube (030).                                                                                                 |
| `0.0.4` | 2026-10-23 | - Fonte cruzadasbrasil (029).                                                                                                        |
| `0.0.3` | 2026-10-20 | - Fonte cruzadaonline (014). - Puzzle e solução entregues também ao visitante (013). - Relacionamento com Progress da DDE-003 (008). |
| `0.0.2` | 2026-10-13 | - `solution` passa a ser entregue ao navegador junto de `data`, só para sessão válida (spec 007, constituição 3.0.0).                |
| `0.0.1` | 2026-10-13 | - Versão inicial derivada da spec 006 (com a clarificação do seed)                                                                   |

## Scope

Cobre o modelo de dados do cache compartilhado de puzzles do Cruzadinha. Suporta guardar cada cruzada uma única vez por fonte (O Globo, Cruzada Online e Cruzadas Brasil), nível e data, entregá-la, com a solução, a quem tem sessão e ao visitante (specs 007 e 013), preenchê-la por busca sob demanda, pela coleta agendada ou pelo seed de desenvolvimento. A "execução de coleta" e a "fonte de puzzles" da spec não viram entidades: a primeira é só um relatório de uma rodada (não persistido) e a segunda é um serviço externo. As tentativas sujeitas a limite de busca reaproveitam a entidade `RateLimitAttempt` da [DDE-001](./DDE-001-banco-auth-convites.md).

## Source Artifacts

| Source                                                                                                            | Type | Description                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------- |
| [specs/006-coleta-puzzles/spec.md](../../specs/006-coleta-puzzles/spec.md) (FR-001 a FR-007, US1)                 | Spec | Puzzle guardado uma vez por fonte, nível e data; entregue com a solução (007)    |
| [specs/006-coleta-puzzles/spec.md](../../specs/006-coleta-puzzles/spec.md) (FR-008 a FR-012, US2, US3)            | Spec | Coleta idempotente do dia e do histórico, sem duplicar o que já está guardado    |
| [specs/006-coleta-puzzles/spec.md](../../specs/006-coleta-puzzles/spec.md) (FR-020 a FR-022, US4)                 | Spec | Puzzle de exemplo do seed, com atribuição própria e as mesmas regras de validade |
| [specs/007-resposta-no-puzzle/spec.md](../../specs/007-resposta-no-puzzle/spec.md) (FR-001 a FR-003)              | Spec | Solução entregue ao navegador, validada contra a grade antes de sair             |
| [specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-001, FR-014)   | Spec | Progresso referencia o puzzle, que não pode ser removido com progresso           |
| [specs/013-jogo-sem-login/spec.md](../../specs/013-jogo-sem-login/spec.md) (FR-002, FR-003)                       | Spec | Entrega e busca também sem sessão                                                |
| [specs/014-adaptador-publico/spec.md](../../specs/014-adaptador-publico/spec.md) (FR-002)                         | Spec | Fonte `cruzadaonline`                                                            |
| [specs/029-adaptador-cruzadas-brasil/spec.md](../../specs/029-adaptador-cruzadas-brasil/spec.md) (FR-002, FR-015) | Spec | Fonte `cruzadasbrasil`; migração só alarga a restrição de `source`               |
| [specs/030-clube-terceira-fonte/spec.md](../../specs/030-clube-terceira-fonte/spec.md) (FR-002, FR-013)           | Spec | Fonte `clube`; uma edição por data, sem busca sob demanda                        |

## Entity Summary

| Entity                | Description                                                                    | Source                                                               |
| --------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [Puzzle](#puzzle)     | Cruzada de uma fonte, nível e data, guardada uma vez e compartilhada por todos | FR-001 a FR-012, FR-017, FR-020 a FR-022; FR-002 (013); FR-002 (014) |
| [Progress](#progress) | Progresso de um usuário no puzzle (definido na DDE-003)                        | FR-001, FR-014 (008)                                                 |

## Entity Definitions

### Puzzle

| Field      | Description                                                         | Data Type | Mandatory | Notes                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------- | --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| puzzle_id  | Identificador único do puzzle guardado                              | UUID      | Yes       | PK; usado pelo front-end para pedir o puzzle e referenciado pelo progresso (DDE-003)                                                                                                                                             |
| source     | Fonte de onde veio o puzzle                                         | Text      | Yes       | Valores permitidos: oglobo, cruzadaonline (014, FR-002), cruzadasbrasil (029, FR-002, FR-015), clube (030, FR-002 e FR-013); único junto com level e date (FR-003); o mesmo dia em fontes diferentes são registros diferentes    |
| level      | Nível do puzzle                                                     | Text      | Yes       | Valores permitidos: daily; único junto com source e date                                                                                                                                                                         |
| date       | Dia do puzzle, no formato AAAA-MM-DD, sem hora nem fuso             | Date      | Yes       | Único junto com source e level; no fuso de Brasília, nunca no futuro quando buscado da fonte                                                                                                                                     |
| data       | Parte pública do puzzle: grade, dicas e atribuição à fonte (FR-017) | Text      | Yes       | Documento JSON no formato interno; consistente com a solução (FR-006); sem nenhuma letra de resposta (FR-002 da 006); nunca a resposta bruta da fonte (FR-007); entregue a quem tem sessão e ao visitante (013, FR-002)          |
| solution   | Letras de resposta de cada célula                                   | Text      | Yes       | Documento JSON no formato interno; entregue ao navegador junto de data a quem tem sessão e ao visitante (013, FR-002), nunca em erro nem log (007, FR-001, FR-004 a FR-006); validada contra a grade antes de sair (007, FR-003) |
| created_at | Data e hora em que o puzzle foi guardado                            | Date      | Yes       | Preenchido pelo banco; UTC                                                                                                                                                                                                       |
| updated_at | Data e hora da última alteração                                     | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC; o puzzle guardado não é reescrito pelo sistema                                                                                                                           |

### Progress

| Field     | Description                          | Data Type | Mandatory | Notes                                                                                                  |
| --------- | ------------------------------------ | --------- | --------- | ------------------------------------------------------------------------------------------------------ |
| user_id   | Usuário dono do progresso            | UUID      | Yes       | PK (junto com puzzle_id); FK → User; demais campos na [DDE-003](./DDE-003-progresso-usuario-puzzle.md) |
| puzzle_id | Puzzle ao qual o progresso se refere | UUID      | Yes       | PK (junto com user_id); FK → Puzzle                                                                    |

## Relationships

| From Entity       | Cardinality | To Entity             | Description                                                                                      |
| ----------------- | ----------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| [Puzzle](#puzzle) | one-to-many | [Progress](#progress) | Um puzzle pode ter o progresso de vários usuários; um puzzle com progresso não pode ser removido |

O limite de buscas sob demanda usa `RateLimitAttempt` da DDE-001 sem chave estrangeira.

## Entity Relationship Diagrams

| ID                                                                   |
| -------------------------------------------------------------------- |
| [ERD-002](../entity-relationship-diagrams/ERD-002-coleta-puzzles.md) |
