# DDE-003 — Progresso do usuário em cada puzzle

## Changelog

| Version | Date       | Changes                                                                                          |
| ------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `0.0.4` | 2026-10-27 | - Letras provisórias (rascunho) e preferência do lápis, só no aparelho e fora do servidor (043). |
| `0.0.3` | 2026-10-21 | - Configurações fora do progresso, na DDE-004 (021).                                             |
| `0.0.2` | 2026-10-20 | - Nota sobre o progresso do visitante, guardado só no aparelho e fora deste modelo (013).        |
| `0.0.1` | 2026-10-13 | - Versão inicial derivada da spec 008 (com a clarificação do recorde).                           |

## Scope

Cobre a ligação entre usuários e puzzles no Cruzadinha: o progresso individual de cada jogador em cada cruzada. Suporta salvar e retomar letras e tempo entre dispositivos, concluir um puzzle guardando o tempo de término, manter o melhor tempo e a data em que foi obtido, reiniciar do zero e isolar o progresso de cada usuário. `User` e `Puzzle` já são definidos nas [DDE-001](./DDE-001-banco-auth-convites.md) e [DDE-002](./DDE-002-coleta-puzzles.md); aqui aparecem só com a chave, para fechar os relacionamentos. O progresso do visitante (feature 013) não faz parte deste modelo: fica só no navegador do aparelho, nunca é enviado ao servidor e nunca é lido, gravado ou mostrado como o progresso de uma conta. Seus campos estão na spec 013. As configurações da pessoa, inclusive os limites de ajuda, não fazem parte do progresso: ficam na [DDE-004](./DDE-004-configuracoes-usuario.md). As letras provisórias do modo lápis (feature 043) também não são progresso: ficam só no aparelho, por dono e cruzada, nunca vão ao servidor e não entram na verificação, na conclusão nem no tempo. `Draft` e `PencilPreference` abaixo são entidades lógicas do aparelho, sem tabela no banco.

## Source Artifacts

| Source                                                                                                                | Type | Description                                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| [specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-001 a FR-006, US1) | Spec | Um progresso por usuário e puzzle; letras e tempo validados contra a grade         |
| [specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-007 a FR-010, US2) | Spec | Conclusão com tempo de término, recorde com data, reinício e ordem dos salvamentos |
| [specs/008-progresso-usuario-puzzle/spec.md](../../specs/008-progresso-usuario-puzzle/spec.md) (FR-011 a FR-014, US3) | Spec | Isolamento por usuário, sessão obrigatória e remoção em cascata                    |
| [specs/013-jogo-sem-login/spec.md](../../specs/013-jogo-sem-login/spec.md) (FR-004, FR-011, FR-012)                   | Spec | Progresso do visitante só no aparelho e separado do da conta                       |
| [specs/021-configuracoes-usuario/spec.md](../../specs/021-configuracoes-usuario/spec.md) (FR-008, FR-020)             | Spec | Limites de ajuda e demais configurações guardados à parte do progresso             |
| [specs/043-modo-rascunho/spec.md](../../specs/043-modo-rascunho/spec.md) (FR-002, FR-009 a FR-011, FR-016 a FR-018)   | Spec | Letras provisórias guardadas no aparelho por dono e cruzada; preferência do lápis  |

## Entity Summary

| Entity                                | Description                                                                          | Source                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| [Progress](#progress)                 | O que um usuário fez em um puzzle: letras, tempo, situação, conclusão e melhor tempo | FR-001 a FR-010, FR-014                     |
| [User](#user)                         | Dono do progresso (definido na DDE-001)                                              | FR-011, FR-014                              |
| [Puzzle](#puzzle)                     | Cruzada compartilhada à qual o progresso se refere (definida na DDE-002)             | FR-001, FR-013, FR-014                      |
| [Draft](#draft)                       | Letras provisórias de uma pessoa em uma cruzada, só no aparelho (043)                | 043 FR-002, FR-009 a FR-011, FR-017, FR-018 |
| [PencilPreference](#pencilpreference) | Lápis ligado ou desligado, por aparelho (043)                                        | 043 FR-016                                  |

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

### Draft

Entidade lógica do aparelho (feature 043): vive no `localStorage`, não em tabela, e nunca é enviada ao servidor (FR-010).

| Field     | Description                                  | Data Type | Mandatory | Notes                                                                                                                                                                             |
| --------- | -------------------------------------------- | --------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| owner     | Dono das provisórias: conta ou visitante     | Text      | Yes       | PK (junto com puzzle_id); id da conta (UUID, FK → User) ou o literal `guest` (FR-009, FR-017); chave `cruzadinha:draft:<owner>:<puzzle_id>`                                       |
| puzzle_id | Cruzada à qual as provisórias se referem     | UUID      | Yes       | PK (junto com owner); FK → Puzzle                                                                                                                                                 |
| cells     | Letra provisória de cada casa, no máximo uma | Text      | Yes       | Documento JSON `{ v: 1, cells }`, matriz altura x largura; A–Z e Ç ou nulo; nulo em bloco, casa com definitiva ou travada; chave removida quando todas são nulas (FR-002, FR-006) |

A chave é composta (`owner` + `puzzle_id`), como em `Progress`. Duração (FR-011, FR-017, FR-018): removida na conclusão, no reinício e em "Jogar de novo", ao sair da conta, quando outra conta entra e quando a cópia da cruzada sai do armazenamento offline; sessão expirada não apaga; uma cruzada com provisórias não é descartada pelo limite de 60.

### PencilPreference

Entidade lógica do aparelho (feature 043): chave `cruzadinha:pencil` no `localStorage`, fora das configurações da conta (DDE-004), sem sincronização.

| Field   | Description                 | Data Type | Mandatory | Notes                                                      |
| ------- | --------------------------- | --------- | --------- | ---------------------------------------------------------- |
| enabled | Se o modo lápis está ligado | Boolean   | Yes       | Padrão desligado; lembrado ao abrir outra cruzada (FR-016) |

## Relationships

| From Entity       | Cardinality | To Entity             | Description                                                                                                                               |
| ----------------- | ----------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [User](#user)     | one-to-many | [Progress](#progress) | Um usuário tem um progresso por puzzle jogado; cada progresso pertence a um só usuário e some com ele                                     |
| [Puzzle](#puzzle) | one-to-many | [Progress](#progress) | Um puzzle pode ter o progresso de vários usuários, cada um independente; cada progresso refere-se a um puzzle                             |
| [User](#user)     | one-to-many | [Draft](#draft)       | Uma conta tem, no aparelho, um rascunho por cruzada; sai ao sair da conta ou quando outra conta entra (o visitante usa `guest`, sem User) |
| [Puzzle](#puzzle) | one-to-many | [Draft](#draft)       | Uma cruzada pode ter rascunhos de várias pessoas no mesmo aparelho; cada rascunho refere-se a uma cruzada                                 |

## Entity Relationship Diagrams

| ID                                                                             |
| ------------------------------------------------------------------------------ |
| [ERD-003](../entity-relationship-diagrams/ERD-003-progresso-usuario-puzzle.md) |
