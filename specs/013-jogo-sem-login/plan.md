# Implementation Plan: Jogo sem login e cadastro aberto

**Branch**: `feat/013-jogo-sem-login` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-jogo-sem-login/spec.md`

## Summary

Abrir o jogo a visitantes sem conta e trocar o cadastro por convite por um cadastro aberto atrás de uma chave de configuração desligada por padrão.

**Na API**:
- Puzzles e biblioteca passam a aceitar sessão opcional. Sem cookie, a pessoa é visitante. Com cookie inválido, a resposta é 401 e apaga o cookie.
- A biblioteca sem sessão devolve só metadados, sem dado de usuário.
- O cadastro pede só e-mail e senha e é recusado com `403 registration-closed` quando `REGISTRATION_ENABLED` não é `true`. A rota nova `GET /api/auth/registration` diz ao site se o cadastro está aberto.
- O autor cria contas com `users create`, que pede a senha sem eco.
- Todo o código de convites sai.

**No site**:
- Nenhuma rota exige sessão.
- O visitante joga com o progresso, as ajudas, a conclusão e o recorde num store do IndexedDB (`idb`). As regras de salvamento ficam puras em `game-logic/guest-progress.ts`.
- A biblioteca junta os itens da API com os registros locais.
- Login e cadastro mostram "Criar conta" conforme a chave.
- A sessão que termina fora do tabuleiro vira navegação de visitante com aviso.
- O Konami e a janela de convite saem.

A remoção dos dados de convite segue a regra de dois lançamentos: no lançamento A o código para de usar os convites, e no lançamento B uma migração apaga a tabela.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24; navegador moderno (últimas duas versões de Chrome, Firefox, Safari e Edge, todos com IndexedDB)

**Primary Dependencies**: Fastify 5, Drizzle, Zod 4, postgres.js (API); React 19.3, React Router 7, TanStack Query 5 (site). Novas: `idb` ^8.0.4 (dependência do `apps/web`) e `fake-indexeddb` ^6.2.6 (dependência de desenvolvimento do `apps/web`). Versões e APIs confirmadas no Context7 (research, cabeçalho).

**Storage**:
- Postgres: sem mudança de schema no lançamento A. No B, a migração `0004_drop_invites` (data-model §4).
- Navegador: IndexedDB `cruzadinha-visitante` (data-model §1). O `localStorage` continua para tema, tamanhos e, na conta, para a fila de envio e as ajudas.

**Testing**:
- Vitest 5: API em node; site em jsdom com `fake-indexeddb/auto` e um `IDBFactory` novo por teste.
- Integração com Postgres 17 via Testcontainers (`npm run test:int`).
- Playwright: spec nova `visitante.spec.ts`, e `fluxo-principal.spec.ts` sem convite.
- `vitest-axe` nas telas alteradas.

**Target Platform**: o mesmo da feature 012: Cloudflare Pages (site e Function de repasse), Render (API), Neon (Postgres)

**Project Type**: aplicação web em monorepo npm workspaces (`apps/api`, `apps/web`, `packages/shared`)

**Performance Goals**:
- Gravar uma letra do visitante não atrasa a digitação: o IndexedDB é assíncrono e não fica no caminho do reducer (SC-003 da feature 010, 100 ms).
- A biblioteca do visitante lê todos os registros numa só leitura (`getAll`).
- A cruzada de hoje abre em menos de 30 s para quem nunca entrou, com o servidor acordado (SC-001).

**Constraints**:
- A solução nunca vai ao IndexedDB, a logs ou a mensagens.
- Nenhum dado de usuário em resposta sem sessão.
- Compatibilidade com a versão anterior da outra parte (`docs/versionamento.md` §8; research R19).
- `any` proibido; dados do IndexedDB entram como `unknown` e passam por Zod.
- `noindex` mantido (FR-025).

**Scale/Scope**: uso pequeno (dezenas de pessoas), agora sem convite; até 366 cruzadas por visitante. Cerca de 3 rotas da API mudam, 1 é nova e 2 saem. No site, 1 módulo novo (`features/guest`), 1 regra pura nova e 6 telas ou componentes alterados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitution 4.0.0.

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. Os schemas novos (`registrationStatusSchema`, `registerRequestSchema` revisto e o código de erro) ficam em `shared`. O registro do visitante é validado por Zod ao ler (R6). `REGISTRATION_ENABLED` é validada em `config.ts`. Sem `any`. |
| II. Qualidade automatizada | Passa. Sem mudança de ferramentas. Na CI, o job de E2E ganha `REGISTRATION_ENABLED=true`. |
| III. Camadas no back | Passa. A sessão opcional é um `preHandler` (camada HTTP). `createAccount` e o `register` sem convite ficam no serviço de auth. `listPuzzleRows` fica no repositório da biblioteca. A linha de comando chama o serviço. |
| IV. Adaptadores | Não afetado. A busca na fonte continua só pelo `PuzzleSource`. |
| V. Lógica de jogo pura | Passa. `decideGuestSave`, `decideGuestReset` e `mergeGuestLibrary` são puras e testadas. A identidade (visitante ou conta) vem do cache do TanStack Query, sem estado global novo. |
| VI. Segurança e privacidade | Passa, pela emenda 4.0.0. A solução vai a visitantes, mas nunca a erros, logs ou ao IndexedDB. O progresso do visitante não vai ao servidor. Respostas sem sessão não trazem dados de usuário. O cadastro fica atrás da chave, desligada por padrão, e a API recusa mesmo pedidos diretos. Os limites de login e cadastro continuam. As mensagens de autenticação continuam genéricas. A senha do `users create` nunca aparece em argumento, saída ou log. Cookie inválido é apagado. |
| VII. Testes determinísticos | Passa. Cadastro, sessão opcional e `users create` têm testes de integração com Postgres real. O IndexedDB é simulado por `fake-indexeddb`. O E2E usa a cruzada de amostra do seed, sem a fonte real. |
| VIII. Conteúdo de terceiros | Passa. O site é acessível a quem tem o endereço, com `noindex`/`robots.txt` mantidos e sem exportação nem API pública documentada. A atribuição aparece também para o visitante (FR-024). O cache continua só com o necessário. |
| IX. Migração de schema | Passa. O lançamento A não altera o schema. O B remove a tabela por migração Drizzle versionada, gerada com `db:generate`, sem `push`. |

Resultado: sem violações; Complexity Tracking vazio. **Reavaliado após o design** (data-model, contratos): sem mudança. O único ponto sensível é o 409 do cadastro aberto, que confirma e-mail existente. É risco aceito na spec e já existia com convite (R11).

## Riscos e decisões

1. **Dados do visitante podem sumir**: o navegador apaga sob pressão de espaço, e limpar dados ou usar janela anônima também apaga. Isso é aceito pela spec. O site não pede armazenamento persistente (R3).
2. **Cadastro aberto confirma e-mail existente (409)**: risco aceito. É mitigado pelo limite por endereço e pela chave desligada por padrão (R11).
3. **Mais carga na fonte**: visitantes podem buscar dias passados. Continua valendo o limite de 30 buscas por endereço por hora (FR-003). Se a fonte reclamar, a próxima medida é baixar o limite (fora do escopo).
4. **Dois lançamentos**: a tabela `invites` fica sem uso entre A e B. O B é um PR pequeno, só de remoção, e precisa do A já publicado (R15).
5. **Reversão da API com o site novo**: o visitante vê "Entre para ver a biblioteca", e quem tem conta segue normal (R19).
6. **Acervo legível sem limite**: qualquer pessoa pode baixar todas as cruzadas guardadas, com a solução. É risco aceito na spec (Assumptions); se virar problema, a medida é um limite de leitura por endereço numa feature própria.
7. **Cookie inválido**: a resposta 401 apaga o cookie. Não há laço, porque o pedido seguinte já é de visitante (R8).

## Project Structure

### Documentation (this feature)

```text
specs/013-jogo-sem-login/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md              # sessão opcional, registration, register, rotas removidas, CLI
│   └── ui-contracts.md     # rotas, visitante, armazenamento, mensagens, acessibilidade
├── checklists/requirements.md
└── tasks.md                # /speckit-tasks (não criado aqui)
```

### Source Code (repository root)

```text
packages/shared/src/
├── auth/schema.ts                 # registerRequestSchema sem convite obrigatório; registrationStatusSchema
├── api-error.ts                   # + registration-closed (códigos de convite obsoletos até o lançamento B)
├── invites/                       # removido
└── index.ts

apps/api/
├── src/config.ts                  # REGISTRATION_ENABLED → registrationEnabled
├── src/app.ts                     # sem invites; optionalSession nas rotas de puzzle e biblioteca
├── src/modules/auth/
│   ├── session.plugin.ts          # + createOptionalSession; requireSession apaga cookie inválido
│   ├── auth.service.ts            # register sem convite; createAccount
│   ├── auth.routes.ts             # chave no register; GET /api/auth/registration
│   └── auth.schemas.ts            # schema da rota nova; security opcional onde couber
├── src/modules/puzzles/           # routes/schemas: sessão opcional
├── src/modules/library/           # routes/schemas: sessão opcional; service.listPublic; repository.listPuzzleRows
├── src/modules/invites/           # removido
├── src/modules/rate-limit/limits.ts   # sem inviteCreate
├── src/lib/tokens.ts              # sem funções de convite
├── src/cli/run-cli.ts             # users create; sem invites; readSecret injetável
├── src/cli.ts                     # readSecret com readline (eco silenciado) ou stdin
├── src/db/schema.ts               # (lançamento B) sem invites e sem INVITE_CREATE
├── drizzle/0004_drop_invites.sql  # (lançamento B)
└── src/test/                      # register, session, library, puzzles e cli reescritos; invites.int removido

apps/web/
├── package.json                   # + idb, + fake-indexeddb (dev)
├── src/test/setup.ts              # fake-indexeddb/auto + IDBFactory novo por teste
├── src/game-logic/guest-progress.ts   # decideGuestSave, decideGuestReset (puras)
├── src/features/guest/
│   ├── guest-record.ts            # guestProgressRecordSchema (Zod)
│   ├── guest-store.ts             # idb + fallback em memória; get/getAll/save/reset atômicos
│   ├── guest-library.ts           # mergeGuestLibrary (pura)
│   └── guest-save-queue.ts        # mesma interface de SaveQueue, gravando no guest-store
├── src/features/auth/
│   ├── useSession.ts              # sessão → AuthResponse | null; useViewer; logout → '/'
│   ├── useRegistration.ts         # GET /api/auth/registration (erro ⇒ fechado)
│   ├── LoginPage.tsx              # "Jogar sem entrar", "Criar conta" condicional
│   ├── RegisterPage.tsx           # sem convite; estado fechado
│   └── messages.ts                # registration-closed; sem mensagens de convite
├── src/api/auth.ts                # getMe → null em 401; getRegistration
├── src/api/query-keys.ts          # + registration; library(viewerKey)
├── src/app/
│   ├── router.tsx                 # viewerLoader no lugar de requireSessionLoader
│   ├── RequireSession.tsx         # removido (vira viewerLoader)
│   ├── session-handlers.ts        # fora do tabuleiro (só se era conta): vira visitante e mostra o aviso
│   ├── session-ended.ts           # store do aviso "Sua sessão terminou" (como session-expired.ts)
│   └── AppLayout.tsx              # Visitante/Entrar ou e-mail/Sair; aviso de sessão terminada; sem Konami
├── src/features/library/LibraryPage.tsx   # visitante: merge com o guest-store
├── src/features/game/
│   ├── GamePage.tsx               # visitante: lê o guest-store; key por puzzleId + viewer
│   ├── useGame.ts                 # dono (guest | user) escolhe a fila; playAgain local para visitante
│   └── SaveStatus.tsx             # "Salvo neste aparelho" / sem armazenamento
├── src/features/invites/          # removido
├── src/api/invites.ts             # removido
├── public-headers.test.ts         # noindex no _headers e robots.txt (constitution VIII)
├── public/_headers                # comentário: sem divulgação em buscadores
└── e2e/
    ├── visitante.spec.ts          # novo
    ├── fluxo-principal.spec.ts    # cadastro sem convite (API do E2E com a chave ligada)
    └── support.ts                 # sem createInviteCode

.env.example                       # REGISTRATION_ENABLED=false
render.yaml                        # REGISTRATION_ENABLED com sync: false (valor só no painel)
.github/workflows/ci.yml           # job e2e: REGISTRATION_ENABLED=true
docs/design.md, docs/deploy.md, CLAUDE.md   # convites → cadastro com chave, visitante, users create
```

**Structure Decision**: a estrutura existente do monorepo continua. O que é de visitante fica num módulo novo, `apps/web/src/features/guest`, e a regra pura em `game-logic`. Na API não há módulo novo: a sessão opcional entra no plugin de sessão, e a chave entra na configuração e no módulo de auth.

## Ordem de entrega

1. **Lançamento A** (este PR de feature), em fatias com testes:
   1. Shared e API: schemas, chave, cadastro sem convite, rota de registro, sessão opcional, biblioteca pública, `users create`, remoção do código de convites, docs da API.
   2. Site: identidade (`useViewer`, `viewerLoader`, handlers), guest-store e regras, jogo e biblioteca de visitante, login e cadastro, cabeçalho e aviso, remoção do Konami.
   3. E2E, CI, `.env.example`, `render.yaml`, `docs/` e `CLAUDE.md`.
2. **Lançamento B** (PR separado, depois que o A for lançado e publicado): a migração `0004_drop_invites` e a limpeza do R15.

## Complexity Tracking

Sem violações da constitution.
