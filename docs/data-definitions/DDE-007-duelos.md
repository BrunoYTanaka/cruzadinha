# DDE-007 — Duelos x1

## Changelog

| Version | Date       | Changes                                                       |
| ------- | ---------- | ------------------------------------------------------------- |
| `0.0.1` | 2026-11-02 | - Versão inicial derivada da spec 058 (#117), entrega 1 de 2. |

## Scope

Cobre as tabelas `duels` e `duel_participants` e os novos valores de ação em `RateLimitAttempt`. `User`, `Puzzle` e `RateLimitAttempt` já são definidos nas [DDE-001](./DDE-001-banco-auth-convites.md) e [DDE-002](./DDE-002-coleta-puzzles.md) e aparecem aqui só no que muda. O token do participante só existe no servidor como SHA-256 (hex). O token do link fica em claro (research R3 da spec 058). Todo instante de regra vem do `Clock` da aplicação, nunca do `now()` do banco (research R12).

## Source Artifacts

| Source                                                                             | Type | Description                               |
| ---------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| [specs/058-x1-duelo-1x1/spec.md](../../specs/058-x1-duelo-1x1/spec.md)             | Spec | Requisitos e entidades                    |
| [specs/058-x1-duelo-1x1/data-model.md](../../specs/058-x1-duelo-1x1/data-model.md) | Plan | Colunas, restrições, estados e transições |

## Entity Summary

| Entity                                | Description                                    | Source                  |
| ------------------------------------- | ---------------------------------------------- | ----------------------- |
| [Duel](#duel)                         | Desafio 1x1 sobre uma cruzada salva            | FR-001 a FR-006, FR-020 |
| [DuelParticipant](#duelparticipant)   | Uma das duas vagas do duelo (criador/oponente) | FR-007, FR-011, FR-026  |
| [RateLimitAttempt](#ratelimitattempt) | Novos valores de ação (DDE-001)                | FR-008, FR-013          |

## Entity Definitions

### Duel

| Field             | Description                              | Data Type | Mandatory | Notes                                                                                  |
| ----------------- | ---------------------------------------- | --------- | --------- | -------------------------------------------------------------------------------------- |
| duel_id           | Identificador único do duelo             | UUID      | Yes       | PK; gerado pelo banco                                                                  |
| puzzle_id         | Cruzada do duelo                         | UUID      | Yes       | FK → Puzzle (`ON DELETE RESTRICT`)                                                     |
| link_token        | Token do link do convite                 | Text      | Yes       | Único; 32 bytes aleatórios em base64url, em claro                                      |
| code              | Código curto de 8 caracteres             | Text      | Yes       | Alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ`; único entre duelos `open` (índice parcial) |
| state             | Estado guardado                          | Text      | Yes       | `open`, `running`, `finished`, `cancelled`                                             |
| help_mode         | Regra de ajuda                           | Text      | Yes       | `free`, `forbidden`, `penalty`                                                         |
| help_penalty_ms   | Penalidade por ajuda                     | Integer   | No        | `> 0` só em `penalty`, nulo nos demais                                                 |
| max_ms            | Tempo máximo da partida                  | Integer   | No        | Nulo = sem limite; senão entre 60000 e 7200000                                         |
| start_deadline_at | Fim do prazo para o oponente começar     | Date      | Yes       | Criação + prazo escolhido (1, 24 ou 168 h)                                             |
| outcome           | Desfecho                                 | Text      | No        | `creator`, `opponent`, `tie`; nulo até `finished`                                      |
| outcome_reason    | Motivo do desfecho                       | Text      | No        | `time`, `forfeit`, `timeout`, `walkover`, `declined`                                   |
| finished_at       | Fim ou cancelamento                      | Date      | No        | Nulo até `finished`/`cancelled`                                                        |
| created_at        | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC                                                             |
| updated_at        | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco (gatilho `duels_set_updated_at`); UTC                 |

Regras:

- Estados: `open` → `running` (oponente começa) → `finished`; `open` → `cancelled` (criador); `open` → `finished` com `declined` (oponente recusa). Prazo vencido, W.O. e tempo esgotado são derivados na leitura por `resolveDuel` e gravados na próxima ação.
- O cron apaga só duelos expirados (`open` ou `running` sem ninguém terminar, prazo vencido há mais de 7 dias) e `cancelled` com mais de 30 dias; nunca `finished`.

### DuelParticipant

| Field               | Description                              | Data Type | Mandatory | Notes                                                                              |
| ------------------- | ---------------------------------------- | --------- | --------- | ---------------------------------------------------------------------------------- |
| duel_participant_id | Identificador único                      | UUID      | Yes       | PK; gerado pelo banco                                                              |
| duel_id             | Duelo                                    | UUID      | Yes       | FK → Duel (`ON DELETE CASCADE`); único com `role`                                  |
| role                | Papel                                    | Text      | Yes       | `creator` ou `opponent`                                                            |
| user_id             | Conta, se logado                         | UUID      | No        | FK → User (`ON DELETE SET NULL`); nulo para visitante ou conta apagada             |
| nickname            | Apelido                                  | Text      | Yes       | 1 a 24 caracteres; gravado na linha, sobrevive à conta                             |
| token_hash          | SHA-256 do token do participante         | Text      | Yes       | Único; gerado para todos, devolvido só a visitantes                                |
| started_at          | Início da partida                        | Date      | No        | Gravado no servidor no "Começar"                                                   |
| finished_at         | Fim da partida                           | Date      | No        | Nulo até terminar ou desistir                                                      |
| elapsed_ms          | Tempo do servidor, sem penalidade        | Integer   | No        | Exigido quando `end_reason = completed`                                            |
| helps_used          | Ajudas declaradas                        | Integer   | Yes       | 0 a 1000; não validado pelo servidor                                               |
| penalty_ms          | Penalidade calculada                     | Integer   | Yes       | `helps_used × help_penalty_ms`                                                     |
| end_reason          | Motivo do fim                            | Text      | No        | `completed`, `forfeit`, `timeout`; nulo junto com `finished_at`                    |
| created_at          | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC                                                         |
| updated_at          | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco (gatilho `duel_participants_set_updated_at`); UTC |

### RateLimitAttempt

Valores novos de `action`: `DUEL_CREATE` (chave `NETWORK_ADDRESS`, 10 em 60 minutos; chave `USER` quando há sessão), `DUEL_LOOKUP` (chave `NETWORK_ADDRESS`, 30 em 60 minutos) e `DUEL_MINE` (chave `NETWORK_ADDRESS`, 60 em 60 minutos).

Diagrama: [ERD-007](../entity-relationship-diagrams/ERD-007-duelos.md).
