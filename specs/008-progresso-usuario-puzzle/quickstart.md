# Quickstart: validar o progresso

**Contrato**: [contracts/http-api.md](./contracts/http-api.md) | **Modelo**: [data-model.md](./data-model.md)

## Pré-requisitos

Node.js 24 (`nvm use`), Docker com Compose, `cp .env.example .env`, `npm ci`.

## Automático

```sh
npm run format:check && npm run lint && npm run typecheck && npm test
npm run test:int          # Postgres real via Testcontainers
```

`progress.int.test.ts` deve cobrir: salvar e reler; segundo salvamento substitui (uma linha); outro usuário não vê nem altera; concluir registra `completedAt`, `finishedMs`, `bestMs`, `bestAt`; reiniciar e concluir pior/melhor mantém o menor `bestMs`; `PUT` atrasado não sobrescreve; `PUT in_progress` sobre concluído → `409`; dois `PUT` simultâneos deixam uma linha; remover usuário apaga o progresso; remover puzzle com progresso falha; `401` sem sessão; `404` com puzzle inexistente.

## Manual (API local)

```sh
docker compose up -d
npm run db:seed -w @cruzadinha/api
npm run dev -w @cruzadinha/api
```

Na Swagger UI (`http://localhost:3000/api/docs/`): `POST /api/auth/login` com a conta do seed; `GET /api/puzzles?date=<hoje>` para obter `puzzleId`; `GET /api/progress/{puzzleId}` → `{ "progress": null }`; `PUT` com `status: in_progress` e algumas letras → `200`; `PUT` com `status: completed` → `completedAt`, `bestMs` e `bestAt` preenchidos; `POST .../reset` → letras vazias, `completedAt` nulo e `bestMs`/`bestAt` mantidos.

## Resultado esperado

Testes verdes; `GET` após `PUT` devolve o mesmo conteúdo; `PUT` e `GET` respondem em menos de 1 s (SC-003); nenhum log contém letras do jogador.

## Verificação registrada (2026-10-13)

Roteiro manual na API local (Postgres do `docker compose`, conta do seed): `GET` sem progresso → `{ "progress": null }`; `PUT` parcial, `PUT completed` (com `completedAt`, `finishedMs`, `bestMs`, `bestAt`) e `POST .../reset` (letras vazias, `completedAt` nulo, `bestMs`/`bestAt` mantidos) responderam `200`. Tempo medido com `curl`: entre 7 e 9 ms por chamada (SC-003). Nenhum desvio do roteiro.
