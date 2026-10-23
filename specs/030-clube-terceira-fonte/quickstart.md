# Quickstart: validar Cruzadas Clube como terceira fonte

Pré-requisitos: Node 24 (`nvm use`), Docker, `cp .env.example .env`, `docker compose up -d postgres`.

## 1. Regras e testes unitários (sem rede)

```sh
npm ci
npm run typecheck && npm run lint && npm test
```

Esperado: regra de vizinhas em `packages/shared/src/puzzle/rules.test.ts`, adaptador em `apps/api/src/sources/clube/*.test.ts` (inclui os casos de sandbox: rede, arquivos, laço infinito, memória) e navegação em `apps/web/src/game-logic/`.

## 2. Integração com Postgres real

```sh
npm run test:int
```

Esperado: migração `0006` aplicada, `clube` aceito pela restrição, coleta com três fontes (falha em uma não impede as outras), biblioteca e rota de puzzle com `source=clube`, dia não salvo `404` sem consumir o limite.

## 3. Fonte real (sob demanda, fora da CI)

```sh
npm run source:check:clube -w @cruzadinha/api -- --save
```

Esperado: uma linha com dimensões (12 x 8) e contagem de palavras; `--save` grava só no `apps/api/.source-samples/` (ignorado pelo Git). Repetir para 5 edições (SC-007). Conferir R2 (seletor do link anterior) e R1 (o script roda sem *stubs*).

## 4. Partida de teste (R11)

Com uma edição real salva localmente: `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`, abrir a edição, digitar uma palavra inteira, usar Tab, setas, Home, End, Delete, ajuda e completar. Registrar o resultado em `findings.md`.

## 5. E2E

```sh
npm run test:e2e -w @cruzadinha/web
```

Esperado: `e2e/clube.spec.ts` (três abas e cartões, barras visíveis nos dois temas sem salto de layout, dia sem edição sem pedido à fonte, atribuição "Cruzadas Clube" e autor) e as specs anteriores sem regressão.
