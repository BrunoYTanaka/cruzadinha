# Data Model: Ajudas zeradas ao jogar de novo

Nenhuma entidade nova nem alterada. Só os dados de ajuda existentes, que o reinício deve zerar:

| Dado | Onde fica | Quem | Depois de "Jogar de novo" |
|------|-----------|------|---------------------------|
| `usage` (`letters`, `words`) | `cruzadinha:help:<userId>:<puzzleId>` (`localStorage`) | conta | chave removida |
| `marks`, `locked` | mesma chave | conta | removidos junto |
| `help` (`usage`, `marks`, `locked`) | registro `progress` do IndexedDB `cruzadinha-visitante` | visitante | `null` |
| `helpLetters`, `helpWords` | ajustes (`cruzadinha:settings`) | ambos | inalterados |

Transição: partida com ajudas → concluída → `reset` → partida sem ajudas (`usage` 0/0, sem marcas, sem células travadas). O melhor tempo e o recorde não mudam.
