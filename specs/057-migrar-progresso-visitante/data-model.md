# Data Model: Migrar progresso de visitante

Sem mudança de schema, tabela ou migração; DDE/ERD inalterados.

## ImportItem (entrada, por cruzada)

| Campo | Regra |
|---|---|
| `puzzleId` | UUID |
| `cells` | `progressCellsSchema`; deve bater com a grade (`cellsMatchGrid`) |
| `elapsedMs` | inteiro 0 a 604.800.000 |
| `status` | `in_progress` \| `completed` |
| `savedAt` | ISO-8601 com fuso; dentro da tolerância de `savedAtTooFar` |
| `completedAt`, `finishedMs` | não nulos se `completed`; nulos se `in_progress` |
| `bestMs`, `bestAt` | ambos nulos ou ambos presentes |

Estrito: campo extra (como `userId` ou `help`) é recusado. `items`: 1 a 100, `puzzleId`s únicos.

## ImportOutcome (saída, na ordem da entrada)

`{ puzzleId, result: 'imported' | 'kept' | 'rejected', reason?: 'puzzle-unavailable' | 'invalid-input' }`

`ImportResponse = { results: ImportOutcome[], imported, kept, rejected }`.

## Transições (linha `progress` da conta)

- sem linha → `imported`
- `completed` → `kept`
- `in_progress` com `savedAt` ≥ do item → `kept`
- `in_progress` com `savedAt` < do item → `imported` (recorde = menor dos dois)

## Visitante (IndexedDB)

Registro apagado quando `result` é `imported` ou `kept` e `savedAt` local ainda é o enviado; `rejected` permanece.
