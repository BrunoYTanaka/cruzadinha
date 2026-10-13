# Quickstart: validar a documentação da API

**Feature**: [spec.md](./spec.md) | **Contrato**: [contracts/api-docs.md](./contracts/api-docs.md)

## Pré-requisitos

- Node.js 24 (`nvm use`), `npm ci` na raiz.
- Docker, para o Postgres local.
- `.env` copiado de `.env.example` (`NODE_ENV=development` e a conta de seed fictícia).

A API do `docker compose` roda a imagem de produção (`NODE_ENV=production`), então lá a documentação fica desligada de propósito. Para ver a documentação, rode a API com `npm run dev`.

## 1. Testes automáticos (sem rede nem banco)

```sh
cd apps/api && npx vitest run src/docs
npm test
```

Esperado:

- O documento é válido como OpenAPI 3.1.0.
- Toda rota `/api/*` tem documentação e aparece no documento.
- Em produção, `/api/docs/`, `/api/docs/json` e `/api/docs/yaml` dão 404.
- O documento não contém as credenciais do `.env.example` nem segredos.
- Os testes existentes de rotas continuam passando.

Para a não regressão do comportamento das rotas:

```sh
npm run test:int
```

## 2. Página interativa (história 1)

```sh
docker compose up -d db
npm run db:migrate -w @cruzadinha/api
npm run db:seed -w @cruzadinha/api
npm run dev -w @cruzadinha/api
```

Abra `http://localhost:3000/api/docs/`.

Esperado:

- Três grupos (`health`, `auth`, `invites`) e sete operações.
- Em "POST /api/auth/register": campos com limites (senha de 8 a 128) e exemplo com `ana@example.com`.
- "GET /api/health" → "Try it out" → "Execute" mostra `200` e `{ "status": "ok", "database": "up" }`.
- Executar o login com e-mail `invalido` mostra `400` com `"error": "invalid-input"` e `"fields": ["email"]`.

## 3. Sessão pela página (história 2)

Na mesma página:

1. Execute `POST /api/auth/login` com as credenciais de seed do seu `.env` → `200`.
2. Execute `GET /api/auth/me` → `200` com o e-mail da conta, sem colar cookie.
3. Execute `POST /api/invites` e depois `GET /api/invites` → `201` com código e `200` com a lista.
4. Execute `POST /api/auth/logout` → `204`. Depois `GET /api/auth/me` → `401 unauthenticated`.

O percurso deve levar menos de 3 minutos (SC-002).

Repita pelo proxy do Vite (`npm run dev -w @cruzadinha/web`, depois `http://localhost:5173/api/docs/`) para conferir que a sessão também funciona por ali.

## 4. Documento para ferramentas (história 3)

```sh
curl -s localhost:3000/api/docs/json | head -c 300
curl -s localhost:3000/api/docs/yaml | head -n 5
```

Importe `http://localhost:3000/api/docs/json` no Postman ou no Insomnia. Devem aparecer as mesmas sete operações.

## 5. Produção desligada (FR-009)

```sh
docker compose up -d --build
curl -si localhost:3000/api/docs/ | head -n 1        # HTTP/1.1 404
curl -si localhost:3000/api/docs/json | head -n 1    # HTTP/1.1 404
curl -s localhost:3000/api/health                    # continua 200
```
