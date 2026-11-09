# Quickstart: conferir a feature

Pré-requisitos: `nvm use`, `npm ci`, `cp .env.example .env`, `docker compose up -d`, `npm run db:seed -w @cruzadinha/api`.

1. Verde geral por fatia: `npm run lint && npm run typecheck && npm test`.
2. Site local: `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`; entrar com a conta do seed.
3. Conferir cada tela da aba **Telas** de `docs/mockups/design-system.html` no site, nos dois temas e em 390, 768 e 1280 px.
4. Teclado: Tab por todas as telas alteradas (anel de foco visível); Administração: Espaço pega, setas movem, Espaço solta, Esc cancela.
5. Toque (emulação de celular): arrastar pela alça sem rolar a página.
6. Regressão: `npm run test:e2e -w @cruzadinha/web` (inclui `sem-saltos.spec.ts`); landing e tabuleiro sem diferença.
7. Movimento reduzido: ativar nas preferências e conferir que `Link` e arraste não animam.
