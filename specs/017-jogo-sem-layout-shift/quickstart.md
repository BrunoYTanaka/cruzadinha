# Quickstart: Tela de jogo sem saltos e dica resolvida mais visível

## Pré-requisitos

- Node.js 24 (`nvm use`), `npm ci` na raiz.
- Para o e2e e a conferência manual: Docker, `cp .env.example .env`, Postgres local com o seed (`npm run db:migrate -w @cruzadinha/api` e `npm run db:seed -w @cruzadinha/api`), a API rodando (`npm run dev -w @cruzadinha/api`) e `npx playwright install chromium` uma vez.

## Testes automáticos

```sh
npm run typecheck
npm run lint
cd apps/web && npx vitest run src/features/game/SaveStatus.test.tsx src/features/game/ClueBar.test.tsx src/features/game/ClueList.test.tsx src/features/game/ClueSheet.test.tsx src/features/game/GamePage.test.tsx src/features/game/GuestGame.test.tsx
cd ../.. && npm test
npm run test:e2e -w @cruzadinha/web
```

Esperado: tudo verde. Para preservar os dados de desenvolvimento, rode o e2e num banco separado, como em `specs/011-calendario-e-tamanho-tabuleiro/quickstart.md`. Os cenários estão em [contracts/ui.md](./contracts/ui.md).

## Conferência manual

Com `npm run dev -w @cruzadinha/web` e a API local:

1. **Faixa parada (US1)**: abra a cruzada de hoje com conta, digite várias letras seguidas. Nenhum "Salvando…" ou "Salvo" aparece e nada na faixa anda. Recarregue: as letras estão lá.
2. **Visitante (US1)**: saia da conta e abra a cruzada. A faixa mostra "Progresso só neste aparelho" e "Entrar para salvar na sua conta" o tempo todo, sem trocar ao digitar.
3. **Sem conexão (US1)**: com conta, ponha o navegador offline nas ferramentas do desenvolvedor e digite uma letra: aparece "Sem conexão, tentando de novo". Volte online: o aviso some, sem "Salvo".
4. **Barra numa linha (US2)**: abra uma cruzada da Cruzada Online com dicas longas (ou estreite a janela até a dica não caber). Ande pelas palavras com Tab: a barra não muda de altura, o tabuleiro não sobe nem desce e a dica longa termina em "…", com "12 Horizontal" inteiro. No celular (ou janela de 360 px), o mesmo com o teclado na tela; e numa janela de 800 px de largura com mouse, onde a barra fica na coluna de dicas, abaixo do tabuleiro.
5. **Dica resolvida (US3)**: acerte uma palavra. A linha da dica na lista ganha fundo verde claro e um visto no fim, com o texto na cor normal e sem risco, nos temas claro e escuro; quando ela é a dica ativa, o fundo é o azul da ativa e o visto continua. A lista não muda de altura. Apague uma letra: o fundo e o visto somem.
