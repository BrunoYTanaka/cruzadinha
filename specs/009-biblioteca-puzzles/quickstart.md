# Quickstart: validar a biblioteca

**Contrato**: [contracts/http-api.md](./contracts/http-api.md) | **Modelo**: [data-model.md](./data-model.md)

## Pré-requisitos

Node.js 24 (`nvm use`), Docker com Compose, `cp .env.example .env`, `npm ci`.

## Automático

```sh
npm run format:check && npm run lint && npm run typecheck && npm test
npm run test:int          # Postgres real via Testcontainers
```

`library.int.test.ts` deve cobrir: lista vazia; ordem do mais recente ao mais antigo; "não iniciado" sem linha e com linha vazia; "em andamento" com letras e `elapsedMs`; "concluído" com `finishedMs`, `completedAt` e `bestMs`; reiniciado mantém `bestMs`/`bestAt` e volta a `not_started`; dois usuários veem cada um o seu; limite de 366; fonte que falha se chamada e contador `PUZZLE_FETCH` inalterado; corpo sem `grid`, `words`, `solution` nem `cells`; `401` sem sessão.

## Manual (API local)

```sh
docker compose up -d
npm run db:seed -w @cruzadinha/api
npm run dev -w @cruzadinha/api
```

Na Swagger UI (`http://localhost:3000/api/docs/`): `POST /api/auth/login` com a conta do seed; `GET /api/library` → um item (o puzzle de exemplo) `not_started`; `PUT /api/progress/{puzzleId}` com algumas letras e `GET /api/library` → `in_progress`; concluir → `completed` com `bestMs`; `POST .../reset` → `not_started` com `bestMs` mantido.

## Resultado esperado

Testes verdes; `GET /api/library` responde em menos de 1 s (SC-003) e a resposta não contém grade, dicas, solução nem letras.
