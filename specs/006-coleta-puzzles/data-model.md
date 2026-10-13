# Data Model: Coleta e cache de puzzles

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Tabela `puzzles` (nova, migração `0002`)

| Coluna | Tipo | Regras |
|---|---|---|
| `puzzle_id` | `uuid` | chave primária, `defaultRandom()` |
| `source` | `text` | não nulo; `check` em `('oglobo')` |
| `level` | `text` | não nulo; `check` em `('daily')` |
| `date` | `date` (modo string, `AAAA-MM-DD`) | não nulo |
| `data` | `jsonb` | não nulo; `Puzzle` de `@cruzadinha/shared` (parte pública) |
| `solution` | `jsonb` | não nulo; `Solution` de `@cruzadinha/shared` (só no servidor) |
| `created_at`, `updated_at` | `timestamptz` | spread de `timestamps`, não nulos, `default now()` |

Índices e gatilhos:

- Índice único `puzzles_source_level_date_unique` em `(source, level, date)`.
- Trigger `puzzles_set_updated_at` (`BEFORE UPDATE`, função `set_updated_at()` da `0001`), escrito à mão na migração, como exige `conventions.int.test.ts`.

Regras:

- Linha criada uma vez e não reescrita (sem `onConflictDoUpdate`).
- `data.source`, `data.level` e `data.date` coincidem com as colunas `source`, `level` e `date` (o serviço grava a partir do mesmo objeto).
- Ao ler, `data` e `solution` são reparseados pelos schemas do `shared`.
- Sem chave estrangeira: o futuro `progress` apontará para `puzzle_id`.

## Mudança em `rate_limit_attempts`

- `rateLimitActions` ganha `'PUZZLE_FETCH'`; o `check` `rate_limit_attempts_action_check` passa a aceitar o valor (gerado pelo drizzle-kit na mesma migração).
- Uso: ação `PUZZLE_FETCH`, tipo de chave `NETWORK_ADDRESS`, valor = IP da requisição. Janela `puzzleFetch` em `RateLimits`: 30 tentativas por 60 minutos.

## Contrato compartilhado (`packages/shared/src/puzzle/response.ts`)

```text
puzzleResponseSchema = strictObject {
  puzzleId: uuid
  puzzle:   Puzzle        // sem solução
}
```

Códigos novos em `apiErrorCodeSchema`: `puzzle-unavailable`, `puzzle-source-failed`.

## Resultado da coleta (tipo do serviço, não persistido)

É a materialização da entidade "Execução de coleta" da spec (`CollectReport`).

```text
CollectReport {
  saved:       string[]   // datas gravadas nesta execução
  skipped:     string[]   // datas que já estavam no banco
  unavailable: string[]   // fonte sem puzzle nessa data
  failed:      { date: string, reason: FetchFailureReason }[]
  stoppedBy?:  'rate-limited'   // execução interrompida
  pending:     string[]         // datas não tentadas por causa da interrupção
}
```

Estado final da CLI: exit 0 se `failed` está vazio e não há `stoppedBy`; exit 1 caso contrário. `unavailable` não é falha.

## Puzzle de exemplo (seed, só desenvolvimento)

Linha comum de `puzzles`, sem coluna ou marca extra:

- `source = oglobo`, `level = daily`, `date =` hoje em Brasília.
- `data`: 5×5 convertido da fixture `daily-valid.json`, com `attribution = { sourceName: "Exemplo de desenvolvimento (seed)", title: "Exemplo de desenvolvimento (seed)", author: null, copyright: null }`.
- Gravado com `onConflictDoNothing`: nunca substitui um puzzle existente; se a coleta já guardou o real de hoje, o exemplo não é gravado.

## Transições

Uma data passa de "ausente" a "guardada" uma única vez (por pedido de jogador ou pela coleta). Não há transição de volta nem atualização.
