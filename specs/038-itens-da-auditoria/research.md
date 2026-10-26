# Research: Itens da auditoria

## R1 - Limites atômicos
- **Decision**: usar `admitAddress` (`rate-limit/address-gate.ts`, já sobre `reserve`) em `admitRegistration` e em `settings.save`; na busca de fonte, chamar `rateLimiter.reserve` direto em `getByDate`.
- **Rationale**: `reserve` conta e grava sob `pg_advisory_xact_lock` (feature 034); o formato `{ allowed:false, retryAfterSeconds }` é o mesmo do `check`, então as respostas não mudam.
- **Alternatives**: trava no serviço (não vale entre instâncias); `check` seguido de `record` com retentativa (mantém a corrida).
- **Nota**: a busca que falha na fonte continua gastando uma reserva (como o `record` de hoje, que também ficava gravado). `release` não é usado.
- **Fora**: `email.service.ts` (`check` + `record`, item 7 da issue) e a trava de login por e-mail (item 5).

## R2 - Dependências
- **Decision**: `npm audit fix` (sem `--force`); conferir `npm audit --omit=dev`, `typecheck`, `test` e `test:int`. Medido hoje: `fastify` 5.12.2-5.12.5 e `fast-uri` (3 cópias aninhadas) têm correção sem salto de versão maior.
- **Alternatives**: `overrides` no `package.json` (só se o `fix` deixar uma cópia aninhada); ignorar (rejeitado, o aviso some de graça).

## R3 - Motivo da falha de coleta
- **Decision**: `PuzzlesDeps.onError?: (info: { source: PuzzleSourceId; date: string; error: unknown }) => void`, chamado nos dois `catch` (`collectListed` e `collectSource`) antes de registrar `source-down`. A CLI passa uma função que escreve `[Fonte] Erro em AAAA-MM-DD: <describeError>` em `stderr`.
- **Rationale**: o serviço não tem logger; um gancho opcional mantém a camada pura e os testes sem rede. `describeError` evita os parâmetros de consulta embutidos na mensagem do Drizzle.
- **Alternatives**: importar um logger no serviço (acopla); relançar o erro (para a coleta das outras fontes, quebra FR-006).

## R4 - Aviso por issue
- **Decision**: no `collect.yml`, o passo da coleta usa `2>&1 | tee collect.log` com `set -o pipefail`; um passo `if: failure()` e com o guard ativo lê as linhas `^\[(.+)\] Falhou em` (só `Falhou`, não `Interrompido`, o que cumpre FR-009), tira os nomes únicos e, para cada um, procura issue aberta com `gh issue list --label fonte-quebrada --search "in:title <Fonte>"`; se não houver, `gh issue create` com título `[Fonte] <Fonte> parou de coletar`, motivo (as linhas do log, no máximo 20) e o link da execução. O job ganha `permissions: issues: write`.
- **Rationale**: a CLI já separa as linhas por fonte; sem segredo novo (usa `github.token`). Erros de banco ou segredo ausente não geram linha `Falhou em`, então não acusam fonte (FR-009).
- **Alternatives**: saída JSON da CLI (mais código por pouco ganho); GitHub App (segredo e escopo a mais); abrir uma issue só por execução (perde "uma por fonte").
- **Teste**: sem teste automatizado do YAML; a lógica de extração é validada contra um `collect.log` de exemplo (quickstart) e o formato das linhas é coberto por `test/cli.int.test.ts`.
- **Duplicata**: filtro por título exato com `jq`, não `--search`, porque a busca do GitHub cruza nomes parecidos ("Cruzada Online" × "Cruzadas Brasil").
- **Corpo da issue**: só as linhas `Falhou em` e `Erro em` da fonte (constituição VI).
- **Pré-requisito manual**: criar o rótulo `fonte-quebrada` no repositório (ou o passo o cria com `gh label create --force`).

## R5 - Compatibilidade e versão
- Só `apps/api` e workflow; nada em `shared` ou no site. Commits `fix(api)` / `ci` / `build` (lockfile). Uma versão da API.
