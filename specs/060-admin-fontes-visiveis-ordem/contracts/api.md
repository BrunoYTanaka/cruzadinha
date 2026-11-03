# Contratos de API: administração das fontes

Todas as rotas precisam de `schema` documentado (`src/platform/docs/docs.test.ts`). Erros seguem `{ error, fields? }` de `platform/http/errors`.

## GET /api/sources (público)

Sem sessão obrigatória, sem dados de usuário. Cabeçalho `Cache-Control: no-cache`.

- `200`: `{ "sources": ["clube", "oglobo", ...] }`: só as visíveis, em ordem (nunca vazia).
- Esquema de resposta tolerante (chaves desconhecidas descartadas).

## GET /api/auth/me e POST /api/auth/login (mudança)

`user` ganha `isAdmin: boolean`. O site anterior descarta a chave; o site novo lê ausência como `false`.

## GET /api/admin/sources (admin)

- `200`: `{ "sources": [{ "id": "oglobo", "visible": true, "position": 0 }, ...] }`: todas as fontes, inclusive escondidas, em ordem.
- Qualquer outro caso (sem cookie, cookie inválido, conta comum): `404` com o corpo de uma rota inexistente do Fastify. Nunca `401` nem `403`.

## PUT /api/admin/sources (admin)

Corpo estrito: `{ "sources": [{ "id": PuzzleSourceId, "visible": boolean }] }`, cada fonte conhecida uma vez, a ordem do vetor é a ordem salva.

- `200`: a mesma forma do `GET` (estado salvo).
- `400 invalid-input` (`fields: ['sources']`): lista incompleta, repetida ou id desconhecido.
- `400 no-visible-source`: nenhuma visível (FR-004).
- Não admin: `404` como acima, decidido antes de ler o corpo.
- Sem limite de tentativas próprio (só admin chega ao corpo).

## Rotas existentes (mudança de comportamento)

| Rota | Fonte escondida |
|------|-----------------|
| `GET /api/puzzles?source=` | `400 invalid-input`, `fields: ['source']` |
| `GET /api/library?source=` | `400 invalid-input`, `fields: ['source']` |
| `GET /api/puzzles/:id` | inalterada (R6) |
| `POST /api/duels/create` | recusa como puzzle inexistente |

Sem `source` nesses pedidos, o padrão da API continua sendo `oglobo`; se `oglobo` estiver escondida, o pedido sem `source` recebe o mesmo `400` (o site sempre manda `source`).

## CLI

- `users set-admin --email <email>`: promove; `--remove` retira. Exit 0 em sucesso, 1 se não houver conta com o e-mail, 2 para entrada inválida.
- `users create --email <email> --admin`: cria já como admin.
