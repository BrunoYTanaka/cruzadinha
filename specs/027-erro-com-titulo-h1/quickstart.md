# Quickstart: validar as telas de erro com `h1`

Pré-requisitos: Node 24 (`nvm use`), `npm ci`, e para o e2e a API e o Postgres local com seed (ver `CLAUDE.md`, comando `test:e2e`).

## 1. Regressão primeiro (deve falhar antes da correção)

```sh
cd apps/web
npx vitest run src/app src/features/library src/features/status src/features/game
```

Esperado antes da correção: os novos casos de `h1` falham. Depois: passam.

## 2. Unitário, tipos e lint

```sh
npm run typecheck && npm run lint && npm test
```

Esperado: verde. Um `ErrorState` sem `level` não compila.

## 3. E2E de acessibilidade

```sh
npm run test:e2e -w @cruzadinha/web -- botoes.spec.ts erros-com-titulo.spec.ts
```

Esperado: nos temas claro e escuro, zero violações, incluindo `page-has-heading-one`, um `h1` em cada tela de erro de página inteira e um único `h1` ("Hoje") na falha da biblioteca. `grep -n "page-has-heading-one" apps/web/e2e` não encontra nada.

## 4. Verificação manual

Com `npm run dev`, abrir `/dia/<data passada sem cruzada>?fonte=oglobo` com a fonte falhando (aba Rede do navegador, bloquear `/api/puzzles`) e conferir no leitor de tela ou na árvore de acessibilidade um único título de nível 1, e que o título tem a mesma aparência de antes.
