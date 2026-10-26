# Quickstart: validar as correções

Pré-requisitos: Node.js 24, Docker (testes de integração), `npm ci`.

1. **Unitários e qualidade**: `npm run format:check && npm run lint && npm run typecheck && npm test`.
2. **Corrida do login (US1)**: `cd apps/api && npx vitest run --config vitest.int.config.ts src/test/login-race.int.test.ts`. Esperado: com limite 5, 10 logins errados simultâneos resultam em exatamente 5 `invalid-credentials` e 5 `too-many-attempts`; um login certo depois de erros zera a contagem do e-mail.
3. **`PROXY_SECRET` (US2)**: `npx vitest run src/config.test.ts`. À mão: `NODE_ENV=production DATABASE_URL=postgres://u:p@h/d node apps/api/dist/server.mjs` termina com `PROXY_SECRET: obrigatório em produção`. `docker compose up -d` continua subindo a API.
4. **Sessões (US3)**: `npx vitest run --config vitest.int.config.ts src/test/sessions-cleanup.int.test.ts`; à mão, `npm run cli -w @cruzadinha/api -- puzzles collect` imprime `Sessões apagadas: N.`.
5. **Sandbox (US4)**: `npx vitest run src/sources/clube/sandbox.test.ts`.
6. **Convites (US5)**: `npm run test:int` aplica `0008` num banco com dados de `0007`; `conventions.int.test.ts` e `seed.int.test.ts` passam sem `invites`. Antes de mesclar: `curl https://<endereço em docs/deploy.md>/version.json` mostra uma versão do site posterior à feature 013, e o painel do Render tem `PROXY_SECRET` preenchido. Um cadastro com `inviteCode` agora dá 400 (aceito).
7. **Itens 6 a 8**: `npx vitest run src/modules/progress src/sources`.
8. **E2E**: `npm run test:e2e -w @cruzadinha/web` (o `TRUNCATE` sem `invites` precisa passar).
