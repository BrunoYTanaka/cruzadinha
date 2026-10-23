# Contrato: API

Nenhuma rota nova. Mudanças:

- `GET /api/puzzles?level=&date=&source=` e `GET /api/library?source=`: `source` aceita `cruzadasbrasil`. Sem `source` vale `oglobo`; valor desconhecido → `400` como hoje. O OpenAPI (enum de `source`) passa a listar o id novo porque deriva de `puzzleSourceIdSchema.options`.
- `GET /api/puzzles/:id`, progresso e configurações: sem mudança.
- `GET /api/settings` / `PUT /api/settings`: `defaultSource` continua validado só pelo formato.

## Compatibilidade (FR-014)

| Cliente | Pedido | Resposta |
|---------|--------|----------|
| Site anterior | sem `source` | só `oglobo`, como antes |
| Site da 014/015 | `source=oglobo` ou `cruzadaonline` | como antes |
| Site novo contra API antiga | `source=cruzadasbrasil` | `400 invalid-input` (conferido em `puzzles.routes.ts`: `source` fora do enum é recusada); o site novo trata a fonte como indisponível (ver ui.md) |

Por isso a API é publicada antes do site (docs/versionamento.md, "dois releases para remover").

## Coleta

`collect()` e `puzzles collect` recebem a terceira fonte: uma linha de resumo por fonte, prefixada pelo nome (`Cruzadas Brasil`); falha ou limite de uma fonte não para as outras. Datas anteriores ao início do histórico da fonte aparecem como indisponíveis.
