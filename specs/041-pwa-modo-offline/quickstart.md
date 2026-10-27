# Quickstart: validar PWA e modo offline (041)

O service worker só existe no build de produção, então tudo roda sobre `vite preview`.

## Preparação

```sh
nvm use && npm ci
cp .env.example .env            # se ainda não existir
docker compose up -d            # Postgres + API (com seed: npm run db:seed -w @cruzadinha/api)
npm run build -w @cruzadinha/web
npx vite preview --config apps/web/vite.config.ts   # ou: cd apps/web && npx vite preview
```

Abrir `http://localhost:4173` no Chrome; DevTools → Application → Service Workers deve mostrar `sw.js`
ativo, e Manifest sem erros.

## Cenários

1. **Jogar sem rede (US1)**: abrir a cruzada de hoje, digitar algumas letras. DevTools → Network →
   Offline. Recarregar: a tela inicial aparece com "Sem conexão" e o dia aberto marcado "Disponível
   sem rede"; abrir a cruzada, jogar até concluir. Abrir um dia não guardado: "Esta cruzada só abre
   com conexão." Voltar a Online: o aviso some sem recarregar.
2. **Cópia primeiro (FR-019)**: com rede, Network → throttling "Slow 3G"; reabrir a cruzada guardada:
   o tabuleiro aparece sem esperar `/api/puzzles/*` (a lista de pedidos não o mostra).
3. **Instalar (US2)**: o botão "Instalar" aparece; instalar; abrir pelo atalho: sem barra do navegador
   e sem o botão. No Firefox: o botão não aparece.
4. **Nova versão (FR-007)**: com a aba aberta, mudar algo, `npm run build` e manter o preview; a aba
   segue na versão antiga, e recarregar a página não basta (continua a antiga); fechar todas as abas e abrir: versão nova (`/version.json` e Application →
   Service Workers).
5. **Fila de conta (US3)**: entrar com a conta do seed, abrir uma cruzada, Offline, digitar letras
   (estado "sem conexão" no `SaveStatus`), fechar a aba. Voltar a Online, abrir o calendário (não o
   jogo): em até 2 minutos `GET /api/progress/<id>` traz as letras. Repetir com "Jogar de novo" offline.
6. **Sessão e dono (FR-011)**: com pendência offline, clicar "Sair": aparece o diálogo; cancelar.
   Apagar o cookie de sessão, voltar a Online: vira visitante com "Há progresso esperando você entrar";
   entrar com a mesma conta: pendência enviada. Repetir entrando com outra conta: aviso de descarte e
   nada enviado.
7. **Download de hoje (US4)**: Online, "Baixar as cruzadas de hoje": resumo com as quatro fontes;
   Offline: cada card de "Hoje" abre.

## Testes automáticos

```sh
npm run lint && npm run typecheck && npm test
npm run test:e2e -w @cruzadinha/web -- offline.spec.ts   # API + Postgres locais, ver CLAUDE.md
```

Esperado: tudo verde; `npm run check:deps` aceita a feature `offline` na ordem
`session < guest < offline < library < settings < game`.
