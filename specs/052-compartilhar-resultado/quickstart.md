# Quickstart: Compartilhar o resultado sem spoiler

Pré-requisito: `npm ci`.

1. Testes: `cd apps/web && npx vitest run src/features/game` (helper, hook e diálogo).
2. Gates: `npm run lint`, `npm run typecheck`, `npm test`.
3. Manual (`npm run dev -w @cruzadinha/web`, com a API e o seed): concluir a cruzada de exemplo, tocar em "Compartilhar resultado", colar o texto e conferir fonte, data e tempo.
4. Cópia negada: no DevTools, negar a permissão `clipboard-write` e repetir; o texto selecionável aparece com o aviso.
5. Sem conta e sem rede: repetir como visitante e com a rede desligada.
6. Leitor de tela/teclado: Tab chega ao botão; o aviso é anunciado.
