# Quickstart: validar a Administração em abas

## Pré-requisitos

- `nvm use`, `npm ci`, Docker; `.env` a partir de `.env.example`; `docker compose up -d`.
- Conta admin local: `npm run cli -w @cruzadinha/api -- users create --email <e> --admin` (ou `users set-admin`).
- Uma cruzada gerada hoje para a aba "Casa" com conteúdo (sem chave de modelo, use o banco de e2e/seed ou só confira o estado "Sem cruzada hoje.").

## Automático

```sh
npm run lint && npm run typecheck && npm test
npx vitest run src/shared/components/Tabs src/features/admin src/pages/admin src/features/library/components/SourceTabs   # em apps/web
npx vitest run src/sources/generated-settings.test.ts                                                                   # em packages/shared
npm run test:int                                       # inclui admin-generated.int.test.ts (today.difficulty)
npm run test:e2e -w @cruzadinha/web -- admin.spec.ts   # API + Postgres locais, DATABASE_URL de teste
```

Esperado: tudo verde, sem violações do axe nos testes de `AdminPage`, `SourcesAdmin`, `GeneratedSourcesAdmin`, `Tabs`.

## Manual (`npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`)

1. Entrar como admin, abrir `/admin`: um `h1`, abas "Fontes" e "Casa", "Fontes" escolhida. ([contracts/admin-ui.md](./contracts/admin-ui.md))
2. Setas, Home, End nas abas; Tab entra só na escolhida; URL vira `?aba=casa` e Voltar sai de `/admin`.
3. `/admin?aba=casa` abre "Casa"; `/admin?aba=xyz` abre "Fontes".
4. Em "Fontes", desmarcar uma fonte; ir para "Casa", apertar `+`; voltar: as duas alterações continuam.
5. "Casa": Contador desliga em 9 e 15; salvar mostra o aviso ao lado do botão; sem aviso, nenhum vão antes de "Cruzada de hoje".
6. Com cruzada hoje: resumo com Dificuldade da geração (não a configuração alterada), tabelas, zona de perigo; descartar → campo com o comando e "Copiar" funciona.
7. Conta comum e visitante em `/admin?aba=casa`: página não encontrada.
8. Repetir 1, 5 e 6 nos temas claro e escuro e a 390 px: abas numa linha que rola, página sem rolagem lateral; comparar com o mockup (`docs/mockups/design-system.html`, grupo Administração).
9. `/calendario`: abas de fonte iguais a antes.
