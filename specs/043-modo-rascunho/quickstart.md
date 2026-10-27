# Quickstart: validar o modo rascunho

## Pré-requisitos

`nvm use`, `npm ci`, `cp .env.example .env`, `docker compose up -d`, `npm run db:seed -w @cruzadinha/api`, `npm run dev -w @cruzadinha/web`.

## Testes automáticos

```sh
cd apps/web && npx vitest run src/domain/game src/features/offline src/features/game
npm run test:e2e -w @cruzadinha/web -- rascunho sem-saltos
npm run lint && npm run typecheck
```

Esperado: tudo verde; `check:deps` sem violação; axe sem erro na tela de jogo com o lápis ligado.

## Roteiro manual (visitante, depois conta)

1. Abrir a cruzada de hoje. Ligar o lápis (botão fica pressionado) e digitar `A` numa casa vazia → letra em itálico e clara; o cursor avança. (US1-1, SC-001)
2. Digitar outra letra na mesma casa → substitui. Apagar → some. (US1-2, US1-3)
3. Preencher uma palavra inteira só com rascunho certo → pista não riscada, nada concluído. (US1-4, SC-002)
4. Digitar com o lápis numa casa com definitiva → definitiva fica, cursor avança. (US2-3)
5. "Confirmar rascunho" → letras viram normais e a pista risca se a palavra está certa. Repetir e "Descartar rascunho" → somem. (US2, SC-003)
6. Recarregar → rascunho e lápis voltam. (US3-1, SC-004)
7. Revelar letra numa casa com rascunho → a casa mostra a revelada. (US3-4)
8. Concluir a cruzada → modo leitura sem rascunho; DevTools: nenhuma chave `cruzadinha:draft:*` da cruzada. (US3-2, SC-005)
9. Conta: anotar rascunho, sair da conta confirmando → chave `cruzadinha:draft:<userId>:*` apagada; o visitante não vê nada. (FR-017)
10. DevTools > Network durante os passos: o corpo de `PUT /api/progress` nunca traz rascunho. (FR-010)
