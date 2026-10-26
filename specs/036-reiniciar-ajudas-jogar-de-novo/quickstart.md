# Quickstart: validar "Jogar de novo" zerando as ajudas

## Pré-requisitos

`nvm use`, `npm ci`; para o e2e: Postgres local com seed e a API rodando (ver `CLAUDE.md`, comando `test:e2e`).

## Testes de componente

```sh
cd apps/web && npx vitest run src/features/game/PlayAgainHelps.test.tsx
```

Esperado: verde para visitante, conta e visitante que reabre uma concluída.

## Roteiro manual (visitante e conta)

1. `npm run dev -w @cruzadinha/web` (com a API) e abrir uma cruzada.
2. Usar uma ajuda de letra e uma de palavra e concluir a cruzada.
3. Fechar a janela ("Ver o tabuleiro") e escolher "Jogar de novo".
4. Conferir que os botões mostram `0/<limite>` em "Letra" e "Palavra" e que não há células roxas.
5. Recarregar a página e conferir o mesmo.
6. Repetir com os ajustes em "Sem limite" e com duas abas abertas na mesma cruzada.

## E2E (Chromium)

`npm run test:e2e -w @cruzadinha/web` com o novo spec de "Jogar de novo" e ajudas. Esperado: contadores no limite completo antes e depois de recarregar, nos dois tipos de jogador.
