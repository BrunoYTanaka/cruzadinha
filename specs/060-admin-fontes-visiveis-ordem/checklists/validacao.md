# Validação do quickstart (T042)

Feita com a API real e o Postgres local (banco `cruzadinha_e2e`), pelo Playwright (`apps/web/e2e/admin.spec.ts`) e pelos testes de integração, em vez de à mão.

| Passo do quickstart | Onde foi verificado |
| --- | --- |
| 1 Designar admin (e e-mail sem conta, exit 1) | `apps/api/src/test/cli.int.test.ts` |
| 2 Sem acesso: mesmo 404 de rota inexistente | `admin-sources-access.int.test.ts`, `admin.spec.ts` (terceiro teste) |
| 3 Com acesso: link em `/conta`, `/admin` lista as fontes | `admin.spec.ts` |
| 4 Esconder: sem aba nem cartão; `GET /api/library` dá 400 | `admin.spec.ts`, `admin-sources-hide.int.test.ts` |
| 5 Última visível recusada | `admin-sources-hide.int.test.ts`, `SourcesAdmin.test.tsx` |
| 6 Reordenar: calendário abre na primeira | `admin.spec.ts` (segundo teste) |
| 7 Reativar: histórico e progresso intactos | `admin-sources-hide.int.test.ts`, `hidden-source-data.int.test.ts` |
| 8 Registro de alterações | `admin-sources-log.int.test.ts` |
| 9 Retirar acesso vale no pedido seguinte | `admin-sources-access.int.test.ts` |
| 10 `/jogo/<id>` abre com a fonte escondida | `admin-sources-hide.int.test.ts` |
| 11 Convite de x1 segue inteiro | `hidden-source-data.int.test.ts` |
| 12 Fonte padrão escondida | `play-today.test.ts`, `SettingsDialog.test.tsx`, `LibraryPage.test.tsx` |

SC-001 (menos de 30 s do login até esconder uma fonte): o fluxo inteiro do primeiro teste de `admin.spec.ts` (login, `/conta`, `/admin`, desmarcar, salvar, conferir) leva cerca de 3 s.

Resultado final: unitários, integração (`test:int`), `lint`, `check:deps`, `typecheck`, `format:check`, `build` e o e2e completo passam. O e2e completo exige a API com `REGISTRATION_ENABLED=true`.
