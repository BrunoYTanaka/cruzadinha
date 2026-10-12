# Findings: verificação contra a fonte real

Resultados da verificação sob demanda (`npm run source:check -w @cruzadinha/api -- --save`), rodada pelo autor. As respostas brutas ficam em `apps/api/.source-samples/`, fora do git.

## Execução 1: 2026-10-12

| Nível | Resultado | Observação |
|---|---|---|
| `daily` | `ok`, 11x11, 32 palavras | Conversão real sem erro |
| `mini` | `unavailable` | Corpo `{ error: "NOT-AVAILABLE", dates }`, sem `ipuzData` |
| `express` | `unavailable` | Igual ao `mini` |
| `expert` | `unavailable` | Igual ao `mini` |
| `thematic` | `unavailable` | Igual ao `mini`; `dates` só com 6 datas futuras |

### Formato da resposta real (`daily`)

- Chaves de topo: `id` (UUID, 36 caracteres), `dates`, `ipuzData`, `fromIpuz`. Nenhuma diferença em relação a `decision.md`.
- `ipuzData` traz também `showenumerations` (booleano) e `origin` (`Crossword Compiler 11.41`), que o adaptador ignora. Não há campo `block`, então vale o padrão `#`; `empty` é `":"`.
- Células da grade: `"#"`, `":"` ou inteiro. Nenhum objeto com estilo, nenhuma célula nula.
- Solução: uma letra por célula, em maiúscula, **com acento** (`Ã` apareceu). A comparação com o que o jogador digita (regra 6 do design: acentuadas viram letra simples) fica para a `game-logic`.
- Dicas: pares `[número, texto]`; nenhuma com `<` ou `&`.
- `dates`: 37 entradas por nível (31 passadas, de 2026-09-12 a 2026-10-12, e 6 futuras). `fomattedDate` vem como `DD/MM/AA` e `day` em espanhol (`domingo`, `lunes`, `martes`). `status` sempre `NOT-PLAYED`.
- Corpo `NOT-AVAILABLE` real: só `error` e `dates`. O autor observou antes que data mal formada recebe o corpo completo com `error`; os dois formatos estão cobertos nos testes.

### Fixtures ajustadas (T021, T023)

- `daily-valid.json` e derivadas: campos `showenumerations` e `origin`, ordem de chaves, `id` em formato UUID, `dates` com o formato real e uma letra acentuada na solução. Grade continua 5 x 5 com conteúdo inventado.
- `unavailable.json`: reduzida ao formato real (`error` + `dates`).

## Execução 2: 2026-10-11

| Nível | Resultado | Observação |
|---|---|---|
| `daily` | `ok`, 11x11 | Conversão real sem erro |
| `mini` | `unavailable` | Corpo idêntico ao da execução 1 (`error` + `dates`) |
| `express` | `unavailable` | Igual ao `mini` |
| `expert` | `unavailable` | Igual ao `mini` |
| `thematic` | `unavailable` | `dates` só com 6 datas futuras (2026-10-13 a 2026-10-29) |

A lista `dates` de `mini`, `express` e `expert` marca 2026-10-11 e 2026-10-12 como passadas, mas os dois dias deram `NOT-AVAILABLE`.

## Conclusão sobre os níveis

O autor confirmou que a fonte só tem o nível `daily`; os outros quatro nomes vêm do código do widget, mas não são publicados. O FR-005 foi alterado e `levelSchema` aceita só `daily`.

## Execução 3: 2026-09-01 (fora da lista `dates`)

| Nível | Resultado | Observação |
|---|---|---|
| `daily` | `ok`, 11x11, 40 palavras | Puzzle próprio, diferente do de 2026-10-12 |

A lista `dates` da resposta vai de 2026-09-12 a 2026-10-18, mas a fonte serviu o puzzle de 2026-09-01. Então `dates` é só a janela que o widget mostra, não o limite do histórico. O adaptador já trata assim: só recusa uma data se `dates` a marcar com `inTheFuture: true`.

## Execução 4: 2015-01-01 (data sem puzzle)

| Nível | Resultado | Observação |
|---|---|---|
| `daily` | `unavailable` | Corpo `{ error: "NOT-AVAILABLE", dates }`, sem `ipuzData` |

Uma data bem formada sem puzzle responde com o mesmo corpo dos níveis inexistentes, que já é o formato de `fixtures/unavailable.json`. O mapeamento do adaptador não muda (T023).

## Pendências

- [x] Níveis `mini`, `express`, `expert` e `thematic`: não existem na fonte (ver acima).
- [x] Data bem formada fora da janela: 2026-09-01 veio com puzzle (execução 3); 2015-01-01, sem puzzle, veio com `NOT-AVAILABLE` (execução 4).
- [ ] Limite real do histórico da fonte: desconhecido. Não bloqueia esta feature.
