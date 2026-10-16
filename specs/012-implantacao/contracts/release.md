# Contrato: lançamento de versões (`release.yml` + release-please)

Desenho em research R1, R12 e R13. Requisitos: FR-022, FR-023 e SC-011.

## Arquivos de configuração (raiz)

`release-please-config.json`:

| Chave | Valor |
|---|---|
| `release-type` | `node` |
| `bump-minor-pre-major` | `true` (mudança incompatível abaixo de 1.0.0 sobe o minor) |
| `include-component-in-tag` | `true` |
| `tag-separator` | `-` (tags `api-v0.2.0`, `web-v0.3.1`, `shared-v0.1.4`) |
| `bootstrap-sha` | SHA completo do commit que introduz esta configuração |
| `plugins` | `[{ "type": "node-workspace" }]` |
| `packages."apps/api"` | `{ "component": "api" }` |
| `packages."apps/web"` | `{ "component": "web" }` |
| `packages."packages/shared"` | `{ "component": "shared", "skip-github-release": true }` |

`.release-please-manifest.json`: `{ "apps/api": "0.1.0", "apps/web": "0.1.0", "packages/shared": "0.1.0" }`.

Os arquivos de pacote começam todos em `"version": "0.1.0"`.

## Efeito dos commits (o que `docs/versionamento.md` documenta)

| Commit na `main` | Pasta tocada | Efeito no próximo lançamento |
|---|---|---|
| `fix(web): ...` | `apps/web/` | `web` patch |
| `feat(api): ...` | `apps/api/` | `api` minor |
| `feat(api)!: ...` ou rodapé `BREAKING CHANGE:` | `apps/api/` | `api` minor enquanto < 1.0.0; major a partir de 1.0.0 |
| `feat(shared): ...` | `packages/shared/` | `shared` minor (interno); `api` e `web` patch ("dependências atualizadas") |
| `docs`, `chore`, `ci`, `test`, `style`, `refactor` | qualquer | nenhum |
| qualquer tipo | só `docs/`, `specs/`, `.github/`, raiz | nenhum |

## `release.yml`

- **Gatilho**: `push` em `main`. Também `workflow_dispatch`, sem inputs, para refazer o pedido.
- **Permissões**: `contents: write`, `pull-requests: write` e `issues: write` (exigidas pela action).
- **Passos**:
  1. `actions/create-github-app-token@v3` com `client-id: ${{ vars.RELEASE_APP_CLIENT_ID }}` e `private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}`, sem `owner` nem `repositories` (escopo só deste repositório).
  2. `googleapis/release-please-action@v4` com `token: ${{ steps.app-token.outputs.token }}`, `config-file` e `manifest-file`.
- **Guarda**: sem o secret ou a variable do App, o workflow termina com `::notice::lançamento ignorado: App não configurado`, sem usar o token padrão como alternativa (FR-022).
- **Saídas usadas**: nenhuma. O `deploy.yml` lê as tags (contrato [deploy-workflow.md](./deploy-workflow.md)).

## Pedido de lançamento

- Um único pull request, mantido pela release-please, com título no padrão dela (por exemplo `chore: release main`).
- Contém os `package.json` com as versões novas, os `CHANGELOG.md` de cada parte e o `.release-please-manifest.json`.
- Como foi aberto e atualizado com o token do App, ele dispara a CI (`pull_request`) como qualquer PR (FR-022).
- O autor aceita com "Squash and merge" ou "Merge", sem editar título nem corpo.

## Requisitos de repositório (roteiro)

- **Settings → Actions → General**: ligar "Allow GitHub Actions to create and approve pull requests".
- **App**: criado em Settings → Developer settings → GitHub Apps, com as permissões de repositório Contents (Read and write) e Pull requests (Read and write), sem webhook, instalado só neste repositório.
- **Credenciais**: o Client ID do App vai em `vars.RELEASE_APP_CLIENT_ID` e a chave privada em `secrets.RELEASE_APP_PRIVATE_KEY`.
