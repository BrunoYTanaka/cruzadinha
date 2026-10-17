# Contrato: linha de comando

## `puzzles collect` (mudança)

Sem argumentos novos. Coleta `oglobo` e depois `cruzadaonline`, na mesma janela (`COLLECT_HISTORY_DAYS`), com 2 s de pausa entre pedidos.

Saída (uma linha de resumo por fonte, em stdout):

```text
Coleta O Globo: 1 gravados, 30 já existentes, 0 indisponíveis, 0 falhas.
Gravados: 2026-10-17
Coleta Cruzada Online: 31 gravados, 0 já existentes, 0 indisponíveis, 0 falhas.
Gravados: 2026-09-16, …, 2026-10-17
```

Em stderr, por fonte:

```text
[Cruzada Online] Falhou em 2026-10-02: source-down
[Cruzada Online] Interrompido por limite de uso da fonte; pendentes: 2026-10-03, …
```

Código de saída: 0 se nenhuma fonte teve falha ou interrupção; 1 caso contrário. O `collect.yml` não muda: continua chamando `node apps/api/dist/cli.mjs puzzles collect`.

## `source:check:cruzadaonline` (novo)

```text
npm run source:check:cruzadaonline -w @cruzadinha/api -- [AAAA-MM-DD ...] [--save]
```

- Sem data, usa hoje em Brasília. Aceita no máximo 10 datas, com pausa de 2 s entre elas, e para no primeiro `rate-limited`.
- Uma linha por data:

  ```text
  Cruzada Online
  2026-10-16  ok                 11x11  45 palavras
  2026-10-30  unavailable        data no futuro
  2023-01-01  unavailable        HTTP 403
  ```

- `--save`: grava o corpo bruto em `apps/api/.source-samples/cruzadaonline-<data>.xml`, pasta ignorada pelo git.
- Saída: 0 (todas `ok` ou `unavailable`), 1 (alguma outra falha ou interrupção) e 2 (argumento inválido).
- Faz pedidos reais e nunca é executado pela suíte automática nem pela CI.
