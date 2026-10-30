# Data Model: Filtros no calendário por status

Sem tabela, schema ou armazenamento novos (DDE/ERD não mudam).

## StatusFilter (só na tela)

`'all' | 'not_started' | 'in_progress' | 'completed'`. Padrão `'all'`. Vive em `useState` da `LibraryPage`.

## Regras (helper puro)

| Filtro | Dia ativo quando `DayState.kind` é |
|---|---|
| `all` | qualquer (comportamento atual, nada apagado) |
| `not_started` | `not_started` |
| `in_progress` | `in_progress` |
| `completed` | `completed` |

`fetchable`, `none` e `future` ficam apagados com qualquer filtro diferente de `all` e não entram nas contagens.

## Contagens

`countByFilter(days)`: `completed`, `in_progress` e `not_started` contam dias com esse `kind`; `all` = soma dos três (dias com cruzada guardada). Sempre sobre o mês exibido (`MonthView.days`).
