# Quickstart: validar a landing e a indexação

Pré-requisitos: Node 24 (`nvm use`), `npm ci`.

## 1. Texto no HTML entregue (SC-001)

```sh
SITE_URL=https://exemplo.pages.dev npm run build -w @cruzadinha/web
grep -c '<h1' apps/web/dist/index.html          # 1
grep -o 'Jogar a cruzada de hoje' apps/web/dist/index.html | head -1
cat apps/web/dist/sitemap.xml apps/web/dist/robots.txt
```

Esperado: um `<h1>`, a chamada principal e os nomes das fontes no HTML sem JavaScript; `sitemap.xml` com só `https://exemplo.pages.dev/`; `robots.txt` com `Disallow: /api/` e a linha `Sitemap`.

## 2. Cabeçalhos (SC-003)

Com `vite preview` (ou, no ambiente publicado, o passo "Verificar" do deploy):

```sh
curl -sI http://localhost:4173/            | grep -i x-robots-tag   # nada
curl -sI http://localhost:4173/calendario  | grep -i x-robots-tag   # noindex, nofollow
curl -sI http://localhost:4173/sitemap.xml | grep -i x-robots-tag   # nada
```

O `vite preview` não lê `_headers`; esta conferência vale no Cloudflare Pages (`wrangler pages dev dist` serve o `_headers` localmente).

## 3. Comportamento (SC-002, SC-005, SC-006)

```sh
npm test -w @cruzadinha/web
npm run test:e2e -w @cruzadinha/web -- landing   # API e Postgres de e2e no ar (ver CLAUDE.md)
```

Cobre: landing sem API, "Jogar a cruzada de hoje" até o jogo em 2 cliques, "Ir direto ao jogo" ligado, `/calendario`, rolagem suave e direta com movimento reduzido, mini cruzada com mouse, teclado e teclado do celular emulado, nenhuma chamada a `/api` durante a mini cruzada, 360 px sem rolagem horizontal, axe nos dois temas.

## 4. Fontes em dia (SC-007)

Acrescentar uma fonte de teste a `puzzleSourceNames` em `packages/shared` sem descrição e rodar `npm run typecheck`: deve falhar em `source-descriptions.ts`. Desfazer em seguida.

## 5. Regras do projeto

```sh
npm run lint && npm run typecheck && npm test && npm run build
```
