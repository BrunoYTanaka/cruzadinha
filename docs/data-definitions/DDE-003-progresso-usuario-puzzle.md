# DDE-003 — Progresso do usuário em cada puzzle

## Changelog

| Version | Date       | Changes                                                                |
| ------- | ---------- | ---------------------------------------------------------------------- |
| `0.0.1` | 2026-10-13 | - Versão inicial derivada da spec 008 (com a clarificação do recorde). |

## Scope

Cobre a ligação entre usuários e puzzles no Cruzadinha: o progresso individual de cada jogador em cada cruzada. Suporta salvar e retomar letras e tempo entre dispositivos, concluir um puzzle guardando o tempo de término, manter o melhor tempo e a data em que foi obtido, reiniciar do zero e isolar o progresso de cada usuário. `User` e `Puzzle` já são definidos nas [DDE-001](./DDE-001-banco-auth-convites.md) e [DDE-002](./DDE-002-coleta-puzzles.md); aqui aparecem só com a chave, para fechar os relacionamentos.

## Source Artifacts

| Source                                                                                                                | Type | Description                                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| [specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-001 a FR-006, US1) | Spec | Um progresso por usuário e puzzle; letras e tempo validados contra a grade         |
| [specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-007 a FR-010, US2) | Spec | Conclusão com tempo de término, recorde com data, reinício e ordem dos salvamentos |
| [specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-011 a FR-014, US3) | Spec | Isolamento por usuário, sessão obrigatória e remoção em cascata                    |

## Entity Summary

| Entity                | Description                                                                          | Source                  |
| --------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| [Progress](#progress) | O que um usuário fez em um puzzle: letras, tempo, situação, conclusão e melhor tempo | FR-001 a FR-010, FR-014 |
| [User](#user)         | Dono do progresso (definido na DDE-001)                                              | FR-011, FR-014          |
| [Puzzle](#puzzle)     | Cruzada compartilhada à qual o progresso se refere (definida na DDE-002)             | FR-001, FR-013, FR-014  |

## Entity Definitions

### Progress

| Field        | Description                                                         | Data Type | Mandatory | Notes                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| user_id      | Usuário dono do progresso                                           | UUID      | Yes       | PK (junto com puzzle_id); FK → User; vem sempre da sessão, nunca do pedido; remover o usuário remove o progresso (FR-014)                                                            |
| puzzle_id    | Puzzle ao qual o progresso se refere                                | UUID      | Yes       | PK (junto com user_id); FK → Puzzle; um puzzle com progresso não pode ser removido (FR-014)                                                                                          |
| cells        | Letras preenchidas pelo jogador, uma por célula aberta              | Text      | Yes       | Documento JSON no formato da solução (matriz altura x largura); vazio ou bloco = nulo; letra única e maiúscula; validado contra a grade do puzzle (FR-005); nunca em log nem em erro |
| elapsed_ms   | Tempo gasto na partida atual, em milissegundos                      | Number    | Yes       | De 0 a 604800000 (7 dias) (FR-006); zerado no reinício (FR-008)                                                                                                                      |
| status       | Situação da partida atual                                           | Text      | Yes       | Valores permitidos: in_progress, completed; concluído não volta a em andamento por salvamento comum (FR-009)                                                                         |
| saved_at     | Horário informado pelo dispositivo no último salvamento aplicado    | Date      | Yes       | Define a ordem dos salvamentos: um mais antigo não sobrescreve (FR-010); avança no reinício para o maior entre o atual e agora                                                       |
| completed_at | Momento em que a partida atual foi concluída                        | Date      | No        | Instante do servidor; preenchido só quando status é completed; limpo no reinício (FR-007, FR-008)                                                                                    |
| finished_ms  | Tempo total gasto para solucionar a partida atual, em milissegundos | Number    | No        | Preenchido junto com completed_at; limpo no reinício (FR-007, FR-008)                                                                                                                |
| best_ms      | Melhor tempo do usuário neste puzzle, em milissegundos              | Number    | No        | Vazio até a primeira conclusão; só diminui, e só com tempo estritamente menor; mantido no reinício; nunca maior que finished_ms quando há conclusão (FR-007, FR-008)                 |
| best_at      | Momento em que o melhor tempo foi obtido                            | Date      | No        | Preenchido junto com best_ms; só muda quando o recorde é batido; mantido no reinício (FR-007, FR-008)                                                                                |
| created_at   | Data e hora em que o progresso foi criado                           | Date      | Yes       | Preenchido pelo banco; UTC                                                                                                                                                           |
| updated_at   | Data e hora da última alteração                                     | Date      | Yes       | Preenchido e avançado pelo banco a cada alteração; UTC                                                                                                                               |

A chave de `Progress` é composta (`user_id` + `puzzle_id`), uma exceção deliberada à convenção `<entidade>_id`: o par já identifica o registro e garante um progresso por usuário e puzzle (FR-001), sem coluna a mais.

### User

| Field   | Description                    | Data Type | Mandatory | Notes                                                            |
| ------- | ------------------------------ | --------- | --------- | ---------------------------------------------------------------- |
| user_id | Identificador único do usuário | UUID      | Yes       | PK; demais campos na [DDE-001](./DDE-001-banco-auth-convites.md) |

### Puzzle

| Field     | Description                   | Data Type | Mandatory | Notes                                                       |
| --------- | ----------------------------- | --------- | --------- | ----------------------------------------------------------- |
| puzzle_id | Identificador único do puzzle | UUID      | Yes       | PK; demais campos na [DDE-002](./DDE-002-coleta-puzzles.md) |

## Relationships

| From Entity       | Cardinality | To Entity             | Description                                                                                                   |
| ----------------- | ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| [User](#user)     | one-to-many | [Progress](#progress) | Um usuário tem um progresso por puzzle jogado; cada progresso pertence a um só usuário e some com ele         |
| [Puzzle](#puzzle) | one-to-many | [Progress](#progress) | Um puzzle pode ter o progresso de vários usuários, cada um independente; cada progresso refere-se a um puzzle |

## Entity Relationship Diagrams

| ID                                                                             |
| ------------------------------------------------------------------------------ |
| [ERD-003](../entity-relationship-diagrams/ERD-003-progresso-usuario-puzzle.md) |
