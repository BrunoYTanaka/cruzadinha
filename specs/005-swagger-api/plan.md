# Implementation Plan: Documentação interativa da API (Swagger)

**Branch**: `feat/005-swagger-api` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-swagger-api/spec.md`

## Summary

A API ganha uma página Swagger UI em `/api/docs/` e o documento OpenAPI 3.1.0 em `/api/docs/json` e `/api/docs/yaml`. As peças:

- **Geração**: `@fastify/swagger` 9.9 em modo dinâmico monta o documento a partir do `schema` de cada rota, e `@fastify/swagger-ui` 6.1 serve a página com os arquivos empacotados, sem CDN.
- **Schemas das rotas**: cada rota passa a declarar um `schema` com tag, resumo, corpo, respostas e exigência de sessão. O JSON Schema é gerado dos mesmos schemas Zod do `shared` por `z.toJSONSchema` (modo `output`), então documentação e validação não divergem.
- **Comportamento**: `buildApp` troca os compiladores de validação e serialização do Fastify por versões neutras. Os `schema` das rotas só documentam, e a validação continua nos `safeParse` atuais, com a mesma ordem, os mesmos status e as mesmas mensagens do contrato da feature 004.
- **Sessão**: a página fica na mesma origem da API (direto ou pelo proxy do Vite), então um login executado nela deixa o cookie `sid` valendo para as rotas protegidas seguintes.
- **Produção**: o plugin de documentação só é registrado quando `NODE_ENV` não é `production`. Em produção, `/api/docs*` dá 404 e os módulos do Swagger nem são carregados.

Os testes unitários garantem:

- toda rota `/api/*` documentada e presente no documento;
- documento válido no OpenAPI 3.1 (`@apidevtools/swagger-parser`, sem rede);
- 404 em produção;
- nenhum segredo ou credencial do `.env.example` no documento.

## Technical Context

**Language/Version**: TypeScript 6.0 (`strict`) em Node.js 24 LTS

**Primary Dependencies**: Fastify 5.12 e Zod 4.6, já instalados (`z.toJSONSchema` é nativo do Zod 4). As novas, conferidas nos READMEs e no código dos pacotes e depois no Context7 (ver [research.md](./research.md)):

- dependências da API: `@fastify/swagger` 9.9, `@fastify/swagger-ui` 6.1 e `fastify-plugin` 6.0 (hoje só transitiva; o plugin de documentação precisa dela para não ficar encapsulado, research R7);
- desenvolvimento da API: `@apidevtools/swagger-parser` 13.1.

**Storage**: N/A. Nenhuma tabela ou migração; o documento é montado em memória na subida.

**Testing**:

- Vitest 5 unitário (`npm test`), com `app.inject()` e o banco que nunca conecta de `app.test.ts`. Cobre validação do documento, cobertura das rotas, desligamento em produção e ausência de segredos.
- A não regressão das rotas fica com os testes unitários existentes e os de integração (`npm run test:int`), que não mudam.

**Target Platform**: Servidor Linux em container (Render), mais desenvolvimento local com `tsx watch` e o proxy do Vite.

**Project Type**: Web service. Só `apps/api` muda; `packages/shared` e `apps/web` não mudam.

**Performance Goals**: A página e o documento carregam em menos de 1 s localmente. O documento é gerado uma vez no `ready()` e depois servido do cache do plugin.

**Constraints**:

- Nenhuma mudança de comportamento nas 7 rotas existentes.
- Nada de recursos de terceiros na página.
- Documentação nunca registrada em produção.
- Exemplos só com valores fictícios.

**Scale/Scope**: 7 operações em 3 grupos. As próximas features documentam as próprias rotas por força do teste de cobertura.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação | Como |
|---|---|---|
| I. TypeScript estrito | ✅ | Nenhum `any`. Os schemas de documentação são `FastifySchema`. O JSON Schema sai dos schemas Zod do `shared`, a única fonte dos contratos. |
| II. Qualidade automatizada | ✅ | Testes novos no `npm test`, que roda no pré-push e na CI. O lint e o typecheck cobrem os arquivos novos. Sem job novo na CI. |
| III. Camadas | ✅ | O `schema` de cada rota fica num arquivo `<módulo>.schemas.ts` ao lado da rota. Só metadados; nada de regra de negócio, e o serviço continua sem conhecer HTTP. |
| IV. Adaptadores | ✅ N/A | A fonte de puzzles não muda. |
| V. Lógica de jogo | ✅ N/A | — |
| VI. Segurança e privacidade | ✅ | Documentação desligada em produção (FR-009). Exemplos fictícios. As respostas documentadas não têm senha nem hash. Um teste procura no documento as credenciais do `.env.example`. Cookie e limites de tentativas não mudam. |
| VII. Testes sem internet | ✅ | O validador usa os schemas OpenAPI empacotados, e o documento não tem `$ref` externo. Os testes não usam banco. |
| VIII. Uso privado | ✅ | A página nunca existe no site publicado. |
| IX. Migrações | ✅ N/A | Sem mudança de schema. |
| Fluxo: Context7 | ✅ | Conferido no Context7 em 2026-10-13, depois da pesquisa inicial pelos READMEs ([research.md](./research.md), "Conferência no Context7"). |

Re-check pós-design: os artefatos da fase 1 ([data-model.md](./data-model.md), [contracts/api-docs.md](./contracts/api-docs.md), [quickstart.md](./quickstart.md)) mantêm a tabela acima, sem violações novas.

## Project Structure

### Documentation (this feature)

```text
specs/005-swagger-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-docs.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/
├── package.json                      # + @fastify/swagger, @fastify/swagger-ui; dev: @apidevtools/swagger-parser
└── src/
    ├── app.ts                        # compiladores neutros; registra docs (fora de produção) antes das rotas
    ├── docs/
    │   ├── docs.plugin.ts            # registra @fastify/swagger (OpenAPI 3.1, tags, securityScheme `session`) e a UI em /api/docs
    │   ├── doc-schema.ts             # toDocSchema (z.toJSONSchema output sem $schema), respostas de erro e cabeçalhos comuns
    │   ├── doc-schema.test.ts        # limites e formatos gerados, sem $schema, withFieldDescription
    │   └── docs.test.ts              # documento válido, cobertura das rotas, 404 em produção, sem segredos
    └── modules/
        ├── health/health.schemas.ts  # schema de GET /api/health
        ├── auth/auth.schemas.ts      # schemas de register, login, logout, me (com exemplos)
        └── invites/invites.schemas.ts
```

Também mudam:

- `health.routes.ts`, `auth.routes.ts` e `invites.routes.ts` passam a usar `{ schema }`;
- `CLAUDE.md` ganha uma linha em Commands com o caminho da página e do documento (FR-014).

**Structure Decision**: Tudo fica em `apps/api`, com os schemas de documentação ao lado de cada módulo e a infraestrutura em `src/docs/`. O `shared` não muda: a `description` do e-mail (research R4) e os exemplos ficam na camada de documentação da API.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Compiladores de validação e serialização neutros na app inteira | Os `schema` das rotas são necessários para o modo dinâmico do `@fastify/swagger`, mas o Ajv e o fast-json-stringify mudariam a ordem das verificações, o formato do 400 e o corpo das respostas. | Deixar o Fastify validar com o schema quebraria o contrato da feature 004. Documentar fora das rotas (mapa no `transform`) separaria a descrição da rota e enfraqueceria a garantia de cobertura (research R3). |
