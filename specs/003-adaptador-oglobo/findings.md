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

## Pendências

- [ ] Níveis `mini`, `express` e `expert` responderam `NOT-AVAILABLE` para uma data que a própria lista marca como passada. Conferir uma data anterior (por exemplo 2026-10-11) para saber se publicam só em alguns dias ou se não estão disponíveis ao visitante anônimo.
- [ ] `thematic` só lista datas futuras; conferir de novo depois de 2026-10-13.
- [ ] Data bem formada fora da janela (mais de 31 dias atrás, por exemplo 2026-09-01): registrar se também vem `NOT-AVAILABLE`.
