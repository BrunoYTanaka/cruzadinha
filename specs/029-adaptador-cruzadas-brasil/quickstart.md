# Quickstart: validar a Cruzadas Brasil

Pré-requisitos: Node 24, `npm ci`, Docker (integração), `cp .env.example .env`.

## 1. Testes sem rede

```sh
npm run typecheck && npm test && npm run lint && npm run format:check
```

Esperado: tudo verde; os testes do adaptador usam `fetch` injetado e as fixtures de `contracts/puzzle-source.md`.

## 2. Integração (Postgres real)

```sh
npm run test:int
```

Esperado: a migração `0006` aplica; puzzles das três fontes salvos no mesmo dia aparecem só na biblioteca da fonte pedida; pedido sem `source` devolve só `oglobo`; `collect()` com três fontes falsas continua quando uma falha.

## 3. Fonte real (sob demanda)

```sh
npm run source:check:cruzadasbrasil -w @cruzadinha/api -- 2026-10-22 2026-10-23 2026-09-20 2026-08-01 2026-07-13 2026-07-12 2099-01-01
```

Esperado: `ok` para as quatro primeiras e para 2026-08-01 e 2026-07-13 (SC-003), `unavailable` para 2026-07-12 (404) e para a data futura (sem pedido).

## 4. Ponta a ponta

```sh
docker compose up -d && npm run db:seed -w @cruzadinha/api
npm run dev -w @cruzadinha/api   # e npm run dev -w @cruzadinha/web
```

Esperado: biblioteca com três abas e três cartões em "Hoje"; abrir o cartão "Cruzadas Brasil" leva ao jogo com "Cruzadas Brasil" no título; a conclusão oferece outra fonte; sem rolagem lateral a 360 px.

```sh
npm run test:e2e -w @cruzadinha/web -- fontes.spec.ts
```

## 5. Coleta

```sh
npm run cli -w @cruzadinha/api -- puzzles collect
```

Esperado: uma linha por fonte; datas anteriores a 2026-07-13 contadas como indisponíveis; falha em uma fonte não impede as outras.

Depois do deploy da API, repetir uma vez no ambiente publicado (FR-019, T033): um 403 da fonte aparece como `source-down`, não como `unexpected-format`.
