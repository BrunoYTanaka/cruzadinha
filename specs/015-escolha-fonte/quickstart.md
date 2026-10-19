# Quickstart: Escolha da fonte mais visível

Guia para conferir a feature 015 de ponta a ponta. Regras em [data-model.md](./data-model.md) e telas em [contracts/ui.md](./contracts/ui.md).

## Pré-requisitos

- Node.js 24 (`nvm use`), `npm ci`, Docker para o ambiente local.
- `cp .env.example .env`, `docker compose up -d`, `npm run db:seed -w @cruzadinha/api` (grava um puzzle de exemplo de hoje para cada fonte, feature 014).
- `npm run dev -w @cruzadinha/web` e abrir `http://localhost:5173/`.

## Testes automáticos

```sh
npm run lint && npm run typecheck && npm test
cd apps/web && npx vitest run src/features/library src/features/game
npm run test:e2e -w @cruzadinha/web   # API e Postgres locais com seed (ver CLAUDE.md)
```

Esperado: tudo verde, incluindo `vitest-axe` em `LibraryPage`, `SourceTabs`, `TodayCard` e `CompletionDialog`.

## Roteiro manual

1. **Cartões de hoje** (história 1): abrir `/` como visitante. Esperado: `h1` "Hoje" e dois cartões, "O Globo" e "Cruzada Online", ambos "Não iniciada · Jogar". Clicar no da Cruzada Online abre o jogo dela.
2. **Estados**: digitar algumas letras na Cruzada Online e voltar. Esperado: cartão "◐ Em jogo · mm:ss · Continuar"; o do O Globo continua "Jogar".
3. **Abas** (história 2): clicar na aba "Cruzada Online". Esperado: o mês continua o mesmo, os dias mudam para a Cruzada Online e a aba mostra "0 concluídas". Recarregar a página: a aba continua escolhida.
4. **Teclado**: Tab até as abas, setas trocam de aba e de calendário, Home/End vão às pontas; um único ponto de parada do Tab nas abas.
5. **Falha de uma fonte**: no DevTools, bloquear `/api/library?source=cruzadaonline` e recarregar. Esperado: o cartão da Cruzada Online mostra "Tentar de novo", o do O Globo e o calendário do O Globo funcionam.
6. **Jogo e conclusão** (história 3): abrir o puzzle do O Globo de hoje. Esperado: "O Globo" antes da data no topo. Concluir o puzzle. Esperado: o diálogo mostra "Também há cruzada deste dia em Cruzada Online." e "Jogar Cruzada Online deste dia", que abre o puzzle dela. Concluir também a da Cruzada Online e reabrir a do O Globo em "jogar de novo" até concluir: o atalho não aparece.
7. **Celular e primeira tela**: DevTools em 360 x 640. Esperado: cartões empilhados e visíveis sem rolar, abas dividindo a largura numa linha, sem rolagem horizontal da página; em 1280 x 800, cartões e abas visíveis sem rolar; repetir no tema escuro.
8. **Preferência antiga**: no console, `localStorage.setItem('cruzadinha:source', 'fonte-retirada')` e recarregar. Esperado: abre na aba O Globo, sem erro.
