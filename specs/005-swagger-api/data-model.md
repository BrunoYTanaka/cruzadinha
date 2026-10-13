# Data Model: Documentação interativa da API (Swagger)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Esta feature não cria tabelas nem migrações (constitution, IX: nada a migrar). As entidades abaixo existem só em memória: são montadas na subida da API, a partir das rotas registradas, e servidas como JSON/YAML.

## Descrição da API (documento OpenAPI 3.1.0)

Gerada por `app.swagger()` depois do `ready()`. Não é guardada em arquivo nem versionada.

| Campo | Valor | Origem |
|---|---|---|
| `openapi` | `3.1.0` | opção do plugin (research R2) |
| `info.title` | `Cruzadinha API` | opção do plugin |
| `info.version` | `version` do `apps/api/package.json` (campo criado nesta feature com `0.0.0`; antes não existia) | lido na subida e passado explicitamente, porque o plugin não o lê quando `info` é informado |
| `info.description` | Texto curto: uso privado, sessão por cookie, limites de tentativas valem para a página | opção do plugin |
| `tags` | `health`, `auth`, `invites`, cada uma com descrição em português | opção do plugin |
| `components.securitySchemes.session` | `{ type: 'apiKey', in: 'cookie', name: 'sid' }` | opção do plugin (research R5) |
| `paths` | Uma entrada por operação pública (ver abaixo) | `schema` de cada rota |

Regras:

- Não há `servers`: a página usa a própria origem (FR-008).
- O documento não tem `$ref` externo. Os schemas ficam embutidos em cada operação.
- Nenhum valor real de segredo, sessão, código de convite ou credencial do `.env` aparece (FR-006, SC-006).

## Operação

Uma rota Fastify com `schema` de documentação. Os campos são as chaves aceitas pelo `@fastify/swagger` no `schema` da rota.

| Campo do `schema` | Obrigatório | Regra |
|---|---|---|
| `tags` | sim | Exatamente uma tag, entre `health`, `auth` e `invites` |
| `summary` | sim | Frase curta em português |
| `description` | não | Detalhes: ordem das verificações e o que conta no limite |
| `security` | só nas rotas com `requireSession` | `[{ session: [] }]` |
| `body` | quando a rota lê corpo | `toDocSchema(<schema Zod do shared>)` + `examples` com valores fictícios |
| `response` | sim | Um item por status possível, com `description`. Corpo de erro = `toDocSchema(apiErrorSchema)`; 204 = `type: 'null'` |
| `response[*].headers` | quando se aplica | `Set-Cookie` (abre, renova ou apaga a sessão) e `Retry-After` (429) |

`toDocSchema` é o helper da camada de documentação: `z.toJSONSchema(schema, { io: 'output' })` sem a chave `$schema` (research R3, R4).

Regras de consistência, verificadas por teste:

- Toda rota `/api/*` registrada fora de `/api/docs` tem `tags`, `summary` e `response` (FR-012).
- O conjunto de pares método + caminho em `paths` é igual ao das rotas `/api/*` registradas fora de `/api/docs` (SC-001).
- O corpo documentado de cada rota é o JSON Schema do mesmo schema Zod que a rota usa no `safeParse` (FR-003).

## Catálogo de operações

| Método e caminho | Tag | Sessão | Corpo (schema do `shared`) | Respostas |
|---|---|---|---|---|
| `GET /api/health` | `health` | não | — | 200 `healthStatusSchema`; 500 |
| `POST /api/auth/register` | `auth` | não | `registerRequestSchema` | 201 `authResponseSchema` + `Set-Cookie`; 400 `invalid-input` / `invalid-invite`; 409 `registration-failed`; 429 + `Retry-After`; 503; 500 |
| `POST /api/auth/login` | `auth` | não | `loginRequestSchema` | 200 `authResponseSchema` + `Set-Cookie`; 400 `invalid-input`; 401 `invalid-credentials`; 429 + `Retry-After`; 503; 500 |
| `POST /api/auth/logout` | `auth` | não (idempotente) | — | 204 + `Set-Cookie` expirado; 503; 500 |
| `GET /api/auth/me` | `auth` | sim | — | 200 `authResponseSchema` (+ `Set-Cookie` se renovou); 401 `unauthenticated`; 503; 500 |
| `POST /api/invites` | `invites` | sim | — | 201 `createdInviteSchema`; 401; 409 `invite-quota-reached`; 429 + `Retry-After`; 503; 500 |
| `GET /api/invites` | `invites` | sim | — | 200 `inviteListSchema`; 401; 503; 500 |

Os códigos e mensagens dos erros são os do contrato da feature 004 (`specs/004-banco-auth-convites/contracts/http-api.md`). Esta feature só os descreve, sem mudar nenhum.
