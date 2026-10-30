# Data Model: Compartilhar o resultado sem spoiler

Nenhum dado novo é guardado ou enviado (sem tabela, sem IndexedDB, sem `localStorage`).

**Resultado compartilhável** (valor calculado a cada toque):

| Campo | Origem                                     |
| ----- | ------------------------------------------ |
| fonte | `puzzleSourceNames[puzzle.source]`         |
| data  | `puzzle.date` (ISO, mostrada `dd/mm/aaaa`) |
| tempo | `finishedMs` formatado por `formatElapsed` |

Regra: a função recebe só esses três valores; solução, dicas e grade não entram nela.
