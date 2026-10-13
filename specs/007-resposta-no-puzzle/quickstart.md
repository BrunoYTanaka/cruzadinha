# Quickstart: validar a resposta no puzzle

**Feature**: [spec.md](./spec.md) | **Contrato**: [http-api.md](./contracts/http-api.md) | **Modelo**: [data-model.md](./data-model.md)

## Pré-requisitos

- Node.js 24 (`nvm use`), `npm ci` na raiz.
- Docker (Postgres local e Testcontainers).
- `.env` copiado de `.env.example` (`NODE_ENV=development`, conta de seed fictícia).

## 1. Testes automáticos (sem rede)

```sh
npm run lint && npm run typecheck && npm test
npm run test:int
```

Esperado:

- `shared`: `puzzleResponseSchema` aceita `{ puzzleId, puzzle, solution }` coerente e recusa resposta sem `solution`, com solução de outro formato ou com campo extra.
- Rotas: `200` por data e por id traz `solution` igual à guardada; puzzle buscado na fonte pela primeira vez também; `401`, `404`, `400`, `429` e `502` não contêm `solution` nem as letras.
- Puzzle guardado com par inválido: `500 internal-error` genérico, sem letras no corpo nem no log.
- Seed: o exemplo de hoje sai com `solution` coerente com a grade.
- `docs.test.ts` passa com o novo corpo documentado e sem letras reais nos exemplos.

## 2. Conferência manual no ambiente local

```sh
docker compose up -d postgres
npm run db:migrate -w @cruzadinha/api
npm run db:seed -w @cruzadinha/api
npm run dev -w @cruzadinha/api
```

Com login da conta de seed (valores fictícios do `.env.example`), `GET /api/puzzles?date=<hoje>` deve devolver `puzzleId`, `puzzle` e `solution` com o exemplo 5 x 5. Sem o cookie `sid`, a resposta deve ser `401` sem `solution`.

## 3. Documentação

Em `http://localhost:3000/api/docs/`, as duas rotas de puzzles mostram `solution` no corpo `200`.
