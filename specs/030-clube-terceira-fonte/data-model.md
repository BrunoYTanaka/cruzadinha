# Data Model: Cruzadas Clube como terceira fonte

Sem tabela nem coluna nova. Uma restrição muda.

## `puzzles` (existente)

| Campo | Mudança |
|-------|---------|
| `source` | `CHECK (source IN ('oglobo','cruzadaonline','clube'))` — migração `0006_puzzles_source_clube` apenas troca `puzzles_source_check`. |
| `data` (jsonb) | Mesmo `Puzzle`. Uma grade `clube` não tem `block`. |
| `solution` (jsonb) | Mesmo `Solution`. |
| (`source`,`level`,`date`) | Mesma unicidade. Uma segunda edição na mesma data é ignorada (`ON CONFLICT DO NOTHING`). |

`progress`, `user_settings` e a biblioteca não mudam. `user_settings.defaultSource` já aceita qualquer texto por formato.

## `Puzzle` / `Solution` (shared)

- `puzzleSourceIdSchema`: `['oglobo','cruzadaonline','clube']`.
- `puzzleSourceNames.clube = 'Cruzadas Clube'`.
- `puzzleSourcesWithoutFetch = ['clube']` (novo, lido por API e site).
- `Word` sem campo novo. **Palavras vizinhas**: duas palavras `a`, `b` da mesma direção tais que a célula logo após o fim de `a` é o início de `b`. Invariantes:
  - nenhuma célula é coberta duas vezes pela mesma direção;
  - toda célula aberta continua coberta por uma palavra (cobertura) e todo número está no início de uma palavra;
  - `wordBoundaries(words)` é derivado: lista `{row, col, direction}` da última célula de cada palavra que tem vizinha colada depois dela.

## Edição (fora do banco, no adaptador)

| Campo | Origem |
|-------|--------|
| `date` | página: "postado em DD/MM/AAAA" |
| `author` | página: `<b>` depois de "por" |
| `editionNumber` | `Cruzadas clássicas <n>` (título; usado só em log e título) |
| `scriptPath` | página: `/jogos/CC<n>.js` |
| `previousPath` | página: link `/jogo/i/id/<id>/cruzadas-classicas-<n-1>/` |
| `xml` | variável `CrosswordPuzzleData` lida na sandbox |

## Transições

Nenhuma nova. Progresso, relógio, ajudas e conclusão seguem as regras existentes, por `puzzle_id`.
