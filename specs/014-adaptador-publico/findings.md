# Findings: verificação contra a Cruzada Online real

Resultados da verificação sob demanda (`npm run source:check:cruzadaonline -w @cruzadinha/api -- <datas> --save`). Os corpos brutos ficam em `apps/api/.source-samples/`, fora do git.

## Execução 1: 2026-10-17

| Data | Resultado | Observação |
|---|---|---|
| 2024-01-01 | `ok`, 11x11, 44 palavras | |
| 2025-01-01 | `ok`, 11x11, 49 palavras | |
| 2026-01-01 | `ok`, 11x11, 49 palavras | |
| 2026-09-01 | `ok`, 11x11, 46 palavras | |
| 2026-10-16 | `ok`, 11x11, 45 palavras | |
| 2026-10-17 | `ok`, 11x11, 45 palavras | Dia de hoje em Brasília |
| 2023-01-01 | `unavailable`, `HTTP 403` | Corpo `<Error><Code>AccessDenied</Code>…` da CDN, o mesmo formato de `fixtures/cdn-error.xml` |
| 2026-10-30 | `unavailable`, `data no futuro` | Recusada sem pedido, como previsto (research R5) |

SC-003 atendido: 6 datas reais de 2024 até hoje convertidas sem erro. Saída 0.

### Estrutura dos 6 arquivos válidos

- **Elementos:** só os previstos em data-model §3 (`crossword-compiler`, `rectangular-puzzle`, `metadata` com `title`, `creator`, `copyright` e `description`, `crossword`, `grid`, `grid-look`, `cell`, `word`, `clues`, `title` com `b` e `clue`).
- **Atributos:** os previstos, mais `clue-square-divider-width` em `grid-look` em 3 dos arquivos. O adaptador o ignora, porque o schema descarta atributos desconhecidos.
- **Células:** `type` só aparece como `block` (115 ocorrências). Nenhuma célula com mais de uma letra nem com outro tipo.
- **Dicas:** `format` sempre inteiro, sem formato composto. 35 dicas com `hint-url`, que é descartado. Nenhuma marcação dentro de `clue`.
- **Entidades:** só `&quot;`, no atributo `font` de `grid-look`. Nenhuma entidade nas dicas.
- **Metadados:** sempre vazios. Por isso a atribuição usa `copyright: 'Cruzada Online'` (decisão do autor).

## Pendências

- [ ] Limite real do histórico: 2024-01-01 existe e 2023-01-01 não. A data exata do primeiro arquivo é desconhecida e não bloqueia a feature, porque a coleta só busca a janela de `COLLECT_HISTORY_DAYS`.
