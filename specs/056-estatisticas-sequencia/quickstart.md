# Quickstart

1. `npm run test -w @cruzadinha/shared` (computeStats: sequência, fuso, média, recorde).
2. `cd apps/api && npx vitest run src/modules/stats` e `npm run test:int` (consulta real, isolamento entre contas).
3. `npm run dev -w @cruzadinha/api` + `npm run dev -w @cruzadinha/web`; entrar com a conta seed, concluir uma cruzada, abrir `/estatisticas`: sequência 1, total 1.
4. Sair da conta: a tela mostra os números do aparelho e o aviso.
5. `npm run lint && npm run typecheck && npm test`.
