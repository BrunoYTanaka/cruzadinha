# Contrato: `GET /api/health`

Sem sessão e sem segredo de repasse.

```json
{ "status": "ok", "database": "up", "version": "0.2.0", "commit": "3dde894…" }
```

| Campo | Regra |
|---|---|
| `status` | sempre `"ok"` quando o processo responde (sem mudança) |
| `database` | `"up"` ou `"down"`, conforme o probe (sem mudança) |
| `version` | **novo**. Semver (`^\d+\.\d+\.\d+$`) do `apps/api/package.json`, embutido no build (R14). A API sempre envia; no `healthStatusSchema` é **opcional**, para o site anterior continuar aceitando a resposta (FR-025). |
| `commit` | **novo, opcional**. SHA (7 a 40 hexadecimais) de `RELEASE_COMMIT` ou `RENDER_GIT_COMMIT`. Ausente quando nenhum dos dois está definido (desenvolvimento e testes). |

O `healthStatusSchema` passa de `z.object` com campos fixos para `z.object` que aceita e descarta campos desconhecidos (R16).

## Quem usa

- **Health check do Render**: precisa só do status 200.
- **`waitForServer()` no site**: pronto quando o status é 200, o corpo passa no schema e `database` é `"up"`.
- **Workflow `deploy.yml`**: compara `version` com a última tag `api-v*` (contrato [deploy-workflow.md](./deploy-workflow.md)).
- **`StatusPage`** (feature 002): continua funcionando; pode mostrar a versão.

## `GET /version.json` (site)

Arquivo estático gerado no build do site (R14), servido com `Cache-Control: no-store`:

```json
{ "version": "0.3.1", "commit": "3dde894…" }
```

- `version`: semver do `apps/web/package.json`.
- `commit`: `GITHUB_SHA` no build da CI ou `git rev-parse HEAD`; `"desconhecido"` se nenhum dos dois estiver disponível.
