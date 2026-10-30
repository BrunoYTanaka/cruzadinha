# GET /api/stats

- Sessão obrigatória (`401 unauthenticated`; cookie inválido é apagado, como nas demais rotas).
- Sem parâmetros. O usuário vem só da sessão.
- `200`: `Stats` (ver data-model.md), validado por `statsSchema` em `shared` (resposta tolerante).
- Nunca lê nem devolve `cells`, `data`, `solution`.
- Documentada em `stats.schemas.ts` (tag `stats`); `docs.test.ts` exige o `schema`.
- Compatível: site novo + API antiga ⇒ `404`, tratado como "indisponível".
