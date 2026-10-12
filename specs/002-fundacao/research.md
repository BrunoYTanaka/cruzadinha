# Research: Fundação do projeto

Documentação consultada via Context7 e versões conferidas no registro do npm em 2026-10-12. As versões abaixo são as fixadas no plano; o `package-lock.json` registra as exatas.

## Decisões

### 1. Ambiente de execução: Node.js 24 LTS
- **Decision**: Node 24 (LTS), declarado em `.nvmrc` e em `engines` (`>=24`) no `package.json` da raiz. A CI lê o `.nvmrc`. Sem `engine-strict`: versão diferente gera aviso do npm (`EBADENGINE`), não erro (FR-016).
- **Rationale**: o Node 22 da máquina do autor (22.23) sai de suporte em abril de 2027, poucos meses depois de o projeto começar; o 24 tem suporte até 2028. Todas as ferramentas escolhidas aceitam o 24 (Vitest 5: `^22.12 || ^24`; lint-staged 17: `>=22.22.1`; tsdown: `^24.11`).
- **Alternatives considered**: Node 22 (já instalado, mas a migração viria logo); Node 26 (vira LTS só no fim de outubro de 2026, e a imagem do Render e o setup-node podem demorar a acompanhar).

### 2. Monorepo: npm workspaces
- **Decision**: npm workspaces com `apps/*` e `packages/*`; pacotes `@cruzadinha/api`, `@cruzadinha/web` e `@cruzadinha/shared`, todos `private`. O `shared` é referenciado como `"@cruzadinha/shared": "*"` nas dependências do `api` e do `web`.
- **Rationale**: exigido pela constitution (princípio I) e pelo design; sem ferramenta extra de monorepo.
- **Alternatives considered**: pnpm, Turborepo, Nx (fora da stack definida e sem ganho em 3 pacotes).

### 3. Como o código compartilhado é consumido
- **Decision**: `packages/shared` não tem etapa de build. O `package.json` dele exporta o código-fonte TypeScript (`exports: { ".": "./src/index.ts" }`). O site o consome pelo Vite; o servidor, pelo `tsx` em desenvolvimento e testes, e pelo **tsdown** no build, que embute o `shared` no bundle (`deps.alwaysBundle: ['@cruzadinha/shared']`) e deixa as dependências do npm externas.
- **Rationale**: mudanças no `shared` aparecem na hora nos dois lados, sem `watch` nem build ordenado; a checagem de tipos de cada parte lê o fonte do `shared` e detecta mudanças incompatíveis (FR-002). O bundle do servidor vira um único arquivo para a imagem de container (FR-015).
- **Alternatives considered**: project references com `tsc -b` e `dist/` no `shared` (exige build antes de qualquer teste e condições de export diferentes para Vite, tsx e Node); type stripping nativo do Node (ainda não remove tipos de pacotes resolvidos via `node_modules` de forma confiável, e exige extensões `.ts` nos imports).

### 4. TypeScript 6.0
- **Decision**: TypeScript 6.0.x. `tsconfig.base.json` na raiz com `strict: true`, `module: "preserve"`, `moduleResolution: "bundler"`, `target: "es2024"`, `verbatimModuleSyntax`, `isolatedModules`, `noUncheckedIndexedAccess`, `skipLibCheck`, `noEmit`. Cada parte estende a base e define `types` e `lib` (o 6.0 deixa `types` vazio por padrão). Checagem por `tsc --noEmit` em cada workspace.
- **Rationale**: o `typescript-eslint` 8.71 aceita `typescript >=4.8.4 <6.1.0`, então o TypeScript 7 (versão nativa) ainda não pode ser usado. Com `bundler`, os imports dispensam extensão, o que combina com Vite, tsx e tsdown. A documentação do 6.0 confirma que as opções antigas (`moduleResolution: node`, `target: es5`) estão obsoletas, e nenhuma é usada.
- **Alternatives considered**: TypeScript 7.0 (incompatível com o typescript-eslint hoje; reavaliar quando o suporte chegar); TypeScript 5.9 (sem motivo para ficar numa versão anterior).

### 5. ESLint 10 com flat config (revisto na implementação)
- **Decision**: ESLint 9.39.x e `@eslint/js` 9.39.x, com `typescript-eslint` 8.71 (`recommended`, sem type-checked), `eslint-config-prettier` 10 por último, `globals` 17. No site, também `eslint-plugin-react-hooks` 7 (`configs.flat.recommended`) e `eslint-plugin-jsx-a11y` 6.10 (`flatConfigs.recommended`). Um único `eslint.config.mjs` na raiz, com blocos por caminho (`apps/web/**` recebe as regras de React e acessibilidade). A regra `@typescript-eslint/no-explicit-any` fica explícita como `error` (ela já vem no `recommended`, mas fica declarada para não depender do preset); o `any` implícito é barrado pelo `noImplicitAny` do `strict`. As regras `no-unsafe-*`, que exigem análise com tipos, ficam desligadas por decisão do autor (clarificação de 2026-10-12).
- **Rationale**: o `eslint-plugin-jsx-a11y` 6.10.2, exigido pela constitution (princípio II), declara `eslint ^3 … ^9` e não recebe versão desde 2024; com ESLint 10, o `npm ci` falharia na resolução de peers. O ESLint 9 ainda está na linha `maintenance`. Um único arquivo de configuração é mais simples que um por pacote e já dá a "base comum + regras extras no site" (FR-005). A documentação do typescript-eslint indica o `eslint-config-prettier` no fim da lista, para desligar regras de formatação.
- **Alternatives considered**: ESLint 10 com `overrides` de peer no npm (o plugin usa APIs de `context` removidas no 10); ESLint 10 com o fork `eslint-plugin-jsx-a11y-x` 0.2 (jovem demais e diferente do que a constitution nomeia). Reavaliar quando o `jsx-a11y` aceitar o ESLint 10.

- **Revisão na implementação (2026-10-12)**: ao instalar, o npm marcou o ESLint 9.39.5 como "no longer supported", então a premissa da linha de manutenção caiu. O `jsx-a11y` 6.10.2 não usa nenhuma das APIs de `context` removidas no ESLint 10 (verificado no código do pacote), e as regras dele funcionam no 10 (`jsx-a11y/alt-text` reporta `<img>` sem `alt`). Decisão final: **ESLint 10.12 e `@eslint/js` 10**, com `"overrides": { "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }` no `package.json` da raiz para aceitar o peer. Remover o override quando o `jsx-a11y` declarar suporte ao 10.

### 6. Prettier
- **Decision**: Prettier 3.9, com `.prettierrc.json` na raiz seguindo o `CLAUDE.md` (`semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`) e `.prettierignore` para `dist/`, `coverage/`, `package-lock.json`, `.specify/`, `.claude/`, `specs/` e `CLAUDE.md`. Esses Markdown continuam versionados e só ficam fora da formatação, para que o `format:check` não falhe em arquivos do Spec Kit nem gere commits de reformatação. `.editorconfig` alinhado com essas opções.
- **Rationale**: convenção já decidida (FR-005).

### 7. Hooks locais: Husky 9 + lint-staged 17
- **Decision**: `"prepare": "husky"` na raiz, que ativa os hooks no `npm install` ou `npm ci` (FR-009). `.husky/pre-commit` roda `npx lint-staged`; `.husky/pre-push` roda `npm run typecheck && npm test`. Configuração do lint-staged na raiz: `*.{ts,tsx,js,mjs}` → `eslint --fix` e depois `prettier --write` (em sequência, pela sintaxe de lista); `!(*.{ts,tsx,js,mjs})` → `prettier --write --ignore-unknown`. Na CI, `HUSKY=0`.
- **Rationale**: a documentação do lint-staged recomenda a negação de padrão com lista para evitar que ESLint e Prettier editem o mesmo arquivo ao mesmo tempo; a do Husky recomenda `HUSKY=0` em CI. Uma alteração só de documentação passa apenas pelo Prettier (edge case da spec).
- **Alternatives considered**: um arquivo de lint-staged por pacote (o lint-staged não mescla configurações, e o ESLint já é único na raiz).

### 8. Testes: Vitest 5
- **Decision**: Vitest 5.0 em cada workspace, com `vitest.config.ts` próprio (`api` e `shared` em ambiente `node`; `web` em `jsdom` com Testing Library 16 e `@testing-library/jest-dom`). O `npm test` da raiz roda `npm run test --workspaces --if-present`. Convenção de nomes para depois: `*.test.ts(x)` são unitários e rodam no pré-push; testes de integração com Postgres (feature 004) usam `*.int.test.ts` e um script separado.
- **Rationale**: segue os scripts da raiz que o design pede (`--workspaces --if-present`, FR-004). A documentação do Vitest 5 avisa que um config referenciado que declara `projects` vira um contêiner, então cada pacote tem config próprio, sem `projects` na raiz.
- **Alternatives considered**: `test.projects` na raiz (bom para um relatório único, mas duplica o que os scripts de workspace já fazem).

### 9. Servidor mínimo: Fastify 5 + Zod 4 + Postgres.js
- **Decision**: Fastify 5.12 com uma função `buildApp(deps)` que cria o app sem escutar porta, testada com `app.inject()`. Configuração validada com Zod 4.6 (`z.object(...).safeParse(process.env)`), mensagem de erro com o caminho de cada issue e nunca o valor recebido. Verificação do banco com Postgres.js 3.4 (`postgres(url, { max: 1, connect_timeout: 2 })` e `` sql`select 1` ``), atrás de uma interface `DatabaseProbe` para os testes não precisarem de banco.
- **Rationale**: stack da constitution. A documentação do Fastify recomenda o padrão de fábrica com `inject` para testes sem rede. O Postgres.js tem tipos próprios e é suportado pelo Drizzle (`drizzle-orm/postgres-js`), que chega na feature 004.
- **Alternatives considered**: `pg` (node-postgres; também suportado, mas exige `@types/pg` e mais configuração de pool); conectar ao banco já com Drizzle (sem schema ainda; adianta a 004, o que a clarificação descartou).

### 10. Site mínimo: React 19 + Vite 8 + TanStack Query 5
- **Decision**: React 19.3, Vite 8.3 com `@vitejs/plugin-react` 6, TanStack Query 5 para buscar `/api/health`. O proxy do Vite repassa `/api` para `API_PROXY_TARGET` (padrão `http://localhost:3000`), sem reescrever o caminho, porque a API já expõe as rotas com o prefixo `/api`.
- **Rationale**: a constitution (princípio V) exige TanStack Query para estado de servidor, então até a página mínima já o usa. A documentação do Vite 8 confirma `server.proxy` com `target` e `changeOrigin`.
- **Alternatives considered**: `fetch` direto com `useEffect` (contraria o princípio V).

### 11. Ambiente local: Docker Compose
- **Decision**: `docker-compose.yml` na raiz com `db` (`postgres:17-alpine`, `healthcheck` com `pg_isready`, volume nomeado) e `api` (imagem do `apps/api/Dockerfile`, `depends_on` com `condition: service_healthy`). Portas por variável (`DB_PORT`, padrão 5432; `API_PORT`, padrão 3000). O site roda fora do Compose, com `npm run dev -w @cruzadinha/web`.
- **Rationale**: design §9. Postgres 17 é a versão padrão do Neon. O Docker não está instalado na máquina do autor hoje: é pré-requisito da história 4 e do job de imagem na CI.
- **Alternatives considered**: Postgres instalado na máquina (foge da portabilidade e do design).

### 12. Imagem do servidor
- **Decision**: `apps/api/Dockerfile` multi-stage com contexto na raiz: estágio `build` (`npm ci --ignore-scripts`, `npm run build -w @cruzadinha/api`) e estágio final `node:24-alpine` com só as dependências de produção do `api` (`npm ci --omit=dev --ignore-scripts -w @cruzadinha/api`; o `--ignore-scripts` evita que o `prepare` chame o `husky`, ausente sem as dev dependencies, como alerta a documentação do Husky), o bundle e usuário não-root. Configuração só por variáveis de ambiente. `.dockerignore` exclui `node_modules`, `.git`, `.env*` (menos `.env.example`) e `specs/`.
- **Rationale**: FR-015 e a portabilidade da constitution.

### 13. Verificação automática: GitHub Actions
- **Decision**: `.github/workflows/ci.yml` em `push` (todas as branches) e `pull_request`, `HUSKY=0`. Job `quality`: `actions/checkout@v7`, `actions/setup-node@v7` (`node-version-file: .nvmrc`, `cache: npm`), `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Job `image`: `docker build -f apps/api/Dockerfile .`. Ambos com `timeout-minutes: 10` (SC-004).
- **Rationale**: princípio II e FR-010; `npm ci` falha se o `package-lock.json` não bater com o `package.json` (cenário 3 da história 2). A documentação do setup-node indica as versões atuais das actions e o cache de npm. O job de imagem impede que o Dockerfile apodreça até a implantação.

### 14. Configuração e segredos
- **Decision**: variáveis do servidor: `NODE_ENV` (`development` | `test` | `production`, padrão `development`), `HOST` (padrão `0.0.0.0`), `PORT` (padrão `3000`), `LOG_LEVEL` (padrão `info`) e `DATABASE_URL` (obrigatória, `postgres://` ou `postgresql://`). `.env.example` na raiz com valores fictícios; o `.gitignore` atual já ignora `.env` e `.env.*` e mantém `.env.example`. O servidor carrega `.env` em desenvolvimento com `process.loadEnvFile()` do Node, sem biblioteca.
- **Rationale**: FR-013, FR-014 e princípio VI.

## Pendências para a implementação

A constitution exige consultar o Context7 antes de escrever o código de cada biblioteca. Nesta fase foram consultados typescript-eslint, ESLint, Vitest, Husky, lint-staged, Vite, Fastify, Zod, Postgres.js, tsdown, TypeScript, setup-node e react-hooks. As tarefas devem repetir a consulta para o que só teve a versão conferida: TanStack Query, Testing Library, jsx-a11y, Prettier e a sintaxe do Docker Compose.
