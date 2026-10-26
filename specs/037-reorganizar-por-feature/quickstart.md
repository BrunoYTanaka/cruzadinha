# Quickstart: validar cada passo

Pré-requisitos: Node.js 24 (`nvm use`), `npm ci`, Docker para `test:int`, `npx playwright install chromium` para o e2e.

## Em todo passo

```sh
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
npm run check:deps          # criado no passo 1; warn até o passo 7
```

Esperado: tudo verde; `check:deps` nunca com mais violações que no passo anterior.

## Passos que tocam a API

```sh
npm run test:int
# antes e depois, com a API local no ar:
curl -s localhost:3000/api/docs/json > /tmp/openapi-<antes|depois>.json   # diff vazio (D7)
```

## Passos que tocam o site

```sh
npm run test:e2e -w @cruzadinha/web      # ver CLAUDE.md para o banco e as portas locais
npm run build -w @cruzadinha/web         # comparar apps/web/dist/assets com a linha de base (D6)
```

Esperado: chunk principal até +5%; chunks `react`/`vendor` iguais; o jogo segue em chunk próprio.

## Passo 7 (regras em erro)

Criar uma importação proibida temporária (por exemplo `features/library` importando `features/game/useGame`) e conferir que `npm run lint` falha; remover e conferir que passa.

## Fim

`npm run check:deps` com zero ciclos e zero violações; `grep` por caminhos antigos em `CLAUDE.md` e `docs/` sem resultado.
