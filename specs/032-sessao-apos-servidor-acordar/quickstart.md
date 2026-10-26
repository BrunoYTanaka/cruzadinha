# Quickstart: validar a feature 032

Pré-requisitos: Node 24 (`nvm use`), `npm ci`.

## Testes automáticos

```sh
cd apps/web
npx vitest run src/api/server-wake.test.ts src/app/viewer.test.tsx src/app/router.test.tsx
npm run test:e2e -w @cruzadinha/web -- espera-servidor   # exige API e Postgres locais (ver CLAUDE.md)
```

Esperado: nenhum teste vê a tela "Algo deu errado"; `GET /api/auth/me` só sai depois de `GET /api/health` responder 200.

## Manual (simulação do issue #63)

1. `npm run dev -w @cruzadinha/web`; no DevTools (ou `page.route`), faça `/api/health` responder 503 nas 3 primeiras vezes e depois 200 `{"status":"ok","database":"up"}`, e `/api/auth/me` responder 503 até a saúde dar 200 e 401 depois.
2. Abra `/` numa janela sem sessão.
3. Esperado: cabeçalho só `Cruzadinha` com "Carregando…" e depois "Acordando o servidor"; ao ficar pronto, calendário e "Visitante | Entrar" juntos, sem tela de erro.
4. Com a API respondendo na hora, `/` abre direto no calendário, sem mensagem de espera.

## Produção (depois do deploy)

Com o Render dormindo, abrir o site e anotar o que o proxy devolve para `/api/auth/me` (item 3 da pesquisa).
