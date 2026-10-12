# Contract: comandos da raiz

Comandos que o autor, os hooks e a CI usam. Todos rodam da raiz do repositório.

| Comando | Efeito | Quem usa |
|---|---|---|
| `npm ci` | instala tudo pelo `package-lock.json` e ativa os hooks (`prepare`) | autor, CI (com `HUSKY=0`) |
| `npm run format` | `prettier --write .` | autor |
| `npm run format:check` | `prettier --check .` | CI |
| `npm run lint` | `eslint .` com a configuração da raiz | autor, CI |
| `npm run typecheck` | `tsc --noEmit` em cada workspace (`--workspaces --if-present`) | autor, pré-push, CI |
| `npm test` | testes unitários de cada workspace (`--workspaces --if-present`) | autor, pré-push, CI |
| `npm run build` | build de cada workspace que tiver (`api` com tsdown, `web` com Vite) | CI |
| `npm run dev -w @cruzadinha/api` | servidor com recarga (`tsx watch`) | autor |
| `npm run dev -w @cruzadinha/web` | site com Vite e proxy `/api` | autor |
| `docker compose up -d` | sobe `db` e `api` | autor |
| `npx vitest run <arquivo>` (dentro do workspace) | roda um único teste | autor |

## Garantias

- Um workspace sem o script correspondente é pulado sem erro (`--if-present`).
- `npm test` não acessa rede, banco nem navegador.
- Qualquer comando que falha termina com código diferente de zero, o que bloqueia o hook ou deixa a CI vermelha.

## Hooks

| Hook | Executa | Bloqueia quando |
|---|---|---|
| `pre-commit` | `npx lint-staged` (ESLint `--fix` e Prettier nos arquivos em stage) | sobra erro de ESLint que não se corrige sozinho |
| `pre-push` | `npm run typecheck && npm test` | erro de tipo ou teste falhando |

## CI (`.github/workflows/ci.yml`)

Roda em todo `push` e `pull_request`.

| Job | Passos |
|---|---|
| `quality` | `npm ci`, `format:check`, `lint`, `typecheck`, `test`, `build` |
| `image` | `docker build -f apps/api/Dockerfile .` |

Os dois jobs têm limite de 10 minutos.
