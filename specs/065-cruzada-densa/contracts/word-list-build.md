# Contract: montagem da lista de palavras (script de manutenção)

`npm run words:build -w @cruzadinha/api`. Fora da suíte de testes, da CI e do bundle. Faz pedidos de rede só para baixar as fontes.

## Entradas

| Entrada                  | Origem                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `pt_br_50k.txt`          | `https://raw.githubusercontent.com/hermitdave/FrequencyWords/<commit>/content/2018/pt_br/pt_br_50k.txt` (CC BY-SA 4.0) |
| `pt_BR.aff`, `pt_BR.dic` | `https://raw.githubusercontent.com/LibreOffice/dictionaries/<commit>/pt_BR/` (VERO, LGPLv3/MPL)                        |
| `excluded.txt`           | `apps/api/src/sources/generated/words/excluded.txt` (versionado)                                                       |
| lista de bloqueio        | `apps/api/src/sources/generated/blocklist.ts`                                                                          |

Os `<commit>` ficam fixos no script; baixados para `apps/api/.word-sources/` (git-ignored) e reaproveitados se já existirem.

## Saída

`apps/api/src/sources/generated/words/word-list.data.ts`:

```ts
// GERADO por src/sources/generated/words/build.ts — não editar à mão.
// Fontes: FrequencyWords <commit> (CC BY-SA 4.0), LibreOffice dictionaries pt_BR <commit> (VERO, LGPLv3/MPL).
// Licença desta lista: CC BY-SA 4.0. Ver words/NOTICE.md.
export const WORD_LIST = `AGUA\tágua\t1
SOL\tsol\t1
…`
```

E imprime: total, total por comprimento e por faixa, e quantas palavras cada filtro tirou.

## Regras

Ver `data-model.md` (Lista de palavras). Rodar de novo com as mesmas entradas gera o mesmo arquivo (byte a byte).
