# Contrato: rotas da documentação da API

As rotas abaixo existem só quando `NODE_ENV` não é `production` (FR-009). Em produção, todas respondem `404`, como qualquer caminho inexistente, sem cabeçalho ou corpo que revele a documentação.

| Rota | Resposta (fora de produção) |
|---|---|
| `GET /api/docs` e `GET /api/docs/` | `200`, `text/html`: a página Swagger UI. O plugin registra a rota `/` sob o prefixo, e o Fastify aceita as duas formas. |
| `GET /api/docs/static/*` | `200`: arquivos da Swagger UI empacotados no plugin, sem CDN (FR-011) |
| `GET /api/docs/json` | `200`, `application/json`: o documento OpenAPI 3.1.0 ([data-model.md](../data-model.md)) |
| `GET /api/docs/yaml` | `200`, YAML: o mesmo documento |

Regras:

- As rotas da documentação não aparecem no próprio documento (Edge Cases).
- Elas não exigem sessão, não consultam o banco e não passam pelo limite de tentativas. Por isso continuam respondendo com o banco fora do ar.
- A página chama a API na mesma origem em que foi carregada (`http://localhost:3000` direto ou `http://localhost:5173` pelo proxy do Vite). Assim, o cookie `sid` de um login executado nela vale para as rotas protegidas seguintes (FR-008).
- O validador online da Swagger UI fica desligado (`validatorUrl: null`), e a página não faz requisições a outros hosts.

## Efeito nas rotas existentes

Nenhum. Os `schema` adicionados às rotas de `auth`, `invites` e `health` servem só para documentação:

- `buildApp` usa um compilador de validação que aceita tudo e serialização por `JSON.stringify` (research R3).
- Ordem das verificações, status, corpos, mensagens, cabeçalhos e cookies continuam exatamente como em `specs/004-banco-auth-convites/contracts/http-api.md`.
- Os testes unitários e de integração existentes são a prova de não regressão.
