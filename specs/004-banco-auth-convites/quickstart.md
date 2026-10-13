# Quickstart: Banco de dados, autenticação e convites

Roteiro para validar a feature de ponta a ponta. Os detalhes de corpos, códigos e saídas estão em [contracts/](./contracts/), e as tabelas em [data-model.md](./data-model.md).

## Pré-requisitos

- Node.js 24 (`nvm use`) e `npm ci` na raiz.
- Docker com Compose (banco local e testes de integração).
- `.env` copiado de `.env.example`, com `DATABASE_URL` apontando para o Postgres do Compose.

## 1. Testes

```sh
npm run format:check && npm run lint && npm run typecheck
npm test            # unitários, sem Docker
npm run test:int    # integração com Postgres em container
```

O `npm run test:int` deve terminar verde em menos de 2 minutos (SC-009). Ele cobre os itens de FR-031:
- convite de uso único, inclusive com cadastro simultâneo;
- expiração do convite;
- cota de 3, inclusive com pedidos simultâneos;
- revogação;
- convite não gasto quando o cadastro falha;
- limites de tentativas;
- expiração, renovação, limite absoluto e encerramento de sessão;
- `created_at`/`updated_at` automáticos;
- inspeção do banco sem segredos em texto puro (SC-006);
- tempo do login (SC-007).

## 2. Banco versionado (US1)

```sh
docker compose up -d db
npm run db:migrate -w @cruzadinha/api   # "Migrações aplicadas."
npm run db:migrate -w @cruzadinha/api   # de novo: nada muda, código 0
docker compose exec db psql -U cruzadinha -d cruzadinha -c '\dt'
```

Esperado: `users`, `sessions`, `invites` e `rate_limit_attempts`, sem `puzzles` nem `progress`.

## 3. Convite pela linha de comando (US5)

```sh
npm run cli -w @cruzadinha/api -- invites create            # vale 7 dias
npm run cli -w @cruzadinha/api -- invites create --days 1
npm run cli -w @cruzadinha/api -- invites create --days 0   # erro de uso, código 2
npm run cli -w @cruzadinha/api -- invites list
```

Anote o primeiro código exibido; ele não aparece de novo.

## 4. Cadastro, sessão e convites pela API (US2 a US4)

Com a API rodando (`npm run dev -w @cruzadinha/api`) e um arquivo de cookies:

```sh
API=http://localhost:3000
curl -si -c jar -H 'content-type: application/json' \
  -d '{"email":"Ana@Exemplo.com ","password":"senha-boa-123","inviteCode":"<código>"}' \
  $API/api/auth/register                                   # 201 e Set-Cookie: sid=…; HttpOnly; SameSite=Lax
curl -s -b jar $API/api/auth/me                            # {"user":{"id":…,"email":"ana@exemplo.com"}}
curl -s -H 'content-type: application/json' \
  -d '{"email":"bia@exemplo.com","password":"senha-boa-123","inviteCode":"<mesmo código>"}' \
  $API/api/auth/register                                   # 400 invalid-invite
curl -s -b jar -X POST $API/api/invites                    # 201 com code (repita: o 4º dá 409)
curl -s -b jar $API/api/invites                            # lista sem códigos
curl -si -b jar -c jar -X POST $API/api/auth/logout        # 204 e cookie expirado
curl -s -b jar $API/api/auth/me                            # 401 unauthenticated
```

Login e limite:

```sh
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w '%{http_code}\n' -H 'content-type: application/json' \
    -d '{"email":"ana@exemplo.com","password":"errada-123"}' $API/api/auth/login
done                                                       # 401 x5, depois 429
```

## 4a. Usuário de teste (seed)

```sh
npm run db:seed -w @cruzadinha/api   # "Usuário de teste criado: dev@cruzadinha.local"
npm run db:seed -w @cruzadinha/api   # "Usuário de teste já existe: …", nada muda
curl -si -c jar -H 'content-type: application/json' \
  -d '{"email":"dev@cruzadinha.local","password":"senha-de-teste-123"}' $API/api/auth/login   # 200
NODE_ENV=production npm run db:seed -w @cruzadinha/api                                      # recusa, código 1
```

## 5. Revogação (US5)

```sh
npm run cli -w @cruzadinha/api -- invites list
npm run cli -w @cruzadinha/api -- invites revoke <invite_id>   # "Convite … revogado."
npm run cli -w @cruzadinha/api -- invites revoke <invite_id>   # "Nada a revogar…", código 1
```

Um cadastro com o código revogado deve responder `400 invalid-invite`.

## 6. Imagem e Compose

```sh
docker compose up -d --build
curl -s localhost:3000/api/health            # {"status":"ok","database":"up"}
docker compose exec api node apps/api/dist/cli.mjs invites list
```

A API aplica as migrações na subida, então o banco do Compose já fica na versão atual.
