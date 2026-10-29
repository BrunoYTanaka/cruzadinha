# Data Model: Landing page alinhada ao mockup

Nenhuma tabela, coluna, rota ou schema muda (FR-018). Só duas estruturas do front end, sem persistência.

## Amostra da mini cruzada

`helpers/sample.ts` (já existente, conteúdo trocado). Formato interno de puzzle (`Puzzle` + `Solution` de `@cruzadinha/shared`), 5x5:

```text
C O S T A      horizontais: 1 COSTA, 4 MUNDO, 5 OCASO
A # O # T      verticais:   1 CAMPO, 2 SONDA, 3 ATOMO
M U N D O
P # D # M
O C A S O
```

- Blocos em (1,1), (1,3), (3,1), (3,3); números 1 (0,0), 2 (0,2), 3 (0,4), 4 (2,0), 5 (4,0).
- Dicas inventadas (as do mockup): 1H "Faixa de terra junto ao mar", 4H "O planeta Terra", 5H "Pôr do sol", 1V "Terreno de futebol ou de plantação", 2V "Aparelho que mede a profundidade", 3V "Partícula de matéria (sem acento)".
- `source`, `level`, `date` e `attribution` só existem porque o formato os exige (como na 048); a amostra continua validando em `puzzleSchema`.

## Estado da mini cruzada

`helpers/mini-state.ts`, funções puras:

| Item | Descrição |
|---|---|
| `START_STATE` | `GameState` inicial com `C`, `O`, `S` em 1-horizontal e seleção em (0,3); não é salvo em lugar nenhum |
| `solvedWords(state)` | ids/números+direção das palavras completas e iguais à solução (compara com `plainLetter`) |
| ação local `'clear'` | devolve `START_STATE` |

O `GameState` completo (células, seleção, modo) continua sendo o de `domain/game`; nenhum campo novo.
