# Contract: verificação de saúde

## `GET /api/health`

Sem autenticação. Sempre responde enquanto o processo estiver no ar, mesmo com o banco fora.

### Resposta 200

```json
{ "status": "ok", "database": "up" }
```

| Campo | Valores | Significado |
|---|---|---|
| `status` | `ok` | o servidor respondeu |
| `database` | `up` \| `down` | resultado da sonda do banco (tempo limite de 2 segundos) |

O corpo segue `healthStatusSchema` de `@cruzadinha/shared` (ver [data-model.md](../data-model.md)).

### Garantias

- O status HTTP é 200 nos dois casos de `database`; quem precisar distinguir lê o corpo. Assim a plataforma de hospedagem não reinicia o servidor só porque o banco caiu.
- A resposta nunca contém a URL do banco, mensagens de erro do driver nem valores de configuração.
- O prefixo `/api` faz parte da rota no servidor. O proxy do site (Vite em desenvolvimento, Pages Function em produção) repassa o caminho sem reescrever.

### Outras rotas

Qualquer outra rota responde 404 com o tratamento padrão do Fastify. Nenhuma outra rota existe nesta feature.
