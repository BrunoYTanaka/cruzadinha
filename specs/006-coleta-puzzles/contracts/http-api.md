# Contrato: rotas de puzzles

**Feature**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md)

Ambas exigem sessão (cookie `sid`). Sem sessão: `401` `unauthenticated`, e a fonte não é consultada. Erros têm o formato `{ error, message, fields? }` da feature 004, com mensagens genéricas.

## `GET /api/puzzles?level=daily&date=AAAA-MM-DD`

| Parâmetro | Regra |
|---|---|
| `level` | opcional, padrão `daily`; só `daily` é aceito |
| `date` | obrigatório, `AAAA-MM-DD` válido |

Ordem das verificações: sessão → validação (`400`) → banco → (se faltar) data futura → limite de busca → fonte.

| Situação | Status | Corpo |
|---|---|---|
| Puzzle guardado, ou buscado e gravado agora | `200` | `{ puzzleId, puzzle, solution }` (007) |
| `level` ou `date` inválidos | `400` | `invalid-input`, com `fields` |
| Data futura, ou a fonte não publica nessa data | `404` | `puzzle-unavailable` |
| Fonte fora do ar, recusou, formato inesperado ou limite de uso da fonte | `502` | `puzzle-source-failed` |
| Limite de buscas sob demanda excedido | `429` | `too-many-attempts` + cabeçalho `Retry-After` |
| Sem sessão | `401` | `unauthenticated` |

Regras:

- *(Alterado pela feature 007)* o corpo de sucesso agora traz `solution` além de `puzzleId` e `puzzle`; erros e respostas sem sessão nunca a contêm. Ver [007 http-api](../../007-resposta-no-puzzle/contracts/http-api.md).
- Puzzle já guardado responde sem consultar a fonte e sem consumir o limite de buscas.
- Falha da fonte não afeta datas já guardadas (FR-016).
- Data futura é recusada antes de qualquer pedido à fonte.

## `GET /api/puzzles/:id`

`id` é o `puzzleId`. Só lê o banco; nunca consulta a fonte.

| Situação | Status | Corpo |
|---|---|---|
| Encontrado | `200` | `{ puzzleId, puzzle, solution }` (007) |
| `id` que não é uuid, ou inexistente | `404` | `puzzle-unavailable` |
| Sem sessão | `401` | `unauthenticated` |

## Documentação

Cada rota declara `schema` (tag `puzzles`, resumo, parâmetros, respostas, `security` de sessão) em `puzzles.schemas.ts`, como exige `src/docs/docs.test.ts` (FR-018).
