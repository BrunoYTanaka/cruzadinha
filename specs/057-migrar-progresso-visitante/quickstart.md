# Quickstart: validar a importação

Pré-requisitos: `docker compose up -d`, `npm ci`, `.env` copiado, seed rodado.

1. API: `npm run test -w @cruzadinha/api` (regra `decideImport`) e `npm run test:int` (`progress-import.int.test.ts`: conflito, concluída, idempotência, lote misto, 401/429).
2. Site: `npm test -w @cruzadinha/web` (`features/import`, `guestStore.removeIfUnchanged`).
3. Geral: `npm run typecheck && npm run lint` (inclui `check:deps` com a nova ordem).
4. Manual: abra o site sem conta, deixe uma cruzada em andamento e conclua outra; entre numa conta; confirme "Importar"; veja as duas na conta (calendário) e `cruzadinha-visitante` vazio nas DevTools. Repita com "Agora não" (nada muda, volta ao recarregar) e simulando rede offline (progresso local intacto).
5. E2E: `npm run test:e2e -w @cruzadinha/web` (spec `importar-progresso`).

Contrato: [contracts/import.md](contracts/import.md). Dados: [data-model.md](data-model.md).
