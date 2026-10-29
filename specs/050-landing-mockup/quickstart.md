# Quickstart: validar a landing alinhada ao mockup

Pré-requisitos: Node 24 (`nvm use`), `npm ci` na raiz. Para o e2e: API e Postgres locais com seed (ver `CLAUDE.md`, seção Commands).

## 1. Testes e tipos

```sh
npm run typecheck
npm test -w @cruzadinha/web
npm run lint          # inclui check:deps
```

Esperado: tudo verde; `features/landing` sem import novo de outras features.

## 2. Texto no HTML pré-gerado (sem scripts, sem API)

```sh
npm run build -w @cruzadinha/web
SITE_URL=https://exemplo.pages.dev npm run check:build-output -w @cruzadinha/web
```

Esperado: passa; o `dist/index.html` traz o `h1` único com a frase de destaque, "Como funciona", "Abriu, jogou. O resto é opcional.", "Experimente", "Fontes" e a faixa final.

## 3. Olhar a página

```sh
npm run dev -w @cruzadinha/web      # http://localhost:5173/
```

Conferir, ao lado do mockup (https://claude.ai/artifact/5SdYtHc7FbzT2JibcmHLc4):

1. Tela larga: título em dez casas numeradas (1, 2, 3 nas casas 1, 5, 7); abaixo dele, de um lado a frase com "todo dia" grifado e do outro o texto de apoio com os dois botões; grade ao fundo, letras Ç, A, É flutuando.
2. 360 px (DevTools): sem rolagem horizontal, letras soltas ocultas, cartões em coluna.
3. "Como funciona": três cartões com ícone, o do meio deslocado em tela larga, cinco pílulas.
4. "Experimente": jogar até o fim com mouse, teclado e (emulação de toque) teclado do celular; dica riscada com ✓, contagem, mensagem de vitória, Limpar volta às três letras.
5. Fontes: uma linha por fonte, realce no hover; faixa final escura de borda a borda.
6. Tema claro e escuro; DevTools → Rendering → "Emulate prefers-reduced-motion: reduce": nada anima.
7. Aba Network: nenhuma requisição a `fonts.googleapis.com`/`fonts.gstatic.com` e nenhuma ao abrir/jogar a mini cruzada.

## 4. Outras páginas intactas (FR-014, SC-005)

```sh
git diff --stat main -- apps/web/src ':!apps/web/src/features/landing'
```

Esperado: vazio (ou só testes/e2e/docs desta feature). Abrir `/calendario`, `/jogo/…` e `/conta` e conferir que botões e cores são os de antes.

## 5. End to end

```sh
npm run test:e2e -w @cruzadinha/web -- landing sem-saltos
```

Esperado: passa, inclusive o axe nos dois temas e "nenhum elemento muda de lugar".
