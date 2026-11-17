# Data Model: Casa (064)

A cruzada gerada usa a tabela `puzzles` como as outras fontes. Única tabela nova: `generated_source_settings`. O limite de chamadas usa `rate_limit_attempts`, que já existe (research R12).

## Mudanças de banco (migração, release B)

| Tabela                      | Mudança                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `puzzles`                   | `puzzles_source_check` passa a aceitar `'casa'`                                                             |
| `source_settings`           | `source_settings_source_check` passa a aceitar `'casa'`; insere `('casa', visible = false, position = max+1)` |
| `generated_source_settings` | nova; insere a linha de `casa` com os padrões                                                               |
| `rate_limit_attempts`       | `rate_limit_attempts_action_check` passa a aceitar `'PUZZLE_GENERATE'`                                      |

`ON CONFLICT DO NOTHING` nos inserts, para a migração ser idempotente. Documentação já atualizada nesta fase de plano: `DDE-001` 0.0.8 (ação `PUZZLE_GENERATE`), `DDE-002` 0.0.6 (fonte `casa`, descarte), `DDE-008` 0.0.3 (linha escondida), `DDE-009-configuracao-fontes-geradas` e `ERD-009` novos, ERDs 002 e 008 (valor permitido) e a tabela de `docs/design.md`.

## `generated_source_settings`

| Coluna                     | Tipo          | Regra                                                                     |
| -------------------------- | ------------- | ------------------------------------------------------------------------- |
| `generated_source_setting_id` | `uuid` PK  | gerado pelo banco, como `source_settings`                                 |
| `source_id`                | `text` UNIQUE | `CHECK (source_id IN ('casa'))`: só fontes geradas; alargado a cada nova |
| `grid_size`                | `smallint`    | `NOT NULL DEFAULT 11`, `CHECK (grid_size BETWEEN 9 AND 15)`               |
| `difficulty`               | `text`        | `NOT NULL DEFAULT 'medium'`, `CHECK IN ('easy','medium','hard')`          |
| `created_at`, `updated_at` | `timestamptz` | `timestamps` + trigger `generated_source_settings_set_updated_at`         |

Escrita: upsert por `source_id` (`ON CONFLICT (source_id)`). Leitura sem linha → padrão `{ gridSize: 11, difficulty: 'medium' }`.

## Chamadas do dia (`rate_limit_attempts`)

Ação nova `PUZZLE_GENERATE` (migração alarga `rate_limit_attempts_action_check` e `rateLimitActions`), `key_type` `GLOBAL`, `key_value` `<source>:<AAAA-MM-DD>`; limite 3, janela 24 h, `rateLimiter.reserve` antes de cada pedido ao modelo. Restantes = 3 - tentativas da chave. Limpas por `auth cleanup` (mais de 2 dias).

## Esquemas em `shared` (`packages/shared/src/sources/generated-settings.ts`)

```text
generatedSourceIds              = ['casa']                      (subconjunto de puzzleSourceIdSchema)
difficultySchema                = enum ['easy', 'medium', 'hard']
difficultyLabels                = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }
GENERATED_GRID_SIZE_MIN = 9, GENERATED_GRID_SIZE_MAX = 15
GENERATED_SETTINGS_DEFAULT      = { gridSize: 11, difficulty: 'medium' }
GENERATION_DAILY_CALLS          = 3
generatedSettingsRequestSchema  = strictObject { source, gridSize: int 9..15, difficulty }
discardGeneratedRequestSchema   = strictObject { source, puzzleId }
generatedSourcesResponseSchema  = object { sources: GeneratedSourceView[] }   (tolerante; id desconhecido descartado)
GeneratedSourceView             = { source, gridSize, difficulty, callsLeft,
                                    today: null | { puzzleId, size, discardable, blockedBy: 'progress' | 'duel' | null,
                                                    words: { number, direction, answer, clue }[] } }
```

## Fonte `casa`

| Campo                | Valor                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| id                   | `casa`                                                                                                 |
| nome exibido         | `Casa`                                                                                                 |
| provedor             | DeepSeek (`https://api.deepseek.com`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`), ligado em `cli.ts`        |
| busca sob demanda    | não (`onDemand: false`, em `puzzleSourcesWithoutFetch`)                                                |
| nível                | `daily`                                                                                                |
| atribuição           | `sourceName: 'Casa'`, `title: 'Dificuldade: <Fácil/Médio/Difícil>'`, `author: null`, `copyright: null` |
| visibilidade inicial | escondida                                                                                              |

Nada que o jogador vê cita IA, modelo ou provedor (FR-012).

## Saída do modelo (dado externo, entra como `unknown`)

```text
ModelOutput { words: ModelWord[20..100] }
ModelWord   { answer: string, clue: string }
```

Regras: research R8, mais lista de bloqueio (R13) e respostas dos últimos 30 dias (R14), item a item. Saída inválida por inteiro (JSON vazio, cortado, sem `words`) = tentativa falha.

## Montagem (puro, `sources/generated/layout.ts`)

```text
layout(words: ValidWord[], size: number, seed: number) -> Placement[] | null
Placement { answer, clue, row, col, direction: 'across' | 'down' }
```

- Grade `size x size` (9 a 15, de `generated_source_settings`).
- Aceita com >= `round(1.25 * size)` palavras, todas ligadas; senão `null`.
- Cruzamento só com letra idêntica (acento incluído).
- Saída convertida em `Puzzle` (`grid.width = grid.height = size`, blocos onde não há letra, números em ordem de leitura) e `Solution` (letra maiúscula com acento por casa aberta; `null` nos blocos).

## Resultado de uma geração (dentro da coleta)

| Desfecho               | `FetchPuzzleResult`                                         | Relatório               | Saída da CLI |
| ---------------------- | ----------------------------------------------------------- | ----------------------- | ------------ |
| gerada                 | `ok: true`                                                  | `saved`                 | 0            |
| já existia             | (não chama)                                                 | `skipped`               | 0            |
| sem créditos (`402`)   | `ok: false, reason: 'unavailable', detail: 'sem créditos'`  | `unavailable` + `notes` | 0            |
| sem chave              | `ok: false, reason: 'unavailable', detail: 'sem chave'`     | `unavailable` + `notes` | 0            |
| geração desligada      | `ok: false, reason: 'unavailable', detail: 'geração desligada'` | `unavailable` + `notes` | 0          |
| limite do dia esgotado | `ok: false, reason: 'unavailable', detail: 'limite do dia'` | `unavailable` + `notes` | 0            |
| chave recusada (`401`) | `ok: false, reason: 'refused'`                              | `failed`                | 1            |
| tentativas falhas      | `ok: false, reason: 'source-down' \| 'unexpected-format'`   | `failed`                | 1            |

"Tentativas falhas" = todas as chamadas que restavam no dia falharam (no máximo 3 no total, R12).

## Descarte

Apaga a linha de `puzzles` (fonte gerada, data de hoje, `puzzleId` informado). `progress` e `duels` têm FK `ON DELETE RESTRICT`: com uso, a exclusão falha e vira `409 in-use`. Não mexe em `rate_limit_attempts`.

## Mudança de tipo interno

`CollectReport` (`modules/puzzles/puzzles.service.ts`) ganha `notes: string[]` — `"<data>: <detail>"` para resultados `unavailable` com `detail`.
