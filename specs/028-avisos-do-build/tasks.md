---

description: "Task list for feature 028: build do site e e2e sem avisos"
---

# Tasks: Build do site e e2e sem avisos

**Input**: Design documents from `/specs/028-avisos-do-build/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md (sem data-model.md nem contracts/: a feature não tem dados nem interface)

**Tests**: só onde há lógica. O leitor do commit tem teste unitário (Vitest, sem git real nem rede). Os avisos de build são conferidos lendo a saída do build (quickstart); o e2e existente prova que as rotas e o CSS não mudaram.

**Organization**: uma fase por história da spec. US1 e US2 (P1) são independentes entre si e podem andar em paralelo; US3 e US4 (P2) vêm depois.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 a US4.
- Caminhos relativos à raiz do repositório. Só `apps/web` e `CLAUDE.md` mudam; API, banco, `packages/shared` e workflows não mudam.

## Regras que valem para todas as tarefas

- Nenhum aviso é silenciado: sem `VITE_CONFIG_NATIVE_IGNORE_WARNING`, sem `chunkSizeWarningLimit` sem justificativa, sem `eslint-disable`.
- Sem `any`; sem dependência nova; nenhuma mudança de comportamento visível.
- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`.
- Commits em inglês, Conventional Commits, tipo `build` ou `chore`, escopo `web`, sem trailer de atribuição de IA (regra do `CLAUDE.md`).

---

## Phase 1: Setup

- [x] T001 Registrar a linha de base: rodar `npm ci` e `npm run build -w @cruzadinha/web`, e anotar em `specs/028-avisos-do-build/research.md` (seção 3) a lista de chunks e a soma do gzip dos JS carregados em `/` (hoje: `index` 519,11 kB / 160,86 kB gzip, `GamePage` 46,46 kB / 15,91 kB gzip), para comparar no fim. Antes de qualquer edição, consultar a documentação atual via Context7 (constituição, Fluxo de Desenvolvimento) para Vite 8 e Rolldown: `allowImportingTsExtensions` no TypeScript, `--configLoader native`, e a forma exata de `build.rolldownOptions.output.codeSplitting.groups`; registrar as formas confirmadas em `specs/028-avisos-do-build/research.md`.

---

## Phase 2: Foundational

Nada bloqueia as histórias além da linha de base (T001).

---

## Phase 3: User Story 1 - Configuração do Vite pronta para o carregador nativo (P1)

**Goal**: o build e o `vite preview` não avisam sobre `configLoader: 'native'`, e a configuração carrega com esse carregador explícito.

**Independent Test**: `npm run build -w @cruzadinha/web` sem o aviso; `npx vite build --configLoader native` em `apps/web` termina com sucesso.

- [x] T002 [US1] Em `apps/web/vite.config.ts`, trocar `import { siteVersionPlugin } from './version-plugin'` por `'./version-plugin.ts'`.
- [x] T003 [US1] Em `apps/web/tsconfig.node.json`, adicionar `"allowImportingTsExtensions": true` em `compilerOptions` (válido porque `noEmit: true` vem de `tsconfig.base.json`).
- [x] T004 [US1] Conferir `apps/web/version-plugin.ts`: só sintaxe que o Node remove sozinho (sem `enum`, sem parâmetros de propriedade, só `import type` para tipos); rodar `npx vite build --configLoader native` em `apps/web` e `npm run typecheck && npm run lint` na raiz. Se o ESLint reclamar da extensão, corrigir a configuração ou o import; não adicionar `eslint-disable` nem exceção de regra sem perguntar antes a quem mantém o projeto.

**Checkpoint**: aviso do carregador nativo ausente (SC-001, parte 1).

---

## Phase 4: User Story 2 - Build no container do e2e sem erro do git (P1)

**Goal**: o git só roda quando `GITHUB_SHA` falta, e seu stderr nunca chega ao log.

**Independent Test**: build com `GITHUB_SHA=abc123` mostra o commit `abc123` e nenhuma mensagem do git; build numa cópia sem `.git` termina em silêncio com "desconhecido"; build local traz o HEAD.

- [x] T005 [P] [US2] Em `apps/web/version-plugin.test.ts`, reescrever os testes para o novo formato: `siteVersionJson(version, env, readGitHead)` com `readGitHead` uma função. Casos: (a) `GITHUB_SHA` presente e o leitor (um `vi.fn`) nunca chamado; (b) sem `GITHUB_SHA`, usa o valor do leitor; (c) sem `GITHUB_SHA` e leitor devolvendo `undefined` dá `"desconhecido"`; (d) `GITHUB_SHA` vazio (`''`) cai no leitor; (e) o `readGitHead` real (exportado), executado com `cwd` num diretório temporário fora de qualquer repositório e com o stderr do processo capturado, devolve `undefined` e não escreve nada no stderr. Rodar `npx vitest run version-plugin.test.ts` em `apps/web` e ver (a) falhar antes da implementação.
- [x] T006 [US2] Em `apps/web/version-plugin.ts`, mudar `siteVersionJson` para receber `readGitHead: () => string | undefined` e chamá-lo só se `env.GITHUB_SHA` for vazio; em `readGitHead()` abrir o filho com `stdio: ['ignore', 'pipe', 'ignore']` para descartar o stderr; `readGitHead` passa a ser exportado (aceita `cwd` opcional para o teste (e)) e `siteVersionPlugin()` o passa como leitor. Atualizar o comentário do arquivo para dizer que o git é lido só sem `GITHUB_SHA`.
- [x] T007 [US2] Validar à mão, conforme o quickstart seção 3: `GITHUB_SHA=abc123` (commit `abc123`, sem saída do git), HEAD local, e a cópia de `apps/web` sem `.git` (silêncio e "desconhecido"). Rodar `npm test -w @cruzadinha/web`.

**Checkpoint**: sem `dubious ownership` e sem perda de commit (SC-001 parte 2, SC-003).

---

## Phase 5: User Story 3 - Site sem chunks acima do limite (P2)

**Goal**: nenhum chunk acima de 500 kB, sem elevar o limite e sem baixar mais código na primeira visita.

**Independent Test**: build sem o aviso de chunks; soma do gzip dos JS de `/` menor ou igual à da linha de base (T001); e2e passa.

- [x] T008 [US3] Em `apps/web/vite.config.ts`, acrescentar `build.rolldownOptions.output.codeSplitting.groups` com dois grupos: `react` (`test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/`) e `vendor` (`test: /node_modules/`, prioridade menor). Confirmar a forma exata das opções na documentação do Rolldown (`codeSplitting`) via Context7 antes de escrever, porque a API é nova. Comentário curto em português explicando o motivo (cache estável entre releases e chunks abaixo de 500 kB).
- [x] T009 [US3] Rodar `npm run build -w @cruzadinha/web`: conferir que não há aviso, que cada `.js` fica abaixo de 500 kB, que `dist/index.html` tem `modulepreload` para os chunks de vendor e o mesmo `<link rel="stylesheet">` de antes. Se algum chunk ainda passar de 500 kB, subdividir (por exemplo `react-router` e `zod` em grupos próprios) em vez de elevar o limite. Se mesmo assim o limite precisar subir (FR-006), gravar o novo valor e o motivo num comentário em `apps/web/vite.config.ts` e em `research.md`.
- [x] T010 [US3] Medir a soma do gzip dos JS carregados em `/` (`npx vite preview` e a aba Rede, ou soma dos arquivos referenciados no `index.html`) e comparar com T001; registrar o resultado e o número de pedidos em `specs/028-avisos-do-build/research.md` (seção 3, "Resultado"). Se a soma subir mais de 1 kB gzip, ajustar os grupos.
- [x] T011 [US3] Decidir o passo opcional do plano: só se T010 mostrar que carregar `/login`, `/cadastro` e o diálogo de ajustes sob demanda poupa pelo menos 10 kB gzip na rota inicial, converter em `lazy` em `apps/web/src/app/router.tsx` (mesmo padrão de `/jogo/:puzzleId`); do contrário, registrar em `research.md` que ficou fora e por quê.
- [x] T012 [US3] Rodar `npm test -w @cruzadinha/web` (inclui `reload-after-deploy`) e `npm run test:e2e -w @cruzadinha/web` (ambiente local conforme o `CLAUDE.md`), em especial `e2e/botoes.spec.ts` e `e2e/sem-saltos.spec.ts`, para provar que a ordem do CSS e o layout não mudaram. Registrar em `research.md` que a recarga após deploy com um chunk de vendor ausente segue o mesmo mecanismo do `GamePage` e é coberta pelo teste unitário existente de `reload-after-deploy.ts` (nenhum teste novo).

**Checkpoint**: sem aviso de chunk, total baixado não maior (SC-004, SC-005).

---

## Phase 6: User Story 4 - CI verde com log limpo (P2)

**Goal**: o job `e2e` (três fatias) e o job de build não mostram nenhum dos três avisos.

**Independent Test**: execução da branch no GitHub Actions, logs lidos.

- [x] T013 [US4] Rodar `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` na raiz; tudo verde e sem os três avisos na saída do build.
- [ ] T014 [US4] Com a branch publicada e a CI executada, ler o log de cada fatia do job `e2e` (`[WebServer]`) e do job de build: procurar `configLoader`, `dubious ownership` e `larger than 500 kB` (esperado: nenhum) e conferir que o `version.json` do build do job traz o `GITHUB_SHA`. Registrar o resultado em `specs/028-avisos-do-build/research.md` (seção 4).

**Checkpoint**: SC-002 atendido.

---

## Phase 7: Polish & Cross-Cutting

- [x] T015 [P] Em `CLAUDE.md` (seção "Current state"), acrescentar o item da feature 028: import com extensão e `allowImportingTsExtensions`, `version-plugin` que só lê o git sem `GITHUB_SHA`, e a divisão de chunks (`codeSplitting` com os grupos escolhidos) e, se ocorrer, o motivo de qualquer limite elevado.
- [x] T016 [P] Atualizar as caixas de `specs/028-avisos-do-build/checklists/requirements.md` se a pesquisa mudar algum requisito, e rodar `npm run check:ids` para garantir que o número 028 não colide.
- [ ] T017 Commits em inglês e Conventional Commits: `build(web)` para configuração e plugin (não gera versão), `docs` para specs e `CLAUDE.md` (por exemplo `build(web): import the version plugin with its extension`, `build(web): read git only when GITHUB_SHA is missing`, `build(web): split vendor chunks`, `docs: add specs for feature 028`), sem trailer de IA, e PR com título no mesmo formato, resumo e plano de testes, apontando `Closes #61`.

---

## Dependencies & Execution Order

- T001 (linha de base e consulta ao Context7) antes de todas as edições (T002 em diante); a linha de base só vale se medida antes de T008.
- US1 (T002-T004) e US2 (T005-T007) não dependem uma da outra; ambas mexem em arquivos diferentes, exceto que T008 também edita `vite.config.ts`, então T002 vem antes de T008.
- US3 (T008-T012) depende de T001 e T002.
- US4 (T013-T014) depende de US1 a US3; T014 também da CI na branch.
- Polish (T015-T017) por último.

## Parallel Opportunities

- T005 (teste) e T002/T003 (configuração) em paralelo.
- T015 e T016 em paralelo.

## Implementation Strategy

- **MVP**: US1 e US2 (duas correções pequenas e seguras, tiram dois dos três avisos).
- Em seguida US3 (divisão dos chunks, com medição antes e depois) e por fim US4 (confirmação na CI).
- Entrega em um único PR `chore`/`build`, sem versão nova por si só.
