---

description: "Tarefas da feature 037 - itens da auditoria do repositório"
---

# Tasks: Itens da auditoria do repositório

**Input**: `specs/037-itens-da-auditoria/` (plan.md, spec.md, research.md, data-model.md, contracts/collect-output.md, quickstart.md)

**Tests**: pedidos (fluxo de correção: teste que falha primeiro, no mesmo commit da correção).

**Formato**: `- [ ] T### [P?] [US?] descrição com caminho`. `[P]` = arquivos distintos, sem dependência pendente.

Sem Setup nem Foundational: a feature não cria projeto, tabela nem módulo.

## Phase 1: User Story 1 - Limite de buscas atômico (P1) 🎯 MVP

**Objetivo**: pedidos simultâneos do mesmo endereço não passam do limite (FR-001 a FR-004).

**Teste independente**: 40 pedidos simultâneos de dias não salvos, limite 30, no máximo 30 idas à fonte falsa.

- [x] T001 [P] [US1] Escrever o teste de integração que falha em `apps/api/src/test/fetch-race.int.test.ts`, no molde de `login-race.int.test.ts`: 40 `getByDate` simultâneos de datas não salvas, mesmo endereço, fonte falsa de `test/fake-source.ts` contando chamadas; espera ≤ 30 chamadas e o resto `too-many-attempts` com `retryAfterSeconds`; caso extra: dia salvo não consome o limite.
- [x] T002 [P] [US1] Escrever os testes que falham para `admitRegistration` (limite `REGISTER`) em `apps/api/src/test/register.int.test.ts` e para `settings.save` (limite `SETTINGS_SAVE`) em `apps/api/src/test/settings.int.test.ts`: rajada acima do limite, nunca passa mais que `max`, e a recusa traz `retryAfterSeconds` no mesmo formato de antes (FR-004).
- [x] T003 [US1] Trocar `check` + `record` por `rateLimiter.reserve` em `getByDate`, `apps/api/src/modules/puzzles/puzzles.service.ts` (~linhas 252-264), mantendo `{ ok: false, reason: 'too-many-attempts', retryAfterSeconds }`. Sem `release`.
- [x] T004 [P] [US1] Trocar por `admitAddress` (`apps/api/src/modules/rate-limit/address-gate.ts`) em `admitRegistration`, `apps/api/src/modules/auth/auth.service.ts` (~linhas 74-88).
- [x] T005 [P] [US1] Trocar por `admitAddress` em `save`, `apps/api/src/modules/settings/settings.service.ts` (~linhas 66-80).
- [x] T006 [US1] Ajustar os testes unitários que fingem `check`/`record` (`apps/api/src/modules/auth/registration.service.test.ts`, `apps/api/src/modules/settings/settings.service.test.ts`; o módulo de puzzles não tem teste unitário) para `reserve`; rodar `npm run test:int -w @cruzadinha/api` e confirmar T001 e T002 verdes.

**Checkpoint**: US1 entregável sozinha.

## Phase 2: User Story 2 - Dependências sem avisos (P2)

**Objetivo**: FR-005. **Teste independente**: `npm audit --omit=dev` limpo e suítes verdes.

- [x] T007 [US2] Rodar `npm audit fix` (sem `--force`) na raiz; alterar só `package-lock.json`. Se sobrar cópia aninhada de `fast-uri`, avaliar `overrides` no `package.json` raiz; se só a versão maior corrige, deixar de fora e registrar o motivo em `specs/037-itens-da-auditoria/research.md`.
- [x] T008 [US2] Conferir `npm audit --omit=dev`, `npm run typecheck`, `npm test` e `npm run test:int`; confirmar que `app.ts` (validador pass-through) segue funcionando.

## Phase 3: User Story 3 - Motivo da falha de coleta no log (P2)

**Objetivo**: FR-006. **Teste independente**: adaptador que lança deixa fonte, data e erro no log; outra fonte segue.

- [x] T009 [US3] Escrever o teste que falha em `apps/api/src/test/collect.int.test.ts` (a coleta não tem teste unitário próprio): adaptador lança em `collect()` → `onError` chamado com `{ source, date, error }`, relatório com `source-down`, segunda fonte coletada. Cobrir `collectSource` e `collectListed`.
- [x] T010 [US3] Adicionar `onError?: (info: { source: PuzzleSourceId; date: string; error: unknown }) => void` a `PuzzlesDeps` e chamá-lo nos dois `catch` de `apps/api/src/modules/puzzles/puzzles.service.ts` (~linhas 174-177 e 201-205) antes de registrar `source-down`.
- [x] T011 [US3] Em `apps/api/src/cli/run-cli.ts` (`collectPuzzles`), passar `onError` que escreve `[<nome>] Erro em <data>: <describeError(error)>` em `deps.stderr` (nome de `puzzleSourceNames`; `describeError` de `src/db/errors.ts`). Teste em `apps/api/src/test/cli.int.test.ts`: a linha sai sem parâmetros de consulta.

## Phase 4: User Story 4 - Issue quando uma fonte quebra (P2)

**Objetivo**: FR-007 a FR-010 (contrato em `contracts/collect-output.md`). Depende de US3 só pela linha `Erro em` no log.

- [x] T012 [US4] Em `.github/workflows/collect.yml`, passo da coleta: `set -o pipefail` e `node apps/api/dist/cli.mjs puzzles collect 2>&1 | tee collect.log`.
- [x] T013 [US4] Em `.github/workflows/collect.yml`, adicionar ao job `collect` `permissions: contents: read, issues: write` e, depois do `auth cleanup`, um passo `if: failure() && steps.guard.outputs.enabled == 'true'` com `GH_TOKEN: ${{ github.token }}`: extrair fontes com `grep -oP '^\[\K[^\]]+(?=\] Falhou em)' collect.log | sort -u`; `gh label create fonte-quebrada --force`; para cada fonte, listar as abertas com `gh issue list --label fonte-quebrada --state open --json title` e filtrar com `jq` pelo título exato `[Fonte] <Fonte> parou de coletar` (a busca por texto cruza nomes parecidos); se não houver, `gh issue create --label fonte-quebrada --title` com esse título, no corpo só as linhas `[<Fonte>] Falhou em` e `[<Fonte>] Erro em` dessa fonte (no máximo 20; nunca a saída inteira, constituição VI) e o link `$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID`. Passar valores por `env`, nunca interpolar `${{ }}` no `run`. Sem linha `Falhou em` (banco, segredo, limite) não cria nada.
- [x] T014 [US4] Validar a extração com o exemplo do `quickstart.md` (passo 4) e conferir o YAML com `npm run format:check`; anotar no PR que o fluxo completo só é exercitado após o merge (`gh workflow run collect.yml`).

## Phase 5: Polish

- [x] T015 Atualizar `CLAUDE.md` com a feature 037 (limites atômicos em busca, cadastro e configurações; `onError`; aviso por issue) e `docs/deploy.md`: `grep -n "collect" docs/deploy.md` e acrescentar uma linha sobre o aviso por issue e o rótulo `fonte-quebrada` onde a coleta agendada for descrita.
- [x] T016 Rodar `npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:int` e o `quickstart.md`.
- [x] T017 Commits Conventional em inglês, sem atribuição de IA no commit nem na PR (regra do projeto): `fix(api)` limites, `build` lockfile, `fix(api)` log, `ci` aviso por issue.

## Dependências

- US1 independente. US2 independente (rodar T008 por último, depois de US1 e US3, para pegar regressões). US3 antes de US4 só para o log útil; o YAML funciona sem ele.
- Dentro de cada história: teste antes da correção.

## Paralelo

- T001 ‖ T002; T004 ‖ T005 (depois de T003 não é necessário, arquivos distintos).
- US1, US2 e US3 podem andar em paralelo por pessoas diferentes; US4 só edita `collect.yml`.

## Estratégia

MVP = US1 (única de risco real). Depois US3 + US4 (juntas fecham o ciclo de observabilidade), US2 por último.
