# Quickstart: validar a feature

Pré-requisitos: `npm ci`, Postgres local com seed (ver CLAUDE.md), `npx playwright install chromium`.

1. Testes unitários: `npm test` (inclui `clue-text`, schema de ajustes, `SettingsDialog`, `ClueList`, `ClueBar`).
2. Tipos e lint: `npm run typecheck && npm run lint`.
3. e2e: `npm run test:e2e -w @cruzadinha/web -- copiar-dica.spec.ts`.
4. Manual: `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`.
   - Ajustes (engrenagem): "Copiar a dica" vem desligada; dois cliques numa dica não copiam.
   - Ligar, preencher a 1ª e a última letra de uma palavra, dois cliques na dica, colar: `dica (n): A___R`.
   - Pausar o jogo e dar dois cliques numa dica: nada é copiado nem avisado.
   - Dois cliques numa célula: nada copiado. Clicar fora do painel de ajustes: fecha; arrastar de dentro para fora: não fecha.
   - Recarregar: a opção continua ligada. "Restaurar padrões": volta a desligada.
5. Compatibilidade: com a API antiga (sem o campo), a opção funciona no aparelho e não quebra o PUT.
