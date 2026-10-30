# Data Model

Sem tabela nova nem coluna nova.

## Entrada (linha de progresso)
`{ source, status: 'in_progress'|'completed', finishedMs: number|null, completedAt: ISO|null, bestMs: number|null }`

## Saída `Stats`
```
{
  streak:  { current: int>=0, longest: int>=0 },
  total:   int>=0,                      // concluídas agora, todas as fontes
  averageMs: int|null,                  // média de finishedMs; null sem conclusão
  bySource: Array<{ source, total, averageMs|null, bestMs|null }>   // todas as fontes, ordem do site
}
```
Regras: `completed` ⇒ `finishedMs` e `completedAt` presentes (já garantido por `progress_completed_pair`). Média arredondada ao inteiro. `bySource` sempre traz todas as fontes de `puzzleSourceIdSchema.options`.
