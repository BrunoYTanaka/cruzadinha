# Cruzadinha

[![Página inicial do Cruzadinha](docs/images/landing.png)](https://cruzadinha.app.br)

[![CI](https://github.com/BrunoYTanaka/cruzadinha/actions/workflows/ci.yml/badge.svg)](https://github.com/BrunoYTanaka/cruzadinha/actions/workflows/ci.yml)
[![Deploy](https://github.com/BrunoYTanaka/cruzadinha/actions/workflows/deploy.yml/badge.svg)](https://github.com/BrunoYTanaka/cruzadinha/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/BrunoYTanaka/cruzadinha)](https://github.com/BrunoYTanaka/cruzadinha/releases)
[![Licença: MIT](https://img.shields.io/github/license/BrunoYTanaka/cruzadinha)](LICENSE)

**Site:** <https://cruzadinha.app.br>

Site de palavras cruzadas que reúne puzzles de sites existentes numa interface limpa e fácil de usar. Cada site de origem tem uma UI/UX própria; o Cruzadinha entrega uma experiência única de jogo: tabuleiro, teclado, dicas e navegação, em tema claro ou escuro, com o progresso salvo no aparelho ou, com conta, entre dispositivos.

## Stack

Monorepo em npm workspaces, tudo em TypeScript (modo estrito):

| Pacote                                   | Descrição                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `apps/api` (`@cruzadinha/api`)           | API em Fastify 5, configurada só por variáveis de ambiente (validadas). |
| `apps/web` (`@cruzadinha/web`)           | Site em React 19 + Vite 8, estado de servidor com TanStack Query.       |
| `packages/shared` (`@cruzadinha/shared`) | Schemas Zod e tipos compartilhados entre API e web.                     |

| Camada                | Tecnologias                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Site**              | ![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white) ![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)    |
| **API**               | ![Fastify](https://img.shields.io/badge/Fastify_5-000000?style=flat-square&logo=fastify&logoColor=white) ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black) ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js_24-339933?style=flat-square&logo=nodedotjs&logoColor=white) |
| **Linguagem**         | ![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=flat-square&logo=typescript&logoColor=white) ![npm workspaces](https://img.shields.io/badge/npm_workspaces-CB3837?style=flat-square&logo=npm&logoColor=white)                                                                                                                                                                                         |
| **Banco de dados**    | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Neon](https://img.shields.io/badge/Neon-00E599?style=flat-square&logo=neon&logoColor=black) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)                                                                                                       |
| **Testes**            | ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=flat-square&logo=testinglibrary&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)                                                                          |
| **Qualidade**         | ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black) ![Husky](https://img.shields.io/badge/Husky-lint--staged-000000?style=flat-square)                                                                                                                           |
| **Hospedagem e CI**   | ![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=flat-square&logo=cloudflarepages&logoColor=white) ![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)                                                            |
| **Serviços externos** | ![Resend](https://img.shields.io/badge/Resend-000000?style=flat-square&logo=resend&logoColor=white) ![Turnstile](https://img.shields.io/badge/Turnstile-F38020?style=flat-square&logo=cloudflare&logoColor=white)                                                                                                                                                                                                          |

## Infraestrutura

![Infraestrutura do Cruzadinha: site no Cloudflare Pages, API no Render, Postgres no Neon, serviços externos, automações no GitHub Actions e o ping do UptimeRobot que mantém a API acordada](docs/images/infraestrutura.png)

O detalhe de cada peça está em [`docs/deploy.md`](docs/deploy.md).

## Pré-requisitos

- [Node.js](https://nodejs.org/) 24 (a versão está em `.nvmrc`; com nvm, rode `nvm use`)
- npm (vem com o Node.js)
- [Docker](https://docs.docker.com/get-docker/) com Compose, para o ambiente local com Postgres

## Como rodar

```sh
git clone https://github.com/BrunoYTanaka/cruzadinha.git
cd cruzadinha
nvm use
npm ci              # instala todos os workspaces e ativa os Git hooks
cp .env.example .env
```

### Com Docker Compose

Sobe o Postgres e a imagem da API:

```sh
docker compose up -d
curl localhost:3000/api/health
```

### Em modo de desenvolvimento

Com o Postgres rodando (por exemplo `docker compose up -d db`), em terminais separados:

```sh
npm run dev -w @cruzadinha/api   # API com reload, lê o .env da raiz
npm run dev -w @cruzadinha/web   # site com Vite
```

O Vite encaminha `/api` para `API_PROXY_TARGET` (padrão `http://localhost:3000`). As variáveis disponíveis estão documentadas em `.env.example`.

## Comandos

Rode a partir da raiz do repositório:

| Comando                                                          | O que faz                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm ci`                                                         | Instala as dependências de todos os workspaces.                                   |
| `npm run dev -w @cruzadinha/api`                                 | Sobe a API em modo watch.                                                         |
| `npm run dev -w @cruzadinha/web`                                 | Sobe o site com o servidor de desenvolvimento do Vite.                            |
| `npm run format` / `npm run format:check`                        | Formata ou verifica a formatação com Prettier.                                    |
| `npm run lint`                                                   | Roda o ESLint.                                                                    |
| `npm run check:ids` / `npm run check:ids:remote`                 | Falha se `specs/`, `DDE` ou `ERD` repetem número (`:remote` compara com a main).  |
| `npm run typecheck`                                              | Verifica os tipos em todos os workspaces.                                         |
| `npm test`                                                       | Roda os testes unitários em todos os workspaces.                                  |
| `npm run test:int`                                               | Roda os testes de integração com Postgres em container (exige Docker).            |
| `npm run db:migrate -w @cruzadinha/api`                          | Aplica as migrações do banco.                                                     |
| `npm run db:seed -w @cruzadinha/api`                             | Cria o usuário de teste do `.env` e um puzzle de exemplo (só em desenvolvimento). |
| `npm run cli -w @cruzadinha/api -- users create --email <email>` | Cria uma conta, mesmo com o cadastro fechado (a senha é pedida sem eco).          |
| `npm run cli -w @cruzadinha/api -- puzzles collect`              | Guarda o puzzle do dia de cada fonte e o histórico que faltar.                    |
| `npm run build`                                                  | Gera o build de todos os workspaces.                                              |

Para rodar um único arquivo de teste, entre no workspace: `cd apps/api && npx vitest run src/config.test.ts`.

Os Git hooks rodam `lint-staged` no pre-commit e, no pre-push, a checagem de números repetidos contra `origin/main`, o `typecheck` e os testes. A CI repete a checagem de números repetidos, a formatação, lint, typecheck, testes e build a cada push, roda os testes de integração e os testes end-to-end (Playwright, com o seed de desenvolvimento) e também gera a imagem Docker da API. A API aplica as migrações pendentes do banco ao subir.

## Versões

A API e o site têm versões próprias (`MAJOR.MINOR.PATCH`), calculadas sozinhas a partir dos tipos de commit: `fix` sobe o patch, `feat` sobe o minor. Cada merge na `main` atualiza um pedido de lançamento; aceitá-lo cria as tags, os registros de mudanças e publica só a parte que ganhou versão nova. Números e registros nunca são editados à mão.

Como funciona, com exemplos e como reverter: **[docs/versionamento.md](docs/versionamento.md)**.

## Produção

O site roda no Cloudflare Pages, a API no Render e o banco no Neon, com custo zero. O roteiro para criar, publicar, verificar e manter o ambiente está em [docs/deploy.md](docs/deploy.md).

## Contribuindo

O projeto segue um fluxo orientado a especificações com o [GitHub Spec Kit](https://github.com/github/spec-kit): cada funcionalidade tem sua pasta em `specs/` e os princípios do projeto ficam em `.specify/memory/constitution.md`. Commits seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

Os puzzles pertencem às suas respectivas fontes; este projeto não é afiliado ao O Globo nem ao Público.
