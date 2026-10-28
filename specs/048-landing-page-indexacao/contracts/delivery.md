# Contrato de entrega: rotas, cabeçalhos e arquivos públicos

Não há contrato de API. O que a feature expõe a navegadores e buscadores é o seguinte.

## Rotas do site

| Caminho | Mostra | Indexável | Observação |
|---|---|---|---|
| `/` | landing | sim | com "Ir direto ao jogo" ligado, toda chegada em `/` (endereço ou logo) espera o servidor e leva ao jogo; se não puder, vai a `/calendario` com o aviso |
| `/calendario` | biblioteca (antes em `/`) | não | |
| `/jogar` | nada; redireciona (`replace`) | não | `/dia/<hoje em Brasília>?fonte=<fonte padrão>` |
| `/dia/:date`, `/jogo/:id`, `/conta`, `/login`, `/cadastro`, `/verificar-email`, `/esqueci-a-senha`, `/redefinir-senha`, `/confirmar-email`, `/status`, outras | como hoje | não | |

## Cabeçalhos (`apps/web/public/_headers`)

```text
/*
  X-Robots-Tag: noindex, nofollow

/
  ! X-Robots-Tag

/sitemap.xml
  ! X-Robots-Tag

/robots.txt
  ! X-Robots-Tag
```

(as demais regras atuais ficam: `Cache-Control` do HTML, `version.json`, `sw.js`, manifesto e `Referrer-Policy` dos links de e-mail.) O `/index.html` direto continua com `noindex` (só `/` é a landing indexável).

## Arquivos gerados no build

- `dist/index.html`: o shell atual com, no `#root`, o HTML da landing; `<title>` e `<meta name="description">` da landing.
- `dist/sitemap.xml` (só com `SITE_URL`): uma `<url>` com `<loc>${SITE_URL}/</loc>`.
- `dist/robots.txt`: `User-agent: *`, `Disallow: /api/` e, com `SITE_URL`, `Sitemap: ${SITE_URL}/sitemap.xml`.

## Invariantes (testados)

1. O HTML de `dist/index.html` sem executar scripts contém um único `<h1>`, o título e a descrição próprios e o nome de cada fonte de `puzzleSourceNames` (SC-001).
2. Toda classe de CSS Module usada no HTML pré-renderizado existe no CSS gerado.
3. `/` não tem `X-Robots-Tag`; qualquer outro caminho tem `noindex` (verificado no `vite preview` e, após a publicação, no passo "Verificar" do `deploy.yml`).
4. `sitemap.xml` lista só `/`.
